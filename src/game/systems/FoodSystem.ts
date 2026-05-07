import { GameState, FoodPortionSetting, FoodPortionTier, Room } from '../../types';
import { FOOD_CONFIG, FOOD_PORTIONS, FoodPortionConfig } from '../../constants';
import { modifyReputation } from './ReputationSystem';
import { recordExpense } from './DonationSystem';

/**
 * FoodSystem - Manages food resource generation and consumption
 * - Cafeterias generate food every 15 seconds
 * - NPCs consume food from the global food resource
 * - Daily food purchases still apply for portion quality settings
 * - Food quality affects LIFE fill rate modifier (NEW)
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
// LIFE Fill Modifier (NEW)
// ============================================================================

/**
 * Get the current LIFE fill rate modifier based on food portion setting
 * This modifier affects how fast residents progress toward graduation
 */
export function getLifeFillModifier(gameState: GameState): number {
  const setting = gameState.foodPortionSetting;
  
  // Map legacy settings to new tiers
  const tierMapping: Record<FoodPortionSetting, FoodPortionTier> = {
    'premium': 'premium',
    'generous': 'generous',
    'large': 'generous',    // Legacy mapping
    'standard': 'standard',
    'small': 'small',
    'minimal': 'minimal',
    'none': 'minimal'       // 'none' maps to minimal with worst modifier
  };
  
  const tier = tierMapping[setting] || 'standard';
  const portionConfig = FOOD_PORTIONS[tier];
  
  // If 'none' is selected, apply even worse modifier
  if (setting === 'none') {
    return 0.3; // 30% of normal fill rate
  }
  
  return portionConfig.lifeFillModifier;
}

/**
 * Get the food portion configuration for a given tier
 */
export function getFoodPortionConfig(tier: FoodPortionTier): FoodPortionConfig {
  return FOOD_PORTIONS[tier];
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
  
  // Record food expense to financial history
  recordExpense(gameState, cost, 'food', `Daily food (${portionSetting}) for ${residentCount} residents`);
  
  // Get effects from the new FOOD_PORTIONS config
  const portionConfig = getPortionEffects(portionSetting);
  
  for (const resident of gameState.residents) {
    resident.happiness = Math.max(0, Math.min(100, 
      resident.happiness + portionConfig.happiness
    ));
  }
  
  // Update reputation
  if (portionConfig.reputation !== 0) {
    modifyReputation(
      gameState,
      portionConfig.reputation,
      `Daily food: ${portionSetting} portions`
    );
  }
  
  const costPerResident = portionConfig.cost;
  console.log(`🍽️ Daily food: ${residentCount} residents × $${costPerResident} = $${cost}`);
  
  // Emit event
  emitFoodProcessed(portionSetting, cost, residentCount);
}

/**
 * Get portion effects mapping setting to new config
 */
function getPortionEffects(setting: FoodPortionSetting): { happiness: number; reputation: number; cost: number } {
  // Map legacy settings to new tiers
  const tierMapping: Record<FoodPortionSetting, FoodPortionTier | 'none'> = {
    'premium': 'premium',
    'generous': 'generous',
    'large': 'generous',    // Legacy mapping
    'standard': 'standard',
    'small': 'small',
    'minimal': 'minimal',
    'none': 'none'
  };
  
  const tier = tierMapping[setting];
  
  if (tier === 'none') {
    return { happiness: -15, reputation: -5, cost: 0 };
  }
  
  const config = FOOD_PORTIONS[tier as FoodPortionTier];
  return {
    happiness: config.happiness,
    reputation: config.reputation,
    cost: config.cost
  };
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
  const effects = getPortionEffects(portionSetting);
  return residentCount * effects.cost;
}

/**
 * Get affordable food tier based on available money
 * Now uses new tier order: premium > generous > standard > small > minimal > none
 */
export function getAffordableFoodTier(
  availableMoney: number,
  residentCount: number
): FoodPortionSetting {
  const tiers: FoodPortionSetting[] = ['premium', 'generous', 'standard', 'small', 'minimal', 'none'];
  
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
): { success: boolean; message: string; warning?: string } {
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
  
  // Add warning for below-standard choices
  let warning: string | undefined;
  if (newSetting === 'small' || newSetting === 'minimal' || newSetting === 'none') {
    warning = `⚠️ Warning: Below-standard food will reduce happiness and LIFE progression!`;
  }
  
  return {
    success: true,
    message: `Food setting changed to ${newSetting} portions`,
    warning
  };
}

// ============================================================================
// Food Preview & Display
// ============================================================================

/**
 * Get next food cost preview for all tiers (NEW - updated for 5 tiers)
 */
