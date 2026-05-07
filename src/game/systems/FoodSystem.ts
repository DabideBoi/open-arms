import { GameState, FoodPortionSetting, Room } from '../../types';
import { FOOD_CONFIG } from '../../constants';
import { modifyReputation } from './ReputationSystem';

/**
 * FoodSystem - Manages food resource generation and consumption
 * - Cafeterias generate food every 15 seconds
 * - NPCs consume food from the global food resource
 * - Daily food purchases still apply for portion quality settings
 */

// ============================================================================
// Food Resource Generation
// ============================================================================

/**
 * Track last generation time for each cafeteria
 */
const cafeteriaGenerationTimers = new Map<string, number>();

/**
 * Initialize food generation for a cafeteria
 */
export function initializeCafeteriaGeneration(cafeteriaId: string): void {
  cafeteriaGenerationTimers.set(cafeteriaId, Date.now());
}

/**
 * Remove cafeteria from generation tracking
 */
export function removeCafeteriaGeneration(cafeteriaId: string): void {
  cafeteriaGenerationTimers.delete(cafeteriaId);
}

/**
 * Update food generation for all cafeterias
 * Called from game loop
 */
export function updateFoodGeneration(gameState: GameState): void {
  const now = Date.now();
  const cafeterias = gameState.rooms.filter(room => room.type === 'cafeteria');
  
  for (const cafeteria of cafeterias) {
    // Initialize timer if not exists
    if (!cafeteriaGenerationTimers.has(cafeteria.id)) {
      cafeteriaGenerationTimers.set(cafeteria.id, now);
      continue;
    }
    
    const lastGeneration = cafeteriaGenerationTimers.get(cafeteria.id)!;
    const timeSinceLastGeneration = now - lastGeneration;
    
    // Check if enough time has passed
    if (timeSinceLastGeneration >= FOOD_CONFIG.GENERATION_INTERVAL) {
      // Generate food
      gameState.food += FOOD_CONFIG.GENERATION_AMOUNT;
      
      // Update timer
      cafeteriaGenerationTimers.set(cafeteria.id, now);
      
      console.log(`🍽️ Cafeteria ${cafeteria.id} generated ${FOOD_CONFIG.GENERATION_AMOUNT} food. Total: ${gameState.food}`);
      
      // Emit event for UI updates
      emitFoodGenerated(cafeteria.id, FOOD_CONFIG.GENERATION_AMOUNT, gameState.food);
    }
  }
}

/**
 * Get time until next food generation for a cafeteria
 */
export function getTimeUntilNextGeneration(cafeteriaId: string): number {
  const lastGeneration = cafeteriaGenerationTimers.get(cafeteriaId);
  if (!lastGeneration) return 0;
  
  const now = Date.now();
  const timeSinceLastGeneration = now - lastGeneration;
  const timeRemaining = Math.max(0, FOOD_CONFIG.GENERATION_INTERVAL - timeSinceLastGeneration);
  
  return timeRemaining;
}

/**
 * Get total food generation rate (food per minute)
 */
export function getFoodGenerationRate(gameState: GameState): number {
  const cafeteriaCount = gameState.rooms.filter(room => room.type === 'cafeteria').length;
  const generationsPerMinute = 60000 / FOOD_CONFIG.GENERATION_INTERVAL; // 4 per minute (60s / 15s)
  return cafeteriaCount * FOOD_CONFIG.GENERATION_AMOUNT * generationsPerMinute;
}

// ============================================================================
// Food Consumption
// ============================================================================

/**
 * Consume food from global resource
 * Returns true if food was available and consumed
 */
export function consumeFood(gameState: GameState, amount: number = 1): boolean {
  if (gameState.food >= amount) {
    gameState.food -= amount;
    console.log(`🍴 Consumed ${amount} food. Remaining: ${gameState.food}`);
    emitFoodConsumed(amount, gameState.food);
    return true;
  }
  
  console.warn(`⚠️ Not enough food! Need ${amount}, have ${gameState.food}`);
  return false;
}

