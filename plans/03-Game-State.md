# Game State Management

---

## Overview

The Game State is the single source of truth for all game data. This document describes how state is managed, accessed, and modified throughout the game.

---

## State Management Architecture

### Centralized State Pattern

```typescript
class GameStateManager {
  private state: GameState;
  private eventBus: EventEmitter;
  private saveScheduled: boolean = false;
  
  constructor(initialState: GameState) {
    this.state = initialState;
    this.eventBus = new EventEmitter();
  }
  
  // Read-only access
  getState(): Readonly<GameState> {
    return this.state;
  }
  
  // Controlled mutations
  mutate(mutator: (state: GameState) => void): void {
    mutator(this.state);
    this.scheduleSave();
    this.notifySubscribers();
  }
  
  // Event subscription
  subscribe(event: string, callback: Function): void {
    this.eventBus.on(event, callback);
  }
  
  private scheduleSave(): void {
    if (!this.saveScheduled) {
      this.saveScheduled = true;
      setTimeout(() => {
        saveToLocalStorage(this.state);
        this.saveScheduled = false;
      }, 1000);
    }
  }
  
  private notifySubscribers(): void {
    this.eventBus.emit('state_changed', this.state);
  }
}
```

---

## State Access Patterns

### Pattern 1: Read-Only Access

```typescript
// Systems should read state without modifying it directly
function calculateDonationAmount(gameState: Readonly<GameState>): number {
  const baseAmount = gameState.residents.length * 50;
  const reputationModifier = 0.5 + (gameState.reputation / 100);
  const graduateMultiplier = 1 + (gameState.graduatedCount * 0.1);
  
  return Math.floor(baseAmount * reputationModifier * graduateMultiplier);
}
```

### Pattern 2: Controlled Mutation

```typescript
// Use the mutate method to modify state
function addResident(manager: GameStateManager, resident: Resident): void {
  manager.mutate((state) => {
    state.residents.push(resident);
  });
}
```

### Pattern 3: Derived State

```typescript
// Calculate derived values on-demand, don't store them
function getAverageHappiness(gameState: Readonly<GameState>): number {
  if (gameState.residents.length === 0) return 0;
  
  const total = gameState.residents.reduce((sum, r) => sum + r.happiness, 0);
  return total / gameState.residents.length;
}

function getAvailableDormitories(gameState: Readonly<GameState>): Room[] {
  return gameState.rooms.filter(room => 
    room.type === "dormitory" && 
    room.isOpen &&
    room.currentOccupancy < getRoomCapacity(room)
  );
}
```

---

## State Initialization

### New Game Initialization

```typescript
function initializeNewGame(): GameState {
  const grid = createDefaultGrid();
  
  // Place starter rooms
  const starterRooms: Room[] = [
    createRoom("dormitory", 5, 5),
    createRoom("cafeteria", 5, 9),
    createRoom("bathroom", 9, 5)
  ];
  
  // Add starter residents (from house fire event)
  const starterResidents: Resident[] = [
    createResident("John Smith", "young_adult", "arrived after a house fire"),
    createResident("Maria Garcia", "elderly", "arrived after a house fire")
  ];
  
  return {
    ...DEFAULT_GAME_STATE,
    grid,
    rooms: starterRooms,
    residents: starterResidents,
    currentDay: 1,
    money: 1000,
    reputation: 50
  };
}
```

### Load Game Initialization

```typescript
function loadGameState(): GameState | null {
  const saved = localStorage.getItem('openArmsGameState');
  
  if (!saved) return null;
  
  try {
    const parsed = JSON.parse(saved);
    
    // Validate
    if (!isValidGameState(parsed)) {
      console.error('Invalid save data');
      return null;
    }
    
    // Migrate if needed
    const migrated = migrateGameState(parsed);
    
    // Recalculate offline progress
    const withOfflineProgress = calculateOfflineProgress(migrated);
    
    return withOfflineProgress;
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}
```

---

## State Modification Patterns

### Adding Entities

