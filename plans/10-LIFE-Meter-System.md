# LIFE Meter System

---

## Overview

The LIFE Meter represents a resident's progress toward graduation. It fills when residents use Learning Centers or Vocational Rooms, with fill rates affected by reputation, happiness, and resident profile. At 100%, the resident graduates.

---

## LIFE Meter Configuration

### Basic Parameters

```typescript
const LIFE_METER_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING_MIN: 10,
  STARTING_MAX: 25,
  GRADUATION_THRESHOLD: 100,
  UPDATE_INTERVAL: 10000        // Update every 10 seconds
};
```

### Profile Fill Rates

```typescript
const LIFE_FILL_RATES = {
  young_adult: 0.05,    // 100% in ~33 minutes of learning
  veteran: 0.025,       // 100% in ~66 minutes of learning
  elderly: 0.0375       // 100% in ~44 minutes of learning
};
```

---

## LIFE Meter Updates

### Update Function

```typescript
function updateResidentLife(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Only update if in learning center or vocational room
  if (resident.currentState !== "in_use") return;
  
  const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
  if (!room) return;
  
  if (room.type !== "learning_center" && room.type !== "vocational_room") {
    return;
  }
  
  // Calculate fill rate
  const baseFillRate = LIFE_FILL_RATES[resident.profile];
  const reputationMultiplier = gameState.reputation / 100; // 0-1
  const happinessMultiplier = resident.happiness / 100; // 0-1
  
  // Combined multiplier (both reputation and happiness matter)
  const effectiveMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  
  // Calculate increase per second
  const fillPerSecond = baseFillRate * effectiveMultiplier;
  const increase = fillPerSecond * deltaTime;
  
  // Update LIFE meter
  const oldLife = resident.lifeMeter;
  resident.lifeMeter = Math.min(LIFE_METER_CONFIG.MAX, resident.lifeMeter + increase);
  
  // Log significant progress
  if (Math.floor(oldLife / 10) < Math.floor(resident.lifeMeter / 10)) {
    console.log(`${resident.name} LIFE: ${oldLife.toFixed(1)}% → ${resident.lifeMeter.toFixed(1)}%`);
  }
  
  // Check for graduation
  if (resident.lifeMeter >= LIFE_METER_CONFIG.GRADUATION_THRESHOLD) {
    graduateResident(resident, gameState);
  }
  
  resident.lastLifeUpdate = Date.now();
}
```

---

## Fill Rate Calculation

### Formula

```
FillRate = BaseFillRate × EffectiveMultiplier

Where:
- BaseFillRate = Profile-specific rate (per second)
- EffectiveMultiplier = (ReputationMultiplier + HappinessMultiplier) / 2
- ReputationMultiplier = Reputation / 100 (0 to 1)
- HappinessMultiplier = Happiness / 100 (0 to 1)
```

### Example Calculations

```typescript
// Example 1: Young Adult, 50% reputation, 50% happiness
// BaseFillRate: 0.05/sec
// EffectiveMultiplier: (0.5 + 0.5) / 2 = 0.5
// FillRate: 0.05 × 0.5 = 0.025/sec
// Time to 100%: 100 / 0.025 = 4000 seconds = ~66 minutes

// Example 2: Young Adult, 100% reputation, 100% happiness
// BaseFillRate: 0.05/sec
// EffectiveMultiplier: (1.0 + 1.0) / 2 = 1.0
// FillRate: 0.05 × 1.0 = 0.05/sec
// Time to 100%: 100 / 0.05 = 2000 seconds = ~33 minutes

// Example 3: Veteran, 75% reputation, 60% happiness
// BaseFillRate: 0.025/sec
// EffectiveMultiplier: (0.75 + 0.6) / 2 = 0.675
// FillRate: 0.025 × 0.675 = 0.017/sec
// Time to 100%: 100 / 0.017 = ~5882 seconds = ~98 minutes

// Example 4: Elderly, 30% reputation, 40% happiness (struggling shelter)
// BaseFillRate: 0.0375/sec
// EffectiveMultiplier: (0.3 + 0.4) / 2 = 0.35
// FillRate: 0.0375 × 0.35 = 0.013/sec
// Time to 100%: 100 / 0.013 = ~7692 seconds = ~128 minutes
```

---

## Profile-Specific Behavior

### Young Adult

```typescript
const YOUNG_ADULT_SPEC = {
  lifeFillRate: 0.05,           // Fastest
  happinessDecayRate: 10,       // Medium
  fundraiserEfficiency: 1.2,    // 20% bonus
  graduationBonus: 0,
  description: "Eager to learn and adapt quickly"
};
```

