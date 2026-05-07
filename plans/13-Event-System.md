# Event System

---

## Overview

The Event System generates random events that require player decisions. Events can add residents, modify resources, affect reputation, or create temporary conditions. Events fire periodically and present choices with consequences.

---

## Event Configuration

### Event Types

```typescript
type EventType = 
  | "natural_disaster"
  | "donation_drive"
  | "health_outbreak"
  | "media_coverage"
  | "volunteer_day";
```

### Event Scheduling

```typescript
const EVENT_CONFIG = {
  MIN_INTERVAL: 10 * 60 * 1000,      // 10 minutes minimum between events
  MAX_INTERVAL: 30 * 60 * 1000,      // 30 minutes maximum between events
  MAX_ACTIVE_EVENTS: 3               // Maximum simultaneous events
};
```

---

## Event Definitions

### Natural Disaster Event

```typescript
const NATURAL_DISASTER_EVENT = {
  type: "natural_disaster" as const,
  title: "Natural Disaster",
  descriptions: [
    "A house fire has left {count} people homeless.",
    "A flood has displaced {count} families.",
    "An earthquake destroyed {count} homes."
  ],
  
  generateOptions: (gameState: GameState) => {
    const refugeeCount = Math.floor(Math.random() * 5) + 3; // 3-7 refugees
    
    return [
      {
        label: `Accept ${refugeeCount} refugees`,
        effects: [
          { type: "add_residents", value: refugeeCount },
          { type: "reputation", value: 3 }
        ]
      },
      {
        label: "Turn them away",
        effects: [
          { type: "reputation", value: -5 }
        ]
      }
    ];
  }
};
```

### Donation Drive Event

```typescript
const DONATION_DRIVE_EVENT = {
  type: "donation_drive" as const,
  title: "Community Donation Drive",
  descriptions: [
    "A local organization is hosting a donation drive for shelters.",
    "The community wants to support homeless services.",
    "A charity is collecting donations for your shelter."
  ],
  
  generateOptions: (gameState: GameState) => {
    const bonusAmount = Math.floor(gameState.residents.length * 100);
    
    return [
      {
        label: "Participate in drive",
        effects: [
          { type: "money", value: bonusAmount },
          { type: "reputation", value: 2 }
        ]
      },
      {
        label: "Decline",
        effects: []
      }
    ];
  }
};
```

### Health Outbreak Event

```typescript
const HEALTH_OUTBREAK_EVENT = {
  type: "health_outbreak" as const,
  title: "Health Outbreak",
  descriptions: [
    "A flu outbreak is spreading through the shelter.",
    "Several residents have fallen ill.",
    "A contagious illness is affecting residents."
  ],
  
  generateOptions: (gameState: GameState) => {
    const treatmentCost = gameState.residents.length * 20;
    
    return [
      {
        label: `Provide treatment ($${treatmentCost})`,
        effects: [
          { type: "money", value: -treatmentCost },
          { type: "reputation", value: 2 }
        ]
      },
      {
        label: "Quarantine only (free)",
        effects: [
          { type: "happiness_modifier", value: -10, duration: 30 }
        ]
      },
      {
        label: "Ignore",
        effects: [
          { type: "reputation", value: -3 },
          { type: "happiness_modifier", value: -15, duration: 60 }
        ]
      }
    ];
  }
};
```

### Media Coverage Event

```typescript
const MEDIA_COVERAGE_EVENT = {
  type: "media_coverage" as const,
  title: "Media Coverage",
  descriptions: [
    "A news crew wants to feature your shelter.",
    "A journalist is writing a story about your work.",
    "Local media is interested in your shelter."
  ],
  
  generateOptions: (gameState: GameState) => {
    // Outcome depends on current reputation
    const isPositive = gameState.reputation >= 60;
    
    return [
      {
        label: "Allow coverage",
        effects: isPositive ? [
          { type: "reputation", value: 10 },
          { type: "money", value: 500 }
        ] : [
          { type: "reputation", value: -8 }
        ]
      },
      {
        label: "Decline",
        effects: [
          { type: "reputation", value: -2 }
        ]
      }
    ];
  }
};
```

### Volunteer Day Event

```typescript
const VOLUNTEER_DAY_EVENT = {
  type: "volunteer_day" as const,
  title: "Volunteer Day",
  descriptions: [
    "A group of volunteers wants to help at the shelter.",
    "Community members are offering their time.",
    "Local volunteers are available to assist."
  ],
  
  generateOptions: (gameState: GameState) => {
    return [
      {
        label: "Accept volunteers",
        effects: [
          { type: "maintenance_discount", value: 100, duration: 60 }, // 100% discount for 1 hour
          { type: "reputation", value: 3 }
        ]
      },
      {
        label: "Decline",
        effects: []
      }
    ];
  }
};
```

---

## Event Generation

### Schedule Next Event

