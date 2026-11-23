import { Grid, PathNode, Room, RoomType, DayPhase } from '../../types';
import { isWalkable } from './GridSystem';
import { roomKind } from '../../constants';
import { isTileOccupiedByOther, isTileOccupiedByResident } from './CollisionDetectionSystem';

/**
 * PathfindingSystem - "CareRoute": A* with shelter-specific step costs, plus a single-search room choice.
 *
 * findPath          A* on a binary heap and typed arrays. Step cost 1, +0.3 per turn, +2 for tiles of a room
 *                   that is neither start nor goal room, +4 for a tile another resident holds.
 * findNearestRoom   "CareRoute Match": one multi-goal A* toward every open room of a type.
 *
 * Benchmark and method: docs/PATHFINDING_BENCHMARK.md (npm run bench:path).
 */

// ============================================================================
// A* Algorithm Core
// ============================================================================

const DIRS_X = [1, -1, 0, 0];
const DIRS_Y = [0, 0, 1, -1];

// Scratch buffers shared by every search. A stamp marks which entries belong to the current search, so
// nothing is cleared per call. shortcut: not re-entrant, and the stamp wraps after 2^32 searches; fine for a game loop.
let scratchSize = 0;
let G = new Float64Array(0);    // cost from start
let PARENT = new Int32Array(0); // previous tile index (-1 at start)
let DIR = new Int8Array(0);     // direction index we arrived by (-1 at start)
let SEEN = new Uint32Array(0);  // stamp: tile has a cost in this search
let CLOSED = new Uint32Array(0); // stamp: tile was expanded in this search
let stamp = 0;

function ensureScratch(tileCount: number): void {
  if (tileCount <= scratchSize) return;
  scratchSize = tileCount;
  G = new Float64Array(tileCount);
  PARENT = new Int32Array(tileCount);
  DIR = new Int8Array(tileCount);
  SEEN = new Uint32Array(tileCount);
  CLOSED = new Uint32Array(tileCount); // fresh arrays are all 0, which never equals a stamp (they start at 1)
}

/** Binary min-heap of (key, value). Stale entries are skipped by the caller (lazy deletion). */
class MinHeap {
  private keys = new Float64Array(1024);
  private vals = new Int32Array(1024);
  size = 0;

  reset(capacity: number): void {
    if (capacity > this.keys.length) {
      this.keys = new Float64Array(capacity);
      this.vals = new Int32Array(capacity);
    }
    this.size = 0;
  }

  push(key: number, val: number): void {
    const keys = this.keys, vals = this.vals;
    let i = this.size++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (keys[p] <= key) break;
      keys[i] = keys[p]; vals[i] = vals[p];
      i = p;
    }
    keys[i] = key; vals[i] = val;
  }

  pop(): number {
    const keys = this.keys, vals = this.vals;
    const top = vals[0], n = --this.size;
    if (n > 0) {
      const key = keys[n], val = vals[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && keys[c + 1] < keys[c]) c++;
        if (keys[c] >= key) break;
        keys[i] = keys[c]; vals[i] = vals[c];
        i = c;
      }
      keys[i] = key; vals[i] = val;
    }
    return top;
  }
}

const heap = new MinHeap();

/** Walk PARENT links back from tile index s to the start. */
function buildPath(s: number, width: number): PathNode[] {
  const path: PathNode[] = [];
  for (; s !== -1; s = PARENT[s]) path.push({ x: s % width, y: (s / width) | 0 });
  return path.reverse();
}

// ============================================================================
// Spatial Partitioning for Fast Room Queries
// ============================================================================

class SpatialGrid {
  private cellSize: number = 5;
  private cells: Map<string, Room[]> = new Map();
  private roomEntranceCache: Map<string, { x: number; y: number }> = new Map();
  
  /**
   * Add room to spatial grid
   */
  addRoom(room: Room): void {
    const cellX = Math.floor(room.gridX / this.cellSize);
    const cellY = Math.floor(room.gridY / this.cellSize);
    
    // Add to all cells the room overlaps
    const cellWidth = Math.ceil(room.width / this.cellSize);
    const cellHeight = Math.ceil(room.height / this.cellSize);
    
    for (let dy = 0; dy < cellHeight; dy++) {
      for (let dx = 0; dx < cellWidth; dx++) {
        const key = `${cellX + dx},${cellY + dy}`;
        if (!this.cells.has(key)) {
          this.cells.set(key, []);
        }
        this.cells.get(key)!.push(room);
      }
    }
    
    // Cache room entrance (center)
    this.roomEntranceCache.set(room.id, {
      x: room.gridX + Math.floor(room.width / 2),
      y: room.gridY + Math.floor(room.height / 2)
    });
  }
  
