# Food System

---

## Overview

The Food System handles daily food consumption for all residents. Food is consumed once per in-game day, with costs and effects varying by portion size. The system automatically downgrades to affordable tiers if funds are insufficient.

---

## Food Configuration

### Portion Tiers

```typescript
const FOOD_CONFIG = {
  COST_PER_RESIDENT: {
    large: 15,
    standard: 10,
    small: 5,
    none: 0
  },
  
  EFFECTS: {
    large: {
      happinessChange: +10,
      reputationChange: +1
    },
    standard: {
      happinessChange: +3,
      reputationChange: 0
    },
    small: {
      happinessChange: -5,
      reputationChange: -1
    },
    none: {
      happinessChange: -15,
      reputationChange: -5
    }
  }
};

type FoodPortionSetting = "large" | "standard" | "small" | "none";
```

---

## Daily Food Processing

### Food Consumption Trigger

```typescript
function processDailyFood(gameState: GameState): void {
  const residentCount = gameState.residents.length;
  
  // No residents = no food needed
  if (residentCount === 0) return;
  
  const portionSetting = gameState.foodPortionSetting;
  const cost = calculateFoodCost(residentCount, portionSetting);
  
  // Check if affordable
  if (gameState.money < cost) {
    // Auto-downgrade to affordable tier
    const affordableTier = getAffordableFoodTier(gameState.money, residentCount);
    
    if (affordableTier !== portionSetting) {
      showNotification(
        `⚠️ Insufficient funds for ${portionSetting} portions. Downgraded to ${affordableTier}.`,
        "warning"
      );
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
  
  // Log
  console.log(`Daily food: ${residentCount} residents × $${FOOD_CONFIG.COST_PER_RESIDENT[portionSetting]} = $${cost}`);
}
```

---

## Cost Calculation

### Calculate Food Cost

```typescript
function calculateFoodCost(
  residentCount: number,
  portionSetting: FoodPortionSetting
): number {
  return residentCount * FOOD_CONFIG.COST_PER_RESIDENT[portionSetting];
}
```

### Get Affordable Tier

```typescript
function getAffordableFoodTier(
  availableMoney: number,
  residentCount: number
): FoodPortionSetting {
  const tiers: FoodPortionSetting[] = ["large", "standard", "small", "none"];
  
  for (const tier of tiers) {
    const cost = calculateFoodCost(residentCount, tier);
    if (availableMoney >= cost) {
      return tier;
    }
  }
  
  return "none";
}
```

---

## Food Effects

### Happiness Impact

```typescript
function applyFoodHappinessEffects(
  residents: Resident[],
  portionSetting: FoodPortionSetting
): void {
  const happinessChange = FOOD_CONFIG.EFFECTS[portionSetting].happinessChange;
  
  for (const resident of residents) {
    resident.happiness = Math.max(0, Math.min(100, 
      resident.happiness + happinessChange
    ));
  }
}
```

### Reputation Impact

```typescript
function applyFoodReputationEffect(
  gameState: GameState,
  portionSetting: FoodPortionSetting
): void {
  const reputationChange = FOOD_CONFIG.EFFECTS[portionSetting].reputationChange;
  
  if (reputationChange !== 0) {
    modifyReputation(
      gameState,
      reputationChange,
      `Daily food: ${portionSetting} portions`
    );
  }
}
```

---

## Food Setting Management

### Change Food Setting

```typescript
function changeFoodSetting(
  gameState: GameState,
  newSetting: FoodPortionSetting
): { success: boolean; message: string } {
  const oldSetting = gameState.foodPortionSetting;
  
  if (oldSetting === newSetting) {
    return { success: false, message: "Already using this setting" };
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
  
  return {
    success: true,
    message: `Food setting changed to ${newSetting} portions`
  };
}
```

---

## Food Timing

### Day Cycle Integration

```typescript
function onDayStart(gameState: GameState): void {
  // Food is consumed at the start of each day
  processDailyFood(gameState);
  
  // Increment day counter
  gameState.currentDay++;
  
  // Update resident days in shelter
  for (const resident of gameState.residents) {
    resident.daysInShelter++;
  }
}
```

---

## Food Statistics

### Food Tracking

```typescript
interface FoodRecord {
  day: number;
  portionSetting: FoodPortionSetting;
  residentCount: number;
  cost: number;
}

const foodHistory: FoodRecord[] = [];

function recordFoodConsumption(
  gameState: GameState,
  cost: number
): void {
  foodHistory.push({
    day: gameState.currentDay,
    portionSetting: gameState.foodPortionSetting,
    residentCount: gameState.residents.length,
    cost
  });
  
  // Keep only last 30 days
  if (foodHistory.length > 30) {
    foodHistory.shift();
  }
}

function getFoodStats(): {
  totalSpent: number;
  averageCostPerDay: number;
  averageCostPerResident: number;
} {
  const totalSpent = foodHistory.reduce((sum, r) => sum + r.cost, 0);
  const averageCostPerDay = foodHistory.length > 0 
    ? totalSpent / foodHistory.length 
    : 0;
  
  const totalResidentDays = foodHistory.reduce((sum, r) => sum + r.residentCount, 0);
  const averageCostPerResident = totalResidentDays > 0 
    ? totalSpent / totalResidentDays 
    : 0;
  
  return {
    totalSpent,
    averageCostPerDay,
    averageCostPerResident
  };
}
```

---

## Food UI

### Food Setting Display

