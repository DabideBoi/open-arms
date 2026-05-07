# Fundraiser System

---

## Overview

The Fundraiser System allows residents to participate in timed fundraising activities. Fundraisers generate income, boost LIFE meters slightly, but reduce happiness due to fatigue. The system is fully timer-based with no mini-games.

---

## Fundraiser Configuration

### Fundraiser Types

```typescript
const FUNDRAISER_SPECS: Record<FundraiserType, FundraiserSpec> = {
  cookie_sale: {
    type: "cookie_sale",
    basePayout: 200,
    duration: 15,                    // minutes
    perResidentMultiplier: 1.5,
    lifeBoost: 2,
    happinessCost: 5
  },
  
  car_wash: {
    type: "car_wash",
    basePayout: 300,
    duration: 20,
    perResidentMultiplier: 2.0,
    lifeBoost: 2,
    happinessCost: 5
  },
  
  craft_fair: {
    type: "craft_fair",
    basePayout: 400,
    duration: 30,
    perResidentMultiplier: 1.8,
    lifeBoost: 3,
    happinessCost: 5
  },
  
  bake_sale: {
    type: "bake_sale",
    basePayout: 250,
    duration: 18,
    perResidentMultiplier: 1.6,
    lifeBoost: 2,
    happinessCost: 5
  }
};

type FundraiserType = "cookie_sale" | "car_wash" | "craft_fair" | "bake_sale";
```

---

## Starting a Fundraiser

### Start Fundraiser

```typescript
function startFundraiser(
  gameState: GameState,
  fundraiserType: FundraiserType,
  residentIds: string[]
): { success: boolean; error?: string; fundraiser?: Fundraiser } {
  
  // Validate residents
  if (residentIds.length === 0) {
    return { success: false, error: "No residents assigned" };
  }
  
  // Check if residents exist and are available
  for (const residentId of residentIds) {
    const resident = gameState.residents.find(r => r.id === residentId);
    
    if (!resident) {
      return { success: false, error: `Resident ${residentId} not found` };
    }
    
    // Check if already in a fundraiser
    const alreadyAssigned = gameState.activeFundraisers.some(
      f => f.assignedResidents.includes(residentId)
    );
    
    if (alreadyAssigned) {
      return { success: false, error: `${resident.name} is already in a fundraiser` };
    }
  }
  
  // Check if fundraiser station is available
  const fundraiserStations = gameState.rooms.filter(
    r => r.type === "fundraiser_station" && r.isOpen
  );
  
  if (fundraiserStations.length === 0) {
    return { success: false, error: "No fundraiser station available" };
  }
  
  // Check capacity
  const station = fundraiserStations[0];
  const capacity = ROOM_SPECS.fundraiser_station.capacity;
  
  if (residentIds.length > capacity) {
    return { success: false, error: `Maximum ${capacity} residents per fundraiser` };
  }
  
  // Calculate expected payout
  const spec = FUNDRAISER_SPECS[fundraiserType];
  const expectedPayout = calculateFundraiserPayout(
    spec,
    residentIds.length,
    gameState.reputation,
    gameState.residents.filter(r => residentIds.includes(r.id))
  );
  
  // Create fundraiser
  const now = Date.now();
  const fundraiser: Fundraiser = {
    id: generateUUID(),
    type: fundraiserType,
    startedAt: now,
    duration: spec.duration,
    completesAt: now + (spec.duration * 60 * 1000),
    assignedResidents: [...residentIds],
    expectedPayout
  };
  
  // Add to active fundraisers
  gameState.activeFundraisers.push(fundraiser);
  
  // Update resident states
  for (const residentId of residentIds) {
    const resident = gameState.residents.find(r => r.id === residentId);
    if (resident) {
      resident.currentState = "in_use";
      resident.targetRoomId = station.id;
    }
  }
  
  showNotification(
    `🎪 ${spec.type.replace('_', ' ')} started! Expected: $${expectedPayout}`,
    "success"
  );
  
  return { success: true, fundraiser };
}
```