  /**
   * Remove room from spatial grid
   */
  removeRoom(room: Room): void {
    // Clear all cells
    for (const [key, rooms] of this.cells.entries()) {
      const index = rooms.findIndex(r => r.id === room.id);
      if (index !== -1) {
        rooms.splice(index, 1);
      }
      if (rooms.length === 0) {
        this.cells.delete(key);
      }
    }
    
    this.roomEntranceCache.delete(room.id);
  }
  
  /**
   * Get nearby rooms efficiently
   */
  getNearbyRooms(x: number, y: number, radius: number = 2): Room[] {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const roomSet = new Set<Room>();
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cellRooms = this.cells.get(key);
        if (cellRooms) {
          cellRooms.forEach(room => roomSet.add(room));
        }
      }
    }
    
    return Array.from(roomSet);
  }
  
  /**
   * Get cached room entrance position
   */
  getRoomEntrance(roomId: string): { x: number; y: number } | null {
    return this.roomEntranceCache.get(roomId) || null;
  }
  
  /**
   * Clear spatial grid
   */
  clear(): void {
    this.cells.clear();
    this.roomEntranceCache.clear();
  }
  
  /**
   * Rebuild spatial grid from rooms
   */
  rebuild(rooms: Room[]): void {
    this.clear();
    for (const room of rooms) {
      this.addRoom(room);
    }
  }
}

// Global spatial grid instance
const spatialGrid = new SpatialGrid();

/**
 * Update spatial grid when rooms change
 */
export function updateSpatialGrid(rooms: Room[]): void {
  spatialGrid.rebuild(rooms);
}

/**
 * Add room to spatial grid
 */
export function addRoomToSpatialGrid(room: Room): void {
  spatialGrid.addRoom(room);
}

/**
 * Remove room from spatial grid
 */
export function removeRoomFromSpatialGrid(room: Room): void {
  spatialGrid.removeRoom(room);
}

/**
 * Find a path with A* (4-directional). Straight runs are preferred over staircases (small turn penalty),
 * tiles of rooms that are neither the start nor goal room cost extra (prefer open floor), and with
 * residentId, tiles held by other residents cost extra so routes bend around crowds; hardBlock makes them
 * impassable (used to re-route after getting stuck behind someone).
 */
export function findPath(
  grid: Grid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  residentId?: string,
  hardBlock: boolean = false
): PathNode[] | null {
  if (!isWalkable(grid, startX, startY) || !isWalkable(grid, goalX, goalY)) return null;
  if (startX === goalX && startY === goalY) return [{ x: startX, y: startY }];

  const W = grid.width, N = W * grid.height, tiles = grid.tiles;
  const startRoom = tiles[startY][startX].occupiedBy;
  const goalRoom = tiles[goalY][goalX].occupiedBy;
  const goalT = goalY * W + goalX, s0 = startY * W + startX;
  const search = ++stamp;
  ensureScratch(N);
  heap.reset(4 * N + 64); // each directed edge improves a tile at most once
  G[s0] = 0; PARENT[s0] = -1; DIR[s0] = -1; SEEN[s0] = search;
  heap.push(Math.abs(goalX - startX) + Math.abs(goalY - startY), s0);

  while (heap.size > 0) {
    const s = heap.pop();
    if (CLOSED[s] === search) continue; // stale duplicate from a later improvement
    CLOSED[s] = search;
    if (s === goalT) return buildPath(s, W);
    const cx = s % W, cy = (s / W) | 0, cd = DIR[s];

    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS_X[d], ny = cy + DIRS_Y[d];
      if (!isWalkable(grid, nx, ny)) continue;
      const n = ny * W + nx;
      if (CLOSED[n] === search) continue;

      let step = 1 + (cd !== -1 && cd !== d ? 0.3 : 0);
      const roomId = tiles[ny][nx].occupiedBy;
      if (roomId && roomId !== startRoom && roomId !== goalRoom) step += 2;
      if (residentId && n !== goalT && isTileOccupiedByOther(nx, ny, residentId)) {
        if (hardBlock) continue;
        step += 4;
      }

      const g = G[s] + step;
      if (SEEN[n] === search) { if (g >= G[n]) continue; } else SEEN[n] = search;
      G[n] = g; PARENT[n] = s; DIR[n] = d;
      heap.push(g + Math.abs(goalX - nx) + Math.abs(goalY - ny) - g * 1e-6, n); // -g*1e-6: ties go to the deeper node
    }
  }
  return null;
}


// ============================================================================
// Path Caching (Enhanced)
// ============================================================================

interface CachedPath {
  path: PathNode[];
  timestamp: number;
  uses: number;
}

interface PathCache {
  paths: Map<string, CachedPath>;
  maxSize: number;
  hits: number;
  misses: number;
}

const pathCache: PathCache = {
  paths: new Map(),
  maxSize: 200, // Increased from 100
  hits: 0,
  misses: 0
};

