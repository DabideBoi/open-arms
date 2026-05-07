import { Grid, Tile, Room, RoomType, PlacementResult, ShelterTier } from '../../types';
import { GRID_CONFIG, ROOM_SPECS, EXPANSION_CONFIG, SHELTER_TIERS } from '../../constants';
import { generateUUID } from '../../utils/helpers';
import { createDefaultAdjacencyBonuses, recalculateAllAdjacencies } from './AdjacencySystem';

/**
 * Initialize a new grid with starter area unlocked based on tier
 * @param tier - Optional tier to initialize with (defaults to 1)
 */
export function initializeGrid(tier: ShelterTier = 1): Grid {
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
  
  // Get grid size for the specified tier
  const tierGridSize = SHELTER_TIERS[tier].gridSize;
  
  // Calculate starter area (centered)
  const startX = Math.floor(GRID_CONFIG.TOTAL_WIDTH / 2) - Math.floor(tierGridSize / 2);
  const startY = Math.floor(GRID_CONFIG.TOTAL_HEIGHT / 2) - Math.floor(tierGridSize / 2);
  
  // Unlock starter area based on tier
  for (let y = startY; y < startY + tierGridSize; y++) {
    for (let x = startX; x < startX + tierGridSize; x++) {
      tiles[y][x].type = "empty";
      tiles[y][x].walkable = true;
    }
  }
  
  // Set entrance tile (bottom center of starter area)
  const entranceX = startX + Math.floor(tierGridSize / 2);
  const entranceY = startY + tierGridSize - 1;
  tiles[entranceY][entranceX].type = "entrance";
  
  return {
    width: GRID_CONFIG.TOTAL_WIDTH,
    height: GRID_CONFIG.TOTAL_HEIGHT,
    tiles,
    unlockedArea: {
      minX: startX,
      minY: startY,
      maxX: startX + tierGridSize,
      maxY: startY + tierGridSize
    }
  };
}

/**
 * Check if a room can be placed at the given position
 */
export function canPlaceRoom(
  grid: Grid,
  roomType: RoomType,
  gridX: number,
  gridY: number
): boolean {
  const roomSpec = ROOM_SPECS[roomType];
  
  // Check bounds
  if (gridX < 0 || gridY < 0) return false;
  if (gridX + roomSpec.width > grid.width) return false;
  if (gridY + roomSpec.height > grid.height) return false;
  
  // Check if within unlocked area
  const { unlockedArea } = grid;
  if (gridX < unlockedArea.minX || gridX + roomSpec.width > unlockedArea.maxX) return false;
  if (gridY < unlockedArea.minY || gridY + roomSpec.height > unlockedArea.maxY) return false;
  
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

/**
 * Place a room on the grid
 */
export function placeRoom(
  grid: Grid,
  rooms: Room[],
  money: number,
  roomType: RoomType,
  gridX: number,
  gridY: number,
  currentPhase: "day" | "night"
): { success: boolean; error?: string; room?: Room; newMoney?: number } {
  const roomSpec = ROOM_SPECS[roomType];
  
  // Validate placement
  if (!canPlaceRoom(grid, roomType, gridX, gridY)) {
    return { success: false, error: "Cannot place room here" };
  }
  
  // Check funds
  if (money < roomSpec.buildCost) {
    return { success: false, error: "Insufficient funds" };
  }
  
  // Create room
  const room: Room = {
    id: generateUUID(),
    type: roomType,
    gridX,
    gridY,
    width: roomSpec.width,
    height: roomSpec.height,
    isOpen: roomSpec.closesAtNight ? (currentPhase === "day") : true,
    currentOccupancy: 0,
    buildCost: roomSpec.buildCost,
    maintenanceCost: roomSpec.maintenanceCost,
    lastMaintenancePaid: Date.now(),
    adjacencyBonuses: createDefaultAdjacencyBonuses(),
    image: roomSpec.image  // Copy image property from spec
  };
  
  // Update grid tiles
  for (let y = gridY; y < gridY + roomSpec.height; y++) {
    for (let x = gridX; x < gridX + roomSpec.width; x++) {
      grid.tiles[y][x].type = "room";
      grid.tiles[y][x].occupiedBy = room.id;
      grid.tiles[y][x].walkable = true; // Rooms are walkable
    }
  }
  
  // Add room to list
  rooms.push(room);
  
  // Recalculate adjacency bonuses for all rooms
  recalculateAllAdjacencies(rooms);
  
  return {
    success: true,
    room,
    newMoney: money - roomSpec.buildCost
  };
}

/**
 * Get room at specific grid position
 */
export function getRoomAt(grid: Grid, rooms: Room[], x: number, y: number): Room | null {
  const tile = grid.tiles[y]?.[x];
  if (!tile || !tile.occupiedBy) return null;
  
  return rooms.find(r => r.id === tile.occupiedBy) || null;
}

/**
 * Check if a tile is walkable
 */
export function isWalkable(grid: Grid, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return false;
  }
  return grid.tiles[y][x].walkable;
}