**Characteristics:**
- Fastest LIFE meter progression
- Best for fundraisers
- Average happiness stability
- Ideal for quick graduations

### Veteran

```typescript
const VETERAN_SPEC = {
  lifeFillRate: 0.025,          // Slowest
  happinessDecayRate: 5,        // Lowest (resilient)
  fundraiserEfficiency: 1.0,    // Normal
  graduationBonus: 2,           // +2 reputation on graduation
  description: "Resilient but requires patience"
};
```

**Characteristics:**
- Slowest LIFE meter progression
- Most stable happiness
- Extra reputation on graduation
- Long-term investment

### Elderly

```typescript
const ELDERLY_SPEC = {
  lifeFillRate: 0.0375,         // Medium
  happinessDecayRate: 15,       // Highest (needs comfort)
  fundraiserEfficiency: 0.8,    // 20% penalty
  graduationBonus: 0,
  description: "Needs comfort and dignity"
};
```

**Characteristics:**
- Medium LIFE meter progression
- Fastest happiness decay
- Requires good food and common rooms
- Sensitive to shelter conditions

---

## Graduation

### Graduation Trigger

```typescript
function graduateResident(resident: Resident, gameState: GameState): void {
  console.log(`🎓 ${resident.name} graduated!`);
  
  // Update counters
  gameState.graduatedCount++;
  
  // Reputation boost
  let repBoost = 5; // Base graduation bonus
  
  // Veterans give extra reputation
  if (resident.profile === "veteran") {
    repBoost += 2;
  }
  
  modifyReputation(gameState, repBoost, `${resident.name} graduated`);
  
  // Trigger graduation animation
  triggerGraduationAnimation(resident);
  
  // Create exit path to entrance
  const exitPath = findPathToEntrance(gameState.grid, resident.gridX, resident.gridY);
  
  if (exitPath) {
    // Walk to exit
    resident.path = exitPath;
    resident.pathIndex = 0;
    resident.currentState = "pathfinding";
    
    // Remove after animation completes
    const walkDuration = exitPath.length * 500; // 0.5s per tile
    setTimeout(() => {
      removeResident(gameState, resident.id);
    }, walkDuration);
  } else {
    // No path, remove immediately
    removeResident(gameState, resident.id);
  }
}
```

### Graduation Animation

```typescript
function triggerGraduationAnimation(resident: Resident): void {
  // Phaser/PixiJS animation
  // - Confetti particles around resident sprite
  // - Happy emote above head
  // - Sparkle effect
  // - Play celebration sound
  
  emitGameEvent("resident_graduated", {
    residentId: resident.id,
    name: resident.name,
    profile: resident.profile,
    daysInShelter: resident.daysInShelter
  });
}
```

---

## LIFE Meter Decay

### No Decay System

Unlike happiness, the LIFE meter **does not decay**. Once progress is made, it's permanent. This design choice:

- Rewards consistent effort
- Prevents frustration from lost progress
- Encourages long-term resident care
- Makes veterans viable (slow but steady)

---

## Fundraiser LIFE Boost

### Fundraiser Participation Bonus

```typescript
function applyFundraiserLifeBoost(
  resident: Resident,
  fundraiserType: FundraiserType
): void {
  const FUNDRAISER_LIFE_BOOST = {
    cookie_sale: 2,
    car_wash: 2,
    craft_fair: 3,
    bake_sale: 2
  };
  
  const boost = FUNDRAISER_LIFE_BOOST[fundraiserType];
  resident.lifeMeter = Math.min(LIFE_METER_CONFIG.MAX, resident.lifeMeter + boost);
  
  console.log(`${resident.name} gained ${boost}% LIFE from fundraiser`);
}
```

**Tradeoff:**
- LIFE meter: +2-3%
- Happiness: -5% (fatigue)

This creates a strategic decision: fundraisers help progression but tire residents.

---

## LIFE Meter Stalling

### Low Reputation/Happiness Stall