/**
 * Check if enough food is available
 */
export function hasFoodAvailable(gameState: GameState, amount: number = 1): boolean {
  return gameState.food >= amount;
}

// ============================================================================
// Daily Food Processing
// ============================================================================

/**
 * Process daily food consumption
 */
export function processDailyFood(gameState: GameState): void {
  const residentCount = gameState.residents.length;
  
  // No residents = no food needed
  if (residentCount === 0) {
    console.log('No residents, skipping food');
    return;
  }
  
  const portionSetting = gameState.foodPortionSetting;
  const cost = calculateFoodCost(residentCount, portionSetting);
  
  // Check if affordable
  if (gameState.money < cost) {
    // Auto-downgrade to affordable tier
    const affordableTier = getAffordableFoodTier(gameState.money, residentCount);
    
    if (affordableTier !== portionSetting) {
      console.log(`⚠️ Insufficient funds for ${portionSetting} portions. Downgraded to ${affordableTier}.`);
      
      emitFoodDowngrade(portionSetting, affordableTier);
      gameState.foodPortionSetting = affordableTier;
    }
    
    // Process with new tier
    processDailyFood(gameState);
    return;
  }
  
  // Deduct cost
  gameState.money -= cost;
  
  // Apply effects to all residents
  const effects = FOOD_CONFIG.EFFECTS[portionSetting];
  
  for (const resident of gameState.residents) {
    resident.happiness = Math.max(0, Math.min(100, 
      resident.happiness + effects.happinessChange
    ));
  }
  
  // Update reputation
  if (effects.reputationChange !== 0) {
    modifyReputation(
      gameState,
      effects.reputationChange,
      `Daily food: ${portionSetting} portions`
    );
  }
  
  console.log(`🍽️ Daily food: ${residentCount} residents × $${FOOD_CONFIG.COST_PER_RESIDENT[portionSetting]} = $${cost}`);
  
  // Emit event
  emitFoodProcessed(portionSetting, cost, residentCount);
}

// ============================================================================
// Cost Calculation
// ============================================================================

/**
 * Calculate food cost for given residents and portion setting
 */
export function calculateFoodCost(
  residentCount: number,
  portionSetting: FoodPortionSetting
): number {
  return residentCount * FOOD_CONFIG.COST_PER_RESIDENT[portionSetting];
}

/**
 * Get affordable food tier based on available money
 */
export function getAffordableFoodTier(
  availableMoney: number,
  residentCount: number
): FoodPortionSetting {
  const tiers: FoodPortionSetting[] = ['large', 'standard', 'small', 'none'];
  
  for (const tier of tiers) {
    const cost = calculateFoodCost(residentCount, tier);
    if (availableMoney >= cost) {
      return tier;
    }
  }
  
  return 'none';
}

// ============================================================================
// Food Setting Management
// ============================================================================

/**
 * Change food setting with validation
 */
export function changeFoodSetting(
  gameState: GameState,
  newSetting: FoodPortionSetting
): { success: boolean; message: string } {
  const oldSetting = gameState.foodPortionSetting;
  
  if (oldSetting === newSetting) {
    return { success: false, message: 'Already using this setting' };
  }
  
  // Check if affordable for next cycle
  const cost = calculateFoodCost(gameState.residents.length, newSetting);
  
  if (cost > gameState.money) {
    return {
      success: false,
      message: `Cannot afford ${newSetting} portions (need $${cost}, have $${gameState.money})`
    };
  }
  
  gameState.foodPortionSetting = newSetting;
  
  console.log(`Food setting changed: ${oldSetting} → ${newSetting}`);
  emitFoodSettingChanged(oldSetting, newSetting);
  
  return {
    success: true,
    message: `Food setting changed to ${newSetting} portions`
  };
}

