import { GameState, ShelterTier, RoomType, TierUpgradeRequirements, ShelterTierConfig } from '../../types';
import { SHELTER_TIERS, TIER_UPGRADE_CONFIG, ROOM_SPECS } from '../../constants';
import { formatMoney } from '../../utils/helpers';

/**
 * TierSystem - Manages shelter tier progression
 * Handles tier upgrades, room availability, resident caps, and donation multipliers
 */

// ============================================================================
// Tier Configuration Getters
// ============================================================================

/**
 * Get the current tier from game state
 */
export function getCurrentTier(gameState: GameState): ShelterTier {
  return gameState.currentTier;
}

/**
 * Get configuration for a specific tier
 */
export function getTierConfig(tier: ShelterTier): ShelterTierConfig {
  return SHELTER_TIERS[tier];
}

/**
 * Get the next tier (if available)
 */
export function getNextTier(currentTier: ShelterTier): ShelterTier | null {
  if (currentTier >= 4) return null;
  return (currentTier + 1) as ShelterTier;
}

// ============================================================================
// Room Availability
// ============================================================================

/**
 * Check if a room type is available for the current tier
 */
export function isRoomAvailable(gameState: GameState, roomType: RoomType): boolean {
  const tierConfig = getTierConfig(gameState.currentTier);
  
  if (tierConfig.availableRooms === 'all') {
    return true;
  }
  
  return tierConfig.availableRooms.includes(roomType);
}

/**
 * Get all room types available for the current tier
 */
export function getAvailableRooms(gameState: GameState): RoomType[] {
  const tierConfig = getTierConfig(gameState.currentTier);
  
  if (tierConfig.availableRooms === 'all') {
    return Object.keys(ROOM_SPECS) as RoomType[];
  }
  
  return tierConfig.availableRooms;
}

/**
 * Get all room types locked for the current tier with their unlock tier
 */
export function getLockedRooms(gameState: GameState): Array<{ roomType: RoomType; unlocksAtTier: ShelterTier }> {
  const availableRooms = getAvailableRooms(gameState);
  const allRooms = Object.keys(ROOM_SPECS) as RoomType[];
  const lockedRooms: Array<{ roomType: RoomType; unlocksAtTier: ShelterTier }> = [];
  
  for (const roomType of allRooms) {
    if (!availableRooms.includes(roomType)) {
      // Find which tier unlocks this room
      for (let tier = 1; tier <= 4; tier++) {
        const tierConfig = getTierConfig(tier as ShelterTier);
        if (tierConfig.availableRooms === 'all' || tierConfig.availableRooms.includes(roomType)) {
          lockedRooms.push({ roomType, unlocksAtTier: tier as ShelterTier });
          break;
        }
      }
    }
  }
  
  return lockedRooms;
}

// ============================================================================
// Resident Cap
// ============================================================================

/**
 * Get the maximum resident capacity for the current tier
 */
export function getResidentCap(gameState: GameState): number {
  const tierConfig = getTierConfig(gameState.currentTier);
  return tierConfig.maxResidents;
}

/**
 * Check if shelter is at resident capacity
 */
export function isAtResidentCap(gameState: GameState): boolean {
  return gameState.residents.length >= getResidentCap(gameState);
}

/**
 * Check if shelter is approaching capacity (90% threshold)
 */
export function isApproachingCapacity(gameState: GameState): boolean {
  const cap = getResidentCap(gameState);
  const threshold = cap * TIER_UPGRADE_CONFIG.CAPACITY_WARNING_THRESHOLD;
  return gameState.residents.length >= threshold && !isAtResidentCap(gameState);
}

/**
 * Get capacity status message
 */
export function getCapacityStatus(gameState: GameState): string {
  const current = gameState.residents.length;
  const max = getResidentCap(gameState);
  return `${current}/${max}`;
}

// ============================================================================
// Donation Multiplier
// ============================================================================

/**
 * Get the donation multiplier for the current tier
 */
export function getDonationMultiplier(gameState: GameState): number {
  const tierConfig = getTierConfig(gameState.currentTier);
  return tierConfig.donationMultiplier;
}

