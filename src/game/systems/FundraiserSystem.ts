import { GameState, Fundraiser, Resident } from '../../types';
import { FUNDRAISER_CONFIG, PROFILE_SPECS, ROOM_SPECS } from '../../constants';
import { generateUUID } from '../../utils/helpers';
import { modifyReputation } from './ReputationSystem';

/**
 * Start a new fundraiser at a fundraiser station
 */
export function startFundraiser(
  gameState: GameState,
  stationId: string,
  residentIds: string[]
): { success: boolean; error?: string; fundraiser?: Fundraiser } {
  
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
    
    residents.push(resident);
  }
  
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
    expectedPayout
  };
  
  // Add to active fundraisers
  gameState.activeFundraisers.push(fundraiser);
  
  // Update resident states
  for (const resident of residents) {
    resident.currentState = "in_use";
    resident.targetRoomId = stationId;
  }
  
  console.log(`🎪 Fundraiser started! Expected: $${expectedPayout} in ${FUNDRAISER_CONFIG.DURATION_MINUTES} minutes`);
  
  return { success: true, fundraiser };
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
 */
function completeFundraiser(fundraiser: Fundraiser, gameState: GameState): void {
  // Award payout
  gameState.money += fundraiser.expectedPayout;
  
  // Reputation boost
  modifyReputation(gameState, FUNDRAISER_CONFIG.REPUTATION_BOOST, "Fundraiser completed");
  
  // Apply effects to participants
  for (const residentId of fundraiser.assignedResidents) {
    const resident = gameState.residents.find(r => r.id === residentId);
    
    if (resident) {
      // LIFE meter boost
      resident.lifeMeter = Math.min(100, resident.lifeMeter + FUNDRAISER_CONFIG.LIFE_BOOST);
      
      // Happiness cost (fatigue)
      resident.happiness = Math.max(0, resident.happiness - FUNDRAISER_CONFIG.HAPPINESS_COST);
      
      // Reset state
      resident.currentState = "satisfied";
      resident.targetRoomId = null;
    }
  }
  
  console.log(`✅ Fundraiser completed! Earned $${fundraiser.expectedPayout}`);
}

/**
 * Cancel a fundraiser and release residents
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
  
  console.log("Fundraiser canceled");
  
  return { success: true };
}

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
 * Get available residents for fundraiser (not already assigned, healthy)
 */
export function getAvailableResidentsForFundraiser(gameState: GameState): Resident[] {
  return gameState.residents.filter(r => {
    // Not already in a fundraiser
    const inFundraiser = gameState.activeFundraisers.some(
      f => f.assignedResidents.includes(r.id)
    );
    
    // Not in critical state
    const healthy = r.happiness > 20 && r.lifeMeter < 95;
    
    return !inFundraiser && healthy;
  });
}