---

## Payout Calculation

### Formula

```
Payout = BasePayout × ResidentMultiplier × ReputationModifier × ProfileEfficiency

Where:
- BasePayout = Fundraiser type base amount
- ResidentMultiplier = PerResidentMultiplier ^ ResidentCount
- ReputationModifier = 0.5 + (Reputation / 100)
- ProfileEfficiency = Average of all assigned residents' efficiency
```

### Implementation

```typescript
function calculateFundraiserPayout(
  spec: FundraiserSpec,
  residentCount: number,
  reputation: number,
  residents: Resident[]
): number {
  // Base payout
  const basePayout = spec.basePayout;
  
  // Resident multiplier (exponential with count)
  const residentMultiplier = Math.pow(spec.perResidentMultiplier, residentCount);
  
  // Reputation modifier
  const reputationModifier = 0.5 + (reputation / 100);
  
  // Profile efficiency (average of all residents)
  const profileEfficiencies = residents.map(r => 
    PROFILE_SPECS[r.profile].fundraiserEfficiency
  );
  const avgEfficiency = profileEfficiencies.reduce((sum, e) => sum + e, 0) / profileEfficiencies.length;
  
  // Calculate final payout
  const payout = Math.floor(
    basePayout * residentMultiplier * reputationModifier * avgEfficiency
  );
  
  return payout;
}
```

### Example Calculations

```typescript
// Example 1: Cookie Sale, 2 young adults, 50% reputation
// Base: 200
// Resident: 1.5^2 = 2.25
// Reputation: 0.5 + 0.5 = 1.0
// Efficiency: 1.2 (young adult bonus)
// Result: 200 × 2.25 × 1.0 × 1.2 = $540

// Example 2: Car Wash, 4 mixed residents, 75% reputation
// Base: 300
// Resident: 2.0^4 = 16
// Reputation: 0.5 + 0.75 = 1.25
// Efficiency: ~1.0 (mixed)
// Result: 300 × 16 × 1.25 × 1.0 = $6,000

// Example 3: Craft Fair, 3 veterans, 90% reputation
// Base: 400
// Resident: 1.8^3 = 5.832
// Reputation: 0.5 + 0.9 = 1.4
// Efficiency: 1.0 (veteran normal)
// Result: 400 × 5.832 × 1.4 × 1.0 = $3,266
```

---

## Completing a Fundraiser

### Check for Completion

```typescript
function checkFundraiserCompletion(gameState: GameState): void {
  const now = Date.now();
  
  for (let i = gameState.activeFundraisers.length - 1; i >= 0; i--) {
    const fundraiser = gameState.activeFundraisers[i];
    
    if (now >= fundraiser.completesAt) {
      completeFundraiser(fundraiser, gameState);
      gameState.activeFundraisers.splice(i, 1);
    }
  }
}
```

### Complete Fundraiser

```typescript
function completeFundraiser(fundraiser: Fundraiser, gameState: GameState): void {
  const spec = FUNDRAISER_SPECS[fundraiser.type];
  
  // Award payout
  gameState.money += fundraiser.expectedPayout;
  
  // Reputation boost
  modifyReputation(gameState, 2, "Fundraiser completed");
  
  // Apply effects to participants
  for (const residentId of fundraiser.assignedResidents) {
    const resident = gameState.residents.find(r => r.id === residentId);
    
    if (resident) {
      // LIFE meter boost
      resident.lifeMeter = Math.min(100, resident.lifeMeter + spec.lifeBoost);
      
      // Happiness cost (fatigue)
      resident.happiness = Math.max(0, resident.happiness - spec.happinessCost);
      
      // Reset state
      resident.currentState = "satisfied";
      resident.targetRoomId = null;
    }
  }
  
  // Notification
  showNotification(
    `✅ ${spec.type.replace('_', ' ')} completed! Earned $${fundraiser.expectedPayout}`,
    "success"
  );
  
  console.log(`Fundraiser completed: ${fundraiser.type}, $${fundraiser.expectedPayout}`);
}
```

