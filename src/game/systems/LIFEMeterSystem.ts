import { GameState, Resident } from '../../types';
import { LIFE_METER_CONFIG, PROFILE_SPECS } from '../../constants';
import { getReputationMultiplier, handleGraduationReputation } from './ReputationSystem';

/**
 * LIFEMeterSystem - Manages resident progression toward graduation
 * LIFE meter fills when using Learning Centers or Vocational Rooms
 */

// ============================================================================
// LIFE Meter Updates
// ============================================================================

/**
 * Update LIFE meter for a resident using a learning room
 */
export function updateResidentLife(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Only update if in learning center or vocational room
  if (resident.currentState !== 'in_use') return;
  
  const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
  if (!room) return;
  
  if (room.type !== 'learning_center' && room.type !== 'vocational_room') {
    return;
  }
  
  // Calculate fill rate
  const baseFillRate = PROFILE_SPECS[resident.profile].lifeFillRate;
  const reputationMultiplier = getReputationMultiplier(gameState.reputation);
  const happinessMultiplier = resident.happiness / 100;
  
  // Combined multiplier (both reputation and happiness matter)
  const effectiveMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  
  // Calculate increase per second
  const fillPerSecond = baseFillRate * effectiveMultiplier;
  const increase = fillPerSecond * deltaTime;
  
  // Update LIFE meter
  const oldLife = resident.lifeMeter;
  resident.lifeMeter = Math.min(LIFE_METER_CONFIG.MAX, resident.lifeMeter + increase);
  
  // Log significant progress (every 10%)
  if (Math.floor(oldLife / 10) < Math.floor(resident.lifeMeter / 10)) {
    console.log(`${resident.name} LIFE: ${oldLife.toFixed(1)}% → ${resident.lifeMeter.toFixed(1)}%`);
  }
  
  // Check for graduation
  if (resident.lifeMeter >= LIFE_METER_CONFIG.GRADUATION_THRESHOLD) {
    graduateResident(resident, gameState);
  }
  
  resident.lastLifeUpdate = Date.now();
}

/**
 * Update all residents' LIFE meters
 */
export function updateAllResidentsLife(
  gameState: GameState,
  deltaTime: number
): void {
  for (const resident of gameState.residents) {
    updateResidentLife(resident, gameState, deltaTime);
  }
}

// ============================================================================
// Graduation
// ============================================================================

/**
 * Graduate a resident
 */
export function graduateResident(resident: Resident, gameState: GameState): void {
  console.log(`🎓 ${resident.name} graduated!`);
  
  // Update counters
  gameState.graduatedCount++;
  
  // Reputation boost
  handleGraduationReputation(gameState, resident.profile, resident.name);
  
  // Emit graduation event
  emitGraduation(resident, gameState);
  
  // Remove resident after a brief delay (handled by animation)
  // For now, remove immediately
  removeResident(gameState, resident.id);
}

/**
 * Remove a resident from the game
 */
function removeResident(gameState: GameState, residentId: string): void {
  const index = gameState.residents.findIndex(r => r.id === residentId);
  
  if (index !== -1) {
    const resident = gameState.residents[index];
    
    // Leave any room they're in
    if (resident.targetRoomId) {
      const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
      if (room && room.currentOccupancy > 0) {
        room.currentOccupancy--;
      }
    }
    
    gameState.residents.splice(index, 1);
  }
}

// ============================================================================
// LIFE Meter Calculations
// ============================================================================

/**
 * Calculate effective fill rate for a resident
 */
export function calculateFillRate(
  resident: Resident,
  gameState: GameState
): number {
  const baseFillRate = PROFILE_SPECS[resident.profile].lifeFillRate;
  const reputationMultiplier = getReputationMultiplier(gameState.reputation);
  const happinessMultiplier = resident.happiness / 100;
  
  const effectiveMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  
  return baseFillRate * effectiveMultiplier;
}

/**
 * Calculate time to graduation in seconds
 */
export function calculateTimeToGraduation(
  resident: Resident,
  gameState: GameState
): number | null {
  const fillRate = calculateFillRate(resident, gameState);
  
  if (fillRate <= 0) return null; // Stalled
  
  const remaining = LIFE_METER_CONFIG.MAX - resident.lifeMeter;
  return remaining / fillRate;
}

/**
 * Check if LIFE meter is stalled
 */
export function isLifeMeterStalled(
  resident: Resident,
  gameState: GameState
): boolean {
  const reputationMultiplier = getReputationMultiplier(gameState.reputation);
  const happinessMultiplier = resident.happiness / 100;
  const effectiveMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  
  const STALL_THRESHOLD = 0.2; // 20%
  
  return effectiveMultiplier < STALL_THRESHOLD;
}

// ============================================================================
// LIFE Meter Display
// ============================================================================

export interface LifeMeterDisplay {
  percentage: number;
  color: string;
  label: string;
  estimatedMinutesToGraduation: number | null;
}

/**
 * Get LIFE meter display info
 */
export function getLifeMeterDisplay(
  resident: Resident,
  gameState: GameState
): LifeMeterDisplay {
  const percentage = Math.floor(resident.lifeMeter);
  
  // Color coding
  let color: string;
  if (percentage < 25) color = '#ff4444'; // Red
  else if (percentage < 50) color = '#ff8800'; // Orange
  else if (percentage < 75) color = '#ffcc00'; // Yellow
  else color = '#00cc00'; // Green
  
  // Label
  let label: string;
  if (percentage < 25) label = 'Just Starting';
  else if (percentage < 50) label = 'Making Progress';
  else if (percentage < 75) label = 'Halfway There';
  else if (percentage < 95) label = 'Almost Ready';
  else label = 'Ready to Graduate!';
  
  // Estimate time to graduation
  const timeSeconds = calculateTimeToGraduation(resident, gameState);
  const estimatedMinutesToGraduation = timeSeconds ? Math.ceil(timeSeconds / 60) : null;
  
  return {
    percentage,
    color,
    label,
    estimatedMinutesToGraduation
  };
}

/**
 * Get average LIFE meter across all residents
 */
export function getAverageLifeMeter(gameState: GameState): number {
  if (gameState.residents.length === 0) return 0;
  
  const total = gameState.residents.reduce((sum, r) => sum + r.lifeMeter, 0);
  return total / gameState.residents.length;
}

// ============================================================================
// Profile-Specific Behavior
// ============================================================================

/**
 * Get profile display info
 */
export function getProfileInfo(profile: string): {
  displayName: string;
  icon: string;
  lifeFillRate: number;
  description: string;
} {
  const spec = PROFILE_SPECS[profile as keyof typeof PROFILE_SPECS];
  
  const descriptions = {
    young_adult: 'Eager to learn and adapt quickly',
    veteran: 'Resilient but requires patience',
    elderly: 'Needs comfort and dignity'
  };
  
  return {
    displayName: spec.displayName,
    icon: spec.icon,
    lifeFillRate: spec.lifeFillRate,
    description: descriptions[profile as keyof typeof descriptions] || ''
  };
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit graduation event
 */
function emitGraduation(resident: Resident, gameState: GameState): void {
  window.dispatchEvent(new CustomEvent('resident_graduated', {
    detail: {
      residentId: resident.id,
      name: resident.name,
      profile: resident.profile,
      daysInShelter: resident.daysInShelter,
      graduatedCount: gameState.graduatedCount
    }
  }));
}

/**
 * Emit LIFE meter stall warning
 */
export function emitLifeMeterStallWarning(resident: Resident): void {
  window.dispatchEvent(new CustomEvent('life_meter_stalled', {
    detail: {
      residentId: resident.id,
      name: resident.name
    }
  }));
}