```typescript
function scheduleNextEvent(gameState: GameState): void {
  // Random interval between min and max
  const interval = EVENT_CONFIG.MIN_INTERVAL + 
    Math.random() * (EVENT_CONFIG.MAX_INTERVAL - EVENT_CONFIG.MIN_INTERVAL);
  
  setTimeout(() => {
    triggerRandomEvent(gameState);
  }, interval);
}
```

### Trigger Random Event

```typescript
function triggerRandomEvent(gameState: GameState): void {
  // Check if too many active events
  if (gameState.activeEvents.length >= EVENT_CONFIG.MAX_ACTIVE_EVENTS) {
    console.log("Too many active events, skipping");
    scheduleNextEvent(gameState);
    return;
  }
  
  // Select random event type
  const eventTemplates = [
    NATURAL_DISASTER_EVENT,
    DONATION_DRIVE_EVENT,
    HEALTH_OUTBREAK_EVENT,
    MEDIA_COVERAGE_EVENT,
    VOLUNTEER_DAY_EVENT
  ];
  
  const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
  
  // Generate event
  const event = generateEvent(template, gameState);
  
  // Add to active events
  gameState.activeEvents.push(event);
  
  // Notify UI
  showEventModal(event);
  
  // Schedule next event
  scheduleNextEvent(gameState);
}
```

### Generate Event

```typescript
function generateEvent(
  template: EventTemplate,
  gameState: GameState
): GameEvent {
  // Select random description
  const description = template.descriptions[
    Math.floor(Math.random() * template.descriptions.length)
  ];
  
  // Generate options
  const options = template.generateOptions(gameState);
  
  return {
    id: generateUUID(),
    type: template.type,
    title: template.title,
    description,
    triggeredAt: Date.now(),
    expiresAt: Date.now() + (10 * 60 * 1000), // 10 minutes to respond
    options,
    resolved: false
  };
}
```

---

## Event Resolution

### Resolve Event

```typescript
function resolveEvent(
  gameState: GameState,
  eventId: string,
  optionIndex: number
): { success: boolean; error?: string } {
  
  const event = gameState.activeEvents.find(e => e.id === eventId);
  
  if (!event) {
    return { success: false, error: "Event not found" };
  }
  
  if (event.resolved) {
    return { success: false, error: "Event already resolved" };
  }
  
  const option = event.options[optionIndex];
  
  if (!option) {
    return { success: false, error: "Invalid option" };
  }
  
  // Apply effects
  for (const effect of option.effects) {
    applyEventEffect(gameState, effect);
  }
  
  // Mark as resolved
  event.resolved = true;
  
  // Add to history
  gameState.eventHistory.push({
    eventType: event.type,
    day: gameState.currentDay,
    chosenOption: option.label
  });
  
  // Remove from active events
  const index = gameState.activeEvents.indexOf(event);
  gameState.activeEvents.splice(index, 1);
  
  console.log(`Event resolved: ${event.title} - ${option.label}`);
  
  return { success: true };
}
```

### Apply Event Effect

```typescript
function applyEventEffect(gameState: GameState, effect: EventEffect): void {
  switch (effect.type) {
    case "money":
      gameState.money += effect.value;
      showNotification(
        `${effect.value > 0 ? '+' : ''}$${effect.value}`,
        effect.value > 0 ? "success" : "warning"
      );
      break;
    
    case "reputation":
      modifyReputation(gameState, effect.value, "Event choice");
      break;
    
    case "add_residents":
      addResidentsFromEvent(gameState, effect.value);
      break;
    
    case "happiness_modifier":
      applyHappinessModifier(gameState, effect.value, effect.duration);
      break;
    
    case "maintenance_discount":
      applyMaintenanceDiscount(gameState, effect.value, effect.duration);
      break;
  }
}
```

### Add Residents from Event

```typescript
function addResidentsFromEvent(gameState: GameState, count: number): void {
  for (let i = 0; i < count; i++) {
    const name = generateRandomName();
    const profile = generateRandomProfile();
    const resident = createResident(
      name,
      profile,
      "arrived from disaster event"
    );
    
    resident.arrivalDay = gameState.currentDay;
    gameState.residents.push(resident);
  }
  
  showNotification(
    `${count} new residents arrived`,
    "info"
  );
}
```

---

## Event Expiration

### Check Expired Events

```typescript
function checkExpiredEvents(gameState: GameState): void {
  const now = Date.now();
  
  for (let i = gameState.activeEvents.length - 1; i >= 0; i--) {
    const event = gameState.activeEvents[i];
    
    if (event.expiresAt && now >= event.expiresAt && !event.resolved) {
      // Event expired without response
      handleExpiredEvent(gameState, event);
      gameState.activeEvents.splice(i, 1);
    }
  }
}

function handleExpiredEvent(gameState: GameState, event: GameEvent): void {
  // Apply default consequence (usually negative)
  modifyReputation(gameState, -2, `Ignored ${event.title}`);
  
  showNotification(
    `⚠️ Event expired: ${event.title}`,
    "warning"
  );
  
  // Add to history
  gameState.eventHistory.push({
    eventType: event.type,
    day: gameState.currentDay,
    chosenOption: "Ignored"
  });
}
```