```typescript
function addResident(
  manager: GameStateManager,
  name: string,
  profile: ResidentProfile,
  reason: string
): void {
  manager.mutate((state) => {
    const resident = createResident(name, profile, reason);
    resident.arrivalDay = state.currentDay;
    state.residents.push(resident);
  });
}

function addRoom(
  manager: GameStateManager,
  roomType: RoomType,
  gridX: number,
  gridY: number
): boolean {
  const state = manager.getState();
  const spec = ROOM_SPECS[roomType];
  
  // Validate placement
  if (!canPlaceRoom(state.grid, spec, gridX, gridY)) {
    return false;
  }
  
  // Check funds
  if (state.money < spec.buildCost) {
    return false;
  }
  
  // Mutate state
  manager.mutate((state) => {
    // Deduct cost
    state.money -= spec.buildCost;
    
    // Create room
    const room = createRoom(roomType, gridX, gridY);
    state.rooms.push(room);
    
    // Update grid
    updateGridForRoom(state.grid, room);
  });
  
  return true;
}
```

### Removing Entities

```typescript
function removeResident(
  manager: GameStateManager,
  residentId: string,
  reason: 'graduated' | 'left_unhappy'
): void {
  manager.mutate((state) => {
    const index = state.residents.findIndex(r => r.id === residentId);
    
    if (index === -1) return;
    
    const resident = state.residents[index];
    
    // Update counters
    if (reason === 'graduated') {
      state.graduatedCount++;
      state.reputation = Math.min(100, state.reputation + 5);
    } else {
      state.reputation = Math.max(0, state.reputation - 3);
    }
    
    // Remove resident
    state.residents.splice(index, 1);
  });
}
```

### Updating Properties

```typescript
function updateResidentHappiness(
  manager: GameStateManager,
  residentId: string,
  change: number
): void {
  manager.mutate((state) => {
    const resident = state.residents.find(r => r.id === residentId);
    
    if (!resident) return;
    
    resident.happiness = Math.max(0, Math.min(100, resident.happiness + change));
    resident.lastHappinessUpdate = Date.now();
  });
}

function updateMoney(
  manager: GameStateManager,
  amount: number,
  reason: string
): void {
  manager.mutate((state) => {
    state.money += amount;
    console.log(`Money: ${state.money - amount} → ${state.money} (${reason})`);
  });
}
```

---

## State Queries

### Finding Entities

```typescript
function findResidentById(
  state: Readonly<GameState>,
  id: string
): Resident | undefined {
  return state.residents.find(r => r.id === id);
}

function findRoomById(
  state: Readonly<GameState>,
  id: string
): Room | undefined {
  return state.rooms.find(r => r.id === id);
}

function findRoomsByType(
  state: Readonly<GameState>,
  type: RoomType
): Room[] {
  return state.rooms.filter(r => r.type === type);
}
```

### Filtering Entities

```typescript
function getUnhappyResidents(
  state: Readonly<GameState>,
  threshold: number = 30
): Resident[] {
  return state.residents.filter(r => r.happiness < threshold);
}

function getResidentsNearGraduation(
  state: Readonly<GameState>,
  threshold: number = 80
): Resident[] {
  return state.residents.filter(r => r.lifeMeter >= threshold);
}

function getOpenRooms(
  state: Readonly<GameState>,
  type: RoomType
): Room[] {
  return state.rooms.filter(r => r.type === type && r.isOpen);
}
```

### Aggregations

```typescript
function getTotalMaintenanceCost(state: Readonly<GameState>): number {
  return state.rooms.reduce((sum, room) => sum + room.maintenanceCost, 0);
}

function getAverageLifeMeter(state: Readonly<GameState>): number {
  if (state.residents.length === 0) return 0;
  
  const total = state.residents.reduce((sum, r) => sum + r.lifeMeter, 0);
  return total / state.residents.length;
}

function getRoomCount(state: Readonly<GameState>): Record<RoomType, number> {
  const counts: Record<string, number> = {};
  
  for (const room of state.rooms) {
    counts[room.type] = (counts[room.type] || 0) + 1;
  }
  
  return counts as Record<RoomType, number>;
}
```

