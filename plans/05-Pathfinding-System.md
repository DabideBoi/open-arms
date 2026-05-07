# Pathfinding System

---

## Overview

The Pathfinding System implements A* algorithm for resident navigation through the shelter grid. It handles obstacle avoidance, path caching, and efficient route calculation.

---

## A* Algorithm Implementation

### Core A* Function

```typescript
interface PathNode {
  x: number;
  y: number;
  g: number;        // Cost from start
  h: number;        // Heuristic to goal
  f: number;        // g + h
  parent: PathNode | null;
}

function findPath(
  grid: Grid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): { x: number; y: number }[] | null {
  
  // Validate start and goal
  if (!isWalkable(grid, startX, startY)) return null;
  if (!isWalkable(grid, goalX, goalY)) return null;
  
  // If already at goal
  if (startX === goalX && startY === goalY) {
    return [{ x: startX, y: startY }];
  }
  
  const openSet: PathNode[] = [];
  const closedSet = new Set<string>();
  
  // Initialize start node
  const startNode: PathNode = {
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
      return reconstructPath(current);
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
        const neighbor: PathNode = {
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
  return null;
}
```

### Heuristic Function

```typescript
function heuristic(x1: number, y1: number, x2: number, y2: number): number {
  // Manhattan distance (4-directional movement)
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}
```

### Path Reconstruction

```typescript
function reconstructPath(node: PathNode): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  let current: PathNode | null = node;
  
  while (current !== null) {
    path.unshift({ x: current.x, y: current.y });
    current = current.parent;
  }
  
  return path;
}
```

---

## Path Caching

### Cache Structure

```typescript
interface PathCache {
  paths: Map<string, CachedPath>;
  maxSize: number;
  hits: number;
  misses: number;
}

interface CachedPath {
  path: { x: number; y: number }[];
  timestamp: number;
  uses: number;
}

const pathCache: PathCache = {
  paths: new Map(),
  maxSize: 100,
  hits: 0,
  misses: 0
};
```

### Cache Key Generation

```typescript
function generatePathKey(
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): string {
  return `${startX},${startY}->${goalX},${goalY}`;
}
```

### Cached Path Finding

```typescript
function findPathCached(
  grid: Grid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): { x: number; y: number }[] | null {
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
  const path = findPath(grid, startX, startY, goalX, goalY);
  
  if (path) {
    // Add to cache
    addToCache(key, path);
  }
  
  return path;
}
```

### Cache Management

```typescript
function addToCache(key: string, path: { x: number; y: number }[]): void {
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

function clearPathCache(): void {
  pathCache.paths.clear();
  pathCache.hits = 0;
  pathCache.misses = 0;
}

function invalidatePathCache(): void {
  // Called when grid changes (room added/removed)
  clearPathCache();
}
```

### Path Validation

```typescript
function isPathValid(grid: Grid, path: { x: number; y: number }[]): boolean {
  // Check if all tiles in path are still walkable
  for (const node of path) {
    if (!isWalkable(grid, node.x, node.y)) {
      return false;
    }
  }
  return true;
}
```

---

## Path Following

### Resident Path Movement

```typescript
function updateResidentMovement(
  resident: Resident,
  deltaTime: number
): void {
  if (!resident.path || resident.path.length === 0) {
    return;
  }
  
  const MOVE_SPEED = 2; // Tiles per second
  const targetNode = resident.path[resident.pathIndex];
  
  // Calculate movement
  const dx = targetNode.x - resident.gridX;
  const dy = targetNode.y - resident.gridY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 0.1) {
    // Reached waypoint
    resident.gridX = targetNode.x;
    resident.gridY = targetNode.y;
    resident.pathIndex++;
    
    // Check if reached end of path
    if (resident.pathIndex >= resident.path.length) {
      resident.path = null;
      resident.pathIndex = 0;
      resident.currentState = "in_use"; // Arrived at destination
    }
  } else {
    // Move toward waypoint
    const moveDistance = MOVE_SPEED * deltaTime;
    const ratio = Math.min(moveDistance / distance, 1);
    
    resident.gridX += dx * ratio;
    resident.gridY += dy * ratio;
  }
}
```

---

## Room Pathfinding

### Find Nearest Room

```typescript
function findNearestRoom(
  grid: Grid,
  rooms: Room[],
  startX: number,
  startY: number,
  roomType: RoomType,
  phase: "day" | "night"
): { room: Room; path: { x: number; y: number }[] } | null {
  
  // Get available rooms of the specified type
  const availableRooms = getAvailableRooms(rooms, roomType, phase);
  
  if (availableRooms.length === 0) {
    return null;
  }
  
  let nearestRoom: Room | null = null;
  let shortestPath: { x: number; y: number }[] | null = null;
  let shortestDistance = Infinity;
  
  // Find nearest accessible room
  for (const room of availableRooms) {
    // Try center of room as target
    const targetX = room.gridX + Math.floor(room.width / 2);
    const targetY = room.gridY + Math.floor(room.height / 2);
    
    const path = findPathCached(grid, startX, startY, targetX, targetY);
    
    if (path && path.length < shortestDistance) {
      shortestDistance = path.length;
      shortestPath = path;
      nearestRoom = room;
    }
  }
  
  if (nearestRoom && shortestPath) {
    return { room: nearestRoom, path: shortestPath };
  }
  
  return null;
}
```

### Find Path to Entrance

```typescript
function findPathToEntrance(
  grid: Grid,
  startX: number,
  startY: number
): { x: number; y: number }[] | null {
  
  const entrance = getEntranceTile(grid);
  
  if (!entrance) {
    console.error('No entrance tile found');
    return null;
  }
  
  return findPathCached(grid, startX, startY, entrance.x, entrance.y);
}
```