/**
 * Generate cache key for a path
 */
function generatePathKey(
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): string {
  return `${startX},${startY}->${goalX},${goalY}`;
}

/**
 * Check if cached path is still valid (optimized)
 */
function isPathValid(grid: Grid, path: PathNode[]): boolean {
  // Sample path validation - check start, end, and a few points in between
  if (path.length === 0) return false;
  
  // Always check start and end
  if (!isWalkable(grid, path[0].x, path[0].y)) return false;
  if (!isWalkable(grid, path[path.length - 1].x, path[path.length - 1].y)) return false;
  
  // Sample middle points (every 5th node)
  for (let i = 5; i < path.length - 1; i += 5) {
    if (!isWalkable(grid, path[i].x, path[i].y)) {
      return false;
    }
  }
  
  return true;
}

/**
 * Add path to cache
 */
function addToCache(key: string, path: PathNode[]): void {
  // Check cache size
  if (pathCache.paths.size >= pathCache.maxSize) {
    // Remove least recently used path
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [k, v] of pathCache.paths.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    
    if (oldestKey) {
      pathCache.paths.delete(oldestKey);
    }
  }
  
  // Add new path
  pathCache.paths.set(key, {
    path: [...path],
    timestamp: Date.now(),
    uses: 1
  });
}

/**
 * Find path with caching
 */
export function findPathCached(
  grid: Grid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  residentId?: string
): PathNode[] | null {
  const key = generatePathKey(startX, startY, goalX, goalY);
  
  // Check cache
  const cached = pathCache.paths.get(key);
  if (cached) {
    // Validate cached path is still valid
    if (isPathValid(grid, cached.path)) {
      pathCache.hits++;
      cached.uses++;
      cached.timestamp = Date.now();
      return [...cached.path]; // Return copy
    } else {
      // Path no longer valid, remove from cache
      pathCache.paths.delete(key);
    }
  }
  
  // Cache miss - calculate new path
  pathCache.misses++;
  const path = findPath(grid, startX, startY, goalX, goalY, residentId);
  
  if (path) {
    // Add to cache
    addToCache(key, path);
  }
  
  return path;
}

/**
 * Clear path cache (call when grid changes)
 */
export function clearPathCache(): void {
  pathCache.paths.clear();
  pathCache.hits = 0;
  pathCache.misses = 0;
}

/**
 * Invalidate path cache (alias for clearPathCache)
 */
export function invalidatePathCache(): void {
  clearPathCache();
}

// ============================================================================
// Room Pathfinding
// ============================================================================

/**
 * Get available rooms of a specific type
 */
function getAvailableRooms(
  rooms: Room[],
  roomType: RoomType,
  phase: DayPhase
): Room[] {
  return rooms.filter(room => {
    if (roomKind(room.type) !== roomType) return false;
    if (!room.isOpen) return false;
    
    // Check capacity (0 means unlimited)
    // For Phase 2, we'll allow entry even if at capacity
    // The room system will handle occupancy
    
    return true;
  });
}

/**
 * Find a random unoccupied tile within a room
 */
function findRandomUnoccupiedTileInRoom(grid: Grid, room: Room): { x: number; y: number } | null {
  const tiles: { x: number; y: number }[] = [];
  
  // Collect all walkable, unoccupied tiles in the room
  for (let y = room.gridY; y < room.gridY + room.height; y++) {
    for (let x = room.gridX; x < room.gridX + room.width; x++) {
      if (isWalkable(grid, x, y) && !isTileOccupiedByResident(x, y)) {
        tiles.push({ x, y });
      }
    }
  }
  
  // Return random tile if available
  if (tiles.length > 0) {
    return tiles[Math.floor(Math.random() * tiles.length)];
  }
  
  // Fallback: return center of room
  return {
    x: room.gridX + Math.floor(room.width / 2),
    y: room.gridY + Math.floor(room.height / 2)
  };
}

/** Random 0-4 added to each room's price so residents spread over rooms instead of all choosing the same one. */
const ROOM_CHOICE_JITTER = 4;

/**
 * CareRoute Match: pick the best room of a type in ONE multi-goal A* search instead of one search per room.
 * The search runs toward every candidate room (heuristic = distance to the nearest one). The first time it
 * expands a tile of a candidate room, that room gets a "finish" entry priced at (path cost to it) + 2 x
 * occupancy + jitter; the first finish entry popped is the winner.
 * shortcut: refunding the entry surcharges (up to 6) makes the heuristic overestimate on that one tile, so
 * the pick can be marginally off; the benchmark measures it (docs/PATHFINDING_BENCHMARK.md), upgrade if it matters.
 */
