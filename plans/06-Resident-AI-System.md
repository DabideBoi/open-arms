# Resident AI System

---

## Overview

The Resident AI System manages autonomous resident behavior through a state machine, need detection, and decision-making logic. Residents pathfind to satisfy needs, interact with rooms, and respond to shelter conditions.

---

## Resident State Machine

### State Diagram

```
┌──────┐
│ IDLE │ ←──────────────────────────┐
└───┬──┘                             │
    │ (need detected)                │
    ↓                                │
┌─────────────┐                      │
│SEEKING_NEED │                      │
└──────┬──────┘                      │
       │ (room found)                │
       ↓                             │
┌─────────────┐                      │
│PATHFINDING  │ ─(no path)──→ IDLE  │
└──────┬──────┘                      │
       │ (arrived)                   │
       ↓                             │
┌─────────────┐                      │
│   IN_USE    │                      │
└──────┬──────┘                      │
       │ (need satisfied)            │
       ↓                             │
┌─────────────┐                      │
│  SATISFIED  │ ────────────────────┘
└─────────────┘
       │
       │ (night time)
       ↓
┌─────────────┐
│  SLEEPING   │ ─(day time)──→ IDLE
└─────────────┘
```

### State Implementations

```typescript
function updateResidentState(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  switch (resident.currentState) {
    case "idle":
      handleIdleState(resident, gameState);
      break;
    
    case "seeking_need":
      handleSeekingNeedState(resident, gameState);
      break;
    
    case "pathfinding":
      handlePathfindingState(resident, gameState, deltaTime);
      break;
    
    case "in_use":
      handleInUseState(resident, gameState, deltaTime);
      break;
    
    case "satisfied":
      handleSatisfiedState(resident, gameState);
      break;
    
    case "sleeping":
      handleSleepingState(resident, gameState, deltaTime);
      break;
  }
}
```

---

## State Handlers

### Idle State

```typescript
function handleIdleState(resident: Resident, gameState: GameState): void {
  const now = Date.now();
  const NEED_CHECK_INTERVAL = 5000; // Check every 5 seconds
  
  // Check if it's time to evaluate needs
  if (now - resident.lastNeedCheck < NEED_CHECK_INTERVAL) {
    return;
  }
  
  resident.lastNeedCheck = now;
  
  // Check for night time (should sleep)
  if (gameState.currentPhase === "night") {
    resident.currentNeed = "sleep";
    resident.currentState = "seeking_need";
    return;
  }
  
  // Detect current need
  const need = detectNeed(resident, gameState);
  
  if (need) {
    resident.currentNeed = need;
    resident.currentState = "seeking_need";
  }
}
```

### Seeking Need State

```typescript
function handleSeekingNeedState(resident: Resident, gameState: GameState): void {
  if (!resident.currentNeed) {
    resident.currentState = "idle";
    return;
  }
  
  // Find nearest room that satisfies the need
  const result = findNearestRoomForNeed(
    gameState.grid,
    gameState.rooms,
    resident.gridX,
    resident.gridY,
    resident.currentNeed,
    gameState.currentPhase
  );
  
  if (!result) {
    // No available room, go back to idle
    console.log(`${resident.name} cannot find room for ${resident.currentNeed}`);
    resident.currentState = "idle";
    resident.currentNeed = null;
    return;
  }
  
  // Set path and target
  resident.path = result.path;
  resident.pathIndex = 0;
  resident.targetRoomId = result.room.id;
  resident.currentState = "pathfinding";
}
```

### Pathfinding State

```typescript
function handlePathfindingState(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  if (!resident.path || resident.path.length === 0) {
    resident.currentState = "idle";
    return;
  }
  
  // Update movement along path
  updateResidentMovement(resident, deltaTime);
  
  // Check if arrived at destination
  if (!resident.path) {
    // Arrived - try to enter room
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    
    if (room && enterRoom(room, resident.id)) {
      resident.currentState = "in_use";
    } else {
      // Room full or closed, go back to idle
      resident.currentState = "idle";
      resident.targetRoomId = null;
      resident.currentNeed = null;
    }
  }
}
```

### In Use State

```typescript
function handleInUseState(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
  
  if (!room || !room.isOpen) {
    // Room closed, leave
    if (room) leaveRoom(room, resident.id);
    resident.currentState = "satisfied";
    return;
  }
  
  // Apply room effects
  applyRoomEffects(resident, room, gameState, deltaTime);
  
  // Check if need is satisfied
  const USAGE_TIME = 10; // Seconds to satisfy need
  const timeSinceArrival = deltaTime; // Simplified - should track actual time
  
  if (timeSinceArrival >= USAGE_TIME) {
    leaveRoom(room, resident.id);
    resident.currentState = "satisfied";
  }
}
```

### Satisfied State

```typescript
function handleSatisfiedState(resident: Resident, gameState: GameState): void {
  // Brief pause before returning to idle
  resident.currentNeed = null;
  resident.targetRoomId = null;
  resident.currentState = "idle";
}
```

### Sleeping State

