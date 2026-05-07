import { GameState, DonationRecord, ExpenseRecord } from '../../types';
import { DONATION_CONFIG, OPERATING_COSTS_CONFIG, EXPENSE_EVENTS_CONFIG, getActiveTimerConfig } from '../../constants';
import { getDonationMultiplier } from './TierSystem';

// ============================================================================
// Financial History Recording Helpers
// ============================================================================

const MAX_HISTORY_RECORDS = 100; // Keep last 100 records of each type

/**
 * Record a donation to financial history
 */
export function recordDonation(
  gameState: GameState,
  amount: number,
  source: DonationRecord['source']
): void {
  const record: DonationRecord = {
    timestamp: Date.now(),
    amount,
    source
  };
  
  gameState.financialHistory.donations.push(record);
  
  // Prune old records if exceeding max
  if (gameState.financialHistory.donations.length > MAX_HISTORY_RECORDS) {
    gameState.financialHistory.donations = gameState.financialHistory.donations.slice(-MAX_HISTORY_RECORDS);
  }
}

/**
 * Record an expense to financial history
 */
export function recordExpense(
  gameState: GameState,
  amount: number,
  type: ExpenseRecord['type'],
  description?: string
): void {
  const record: ExpenseRecord = {
    timestamp: Date.now(),
    amount,
    type,
    description
  };
  
  gameState.financialHistory.expenses.push(record);
  
  // Prune old records if exceeding max
  if (gameState.financialHistory.expenses.length > MAX_HISTORY_RECORDS) {
    gameState.financialHistory.expenses = gameState.financialHistory.expenses.slice(-MAX_HISTORY_RECORDS);
  }
}

/**
 * DonationSystem - Manages passive income through donations
 * Now checks every 90 seconds with probability based on reputation
 * Also handles daily operating costs and random expense events
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
  
  // Check for random expense event first (15% chance)
  checkRandomExpenseEvent(gameState);
  
  // Roll for donation with reputation-based chance
  const chance = getDonationChance(gameState.reputation);
  const roll = Math.random();
  
  if (roll <= chance) {
    const amount = calculateDonationAmount(gameState);
    gameState.money += amount;
    
    // Record donation to financial history
    recordDonation(gameState, amount, 'passive');
    
    console.log(`💰 Donation received: $${amount} (chance: ${(chance * 100).toFixed(1)}%)`);
    
    // Emit event for UI notification
    emitDonationReceived(amount, gameState);
  } else {
    console.log(`No donation this cycle (chance: ${(chance * 100).toFixed(1)}%)`);
  }
}

// ============================================================================
// Reputation-Based Donation Chance (NEW)
// ============================================================================

/**
 * Get donation chance based on reputation - low reputation is MORE punishing
 */
export function getDonationChance(reputation: number): number {
  if (reputation < 20) return 0.1;    // Only 10% chance - nearly no donations
  if (reputation < 30) return 0.3;    // 30% chance - very hard
  if (reputation < 50) return 0.5;    // 50% chance - challenging
  return reputation / 100;             // Normal scaling above 50%
}

// ============================================================================
// Donation Amount Calculation
// ============================================================================

/**
 * Calculate donation amount based on formula:
 * DonationAmount = BaseAmount × ReputationModifier × RandomModifier × GraduateMultiplier × TierMultiplier
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
  
  // Tier-based donation multiplier (1.0x to 2.0x based on shelter tier)
  const tierMultiplier = getDonationMultiplier(gameState);
  
  // Calculate final amount
  const finalAmount = Math.floor(
    baseAmount * reputationModifier * randomModifier * graduateMultiplier * tierMultiplier
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
  tierMultiplier: number;
} {
  const baseAmount = gameState.residents.length * DONATION_CONFIG.BASE_AMOUNT_PER_RESIDENT;
  const reputationModifier = 0.5 + (gameState.reputation / 100);
  const graduateMultiplier = 1 + (gameState.graduatedCount * DONATION_CONFIG.GRADUATE_MULTIPLIER);
  const tierMultiplier = getDonationMultiplier(gameState);
  
  const baseCalc = baseAmount * reputationModifier * graduateMultiplier * tierMultiplier;
  
  return {
    min: Math.floor(baseCalc * DONATION_CONFIG.RANDOM_VARIANCE_MIN),
    average: Math.floor(baseCalc),
    max: Math.floor(baseCalc * DONATION_CONFIG.RANDOM_VARIANCE_MAX),
    tierMultiplier
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
    
    // Record offline donations to financial history
    recordDonation(gameState, offlineDonations, 'offline');
    
    console.log(`💰 Offline donations: $${offlineDonations}`);
    
    // Emit notification
    emitOfflineDonations(offlineDonations);
  }
}

// ============================================================================
// Daily Operating Costs (NEW)
// ============================================================================

/**
 * Calculate daily operating costs
 * Called at the start of each new day
 */