```typescript
function checkLifeMeterStall(resident: Resident, gameState: GameState): boolean {
  const reputationMultiplier = gameState.reputation / 100;
  const happinessMultiplier = resident.happiness / 100;
  const effectiveMultiplier = (reputationMultiplier + happinessMultiplier) / 2;
  
  // Stalled if effective multiplier is very low
  const STALL_THRESHOLD = 0.2; // 20%
  
  if (effectiveMultiplier < STALL_THRESHOLD) {
    return true;
  }
  
  return false;
}

function showLifeMeterStallWarning(resident: Resident): void {
  showNotification(
    `⚠️ ${resident.name}'s progress has stalled. Improve shelter conditions!`,
    "warning"
  );
}
```

**Stall Conditions:**
- Reputation below 20% AND happiness below 20%
- Effective multiplier < 0.2
- LIFE meter barely increases

**Recovery:**
- Improve reputation (graduate others, complete fundraisers)
- Improve happiness (better food, common rooms)
- Both factors must improve for good progress

---

## LIFE Meter UI

### Display Format

```typescript
function getLifeMeterDisplay(resident: Resident): {
  percentage: number;
  color: string;
  label: string;
  estimatedDaysToGraduation: number | null;
} {
  const percentage = Math.floor(resident.lifeMeter);
  
  // Color coding
  let color: string;
  if (percentage < 25) color = "#ff4444"; // Red
  else if (percentage < 50) color = "#ff8800"; // Orange
  else if (percentage < 75) color = "#ffcc00"; // Yellow
  else color = "#00cc00"; // Green
  
  // Label
  let label: string;
  if (percentage < 25) label = "Just Starting";
  else if (percentage < 50) label = "Making Progress";
  else if (percentage < 75) label = "Halfway There";
  else if (percentage < 95) label = "Almost Ready";
  else label = "Ready to Graduate!";
  
  // Estimate days to graduation (simplified)
  const remaining = 100 - percentage;
  const estimatedDaysToGraduation = remaining > 0 ? Math.ceil(remaining / 10) : null;
  
  return {
    percentage,
    color,
    label,
    estimatedDaysToGraduation
  };
}
```

### Progress Bar

```typescript
function renderLifeMeterBar(resident: Resident, x: number, y: number): void {
  const width = 50;
  const height = 6;
  const fillWidth = (resident.lifeMeter / 100) * width;
  
  // Background
  drawRect(x, y, width, height, "#333333");
  
  // Fill
  const display = getLifeMeterDisplay(resident);
  drawRect(x, y, fillWidth, height, display.color);
  
  // Border
  drawRectOutline(x, y, width, height, "#ffffff");
  
  // Percentage text
  drawText(`${display.percentage}%`, x + width / 2, y + height / 2, {
    align: "center",
    color: "#ffffff",
    fontSize: 10
  });
}
```

---

## LIFE Meter Statistics

### Tracking

```typescript
interface LifeMeterSnapshot {
  timestamp: number;
  residentId: string;
  lifeMeter: number;
  reputation: number;
  happiness: number;
}

const lifeMeterHistory: LifeMeterSnapshot[] = [];

function recordLifeMeterProgress(resident: Resident, gameState: GameState): void {
  lifeMeterHistory.push({
    timestamp: Date.now(),
    residentId: resident.id,
    lifeMeter: resident.lifeMeter,
    reputation: gameState.reputation,
    happiness: resident.happiness
  });
}

function getAverageProgressRate(residentId: string): number {
  const snapshots = lifeMeterHistory.filter(s => s.residentId === residentId);
  
  if (snapshots.length < 2) return 0;
  
  const first = snapshots[0];
  const last = snapshots[snapshots.length - 1];
  
  const lifeDiff = last.lifeMeter - first.lifeMeter;
  const timeDiff = (last.timestamp - first.timestamp) / 1000; // seconds
  
  return lifeDiff / timeDiff; // % per second
}
```

---

## Integration Notes

### Reputation System Integration
- Reputation directly affects LIFE meter fill rate
- Low reputation stalls progression
- See [`07-Reputation-System.md`](07-Reputation-System.md)

### Resident AI Integration
- Residents seek learning centers when LIFE < 100
- Graduation triggers at LIFE = 100
- See [`06-Resident-AI-System.md`](06-Resident-AI-System.md)

### Room System Integration
- Only Learning Centers and Vocational Rooms fill LIFE meter
- Rooms must be open (day time)
- See [`04-Grid-Building-System.md`](04-Grid-Building-System.md)

### Fundraiser Integration
- Fundraisers provide small LIFE boost
- Creates strategic tradeoff with happiness
- See [`11-Fundraiser-System.md`](11-Fundraiser-System.md)

---

## Balancing Notes

### Graduation Times (Optimal Conditions)

| Profile | Base Time | 50% Conditions | 100% Conditions |
|---------|-----------|----------------|-----------------|
| Young Adult | 33 min | 66 min | 33 min |
| Veteran | 66 min | 132 min | 66 min |
| Elderly | 44 min | 88 min | 44 min |

**Optimal Conditions:** 100% reputation, 100% happiness
**50% Conditions:** 50% reputation, 50% happiness

### Design Goals

- Graduation should feel achievable but not instant
- Player must maintain good shelter conditions
- Veterans are a long-term investment
- Young adults provide quick wins
- Elderly require extra care but graduate at medium pace
