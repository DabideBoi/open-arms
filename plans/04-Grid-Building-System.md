# Grid & Building System

---

## Overview

The Grid & Building System manages the tile-based layout of the shelter, room placement validation, and grid expansion. It provides the spatial foundation for pathfinding and resident movement.

---

## Grid Structure

### Grid Dimensions

```typescript
const GRID_CONFIG = {
  TOTAL_WIDTH: 40,        // Total grid width in tiles
  TOTAL_HEIGHT: 30,       // Total grid height in tiles
  STARTER_SIZE: 10,       // Initial unlocked area (10x10)
  TILE_SIZE: 32           // Pixels per tile (for rendering)
};
```

### Grid Initialization

```typescript
function initializeGrid(): Grid {
  const tiles: Tile[][] = [];
  
  // Create empty grid (all locked)
  for (let y = 0; y < GRID_CONFIG.TOTAL_HEIGHT; y++) {
    tiles[y] = [];
    for (let x = 0; x < GRID_CONFIG.TOTAL_WIDTH; x++) {
      tiles[y][x] = {
        x,
        y,
        type: "locked",
        occupiedBy: null,
        walkable: false
      };
    }
  }
  
  // Calculate starter area (centered)
  const startX = Math.floor(GRID_CONFIG.TOTAL_WIDTH / 2) - Math.floor(GRID_CONFIG.STARTER_SIZE / 2);
  const startY = Math.floor(GRID_CONFIG.TOTAL_HEIGHT / 2) - Math.floor(GRID_CONFIG.STARTER_SIZE / 2);
  
  // Unlock starter area
  for (let y = startY; y < startY + GRID_CONFIG.STARTER_SIZE; y++) {
    for (let x = startX; x < startX + GRID_CONFIG.STARTER_SIZE; x++) {
      tiles[y][x].type = "empty";
      tiles[y][x].walkable = true;
    }
  }
  
  // Set entrance tile (bottom center of starter area)
  const entranceX = startX + Math.floor(GRID_CONFIG.STARTER_SIZE / 2);
  const entranceY = startY + GRID_CONFIG.STARTER_SIZE - 1;
  tiles[entranceY][entranceX].type = "entrance";
  
  return {
    width: GRID_CONFIG.TOTAL_WIDTH,
    height: GRID_CONFIG.TOTAL_HEIGHT,
    tiles,
    unlockedArea: {
      minX: startX,
      minY: startY,
      maxX: startX + GRID_CONFIG.STARTER_SIZE,
      maxY: startY + GRID_CONFIG.STARTER_SIZE
    }
  };
}
```

---

## Room Specifications

### Room Type Definitions

```typescript
const ROOM_SPECS: Record<RoomType, RoomSpec> = {
  dormitory: {
    type: "dormitory",
    width: 3,
    height: 3,
    buildCost: 500,
    maintenanceCost: 20,
    capacity: 4,                    // 4 residents per dormitory
    closesAtNight: false,           // Always open (residents sleep here)
    needsSatisfied: ["sleep"]
  },
  
  cafeteria: {
    type: "cafeteria",
    width: 5,
    height: 3,
    buildCost: 800,
    maintenanceCost: 40,
    capacity: 10,                   // Can serve 10 at once
    closesAtNight: true,            // Closes at night
    needsSatisfied: ["food"]
  },
  
  learning_center: {
    type: "learning_center",
    width: 4,
    height: 3,
    buildCost: 1000,
    maintenanceCost: 50,
    capacity: 6,
    closesAtNight: true,            // Closes at night
    needsSatisfied: ["learning"]
  },
  
  vocational_room: {
    type: "vocational_room",
    width: 4,
    height: 3,
    buildCost: 1200,
    maintenanceCost: 60,
    capacity: 6,
    closesAtNight: true,            // Closes at night
    needsSatisfied: ["learning"]
  },
  
  bathroom: {
    type: "bathroom",
    width: 2,
    height: 2,
    buildCost: 300,
    maintenanceCost: 15,
    capacity: 0,                    // Unlimited (no queue)
    closesAtNight: false,           // Always open
    needsSatisfied: ["bathroom"]
  },
  
  common_room: {
    type: "common_room",
    width: 3,
    height: 3,
    buildCost: 600,
    maintenanceCost: 25,
    capacity: 0,                    // Unlimited
    closesAtNight: false,           // Open at night (optional)
    needsSatisfied: ["social"]
  },
  
  admin_office: {
    type: "admin_office",
    width: 2,
    height: 2,
    buildCost: 400,
    maintenanceCost: 20,
    capacity: 0,                    // Not used by residents
    closesAtNight: true,
    needsSatisfied: []
  },
  
  fundraiser_station: {
    type: "fundraiser_station",
    width: 3,
    height: 2,
    buildCost: 700,
    maintenanceCost: 30,
    capacity: 4,                    // Max 4 residents per fundraiser
    closesAtNight: true,            // Closes at night
    needsSatisfied: []              // Special purpose room
  }
};
```

