import { Grid, PathNode, Room, RoomType, DayPhase } from '../../types';
import { isWalkable } from './GridSystem';
import { roomKind } from '../../constants';
import { isTileOccupiedByOther, isTileOccupiedByResident } from './CollisionDetectionSystem';

/**
 * PathfindingSystem - Optimized A* pathfinding with spatial partitioning
 */

// ============================================================================
// A* Algorithm Core
// ============================================================================

interface AStarNode {
  x: number;
  y: number;
  g: number;        // Cost from start
  h: number;        // Heuristic to goal
  f: number;        // g + h
  parent: AStarNode | null;
  dir: number;      // direction index we arrived by (-1 at start)
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
 * Manhattan distance heuristic (4-directional movement)
 */
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Reconstruct path from goal node back to start
 */
function reconstructPath(node: AStarNode): PathNode[] {
  const path: PathNode[] = [];
  let current: AStarNode | null = node;
  
  while (current !== null) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  
  return path;
}

/**
 * Find path using A* (4-directional). Straight runs are preferred over staircases (small turn
 * penalty). With residentId, tiles held by other residents cost extra so routes bend around
 * crowds; hardBlock makes them impassable (used to re-route after getting stuck behind someone).
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

  const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const startRoom = grid.tiles[startY][startX].occupiedBy;
  const goalRoom = grid.tiles[goalY][goalX].occupiedBy;
  const open: AStarNode[] = [{ x: startX, y: startY, g: 0, h: heuristic(startX, startY, goalX, goalY), f: 0, parent: null, dir: -1 }];
  open[0].f = open[0].h;
  const seen = new Map<number, AStarNode>(); // key -> best node so far
  const closed = new Set<number>();
  const keyOf = (x: number, y: number) => y * grid.width + x;
  seen.set(keyOf(startX, startY), open[0]);

  for (let iterations = 0; open.length > 0 && iterations < grid.width * grid.height * 2; iterations++) {
    // Pop lowest f (linear scan: open set stays small on a 40x30 grid)
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[best].f) best = i;
    const current = open[best];
    open[best] = open[open.length - 1];
    open.pop();

    if (current.x === goalX && current.y === goalY) return reconstructPath(current);
    closed.add(keyOf(current.x, current.y));

    for (let d = 0; d < DIRS.length; d++) {
      const nx = current.x + DIRS[d][0];
      const ny = current.y + DIRS[d][1];
      if (!isWalkable(grid, nx, ny) || closed.has(keyOf(nx, ny))) continue;

      let step = 1 + (current.dir !== -1 && current.dir !== d ? 0.3 : 0);
      const isGoal = nx === goalX && ny === goalY;
      // Prefer open floor: tiles inside a room cost extra unless it's the start/goal room
      const roomId = grid.tiles[ny][nx].occupiedBy;
      if (roomId && roomId !== startRoom && roomId !== goalRoom) step += 2;
      if (residentId && !isGoal && isTileOccupiedByOther(nx, ny, residentId)) {
        if (hardBlock) continue;
        step += 4;
      }

      const g = current.g + step;
      const existing = seen.get(keyOf(nx, ny));
      if (existing) {
        if (g < existing.g) {
          existing.g = g;
          existing.f = g + existing.h;
          existing.parent = current;
          existing.dir = d;
        }
      } else {
        const h = heuristic(nx, ny, goalX, goalY);
        const node: AStarNode = { x: nx, y: ny, g, h, f: g + h, parent: current, dir: d };
        seen.set(keyOf(nx, ny), node);
        open.push(node);
      }
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

/**
 * Pick a room of the given type. Scored by path length plus how busy the room is plus a little
 * jitter, so residents spread over all rooms instead of everyone piling into the closest one.
 */
export function findNearestRoom(
  grid: Grid,
  rooms: Room[],
  startX: number,
  startY: number,
  roomType: RoomType,
  phase: DayPhase,
  residentId?: string
): { room: Room; path: PathNode[] } | null {
  let pick: { room: Room; path: PathNode[]; score: number } | null = null;

  for (const room of getAvailableRooms(rooms, roomType, phase)) {
    const tile = findRandomUnoccupiedTileInRoom(grid, room);
    if (!tile) continue;
    const path = findPath(grid, startX, startY, tile.x, tile.y, residentId);
    if (!path) continue;
    const score = path.length + room.currentOccupancy * 2 + Math.random() * 4;
    if (!pick || score < pick.score) pick = { room, path, score };
  }
  return pick;
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
