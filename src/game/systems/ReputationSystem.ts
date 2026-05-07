import { GameState } from '../../types';
import { REPUTATION_CONFIG, REPUTATION_CHANGES, REPUTATION_DECAY, SHELTER_TIERS } from '../../constants';

/**
 * ReputationSystem - Manages shelter reputation (0-100%)
 * Affects donation probability and LIFE meter fill rates
 */

// ============================================================================
// Reputation Modification
// ============================================================================

/**
 * Modify reputation with bounds checking
 */
export function modifyReputation(
  gameState: GameState,
  amount: number,
  reason: string
): void {
  const oldRep = gameState.reputation;
  gameState.reputation = Math.max(
    REPUTATION_CONFIG.MIN,
    Math.min(REPUTATION_CONFIG.MAX, gameState.reputation + amount)
  );
  
  const change = gameState.reputation - oldRep;
  
  if (change !== 0) {
    console.log(`Reputation: ${oldRep} → ${gameState.reputation} (${reason})`);
    
    // Emit event for UI notification
    emitReputationChange(change, reason);
  }
  
  // Check for critical thresholds
  checkReputationThresholds(gameState);
}

/**
 * Check reputation thresholds and trigger warnings/game over
 */
function checkReputationThresholds(gameState: GameState): void {
  // Game over at 0
  if (gameState.reputation === REPUTATION_CONFIG.GAME_OVER_THRESHOLD) {
    console.log('⚠️ GAME OVER: Reputation reached 0');
    // Trigger game over (will be implemented in MainScene)
    emitGameEvent('game_over', { reason: 'reputation_zero' });
    return;
  }
  
  // Warning at critical threshold
  if (gameState.reputation <= REPUTATION_CONFIG.CRITICAL_THRESHOLD) {
    emitGameEvent('reputation_critical', { reputation: gameState.reputation });
  }
  
  // Milestone notifications
  if (gameState.reputation === REPUTATION_CONFIG.MAX) {
    emitGameEvent('reputation_perfect', {});
  }
}

// ============================================================================
// Reputation Effects
// ============================================================================

/**
 * Get donation chance based on reputation (0-1)
 */
export function getDonationChance(reputation: number): number {
  return reputation / 100;
}

/**
 * Get reputation multiplier for LIFE meter (0-1)
 */
export function getReputationMultiplier(reputation: number): number {
  return reputation / 100;
}

// ============================================================================
// Event-Based Reputation Changes
// ============================================================================

/**
 * Handle resident graduation
 */
export function handleGraduationReputation(
  gameState: GameState,
  residentProfile: string,
  residentName: string
): void {
  // Veterans give extra reputation
  const repBoost = residentProfile === 'veteran'
    ? REPUTATION_CHANGES.RESIDENT_GRADUATED_VETERAN
    : REPUTATION_CHANGES.RESIDENT_GRADUATED;
  
  modifyReputation(gameState, repBoost, `${residentName} graduated`);
}

/**
 * Handle unhappy resident departure
 */
export function handleUnhappyDepartureReputation(
  gameState: GameState,
  residentName: string
): void {
  modifyReputation(
    gameState,
    REPUTATION_CHANGES.RESIDENT_LEFT_UNHAPPY,
    `${residentName} left unhappy`
  );
}

/**
 * Handle hopeless resident departure (LIFE meter = 0)
 */
export function handleHopelessDepartureReputation(
  gameState: GameState,
  residentName: string
): void {
  modifyReputation(
    gameState,
    REPUTATION_CHANGES.RESIDENT_LEFT_HOPELESS,
    `${residentName} lost hope and left`
  );
}

/**
 * Handle maintenance missed
 */
export function handleMaintenanceMissedReputation(
  gameState: GameState,
  roomCount: number
): void {
  const repPenalty = REPUTATION_CHANGES.MAINTENANCE_MISSED * roomCount;
  modifyReputation(
    gameState,
    repPenalty,
    `Missed maintenance on ${roomCount} rooms`
  );
}

/**
 * Handle overcrowding
 */
export function handleOvercrowdingReputation(gameState: GameState): void {
  modifyReputation(
    gameState,
    REPUTATION_CHANGES.OVERCROWDING,
    'Cafeteria overcrowding'
  );
}

// ============================================================================
// Reputation Decay System
// ============================================================================

/**
 * Get the number of recent graduations within the tracking window
 */
export function getRecentGraduationsCount(gameState: GameState): number {
  const trackingDays = REPUTATION_DECAY.GRADUATION_TRACKING_DAYS;
  const cutoffDay = gameState.currentDay - trackingDays;
  
  return gameState.recentGraduations.filter(g => g.day >= cutoffDay).length;
}