---

## Canceling a Fundraiser

### Cancel Fundraiser

```typescript
function cancelFundraiser(
  gameState: GameState,
  fundraiserId: string
): { success: boolean; error?: string } {
  
  const index = gameState.activeFundraisers.findIndex(f => f.id === fundraiserId);
  
  if (index === -1) {
    return { success: false, error: "Fundraiser not found" };
  }
  
  const fundraiser = gameState.activeFundraisers[index];
  
  // Release residents
  for (const residentId of fundraiser.assignedResidents) {
    const resident = gameState.residents.find(r => r.id === residentId);
    
    if (resident) {
      resident.currentState = "idle";
      resident.targetRoomId = null;
    }
  }
  
  // Remove fundraiser
  gameState.activeFundraisers.splice(index, 1);
  
  showNotification("Fundraiser canceled", "warning");
  
  return { success: true };
}
```

---

## Fundraiser UI

### Fundraiser Display

```typescript
function getFundraiserDisplay(fundraiserType: FundraiserType): {
  name: string;
  icon: string;
  description: string;
  duration: number;
  basePayout: number;
} {
  const displays = {
    cookie_sale: {
      name: "Cookie Sale",
      icon: "🍪",
      description: "Sell homemade cookies to the community",
      duration: 15,
      basePayout: 200
    },
    car_wash: {
      name: "Car Wash",
      icon: "🚗",
      description: "Wash cars for donations",
      duration: 20,
      basePayout: 300
    },
    craft_fair: {
      name: "Craft Fair",
      icon: "🎨",
      description: "Sell handmade crafts and artwork",
      duration: 30,
      basePayout: 400
    },
    bake_sale: {
      name: "Bake Sale",
      icon: "🧁",
      description: "Bake and sell treats",
      duration: 18,
      basePayout: 250
    }
  };
  
  return displays[fundraiserType];
}
```

### Time Remaining Display

