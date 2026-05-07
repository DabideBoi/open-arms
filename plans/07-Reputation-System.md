# Reputation System

---

## Overview

The Reputation System is a core mechanic that affects donation probability, LIFE meter fill rates, and overall shelter success. Reputation ranges from 0-100 and responds to player actions and shelter conditions.

---

## Reputation Range

```typescript
const REPUTATION_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING: 50,
  CRITICAL_THRESHOLD: 20,    // Below this triggers warnings
  GAME_OVER_THRESHOLD: 0     // Game over at 0
};
```

---

## Reputation Changes

### Change Constants

```typescript
const REPUTATION_CHANGES = {
  // Positive changes
  RESIDENT_GRADUATED: 5,
  RESIDENT_GRADUATED_VETERAN: 7,     // Veterans give +2 bonus
  FUNDRAISER_COMPLETED: 2,
  FOOD_LARGE_PORTION: 1,             // Per day
  DISASTER_ACCEPTED: 3,
  DONATION_DRIVE_ACTIVATED: 2,
  
  // Negative changes
  RESIDENT_LEFT_UNHAPPY: -3,
  FOOD_SMALL_PORTION: -1,            // Per day
  FOOD_NONE: -5,                     // Per day
  MAINTENANCE_MISSED: -2,            // Per room
  OVERCROWDING: -1,                  // Per day if cafeteria overcrowded
  DISASTER_REJECTED: -5,
  EVENT_IGNORED: -2,
  
  // Neutral
  FOOD_STANDARD: 0
};
```

### Reputation Modification

```typescript
function modifyReputation(
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
    
    // Trigger UI notification
    if (change > 0) {
      showNotification(`Reputation +${change}: ${reason}`, "success");
    } else {
      showNotification(`Reputation ${change}: ${reason}`, "warning");
    }
  }
  
  // Check for critical thresholds
  checkReputationThresholds(gameState);
}
```

### Threshold Checks

```typescript
function checkReputationThresholds(gameState: GameState): void {
  // Game over at 0
  if (gameState.reputation === 0) {
    triggerGameOver(gameState, "reputation_zero");
    return;
  }
  
  // Warning at critical threshold
  if (gameState.reputation <= REPUTATION_CONFIG.CRITICAL_THRESHOLD) {
    showNotification(
      "⚠️ Reputation is critically low! Improve conditions or risk closure.",
      "error"
    );
  }
  
  // Milestone notifications
  if (gameState.reputation === 100) {
    showNotification("🌟 Perfect reputation achieved!", "success");
  }
}
```

---

## Reputation Effects

### Donation Probability

```typescript
function getDonationChance(reputation: number): number {
  // Reputation directly translates to donation chance
  // 0 rep = 0% chance, 100 rep = 100% chance
  return reputation / 100;
}

// Example usage in donation system
function checkDonation(gameState: GameState): void {
  const chance = getDonationChance(gameState.reputation);
  const roll = Math.random();
  
  if (roll <= chance) {
    const amount = calculateDonationAmount(gameState);
    gameState.money += amount;
    showNotification(`Donation received: $${amount}`, "success");
  }
}
```

### LIFE Meter Fill Rate Multiplier

```typescript
function getReputationMultiplier(reputation: number): number {
  // Reputation affects LIFE meter fill rate
  // 0 rep = 0x multiplier (no progress)
  // 50 rep = 0.5x multiplier
  // 100 rep = 1.0x multiplier
  return reputation / 100;
}

// Example usage in LIFE meter system
function updateResidentLife(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  const baseFillRate = getBaseFillRate(resident.profile);
  const reputationMultiplier = getReputationMultiplier(gameState.reputation);
  const happinessMultiplier = resident.happiness / 100;
  
  // Combined multiplier
  const effectiveMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  
  const fillPerSecond = baseFillRate * effectiveMultiplier;
  const increase = fillPerSecond * deltaTime;
  
  resident.lifeMeter = Math.min(100, resident.lifeMeter + increase);
}
```

---

## Daily Reputation Updates

### Daily Food Impact

```typescript
function applyDailyFoodReputation(gameState: GameState): void {
  const portionSetting = gameState.foodPortionSetting;
  const repChange = REPUTATION_CHANGES[`FOOD_${portionSetting.toUpperCase()}`] || 0;
  
  if (repChange !== 0) {
    modifyReputation(
      gameState,
      repChange,
      `Daily food: ${portionSetting} portions`
    );
  }
}
```

### Overcrowding Check

```typescript
function checkOvercrowding(gameState: GameState): void {
  // Check cafeteria capacity
  const cafeterias = gameState.rooms.filter(r => r.type === "cafeteria");
  const totalCapacity = cafeterias.reduce(
    (sum, r) => sum + ROOM_SPECS.cafeteria.capacity,
    0
  );
  
  if (gameState.residents.length > totalCapacity) {
    modifyReputation(
      gameState,
      REPUTATION_CHANGES.OVERCROWDING,
      "Cafeteria overcrowding"
    );
  }
}
```

---

## Event-Based Reputation Changes

### Graduation

```typescript
function handleGraduation(resident: Resident, gameState: GameState): void {
  let repBoost = REPUTATION_CHANGES.RESIDENT_GRADUATED;
  
  // Veterans give extra reputation
  if (resident.profile === "veteran") {
    repBoost = REPUTATION_CHANGES.RESIDENT_GRADUATED_VETERAN;
  }
  
  modifyReputation(gameState, repBoost, `${resident.name} graduated`);
}
```

### Unhappy Departure

```typescript
function handleUnhappyDeparture(resident: Resident, gameState: GameState): void {
  modifyReputation(
    gameState,
    REPUTATION_CHANGES.RESIDENT_LEFT_UNHAPPY,
    `${resident.name} left unhappy`
  );
}
```