---

## Optimization Strategies

### Spatial Partitioning

```typescript
interface SpatialGrid {
  cellSize: number;
  cells: Map<string, Room[]>;
}

function createSpatialGrid(rooms: Room[], cellSize: number = 5): SpatialGrid {
  const cells = new Map<string, Room[]>();
  
  for (const room of rooms) {
    const cellX = Math.floor(room.gridX / cellSize);
    const cellY = Math.floor(room.gridY / cellSize);
    const key = `${cellX},${cellY}`;
    
    if (!cells.has(key)) {
      cells.set(key, []);
    }
    cells.get(key)!.push(room);
  }
  
  return { cellSize, cells };
}

function getNearbyRooms(
  spatialGrid: SpatialGrid,
  x: number,
  y: number,
  radius: number = 1
): Room[] {
  const rooms: Room[] = [];
  const cellX = Math.floor(x / spatialGrid.cellSize);
  const cellY = Math.floor(y / spatialGrid.cellSize);
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const key = `${cellX + dx},${cellY + dy}`;
      const cellRooms = spatialGrid.cells.get(key);
      if (cellRooms) {
        rooms.push(...cellRooms);
      }
    }
  }
  
  return rooms;
}
```

### Early Exit Optimization

```typescript
function findPathWithEarlyExit(
  grid: Grid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  maxDistance: number
): { x: number; y: number }[] | null {
  
  // If straight-line distance exceeds max, don't even try
  const straightLineDistance = heuristic(startX, startY, goalX, goalY);
  if (straightLineDistance > maxDistance) {
    return null;
  }
  
  // Use standard pathfinding with distance check
  return findPath(grid, startX, startY, goalX, goalY);
}
```

---

## Pathfinding Diagnostics

### Performance Metrics

```typescript
interface PathfindingMetrics {
  totalPathsCalculated: number;
  totalPathsFromCache: number;
  averagePathLength: number;
  longestPath: number;
  failedPaths: number;
}

const pathfindingMetrics: PathfindingMetrics = {
  totalPathsCalculated: 0,
  totalPathsFromCache: 0,
  averagePathLength: 0,
  longestPath: 0,
  failedPaths: 0
};

function recordPathfindingMetrics(path: { x: number; y: number }[] | null, fromCache: boolean): void {
  if (fromCache) {
    pathfindingMetrics.totalPathsFromCache++;
  } else {
    pathfindingMetrics.totalPathsCalculated++;
  }
  
  if (path) {
    const length = path.length;
    pathfindingMetrics.averagePathLength = 
      (pathfindingMetrics.averagePathLength * (pathfindingMetrics.totalPathsCalculated - 1) + length) / 
      pathfindingMetrics.totalPathsCalculated;
    
    if (length > pathfindingMetrics.longestPath) {
      pathfindingMetrics.longestPath = length;
    }
  } else {
    pathfindingMetrics.failedPaths++;
  }
}

function getPathfindingStats(): string {
  const cacheHitRate = pathCache.hits / (pathCache.hits + pathCache.misses) * 100;
  
  return `
Pathfinding Statistics:
- Total paths calculated: ${pathfindingMetrics.totalPathsCalculated}
- Paths from cache: ${pathfindingMetrics.totalPathsFromCache}
- Cache hit rate: ${cacheHitRate.toFixed(1)}%
- Average path length: ${pathfindingMetrics.averagePathLength.toFixed(1)} tiles
- Longest path: ${pathfindingMetrics.longestPath} tiles
- Failed paths: ${pathfindingMetrics.failedPaths}
  `.trim();
}
```

---

## Error Handling

### Pathfinding Failures

```typescript
function handlePathfindingFailure(
  resident: Resident,
  targetRoomId: string
): void {
  console.warn(`Resident ${resident.name} cannot find path to room ${targetRoomId}`);
  
  // Reset resident state
  resident.currentState = "idle";
  resident.targetRoomId = null;
  resident.path = null;
  resident.pathIndex = 0;
  
  // Resident will try again on next need check
}
```

### Stuck Resident Detection

```typescript
function isResidentStuck(resident: Resident): boolean {
  // If resident has been pathfinding for too long without progress
  if (resident.currentState === "pathfinding" && resident.path) {
    const timeSinceLastMove = Date.now() - resident.lastNeedCheck;
    const STUCK_THRESHOLD = 30000; // 30 seconds
    
    if (timeSinceLastMove > STUCK_THRESHOLD) {
      return true;
    }
  }
  
  return false;
}

function unstickResident(resident: Resident): void {
  console.warn(`Unsticking resident ${resident.name}`);
  
  // Teleport to entrance
  const entrance = getEntranceTile(grid);
  if (entrance) {
    resident.gridX = entrance.x;
    resident.gridY = entrance.y;
  }
  
  // Reset state
  resident.currentState = "idle";
  resident.path = null;
  resident.pathIndex = 0;
  resident.targetRoomId = null;
}
```

---

## Integration Notes

### Grid System Integration
- Pathfinding uses `grid.tiles[y][x].walkable` to determine valid tiles
- Cache must be invalidated when rooms are added/removed
- Entrance tile is used for resident spawning and graduation exits

### Resident AI Integration
- Residents request paths when seeking needs
- Path following is updated every frame
- Failed pathfinding triggers fallback behavior (idle state)

### Performance Considerations
- Path caching reduces redundant calculations
- Spatial partitioning speeds up nearest room queries
- Early exit optimization prevents expensive failed searches
- Maximum iteration limit prevents infinite loops

See [`06-Resident-AI-System.md`](06-Resident-AI-System.md) for resident behavior integration.