```typescript
function getFundraiserTimeRemaining(fundraiser: Fundraiser): string {
  const now = Date.now();
  const remaining = fundraiser.completesAt - now;
  
  if (remaining <= 0) return "Completing...";
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

### Progress Bar

```typescript
function getFundraiserProgress(fundraiser: Fundraiser): number {
  const now = Date.now();
  const elapsed = now - fundraiser.startedAt;
  const total = fundraiser.completesAt - fundraiser.startedAt;
  
  return Math.min(100, (elapsed / total) * 100);
}
```

---

## Fundraiser Strategy

### Optimal Resident Selection

```typescript
function getOptimalResidentsForFundraiser(
  gameState: GameState,
  fundraiserType: FundraiserType,
  count: number
): Resident[] {
  // Prioritize young adults (highest efficiency)
  const available = gameState.residents.filter(r => {
    // Not already in a fundraiser
    const inFundraiser = gameState.activeFundraisers.some(
      f => f.assignedResidents.includes(r.id)
    );
    
    // Not in critical state
    const healthy = r.happiness > 30 && r.lifeMeter < 90;
    
    return !inFundraiser && healthy;
  });
  
  // Sort by fundraiser efficiency
  available.sort((a, b) => {
    const effA = PROFILE_SPECS[a.profile].fundraiserEfficiency;
    const effB = PROFILE_SPECS[b.profile].fundraiserEfficiency;
    return effB - effA;
  });
  
  return available.slice(0, count);
}
```

### Fundraiser Recommendations

```typescript
function getFundraiserRecommendation(gameState: GameState): {
  type: FundraiserType;
  residents: Resident[];
  expectedPayout: number;
  reason: string;
} | null {
  
  // Check if fundraiser station available
  const hasStation = gameState.rooms.some(
    r => r.type === "fundraiser_station" && r.isOpen
  );
  
  if (!hasStation) return null;
  
  // Get available residents
  const available = getOptimalResidentsForFundraiser(gameState, "cookie_sale", 4);
  
  if (available.length === 0) return null;
  
  // Recommend based on time available and resident count
  let recommendedType: FundraiserType;
  
  if (available.length >= 4) {
    recommendedType = "car_wash"; // Best payout with 4 residents
  } else if (available.length >= 3) {
    recommendedType = "craft_fair"; // Good for 3 residents
  } else {
    recommendedType = "cookie_sale"; // Quick and easy
  }
  
  const spec = FUNDRAISER_SPECS[recommendedType];
  const expectedPayout = calculateFundraiserPayout(
    spec,
    available.length,
    gameState.reputation,
    available
  );
  
  return {
    type: recommendedType,
    residents: available,
    expectedPayout,
    reason: `${available.length} residents available, ${spec.duration} minutes`
  };
}
```

---

## Fundraiser Balancing

### Payout Comparison

| Type | Duration | Base | 1 Resident | 2 Residents | 4 Residents |
|------|----------|------|------------|-------------|-------------|
| Cookie Sale | 15 min | $200 | ~$240 | ~$540 | ~$1,215 |
| Car Wash | 20 min | $300 | ~$600 | ~$1,200 | ~$4,800 |
| Craft Fair | 30 min | $400 | ~$720 | ~$1,296 | ~$3,732 |
| Bake Sale | 18 min | $250 | ~$400 | ~$640 | ~$1,638 |

*Assumes 50% reputation, young adult residents (1.2x efficiency)*

### Strategic Considerations

**Cookie Sale:**
- Shortest duration (15 min)
- Good for quick income
- Best when few residents available

**Car Wash:**
- Best scaling with multiple residents
- Highest payout potential
- Requires 20 minutes

**Craft Fair:**
- Longest duration (30 min)
- Highest LIFE boost (+3%)
- Good for overnight/AFK

**Bake Sale:**
- Balanced option
- Medium duration and payout
- Reliable choice

---

## Integration Notes

### Day/Night Cycle Integration
- Fundraiser stations close at night
- Active fundraisers continue through night
- Cannot start new fundraisers at night
- See [`14-Day-Night-Cycle.md`](14-Day-Night-Cycle.md)

### Reputation System Integration
- Completed fundraisers boost reputation (+2)
- Reputation affects payout amounts
- See [`07-Reputation-System.md`](07-Reputation-System.md)

### LIFE Meter Integration
- Fundraisers boost LIFE meter (+2-3%)
- Provides alternative progression path
- See [`10-LIFE-Meter-System.md`](10-LIFE-Meter-System.md)

### Resident AI Integration
- Residents are marked "in_use" during fundraisers
- Cannot satisfy other needs while fundraising
- Happiness cost applied on completion
- See [`06-Resident-AI-System.md`](06-Resident-AI-System.md)

---

## Fundraiser Events

### Matching Grant Event

```typescript
function triggerMatchingGrantEvent(gameState: GameState): void {
  // Next fundraiser payout is doubled
  const event: GameEvent = {
    id: generateUUID(),
    type: "donation_drive",
    title: "Matching Grant",
    description: "A donor will match your next fundraiser payout!",
    triggeredAt: Date.now(),
    expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour
    options: [
      {
        label: "Accept",
        effects: []
      }
    ],
    resolved: false
  };
  
  gameState.activeEvents.push(event);
}
```

### Community Support Event

```typescript
function triggerCommunitySupportEvent(gameState: GameState): void {
  // Fundraiser duration reduced by 50%
  const event: GameEvent = {
    id: generateUUID(),
    type: "volunteer_day",
    title: "Community Support",
    description: "Volunteers will help with fundraisers, reducing time by 50%!",
    triggeredAt: Date.now(),
    expiresAt: Date.now() + (2 * 60 * 60 * 1000), // 2 hours
    options: [
      {
        label: "Accept",
        effects: [
          { type: "reputation", value: 3 }
        ]
      }
    ],
    resolved: false
  };
  
  gameState.activeEvents.push(event);
}
```