---

## State Validation

### Validation Rules

```typescript
function validateGameState(state: GameState): string[] {
  const errors: string[] = [];
  
  // Reputation bounds
  if (state.reputation < 0 || state.reputation > 100) {
    errors.push(`Invalid reputation: ${state.reputation}`);
  }
  
  // Resident stats bounds
  for (const resident of state.residents) {
    if (resident.happiness < 0 || resident.happiness > 100) {
      errors.push(`Invalid happiness for ${resident.name}: ${resident.happiness}`);
    }
    if (resident.lifeMeter < 0 || resident.lifeMeter > 100) {
      errors.push(`Invalid LIFE meter for ${resident.name}: ${resident.lifeMeter}`);
    }
  }
  
  // Grid consistency
  for (const room of state.rooms) {
    if (!isRoomOnGrid(state.grid, room)) {
      errors.push(`Room ${room.id} is not properly placed on grid`);
    }
  }
  
  // Timer consistency
  const now = Date.now();
  if (state.nextDonationCheck < now - (10 * 60 * 1000)) {
    errors.push('Donation timer is too far in the past');
  }
  
  return errors;
}
```

### Auto-Correction

```typescript
function autoCorrectGameState(state: GameState): void {
  // Clamp reputation
  state.reputation = Math.max(0, Math.min(100, state.reputation));
  
  // Clamp resident stats
  for (const resident of state.residents) {
    resident.happiness = Math.max(0, Math.min(100, resident.happiness));
    resident.lifeMeter = Math.max(0, Math.min(100, resident.lifeMeter));
  }
  
  // Reset timers if too far in past
  const now = Date.now();
  if (state.nextDonationCheck < now - (10 * 60 * 1000)) {
    state.nextDonationCheck = now + (5 * 60 * 1000);
  }
  if (state.nextMaintenanceCheck < now - (20 * 60 * 1000)) {
    state.nextMaintenanceCheck = now + (15 * 60 * 1000);
  }
}
```

---

## State Events

### Event Types

```typescript
type GameStateEvent = 
  | 'state_changed'           // Any state change
  | 'money_changed'           // Money updated
  | 'reputation_changed'      // Reputation updated
  | 'resident_added'          // New resident
  | 'resident_removed'        // Resident left/graduated
  | 'resident_graduated'      // Resident graduated specifically
  | 'room_added'              // New room built
  | 'room_removed'            // Room deleted
  | 'day_changed'             // New day started
  | 'phase_changed'           // Day/night transition
  | 'event_triggered'         // Random event occurred
  | 'fundraiser_started'      // Fundraiser began
  | 'fundraiser_completed';   // Fundraiser finished
```

### Event Emission

```typescript
class GameStateManager {
  // ... previous code ...
  
  emitEvent(event: GameStateEvent, data?: any): void {
    this.eventBus.emit(event, data);
    this.eventBus.emit('state_changed', this.state);
  }
}

// Usage
manager.mutate((state) => {
  state.money += 100;
});
manager.emitEvent('money_changed', { amount: 100, reason: 'donation' });
```

---

## State Persistence Strategy

### When to Save

- After any state mutation (debounced to 1 second)
- On window blur/beforeunload
- On critical events (graduation, game over)
- Periodically (every 5 minutes as backup)

### Save Debouncing

```typescript
class GameStateManager {
  private saveTimeout: NodeJS.Timeout | null = null;
  
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.performSave();
      this.saveTimeout = null;
    }, 1000);
  }
  
  private performSave(): void {
    try {
      const serialized = JSON.stringify(this.state);
      localStorage.setItem('openArmsGameState', serialized);
      this.state.lastSaved = Date.now();
      console.log('Game saved successfully');
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  }
  
  forceSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.performSave();
  }
}
```

See [`16-Save-Load-System.md`](16-Save-Load-System.md) for complete save/load implementation.
