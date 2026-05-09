import { GameState, Resident, ResidentState, Need, RoomType } from '../../types';
import { LIFE_METER_CONFIG, PROFILE_SPECS, LIFE_ACTIVITY_RATES } from '../../constants';
import { getReputationMultiplier, handleGraduationReputation, recordGraduation } from './ReputationSystem';
import { getLifeFillModifier } from './FoodSystem';
import { getEffectiveLifeFillModifier } from './AdjacencySystem';

/**
 * LIFEMeterSystem - Manages resident progression toward graduation
 * LIFE meter fills at different rates depending on resident activity:
 * - Learning (learning_center/vocational_room): 100% rate (primary growth activity)
 * - Eating (cafeteria): 50% rate
 * - Sleeping (dormitory): 25% rate
 * - Social (common_room): 15% rate
 * - Idle/other activities: 10% rate
 * - Bathroom: 0% rate
 *
 * Additional modifiers:
 * - Food quality affects LIFE fill rate via lifeFillModifier (0.3x to 1.5x)
 * - Room adjacency bonuses can increase/decrease fill rate
 * - Reputation and happiness also affect fill rate
 */

// ============================================================================
// Activity Rate Determination
// ============================================================================

/**
 * Determine the activity rate multiplier based on resident's current state and activity
 * Returns a multiplier from LIFE_ACTIVITY_RATES
 */
export function getActivityRateMultiplier(
  resident: Resident,
  gameState: GameState
): { rate: number; activity: string } {
  // Check if resident is in a specific state
  if (resident.currentState === 'sleeping') {
    return { rate: LIFE_ACTIVITY_RATES.SLEEPING, activity: 'sleeping' };
  }
  
  if (resident.currentState === 'leaving') {
    return { rate: 0, activity: 'leaving' };
  }
  
  // If resident is in a room (in_use state), check the room type
  if (resident.currentState === 'in_use' && resident.targetRoomId) {
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (room) {
      return getActivityRateForRoomType(room.type);
    }
  }
  
  // Check current need for other activities
  if (resident.currentNeed) {
    switch (resident.currentNeed) {
      case 'learning':
        return { rate: LIFE_ACTIVITY_RATES.LEARNING, activity: 'learning' };
      case 'food':
        return { rate: LIFE_ACTIVITY_RATES.EATING, activity: 'eating' };
      case 'sleep':
        return { rate: LIFE_ACTIVITY_RATES.SLEEPING, activity: 'sleeping' };
      case 'social':
        return { rate: LIFE_ACTIVITY_RATES.SOCIAL, activity: 'social' };
      case 'bathroom':
        return { rate: LIFE_ACTIVITY_RATES.BATHROOM, activity: 'bathroom' };
    }
  }
  
  // Default: idle state
  return { rate: LIFE_ACTIVITY_RATES.IDLE, activity: 'idle' };
}

/**
 * Get activity rate for a specific room type
 */
function getActivityRateForRoomType(roomType: RoomType): { rate: number; activity: string } {
  switch (roomType) {
    case 'learning_center':
    case 'vocational_room':
      return { rate: LIFE_ACTIVITY_RATES.LEARNING, activity: 'learning' };
    case 'cafeteria':
      return { rate: LIFE_ACTIVITY_RATES.EATING, activity: 'eating' };
    case 'dormitory':
      return { rate: LIFE_ACTIVITY_RATES.SLEEPING, activity: 'sleeping' };
    case 'common_room':
      return { rate: LIFE_ACTIVITY_RATES.SOCIAL, activity: 'social' };
    case 'bathroom':
      return { rate: LIFE_ACTIVITY_RATES.BATHROOM, activity: 'bathroom' };
    case 'admin_office':
    case 'fundraiser_station':
    default:
      return { rate: LIFE_ACTIVITY_RATES.IDLE, activity: 'idle' };
  }
}

// ============================================================================
// LIFE Meter Updates
// ============================================================================

/**
 * Update LIFE meter for a resident based on their current activity
 * Different activities provide different growth rates:
 * - Learning: 100% (primary growth activity)
 * - Eating: 50%
 * - Sleeping: 25%
 * - Social: 15%
 * - Idle: 10%
 * - Bathroom: 0%
 */
