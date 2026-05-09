import { GameState, Fundraiser, Resident, ResidentProfile, Room } from '../../types';
import { FUNDRAISER_CONFIG, PROFILE_SPECS, ROOM_SPECS } from '../../constants';
import { generateUUID } from '../../utils/helpers';
import { modifyReputation } from './ReputationSystem';
import { consumeFood, hasFoodAvailable } from './FoodSystem';
import { findPath } from './PathfindingSystem';
import { isWalkable } from './GridSystem';
import { isTileOccupiedByResident } from './CollisionDetectionSystem';

// ============================================================================
// Age-Based Cooldown Configuration
// ============================================================================

/**
 * Get fatigue duration based on resident's age group (profile)
 * - Young Adults: 30 seconds (faster recovery)
 * - Adults: 2 minutes (moderate recovery) - Note: no "adult" profile exists, mapped to default
 * - Elderly: 5 minutes (slower recovery)
 * - Veterans: 5 minutes (same as elderly)
 */
export function getFatigueDurationForProfile(profile: ResidentProfile): number {
  switch (profile) {
    case 'young_adult':
      return 30 * 1000; // 30 seconds
    case 'veteran':
      return 5 * 60 * 1000; // 5 minutes (300 seconds)
    case 'elderly':
      return 5 * 60 * 1000; // 5 minutes (300 seconds)
    default:
      return FUNDRAISER_CONFIG.FATIGUE_DURATION; // Default fallback
  }
}

// ============================================================================
// Nearest Fundraiser Station Logic
// ============================================================================

/**
 * Calculate Manhattan distance between two grid positions
 */
function getManhattanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x2 - x1) + Math.abs(y2 - y1);
}

/**
 * Find the nearest fundraiser station to a resident
 */
export function findNearestFundraiserStation(
  resident: Resident,
  stations: Room[]
): Room | null {
  if (stations.length === 0) return null;
  if (stations.length === 1) return stations[0];
  
  let nearestStation: Room | null = null;
  let shortestDistance = Infinity;
  
  for (const station of stations) {
    // Calculate distance to station center
    const stationCenterX = station.gridX + Math.floor(station.width / 2);
    const stationCenterY = station.gridY + Math.floor(station.height / 2);
    
    const distance = getManhattanDistance(
      resident.gridX,
      resident.gridY,
      stationCenterX,
      stationCenterY
    );
    
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestStation = station;
    }
  }
  
  return nearestStation;
}

/**
 * Find the best fundraiser station for a group of residents
 * (minimizes total distance for all residents)
 */
export function findBestFundraiserStationForGroup(
  residents: Resident[],
  stations: Room[]
): Room | null {
  if (stations.length === 0) return null;
  if (stations.length === 1) return stations[0];
  
  let bestStation: Room | null = null;
  let lowestTotalDistance = Infinity;
  
  for (const station of stations) {
    const stationCenterX = station.gridX + Math.floor(station.width / 2);
    const stationCenterY = station.gridY + Math.floor(station.height / 2);
    
    let totalDistance = 0;
    for (const resident of residents) {
      totalDistance += getManhattanDistance(
        resident.gridX,
        resident.gridY,
        stationCenterX,
        stationCenterY
      );
    }
    
    if (totalDistance < lowestTotalDistance) {
      lowestTotalDistance = totalDistance;
      bestStation = station;
    }
  }
  
  return bestStation;
}

/**
 * Find a random unoccupied tile within a room
 * This prevents multiple NPCs from targeting the same position
 */
function findRandomUnoccupiedTileInRoom(
  grid: any,
  room: Room
): { x: number; y: number } | null {
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
  
  // Fallback: return center of room (even if occupied, pathfinding will handle waiting)
  return {
    x: room.gridX + Math.floor(room.width / 2),
    y: room.gridY + Math.floor(room.height / 2)
  };
}

/**
 * FundraiserSystem - Manages fundraiser events with rebalanced mechanics
 *
 * MECHANICS:
 * - Failure chance based on average resident happiness
 * - Food consumption (3 units per participating resident)
 * - Failed fundraisers have consequences
 * - Variable payout based on success roll
 * - Resident fatigue system (age-based cooldown per resident)
 */

// ============================================================================
// Success Chance Calculation
// ============================================================================

/**
 * Calculate fundraiser success chance based on average happiness of participating residents
 */
