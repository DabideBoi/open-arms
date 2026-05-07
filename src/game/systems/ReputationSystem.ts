import { GameState } from '../../types';
import { REPUTATION_CONFIG, REPUTATION_CHANGES } from '../../constants';

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