/**
 * Get entrance tile position
 */
export function getEntranceTile(grid: Grid): { x: number; y: number } | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.tiles[y][x].type === "entrance") {
        return { x, y };
      }
    }
  }
  return null;
}

/**
 * Calculate the cost of grid expansion based on current unlocked area
 */
export function calculateExpansionCost(grid: Grid): number {
  const { unlockedArea } = grid;
  const unlockedTiles = (unlockedArea.maxX - unlockedArea.minX) * (unlockedArea.maxY - unlockedArea.minY);
  
  // Cost = BaseExpansionCost × (1 + UnlockedTiles/100)
  const cost = Math.floor(
    EXPANSION_CONFIG.BASE_COST * (1 + unlockedTiles * EXPANSION_CONFIG.COST_FORMULA_MULTIPLIER)
  );
  
  return cost;
}

/**
 * Expand the grid in a specific direction
 */
export function expandGrid(
  grid: Grid,
  money: number,
  direction: "north" | "south" | "east" | "west"
): { success: boolean; error?: string; newMoney?: number; cost?: number } {
  
  const expansionSize = EXPANSION_CONFIG.EXPANSION_SIZE;
  const cost = calculateExpansionCost(grid);
  
  // Check funds
  if (money < cost) {
    return { success: false, error: "Insufficient funds", cost };
  }
  
  const { unlockedArea } = grid;
  
  // Check if expansion is possible (not at grid edge)
  switch (direction) {
    case "north":
      if (unlockedArea.minY - expansionSize < 0) {
        return { success: false, error: "Cannot expand beyond grid boundary" };
      }
      break;
    case "south":
      if (unlockedArea.maxY + expansionSize > grid.height) {
        return { success: false, error: "Cannot expand beyond grid boundary" };
      }
      break;
    case "east":
      if (unlockedArea.maxX + expansionSize > grid.width) {
        return { success: false, error: "Cannot expand beyond grid boundary" };
      }
      break;
    case "west":
      if (unlockedArea.minX - expansionSize < 0) {
        return { success: false, error: "Cannot expand beyond grid boundary" };
      }
      break;
  }
  
  // Update unlocked area
  switch (direction) {
    case "north":
      unlockedArea.minY -= expansionSize;
      break;
    case "south":
      unlockedArea.maxY += expansionSize;
      break;
    case "east":
      unlockedArea.maxX += expansionSize;
      break;
    case "west":
      unlockedArea.minX -= expansionSize;
      break;
  }
  
  // Unlock tiles
  const { minX, minY, maxX, maxY } = unlockedArea;
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      if (grid.tiles[y][x].type === "locked") {
        grid.tiles[y][x].type = "empty";
        grid.tiles[y][x].walkable = true;
      }
    }
  }
  
  console.log(`Grid expanded ${direction} for $${cost}`);
  
  return {
    success: true,
    newMoney: money - cost,
    cost
  };
}

/**
 * Check if expansion is possible in a direction
 */
export function canExpandInDirection(
  grid: Grid,
  direction: "north" | "south" | "east" | "west"
): boolean {
  const expansionSize = EXPANSION_CONFIG.EXPANSION_SIZE;
  const { unlockedArea } = grid;
  
  switch (direction) {
    case "north":
      return unlockedArea.minY - expansionSize >= 0;
    case "south":
      return unlockedArea.maxY + expansionSize <= grid.height;
    case "east":
      return unlockedArea.maxX + expansionSize <= grid.width;
    case "west":
      return unlockedArea.minX - expansionSize >= 0;
  }
}