---

## Room Placement

### Placement Validation

```typescript
function canPlaceRoom(
  grid: Grid,
  roomSpec: RoomSpec,
  gridX: number,
  gridY: number
): boolean {
  // Check bounds
  if (gridX < 0 || gridY < 0) return false;
  if (gridX + roomSpec.width > grid.width) return false;
  if (gridY + roomSpec.height > grid.height) return false;
  
  // Check if all tiles are available
  for (let y = gridY; y < gridY + roomSpec.height; y++) {
    for (let x = gridX; x < gridX + roomSpec.width; x++) {
      const tile = grid.tiles[y][x];
      
      // Must be empty or hallway
      if (tile.type !== "empty" && tile.type !== "hallway") {
        return false;
      }
      
      // Must not be occupied
      if (tile.occupiedBy !== null) {
        return false;
      }
    }
  }
  
  return true;
}
```

### Room Placement

```typescript
function placeRoom(
  gameState: GameState,
  roomType: RoomType,
  gridX: number,
  gridY: number
): { success: boolean; error?: string } {
  const roomSpec = ROOM_SPECS[roomType];
  
  // Validate placement
  if (!canPlaceRoom(gameState.grid, roomSpec, gridX, gridY)) {
    return { success: false, error: "Cannot place room here" };
  }
  
  // Check funds
  if (gameState.money < roomSpec.buildCost) {
    return { success: false, error: "Insufficient funds" };
  }
  
  // Deduct cost
  gameState.money -= roomSpec.buildCost;
  
  // Create room
  const room: Room = {
    id: generateUUID(),
    type: roomType,
    gridX,
    gridY,
    width: roomSpec.width,
    height: roomSpec.height,
    isOpen: !roomSpec.closesAtNight || gameState.currentPhase === "day",
    currentOccupancy: 0,
    buildCost: roomSpec.buildCost,
    maintenanceCost: roomSpec.maintenanceCost,
    lastMaintenancePaid: Date.now()
  };
  
  // Update grid tiles
  for (let y = gridY; y < gridY + roomSpec.height; y++) {
    for (let x = gridX; x < gridX + roomSpec.width; x++) {
      gameState.grid.tiles[y][x].type = "room";
      gameState.grid.tiles[y][x].occupiedBy = room.id;
      gameState.grid.tiles[y][x].walkable = true; // Rooms are walkable
    }
  }
  
  // Add room to state
  gameState.rooms.push(room);
  
  return { success: true };
}
```

### Room Deletion

