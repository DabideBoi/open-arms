# Data Models

---

## Overview

This document defines all data structures used in the Open Arms game. These TypeScript interfaces serve as the contract between systems and ensure type safety throughout the codebase.

---

## Core Game State

### GameState (Root Object)

```typescript
interface GameState {
  // Meta
  version: string;                    // "1.0.0" - for save migration
  lastSaved: number;                  // Unix timestamp
  lastPlayed: number;                 // Unix timestamp for offline calc
  
  // Core Counters
  money: number;                      // Current funds (can go negative)
  reputation: number;                 // 0-100
  currentDay: number;                 // In-game day counter
  
  // Residents
  residents: Resident[];              // Active residents
  graduatedCount: number;             // All-time graduated counter
  
  // Grid & Building
  grid: Grid;                         // Tile grid state
  rooms: Room[];                      // Placed rooms
  
  // Timers (stored as next trigger time)
  nextDonationCheck: number;          // Unix timestamp
  nextMaintenanceCheck: number;       // Unix timestamp
  nextDayNightTransition: number;     // Unix timestamp
  currentPhase: "day" | "night";      // Current day/night phase
  
  // Settings
  foodPortionSetting: "large" | "standard" | "small" | "none";
  
  // Events
  activeEvents: GameEvent[];          // Currently active events
  eventHistory: EventHistoryEntry[];  // Past events for reference
  
  // Fundraisers
  activeFundraisers: Fundraiser[];    // In-progress fundraisers
}
```

---

## Resident Data Model

### Resident

```typescript
interface Resident {
  id: string;                         // UUID
  name: string;                       // "John Doe"
  profile: ResidentProfile;
  
  // Stats
  happiness: number;                  // 0-100
  lifeMeter: number;                  // 0-100
  
  // State
  currentState: ResidentState;        // AI state machine
  currentNeed: Need | null;           // What they're seeking
  targetRoomId: string | null;        // Where they're going
  path: PathNode[] | null;            // Current pathfinding path
  pathIndex: number;                  // Current position in path
  
  // Position
  gridX: number;                      // Current tile X
  gridY: number;                      // Current tile Y
  
  // History
  arrivalDay: number;                 // Day they arrived
  arrivalReason: string;              // "arrived after a house fire"
  daysInShelter: number;              // Counter
  
  // Timers
  lastHappinessUpdate: number;        // Unix timestamp
  lastNeedCheck: number;              // Unix timestamp
  lastLifeUpdate: number;             // Unix timestamp
}
```

### Resident Enums

```typescript
type ResidentProfile = 
  | "young_adult"
  | "veteran"
  | "elderly";

type ResidentState = 
  | "idle"
  | "seeking_need"
  | "pathfinding"
  | "in_use"
  | "satisfied"
  | "sleeping";

type Need = 
  | "food"
  | "bathroom"
  | "learning"
  | "social"
  | "sleep";
```

### PathNode

```typescript
interface PathNode {
  x: number;
  y: number;
}
```

---

## Grid Data Model

### Grid

```typescript
interface Grid {
  width: number;                      // Grid width in tiles
  height: number;                     // Grid height in tiles
  tiles: Tile[][];                    // 2D array of tiles
  unlockedArea: UnlockedArea;         // Buildable area
}
```

### UnlockedArea

```typescript
interface UnlockedArea {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
```

### Tile

```typescript
interface Tile {
  x: number;
  y: number;
  type: TileType;
  occupiedBy: string | null;          // Room ID if occupied
  walkable: boolean;                  // For pathfinding
}

type TileType = 
  | "empty"           // Buildable space
  | "locked"          // Not yet unlocked
  | "hallway"         // Walkable connector
  | "room"            // Part of a room
  | "entrance";       // Entry/exit point
```

---

## Room Data Model

### Room

```typescript
interface Room {
  id: string;                         // UUID
  type: RoomType;
  
  // Grid placement
  gridX: number;                      // Top-left corner X
  gridY: number;                      // Top-left corner Y
  width: number;                      // In tiles
  height: number;                     // In tiles
  
  // State
  isOpen: boolean;                    // Affected by day/night
  currentOccupancy: number;           // Current residents using it
  
  // Costs
  buildCost: number;                  // One-time cost (already paid)
  maintenanceCost: number;            // Per maintenance cycle
  lastMaintenancePaid: number;        // Unix timestamp
}
```

### Room Enums

```typescript
type RoomType = 
  | "dormitory"
  | "cafeteria"
  | "learning_center"
  | "vocational_room"
  | "bathroom"
  | "admin_office"
  | "common_room"
  | "fundraiser_station";
```

### RoomSpec (Configuration Data)

```typescript
interface RoomSpec {
  type: RoomType;
  width: number;                      // Grid tiles
  height: number;                     // Grid tiles
  buildCost: number;
  maintenanceCost: number;            // Per 15min cycle
  capacity: number;                   // Max residents (0 = unlimited)
  closesAtNight: boolean;
  needsSatisfied: Need[];             // Which needs this room fulfills
}
```

---

## Event Data Model

### GameEvent

```typescript
interface GameEvent {
  id: string;                         // UUID
  type: EventType;
  title: string;
  description: string;
  
  // Timing
  triggeredAt: number;                // Unix timestamp
  expiresAt: number | null;           // Unix timestamp or null if no expiry
  
  // Options
  options: EventOption[];
  resolved: boolean;
}
```

### Event Enums