export function getNextFoodCostPreview(gameState: GameState): {
  current: number;
  premium: number;
  generous: number;
  standard: number;
  small: number;
  minimal: number;
  none: number;
} {
  const residentCount = gameState.residents.length;
  
  return {
    current: calculateFoodCost(residentCount, gameState.foodPortionSetting),
    premium: calculateFoodCost(residentCount, 'premium'),
    generous: calculateFoodCost(residentCount, 'generous'),
    standard: calculateFoodCost(residentCount, 'standard'),
    small: calculateFoodCost(residentCount, 'small'),
    minimal: calculateFoodCost(residentCount, 'minimal'),
    none: 0
  };
}

/**
 * Get food setting display info (NEW - updated for all tiers)
 */
export function getFoodSettingDisplay(setting: FoodPortionSetting): {
  label: string;
  icon: string;
  description: string;
  costPerResident: number;
  happinessChange: number;
  reputationChange: number;
  lifeFillModifier: number;
  isBelowStandard: boolean;
} {
  const displays: Record<FoodPortionSetting, {
    label: string;
    icon: string;
    description: string;
    costPerResident: number;
    happinessChange: number;
    reputationChange: number;
    lifeFillModifier: number;
    isBelowStandard: boolean;
  }> = {
    premium: {
      label: 'Premium Dining',
      icon: '🥂',
      description: FOOD_PORTIONS.premium.description,
      costPerResident: FOOD_PORTIONS.premium.cost,
      happinessChange: FOOD_PORTIONS.premium.happiness,
      reputationChange: FOOD_PORTIONS.premium.reputation,
      lifeFillModifier: FOOD_PORTIONS.premium.lifeFillModifier,
      isBelowStandard: false
    },
    generous: {
      label: 'Generous Portions',
      icon: '🍽️',
      description: FOOD_PORTIONS.generous.description,
      costPerResident: FOOD_PORTIONS.generous.cost,
      happinessChange: FOOD_PORTIONS.generous.happiness,
      reputationChange: FOOD_PORTIONS.generous.reputation,
      lifeFillModifier: FOOD_PORTIONS.generous.lifeFillModifier,
      isBelowStandard: false
    },
    large: {
      // Legacy support - maps to generous
      label: 'Generous Portions',
      icon: '🍽️',
      description: FOOD_PORTIONS.generous.description,
      costPerResident: FOOD_PORTIONS.generous.cost,
      happinessChange: FOOD_PORTIONS.generous.happiness,
      reputationChange: FOOD_PORTIONS.generous.reputation,
      lifeFillModifier: FOOD_PORTIONS.generous.lifeFillModifier,
      isBelowStandard: false
    },
    standard: {
      label: 'Standard Portions',
      icon: '🍲',
      description: FOOD_PORTIONS.standard.description,
      costPerResident: FOOD_PORTIONS.standard.cost,
      happinessChange: FOOD_PORTIONS.standard.happiness,
      reputationChange: FOOD_PORTIONS.standard.reputation,
      lifeFillModifier: FOOD_PORTIONS.standard.lifeFillModifier,
      isBelowStandard: false
    },
    small: {
      label: 'Small Portions',
      icon: '🥄',
      description: FOOD_PORTIONS.small.description,
      costPerResident: FOOD_PORTIONS.small.cost,
      happinessChange: FOOD_PORTIONS.small.happiness,
      reputationChange: FOOD_PORTIONS.small.reputation,
      lifeFillModifier: FOOD_PORTIONS.small.lifeFillModifier,
      isBelowStandard: true
    },
    minimal: {
      label: 'Minimal Rations',
      icon: '🍞',
      description: FOOD_PORTIONS.minimal.description,
      costPerResident: FOOD_PORTIONS.minimal.cost,
      happinessChange: FOOD_PORTIONS.minimal.happiness,
      reputationChange: FOOD_PORTIONS.minimal.reputation,
      lifeFillModifier: FOOD_PORTIONS.minimal.lifeFillModifier,
      isBelowStandard: true
    },
    none: {
      label: 'No Food',
      icon: '❌',
      description: 'No meals provided. Severely impacts everything.',
      costPerResident: 0,
      happinessChange: -15,
      reputationChange: -5,
      lifeFillModifier: 0.3,
      isBelowStandard: true
    }
  };
  
  return displays[setting];
}

/**
 * Get all food tier options for UI display
 */
export function getAllFoodTierOptions(): Array<{
  tier: FoodPortionSetting;
  display: ReturnType<typeof getFoodSettingDisplay>;
}> {
  const tiers: FoodPortionSetting[] = ['premium', 'generous', 'standard', 'small', 'minimal', 'none'];
  return tiers.map(tier => ({
    tier,
    display: getFoodSettingDisplay(tier)
  }));
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
  // Legacy event for backward compatibility
  window.dispatchEvent(new CustomEvent('food_processed', {
    detail: { portionSetting, cost, residentCount }
  }));
  
  // New unified money change event for animations (only if there was a cost)
  if (cost > 0) {
    emitMoneyChangeEvent(-cost, 'Food', '🍽️', 'expense');
  }
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