function chooseRoom(
  grid: Grid,
  rooms: Room[],
  startX: number,
  startY: number,
  residentId: string | undefined,
  jitter: number
): Room | null {
  const K = rooms.length;
  if (K === 0 || !isWalkable(grid, startX, startY)) return null;
  const W = grid.width, N = W * grid.height, tiles = grid.tiles;
  const index = new Map(rooms.map((r, k) => [r.id, k]));
  const price = rooms.map(r => 2 * r.currentOccupancy + Math.random() * jitter);
  const entered = new Uint8Array(K);
  const nearest = (x: number, y: number) => {
    let best = Infinity;
    for (const r of rooms) {
      const d = Math.max(r.gridX - x, 0, x - (r.gridX + r.width - 1)) + Math.max(r.gridY - y, 0, y - (r.gridY + r.height - 1));
      if (d < best) best = d;
    }
    return best;
  };

  const startRoom = tiles[startY][startX].occupiedBy;
  const s0 = startY * W + startX;
  const search = ++stamp;
  ensureScratch(N);
  heap.reset(4 * N + K + 64);
  G[s0] = 0; DIR[s0] = -1; SEEN[s0] = search;
  heap.push(nearest(startX, startY), s0);

  while (heap.size > 0) {
    const s = heap.pop();
    if (s >= N) return rooms[s - N]; // finish entry: best room
    if (CLOSED[s] === search) continue;
    CLOSED[s] = search;
    const cx = s % W, cy = (s / W) | 0, cd = DIR[s];

    const roomId = tiles[cy][cx].occupiedBy;
    const k = roomId ? index.get(roomId) : undefined;
    if (k !== undefined && !entered[k]) {
      entered[k] = 1;
      // Heading for a room isn't a detour through it: give back the surcharges this entry tile paid
      const refund = (roomId !== startRoom ? 2 : 0) + (residentId && s !== s0 && isTileOccupiedByOther(cx, cy, residentId) ? 4 : 0);
      heap.push(G[s] - refund + price[k] - G[s] * 1e-6, N + k);
    }

    for (let d = 0; d < 4; d++) {
      const nx = cx + DIRS_X[d], ny = cy + DIRS_Y[d];
      if (!isWalkable(grid, nx, ny)) continue;
      const n = ny * W + nx;
      if (CLOSED[n] === search) continue;
      let step = 1 + (cd !== -1 && cd !== d ? 0.3 : 0);
      const nr = tiles[ny][nx].occupiedBy;
      if (nr && nr !== startRoom) step += 2;
      if (residentId && isTileOccupiedByOther(nx, ny, residentId)) step += 4;
      const g = G[s] + step;
      if (SEEN[n] === search) { if (g >= G[n]) continue; } else SEEN[n] = search;
      G[n] = g; DIR[n] = d;
      heap.push(g + nearest(nx, ny) - g * 1e-6, n);
    }
  }
  return null;
}

/**
 * Pick the best open room of the given type (path cost + how busy it is + a little jitter) and the
 * path to a free tile inside it. Spreads residents over rooms instead of everyone piling into the closest.
 */
export function findNearestRoom(
  grid: Grid,
  rooms: Room[],
  startX: number,
  startY: number,
  roomType: RoomType,
  phase: DayPhase,
  residentId?: string,
  jitter: number = ROOM_CHOICE_JITTER
): { room: Room; path: PathNode[] } | null {
  const room = chooseRoom(grid, getAvailableRooms(rooms, roomType, phase), startX, startY, residentId, jitter);
  const tile = room && findRandomUnoccupiedTileInRoom(grid, room);
  const path = tile && findPath(grid, startX, startY, tile.x, tile.y, residentId);
  return room && path ? { room, path } : null;
}

/**
 * Find a room for a specific need
 */
export function findNearestRoomForNeed(
  grid: Grid,
  rooms: Room[],
  startX: number,
  startY: number,
  need: string,
  phase: DayPhase,
  residentId?: string
): { room: Room; path: PathNode[] } | null {
  const roomTypesForNeed: Record<string, RoomType[]> = {
    sleep: ["dormitory"],
    health: ["clinic"],
    social: ["common_room"],
    bathroom: ["bathroom"],
    food: ["cafeteria"]
  };

  for (const roomType of roomTypesForNeed[need] ?? []) {
    const result = findNearestRoom(grid, rooms, startX, startY, roomType, phase, residentId);
    if (result) return result;
  }
  return null;
}

// ============================================================================
// Path Cache Statistics
// ============================================================================

/**
 * Get pathfinding cache statistics
 */
export function getPathfindingStats(): {
  cacheSize: number;
  hits: number;
  misses: number;
  hitRate: number;
} {
  const total = pathCache.hits + pathCache.misses;
  const hitRate = total > 0 ? (pathCache.hits / total) * 100 : 0;
  
  return {
    cacheSize: pathCache.paths.size,
    hits: pathCache.hits,
    misses: pathCache.misses,
    hitRate
  };
}