```typescript
function deleteRoom(
  gameState: GameState,
  roomId: string
): { success: boolean; error?: string } {
  const roomIndex = gameState.rooms.findIndex(r => r.id === roomId);
  
  if (roomIndex === -1) {
    return { success: false, error: "Room not found" };
  }
  
  const room = gameState.rooms[roomIndex];
  
  // Check if residents are using this room
  const residentsInRoom = gameState.residents.filter(
    r => r.targetRoomId === roomId && r.currentState === "in_use"
  );
  
  if (residentsInRoom.length > 0) {
    return { success: false, error: "Residents are currently using this room" };
  }
  
  // Clear grid tiles
  for (let y = room.gridY; y < room.gridY + room.height; y++) {
    for (let x = room.gridX; x < room.gridX + room.width; x++) {
      gameState.grid.tiles[y][x].type = "empty";
      gameState.grid.tiles[y][x].occupiedBy = null;
      gameState.grid.tiles[y][x].walkable = true;
    }
  }
  
  // Remove room
  gameState.rooms.splice(roomIndex, 1);
  
  // Refund 50% of build cost
  const refund = Math.floor(room.buildCost * 0.5);
  gameState.money += refund;
  
  return { success: true };
}
```

---

## Grid Expansion

### Expansion Cost

```typescript
const EXPANSION_CONFIG = {
  COST_PER_TILE: 100,
  MIN_EXPANSION: 5,         // Minimum tiles to expand at once
  MAX_EXPANSION: 10         // Maximum tiles per expansion
};
```

### Expansion Implementation

```typescript
function expandGrid(
  gameState: GameState,
  direction: "north" | "south" | "east" | "west",
  tiles: number
): { success: boolean; error?: string; cost?: number } {
  // Validate expansion size
  if (tiles < EXPANSION_CONFIG.MIN_EXPANSION) {
    return { success: false, error: `Minimum expansion is ${EXPANSION_CONFIG.MIN_EXPANSION} tiles` };
  }
  if (tiles > EXPANSION_CONFIG.MAX_EXPANSION) {
    return { success: false, error: `Maximum expansion is ${EXPANSION_CONFIG.MAX_EXPANSION} tiles` };
  }
  
  // Calculate cost
  const totalCost = tiles * EXPANSION_CONFIG.COST_PER_TILE;
  
  // Check funds
  if (gameState.money < totalCost) {
    return { success: false, error: "Insufficient funds", cost: totalCost };
  }
  
  // Check if expansion is possible (not at grid edge)
  const { unlockedArea } = gameState.grid;
  
  switch (direction) {
    case "north":
      if (unlockedArea.minY - tiles < 0) {
        return { success: false, error: "Cannot expand beyond grid boundary" };
      }
      break;
    case "south":
      if (unlockedArea.maxY + tiles > gameState.grid.height) {
        return { success: false, error: "Cannot expand beyond grid boundary" };
      }
      break;
    case "east":
      if (unlockedArea.maxX + tiles > gameState.grid.width) {
        return { success: false, error: "Cannot expand beyond grid boundary" };
      }
      break;
    case "west":
      if (unlockedArea.minX - tiles < 0) {
        return { success: false, error: "Cannot expand beyond grid boundary" };
      }
      break;
  }
  
  // Deduct cost
  gameState.money -= totalCost;
  
  // Update unlocked area
  switch (direction) {
    case "north":
      unlockedArea.minY -= tiles;
      break;
    case "south":
      unlockedArea.maxY += tiles;
      break;
    case "east":
      unlockedArea.maxX += tiles;
      break;
    case "west":
      unlockedArea.minX -= tiles;
      break;
  }
  
  // Unlock tiles
  const { minX, minY, maxX, maxY } = unlockedArea;
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      if (gameState.grid.tiles[y][x].type === "locked") {
        gameState.grid.tiles[y][x].type = "empty";
        gameState.grid.tiles[y][x].walkable = true;
      }
    }
  }
  
  return { success: true, cost: totalCost };
}
```

---

## Grid Queries

### Room Queries

```typescript
function getRoomAt(grid: Grid, rooms: Room[], x: number, y: number): Room | null {
  const tile = grid.tiles[y]?.[x];
  if (!tile || !tile.occupiedBy) return null;
  
  return rooms.find(r => r.id === tile.occupiedBy) || null;
}

function getRoomsByType(rooms: Room[], type: RoomType): Room[] {
  return rooms.filter(r => r.type === type);
}

function getAvailableRooms(rooms: Room[], type: RoomType, phase: "day" | "night"): Room[] {
  return rooms.filter(r => {
    if (r.type !== type) return false;
    if (!r.isOpen) return false;
    
    const spec = ROOM_SPECS[r.type];
    if (spec.capacity > 0 && r.currentOccupancy >= spec.capacity) {
      return false;
    }
    
    return true;
  });
}
```