export function getFundraiserSuccessChance(residents: Resident[]): number {
  if (residents.length === 0) return 0;
  
  const avgHappiness = residents.reduce((sum, r) => sum + r.happiness, 0) / residents.length;
  
  if (avgHappiness >= 80) return FUNDRAISER_CONFIG.SUCCESS_CHANCE.HAPPINESS_80_PLUS;
  if (avgHappiness >= 60) return FUNDRAISER_CONFIG.SUCCESS_CHANCE.HAPPINESS_60_PLUS;
  if (avgHappiness >= 40) return FUNDRAISER_CONFIG.SUCCESS_CHANCE.HAPPINESS_40_PLUS;
  if (avgHappiness >= 20) return FUNDRAISER_CONFIG.SUCCESS_CHANCE.HAPPINESS_20_PLUS;
  return FUNDRAISER_CONFIG.SUCCESS_CHANCE.HAPPINESS_BELOW_20;
}

// ============================================================================
// Fatigue Management
// ============================================================================

/**
 * Check if a resident is fatigued from a previous fundraiser
 */
export function isResidentFatigued(resident: Resident): boolean {
  if (!resident.fundraiserFatigueUntil) return false;
  return Date.now() < resident.fundraiserFatigueUntil;
}

/**
 * Get remaining fatigue time for a resident in milliseconds
 */
export function getResidentFatigueRemaining(resident: Resident): number {
  if (!resident.fundraiserFatigueUntil) return 0;
  return Math.max(0, resident.fundraiserFatigueUntil - Date.now());
}

/**
 * Apply fatigue to participating residents
 * Now uses age-based cooldown durations
 */
function applyFatigueToResidents(residents: Resident[]): void {
  const now = Date.now();
  
  for (const resident of residents) {
    // Get age-based fatigue duration for this specific resident
    const fatigueDuration = getFatigueDurationForProfile(resident.profile);
    resident.fundraiserFatigueUntil = now + fatigueDuration;
    
    // Apply fatigue happiness penalty
    resident.happiness = Math.max(0, resident.happiness + FUNDRAISER_CONFIG.FATIGUE_HAPPINESS_PENALTY);
    
    console.log(`⏳ ${resident.name} (${resident.profile}) fatigued for ${fatigueDuration / 1000}s`);
  }
}

/**
 * Get count of non-fatigued residents
 */
export function getNonFatiguedResidentCount(gameState: GameState): number {
  return gameState.residents.filter(r => !isResidentFatigued(r)).length;
}

// ============================================================================
// Food Requirement Check
// ============================================================================

/**
 * Calculate food cost for a fundraiser
 */
export function calculateFundraiserFoodCost(residentCount: number): number {
  return residentCount * FUNDRAISER_CONFIG.FOOD_COST_PER_RESIDENT;
}

/**
 * Check if there's enough food to start a fundraiser
 */
export function canAffordFundraiserFood(gameState: GameState, residentCount: number): boolean {
  const foodCost = calculateFundraiserFoodCost(residentCount);
  return hasFoodAvailable(gameState, foodCost);
}

// ============================================================================
// Start Fundraiser
// ============================================================================

/**
 * Start a new fundraiser at a fundraiser station
 * Validates fatigue and food requirements (no global cooldown)
 */