```typescript
function getFoodSettingDisplay(setting: FoodPortionSetting): {
  label: string;
  icon: string;
  description: string;
  costPerResident: number;
} {
  const displays = {
    large: {
      label: "Large Portions",
      icon: "🍽️",
      description: "High quality meals. Boosts happiness and reputation.",
      costPerResident: FOOD_CONFIG.COST_PER_RESIDENT.large
    },
    standard: {
      label: "Standard Portions",
      icon: "🍲",
      description: "Adequate meals. Maintains happiness.",
      costPerResident: FOOD_CONFIG.COST_PER_RESIDENT.standard
    },
    small: {
      label: "Small Portions",
      icon: "🥄",
      description: "Minimal meals. Reduces happiness and reputation.",
      costPerResident: FOOD_CONFIG.COST_PER_RESIDENT.small
    },
    none: {
      label: "No Food",
      icon: "❌",
      description: "No meals provided. Severely impacts happiness and reputation.",
      costPerResident: FOOD_CONFIG.COST_PER_RESIDENT.none
    }
  };
  
  return displays[setting];
}
```

### Next Food Cost Preview

```typescript
function getNextFoodCostPreview(gameState: GameState): {
  current: number;
  large: number;
  standard: number;
  small: number;
  none: number;
} {
  const residentCount = gameState.residents.length;
  
  return {
    current: calculateFoodCost(residentCount, gameState.foodPortionSetting),
    large: calculateFoodCost(residentCount, "large"),
    standard: calculateFoodCost(residentCount, "standard"),
    small: calculateFoodCost(residentCount, "small"),
    none: 0
  };
}
```

---

## Food Events

### Food Shortage Event

```typescript
function triggerFoodShortageEvent(gameState: GameState): void {
  // Temporary increase in food costs
  const event: GameEvent = {
    id: generateUUID(),
    type: "health_outbreak", // Reusing event type
    title: "Food Shortage",
    description: "Supply chain issues have increased food costs by 50% for the next 3 days.",
    triggeredAt: Date.now(),
    expiresAt: null,
    options: [
      {
        label: "Accept higher costs",
        effects: [
          { type: "money", value: -500 }
        ]
      },
      {
        label: "Reduce portions temporarily",
        effects: [
          { type: "reputation", value: -3 }
        ]
      }
    ],
    resolved: false
  };
  
  gameState.activeEvents.push(event);
}
```

### Food Donation Event

```typescript
function triggerFoodDonationEvent(gameState: GameState): void {
  // Free food for X days
  const event: GameEvent = {
    id: generateUUID(),
    type: "donation_drive",
    title: "Food Bank Donation",
    description: "A local food bank has donated supplies. Free food for the next 5 days!",
    triggeredAt: Date.now(),
    expiresAt: null,
    options: [
      {
        label: "Accept donation",
        effects: [
          { type: "reputation", value: 2 }
        ]
      }
    ],
    resolved: false
  };
  
  gameState.activeEvents.push(event);
  
  // Implementation would require temporary food cost modifier
}
```

---

## Food Balancing

### Cost vs. Benefit Analysis

| Portion | Cost/Resident | Happiness | Reputation | Daily Cost (10 residents) | Daily Cost (30 residents) |
|---------|---------------|-----------|------------|---------------------------|---------------------------|
| Large   | $15           | +10       | +1         | $150                      | $450                      |
| Standard| $10           | +3        | 0          | $100                      | $300                      |
| Small   | $5            | -5        | -1         | $50                       | $150                      |
| None    | $0            | -15       | -5         | $0                        | $0                        |

### Recommendations

**Early Game (1-10 residents)**
- Standard portions are sustainable
- Large portions if donations are good
- Avoid small/none unless emergency

**Mid Game (10-25 residents)**
- Standard portions recommended
- Large portions if reputation is high (more donations)
- Small portions only temporarily

**Late Game (25+ residents)**
- Large portions are affordable with good donation flow
- Standard as minimum
- Never use small/none (reputation damage too severe)

---

## Integration Notes

### Day/Night Cycle Integration
- Food is consumed at the start of each day phase
- Triggered by day/night transition
- See [`14-Day-Night-Cycle.md`](14-Day-Night-Cycle.md)

### Reputation System Integration
- Food quality affects daily reputation
- Large portions: +1 rep/day
- Small portions: -1 rep/day
- None: -5 rep/day (severe)
- See [`07-Reputation-System.md`](07-Reputation-System.md)

### Resident AI Integration
- Food affects resident happiness
- Low happiness leads to departures
- Happiness affects LIFE meter fill rate
- See [`06-Resident-AI-System.md`](06-Resident-AI-System.md)

### Economy Integration
- Food is a major daily expense
- Must balance with donation income
- Budget management is key to survival

---

## Auto-Downgrade Logic

### Downgrade Cascade

```typescript
function autoDowngradeFood(gameState: GameState): void {
  const tiers: FoodPortionSetting[] = ["large", "standard", "small", "none"];
  const currentIndex = tiers.indexOf(gameState.foodPortionSetting);
  
  // Try each lower tier
  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tier = tiers[i];
    const cost = calculateFoodCost(gameState.residents.length, tier);
    
    if (gameState.money >= cost) {
      gameState.foodPortionSetting = tier;
      showNotification(
        `⚠️ Food downgraded to ${tier} portions due to insufficient funds`,
        "warning"
      );
      return;
    }
  }
  
  // If we get here, can't afford any food
  gameState.foodPortionSetting = "none";
  showNotification(
    `❌ Cannot afford any food! Residents will be very unhappy.`,
    "error"
  );
}
```

This auto-downgrade system ensures the game never crashes due to food costs, but provides clear feedback to the player about the consequences.
