# System Architecture Overview

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        React UI Layer                        │
│  (HUD, Modals, Menus, Build Mode, Event Dialogs)           │
└────────────────────┬────────────────────────────────────────┘
                     │ Event Bus / Context API
┌────────────────────┴────────────────────────────────────────┐
│                   Game State Manager                         │
│  (Central state, timer coordination, save/load)             │
└─────┬──────────┬──────────┬──────────┬──────────┬──────────┘
      │          │          │          │          │
┌─────▼──┐  ┌───▼───┐  ┌───▼───┐  ┌───▼───┐  ┌──▼────┐
│ Grid & │  │Resident│  │Economy│  │ Event │  │ Timer │
│Building│  │   AI   │  │Systems│  │System │  │Manager│
└─────┬──┘  └───┬───┘  └───┬───┘  └───┬───┘  └──┬────┘
      │          │          │          │          │
┌─────▼──────────▼──────────▼──────────▼──────────▼──────────┐
│              Phaser/PixiJS Renderer                          │
│  (Canvas rendering, sprites, animations, pathfinding vis)   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│                    Browser localStorage                      │
│              (Persistent game state storage)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Relationships

### Game State Manager (Central Hub)
**Responsibilities:**
- Owns the single source of truth for all game data
- Coordinates all subsystems
- Handles save/load operations
- Manages game clock and timer synchronization
- Broadcasts state changes via event bus

**Interfaces:**
- Exposes read-only state to all systems
- Provides mutation methods for state updates
- Emits events on state changes

---

### Grid & Building System
**Dependencies:** Game State Manager

**Responsibilities:**
- Manages tile grid state
- Validates room placement
- Handles grid expansion
- Provides walkability data for pathfinding

**Data Flow:**
- Reads: Current grid state, available funds
- Writes: Grid tiles, room list, money (deductions)
- Triggers: Economy updates on room construction

---

### Resident AI System
**Dependencies:** Grid System, Economy System

**Responsibilities:**
- Manages resident state machines
- Handles need detection and prioritization
- Coordinates pathfinding requests
- Updates happiness and LIFE meters
- Triggers graduation/departure events

**Data Flow:**
- Reads: Grid walkability, room states, day/night phase
- Writes: Resident positions, happiness, LIFE meter
- Triggers: Graduation events, departure events

---

### Economy Systems
**Dependencies:** Game State Manager, Resident AI

**Includes:**
- Donation System
- Food System
- Maintenance System
- Fundraiser System
- Reputation System

**Responsibilities:**
- Manages money flow (income/expenses)
- Calculates reputation changes
- Processes donations and fundraisers
- Handles daily food consumption
- Processes maintenance costs

**Data Flow:**
- Reads: Resident count, reputation, graduated count
- Writes: Money, reputation
- Triggers: UI notifications, game over conditions

---

### Event System
**Dependencies:** All Systems (can modify any state)

**Responsibilities:**
- Schedules random events
- Presents event choices to player
- Applies event effects to game state
- Tracks event history

**Data Flow:**
- Reads: Current game state (for event probability)
- Writes: Any game state (depending on event effects)
- Triggers: UI modals, state changes across systems

---

### Timer Manager
**Dependencies:** Economy Systems, Day/Night Cycle

**Responsibilities:**
- Maintains central game clock
- Schedules recurring timers
- Handles pause/resume
- Calculates offline time progression

**Timers Managed:**
- Donation checks (every 5 minutes)
- Maintenance checks (every 15 minutes)
- Day/night transitions (8 min day / 4 min night)
- Fundraiser completions (variable duration)

**Data Flow:**
- Reads: Current time, timer states
- Writes: Next trigger timestamps
- Triggers: System-specific timer callbacks

---

## Data Flow Patterns

### Pattern 1: Resident Graduation Flow

```
Resident LIFE reaches 100
    ↓
Resident AI detects graduation condition
    ↓
Triggers graduation event → Game State Manager
    ↓
Game State Manager updates:
    - graduatedCount++
    - reputation += GRADUATION_REP_BONUS
    - Remove resident from activeResidents[]
    ↓
Economy System recalculates donation multiplier
    ↓
Event Bus notifies UI layer
    ↓
React updates HUD (rep bar, resident count)
    ↓
Phaser plays confetti animation, exit walk
    ↓
Save state to localStorage
```

---

### Pattern 2: Donation Check Flow

