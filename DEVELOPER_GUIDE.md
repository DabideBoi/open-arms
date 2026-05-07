# 🛠️ Open Arms - Developer Guide

Technical documentation for developers working on the Open Arms shelter management game.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Core Systems](#core-systems)
5. [Data Models](#data-models)
6. [Game Loop & Timing](#game-loop--timing)
7. [State Management](#state-management)
8. [Adding New Features](#adding-new-features)
9. [Performance Considerations](#performance-considerations)
10. [Testing](#testing)
11. [Build & Deployment](#build--deployment)
12. [Contributing Guidelines](#contributing-guidelines)

---

## 🏗️ Architecture Overview

### Design Philosophy

Open Arms follows a **centralized state management** pattern with **system-based architecture**:

- **Single Source of Truth**: [`GameStateManager`](src/game/systems/GameStateManager.ts) holds all game state
- **System Separation**: Each game aspect is handled by a dedicated system
- **Event-Driven**: Systems communicate through events and callbacks
- **React + Phaser Hybrid**: React for UI, Phaser for game rendering

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     React Layer (UI)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │   HUD    │  │BuildMenu │  │Management│  │ Modals  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬────┘ │
│       │             │              │             │       │
│       └─────────────┴──────────────┴─────────────┘       │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │
                    ┌──────▼──────┐
                    │   App.tsx   │
                    └──────┬──────┘
                           │
┌──────────────────────────┼───────────────────────────────┐
│                   Phaser Layer (Game)                     │
│                    ┌─────▼─────┐                          │
│                    │ MainScene │                          │
│                    └─────┬─────┘                          │
│                          │                                │
│              ┌───────────┴───────────┐                    │
│              │  GameStateManager     │                    │
│              │  (Central Hub)        │                    │
│              └───────────┬───────────┘                    │
│                          │                                │
│     ┌────────────────────┼────────────────────┐           │
│     │                    │                    │           │
│ ┌───▼────┐  ┌───────────▼──┐  ┌──────────────▼─┐        │
│ │  Grid  │  │   Resident   │  │   Day/Night    │        │
│ │ System │  │   System     │  │    System      │        │
│ └────────┘  └──────────────┘  └────────────────┘        │
│                                                           │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│ │Pathfind  │  │Donation  │  │  Food    │  │  Event   │ │
│ │ System   │  │ System   │  │ System   │  │ System   │ │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                                                           │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│ │Reputation│  │   LIFE   │  │Fundraiser│  │Maintenance│ │
│ │ System   │  │  Meter   │  │ System   │  │  System  │ │
│ └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
└───────────────────────────────────────────────────────────┘
```

---

## 💻 Technology Stack

### Core Technologies

- **[React 18.3.1](https://react.dev/)** - UI framework
  - Functional components with hooks
  - TypeScript for type safety
  - CSS modules for styling

- **[Phaser 3.80.1](https://phaser.io/)** - Game engine
  - Canvas rendering
  - Scene management
  - Input handling
  - Asset loading

- **[TypeScript 5.5.3](https://www.typescriptlang.org/)** - Language
  - Strict mode enabled
  - Full type coverage
  - Interface-driven design

- **[Vite 5.3.4](https://vitejs.dev/)** - Build tool
  - Fast HMR in development
  - Optimized production builds
  - Code splitting

---

## 📁 Project Structure

```
open-arms/
├── src/
│   ├── components/              # React UI components
│   │   ├── HUD.tsx             # Main heads-up display
│   │   ├── BuildMenu.tsx       # Room building interface
│   │   ├── ManagementPanel.tsx # Detailed management view
│   │   ├── EventModal.tsx      # Event display and choices
│   │   ├── TutorialModal.tsx   # Tutorial system
│   │   ├── SettingsModal.tsx   # Game settings
│   │   ├── GameOverModal.tsx   # Game over screen
│   │   ├── NotificationToast.tsx # Toast notifications
│   │   └── PerformanceMonitor.tsx # Performance tracking
│   │
│   ├── game/                   # Phaser game logic
│   │   ├── PhaserGame.ts      # Phaser initialization
│   │   ├── scenes/            # Phaser scenes
│   │   │   └── MainScene.ts   # Main game scene
│   │   └── systems/           # Game systems
│   │       ├── GameStateManager.ts    # Central state
│   │       ├── GridSystem.ts          # Grid & building
│   │       ├── ResidentSystem.ts      # Resident management
│   │       ├── ResidentAISystem.ts    # Resident AI
│   │       ├── PathfindingSystem.ts   # A* pathfinding
│   │       ├── DayNightSystem.ts      # Time management
│   │       └── ... (12 more systems)
│   │
│   ├── types/                 # TypeScript definitions
│   ├── constants/            # Game configuration
│   ├── utils/               # Utility functions
│   └── App.tsx              # Main React app
│
├── plans/                   # Design documents (19 files)
├── public/                  # Static assets
├── index.html              # HTML entry point
├── vite.config.ts          # Vite configuration
├── vercel.json             # Vercel deployment config
└── ... (documentation files)
```

---

## 🎮 Core Systems

### GameStateManager

**Location**: [`src/game/systems/GameStateManager.ts`](src/game/systems/GameStateManager.ts)

**Purpose**: Central hub for all game state and system coordination.

**Key Responsibilities**:
- Maintains game state (money, reputation, day, etc.)
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
}
```

---

### GridSystem

**Location**: [`src/game/systems/GridSystem.ts`](src/game/systems/GridSystem.ts)

**Purpose**: Manages the 20×20 tile grid and room placement.

**Key Methods**:
```typescript
class GridSystem {
  canPlaceRoom(x: number, y: number, width: number, height: number): boolean
  placeRoom(room: Room): boolean
  removeRoom(roomId: string): void
  getTileAt(x: number, y: number): Tile | null
  getRoomAt(x: number, y: number): Room | null
}
```

**Room Placement Logic**:
1. Check if tiles are within grid bounds
2. Verify tiles are unoccupied
3. Deduct money from budget
4. Mark tiles as occupied
5. Create room object and render visually

---

### ResidentSystem & ResidentAISystem

**Locations**: 
- [`src/game/systems/ResidentSystem.ts`](src/game/systems/ResidentSystem.ts)
- [`src/game/systems/ResidentAISystem.ts`](src/game/systems/ResidentAISystem.ts)

**ResidentSystem** handles:
- Resident creation and removal
- Need updates (hunger, sleep, hygiene, etc.)
- Capacity management

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
```

---

### PathfindingSystem

**Location**: [`src/game/systems/PathfindingSystem.ts`](src/game/systems/PathfindingSystem.ts)

**Algorithm**: A* with Manhattan distance heuristic

**Performance Optimizations**:
- Path caching for common routes
- Early termination if no path exists
- 4-directional movement only
- Maximum search iterations limit

---

### DayNightSystem

**Location**: [`src/game/systems/DayNightSystem.ts`](src/game/systems/DayNightSystem.ts)

**Phase Cycle**:
1. Morning (6 AM - 12 PM) - 30 seconds
2. Afternoon (12 PM - 6 PM) - 30 seconds
3. Evening (6 PM - 12 AM) - 30 seconds
4. Night (12 AM - 6 AM) - 30 seconds

---

### Economic Systems

#### DonationSystem
**Formula**: `baseDonation * reputationMultiplier`
- Base: $200/day
- Multiplier: 0.5x to 2.0x based on reputation

#### FoodSystem
- 1 day of food consumed per resident per day
- Purchase at $10 per day of food
- Warning at 7 days, critical at 3 days

#### MaintenanceSystem
- -1 condition per day (normal use)
- Repair costs scale with damage severity

---

### Progression Systems

#### LIFEMeterSystem
**Progression Rate**:
- Base: +1% per day
- Learning Center bonus: +0.5% per visit
- Satisfaction modifiers: ±0.2-0.3% per day

**Stages**: Survival (0-25%) → Stability (25-50%) → Growth (50-75%) → Independence (75-100%)

#### ReputationSystem
**Factors**:
- Resident satisfaction: ±1-3 per day
- Graduations: +10 per graduation
- Facility condition: ±1-2 per day
- Event outcomes: ±5-15 per event

---

## 📊 Data Models

### Core Types

**Location**: [`src/types/index.ts`](src/types/index.ts)

#### GameState
```typescript
interface GameState {
  money: number;
  reputation: number;
  day: number;
  phase: DayPhase;
  residents: Resident[];
  rooms: Room[];
  grid: Tile[][];
  foodSupply: number;
  isPaused: boolean;
  gameSpeed: number;
}
```

#### Resident
```typescript
interface Resident {
  id: string;
  name: string;
  age: number;
  personality: PersonalityType;
  needs: {
    hunger: number;      // 0-100
    sleep: number;       // 0-100
    hygiene: number;     // 0-100
    happiness: number;   // 0-100
    health: number;      // 0-100
  };
  lifeMeter: number;     // 0-100
  satisfaction: number;  // 0-100
  position: Point;
  currentActivity: string;
}
```

#### Room
```typescript
interface Room {
  id: string;
  type: RoomType;
  x: number;
  y: number;
  width: number;
  height: number;
  capacity: number;
  condition: number;     // 0-100
  cost: number;
  maintenanceCost: number;
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
  6. ReputationSystem
  7. LIFEMeterSystem
  8. EventSystem
  ↓
React Component Re-renders (as needed)
```

### Time Scaling
- 1x: Normal speed
- 2x: Fast speed
- 3x: Very fast speed
- Pause: 0x

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

---

## ➕ Adding New Features

### Adding a New Room Type

1. **Define the room type** in [`src/types/index.ts`](src/types/index.ts):
```typescript
export type RoomType = 
  | 'dormitory' 
  | 'cafeteria' 
  | 'new_room_type';  // Add here
```

2. **Add room configuration** in [`src/constants/index.ts`](src/constants/index.ts):
```typescript
export const ROOM_TYPES = {
  new_room_type: {
    name: 'New Room',
    width: 3,
    height: 3,
    cost: 750,
    capacity: 6,
    color: 0x9966ff,
    description: 'Description',
  },
};
```

3. **Update BuildMenu** to include the new room option

4. **Add room-specific logic** if needed in relevant systems

---

### Adding a New System

1. **Create system file** in `src/game/systems/`:
```typescript
export class NewSystem {
  private scene: Phaser.Scene;
  private gsm: GameStateManager;

  constructor(scene: Phaser.Scene, gsm: GameStateManager) {
    this.scene = scene;
    this.gsm = gsm;
    this.initialize();
  }

  private initialize() {
    // Setup logic
  }

  update(time: number, delta: number) {
    // Update logic called every frame
  }
}
```

2. **Initialize in GameStateManager**:
```typescript
export class GameStateManager {
  public newSystem!: NewSystem;

  initialize(scene: Phaser.Scene) {
    this.newSystem = new NewSystem(scene, this);
  }

  update(time: number, delta: number) {
    this.newSystem.update(time, delta);
  }
}
```

---

## ⚡ Performance Considerations

### Optimization Strategies

#### 1. Object Pooling
Reuse objects instead of creating/destroying frequently

#### 2. Spatial Partitioning
Use grid-based lookups (O(1)) instead of iterating all objects (O(n))

#### 3. Update Throttling
Don't update every frame if not needed:
```typescript
private updateCounter = 0;

update(time: number, delta: number) {
  this.updateCounter++;
  if (this.updateCounter % 10 === 0) {
    this.expensiveUpdate();
  }
}
```

#### 4. Memoization
Cache expensive calculations like pathfinding results

### Performance Monitoring

Use the built-in PerformanceMonitor component to track:
- FPS (frames per second)
- Frame time
- Memory usage
- Update time per system

---

## 🧪 Testing

### Manual Testing Checklist

#### Core Functionality
- [ ] Room placement works correctly
- [ ] Residents spawn and move properly
- [ ] Needs decrease and can be satisfied
- [ ] Time progresses through phases
- [ ] Money increases from donations
- [ ] Food decreases with consumption

#### Edge Cases
- [ ] Cannot place rooms out of bounds
- [ ] Cannot place overlapping rooms
- [ ] Cannot spend more money than available
- [ ] Residents don't get stuck
- [ ] Save/load preserves all state

#### UI/UX
- [ ] All buttons are clickable
- [ ] Modals open and close properly
- [ ] Tooltips display correctly
- [ ] Settings persist

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
```

### Preview Production

```bash
npm run build
npm run preview
# Access at http://localhost:4173
```

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Or connect GitHub repository to Vercel for automatic deployments.

---

## 🤝 Contributing Guidelines

### Code Style

#### TypeScript
- Use strict mode
- Explicit return types for functions
- Interfaces over types for objects
- Descriptive variable names

```typescript
// Good
function calculateDonation(reputation: number): number {
  return BASE_DONATION * getReputationMultiplier(reputation);
}

// Bad
function calc(r: number) {
  return 200 * (r / 50);
}
```

#### React Components
- Functional components with hooks
- Props interfaces defined
- CSS modules for styling

```typescript
interface HUDProps {
  money: number;
  reputation: number;
  onPause: () => void;
}

export const HUD: React.FC<HUDProps> = ({ money, reputation, onPause }) => {
  // Component logic
};
```

### Git Workflow

1. **Create feature branch**: `git checkout -b feature/new-feature`
2. **Make changes**: Commit with descriptive messages
3. **Test thoroughly**: Ensure no regressions
4. **Push and create PR**: Request review
5. **Address feedback**: Make requested changes
6. **Merge**: After approval

### Commit Messages

Follow conventional commits:
```
feat: Add new room type (Medical Center)
fix: Resolve pathfinding bug with diagonal movement
docs: Update developer guide with new system
refactor: Optimize resident AI decision making
perf: Improve grid lookup performance
```

---

## 📚 Additional Resources

- **Planning Documents**: See `plans/` directory for detailed specifications
- **Player Guide**: [`PLAYER_GUIDE.md`](PLAYER_GUIDE.md) for gameplay details
- **README**: [`README.md`](README.md) for project overview
- **Changelog**: [`CHANGELOG.md`](CHANGELOG.md) for version history

---

## 🐛 Debugging Tips

### Common Issues

**Residents not moving**:
- Check pathfinding system is initialized
- Verify tiles are marked as walkable
- Ensure destination is valid

**State not updating in React**:
- Verify `onStateChange` callback is set
- Check GameStateManager is notifying changes
- Ensure React component is subscribed

**Performance issues**:
- Enable PerformanceMonitor
- Check for memory leaks
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
```

**Phaser Debug**:
```typescript
// In MainScene
this.scene.scene.systems.displayList.list.length // Object count
```

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/DabideBoi/open-arms/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DabideBoi/open-arms/discussions)
- **Documentation**: This guide and other docs in repository

---

**Happy coding! 🚀**