export function updateResidentLife(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Get activity-based rate multiplier
  const { rate: activityRate, activity } = getActivityRateMultiplier(resident, gameState);
  
  // Skip if activity provides no LIFE growth (bathroom, leaving)
  if (activityRate <= 0) return;
  
  // Calculate base fill rate from profile
  const baseFillRate = PROFILE_SPECS[resident.profile].lifeFillRate;
  const reputationMultiplier = getReputationMultiplier(gameState.reputation);
  const happinessMultiplier = resident.happiness / 100;
  
  // Get food quality modifier (0.3 to 1.5 based on food portion setting)
  const foodModifier = getLifeFillModifier(gameState);
  
  // Get room adjacency modifier (only applies when in learning rooms)
  let adjacencyModifier = 1.0;
  if (resident.targetRoomId && (activity === 'learning')) {
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (room) {
      adjacencyModifier = getEffectiveLifeFillModifier(room);
    }
  }
  
  // Combined multiplier (reputation, happiness, food quality, adjacency, and activity rate)
  const baseMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  const effectiveMultiplier = baseMultiplier * foodModifier * adjacencyModifier * activityRate;
  
  // Calculate increase per second
  const fillPerSecond = baseFillRate * effectiveMultiplier;
  const increase = fillPerSecond * deltaTime;
  
  // Update LIFE meter
  const oldLife = resident.lifeMeter;
  resident.lifeMeter = Math.min(LIFE_METER_CONFIG.MAX, resident.lifeMeter + increase);
  
  // Log significant progress (every 10%)
  if (Math.floor(oldLife / 10) < Math.floor(resident.lifeMeter / 10)) {
    const adjacencyBonus = Math.round((adjacencyModifier - 1) * 100);
    const adjacencyStr = adjacencyBonus !== 0 ? `, adjacency: ${adjacencyBonus > 0 ? '+' : ''}${adjacencyBonus}%` : '';
    const activityRateStr = activityRate !== 1.0 ? `, activity: ${activity} (${Math.round(activityRate * 100)}%)` : '';
    console.log(`${resident.name} LIFE: ${oldLife.toFixed(1)}% → ${resident.lifeMeter.toFixed(1)}% (food: ${foodModifier.toFixed(2)}x${adjacencyStr}${activityRateStr})`);
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
  
  // Record graduation for decay mitigation tracking
  recordGraduation(gameState);
  
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
 * Includes activity rate, food quality modifier, and adjacency bonuses
 */
export function calculateFillRate(
  resident: Resident,
  gameState: GameState
): number {
  // Get activity-based rate multiplier
  const { rate: activityRate, activity } = getActivityRateMultiplier(resident, gameState);
  
  // If activity provides no LIFE growth, return 0
  if (activityRate <= 0) return 0;
  
  const baseFillRate = PROFILE_SPECS[resident.profile].lifeFillRate;
  const reputationMultiplier = getReputationMultiplier(gameState.reputation);
  const happinessMultiplier = resident.happiness / 100;
  
  // Get food quality modifier
  const foodModifier = getLifeFillModifier(gameState);
  
  // Get room adjacency modifier (only applies when learning)
  let adjacencyModifier = 1.0;
  if (resident.targetRoomId && activity === 'learning') {
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (room) {
      adjacencyModifier = getEffectiveLifeFillModifier(room);
    }
  }
  
  const baseMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  const effectiveMultiplier = baseMultiplier * foodModifier * adjacencyModifier * activityRate;
  
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
 * Now includes activity rate and food quality in the calculation
 */
export function isLifeMeterStalled(
  resident: Resident,
  gameState: GameState
): boolean {
  // Get activity-based rate multiplier
  const { rate: activityRate, activity } = getActivityRateMultiplier(resident, gameState);
  
  // If activity provides no LIFE growth, it's technically stalled
  if (activityRate <= 0) return true;
  
  const reputationMultiplier = getReputationMultiplier(gameState.reputation);
  const happinessMultiplier = resident.happiness / 100;
  const foodModifier = getLifeFillModifier(gameState);
  
  // Get room adjacency modifier if learning
  let adjacencyModifier = 1.0;
  if (resident.targetRoomId && activity === 'learning') {
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (room) {
      adjacencyModifier = getEffectiveLifeFillModifier(room);
    }
  }
  
  const baseMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  const effectiveMultiplier = baseMultiplier * foodModifier * adjacencyModifier * activityRate;
  
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