/**
 * Get all possible expansion directions
 */
export function getAvailableExpansions(grid: Grid): Array<"north" | "south" | "east" | "west"> {
  const directions: Array<"north" | "south" | "east" | "west"> = ["north", "south", "east", "west"];
  return directions.filter(dir => canExpandInDirection(grid, dir));
}

/**
 * Demolish a room from the grid
 */
export function demolishRoom(
  grid: Grid,
  rooms: Room[],
  roomId: string
): { success: boolean; error?: string; refund?: number } {
  const roomIndex = rooms.findIndex(r => r.id === roomId);
  
  if (roomIndex === -1) {
    return { success: false, error: "Room not found" };
  }
  
  const room = rooms[roomIndex];
  
  // Calculate refund (50% of build cost)
  const refund = Math.floor(room.buildCost * 0.5);
  
  // Clear grid tiles
  for (let y = room.gridY; y < room.gridY + room.height; y++) {
    for (let x = room.gridX; x < room.gridX + room.width; x++) {
      grid.tiles[y][x].type = "empty";
      grid.tiles[y][x].occupiedBy = null;
      grid.tiles[y][x].walkable = true;
    }
  }
  
  // Remove room from list
  rooms.splice(roomIndex, 1);
  
  // Recalculate adjacency bonuses for remaining rooms
  recalculateAllAdjacencies(rooms);
  
  console.log(`🏚️ Demolished ${room.type} at (${room.gridX}, ${room.gridY}), refund: $${refund}`);
  
  return {
    success: true,
    refund
  };
}

/**
 * Get the current unlocked area size
 */
export function getUnlockedAreaSize(grid: Grid): { width: number; height: number; totalTiles: number } {
  const { unlockedArea } = grid;
  const width = unlockedArea.maxX - unlockedArea.minX;
  const height = unlockedArea.maxY - unlockedArea.minY;
  return {
    width,
    height,
    totalTiles: width * height
  };
}

/**
 * Calculate grid utilization percentage
 */
export function calculateGridUtilization(grid: Grid, rooms: Room[]): number {
  const { totalTiles } = getUnlockedAreaSize(grid);
  if (totalTiles === 0) return 0;
  
  // Count tiles occupied by rooms
  let occupiedTiles = 0;
  for (const room of rooms) {
    occupiedTiles += room.width * room.height;
  }
  
  return occupiedTiles / totalTiles;
}

/**
 * Expand grid to a specific size (for tier upgrades)
 * This expands symmetrically from the center
 */
export function expandGridToSize(grid: Grid, targetSize: number): void {
  // Calculate center of the grid
  const centerX = Math.floor(grid.width / 2);
  const centerY = Math.floor(grid.height / 2);
  
  // Calculate new unlocked area centered on grid
  const halfSize = Math.floor(targetSize / 2);
  const newMinX = Math.max(0, centerX - halfSize);
  const newMinY = Math.max(0, centerY - halfSize);
  const newMaxX = Math.min(grid.width, centerX + halfSize + (targetSize % 2));
  const newMaxY = Math.min(grid.height, centerY + halfSize + (targetSize % 2));
  
  // Update unlocked area (only expand, never shrink)
  grid.unlockedArea = {
    minX: Math.min(grid.unlockedArea.minX, newMinX),
    minY: Math.min(grid.unlockedArea.minY, newMinY),
    maxX: Math.max(grid.unlockedArea.maxX, newMaxX),
    maxY: Math.max(grid.unlockedArea.maxY, newMaxY)
  };
  
  // Unlock tiles in the new area
  for (let y = grid.unlockedArea.minY; y < grid.unlockedArea.maxY; y++) {
    for (let x = grid.unlockedArea.minX; x < grid.unlockedArea.maxX; x++) {
      if (grid.tiles[y] && grid.tiles[y][x]) {
        const tile = grid.tiles[y][x];
        if (tile.type === 'locked') {
          tile.type = 'empty';
          tile.walkable = true;
        }
      }
    }
  }
  
  console.log(`🏗️ Grid expanded to ${targetSize}x${targetSize}`);
}

/**
 * Get the expected grid size for a given tier
 */
export function getTierGridSize(tier: ShelterTier): number {
  return SHELTER_TIERS[tier].gridSize;
}