### Fundraiser Completion

```typescript
function completeFundraiser(fundraiser: Fundraiser, gameState: GameState): void {
  // Award payout
  gameState.money += fundraiser.expectedPayout;
  
  // Reputation boost
  modifyReputation(
    gameState,
    REPUTATION_CHANGES.FUNDRAISER_COMPLETED,
    "Fundraiser completed"
  );
}
```

### Maintenance Missed

```typescript
function processMaintenance(gameState: GameState): void {
  const totalCost = getTotalMaintenanceCost(gameState);
  
  if (gameState.money < totalCost) {
    // Can't afford maintenance
    const roomsAffected = gameState.rooms.length;
    const repPenalty = REPUTATION_CHANGES.MAINTENANCE_MISSED * roomsAffected;
    
    modifyReputation(
      gameState,
      repPenalty,
      `Missed maintenance on ${roomsAffected} rooms`
    );
    
    // Still deduct cost (can go negative)
    gameState.money -= totalCost;
  } else {
    // Normal maintenance
    gameState.money -= totalCost;
  }
}
```

---

## Reputation Display

### Reputation Tiers

```typescript
interface ReputationTier {
  min: number;
  max: number;
  label: string;
  color: string;
  description: string;
}

const REPUTATION_TIERS: ReputationTier[] = [
  {
    min: 0,
    max: 20,
    label: "Critical",
    color: "#ff0000",
    description: "Shelter at risk of closure"
  },
  {
    min: 21,
    max: 40,
    label: "Poor",
    color: "#ff6600",
    description: "Significant improvements needed"
  },
  {
    min: 41,
    max: 60,
    label: "Fair",
    color: "#ffcc00",
    description: "Meeting basic standards"
  },
  {
    min: 61,
    max: 80,
    label: "Good",
    color: "#66cc00",
    description: "Well-regarded shelter"
  },
  {
    min: 81,
    max: 100,
    label: "Excellent",
    color: "#00cc00",
    description: "Model shelter program"
  }
];

function getReputationTier(reputation: number): ReputationTier {
  for (const tier of REPUTATION_TIERS) {
    if (reputation >= tier.min && reputation <= tier.max) {
      return tier;
    }
  }
  return REPUTATION_TIERS[0]; // Fallback to Critical
}
```

### UI Display

```typescript
function getReputationDisplay(reputation: number): string {
  const tier = getReputationTier(reputation);
  return `${reputation}% - ${tier.label}`;
}

function getReputationColor(reputation: number): string {
  const tier = getReputationTier(reputation);
  return tier.color;
}
```

---

## Reputation Recovery Strategies

### Player Actions to Improve Reputation

1. **Graduate Residents** (+5 each, +7 for veterans)
   - Focus on LIFE meter progression
   - Ensure learning centers are available

2. **Complete Fundraisers** (+2 each)
   - Regular fundraiser activities
   - Assign residents strategically

3. **Provide Large Food Portions** (+1 per day)
   - Invest in better food quality
   - Sustainable if donations are good

4. **Accept Disaster Refugees** (+3)
   - Respond positively to events
   - Build capacity to handle surges

5. **Avoid Overcrowding**
   - Build more cafeterias
   - Manage resident intake

6. **Maintain Facilities**
   - Keep enough funds for maintenance
   - Prioritize financial stability

---

## Reputation Analytics

### Tracking Reputation Changes

```typescript
interface ReputationChange {
  timestamp: number;
  oldValue: number;
  newValue: number;
  change: number;
  reason: string;
}

const reputationHistory: ReputationChange[] = [];

function recordReputationChange(
  oldValue: number,
  newValue: number,
  reason: string
): void {
  reputationHistory.push({
    timestamp: Date.now(),
    oldValue,
    newValue,
    change: newValue - oldValue,
    reason
  });
  
  // Keep only last 50 changes
  if (reputationHistory.length > 50) {
    reputationHistory.shift();
  }
}

function getReputationTrend(): "improving" | "declining" | "stable" {
  if (reputationHistory.length < 5) return "stable";
  
  const recent = reputationHistory.slice(-5);
  const totalChange = recent.reduce((sum, r) => sum + r.change, 0);
  
  if (totalChange > 5) return "improving";
  if (totalChange < -5) return "declining";
  return "stable";
}
```

---

## Integration Notes

### Donation System Integration
- Reputation directly affects donation probability
- Higher reputation = more frequent donations
- See [`08-Donation-System.md`](08-Donation-System.md)

### LIFE Meter Integration
- Reputation multiplies LIFE meter fill rate
- Low reputation stalls resident progression
- See [`10-LIFE-Meter-System.md`](10-LIFE-Meter-System.md)

### Event System Integration
- Event choices affect reputation
- Some events provide reputation boosts
- See [`13-Event-System.md`](13-Event-System.md)

### UI Integration
- Display reputation bar prominently in HUD
- Color-code based on tier
- Show trend indicator (↑↓→)
- Tooltip shows recent changes

---

## Game Over Condition

```typescript
function triggerGameOver(gameState: GameState, reason: string): void {
  console.log(`Game Over: ${reason}`);
  
  // Show game over screen
  showGameOverScreen({
    reason,
    daysPlayed: gameState.currentDay,
    residentsHelped: gameState.graduatedCount,
    finalReputation: gameState.reputation,
    finalMoney: gameState.money
  });
  
  // Pause game
  pauseGame();
}
```

When reputation reaches 0:
- Donors stop giving (no more donations)
- Residents leave en masse (mass exodus event)
- Game over screen displays
- Player can restart or load previous save