```typescript
function handleSleepingState(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Check if day time
  if (gameState.currentPhase === "day") {
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (room) leaveRoom(room, resident.id);
    
    resident.currentState = "idle";
    resident.currentNeed = null;
    resident.targetRoomId = null;
    return;
  }
  
  // Restore happiness while sleeping
  const HAPPINESS_RESTORE_RATE = 5; // Per hour
  const restoreAmount = (HAPPINESS_RESTORE_RATE / 3600) * deltaTime;
  
  resident.happiness = Math.min(100, resident.happiness + restoreAmount);
}
```

---

## Need Detection

### Need Priority System

```typescript
interface NeedPriority {
  need: Need;
  priority: number;
}

function detectNeed(resident: Resident, gameState: GameState): Need | null {
  const needs: NeedPriority[] = [];
  
  // Sleep (highest priority at night)
  if (gameState.currentPhase === "night") {
    needs.push({ need: "sleep", priority: 100 });
  }
  
  // Learning (based on LIFE meter and happiness)
  if (resident.lifeMeter < 100 && resident.happiness > 30) {
    const priority = 50 + (100 - resident.lifeMeter) * 0.3;
    needs.push({ need: "learning", priority });
  }
  
  // Social (based on happiness)
  if (resident.happiness < 60) {
    const priority = 40 + (60 - resident.happiness) * 0.5;
    needs.push({ need: "social", priority });
  }
  
  // Bathroom (random periodic need)
  const timeSinceLastBathroom = Date.now() - resident.lastNeedCheck;
  if (Math.random() < 0.1 && timeSinceLastBathroom > 60000) {
    needs.push({ need: "bathroom", priority: 60 });
  }
  
  // Sort by priority
  needs.sort((a, b) => b.priority - a.priority);
  
  // Return highest priority need above threshold
  if (needs.length > 0 && needs[0].priority > 40) {
    return needs[0].need;
  }
  
  return null;
}
```

### Room Finding for Needs

```typescript
function findNearestRoomForNeed(
  grid: Grid,
  rooms: Room[],
  startX: number,
  startY: number,
  need: Need,
  phase: "day" | "night"
): { room: Room; path: { x: number; y: number }[] } | null {
  
  // Map needs to room types
  const roomTypesForNeed: Record<Need, RoomType[]> = {
    sleep: ["dormitory"],
    learning: ["learning_center", "vocational_room"],
    social: ["common_room"],
    bathroom: ["bathroom"],
    food: ["cafeteria"]
  };
  
  const validRoomTypes = roomTypesForNeed[need];
  
  // Find nearest available room of any valid type
  for (const roomType of validRoomTypes) {
    const result = findNearestRoom(grid, rooms, startX, startY, roomType, phase);
    if (result) {
      return result;
    }
  }
  
  return null;
}
```

---

## Room Effects

### Apply Room Effects

```typescript
function applyRoomEffects(
  resident: Resident,
  room: Room,
  gameState: GameState,
  deltaTime: number
): void {
  switch (room.type) {
    case "learning_center":
    case "vocational_room":
      updateResidentLife(resident, gameState, deltaTime);
      break;
    
    case "common_room":
      // Boost happiness
      const happinessGain = (10 / 60) * deltaTime; // 10 per minute
      resident.happiness = Math.min(100, resident.happiness + happinessGain);
      break;
    
    case "dormitory":
      if (gameState.currentPhase === "night") {
        // Restore happiness while sleeping
        const restoreRate = (15 / 3600) * deltaTime; // 15 per hour
        resident.happiness = Math.min(100, resident.happiness + restoreRate);
      }
      break;
    
    case "bathroom":
      // Instant satisfaction (no ongoing effect)
      break;
    
    case "cafeteria":
      // Food is handled by daily food system
      break;
  }
}
```

---

## Happiness System

### Happiness Decay

```typescript
function updateResidentHappiness(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  const now = Date.now();
  const timeSinceLastUpdate = (now - resident.lastHappinessUpdate) / 1000; // seconds
  
  if (timeSinceLastUpdate < 10) return; // Update every 10 seconds
  
  resident.lastHappinessUpdate = now;
  
  // Get decay rate based on profile
  const decayRate = getHappinessDecayRate(resident.profile);
  
  // Calculate decay
  const decayPerDay = decayRate;
  const decayPerSecond = decayPerDay / (12 * 60); // 12 minutes per day
  const decay = decayPerSecond * timeSinceLastUpdate;
  
  // Apply decay
  resident.happiness = Math.max(0, resident.happiness - decay);
  
  // Check for leaving condition
  if (resident.happiness <= 0) {
    handleResidentLeaving(resident, gameState);
  }
}

function getHappinessDecayRate(profile: ResidentProfile): number {
  const DECAY_RATES = {
    young_adult: 10,    // Medium decay
    veteran: 5,         // Low decay (resilient)
    elderly: 15         // High decay (needs comfort)
  };
  
  return DECAY_RATES[profile];
}
```

### Happiness Modifiers

