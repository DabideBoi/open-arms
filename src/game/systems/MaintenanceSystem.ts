import { GameState } from '../../types';
import { MAINTENANCE_CONFIG } from '../../constants';
import { handleMaintenanceMissedReputation } from './ReputationSystem';

/**
 * MaintenanceSystem - Manages recurring facility costs
 * Checks every 15 minutes and deducts maintenance costs
 */

// ============================================================================
// Maintenance Checking
// ============================================================================

/**
 * Check if it's time for maintenance and process it
 */
export function checkMaintenance(gameState: GameState): void {
  const now = Date.now();
  
  // Check if it's time for maintenance
  if (now < gameState.nextMaintenanceCheck) {
    return;
  }
  
  // Schedule next check
  gameState.nextMaintenanceCheck = now + MAINTENANCE_CONFIG.CHECK_INTERVAL;
  
  // Process maintenance
  processMaintenance(gameState);
}

/**
 * Process maintenance payment
 */
export function processMaintenance(gameState: GameState): void {
  const totalCost = getTotalMaintenanceCost(gameState);
  
  if (totalCost === 0) {
    console.log('No maintenance costs (no rooms)');
    return;
  }
  
  const canAfford = gameState.money >= totalCost;
  
  if (canAfford) {
    // Normal maintenance
    gameState.money -= totalCost;
    
    // Update last maintenance paid for all rooms
    const now = Date.now();
    for (const room of gameState.rooms) {
      room.lastMaintenancePaid = now;
    }
    
    console.log(`🔧 Maintenance paid: $${totalCost} for ${gameState.rooms.length} rooms`);
    
    emitMaintenancePaid(totalCost, gameState.rooms.length);
  } else {
    // Can't afford maintenance
    const roomCount = gameState.rooms.length;
    
    // Still deduct cost (can go negative)
    gameState.money -= totalCost;
    
    // Reputation penalty
    handleMaintenanceMissedReputation(gameState, roomCount);
    
    console.log(`⚠️ Maintenance missed: $${totalCost} (had $${gameState.money + totalCost})`);
    
    emitMaintenanceMissed(totalCost, roomCount);
  }
}

// ============================================================================
// Cost Calculation
// ============================================================================

/**
 * Get total maintenance cost for all rooms
 */
export function getTotalMaintenanceCost(gameState: GameState): number {
  return gameState.rooms.reduce((sum, room) => sum + room.maintenanceCost, 0);
}

/**
 * Get maintenance cost breakdown by room type
 */
export function getMaintenanceCostByType(gameState: GameState): Record<string, number> {
  const costs: Record<string, number> = {};
  
  for (const room of gameState.rooms) {
    costs[room.type] = (costs[room.type] || 0) + room.maintenanceCost;
  }
  
  return costs;
}

// ============================================================================
// Maintenance Status
// ============================================================================

/**
 * Get next maintenance cost and status
 */
export function getMaintenanceStatus(gameState: GameState): {
  nextCost: number;
  canAfford: boolean;
  timeRemaining: number;
  status: 'ok' | 'warning' | 'critical';
} {
  const nextCost = getTotalMaintenanceCost(gameState);
  const canAfford = gameState.money >= nextCost;
  const timeRemaining = gameState.nextMaintenanceCheck - Date.now();
  
  let status: 'ok' | 'warning' | 'critical';
  
  if (canAfford) {
    status = 'ok';
  } else {
    if (timeRemaining < MAINTENANCE_CONFIG.WARNING_TIME) {
      status = 'critical';
    } else {
      status = 'warning';
    }
  }
  
  return {
    nextCost,
    canAfford,
    timeRemaining: Math.max(0, timeRemaining),
    status
  };
}

/**
 * Get time remaining until next maintenance
 */
export function getMaintenanceTimeRemaining(gameState: GameState): number {
  const now = Date.now();
  return Math.max(0, gameState.nextMaintenanceCheck - now);
}

/**
 * Get formatted time remaining string
 */