---

## Event Probability

### Weighted Event Selection

```typescript
function selectWeightedEvent(gameState: GameState): EventTemplate {
  // Adjust probabilities based on game state
  const weights = {
    natural_disaster: 0.2,
    donation_drive: 0.3,
    health_outbreak: 0.15,
    media_coverage: 0.2,
    volunteer_day: 0.15
  };
  
  // Increase disaster chance if reputation is high (can handle it)
  if (gameState.reputation > 70) {
    weights.natural_disaster = 0.3;
  }
  
  // Increase donation drive chance if money is low
  if (gameState.money < 500) {
    weights.donation_drive = 0.4;
  }
  
  // Select based on weights
  const roll = Math.random();
  let cumulative = 0;
  
  const eventTemplates = [
    { template: NATURAL_DISASTER_EVENT, weight: weights.natural_disaster },
    { template: DONATION_DRIVE_EVENT, weight: weights.donation_drive },
    { template: HEALTH_OUTBREAK_EVENT, weight: weights.health_outbreak },
    { template: MEDIA_COVERAGE_EVENT, weight: weights.media_coverage },
    { template: VOLUNTEER_DAY_EVENT, weight: weights.volunteer_day }
  ];
  
  for (const { template, weight } of eventTemplates) {
    cumulative += weight;
    if (roll < cumulative) {
      return template;
    }
  }
  
  return DONATION_DRIVE_EVENT; // Fallback
}
```

---

## Event UI

### Event Modal

```typescript
function showEventModal(event: GameEvent): void {
  // Display modal with:
  // - Event title
  // - Event description
  // - Options with effects preview
  // - Time remaining
  
  emitGameEvent("event_triggered", event);
}

function getEventTimeRemaining(event: GameEvent): string {
  if (!event.expiresAt) return "No time limit";
  
  const remaining = event.expiresAt - Date.now();
  
  if (remaining <= 0) return "Expired";
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

### Event History Display

```typescript
function getEventHistoryDisplay(gameState: GameState): string[] {
  return gameState.eventHistory.map(entry => 
    `Day ${entry.day}: ${entry.eventType} - ${entry.chosenOption}`
  );
}
```

---

## Special Event Conditions

### Disaster Resident Tracking

```typescript
// Disaster residents don't count toward donation multiplier
// This prevents gaming the system by accepting disasters for income

interface Resident {
  // ... existing properties
  isDisasterResident: boolean;
}

function calculateDonationAmount(gameState: GameState): number {
  // Only count non-disaster residents
  const regularResidents = gameState.residents.filter(r => !r.isDisasterResident);
  const baseAmount = regularResidents.length * 50;
  
  // ... rest of calculation
}
```

---

## Event Balancing

### Event Frequency

- Minimum 10 minutes between events
- Maximum 30 minutes between events
- Average: ~20 minutes per event
- ~3 events per hour

### Event Impact

| Event Type | Frequency | Impact | Risk/Reward |
|------------|-----------|--------|-------------|
| Natural Disaster | 20-30% | High | High risk, high reputation reward |
| Donation Drive | 30-40% | Medium | Low risk, moderate reward |
| Health Outbreak | 15% | Medium | Moderate cost, reputation at stake |
| Media Coverage | 20% | High | High risk/reward based on reputation |
| Volunteer Day | 15% | Low | Low risk, helpful bonus |

---

## Integration Notes

### Reputation System Integration
- Most events affect reputation
- Player choices have consequences
- See [`07-Reputation-System.md`](07-Reputation-System.md)

### Resident System Integration
- Disaster events add new residents
- Health events affect happiness
- See [`06-Resident-AI-System.md`](06-Resident-AI-System.md)

### Economy Integration
- Events can provide income or costs
- Donation drives boost funds
- See [`08-Donation-System.md`](08-Donation-System.md)

### UI Integration
- Events trigger modal dialogs
- Show time remaining
- Display effect previews
- Track event history

---

## Future Event Ideas

### Potential Additional Events

1. **Government Inspection**
   - Pass/fail based on reputation and conditions
   - Reward: Grant money
   - Failure: Temporary closure threat

2. **Celebrity Visit**
   - Boosts reputation and donations
   - Requires high reputation to trigger

3. **Supply Shortage**
   - Increased costs for food/maintenance
   - Duration-based effect

4. **Resident Success Story**
   - Graduate returns to donate
   - Boosts morale and funds

5. **Neighboring Shelter Closure**
   - Influx of residents
   - Opportunity to expand influence