export function startFundraiser(
  gameState: GameState,
  stationId: string,
  residentIds: string[]
): { success: boolean; error?: string; fundraiser?: Fundraiser; warning?: string } {
  
  // Validate residents
  if (residentIds.length === 0) {
    return { success: false, error: "No residents assigned" };
  }
  
  // Find the fundraiser station
  const station = gameState.rooms.find(r => r.id === stationId);
  if (!station || station.type !== "fundraiser_station") {
    return { success: false, error: "Invalid fundraiser station" };
  }
  
  if (!station.isOpen) {
    return { success: false, error: "Fundraiser station is closed" };
  }
  
  // Check capacity
  const capacity = ROOM_SPECS.fundraiser_station.capacity;
  if (residentIds.length > capacity) {
    return { success: false, error: `Maximum ${capacity} residents per fundraiser` };
  }
  
  // Check if residents exist and are available
  const residents: Resident[] = [];
  for (const residentId of residentIds) {
    const resident = gameState.residents.find(r => r.id === residentId);
    
    if (!resident) {
      return { success: false, error: `Resident not found` };
    }
    
    // Check if already in a fundraiser
    const alreadyAssigned = gameState.activeFundraisers.some(
      f => f.assignedResidents.includes(residentId)
    );
    
    if (alreadyAssigned) {
      return { success: false, error: `${resident.name} is already in a fundraiser` };
    }
    
    // Check fatigue
    if (isResidentFatigued(resident)) {
      const remaining = Math.ceil(getResidentFatigueRemaining(resident) / 60000);
      return { success: false, error: `${resident.name} is fatigued (${remaining} min remaining)` };
    }
    
    residents.push(resident);
  }
  
  // Check minimum non-fatigued residents requirement
  if (residents.length < FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS) {
    return { 
      success: false, 
      error: `Need at least ${FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS} residents to start a fundraiser` 
    };
  }
  
  // Check food requirement
  const foodCost = calculateFundraiserFoodCost(residents.length);
  if (!hasFoodAvailable(gameState, foodCost)) {
    return { 
      success: false, 
      error: `Not enough food! Need ${foodCost} units, have ${gameState.food}` 
    };
  }
  
  // Consume food
  consumeFood(gameState, foodCost);
  
  // Calculate success chance
  const successChance = getFundraiserSuccessChance(residents);
  
  // Calculate expected payout
  const expectedPayout = calculateFundraiserPayout(
    residentIds.length,
    gameState.reputation,
    residents
  );
  
  // Create fundraiser
  const now = Date.now();
  const durationMs = FUNDRAISER_CONFIG.DURATION_MINUTES * 60 * 1000;
  
  const fundraiser: Fundraiser = {
    id: generateUUID(),
    stationId,
    startedAt: now,
    duration: FUNDRAISER_CONFIG.DURATION_MINUTES,
    completesAt: now + durationMs,
    assignedResidents: [...residentIds],
    expectedPayout,
    successChance
  };
  
  // Add to active fundraisers
  gameState.activeFundraisers.push(fundraiser);
  
  // Update resident states - make them pathfind to the station
  for (const resident of residents) {
    // Find a random UNOCCUPIED position within the fundraiser station
    // This prevents multiple residents from targeting the same tile
    let targetTile = findRandomUnoccupiedTileInRoom(gameState.grid, station);
    
    if (!targetTile) {
      console.warn(`⚠️ ${resident.name} couldn't find unoccupied tile in fundraiser station, using center`);
      // Fallback to center if no unoccupied tiles found
      targetTile = {
        x: station.gridX + Math.floor(station.width / 2),
        y: station.gridY + Math.floor(station.height / 2)
      };
    }
    
    const path = findPath(
      gameState.grid,
      Math.floor(resident.gridX),
      Math.floor(resident.gridY),
      targetTile.x,
      targetTile.y
    );
    
    if (path && path.length > 0) {
      console.log(`🎪 [FundraiserSystem] ${resident.name} - Current state: "${resident.currentState}", Setting path (length: ${path.length})`);
      resident.path = path;
      resident.pathIndex = 0;
      resident.currentState = "pathfinding";
      resident.targetRoomId = stationId;
      resident.currentNeed = "fundraiser";
      console.log(`🚶 ${resident.name} pathfinding to fundraiser station at (${targetTile.x}, ${targetTile.y})`);
    } else {
      // No path found - set them to in_use anyway (they'll teleport or handle it)
      console.warn(`⚠️ ${resident.name} couldn't find path to fundraiser station, setting in_use anyway`);
      resident.currentState = "in_use";
      resident.targetRoomId = stationId;
      resident.currentNeed = "fundraiser";
    }
  }
  
  // Generate warning if low success chance
  let warning: string | undefined;
  if (successChance < 0.5) {
    const percentChance = Math.round(successChance * 100);
    warning = `⚠️ Low success chance (${percentChance}%) due to low happiness!`;
  }
  
  console.log(`🎪 Fundraiser started! Success chance: ${Math.round(successChance * 100)}%, Expected: $${expectedPayout} in ${FUNDRAISER_CONFIG.DURATION_MINUTES} minutes`);
  console.log(`🍽️ Consumed ${foodCost} food for fundraiser`);
  
  return { success: true, fundraiser, warning };
}

/**
 * Calculate fundraiser payout based on residents and reputation
 * Formula: BaseAmount × AssignedResidents × (Reputation/100) × AvgEfficiency
 */