// ============================================================================
// Grid Size
// ============================================================================

/**
 * Get the grid size for the current tier
 */
export function getTierGridSize(gameState: GameState): number {
  const tierConfig = getTierConfig(gameState.currentTier);
  return tierConfig.gridSize;
}

// ============================================================================
// Upgrade Requirements
// ============================================================================

/**
 * Calculate grid utilization percentage
 */
export function calculateGridUtilization(gameState: GameState): number {
  const { unlockedArea } = gameState.grid;
  const totalTiles = (unlockedArea.maxX - unlockedArea.minX) * (unlockedArea.maxY - unlockedArea.minY);
  
  if (totalTiles === 0) return 0;
  
  // Count tiles occupied by rooms
  let occupiedTiles = 0;
  for (const room of gameState.rooms) {
    occupiedTiles += room.width * room.height;
  }
  
  return occupiedTiles / totalTiles;
}

/**
 * Check all upgrade requirements and return detailed status
 */
export function checkUpgradeRequirements(gameState: GameState): TierUpgradeRequirements {
  const currentTier = gameState.currentTier;
  const nextTier = getNextTier(currentTier);
  
  // If already at max tier, return cannot upgrade
  if (!nextTier) {
    return {
      canUpgrade: false,
      hasMoney: true,
      hasReputation: true,
      hasGraduations: true,
      hasGridUtilization: true,
      moneyNeeded: 0,
      reputationNeeded: 0,
      graduationsNeeded: 0,
      utilizationNeeded: 0,
      currentMoney: gameState.money,
      currentReputation: gameState.reputation,
      currentGraduations: gameState.graduatedCount,
      currentUtilization: calculateGridUtilization(gameState)
    };
  }
  
  const nextTierConfig = getTierConfig(nextTier);
  const currentUtilization = calculateGridUtilization(gameState);
  
  const hasMoney = gameState.money >= nextTierConfig.upgradeCost;
  const hasReputation = gameState.reputation >= nextTierConfig.reputationRequired;
  const hasGraduations = gameState.graduatedCount >= nextTierConfig.graduationsRequired;
  const hasGridUtilization = currentUtilization >= TIER_UPGRADE_CONFIG.MIN_GRID_UTILIZATION;
  
  return {
    canUpgrade: hasMoney && hasReputation && hasGraduations && hasGridUtilization,
    hasMoney,
    hasReputation,
    hasGraduations,
    hasGridUtilization,
    moneyNeeded: nextTierConfig.upgradeCost,
    reputationNeeded: nextTierConfig.reputationRequired,
    graduationsNeeded: nextTierConfig.graduationsRequired,
    utilizationNeeded: TIER_UPGRADE_CONFIG.MIN_GRID_UTILIZATION * 100,
    currentMoney: gameState.money,
    currentReputation: gameState.reputation,
    currentGraduations: gameState.graduatedCount,
    currentUtilization: Math.floor(currentUtilization * 100)
  };
}

/**
 * Check if player can upgrade to the next tier
 */
export function canUpgrade(gameState: GameState): boolean {
  const requirements = checkUpgradeRequirements(gameState);
  return requirements.canUpgrade;
}

// ============================================================================
// Perform Upgrade
// ============================================================================

/**
 * Perform the tier upgrade
 * Returns true if successful, false otherwise
 */
