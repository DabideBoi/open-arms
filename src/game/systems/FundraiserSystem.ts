import { GameState, Fundraiser, Resident } from '../../types';
import { FUNDRAISER_CONFIG, PROFILE_SPECS, ROOM_SPECS } from '../../constants';
import { generateUUID } from '../../utils/helpers';
import { modifyReputation } from './ReputationSystem';
import { consumeFood, hasFoodAvailable } from './FoodSystem';

/**
 * FundraiserSystem - Manages fundraiser events with rebalanced mechanics
 * 
 * NEW MECHANICS:
 * - Failure chance based on average resident happiness
 * - Food consumption (3 units per participating resident)
 * - Cooldown period (10 minutes between fundraisers)
 * - Failed fundraisers have consequences
 * - Variable payout based on success roll
 * - Resident fatigue system (5 minute cooldown per resident)
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
// Cooldown Management
// ============================================================================

/**
 * Check if fundraiser cooldown is active
 */
export function isFundraiserOnCooldown(gameState: GameState): boolean {
  if (!gameState.lastFundraiserEndTime) return false;
  
  const now = Date.now();
  const cooldownEnd = gameState.lastFundraiserEndTime + FUNDRAISER_CONFIG.COOLDOWN_DURATION;
  
  return now < cooldownEnd;
}

/**
 * Get remaining cooldown time in milliseconds
 */
export function getFundraiserCooldownRemaining(gameState: GameState): number {
  if (!gameState.lastFundraiserEndTime) return 0;
  
  const now = Date.now();
  const cooldownEnd = gameState.lastFundraiserEndTime + FUNDRAISER_CONFIG.COOLDOWN_DURATION;
  
  return Math.max(0, cooldownEnd - now);
}

/**
 * Get formatted cooldown time string
 */
export function getFundraiserCooldownFormatted(gameState: GameState): string {
  const remaining = getFundraiserCooldownRemaining(gameState);
  
  if (remaining <= 0) return 'Ready';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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
 */
function applyFatigueToResidents(residents: Resident[]): void {
  const fatigueEndTime = Date.now() + FUNDRAISER_CONFIG.FATIGUE_DURATION;
  
  for (const resident of residents) {
    resident.fundraiserFatigueUntil = fatigueEndTime;
    // Apply fatigue happiness penalty
    resident.happiness = Math.max(0, resident.happiness + FUNDRAISER_CONFIG.FATIGUE_HAPPINESS_PENALTY);
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
 * Now includes validation for cooldown, fatigue, and food requirements
 */
export function startFundraiser(
  gameState: GameState,
  stationId: string,
  residentIds: string[]
): { success: boolean; error?: string; fundraiser?: Fundraiser; warning?: string } {
  
  // Check cooldown
  if (isFundraiserOnCooldown(gameState)) {
    const remaining = getFundraiserCooldownFormatted(gameState);
    return { success: false, error: `Fundraiser on cooldown. Ready in ${remaining}` };
  }
  
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
  
  // Update resident states
  for (const resident of residents) {
    resident.currentState = "in_use";
    resident.targetRoomId = stationId;
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
      
      // Reset state
      resident.currentState = "satisfied";
      resident.targetRoomId = null;
    }
    
    // Apply fatigue to all participants
    applyFatigueToResidents(participants);
    
    console.log(`✅ Fundraiser SUCCEEDED! Earned $${actualPayout} (expected: $${fundraiser.expectedPayout})`);
    
    // Emit success event
    emitFundraiserCompleted(fundraiser.id, true, actualPayout, participants.length);
  } else {
    // FAILURE: Apply negative consequences
    
    // Reputation penalty
    modifyReputation(gameState, FUNDRAISER_CONFIG.FAILURE_REPUTATION_PENALTY, "Fundraiser failed");
    
    // Apply negative effects to participants
    for (const resident of participants) {
      // Happiness penalty (embarrassment)
      resident.happiness = Math.max(0, resident.happiness + FUNDRAISER_CONFIG.FAILURE_HAPPINESS_PENALTY);
      
      // Reset state
      resident.currentState = "satisfied";
      resident.targetRoomId = null;
    }
    
    // Apply fatigue to all participants (they still worked, even if it failed)
    applyFatigueToResidents(participants);
    
    console.log(`❌ Fundraiser FAILED! No money earned. (Success chance was ${Math.round(fundraiser.successChance * 100)}%)`);
    
    // Emit failure event
    emitFundraiserCompleted(fundraiser.id, false, 0, participants.length);
  }
  
  // Update cooldown timer
  gameState.lastFundraiserEndTime = Date.now();
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
  
  // Release residents
  for (const residentId of fundraiser.assignedResidents) {
    const resident = gameState.residents.find(r => r.id === residentId);
    
    if (resident) {
      resident.currentState = "idle";
      resident.targetRoomId = null;
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
  cooldownRemaining: string;
  isOnCooldown: boolean;
  availableResidents: number;
  minResidentsRequired: number;
  foodCostPerResident: number;
} {
  const availableResidents = getAvailableResidentsForFundraiser(gameState);
  const isOnCooldown = isFundraiserOnCooldown(gameState);
  
  return {
    canStart: !isOnCooldown && availableResidents.length >= FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS,
    cooldownRemaining: getFundraiserCooldownFormatted(gameState),
    isOnCooldown,
    availableResidents: availableResidents.length,
    minResidentsRequired: FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS,
    foodCostPerResident: FUNDRAISER_CONFIG.FOOD_COST_PER_RESIDENT
  };
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit fundraiser completed event
 */
function emitFundraiserCompleted(
  fundraiserId: string,
  success: boolean,
  payout: number,
  participantCount: number
): void {
  window.dispatchEvent(new CustomEvent('fundraiser_completed', {
    detail: { fundraiserId, success, payout, participantCount }
  }));
}