export function calculateFundraiserPayout(
  residentCount: number,
  reputation: number,
  residents: Resident[]
): number {
  // Random base amount between min and max
  const baseAmount = Math.floor(
    Math.random() * (FUNDRAISER_CONFIG.BASE_PAYOUT_MAX - FUNDRAISER_CONFIG.BASE_PAYOUT_MIN) +
    FUNDRAISER_CONFIG.BASE_PAYOUT_MIN
  );
  
  // Reputation modifier (0.5 to 1.5 based on 0-100 reputation)
  const reputationModifier = FUNDRAISER_CONFIG.BASE_REPUTATION_MODIFIER + (reputation / 100);
  
  // Profile efficiency (average of all residents)
  const profileEfficiencies = residents.map(r => 
    PROFILE_SPECS[r.profile].fundraiserEfficiency
  );
  const avgEfficiency = profileEfficiencies.reduce((sum, e) => sum + e, 0) / profileEfficiencies.length;
  
  // Calculate final payout
  const payout = Math.floor(
    baseAmount * residentCount * reputationModifier * avgEfficiency
  );
  
  return payout;
}

/**
 * Calculate actual payout based on success roll
 * If roll >= successChance threshold: payout scales by how much roll exceeded threshold
 * If roll < threshold: failure, no payout
 */
export function calculateActualPayout(
  successRoll: number,
  successChance: number,
  expectedPayout: number
): number {
  // If failed (roll under threshold), no payout
  const failureThreshold = 1 - successChance;
  if (successRoll < failureThreshold) {
    return 0;
  }
  
  // Scale payout by how well the roll exceeded threshold
  // Better rolls = higher payout (up to 150% of expected)
  const bonusMultiplier = 1 + ((successRoll - failureThreshold) / successChance) * 0.5;
  return Math.floor(expectedPayout * bonusMultiplier);
}

// ============================================================================
// Check Fundraiser Completion
// ============================================================================

/**
 * Check for completed fundraisers and process them
 */
export function checkFundraiserCompletion(gameState: GameState): void {
  const now = Date.now();
  
  for (let i = gameState.activeFundraisers.length - 1; i >= 0; i--) {
    const fundraiser = gameState.activeFundraisers[i];
    
    if (now >= fundraiser.completesAt) {
      completeFundraiser(fundraiser, gameState);
      gameState.activeFundraisers.splice(i, 1);
    }
  }
}

/**
 * Complete a fundraiser and apply effects
 * Now includes success/failure determination
 */
function completeFundraiser(fundraiser: Fundraiser, gameState: GameState): void {
  // Roll for success
  const successRoll = Math.random();
  fundraiser.successRoll = successRoll;
  
  // Get participating residents
  const participants: Resident[] = [];
  for (const residentId of fundraiser.assignedResidents) {
    const resident = gameState.residents.find(r => r.id === residentId);
    if (resident) {
      participants.push(resident);
    }
  }
  
  // Calculate actual payout
  const actualPayout = calculateActualPayout(
    successRoll,
    fundraiser.successChance,
    fundraiser.expectedPayout
  );
  
  const isSuccess = actualPayout > 0;
  
  if (isSuccess) {
    // SUCCESS: Award payout and positive effects
    gameState.money += actualPayout;
    
    // Reputation boost
    modifyReputation(gameState, FUNDRAISER_CONFIG.REPUTATION_BOOST, "Fundraiser completed");
    
    // Apply positive effects to participants
    for (const resident of participants) {
      // LIFE meter boost
      resident.lifeMeter = Math.min(100, resident.lifeMeter + FUNDRAISER_CONFIG.LIFE_BOOST);
      
      // Happiness cost (fatigue from work)
      resident.happiness = Math.max(0, resident.happiness - FUNDRAISER_CONFIG.HAPPINESS_COST);
      
      // Reset state and clear fundraiser need
      resident.currentState = "satisfied";
      resident.targetRoomId = null;
      if (resident.currentNeed === "fundraiser") {
        resident.currentNeed = null;
      }
    }
    
    // Apply fatigue to all participants
    applyFatigueToResidents(participants);
    
    console.log(`✅ Fundraiser SUCCEEDED! Earned $${actualPayout} (expected: $${fundraiser.expectedPayout})`);
    
    // Emit success event with full details
    emitFundraiserCompleted(fundraiser, true, actualPayout, participants);
  } else {
    // FAILURE: Apply negative consequences
    
    // Reputation penalty
    modifyReputation(gameState, FUNDRAISER_CONFIG.FAILURE_REPUTATION_PENALTY, "Fundraiser failed");
    
    // Apply negative effects to participants
    for (const resident of participants) {
      // Happiness penalty (embarrassment)
      resident.happiness = Math.max(0, resident.happiness + FUNDRAISER_CONFIG.FAILURE_HAPPINESS_PENALTY);
      
      // Reset state and clear fundraiser need
      resident.currentState = "satisfied";
      resident.targetRoomId = null;
      if (resident.currentNeed === "fundraiser") {
        resident.currentNeed = null;
      }
    }
    
    // Apply fatigue to all participants (they still worked, even if it failed)
    applyFatigueToResidents(participants);
    
    console.log(`❌ Fundraiser FAILED! No money earned. (Success chance was ${Math.round(fundraiser.successChance * 100)}%)`);
    
    // Emit failure event with full details
    emitFundraiserCompleted(fundraiser, false, 0, participants);
  }
}

