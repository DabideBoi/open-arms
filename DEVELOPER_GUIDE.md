# 🛠️ Open Arms - Developer Guide

Technical documentation for developers working on the Open Arms shelter management game.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Systems](#core-systems)
5. [New Systems (Phase 8)](#new-systems-phase-8)
6. [Data Models](#data-models)
7. [Game Loop & Timing](#game-loop--timing)
8. [State Management](#state-management)
9. [Adding New Features](#adding-new-features)
10. [Performance Considerations](#performance-considerations)
11. [Testing](#testing)
12. [Build & Deployment](#build--deployment)
13. [Contributing Guidelines](#contributing-guidelines)

---

## 🏗️ Architecture Overview

### Design Philosophy

Open Arms follows a **centralized state management** pattern with **system-based architecture**:

- **Single Source of Truth**: [`GameStateManager`](src/game/systems/GameStateManager.ts) holds all game state
- **System Separation**: Each game aspect is handled by a dedicated system (20 total)
- **Event-Driven**: Systems communicate through events and callbacks
- **React + Phaser Hybrid**: React for UI, Phaser for game rendering

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      React Layer (UI)                            │
│  ┌────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────┐    │
│  │  HUD   │ │BuildMenu │ │EconomicDash  │ │ WarningPanel  │    │
│  └───┬────┘ └────┬─────┘ └──────┬───────┘ └───────┬───────┘    │
│      └───────────┴──────────────┴─────────────────┘             │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                      ┌──────▼──────┐
                      │   App.tsx   │
                      └──────┬──────┘
                             │
┌────────────────────────────┼─────────────────────────────────────┐
│                     Phaser Layer (Game)                          │
│                      ┌─────▼─────┐                               │
│                      │ MainScene │                               │
│                      └─────┬─────┘                               │
│                            │                                     │
│              ┌─────────────┴─────────────┐                      │
│              │   GameStateManager        │                      │
│              │   (Central Hub)           │                      │
│              └─────────────┬─────────────┘                      │
│                            │                                     │
│  ┌─────────────────────────┼─────────────────────────┐          │
│  │                         │                         │          │
│  ▼                         ▼                         ▼          │
│ ┌──────────┐  ┌───────────────────┐  ┌────────────────────┐    │
│ │  Core    │  │   Economic        │  │   Progression      │    │
│ │ Systems  │  │   Systems         │  │   Systems          │    │
│ ├──────────┤  ├───────────────────┤  ├────────────────────┤    │
│ │Grid      │  │Donation           │  │LIFE Meter          │    │
│ │Pathfind  │  │Food               │  │Reputation          │    │
│ │Resident  │  │Maintenance        │  │Tier ✨             │    │
│ │ResidentAI│  │Fundraiser         │  │Warning ✨          │    │
│ │DayNight  │  │Event              │  │Adjacency ✨        │    │
│ │SaveLoad  │  │                   │  │                    │    │
│ └──────────┘  └───────────────────┘  └────────────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

✨ = New in Phase 8
```

---

## 💻 Technology Stack

### Core Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| [React](https://react.dev/) | 18.3.1 | UI framework |
| [TypeScript](https://www.typescriptlang.org/) | 5.5.3 | Type-safe development |
| [Phaser](https://phaser.io/) | 3.80.1 | Game engine |
| [Vite](https://vitejs.dev/) | 5.3.4 | Build tool |

### Development Tools

- **ESLint** - Code linting
- **Prettier** - Code formatting
- **TypeScript Strict Mode** - Enhanced type checking

---

## 📁 Project Structure

```
open-arms/
├── src/
│   ├── components/              # React UI components (14 files)
│   │   ├── HUD.tsx             # Main heads-up display
│   │   ├── BuildMenu.tsx       # Room building interface
│   │   ├── ManagementPanel.tsx # Detailed management view
│   │   ├── EconomicDashboard.tsx # Financial projections ✨
│   │   ├── WarningPanel.tsx    # Warning display ✨
│   │   ├── DisasterModal.tsx   # Disaster event UI ✨
│   │   ├── MoneyAnimations.tsx # Floating money text ✨
│   │   ├── EventModal.tsx      # Random event handling
│   │   ├── GameOverModal.tsx   # Bankruptcy screen
│   │   ├── TutorialModal.tsx   # Tutorial system
│   │   ├── SettingsModal.tsx   # Game settings
│   │   ├── NotificationToast.tsx # Toast notifications
│   │   ├── PerformanceMonitor.tsx # FPS tracking
│   │   └── DevModeMenu.tsx     # Developer tools
│   │
│   ├── game/                   # Phaser game logic
│   │   ├── PhaserGame.ts      # Phaser initialization
│   │   ├── scenes/
│   │   │   └── MainScene.ts   # Main game scene
│   │   └── systems/           # Game systems (20 files)
│   │       ├── GameStateManager.ts    # Central state
│   │       ├── GridSystem.ts          # Grid & building
│   │       ├── ResidentSystem.ts      # Resident management
│   │       ├── ResidentAISystem.ts    # AI behavior
│   │       ├── ResidentSpawningSystem.ts # Spawning
│   │       ├── PathfindingSystem.ts   # A* movement
│   │       ├── DayNightSystem.ts      # Time management
│   │       ├── DonationSystem.ts      # Donations
│   │       ├── FoodSystem.ts          # Food management
│   │       ├── MaintenanceSystem.ts   # Facility upkeep
│   │       ├── FundraiserSystem.ts    # Fundraising
│   │       ├── EventSystem.ts         # Random events
│   │       ├── ReputationSystem.ts    # Reputation
│   │       ├── LIFEMeterSystem.ts     # LIFE progression
│   │       ├── SaveLoadSystem.ts      # Persistence
│   │       ├── TierSystem.ts          # Tier progression ✨
│   │       ├── AdjacencySystem.ts     # Room bonuses ✨
│   │       ├── WarningSystem.ts       # Warning generation ✨
│   │       ├── TimerManager.ts        # Timer coordination
│   │       ├── AudioSystem.ts         # Sound management
│   │       └── CollisionDetectionSystem.ts
│   │
│   ├── types/
│   │   └── index.ts            # TypeScript definitions
│   ├── constants/
│   │   └── index.ts            # Game configuration (~1000 lines)
│   ├── utils/
│   │   ├── helpers.ts          # Utility functions
│   │   └── stressTest.ts       # Performance testing
│   ├── App.tsx                 # Main React app
│   ├── App.css                 # App styles
│   ├── main.tsx                # Entry point
│   └── index.css               # Global styles
│
├── plans/                      # Design documents (21 files)
├── public/assets/              # Game assets
├── index.html                  # HTML entry point
├── vite.config.ts              # Vite configuration
├── vercel.json                 # Vercel deployment config
└── [documentation files]

✨ = New in Phase 8
```

---

## 🎮 Core Systems

### GameStateManager

**Location**: [`src/game/systems/GameStateManager.ts`](src/game/systems/GameStateManager.ts)

**Purpose**: Central hub for all game state and system coordination.

**Key Responsibilities**:
- Maintains game state (money, reputation, day, residents, rooms, etc.)
- Coordinates all other systems
- Provides state access to React components
- Handles game initialization and updates

**Key Methods**:
```typescript
class GameStateManager {
  getState(): GameState
  addMoney(amount: number): void
  spendMoney(amount: number): boolean
  addReputation(amount: number): void
  advancePhase(): void
  advanceDay(): void
  update(time: number, delta: number): void
  
  // State change notification
  setOnStateChange(callback: (state: GameState) => void): void
}
```

---

### GridSystem

**Location**: [`src/game/systems/GridSystem.ts`](src/game/systems/GridSystem.ts)

**Purpose**: Manages the tile grid and room placement.

**Key Methods**:
```typescript
class GridSystem {
  canPlaceRoom(x: number, y: number, width: number, height: number): boolean
  placeRoom(room: Room): boolean
  removeRoom(roomId: string): void
  getTileAt(x: number, y: number): Tile | null
  getRoomAt(x: number, y: number): Room | null
  isWithinUnlockedArea(x: number, y: number): boolean
}
```

**Room Placement Logic**:
1. Check if tiles are within unlocked grid bounds
2. Verify tiles are unoccupied
3. Check affordability
4. Deduct money from budget
5. Mark tiles as occupied
6. Create room object
7. **Calculate adjacency bonuses** ✨
8. Render visually

---

### ResidentSystem & ResidentAISystem

**Locations**: 
- [`src/game/systems/ResidentSystem.ts`](src/game/systems/ResidentSystem.ts)
- [`src/game/systems/ResidentAISystem.ts`](src/game/systems/ResidentAISystem.ts)

**ResidentSystem** handles:
- Resident creation and removal
- Need updates (hunger, sleep, hygiene, etc.)
- Capacity management
- **Departure tracking** ✨

**ResidentAISystem** handles:
- Pathfinding to facilities
- Activity scheduling
- Need-based decision making
- Social interactions

**AI Decision Flow**:
```
1. Evaluate all needs (hunger, sleep, hygiene, happiness)
2. Identify most urgent need
3. Find appropriate facility
4. Calculate path using PathfindingSystem
5. Move toward destination
6. Perform activity when reached
7. Update needs and satisfaction
8. Check departure conditions ✨
```

---

### PathfindingSystem

**Location**: [`src/game/systems/PathfindingSystem.ts`](src/game/systems/PathfindingSystem.ts)

**Algorithm**: A* with Manhattan distance heuristic

**Performance Optimizations**:
- Path caching (100 cached paths)
- Early termination if no path exists
- 4-directional movement only
- Maximum 1000 search iterations

---

### DayNightSystem

**Location**: [`src/game/systems/DayNightSystem.ts`](src/game/systems/DayNightSystem.ts)

**Phase Cycle** (6 minutes total):
1. Day Phase (4 minutes) - Full activity
2. Night Phase (2 minutes) - Reduced activity, residents sleep

**Visual Effects**:
- Ambient lighting changes
- Color tinting
- Some rooms close at night

---

## 🆕 New Systems (Phase 8)

### TierSystem

**Location**: [`src/game/systems/TierSystem.ts`](src/game/systems/TierSystem.ts)

**Purpose**: Manages shelter tier progression, room availability, and capacity limits.

**Exported Functions**:
```typescript
// Tier information
function getCurrentTier(gameState: GameState): ShelterTier
function getTierConfig(tier: ShelterTier): ShelterTierConfig
function getNextTier(currentTier: ShelterTier): ShelterTier | null

// Room availability
function isRoomAvailable(gameState: GameState, roomType: RoomType): boolean
function getAvailableRooms(gameState: GameState): RoomType[]
function getLockedRooms(gameState: GameState): Array<{ roomType: RoomType; unlocksAtTier: ShelterTier }>

// Capacity
function getResidentCap(gameState: GameState): number
function isAtResidentCap(gameState: GameState): boolean
function isApproachingCapacity(gameState: GameState): boolean

// Upgrades
function checkUpgradeRequirements(gameState: GameState): TierUpgradeRequirements
function canUpgrade(gameState: GameState): boolean
function performUpgrade(gameState: GameState): { success: boolean; error?: string; newRooms?: RoomType[] }

// Progress tracking
function getTierProgress(gameState: GameState): TierProgressInfo
function trackGraduation(gameState: GameState): void
```

**Tier Configuration**:
```typescript
const SHELTER_TIERS: Record<ShelterTier, ShelterTierConfig> = {
  1: {
    name: "Starter Shelter",
    maxResidents: 10,
    gridSize: 10,
    upgradeCost: 0,
    availableRooms: ['dormitory', 'cafeteria', 'bathroom', 'common_room'],
    donationMultiplier: 1.0,
    graduationsRequired: 0,
    reputationRequired: 0
  },
  2: {
    name: "Community Hub",
    maxResidents: 25,
    gridSize: 15,
    upgradeCost: 3000,
    availableRooms: ['dormitory', 'cafeteria', 'bathroom', 'common_room', 'learning_center', 'admin_office'],
    donationMultiplier: 1.2,
    graduationsRequired: 5,
    reputationRequired: 60
  },
  // ... tiers 3-4
};
```

---

### AdjacencySystem

**Location**: [`src/game/systems/AdjacencySystem.ts`](src/game/systems/AdjacencySystem.ts)

**Purpose**: Calculates bonuses and penalties when rooms share edges.

**Exported Functions**:
```typescript
// Adjacency detection
function areRoomsAdjacent(room1: Room, room2: Room): boolean
function getAdjacentRooms(room: Room, allRooms: Room[]): Room[]

// Bonus calculation
function calculateRoomBonuses(room: Room, allRooms: Room[]): RoomAdjacencyBonuses
function recalculateAllAdjacencies(rooms: Room[]): void

// Placement preview
function getPlacementPreview(
  gridX: number, gridY: number, roomType: RoomType,
  width: number, height: number, existingRooms: Room[]
): PlacementPreview

// Effective values
function getEffectiveMaintenanceCost(room: Room): number
function getEffectiveLifeFillModifier(room: Room): number
function getRoomHappinessBonus(room: Room): number
```

**Adjacency Bonus Interface**:
```typescript
interface RoomAdjacencyBonuses {
  happiness: number;           // Flat happiness modifier
  lifeFillModifier: number;    // Percentage LIFE fill bonus (0.15 = +15%)
  maintenanceReduction: number; // Percentage reduction (0.1 = -10%)
  adjacentRoomIds: string[];   // IDs of adjacent rooms with bonuses
  bonusDescriptions: string[]; // Human-readable descriptions
}
```

**13 Adjacency Rules**:
```typescript
const ADJACENCY_BONUSES = {
  // Positive
  bathroom_dormitory: { happiness: 5, maintenanceReduction: 0.1 },
  common_room_dormitory: { happiness: 3, lifeFillModifier: 0.05 },
  cafeteria_common_room: { happiness: 5 },
  admin_office_learning_center: { lifeFillModifier: 0.1 },
  learning_center_vocational_room: { lifeFillModifier: 0.15 },
  // ... 8 more rules
  
  // Negative
  cafeteria_dormitory: { happiness: -5, maintenanceReduction: -0.1 },
  bathroom_cafeteria: { happiness: -8, maintenanceReduction: -0.15 },
  // ... more penalties
};
```

---

### WarningSystem

**Location**: [`src/game/systems/WarningSystem.ts`](src/game/systems/WarningSystem.ts)

**Purpose**: Generates and manages warnings for various game conditions.

**Singleton Access**:
```typescript
function getWarningSystem(): WarningSystem
function resetWarningSystem(): void
```

**Key Methods**:
```typescript
class WarningSystem {
  // Main update (called every 5 seconds)
  updateWarnings(state: GameState): void
  
  // Warning management
  dismissWarning(state: GameState, warningId: string): void
  getWarningCounts(state: GameState): { info: number; warning: number; critical: number; total: number }
  getMostSevereWarning(state: GameState): Warning | null
  formatWarningDuration(warning: Warning): string
  
  // Check functions (internal)
  private checkFinancialWarnings(state: GameState): Warning[]
  private checkResidentWarnings(state: GameState): Warning[]
  private checkOperationalWarnings(state: GameState): Warning[]
  private checkProgressionWarnings(state: GameState): Warning[]
}
```

**16 Warning Types**:
```typescript
type WarningType =
  // Financial
  | 'low_funds'           // Below $500
  | 'in_debt'             // Below $0
  | 'near_bankruptcy'     // Below -$300
  | 'maintenance_due'     // Due in 2 minutes
  | 'operating_costs_due' // Day ending soon
  // Resident
  | 'unhappy_resident'    // Happiness < 30% for > 1 minute
  | 'at_risk_resident'    // About to leave
  | 'overcrowded'         // Over tier capacity
  | 'hungry_residents'    // Low food supply
  // Operational
  | 'low_reputation'      // Below 40%
  | 'reputation_dropping' // 3+ drops in 2 minutes
  | 'maintenance_overdue' // Past maintenance window
  | 'capacity_warning'    // At 90% capacity
  // Progression
  | 'ready_to_upgrade'    // All requirements met
  | 'stalled_progress'    // No graduations in 5+ minutes
  | 'life_meters_stalled' // LIFE not progressing
```

**Warning Severity & Escalation**:
- **Info** → **Warning** → **Critical**
- Escalation after 3 minutes if unresolved
- Critical warnings have shorter cooldowns (30s vs 5min)

---

### EconomicDashboard Integration

**Location**: [`src/components/EconomicDashboard.tsx`](src/components/EconomicDashboard.tsx)

**Purpose**: Provides detailed financial projections and alerts.

**Key Calculations**:
```typescript
// Average donations per day
function calculateAverageDonationsPerDay(gameState: GameState): number

// Daily expenses breakdown
function calculateDailyExpenses(gameState: GameState): {
  food: number;
  maintenance: number;
  operating: number;
  random: number;
  total: number;
}

// Financial health status
function getFinancialHealthStatus(dailyNet: number, daysUntilBankrupt: number | null): FinancialHealthStatus

// Bankruptcy projection
function calculateDaysUntilBankrupt(money: number, dailyNet: number): number | null

// Efficiency metrics
function calculateEfficiencyMetrics(gameState: GameState, dailyIncome: number, dailyExpenses: number): {
  costPerResident: number;
  revenuePerResident: number;
  efficiencyScore: number; // 100 = break-even
}
```

**Health Status Levels**:
- `healthy` - Daily net > $50
- `stable` - Daily net >= -$20
- `warning` - Daily net < -$20
- `critical` - Bankruptcy imminent (≤5 days)

---

## 📊 Data Models

### Core Types

**Location**: [`src/types/index.ts`](src/types/index.ts)

#### GameState
```typescript
interface GameState {
  // Resources
  money: number;
  reputation: number;
  food: number;
  
  // Time
  day: number;
  currentPhase: 'day' | 'night';
  
  // Tier
  currentTier: ShelterTier;
  tierUnlockProgress: TierUnlockProgress;
  
  // Entities
  residents: Resident[];
  rooms: Room[];
  grid: Grid;
  
  // Settings
  foodPortionSetting: FoodPortionTier;
  isPaused: boolean;
  gameSpeed: number;
  
  // Warnings
  activeWarnings: Warning[];
  warningCooldowns: WarningCooldown[];
  
  // History
  financialHistory: FinancialHistory;
  graduatedCount: number;
  lastGraduationTime: number;
  
  // Timers
  nextMaintenanceCheck: number;
  nextDayNightTransition: number;
  lastWarningCheck: number;
  
  // Active events
  activeFundraisers: Fundraiser[];
  activeDisaster: DisasterEvent | null;
}
```

#### Resident
```typescript
interface Resident {
  id: string;
  name: string;
  profile: ResidentProfile; // 'young_adult' | 'veteran' | 'elderly'
  
  // Position
  position: { x: number; y: number };
  currentActivity: string;
  
  // Stats
  lifeMeter: number;      // 0-100
  happiness: number;       // 0-100
  needs: ResidentNeeds;
  
  // Departure tracking
  unhappyDuration: number;
  isAtRisk: boolean;
  
  // Fundraiser
  isFatigued: boolean;
  fatigueEndTime: number;
  
  // Visual
  sprite?: Phaser.GameObjects.Sprite;
  statusBars?: ResidentStatusBars;
}
```

#### Room
```typescript
interface Room {
  id: string;
  type: RoomType;
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  
  // State
  isOpen: boolean;
  currentOccupancy: number;
  
  // Economics
  buildCost: number;
  maintenanceCost: number;
  lastMaintenancePaid: number;
  
  // Adjacency bonuses ✨
  adjacencyBonuses: RoomAdjacencyBonuses;
}
```

#### Warning
```typescript
interface Warning {
  id: string;
  type: WarningType;
  severity: WarningSeverity; // 'info' | 'warning' | 'critical'
  message: string;
  detail?: string;
  
  // Actions
  actionLabel?: string;
  actionCallback?: () => void;
  
  // Timing
  timestamp: number;
  activeSince: number;
  dismissable: boolean;
  
  // Escalation
  originalSeverity: WarningSeverity;
  escalatedAt?: number;
}
```

---

## ⏱️ Game Loop & Timing

### Update Cycle (60 FPS target)

```
Phaser Scene Update (every frame)
  ↓
GameStateManager.update(time, delta)
  ↓
System Updates (in order):
  1. DayNightSystem
  2. ResidentAISystem
  3. FoodSystem
  4. MaintenanceSystem
  5. DonationSystem
  6. ReputationSystem (with decay) ✨
  7. LIFEMeterSystem
  8. EventSystem
  9. WarningSystem ✨
  ↓
React Component Re-renders (as needed)
```

### Timer Configuration

**Location**: [`src/constants/index.ts`](src/constants/index.ts)

```typescript
// Production timers (faster paced)
const TIMER_CONFIG = {
  DONATION_CHECK_INTERVAL: 90 * 1000,    // 90 seconds
  MAINTENANCE_CHECK_INTERVAL: 5 * 60 * 1000, // 5 minutes
  DAY_DURATION: 4 * 60 * 1000,           // 4 minutes
  NIGHT_DURATION: 2 * 60 * 1000,         // 2 minutes
  FULL_DAY_CYCLE: 6 * 60 * 1000          // 6 minutes
};

// Dev mode timers (faster for testing)
const DEV_TIMER_CONFIG = {
  DONATION_CHECK_INTERVAL: 30 * 1000,    // 30 seconds
  MAINTENANCE_CHECK_INTERVAL: 2 * 60 * 1000,
  // ...
};

// Runtime switching
function setDevTimersEnabled(enabled: boolean): void
function getActiveTimerConfig(): typeof TIMER_CONFIG
```

---

## 🔄 State Management

### React-Phaser Communication

**React → Phaser**:
```typescript
// In React component
const handleBuildRoom = (roomType: RoomType) => {
  const gsm = GameStateManager.getInstance();
  gsm.gridSystem.placeRoom(/* ... */);
};
```

**Phaser → React**:
```typescript
// In GameStateManager
private notifyStateChange() {
  if (this.onStateChange) {
    this.onStateChange(this.getState());
  }
}

// In React component
useEffect(() => {
  const gsm = GameStateManager.getInstance();
  gsm.setOnStateChange((state) => {
    setGameState(state);
  });
}, []);
```

### Event Dispatching

For complex events, use custom DOM events:

```typescript
// Dispatch event
window.dispatchEvent(new CustomEvent('game:tier_upgraded', {
  detail: {
    previousTier: 1,
    newTier: 2,
    tierName: "Community Hub",
    newRooms: ['learning_center', 'admin_office']
  }
}));

// Listen in React
useEffect(() => {
  const handler = (e: CustomEvent) => {
    showNotification(e.detail.message);
  };
  window.addEventListener('game:tier_upgraded', handler);
  return () => window.removeEventListener('game:tier_upgraded', handler);
}, []);
```

---

## ➕ Adding New Features

### Adding a New Room Type

1. **Define the room type** in [`src/types/index.ts`](src/types/index.ts):
```typescript
export type RoomType = 
  | 'dormitory' 
  | 'cafeteria' 
  | 'new_room';  // Add here
```

2. **Add room specs** in [`src/constants/index.ts`](src/constants/index.ts):
```typescript
export const ROOM_SPECS: Record<RoomType, RoomSpec> = {
  new_room: {
    type: "new_room",
    width: 3,
    height: 3,
    buildCost: 750,
    maintenanceCost: 40,
    capacity: 6,
    closesAtNight: false,
    needsSatisfied: ['social'],
    description: 'Description here'
  },
};
```

3. **Add tier availability** in `SHELTER_TIERS`:
```typescript
2: {
  availableRooms: ['dormitory', '...', 'new_room'],
}
```

4. **Add adjacency rules** (if any) in `ADJACENCY_BONUSES`:
```typescript
new_room_common_room: {
  happiness: 3,
  lifeFillModifier: 0.05,
  description: "Synergy description"
}
```

5. **Update BuildMenu** to include the new room
6. **Add visual rendering** in MainScene

---

### Adding a New Warning Type

1. **Add warning type** to types:
```typescript
type WarningType = 
  | 'low_funds'
  | 'new_warning_type';  // Add here
```

2. **Add check function** in WarningSystem:
```typescript
private checkNewCondition(state: GameState): Warning[] {
  const warnings: Warning[] = [];
  
  if (/* condition */) {
    if (!this.hasActiveWarning(state, 'new_warning_type')) {
      warnings.push(this.createWarning(
        'new_warning_type',
        'warning', // severity
        'Warning Title',
        { detail: 'Warning detail text' }
      ));
    }
  }
  
  return warnings;
}
```

3. **Add to update loop**:
```typescript
updateWarnings(state: GameState): void {
  const newWarnings: Warning[] = [
    ...this.checkFinancialWarnings(state),
    ...this.checkNewCondition(state),  // Add here
  ];
}
```

4. **Add resolution check** in `shouldKeepWarning`:
```typescript
case 'new_warning_type':
  return /* condition still true */;
```

---

### Adding a New System

1. **Create system file** in `src/game/systems/`:
```typescript
import { GameState } from '../../types';

export class NewSystem {
  private scene: Phaser.Scene;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.initialize();
  }
  
  private initialize(): void {
    // Setup logic
  }
  
  update(gameState: GameState, delta: number): void {
    // Update logic called every frame
  }
}
```

2. **Initialize in GameStateManager**:
```typescript
export class GameStateManager {
  public newSystem!: NewSystem;
  
  initialize(scene: Phaser.Scene): void {
    this.newSystem = new NewSystem(scene);
  }
  
  update(time: number, delta: number): void {
    this.newSystem.update(this.state, delta);
  }
}
```

3. **Export from systems** if needed externally

---

## ⚡ Performance Considerations

### Optimization Strategies

#### 1. Object Pooling
Reuse objects instead of creating/destroying:
```typescript
const residentPool: Resident[] = [];

function getResident(): Resident {
  return residentPool.pop() || createNewResident();
}

function returnResident(resident: Resident): void {
  resetResident(resident);
  residentPool.push(resident);
}
```

#### 2. Spatial Partitioning
Use grid-based lookups (O(1)) instead of iterating:
```typescript
// Instead of
rooms.find(r => isPointInRoom(x, y, r));

// Use
grid.tiles[y][x].roomId;
```

#### 3. Update Throttling
Don't update every frame if not needed:
```typescript
private updateCounter = 0;

update(delta: number): void {
  this.updateCounter++;
  if (this.updateCounter % 10 === 0) {
    this.expensiveUpdate();
  }
}
```

#### 4. Path Caching
Cache pathfinding results:
```typescript
const pathCache = new Map<string, Point[]>();
const cacheKey = `${startX},${startY}-${endX},${endY}`;

if (pathCache.has(cacheKey)) {
  return pathCache.get(cacheKey);
}
```

### Performance Monitoring

Use the built-in PerformanceMonitor component:
- FPS (frames per second)
- Frame time
- Memory usage
- System update times

---

## 🧪 Testing

### Manual Testing Checklist

#### Core Functionality
- [ ] Room placement validates correctly
- [ ] Residents spawn based on reputation
- [ ] Pathfinding works without getting stuck
- [ ] Needs decrease and can be satisfied
- [ ] Time progresses through phases
- [ ] Donations arrive on schedule

#### Economic Systems
- [ ] Food costs calculated correctly per tier
- [ ] Maintenance charged on schedule
- [ ] Fundraisers have proper success rates
- [ ] Bankruptcy countdown triggers correctly
- [ ] Operating costs accumulate daily

#### Progression Systems
- [ ] LIFE meter fills based on profile
- [ ] Graduation triggers at 100%
- [ ] Reputation decay works correctly
- [ ] Tier upgrades function properly
- [ ] Adjacency bonuses apply

#### UI/UX
- [ ] All buttons responsive
- [ ] Warnings display correctly
- [ ] Economic dashboard shows accurate data
- [ ] Status bars toggle with B key
- [ ] Money animations work

### Browser Testing

Test on:
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers

---

## 🚀 Build & Deployment

### Development

```bash
npm install
npm run dev
# Access at http://localhost:3000
```

### Production Build

```bash
npm run build
# Output in dist/ directory

npm run preview
# Test production build at http://localhost:4173
```

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or connect GitHub repository for automatic deployments.

### Build Configuration

**Vite Configuration** ([`vite.config.ts`](vite.config.ts)):
- Code splitting for React and Phaser
- Source maps for debugging
- Asset optimization
- SPA routing support

---

## 🤝 Contributing Guidelines

### Code Style

#### TypeScript
- Use strict mode
- Explicit return types for public functions
- Interfaces for object shapes
- Descriptive variable names

```typescript
// Good
function calculateDonation(reputation: number, residentCount: number): number {
  const baseAmount = DONATION_CONFIG.BASE_AMOUNT_PER_RESIDENT;
  const multiplier = getReputationMultiplier(reputation);
  return Math.floor(baseAmount * residentCount * multiplier);
}

// Bad
function calc(r: number, n: number) {
  return 25 * n * (r / 50);
}
```

#### React Components
- Functional components with hooks
- Props interfaces defined
- CSS modules for styling

```typescript
interface HUDProps {
  gameState: GameState;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({ gameState, onPause }) => {
  // Component logic
};
```

### Git Workflow

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes with descriptive commits
3. Test thoroughly
4. Push and create PR
5. Address review feedback
6. Merge after approval

### Commit Messages

Follow conventional commits:
```
feat: Add new room type (Medical Center)
fix: Resolve pathfinding bug at room edges
docs: Update developer guide with TierSystem
refactor: Optimize adjacency calculation
perf: Cache pathfinding results
```

---

## 📚 Additional Resources

- **Planning Documents**: See `plans/` directory (21 design docs)
- **Player Guide**: [`PLAYER_GUIDE.md`](PLAYER_GUIDE.md)
- **Implementation Details**: [`IMPLEMENTATION.md`](IMPLEMENTATION.md)
- **Changelog**: [`CHANGELOG.md`](CHANGELOG.md)

---

## 🐛 Debugging Tips

### Common Issues

**Residents not moving**:
- Check PathfindingSystem initialization
- Verify tiles are marked walkable
- Ensure destination room exists and is accessible

**State not updating in React**:
- Verify `onStateChange` callback is set
- Check GameStateManager is notifying changes
- Ensure React component is subscribed

**Warnings not appearing**:
- Check WarningSystem is being updated
- Verify cooldowns aren't preventing display
- Check threshold values in WARNING_CONFIG

**Performance issues**:
- Enable PerformanceMonitor
- Check for memory leaks (growing arrays)
- Profile with browser DevTools
- Reduce update frequency for expensive operations

### Debug Tools

**Browser Console**:
```typescript
// Access GameStateManager
const gsm = window.gameStateManager;

// Check state
console.log(gsm.getState());

// Manually trigger events
gsm.addMoney(1000);
gsm.addReputation(50);

// Check adjacency bonuses
console.log(gsm.getState().rooms.map(r => r.adjacencyBonuses));
```

**Dev Mode (Press D)**:
- Fast timers
- Instant money/reputation
- Spawn/remove residents
- Skip days

---

**Happy coding! 🚀**