```typescript
function applyHappinessModifiers(resident: Resident, gameState: GameState): void {
  // Food portion modifier (applied daily)
  const foodEffect = FOOD_EFFECTS[gameState.foodPortionSetting].happinessChange;
  resident.happiness = Math.max(0, Math.min(100, resident.happiness + foodEffect));
  
  // Overcrowding penalty
  const cafeterias = gameState.rooms.filter(r => r.type === "cafeteria");
  const totalCapacity = cafeterias.reduce((sum, r) => sum + ROOM_SPECS.cafeteria.capacity, 0);
  
  if (gameState.residents.length > totalCapacity) {
    resident.happiness = Math.max(0, resident.happiness - 5);
  }
}
```

---

## Graduation & Departure

### Graduation

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
  
  // Create exit path
  const exitPath = findPathToEntrance(gameState.grid, resident.gridX, resident.gridY);
  if (exitPath) {
    resident.path = exitPath;
    resident.pathIndex = 0;
    resident.currentState = "pathfinding";
    
    // Remove after animation completes
    setTimeout(() => {
      removeResident(gameState, resident.id);
    }, exitPath.length * 500); // 0.5s per tile
  } else {
    // No path, remove immediately
    removeResident(gameState, resident.id);
  }
}
```

### Unhappy Departure

```typescript
function handleResidentLeaving(resident: Resident, gameState: GameState): void {
  console.log(`😞 ${resident.name} left unhappy`);
  
  // Reputation penalty
  modifyReputation(gameState, -3, `${resident.name} left unhappy`);
  
  // Remove resident
  removeResident(gameState, resident.id);
}

function removeResident(gameState: GameState, residentId: string): void {
  const index = gameState.residents.findIndex(r => r.id === residentId);
  
  if (index !== -1) {
    const resident = gameState.residents[index];
    
    // Leave any room they're in
    if (resident.targetRoomId) {
      const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
      if (room) {
        leaveRoom(room, resident.id);
      }
    }
    
    gameState.residents.splice(index, 1);
  }
}
```

---

## Resident Creation

### Create New Resident

```typescript
function createResident(
  name: string,
  profile: ResidentProfile,
  arrivalReason: string
): Resident {
  const entrance = getEntranceTile(grid);
  
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
    gridX: entrance?.x || 0,
    gridY: entrance?.y || 0,
    arrivalDay: 1,
    arrivalReason,
    daysInShelter: 0,
    lastHappinessUpdate: Date.now(),
    lastNeedCheck: Date.now(),
    lastLifeUpdate: Date.now()
  };
}
```

### Random Name Generation

```typescript
const FIRST_NAMES = [
  "John", "Maria", "James", "Sarah", "Michael", "Jennifer",
  "David", "Lisa", "Robert", "Patricia", "William", "Linda",
  "Richard", "Barbara", "Joseph", "Elizabeth", "Thomas", "Susan"
];

const LAST_NAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
  "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson"
];

function generateRandomName(): string {
  const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${firstName} ${lastName}`;
}

function generateRandomProfile(): ResidentProfile {
  const profiles: ResidentProfile[] = ["young_adult", "veteran", "elderly"];
  const weights = [0.5, 0.3, 0.2]; // 50% young, 30% veteran, 20% elderly
  
  const roll = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < profiles.length; i++) {
    cumulative += weights[i];
    if (roll < cumulative) {
      return profiles[i];
    }
  }
  
  return "young_adult";
}
```

---

## Profile-Specific Behavior

### Profile Specifications

```typescript
const PROFILE_SPECS: Record<ResidentProfile, ResidentProfileSpec> = {
  young_adult: {
    profile: "young_adult",
    lifeFillRate: 0.05,           // Fast LIFE gain
    happinessDecayRate: 10,       // Medium decay
    fundraiserEfficiency: 1.2,    // 20% bonus
    graduationBonus: 0,           // No bonus
    displayName: "Young Adult",
    icon: "🧑"
  },
  
  veteran: {
    profile: "veteran",
    lifeFillRate: 0.025,          // Slow LIFE gain
    happinessDecayRate: 5,        // Low decay (resilient)
    fundraiserEfficiency: 1.0,    // Normal
    graduationBonus: 2,           // +2 reputation on graduation
    displayName: "Veteran",
    icon: "🎖️"
  },
  
  elderly: {
    profile: "elderly",
    lifeFillRate: 0.0375,         // Medium LIFE gain
    happinessDecayRate: 15,       // High decay (needs comfort)
    fundraiserEfficiency: 0.8,    // 20% penalty
    graduationBonus: 0,           // No bonus
    displayName: "Elderly",
    icon: "👴"
  }
};
```

---

## Integration Notes

### Pathfinding Integration
- Residents request paths when seeking needs
- Path following updates every frame
- Failed pathfinding returns resident to idle state

### Room System Integration
- Residents check room availability before pathfinding
- Room occupancy is tracked when residents enter/leave
- Day/night cycle affects room availability

### Economy Integration
- Graduation increases donation multiplier permanently
- Unhappy departures decrease reputation
- Happiness affects LIFE meter fill rate

### UI Integration
- Resident sprites show current state (idle, moving, in-use)
- Click resident to show stats panel
- Profile icon displayed on sprite

See [`10-LIFE-Meter-System.md`](10-LIFE-Meter-System.md) for LIFE meter progression details.