export function calculateDailyOperatingCosts(gameState: GameState): number {
  const baseCost = OPERATING_COSTS_CONFIG.BASE_DAILY_COST;
  const residentCost = gameState.residents.length * OPERATING_COSTS_CONFIG.PER_RESIDENT_COST;
  const roomCost = gameState.rooms.length * OPERATING_COSTS_CONFIG.PER_ROOM_COST;
  
  return baseCost + residentCost + roomCost;
}

/**
 * Deduct daily operating costs from money
 * Should be called when a new day begins
 */
export function deductDailyOperatingCosts(gameState: GameState): void {
  const cost = calculateDailyOperatingCosts(gameState);
  gameState.money -= cost;
  
  // Record operating costs to financial history
  recordExpense(gameState, cost, 'operating', 'Daily operating costs');
  
  console.log(`💸 Daily operating costs: -$${cost}`);
  
  // Emit notification
  emitOperatingCosts(cost);
}

/**
 * Get operating costs breakdown for UI
 */
export function getOperatingCostsBreakdown(gameState: GameState): {
  base: number;
  residents: number;
  rooms: number;
  total: number;
} {
  const base = OPERATING_COSTS_CONFIG.BASE_DAILY_COST;
  const residents = gameState.residents.length * OPERATING_COSTS_CONFIG.PER_RESIDENT_COST;
  const rooms = gameState.rooms.length * OPERATING_COSTS_CONFIG.PER_ROOM_COST;
  
  return {
    base,
    residents,
    rooms,
    total: base + residents + rooms
  };
}

// ============================================================================
// Random Expense Events (NEW)
// ============================================================================

/**
 * Check for random expense event (called each donation cycle)
 */
function checkRandomExpenseEvent(gameState: GameState): void {
  const roll = Math.random();
  
  if (roll <= EXPENSE_EVENTS_CONFIG.CHANCE_PER_DONATION_CYCLE) {
    // Random expense occurred!
    const cost = Math.floor(
      EXPENSE_EVENTS_CONFIG.MIN_COST +
      Math.random() * (EXPENSE_EVENTS_CONFIG.MAX_COST - EXPENSE_EVENTS_CONFIG.MIN_COST)
    );
    
    const eventType = EXPENSE_EVENTS_CONFIG.EVENT_TYPES[
      Math.floor(Math.random() * EXPENSE_EVENTS_CONFIG.EVENT_TYPES.length)
    ];
    
    gameState.money -= cost;
    
    // Record random expense to financial history
    recordExpense(gameState, cost, 'random', eventType);
    
    console.log(`⚠️ ${eventType}: -$${cost}`);
    
    // Emit expense event
    emitExpenseEvent(eventType, cost);
  }
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit unified money change event for animations
 */
function emitMoneyChangeEvent(
  amount: number,
  source: string,
  icon?: string,
  type?: 'income' | 'expense'
): void {
  window.dispatchEvent(new CustomEvent('game:money_change', {
    detail: {
      amount,
      source,
      icon,
      type: type || (amount >= 0 ? 'income' : 'expense')
    }
  }));
}

/**
 * Emit donation received event
 */
function emitDonationReceived(amount: number, gameState: GameState): void {
  // Legacy event for backward compatibility
  window.dispatchEvent(new CustomEvent('donation_received', {
    detail: {
      amount,
      residentCount: gameState.residents.length,
      reputation: gameState.reputation,
      graduatedCount: gameState.graduatedCount
    }
  }));
  
  // New unified money change event for animations
  emitMoneyChangeEvent(amount, 'Donation', '💰', 'income');
}

/**
 * Emit offline donations event
 */
function emitOfflineDonations(amount: number): void {
  // Legacy event
  window.dispatchEvent(new CustomEvent('offline_donations', {
    detail: { amount }
  }));
  
  // New unified money change event for animations
  emitMoneyChangeEvent(amount, 'Offline Donations', '💤', 'income');
}

/**
 * Emit daily operating costs event
 */
function emitOperatingCosts(cost: number): void {
  // Legacy event
  window.dispatchEvent(new CustomEvent('operating_costs', {
    detail: { cost }
  }));
  
  // New unified money change event for animations
  emitMoneyChangeEvent(-cost, 'Operating Costs', '🏢', 'expense');
}

/**
 * Emit random expense event
 */
function emitExpenseEvent(eventType: string, cost: number): void {
  // Legacy event
  window.dispatchEvent(new CustomEvent('expense_event', {
    detail: { eventType, cost }
  }));
  
  // New unified money change event for animations
  emitMoneyChangeEvent(-cost, 'Emergency', '⚠️', 'expense');
}
