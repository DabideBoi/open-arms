import { GameState } from '../../types';
import { DONATION_CONFIG, getActiveTimerConfig } from '../../constants';

/**
 * DonationSystem - Manages passive income through donations
 * Checks every 5 minutes with probability based on reputation
 */

// ============================================================================
// Donation Checking
// ============================================================================

/**
 * Check if it's time for a donation and process it
 */
export function checkDonation(gameState: GameState): void {
  const now = Date.now();
  
  // Check if it's time for donation check
  if (now < gameState.nextDonationCheck) {
    return;
  }
  
  // Schedule next check
  const TIMER_CONFIG = getActiveTimerConfig();
  gameState.nextDonationCheck = now + TIMER_CONFIG.DONATION_CHECK_INTERVAL;
  
  // Roll for donation
  const chance = gameState.reputation / 100; // 0-100% becomes 0-1
  const roll = Math.random();
  
  if (roll <= chance) {
    const amount = calculateDonationAmount(gameState);
    gameState.money += amount;
    
    console.log(`💰 Donation received: $${amount} (chance: ${(chance * 100).toFixed(1)}%)`);
    
    // Emit event for UI notification
    emitDonationReceived(amount, gameState);
  } else {
    console.log(`No donation this cycle (chance: ${(chance * 100).toFixed(1)}%)`);
  }
}

// ============================================================================
// Donation Amount Calculation
// ============================================================================

/**
 * Calculate donation amount based on formula:
 * DonationAmount = BaseAmount × ReputationModifier × RandomModifier × GraduateMultiplier
 */
export function calculateDonationAmount(gameState: GameState): number {
  // Base amount scales with current residents
  const baseAmount = gameState.residents.length * DONATION_CONFIG.BASE_AMOUNT_PER_RESIDENT;
  
  // Reputation modifier (0.5x to 1.5x)
  const reputationModifier = 0.5 + (gameState.reputation / 100);
  
  // Random variance (0.8x to 1.2x)
  const randomModifier = 
    DONATION_CONFIG.RANDOM_VARIANCE_MIN + 
    (Math.random() * (DONATION_CONFIG.RANDOM_VARIANCE_MAX - DONATION_CONFIG.RANDOM_VARIANCE_MIN));
  
  // Permanent multiplier from graduated residents
  const graduateMultiplier = 1 + (gameState.graduatedCount * DONATION_CONFIG.GRADUATE_MULTIPLIER);
  
  // Calculate final amount
  const finalAmount = Math.floor(
    baseAmount * reputationModifier * randomModifier * graduateMultiplier
  );
  
  // Ensure minimum donation
  return Math.max(DONATION_CONFIG.MIN_DONATION, finalAmount);
}

// ============================================================================
// Donation Statistics
// ============================================================================

/**
 * Get next donation time remaining
 */
export function getNextDonationTimeRemaining(gameState: GameState): number {
  const now = Date.now();
  return Math.max(0, gameState.nextDonationCheck - now);
}

/**
 * Get formatted time remaining string
 */
export function getNextDonationTimeString(gameState: GameState): string {
  const remaining = getNextDonationTimeRemaining(gameState);
  
  if (remaining <= 0) return 'Checking now...';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Get expected donation amount (for preview)
 */
export function getExpectedDonationAmount(gameState: GameState): {
  min: number;
  average: number;
  max: number;
} {
  const baseAmount = gameState.residents.length * DONATION_CONFIG.BASE_AMOUNT_PER_RESIDENT;
  const reputationModifier = 0.5 + (gameState.reputation / 100);
  const graduateMultiplier = 1 + (gameState.graduatedCount * DONATION_CONFIG.GRADUATE_MULTIPLIER);
  
  const baseCalc = baseAmount * reputationModifier * graduateMultiplier;
  
  return {
    min: Math.floor(baseCalc * DONATION_CONFIG.RANDOM_VARIANCE_MIN),
    average: Math.floor(baseCalc),
    max: Math.floor(baseCalc * DONATION_CONFIG.RANDOM_VARIANCE_MAX)
  };
}

// ============================================================================
// Offline Donations
// ============================================================================

/**
 * Calculate donations that occurred while offline
 */
export function calculateOfflineDonations(
  gameState: GameState,
  offlineTime: number
): number {
  // Calculate how many donation checks occurred
  const TIMER_CONFIG = getActiveTimerConfig();
  const checksOccurred = Math.floor(offlineTime / TIMER_CONFIG.DONATION_CHECK_INTERVAL);
  
  if (checksOccurred === 0) return 0;
  
  // Cap offline checks to prevent abuse (2 hours = 24 checks)
  const MAX_OFFLINE_CHECKS = 24;
  const actualChecks = Math.min(checksOccurred, MAX_OFFLINE_CHECKS);
  
  // Calculate expected donations based on reputation
  const donationChance = gameState.reputation / 100;
  const expectedDonations = Math.floor(actualChecks * donationChance);
  
  // Calculate total amount
  let totalDonations = 0;
  for (let i = 0; i < expectedDonations; i++) {
    totalDonations += calculateDonationAmount(gameState);
  }
  
  return totalDonations;
}

/**
 * Apply offline donations to game state
 */
export function applyOfflineDonations(
  gameState: GameState,
  offlineTime: number
): void {
  const offlineDonations = calculateOfflineDonations(gameState, offlineTime);
  
  if (offlineDonations > 0) {
    gameState.money += offlineDonations;
    console.log(`💰 Offline donations: $${offlineDonations}`);
    
    // Emit notification
    emitOfflineDonations(offlineDonations);
  }
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit donation received event
 */
function emitDonationReceived(amount: number, gameState: GameState): void {
  window.dispatchEvent(new CustomEvent('donation_received', {
    detail: {
      amount,
      residentCount: gameState.residents.length,
      reputation: gameState.reputation,
      graduatedCount: gameState.graduatedCount
    }
  }));
}

/**
 * Emit offline donations event
 */
function emitOfflineDonations(amount: number): void {
  window.dispatchEvent(new CustomEvent('offline_donations', {
    detail: { amount }
  }));
}