export function getMaintenanceTimeString(gameState: GameState): string {
  const remaining = getMaintenanceTimeRemaining(gameState);
  
  if (remaining <= 0) return 'Due now';
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================================================
// Maintenance Warnings
// ============================================================================

/**
 * Check if maintenance warning should be shown
 */
export function shouldShowMaintenanceWarning(gameState: GameState): boolean {
  const status = getMaintenanceStatus(gameState);
  return status.status === 'warning' || status.status === 'critical';
}

/**
 * Get maintenance warning message
 */
export function getMaintenanceWarningMessage(gameState: GameState): string | null {
  const status = getMaintenanceStatus(gameState);
  
  if (!shouldShowMaintenanceWarning(gameState)) {
    return null;
  }
  
  const timeMinutes = Math.floor(status.timeRemaining / 60000);
  
  if (status.status === 'critical') {
    return `⚠️ CRITICAL: Maintenance due in ${timeMinutes} minutes. Need $${status.nextCost}, have $${gameState.money}`;
  } else {
    return `⚠️ WARNING: Cannot afford next maintenance ($${status.nextCost})`;
  }
}

// ============================================================================
// Offline Maintenance
// ============================================================================

/**
 * Calculate maintenance that occurred while offline
 */
export function calculateOfflineMaintenance(
  gameState: GameState,
  offlineTime: number
): {
  cyclesOccurred: number;
  totalCost: number;
  reputationLost: number;
} {
  // Calculate how many maintenance cycles occurred
  const cyclesOccurred = Math.floor(offlineTime / MAINTENANCE_CONFIG.CHECK_INTERVAL);
  
  if (cyclesOccurred === 0) {
    return { cyclesOccurred: 0, totalCost: 0, reputationLost: 0 };
  }
  
  // Cap offline cycles to prevent abuse (2 hours = 8 cycles)
  const MAX_OFFLINE_CYCLES = 8;
  const actualCycles = Math.min(cyclesOccurred, MAX_OFFLINE_CYCLES);
  
  const costPerCycle = getTotalMaintenanceCost(gameState);
  const totalCost = costPerCycle * actualCycles;
  
  // Calculate reputation loss if couldn't afford
  let reputationLost = 0;
  let remainingMoney = gameState.money;
  
  for (let i = 0; i < actualCycles; i++) {
    if (remainingMoney < costPerCycle) {
      // Couldn't afford this cycle
      const roomCount = gameState.rooms.length;
      reputationLost += MAINTENANCE_CONFIG.REPUTATION_PENALTY_PER_ROOM * roomCount;
    }
    remainingMoney -= costPerCycle;
  }
  
  return {
    cyclesOccurred: actualCycles,
    totalCost,
    reputationLost
  };
}

/**
 * Apply offline maintenance to game state
 */
export function applyOfflineMaintenance(
  gameState: GameState,
  offlineTime: number
): void {
  const offline = calculateOfflineMaintenance(gameState, offlineTime);
  
  if (offline.cyclesOccurred > 0) {
    // Deduct costs
    gameState.money -= offline.totalCost;
    
    // Apply reputation loss
    if (offline.reputationLost < 0) {
      // Reputation already modified in calculation, just log
      console.log(`Reputation lost from offline maintenance: ${offline.reputationLost}`);
    }
    
    console.log(`🔧 Offline maintenance: $${offline.totalCost} (${offline.cyclesOccurred} cycles)`);
    
    // Emit notification
    emitOfflineMaintenance(offline.totalCost, offline.cyclesOccurred, offline.reputationLost);
  }
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit maintenance paid event
 */
function emitMaintenancePaid(cost: number, roomCount: number): void {
  window.dispatchEvent(new CustomEvent('maintenance_paid', {
    detail: { cost, roomCount }
  }));
}

/**
 * Emit maintenance missed event
 */
function emitMaintenanceMissed(cost: number, roomCount: number): void {
  window.dispatchEvent(new CustomEvent('maintenance_missed', {
    detail: { cost, roomCount }
  }));
}

/**
 * Emit offline maintenance event
 */
function emitOfflineMaintenance(
  totalCost: number,
  cycles: number,
  reputationLost: number
): void {
  window.dispatchEvent(new CustomEvent('offline_maintenance', {
    detail: { totalCost, cycles, reputationLost }
  }));
}
