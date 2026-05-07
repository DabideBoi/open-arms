import { Grid, PathNode, Room, RoomType, DayPhase } from '../../types';
import { isWalkable } from './GridSystem';
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
 * Find path using A* algorithm
 */
export function findPath(
  grid: Grid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  residentId?: string
): PathNode[] | null {
  // Validate start and goal
  const startWalkable = isWalkable(grid, startX, startY);
  const goalWalkable = isWalkable(grid, goalX, goalY);
  
  if (!startWalkable) {
    console.log(`[PathfindingDebug]     Start position (${startX}, ${startY}) is NOT walkable`);
    return null;
  }
  if (!goalWalkable) {
    console.log(`[PathfindingDebug]     Goal position (${goalX}, ${goalY}) is NOT walkable`);
    return null;
  }
  
  // If already at goal
  if (startX === goalX && startY === goalY) {
    return [{ x: startX, y: startY }];
  }
  
  const openSet: AStarNode[] = [];
  const closedSet = new Set<string>();
  
  // Initialize start node
  const startNode: AStarNode = {
    x: startX,
    y: startY,
    g: 0,
    h: heuristic(startX, startY, goalX, goalY),
    f: 0,
    parent: null
  };
  startNode.f = startNode.g + startNode.h;
  openSet.push(startNode);
  
  let iterations = 0;
  const MAX_ITERATIONS = 1000; // Prevent infinite loops
  
  while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift()!;
    
    // Check if goal reached
    if (current.x === goalX && current.y === goalY) {
      const path = reconstructPath(current);
      console.log(`[PathfindingDebug]     Path found in ${iterations} iterations, length: ${path.length}`);
      return path;
    }
    
    closedSet.add(`${current.x},${current.y}`);
    
    // Check neighbors (4-directional movement)
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    ];
    
    for (const neighborPos of neighbors) {
      const key = `${neighborPos.x},${neighborPos.y}`;
      
      // Skip if already evaluated
      if (closedSet.has(key)) continue;
      
      // Skip if not walkable
      if (!isWalkable(grid, neighborPos.x, neighborPos.y)) continue;
      
      // Skip if occupied by another resident (unless it's the goal)
      if (residentId &&
          isTileOccupiedByOther(neighborPos.x, neighborPos.y, residentId) &&
          (neighborPos.x !== goalX || neighborPos.y !== goalY)) {
        continue;
      }
      
      const g = current.g + 1;
      const h = heuristic(neighborPos.x, neighborPos.y, goalX, goalY);
      
      // Check if neighbor is in open set
      const existingNode = openSet.find(
        n => n.x === neighborPos.x && n.y === neighborPos.y
      );
      
      if (existingNode) {
        // Update if this path is better
        if (g < existingNode.g) {
          existingNode.g = g;
          existingNode.f = g + existingNode.h;
          existingNode.parent = current;
        }
      } else {
        // Add new node
        const neighbor: AStarNode = {
          x: neighborPos.x,
          y: neighborPos.y,
          g,
          h,
          f: g + h,
          parent: current
        };
        openSet.push(neighbor);
      }
    }
  }
  
  // No path found
  if (iterations >= MAX_ITERATIONS) {
    console.log(`[PathfindingDebug]     Path search exceeded MAX_ITERATIONS (${MAX_ITERATIONS})`);
  } else {
    console.log(`[PathfindingDebug]     No path found after ${iterations} iterations (openSet exhausted)`);
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
 * Smooth path by removing unnecessary waypoints
 */
function smoothPath(grid: Grid, path: PathNode[]): PathNode[] {
  if (path.length <= 2) return path;
  
  const smoothed: PathNode[] = [path[0]];
  let current = 0;
  
  while (current < path.length - 1) {
    let farthest = current + 1;
    
    // Find farthest visible point
    for (let i = current + 2; i < path.length; i++) {
      if (hasLineOfSight(grid, path[current], path[i])) {
        farthest = i;
      } else {
        break;
      }
    }
    
    smoothed.push(path[farthest]);
    current = farthest;
  }
  
  return smoothed;
}

/**
 * Check line of sight between two points
 */
function hasLineOfSight(grid: Grid, from: PathNode, to: PathNode): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.max(Math.abs(dx), Math.abs(dy));
  
  if (distance === 0) return true;
  
  for (let i = 1; i < distance; i++) {
    const t = i / distance;
    const x = Math.round(from.x + dx * t);
    const y = Math.round(from.y + dy * t);
    
    if (!isWalkable(grid, x, y)) {
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
  let path = findPath(grid, startX, startY, goalX, goalY, residentId);
  
  if (path) {
    // Smooth path to reduce waypoints
    path = smoothPath(grid, path);
    
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
    if (room.type !== roomType) return false;
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
 * Find nearest room of a specific type (optimized with spatial partitioning)
 */
export function findNearestRoom(
  grid: Grid,
  rooms: Room[],
  startX: number,
  startY: number,
  roomType: RoomType,
  phase: DayPhase
): { room: Room; path: PathNode[] } | null {
  // Get available rooms of the specified type
  const availableRooms = getAvailableRooms(rooms, roomType, phase);
  
  console.log(`[PathfindingDebug]   Available ${roomType} rooms: ${availableRooms.length}`);
  
  if (availableRooms.length === 0) {
    console.log(`[PathfindingDebug]   No available rooms of type ${roomType}`);
    return null;
  }
  
  // Log details about available rooms
  availableRooms.forEach(room => {
    console.log(`[PathfindingDebug]   - Room ${room.id.substring(0, 8)}... at (${room.gridX}, ${room.gridY}), size ${room.width}x${room.height}, isOpen: ${room.isOpen}, occupancy: ${room.currentOccupancy}`);
  });
  
  // Use spatial partitioning to get nearby rooms first
  const nearbyRooms = spatialGrid.getNearbyRooms(startX, startY, 3);
  const nearbyAvailable = availableRooms.filter(room => nearbyRooms.includes(room));
  
  // Try nearby rooms first, then all rooms
  const roomsToCheck = nearbyAvailable.length > 0 ? nearbyAvailable : availableRooms;
  
  console.log(`[PathfindingDebug]   Checking ${roomsToCheck.length} rooms (${nearbyAvailable.length} nearby, ${availableRooms.length} total)`);
  
  let nearestRoom: Room | null = null;
  let shortestPath: PathNode[] | null = null;
  let shortestDistance = Infinity;
  
  // Sort by Manhattan distance first for early exit
  const sortedRooms = roomsToCheck.slice().sort((a, b) => {
    const distA = Math.abs(a.gridX - startX) + Math.abs(a.gridY - startY);
    const distB = Math.abs(b.gridX - startX) + Math.abs(b.gridY - startY);
    return distA - distB;
  });
  
  // Find nearest accessible room
  for (const room of sortedRooms) {
    // Early exit if Manhattan distance is already longer than shortest path
    const manhattanDist = Math.abs(room.gridX - startX) + Math.abs(room.gridY - startY);
    if (shortestPath && manhattanDist > shortestDistance) {
      console.log(`[PathfindingDebug]   Early exit: remaining rooms too far (Manhattan: ${manhattanDist} > ${shortestDistance})`);
      break; // No need to check further rooms
    }
    
    // Find a random unoccupied tile in the room
    const randomTile = findRandomUnoccupiedTileInRoom(grid, room);
    if (!randomTile) {
      console.log(`[PathfindingDebug]   Room ${room.id.substring(0, 8)}... has no available tiles`);
      continue;
    }
    
    const targetX = randomTile.x;
    const targetY = randomTile.y;
    
    console.log(`[PathfindingDebug]   Attempting path to room ${room.id.substring(0, 8)}... from (${startX}, ${startY}) to random tile (${targetX}, ${targetY})`);
    
    // Note: We don't pass residentId here because we want to find the room even if temporarily blocked
    // The movement system will handle waiting for occupied tiles
    const path = findPathCached(grid, startX, startY, targetX, targetY);
    
    if (path && path.length < shortestDistance) {
      console.log(`[PathfindingDebug]   ✓ Path found! Length: ${path.length}`);
      shortestDistance = path.length;
      shortestPath = path;
      nearestRoom = room;
    } else if (path) {
      console.log(`[PathfindingDebug]   Path found but longer (${path.length} > ${shortestDistance})`);
    } else {
      console.log(`[PathfindingDebug]   ✗ No path found to this room`);
    }
  }
  
  if (nearestRoom && shortestPath) {
    console.log(`[PathfindingDebug]   Final result: Room ${nearestRoom.id.substring(0, 8)}... with path length ${shortestPath.length}`);
    return { room: nearestRoom, path: shortestPath };
  }
  
  console.log(`[PathfindingDebug]   No accessible rooms found`);
  return null;
}

/**
 * Find nearest room for a specific need
 */
export function findNearestRoomForNeed(
  grid: Grid,
  rooms: Room[],
  startX: number,
  startY: number,
  need: string,
  phase: DayPhase
): { room: Room; path: PathNode[] } | null {
  // Map needs to room types
  const roomTypesForNeed: Record<string, RoomType[]> = {
    sleep: ["dormitory"],
    learning: ["learning_center", "vocational_room"],
    social: ["common_room"],
    bathroom: ["bathroom"],
    food: ["cafeteria"]
  };
  
  const validRoomTypes = roomTypesForNeed[need];
  
  if (!validRoomTypes) {
    console.log(`[PathfindingDebug] No room types mapped for need: ${need}`);
    return null;
  }
  
  console.log(`[PathfindingDebug] Finding room for need '${need}' from (${startX}, ${startY})`);
  console.log(`[PathfindingDebug] Valid room types: ${validRoomTypes.join(', ')}`);
  
  // Find nearest available room of any valid type
  for (const roomType of validRoomTypes) {
    console.log(`[PathfindingDebug] Attempting to find ${roomType}...`);
    const result = findNearestRoom(grid, rooms, startX, startY, roomType, phase);
    if (result) {
      console.log(`[PathfindingDebug] ✓ Found ${roomType} (id: ${result.room.id.substring(0, 8)}...) with path length ${result.path.length}`);
      return result;
    } else {
      console.log(`[PathfindingDebug] ✗ No accessible ${roomType} found`);
    }
  }
  
  console.log(`[PathfindingDebug] Failed to find any room for need '${need}'`);
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