// ============================================================================
// Food Preview & Display
// ============================================================================

/**
 * Get next food cost preview for all tiers
 */
export function getNextFoodCostPreview(gameState: GameState): {
  current: number;
  large: number;
  standard: number;
  small: number;
  none: number;
} {
  const residentCount = gameState.residents.length;
  
  return {
    current: calculateFoodCost(residentCount, gameState.foodPortionSetting),
    large: calculateFoodCost(residentCount, 'large'),
    standard: calculateFoodCost(residentCount, 'standard'),
    small: calculateFoodCost(residentCount, 'small'),
    none: 0
  };
}

/**
 * Get food setting display info
 */
export function getFoodSettingDisplay(setting: FoodPortionSetting): {
  label: string;
  icon: string;
  description: string;
  costPerResident: number;
  happinessChange: number;
  reputationChange: number;
} {
  const displays = {
    large: {
      label: 'Large Portions',
      icon: '🍽️',
      description: 'High quality meals. Boosts happiness and reputation.',
      costPerResident: FOOD_CONFIG.COST_PER_RESIDENT.large,
      happinessChange: FOOD_CONFIG.EFFECTS.large.happinessChange,
      reputationChange: FOOD_CONFIG.EFFECTS.large.reputationChange
    },
    standard: {
      label: 'Standard Portions',
      icon: '🍲',
      description: 'Adequate meals. Maintains happiness.',
      costPerResident: FOOD_CONFIG.COST_PER_RESIDENT.standard,
      happinessChange: FOOD_CONFIG.EFFECTS.standard.happinessChange,
      reputationChange: FOOD_CONFIG.EFFECTS.standard.reputationChange
    },
    small: {
      label: 'Small Portions',
      icon: '🥄',
      description: 'Minimal meals. Reduces happiness and reputation.',
      costPerResident: FOOD_CONFIG.COST_PER_RESIDENT.small,
      happinessChange: FOOD_CONFIG.EFFECTS.small.happinessChange,
      reputationChange: FOOD_CONFIG.EFFECTS.small.reputationChange
    },
    none: {
      label: 'No Food',
      icon: '❌',
      description: 'No meals provided. Severely impacts happiness and reputation.',
      costPerResident: FOOD_CONFIG.COST_PER_RESIDENT.none,
      happinessChange: FOOD_CONFIG.EFFECTS.none.happinessChange,
      reputationChange: FOOD_CONFIG.EFFECTS.none.reputationChange
    }
  };
  
  return displays[setting];
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit food generated event
 */
function emitFoodGenerated(
  cafeteriaId: string,
  amount: number,
  totalFood: number
): void {
  window.dispatchEvent(new CustomEvent('food_generated', {
    detail: { cafeteriaId, amount, totalFood }
  }));
}

/**
 * Emit food consumed event
 */
function emitFoodConsumed(
  amount: number,
  remainingFood: number
): void {
  window.dispatchEvent(new CustomEvent('food_consumed', {
    detail: { amount, remainingFood }
  }));
}

/**
 * Emit food processed event
 */
function emitFoodProcessed(
  portionSetting: FoodPortionSetting,
  cost: number,
  residentCount: number
): void {
  window.dispatchEvent(new CustomEvent('food_processed', {
    detail: { portionSetting, cost, residentCount }
  }));
}

/**
 * Emit food downgrade event
 */
function emitFoodDowngrade(
  oldSetting: FoodPortionSetting,
  newSetting: FoodPortionSetting
): void {
  window.dispatchEvent(new CustomEvent('food_downgrade', {
    detail: { oldSetting, newSetting }
  }));
}

/**
 * Emit food setting changed event
 */
function emitFoodSettingChanged(
  oldSetting: FoodPortionSetting,
  newSetting: FoodPortionSetting
): void {
  window.dispatchEvent(new CustomEvent('food_setting_changed', {
    detail: { oldSetting, newSetting }
  }));
}