```
Timer Manager fires 5-minute timer
    ↓
Donation System checks reputation
    ↓
Rolls for donation (chance = reputation%)
    ↓
If successful:
    - Calculate donation amount
    - Update money in Game State
    - Trigger UI notification
    ↓
Schedule next donation check
    ↓
Save state to localStorage
```

---

### Pattern 3: Room Placement Flow

```
Player clicks "Place Room" in UI
    ↓
React sends placement request to Game State Manager
    ↓
Grid System validates:
    - Tile availability
    - Funds availability
    - Grid bounds
    ↓
If valid:
    - Deduct build cost
    - Update grid tiles
    - Add room to state
    - Trigger Phaser to render room
    ↓
Event Bus notifies UI of success/failure
    ↓
Save state to localStorage
```

---

### Pattern 4: Resident Need Satisfaction Flow

```
Resident AI detects need (e.g., "learning")
    ↓
Queries Grid System for available Learning Centers
    ↓
Filters rooms by:
    - isOpen (day/night check)
    - currentOccupancy < capacity
    ↓
Selects nearest available room
    ↓
Requests path from Pathfinding System
    ↓
If path found:
    - Update resident state to "pathfinding"
    - Move resident along path
    - On arrival: state → "in_use"
    - Update LIFE meter while in use
    - On completion: state → "satisfied"
    ↓
Repeat cycle
```

---

## Technology Stack Integration

### React ↔ Phaser Communication

**Event Bus Pattern:**
```typescript
// Shared event bus
const gameEventBus = new EventEmitter();

// React subscribes to game events
gameEventBus.on('money_changed', (newAmount) => {
  updateMoneyDisplay(newAmount);
});

// Phaser emits game events
gameEventBus.emit('money_changed', gameState.money);
```

**Context API Pattern:**
```typescript
// GameStateContext provides read-only state to React
const GameStateContext = React.createContext<GameState>(initialState);

// React components consume state
const HUD = () => {
  const gameState = useContext(GameStateContext);
  return <div>Money: ${gameState.money}</div>;
};
```

---

### localStorage Integration

**Save Trigger Points:**
- After any state mutation
- On timer events (donations, maintenance)
- On resident graduation/departure
- On room placement/deletion
- On event resolution
- On game pause/tab blur

**Debouncing Strategy:**
```typescript
// Debounce saves to avoid excessive writes
let saveTimeout: NodeJS.Timeout | null = null;

function scheduleSave(gameState: GameState) {
  if (saveTimeout) clearTimeout(saveTimeout);
  
  saveTimeout = setTimeout(() => {
    localStorage.setItem('openArmsGameState', JSON.stringify(gameState));
  }, 1000); // Save 1 second after last change
}
```

---

## System Initialization Order

1. **Load from localStorage** (if save exists)
2. **Initialize Game State Manager** with loaded or default state
3. **Initialize Timer Manager** and schedule all timers
4. **Initialize Grid System** and validate grid state
5. **Initialize Resident AI** for all active residents
6. **Initialize Economy Systems** and recalculate derived values
7. **Initialize Event System** and schedule next event
8. **Initialize Phaser Renderer** and render current state
9. **Initialize React UI** and bind to game state
10. **Start game loop**

---

## Error Handling Strategy

### Critical Errors (Game-Breaking)
- localStorage corruption → Reset to default state
- Invalid grid state → Rebuild grid from rooms
- Missing required rooms → Allow continued play, warn player

### Non-Critical Errors (Recoverable)
- Pathfinding failure → Resident idles, retries later
- Invalid room placement → Reject, show error message
- Timer desync → Recalculate from current time

### Error Logging
```typescript
function logError(system: string, error: Error, severity: 'critical' | 'warning') {
  console.error(`[${system}] ${severity.toUpperCase()}: ${error.message}`);
  
  if (severity === 'critical') {
    // Show user-facing error modal
    showErrorModal('An error occurred. The game will attempt to recover.');
  }
}
```

---

## Performance Considerations

### Update Frequency
- **60 FPS**: Phaser rendering, resident movement
- **1 FPS**: Resident AI state updates, need checks
- **0.1 FPS** (every 10s): Happiness decay, LIFE meter updates
- **Timer-based**: Donations (5min), maintenance (15min), day/night (8/4min)

### Optimization Strategies
- Spatial partitioning for resident queries
- Pathfinding caching for common routes
- Lazy evaluation of UI components
- Throttled localStorage saves

See [`20-Performance-Considerations.md`](20-Performance-Considerations.md) for detailed optimization strategies.