// ============================================================================
// Cancel Fundraiser
// ============================================================================

/**
 * Cancel a fundraiser and release residents
 * Note: Food is NOT refunded when canceling
 */
export function cancelFundraiser(
  gameState: GameState,
  fundraiserId: string
): { success: boolean; error?: string } {
  
  const index = gameState.activeFundraisers.findIndex(f => f.id === fundraiserId);
  
  if (index === -1) {
    return { success: false, error: "Fundraiser not found" };
  }
  
  const fundraiser = gameState.activeFundraisers[index];
  
  // Release residents and clear fundraiser need
  for (const residentId of fundraiser.assignedResidents) {
    const resident = gameState.residents.find(r => r.id === residentId);
    
    if (resident) {
      resident.currentState = "idle";
      resident.targetRoomId = null;
      if (resident.currentNeed === "fundraiser") {
        resident.currentNeed = null;
      }
    }
  }
  
  // Remove fundraiser
  gameState.activeFundraisers.splice(index, 1);
  
  console.log("Fundraiser canceled (food was not refunded)");
  
  return { success: true };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get fundraiser progress as percentage (0-100)
 */
export function getFundraiserProgress(fundraiser: Fundraiser): number {
  const now = Date.now();
  const elapsed = now - fundraiser.startedAt;
  const total = fundraiser.completesAt - fundraiser.startedAt;
  
  return Math.min(100, (elapsed / total) * 100);
}

/**
 * Get time remaining for fundraiser in formatted string
 */
export function getFundraiserTimeRemaining(fundraiser: Fundraiser): string {
  const now = Date.now();
  const remaining = fundraiser.completesAt - now;
  
  if (remaining <= 0) return "Completing...";
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get available residents for fundraiser (not already assigned, healthy, not fatigued)
 */
export function getAvailableResidentsForFundraiser(gameState: GameState): Resident[] {
  return gameState.residents.filter(r => {
    // Not already in a fundraiser
    const inFundraiser = gameState.activeFundraisers.some(
      f => f.assignedResidents.includes(r.id)
    );
    
    // Not fatigued
    const fatigued = isResidentFatigued(r);
    
    // Not in critical state
    const healthy = r.happiness > 20 && r.lifeMeter < 95;
    
    return !inFundraiser && !fatigued && healthy;
  });
}

/**
 * Get fundraiser status info for UI
 */
export function getFundraiserStatus(gameState: GameState): {
  canStart: boolean;
  availableResidents: number;
  minResidentsRequired: number;
  foodCostPerResident: number;
} {
  const availableResidents = getAvailableResidentsForFundraiser(gameState);
  
  return {
    canStart: availableResidents.length >= FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS,
    availableResidents: availableResidents.length,
    minResidentsRequired: FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS,
    foodCostPerResident: FUNDRAISER_CONFIG.FOOD_COST_PER_RESIDENT
  };
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Data structure for fundraiser completion details
 */
export interface FundraiserCompletionData {
  fundraiserId: string;
  success: boolean;
  payout: number;
  expectedPayout: number;
  participantNames: string[];
  participantCount: number;
  successChance: number;
  successRoll: number;
  duration: number; // in minutes
  reputationChange: number;
  completedAt: number; // timestamp
}

/**
 * Emit fundraiser completed event with full details
 */
function emitFundraiserCompleted(
  fundraiser: Fundraiser,
  success: boolean,
  payout: number,
  participants: Resident[]
): void {
  const completionData: FundraiserCompletionData = {
    fundraiserId: fundraiser.id,
    success,
    payout,
    expectedPayout: fundraiser.expectedPayout,
    participantNames: participants.map(p => p.name),
    participantCount: participants.length,
    successChance: fundraiser.successChance,
    successRoll: fundraiser.successRoll || 0,
    duration: fundraiser.duration,
    reputationChange: success
      ? FUNDRAISER_CONFIG.REPUTATION_BOOST
      : FUNDRAISER_CONFIG.FAILURE_REPUTATION_PENALTY,
    completedAt: Date.now()
  };
  
  window.dispatchEvent(new CustomEvent('fundraiser_completed', {
    detail: completionData
  }));
}