/**
 * Record a graduation for decay mitigation tracking
 */
export function recordGraduation(gameState: GameState): void {
  gameState.recentGraduations.push({
    timestamp: Date.now(),
    day: gameState.currentDay
  });
  
  // Clean up old graduations beyond tracking window
  const cutoffDay = gameState.currentDay - REPUTATION_DECAY.GRADUATION_TRACKING_DAYS;
  gameState.recentGraduations = gameState.recentGraduations.filter(g => g.day >= cutoffDay);
}

/**
 * Get average happiness of all residents
 */
export function getAverageHappiness(gameState: GameState): number {
  if (gameState.residents.length === 0) return 0;
  
  const totalHappiness = gameState.residents.reduce((sum, r) => sum + r.happiness, 0);
  return totalHappiness / gameState.residents.length;
}

/**
 * Check if shelter is at tier capacity
 */
export function isAtCapacity(gameState: GameState): boolean {
  const tierConfig = SHELTER_TIERS[gameState.currentTier];
  return gameState.residents.length >= tierConfig.maxResidents;
}

/**
 * Calculate decay mitigations and return details
 */
export interface DecayMitigationDetails {
  residentMitigation: number;
  graduationMitigation: number;
  happinessMitigation: number;
  capacityMitigation: number;
  totalMitigation: number;
  descriptions: string[];
}

export function calculateDecayMitigations(gameState: GameState): DecayMitigationDetails {
  const residentCount = gameState.residents.length;
  const recentGraduations = getRecentGraduationsCount(gameState);
  const avgHappiness = getAverageHappiness(gameState);
  const atCapacity = isAtCapacity(gameState);
  
  const residentMitigation = residentCount * REPUTATION_DECAY.MITIGATION.perActiveResident;
  const graduationMitigation = recentGraduations * REPUTATION_DECAY.MITIGATION.perGraduationThisWeek;
  const happinessMitigation = avgHappiness > REPUTATION_DECAY.HIGH_HAPPINESS_THRESHOLD
    ? REPUTATION_DECAY.MITIGATION.highHappinessBonus
    : 0;
  const capacityMitigation = atCapacity ? REPUTATION_DECAY.MITIGATION.fullCapacityBonus : 0;
  
  const totalMitigation = Math.min(0.9,
    residentMitigation + graduationMitigation + happinessMitigation + capacityMitigation
  );
  
  const descriptions: string[] = [];
  if (residentMitigation > 0) {
    descriptions.push(`${residentCount} residents (-${Math.round(residentMitigation * 100)}%)`);
  }
  if (graduationMitigation > 0) {
    descriptions.push(`${recentGraduations} recent graduations (-${Math.round(graduationMitigation * 100)}%)`);
  }
  if (happinessMitigation > 0) {
    descriptions.push(`High happiness (-${Math.round(happinessMitigation * 100)}%)`);
  }
  if (capacityMitigation > 0) {
    descriptions.push(`At capacity (-${Math.round(capacityMitigation * 100)}%)`);
  }
  
  return {
    residentMitigation,
    graduationMitigation,
    happinessMitigation,
    capacityMitigation,
    totalMitigation,
    descriptions
  };
}

/**
 * Calculate the base decay rate before mitigations
 */
export function getBaseDecayRate(reputation: number): number {
  const threshold = REPUTATION_DECAY.DECAY_THRESHOLDS.find(t =>
    reputation >= t.min && reputation <= t.max
  );
  
  if (!threshold) {
    return 0;
  }
  
  return REPUTATION_DECAY.BASE_DECAY_RATE * threshold.decayMultiplier;
}

/**
 * Calculate reputation decay amount
 */
export function calculateReputationDecay(gameState: GameState): number {
  const currentRep = gameState.reputation;
  
  // No decay if at or below floor
  if (currentRep <= REPUTATION_DECAY.FLOOR) {
    return 0;
  }
  
  // Get base decay rate
  const baseDecay = getBaseDecayRate(currentRep);
  
  if (baseDecay === 0) {
    return 0;
  }
  
  // Apply mitigations
  const mitigations = calculateDecayMitigations(gameState);
  const decay = baseDecay * (1 - mitigations.totalMitigation);
  
  // Don't decay below floor
  const maxDecay = currentRep - REPUTATION_DECAY.FLOOR;
  return Math.min(decay, maxDecay);
}

/**
 * Get current decay rate info for UI display
 */
export interface DecayRateInfo {
  baseDecayRate: number;
  mitigations: DecayMitigationDetails;
  netDecayRate: number;
  isFullyMitigated: boolean;
  isAtFloor: boolean;
  floor: number;
}