```typescript
type EventType = 
  | "natural_disaster"
  | "donation_drive"
  | "health_outbreak"
  | "media_coverage"
  | "volunteer_day";
```

### EventOption

```typescript
interface EventOption {
  label: string;                      // "Accept refugees"
  effects: EventEffect[];
}
```

### EventEffect

```typescript
interface EventEffect {
  type: EffectType;
  value: number;
  duration?: number;                  // For temporary effects (minutes)
}

type EffectType = 
  | "money"
  | "reputation"
  | "add_residents"
  | "happiness_modifier"
  | "maintenance_discount";
```

### EventHistoryEntry

```typescript
interface EventHistoryEntry {
  eventType: EventType;
  day: number;
  chosenOption: string;
}
```

---

## Fundraiser Data Model

### Fundraiser

```typescript
interface Fundraiser {
  id: string;                         // UUID
  type: FundraiserType;
  
  // Timing
  startedAt: number;                  // Unix timestamp
  duration: number;                   // Minutes
  completesAt: number;                // Unix timestamp
  
  // Participants
  assignedResidents: string[];        // Resident IDs
  
  // Payout (calculated at start)
  expectedPayout: number;
}
```

### Fundraiser Enums

```typescript
type FundraiserType = 
  | "cookie_sale"
  | "car_wash"
  | "craft_fair"
  | "bake_sale";
```

### FundraiserSpec (Configuration Data)

```typescript
interface FundraiserSpec {
  type: FundraiserType;
  basePayout: number;                 // Base amount
  duration: number;                   // Minutes
  perResidentMultiplier: number;      // Multiplier per assigned resident
  lifeBoost: number;                  // LIFE meter increase per participant
  happinessCost: number;              // Happiness decrease per participant
}
```

---

## Notification Data Model

### Notification

```typescript
interface Notification {
  id: string;                         // UUID
  type: NotificationType;
  message: string;
  timestamp: number;                  // Unix timestamp
  duration: number;                   // Display duration in ms
}

type NotificationType = 
  | "success"       // Green - positive events
  | "warning"       // Yellow - caution
  | "error"         // Red - negative events
  | "info";         // Blue - neutral info
```

---

## Profile Specifications (Configuration Data)

### ResidentProfileSpec

```typescript
interface ResidentProfileSpec {
  profile: ResidentProfile;
  lifeFillRate: number;               // Base fill rate per second
  happinessDecayRate: number;         // Decay per day
  fundraiserEfficiency: number;       // Multiplier for fundraiser contribution
  graduationBonus: number;            // Extra reputation on graduation
  displayName: string;
  icon: string;                       // Emoji or icon identifier
}
```

---

## Data Validation

### Type Guards

```typescript
function isValidResident(obj: any): obj is Resident {
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.happiness === 'number' &&
    obj.happiness >= 0 && obj.happiness <= 100 &&
    typeof obj.lifeMeter === 'number' &&
    obj.lifeMeter >= 0 && obj.lifeMeter <= 100
  );
}

function isValidGameState(obj: any): obj is GameState {
  return (
    typeof obj.version === 'string' &&
    typeof obj.money === 'number' &&
    typeof obj.reputation === 'number' &&
    obj.reputation >= 0 && obj.reputation <= 100 &&
    Array.isArray(obj.residents) &&
    obj.residents.every(isValidResident)
  );
}
```

---

## Default Values

### Default GameState

```typescript
const DEFAULT_GAME_STATE: GameState = {
  version: "1.0.0",
  lastSaved: Date.now(),
  lastPlayed: Date.now(),
  money: 1000,
  reputation: 50,
  currentDay: 1,
  residents: [],
  graduatedCount: 0,
  grid: createDefaultGrid(),
  rooms: [],
  nextDonationCheck: Date.now() + (5 * 60 * 1000),
  nextMaintenanceCheck: Date.now() + (15 * 60 * 1000),
  nextDayNightTransition: Date.now() + (8 * 60 * 1000),
  currentPhase: "day",
  foodPortionSetting: "standard",
  activeEvents: [],
  eventHistory: [],
  activeFundraisers: []
};
```

### Default Resident

```typescript
function createDefaultResident(name: string, profile: ResidentProfile): Resident {
  return {
    id: generateUUID(),
    name,
    profile,
    happiness: 50,
    lifeMeter: Math.floor(Math.random() * 16) + 10, // 10-25
    currentState: "idle",
    currentNeed: null,
    targetRoomId: null,
    path: null,
    pathIndex: 0,
    gridX: 0,
    gridY: 0,
    arrivalDay: 1,
    arrivalReason: "arrived seeking shelter",
    daysInShelter: 0,
    lastHappinessUpdate: Date.now(),
    lastNeedCheck: Date.now(),
    lastLifeUpdate: Date.now()
  };
}
```

---

## Serialization Notes

### localStorage Format

All data is stored as JSON in localStorage under the key `"openArmsGameState"`.

**Example:**
```json
{
  "version": "1.0.0",
  "money": 5000,
  "reputation": 65,
  "residents": [
    {
      "id": "abc-123",
      "name": "John Doe",
      "profile": "young_adult",
      "happiness": 75,
      "lifeMeter": 45
    }
  ]
}
```

### Serialization Considerations

- **Dates**: Store as Unix timestamps (numbers)
- **Enums**: Store as strings
- **Arrays**: Serialize directly
- **Nested Objects**: Flatten where possible for easier migration
- **Circular References**: Avoid (use IDs instead of object references)

See [`16-Save-Load-System.md`](16-Save-Load-System.md) for complete serialization implementation.
