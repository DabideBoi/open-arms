import { Room, RoomType, RoomAdjacencyBonuses, Grid } from '../../types';
import { ADJACENCY_BONUSES, getAdjacencyBonusKey } from '../../constants';

/**
 * AdjacencySystem - Manages room adjacency bonuses
 * Calculates bonuses when rooms are adjacent to each other
 */

// ============================================================================
// Default Adjacency Bonuses
// ============================================================================

/**
 * Create default (empty) adjacency bonuses
 */
export function createDefaultAdjacencyBonuses(): RoomAdjacencyBonuses {
  return {
    happiness: 0,
    lifeFillModifier: 0,
    maintenanceReduction: 0,
    adjacentRoomIds: [],
    bonusDescriptions: []
  };
}

// ============================================================================
// Adjacency Detection
// ============================================================================

/**
 * Check if two rooms share at least one edge (are adjacent)
 * Diagonal tiles don't count as adjacent
 */
export function areRoomsAdjacent(room1: Room, room2: Room): boolean {
  // Get all tiles of room1
  const room1Tiles: Array<{ x: number; y: number }> = [];
  for (let x = room1.gridX; x < room1.gridX + room1.width; x++) {
    for (let y = room1.gridY; y < room1.gridY + room1.height; y++) {
      room1Tiles.push({ x, y });
    }
  }
  
  // Get all tiles of room2
  const room2Tiles: Array<{ x: number; y: number }> = [];
  for (let x = room2.gridX; x < room2.gridX + room2.width; x++) {
    for (let y = room2.gridY; y < room2.gridY + room2.height; y++) {
      room2Tiles.push({ x, y });
    }
  }
  
  // Check if any tiles share an edge (not diagonal)
  for (const tile1 of room1Tiles) {
    for (const tile2 of room2Tiles) {
      // Check cardinal directions (up, down, left, right)
      const dx = Math.abs(tile1.x - tile2.x);
      const dy = Math.abs(tile1.y - tile2.y);
      
      // Adjacent if exactly 1 tile apart in one direction and 0 in the other
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Get all rooms adjacent to a given room
 */
export function getAdjacentRooms(room: Room, allRooms: Room[]): Room[] {
  return allRooms.filter(other => 
    other.id !== room.id && areRoomsAdjacent(room, other)
  );
}

// ============================================================================
// Bonus Calculation
// ============================================================================

/**
 * Calculate adjacency bonuses for a single room
 */
export function calculateRoomBonuses(room: Room, allRooms: Room[]): RoomAdjacencyBonuses {
  const adjacentRooms = getAdjacentRooms(room, allRooms);
  
  const bonuses: RoomAdjacencyBonuses = {
    happiness: 0,
    lifeFillModifier: 0,
    maintenanceReduction: 0,
    adjacentRoomIds: [],
    bonusDescriptions: []
  };
  
  for (const adjacent of adjacentRooms) {
    const bonusKey = getAdjacencyBonusKey(room.type, adjacent.type);
    const bonus = ADJACENCY_BONUSES[bonusKey];
    
    if (bonus) {
      bonuses.happiness += bonus.happiness;
      bonuses.lifeFillModifier += bonus.lifeFillModifier;
      bonuses.maintenanceReduction += bonus.maintenanceReduction;
      bonuses.adjacentRoomIds.push(adjacent.id);
      bonuses.bonusDescriptions.push(bonus.description);
    }
  }
  
  return bonuses;
}

/**
 * Recalculate adjacency bonuses for all rooms
 * Call this after placing or demolishing a room
 */
export function recalculateAllAdjacencies(rooms: Room[]): void {
  for (const room of rooms) {
    room.adjacencyBonuses = calculateRoomBonuses(room, rooms);
  }
  
  // Log summary
  const bonusCount = rooms.filter(r => 
    r.adjacencyBonuses.happiness !== 0 || 
    r.adjacencyBonuses.lifeFillModifier !== 0 || 
    r.adjacencyBonuses.maintenanceReduction !== 0
  ).length;
  
  if (bonusCount > 0) {
    console.log(`📐 Adjacency bonuses recalculated: ${bonusCount} rooms have active bonuses`);
  }
}

// ============================================================================
// Placement Preview
// ============================================================================

export interface PlacementPreview {
  bonuses: RoomAdjacencyBonuses;
  affectedRooms: Array<{
    roomId: string;
    roomType: RoomType;
    bonusChange: {
      happiness: number;
      lifeFillModifier: number;
      maintenanceReduction: number;
      description: string;
    };
  }>;
  isPositive: boolean;
  isNegative: boolean;
  summary: string;
}

/**
 * Get a preview of what bonuses would be applied if a room is placed at a position
 */
export function getPlacementPreview(
  gridX: number,
  gridY: number,
  roomType: RoomType,
  width: number,
  height: number,
  existingRooms: Room[]
): PlacementPreview {
  // Create a temporary room for calculation
  const tempRoom: Room = {
    id: 'preview',
    type: roomType,
    gridX,
    gridY,
    width,
    height,
    isOpen: true,
    currentOccupancy: 0,
    buildCost: 0,
    maintenanceCost: 0,
    lastMaintenancePaid: 0,
    adjacencyBonuses: createDefaultAdjacencyBonuses()
  };
  
  // Calculate bonuses for the new room
  const bonuses = calculateRoomBonuses(tempRoom, existingRooms);
  
  // Calculate how this affects existing adjacent rooms
  const adjacentRooms = getAdjacentRooms(tempRoom, existingRooms);
  const affectedRooms: PlacementPreview['affectedRooms'] = [];
  
  for (const adjacent of adjacentRooms) {
    const bonusKey = getAdjacencyBonusKey(roomType, adjacent.type);
    const bonus = ADJACENCY_BONUSES[bonusKey];
    
    if (bonus) {
      affectedRooms.push({
        roomId: adjacent.id,
        roomType: adjacent.type,
        bonusChange: {
          happiness: bonus.happiness,
          lifeFillModifier: bonus.lifeFillModifier,
          maintenanceReduction: bonus.maintenanceReduction,
          description: bonus.description
        }
      });
    }
  }
  
  // Determine if overall positive or negative
  const isPositive = bonuses.happiness > 0 || bonuses.lifeFillModifier > 0 || bonuses.maintenanceReduction > 0;
  const isNegative = bonuses.happiness < 0 || bonuses.lifeFillModifier < 0 || bonuses.maintenanceReduction < 0;
  
  // Generate summary
  const summaryParts: string[] = [];
  if (bonuses.happiness !== 0) {
    summaryParts.push(`${bonuses.happiness > 0 ? '+' : ''}${bonuses.happiness} happiness`);
  }
  if (bonuses.lifeFillModifier !== 0) {
    const percent = Math.round(bonuses.lifeFillModifier * 100);
    summaryParts.push(`${percent > 0 ? '+' : ''}${percent}% LIFE fill`);
  }
  if (bonuses.maintenanceReduction !== 0) {
    const percent = Math.round(bonuses.maintenanceReduction * 100);
    summaryParts.push(`${percent > 0 ? '-' : '+'}${Math.abs(percent)}% maintenance`);
  }
  
  const summary = summaryParts.length > 0 
    ? summaryParts.join(', ')
    : 'No adjacency bonuses';
  
  return {
    bonuses,
    affectedRooms,
    isPositive,
    isNegative,
    summary
  };
}

// ============================================================================
// Visual Feedback Helpers
// ============================================================================

/**
 * Get tiles that would be affected by placing a room (for highlighting)
 */
export function getAffectedTilesForPlacement(
  gridX: number,
  gridY: number,
  width: number,
  height: number,
  existingRooms: Room[]
): Array<{ x: number; y: number; type: 'positive' | 'negative' | 'neutral' }> {
  const tiles: Array<{ x: number; y: number; type: 'positive' | 'negative' | 'neutral' }> = [];
  
  // Get adjacent rooms to the placement area
  for (const room of existingRooms) {
    let isAdjacent = false;
    
    // Check if any room tile is adjacent to any placement tile
    for (let px = gridX; px < gridX + width && !isAdjacent; px++) {
      for (let py = gridY; py < gridY + height && !isAdjacent; py++) {
        for (let rx = room.gridX; rx < room.gridX + room.width && !isAdjacent; rx++) {
          for (let ry = room.gridY; ry < room.gridY + room.height && !isAdjacent; ry++) {
            const dx = Math.abs(px - rx);
            const dy = Math.abs(py - ry);
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
              isAdjacent = true;
            }
          }
        }
      }
    }
    
    if (isAdjacent) {
      // Add all tiles of this room with appropriate type
      // This is determined per-room in the UI based on the bonus
      for (let x = room.gridX; x < room.gridX + room.width; x++) {
        for (let y = room.gridY; y < room.gridY + room.height; y++) {
          tiles.push({ x, y, type: 'neutral' }); // Type will be set by caller
        }
      }
    }
  }
  
  return tiles;
}

/**
 * Get room info with adjacency display data
 */
export function getRoomAdjacencyInfo(room: Room, allRooms: Room[]): {
  hasBonus: boolean;
  hasPenalty: boolean;
  totalHappiness: number;
  totalLifeFillModifier: number;
  totalMaintenanceReduction: number;
  descriptions: string[];
  adjacentRoomTypes: RoomType[];
} {
  const bonuses = room.adjacencyBonuses;
  
  const adjacentRoomTypes: RoomType[] = [];
  for (const adjId of bonuses.adjacentRoomIds) {
    const adjRoom = allRooms.find(r => r.id === adjId);
    if (adjRoom) {
      adjacentRoomTypes.push(adjRoom.type);
    }
  }
  
  return {
    hasBonus: bonuses.happiness > 0 || bonuses.lifeFillModifier > 0 || bonuses.maintenanceReduction > 0,
    hasPenalty: bonuses.happiness < 0 || bonuses.lifeFillModifier < 0 || bonuses.maintenanceReduction < 0,
    totalHappiness: bonuses.happiness,
    totalLifeFillModifier: bonuses.lifeFillModifier,
    totalMaintenanceReduction: bonuses.maintenanceReduction,
    descriptions: bonuses.bonusDescriptions,
    adjacentRoomTypes
  };
}

// ============================================================================
// Effective Values Calculation
// ============================================================================

/**
 * Get effective maintenance cost for a room (after adjacency reduction)
 */
export function getEffectiveMaintenanceCost(room: Room): number {
  const baseCost = room.maintenanceCost;
  const reduction = room.adjacencyBonuses.maintenanceReduction;
  
  // Apply reduction (can be negative which increases cost)
  const effectiveCost = baseCost * (1 - reduction);
  
  // Never go below 0 or above 2x base cost
  return Math.max(0, Math.min(baseCost * 2, Math.round(effectiveCost)));
}

/**
 * Get effective LIFE fill modifier for a room (for educational rooms)
 */
export function getEffectiveLifeFillModifier(room: Room): number {
  // Base modifier is 1.0 (100%)
  const modifier = room.adjacencyBonuses.lifeFillModifier;
  
  // Return as multiplier (1.0 + modifier)
  // Never go below 0.5 or above 2.0
  return Math.max(0.5, Math.min(2.0, 1.0 + modifier));
}

/**
 * Get happiness bonus for residents in a room
 */
export function getRoomHappinessBonus(room: Room): number {
  return room.adjacencyBonuses.happiness;
}