export function getDecayRateInfo(gameState: GameState): DecayRateInfo {
  const baseDecayRate = getBaseDecayRate(gameState.reputation);
  const mitigations = calculateDecayMitigations(gameState);
  const netDecayRate = calculateReputationDecay(gameState);
  const isAtFloor = gameState.reputation <= REPUTATION_DECAY.FLOOR;
  
  return {
    baseDecayRate,
    mitigations,
    netDecayRate,
    isFullyMitigated: mitigations.totalMitigation >= 1 || netDecayRate === 0,
    isAtFloor,
    floor: REPUTATION_DECAY.FLOOR
  };
}

/**
 * Apply reputation decay at day transition
 */
export function applyReputationDecay(gameState: GameState): void {
  const decay = calculateReputationDecay(gameState);
  const mitigations = calculateDecayMitigations(gameState);
  
  gameState.lastDecayTime = Date.now();
  gameState.reputationDecayApplied = decay;
  
  if (decay > 0) {
    const oldRep = gameState.reputation;
    gameState.reputation = Math.max(REPUTATION_DECAY.FLOOR, gameState.reputation - decay);
    
    console.log(`📉 Reputation decay: ${oldRep.toFixed(1)} → ${gameState.reputation.toFixed(1)} (-${decay.toFixed(1)}%)`);
    
    // Emit notification event
    emitDecayNotification(decay, false);
    
    // Check for critical thresholds
    checkReputationThresholds(gameState);
  } else if (mitigations.totalMitigation >= 0.9 && getBaseDecayRate(gameState.reputation) > 0) {
    // Decay was fully mitigated
    console.log(`🛡️ Reputation decay prevented by active efforts`);
    emitDecayNotification(0, true);
  }
  
  // Warning for high reputation (90%+)
  if (gameState.reputation >= 90) {
    emitHighReputationWarning();
  }
}

/**
 * Emit decay notification event
 */
function emitDecayNotification(decayAmount: number, wasMitigated: boolean): void {
  if (wasMitigated) {
    window.dispatchEvent(new CustomEvent('game:show_notification', {
      detail: {
        message: '🛡️ Your active efforts prevented reputation decay!',
        type: 'success'
      }
    }));
  } else {
    window.dispatchEvent(new CustomEvent('game:show_notification', {
      detail: {
        message: `📉 Reputation naturally declined by ${decayAmount.toFixed(1)}%`,
        type: 'warning'
      }
    }));
  }
}

/**
 * Emit high reputation warning
 */
function emitHighReputationWarning(): void {
  window.dispatchEvent(new CustomEvent('game:show_notification', {
    detail: {
      message: '⚠️ High reputation is hard to maintain. Keep helping residents!',
      type: 'info'
    }
  }));
}

// ============================================================================
// Reputation Display
// ============================================================================

export interface ReputationTier {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

export const REPUTATION_TIERS: ReputationTier[] = [
  {
    min: 0,
    max: 20,
    label: 'Critical',
    color: '#ff0000',
    description: 'Shelter at risk of closure'
  },
  {
    min: 21,
    max: 40,
    label: 'Poor',
    color: '#ff6600',
    description: 'Significant improvements needed'
  },
  {
    min: 41,
    max: 60,
    label: 'Fair',
    color: '#ffcc00',
    description: 'Meeting basic standards'
  },
  {
    min: 61,
    max: 80,
    label: 'Good',
    color: '#66cc00',
    description: 'Well-regarded shelter'
  },
  {
    min: 81,
    max: 100,
    label: 'Excellent',
    color: '#00cc00',
    description: 'Model shelter program'
  }
];

/**
 * Get reputation tier for display
 */
export function getReputationTier(reputation: number): ReputationTier {
  for (const tier of REPUTATION_TIERS) {
    if (reputation >= tier.min && reputation <= tier.max) {
      return tier;
    }
  }
  return REPUTATION_TIERS[0]; // Fallback to Critical
}

/**
 * Get reputation display string
 */
export function getReputationDisplay(reputation: number): string {
  const tier = getReputationTier(reputation);
  return `${reputation}% - ${tier.label}`;
}

/**
 * Get reputation color
 */
export function getReputationColor(reputation: number): string {
  const tier = getReputationTier(reputation);
  return tier.color;
}

// ============================================================================
// Event Emission (for UI integration)
// ============================================================================

/**
 * Emit reputation change event
 */
function emitReputationChange(change: number, reason: string): void {
  // This will be picked up by the UI layer
  window.dispatchEvent(new CustomEvent('reputation_change', {
    detail: { change, reason }
  }));
}

/**
 * Emit game event
 */
function emitGameEvent(type: string, data: any): void {
  window.dispatchEvent(new CustomEvent('game_event', {
    detail: { type, data }
  }));
}