export function performUpgrade(gameState: GameState): { success: boolean; error?: string; newRooms?: RoomType[] } {
  const requirements = checkUpgradeRequirements(gameState);
  
  if (!requirements.canUpgrade) {
    const errors: string[] = [];
    if (!requirements.hasMoney) errors.push(`Need ${formatMoney(requirements.moneyNeeded)}`);
    if (!requirements.hasReputation) errors.push(`Need ${requirements.reputationNeeded}% reputation`);
    if (!requirements.hasGraduations) errors.push(`Need ${requirements.graduationsNeeded} graduations`);
    if (!requirements.hasGridUtilization) errors.push(`Need ${requirements.utilizationNeeded}% grid utilization`);
    
    return { success: false, error: errors.join(', ') };
  }
  
  const nextTier = getNextTier(gameState.currentTier);
  if (!nextTier) {
    return { success: false, error: 'Already at maximum tier' };
  }
  
  const nextTierConfig = getTierConfig(nextTier);
  const currentTierConfig = getTierConfig(gameState.currentTier);
  
  // Deduct cost
  gameState.money -= nextTierConfig.upgradeCost;
  
  // Upgrade tier
  gameState.currentTier = nextTier;
  
  // Reset graduation progress for next tier
  gameState.tierUnlockProgress.graduationsTowardNext = 0;
  
  // Find newly unlocked rooms
  const previousRooms = currentTierConfig.availableRooms === 'all' 
    ? Object.keys(ROOM_SPECS) as RoomType[]
    : currentTierConfig.availableRooms;
  const newRooms = nextTierConfig.availableRooms === 'all'
    ? Object.keys(ROOM_SPECS) as RoomType[]
    : nextTierConfig.availableRooms;
  
  const unlockedRooms = newRooms.filter(room => !previousRooms.includes(room));
  
  // Emit upgrade event
  window.dispatchEvent(new CustomEvent('game:tier_upgraded', {
    detail: {
      previousTier: gameState.currentTier - 1,
      newTier: gameState.currentTier,
      tierName: nextTierConfig.name,
      newRooms: unlockedRooms,
      newCapacity: nextTierConfig.maxResidents
    }
  }));
  
  return { success: true, newRooms: unlockedRooms };
}

// ============================================================================
// Tier Progress Tracking
// ============================================================================

/**
 * Get progress toward next tier
 */
export function getTierProgress(gameState: GameState): {
  currentTier: ShelterTier;
  tierName: string;
  nextTier: ShelterTier | null;
  nextTierName: string | null;
  graduations: { current: number; needed: number; percentage: number };
  reputation: { current: number; needed: number; met: boolean };
  utilization: { current: number; needed: number; percentage: number };
  money: { current: number; needed: number; met: boolean };
} {
  const currentTierConfig = getTierConfig(gameState.currentTier);
  const nextTier = getNextTier(gameState.currentTier);
  const nextTierConfig = nextTier ? getTierConfig(nextTier) : null;
  
  const currentUtilization = Math.floor(calculateGridUtilization(gameState) * 100);
  const neededUtilization = TIER_UPGRADE_CONFIG.MIN_GRID_UTILIZATION * 100;
  
  return {
    currentTier: gameState.currentTier,
    tierName: currentTierConfig.name,
    nextTier,
    nextTierName: nextTierConfig?.name || null,
    graduations: {
      current: gameState.graduatedCount,
      needed: nextTierConfig?.graduationsRequired || 0,
      percentage: nextTierConfig 
        ? Math.min(100, Math.floor((gameState.graduatedCount / nextTierConfig.graduationsRequired) * 100))
        : 100
    },
    reputation: {
      current: gameState.reputation,
      needed: nextTierConfig?.reputationRequired || 0,
      met: !nextTierConfig || gameState.reputation >= nextTierConfig.reputationRequired
    },
    utilization: {
      current: currentUtilization,
      needed: neededUtilization,
      percentage: Math.min(100, Math.floor((currentUtilization / neededUtilization) * 100))
    },
    money: {
      current: gameState.money,
      needed: nextTierConfig?.upgradeCost || 0,
      met: !nextTierConfig || gameState.money >= nextTierConfig.upgradeCost
    }
  };
}

/**
 * Track graduation toward tier progress
 * Called when a resident graduates
 */
export function trackGraduation(gameState: GameState): void {
  gameState.tierUnlockProgress.graduationsTowardNext++;
  
  // Check if player can now upgrade
  if (canUpgrade(gameState)) {
    const nextTier = getNextTier(gameState.currentTier);
    if (nextTier) {
      const nextTierConfig = getTierConfig(nextTier);
      window.dispatchEvent(new CustomEvent('game:show_notification', {
        detail: {
          message: `🎉 Congratulations! You can now upgrade to ${nextTierConfig.name}!`,
          type: 'success'
        }
      }));
    }
  }
}