### Tile Queries

```typescript
function isWalkable(grid: Grid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return false;
  }
  return grid.tiles[y][x].walkable;
}

function getTileType(grid: Grid, x: number, y: number): TileType | null {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return null;
  }
  return grid.tiles[y][x].type;
}

function getEntranceTile(grid: Grid): { x: number; y: number } | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.tiles[y][x].type === "entrance") {
        return { x, y };
      }
    }
  }
  return null;
}
```

---

## Room State Management

### Day/Night Room Updates

```typescript
function updateRoomsForPhase(rooms: Room[], phase: "day" | "night"): void {
  for (const room of rooms) {
    const spec = ROOM_SPECS[room.type];
    
    if (spec.closesAtNight) {
      room.isOpen = phase === "day";
      
      // If closing, reset occupancy
      if (!room.isOpen) {
        room.currentOccupancy = 0;
      }
    }
  }
}
```

### Room Occupancy Management

```typescript
function enterRoom(room: Room, residentId: string): boolean {
  const spec = ROOM_SPECS[room.type];
  
  // Check if room is open
  if (!room.isOpen) return false;
  
  // Check capacity
  if (spec.capacity > 0 && room.currentOccupancy >= spec.capacity) {
    return false;
  }
  
  room.currentOccupancy++;
  return true;
}

function leaveRoom(room: Room, residentId: string): void {
  room.currentOccupancy = Math.max(0, room.currentOccupancy - 1);
}
```

---

## Utility Functions

### Room Creation Helper

```typescript
function createRoom(
  type: RoomType,
  gridX: number,
  gridY: number
): Room {
  const spec = ROOM_SPECS[type];
  
  return {
    id: generateUUID(),
    type,
    gridX,
    gridY,
    width: spec.width,
    height: spec.height,
    isOpen: !spec.closesAtNight,
    currentOccupancy: 0,
    buildCost: spec.buildCost,
    maintenanceCost: spec.maintenanceCost,
    lastMaintenancePaid: Date.now()
  };
}
```

### Grid Validation

```typescript
function validateGrid(grid: Grid, rooms: Room[]): string[] {
  const errors: string[] = [];
  
  // Check that all rooms are on the grid
  for (const room of rooms) {
    if (room.gridX < 0 || room.gridY < 0) {
      errors.push(`Room ${room.id} has negative coordinates`);
    }
    if (room.gridX + room.width > grid.width) {
      errors.push(`Room ${room.id} extends beyond grid width`);
    }
    if (room.gridY + room.height > grid.height) {
      errors.push(`Room ${room.id} extends beyond grid height`);
    }
  }
  
  // Check for overlapping rooms
  const occupancyMap = new Map<string, string>();
  for (const room of rooms) {
    for (let y = room.gridY; y < room.gridY + room.height; y++) {
      for (let x = room.gridX; x < room.gridX + room.width; x++) {
        const key = `${x},${y}`;
        if (occupancyMap.has(key)) {
          errors.push(`Tile (${x},${y}) is occupied by multiple rooms`);
        }
        occupancyMap.set(key, room.id);
      }
    }
  }
  
  return errors;
}
```

---

## Integration Notes

### Pathfinding Integration
- The grid's `walkable` property is used by the pathfinding system
- Rooms are walkable (residents can move through them)
- Locked tiles are not walkable

### Rendering Integration
- Each tile is `TILE_SIZE` pixels (32px)
- Room sprites should be rendered at `(gridX * TILE_SIZE, gridY * TILE_SIZE)`
- Visual indicators for locked/unlocked areas

### UI Integration
- Build mode should highlight valid placement areas
- Show room costs and maintenance in build menu
- Display grid expansion options at unlocked area boundaries

See [`05-Pathfinding-System.md`](05-Pathfinding-System.md) for pathfinding implementation.
