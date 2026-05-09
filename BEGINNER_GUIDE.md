# 🎓 Open Arms - Beginner's Guide to Understanding the Code

**Welcome!** This guide explains how the Open Arms shelter management game works under the hood. No prior game dev experience needed!

---

## 📚 Table of Contents

1. [What is Open Arms?](#what-is-open-arms)
2. [The Big Picture: How Code Becomes a Game](#the-big-picture)
3. [Tech Stack Explained](#tech-stack-explained)
4. [Architecture: How Everything Connects](#architecture)
5. [Core Algorithms (Simple Pseudocode)](#core-algorithms)
6. [The Game Loop](#the-game-loop)
7. [Resource Management](#resource-management)
8. [From Code to Browser Game](#from-code-to-browser)
9. [Key Takeaways](#key-takeaways)

---

## 🏠 What is Open Arms?

Open Arms is a **shelter management simulation** where you:
- Build and manage a homeless shelter
- Help residents progress toward independence (LIFE meter 0→100%)
- Balance money (donations vs. expenses)
- Make strategic decisions

**Think:** SimCity meets social impact game.

---

## 🎮 The Big Picture

### How Code Becomes a Playable Game

```
Step 1: Write Code
├─ TypeScript files (.ts) = Game logic
├─ React files (.tsx) = UI components
└─ Constants = Game rules & numbers

        ↓

Step 2: Build Process (Vite)
├─ TypeScript → JavaScript
├─ Bundle everything together
└─ Optimize for speed

        ↓

Step 3: Browser Loads
├─ Downloads HTML, CSS, JS
├─ Creates canvas for graphics
└─ Initializes game systems

        ↓

Step 4: Game Runs!
├─ React draws UI (60 FPS)
├─ Phaser renders game world (60 FPS)
├─ Systems update game state
└─ Player interacts and has fun!
```

**Analogy:** 
- Code = Recipe ingredients
- Build = Mixing & preparing
- Browser = The oven
- Running game = Finished meal

---

## 🛠️ Tech Stack Explained

### React 18 - The UI Layer
**What:** Creates buttons, menus, HUD overlays  
**Why:** Auto-updates display when data changes  
**Example:** Money changes → Display updates automatically

```typescript
// React component - updates when money changes
function MoneyDisplay({ money }) {
  return <div>💰 ${money}</div>;
}
```

---

### TypeScript - Type-Safe JavaScript
**What:** JavaScript + type checking  
**Why:** Catches errors before they happen

```typescript
// TypeScript catches this error
let money: number = 1000;
money = "text"; // ❌ Error! Can't assign string to number

// JavaScript allows it (causes bugs later)
let money = 1000;
money = "text"; // ✅ No error, but breaks calculations
```

---

### Phaser 3 - The Game Engine
**What:** Renders graphics and animations  
**Why:** Optimized for 60 FPS performance

**Renders:**
- Grid tiles (10×10 to 25×25)
- Room sprites (dormitories, cafeterias)
- Residents walking around
- Status bars, effects, lighting

**Analogy:** Movie projector showing 60 frames/second

---

### Vite - The Build Tool
**What:** Transforms TypeScript → optimized JavaScript  
**Why:** Fast development + small production files

```bash
npm run dev    # Development (hot reload)
npm run build  # Production (optimized)
```

---

## 🏗️ Architecture

### The 4-Layer System

```
┌─────────────────────────────────────┐
│  LAYER 1: React UI                  │
│  (Buttons, menus, HUD)              │
│  Files: src/components/*.tsx        │
└──────────────┬──────────────────────┘
               │ Events & Updates
┌──────────────┴──────────────────────┐
│  LAYER 2: Game State Manager        │
│  (The "brain" - stores all data)    │
│  File: GameStateManager.ts          │
└──────────────┬──────────────────────┘
               │ Read/Write Data
┌──────────────┴──────────────────────┐
│  LAYER 3: Game Systems              │
│  (The "workers")                    │
│  - PathfindingSystem                │
│  - ResidentAISystem                 │
│  - DonationSystem                   │
│  - GridSystem                       │
│  Files: src/game/systems/*.ts      │
└──────────────┬──────────────────────┘
               │ Render Commands
┌──────────────┴──────────────────────┐
│  LAYER 4: Phaser Renderer           │
│  (The "artist" - draws everything)  │
│  File: MainScene.ts                 │
└─────────────────────────────────────┘
```

### Example: Player Places a Room

```
1. Player clicks "Build Dormitory"
   ↓
2. React → GameStateManager.placeRoom()
   ↓
3. Validate: Money? Space? ✓
   ↓
4. GridSystem updates tiles
   ↓
5. Phaser draws room sprite
   ↓
6. React updates money display
```

---

## 🧮 Core Algorithms

### Algorithm 1: A* Pathfinding
**Purpose:** Find shortest path from A to B

**Simple Explanation:**
1. Start at current position
2. Check neighbors, calculate cost to reach goal
3. Always explore cheapest path first
4. Repeat until goal reached

**Pseudocode (Simple!):**
```
FUNCTION findPath(start, goal):
    openList = [start]
    closedList = []
    
    WHILE openList not empty:
        current = tile with lowest cost in openList
        
        IF current == goal:
            RETURN reconstructPath(current)
        
        move current to closedList
        
        FOR each neighbor of current:
            IF neighbor walkable AND not in closedList:
                calculate cost
                add to openList with parent = current
    
    RETURN null  // No path found
```

**Visual:**
```
Grid: S=Start, G=Goal, #=Wall, .=Open

. . . # . . .
. # . # . . G
. # . . . . .
S . . # # . .

Path found: S → → → ↑ → → → G
```

---

### Algorithm 2: Resident AI State Machine
**Purpose:** Control what residents do (eat, sleep, learn)

**States:**
```
IDLE → SEEKING_NEED → PATHFINDING → IN_USE → SATISFIED → IDLE
```

**Pseudocode:**
```
FUNCTION updateResident(resident):
    SWITCH resident.state:
        CASE "idle":
            need = checkNeeds(resident)
            IF need exists:
                resident.state = "seeking_need"
        
        CASE "seeking_need":
            room = findNearestRoom(resident, need)
            IF room found:
                resident.path = calculatePath(resident, room)
                resident.state = "pathfinding"
        
        CASE "pathfinding":
            moveAlongPath(resident)
            IF arrived:
                resident.state = "in_use"
        
        CASE "in_use":
            applyRoomEffects(resident, room)
            IF need satisfied:
                resident.state = "satisfied"
        
        CASE "satisfied":
            resident.state = "idle"
```

---

### Algorithm 3: Grid Building System
**Purpose:** Place rooms on grid without overlaps

**Pseudocode:**
```
FUNCTION placeRoom(roomType, x, y):
    // Check if valid
    IF not enough money:
        RETURN "Insufficient funds"
    
    IF tiles occupied:
        RETURN "Space not available"
    
    IF outside grid bounds:
        RETURN "Out of bounds"
    
    // Place room
    create room object
    mark tiles as occupied
    deduct money
    
    RETURN "Success"
```

**Visual:**
```
Before:
┌─┬─┬─┬─┐
│ │ │ │ │
├─┼─┼─┼─┤
│ │ │ │ │
└─┴─┴─┴─┘

After placing 2×2 room at (1,0):
┌─┬─┬─┬─┐
│ │R│R│ │
├─┼─┼─┼─┤
│ │R│R│ │
└─┴─┴─┴─┘
```

---

### Algorithm 4: Day/Night Cycle
**Purpose:** Transition between day (4 min) and night (2 min)

**Pseudocode:**
```
FUNCTION checkDayNight(gameState):
    IF currentTime >= nextTransition:
        IF phase == "day":
            transitionToNight()
        ELSE:
            transitionToDay()

FUNCTION transitionToDay():
    phase = "day"
    nextTransition = now + 4 minutes
    wakeUpResidents()
    deductDailyCosts()
    dayCounter++

FUNCTION transitionToNight():
    phase = "night"
    nextTransition = now + 2 minutes
    sendResidentsToSleep()
```

---

### Algorithm 5: Donation System
**Purpose:** Calculate money from donations

**Formula:**
```
Donation = BaseAmount × Reputation × Random × Graduates

Where:
- BaseAmount = ResidentCount × $25
- Reputation = 0.5 to 1.5 (based on reputation %)
- Random = 0.8 to 1.2 (adds variety)
- Graduates = 1 + (GraduatedCount × 0.1)
```

**Pseudocode:**
```
FUNCTION checkDonation(gameState):
    IF time for donation check (every 90 sec):
        chance = reputation / 100
        
        IF random() < chance:
            amount = calculateDonation(gameState)
            money += amount
            showNotification("Donation: $" + amount)

FUNCTION calculateDonation(gameState):
    base = residentCount × 25
    repMod = 0.5 + (reputation / 100)
    randomMod = 0.8 + (random() × 0.4)
    gradMod = 1 + (graduatedCount × 0.1)
    
    RETURN base × repMod × randomMod × gradMod
```

**Example:**
```
15 residents, 75% reputation, 10 graduates
base = 15 × 25 = 375
repMod = 0.5 + 0.75 = 1.25
randomMod = 1.0 (average)
gradMod = 1 + (10 × 0.1) = 2.0

Result = 375 × 1.25 × 1.0 × 2.0 = $937
```

---

### Algorithm 6: LIFE Meter Progression
**Purpose:** Calculate how fast residents reach graduation (100%)

**Formula:**
```
FillRate = BaseRate × Multipliers

Multipliers:
- Reputation (0-100%)
- Happiness (0-100%)
- Activity (Learning=100%, Eating=50%, Idle=10%)
- Food Quality (0.5x to 1.5x)
- Room Adjacency (0.9x to 1.15x)
```

**Pseudocode:**
```
FUNCTION updateLIFE(resident, deltaTime):
    baseRate = getProfileRate(resident)  // e.g., 60%/hour
    
    repMult = reputation / 100
    happyMult = happiness / 100
    activityMult = getActivityRate(resident)  // What they're doing
    foodMult = getFoodQuality()
    adjacencyMult = getRoomBonus(resident)
    
    totalMult = (repMult + happyMult) / 2
    totalMult × activityMult × foodMult × adjacencyMult
    
    increase = baseRate × totalMult × deltaTime
    lifeMeter += increase
    
    IF lifeMeter >= 100:
        graduateResident()
```

---

## ⚙️ The Game Loop

### How the Game Updates 60 Times Per Second

```
FUNCTION gameLoop():
    EVERY FRAME (60 FPS):
        deltaTime = timeSinceLastFrame
        
        // 1. Check timers
        checkDonations()
        checkDayNight()
        checkMaintenance()
        
        // 2. Update residents
        FOR each resident:
            updateResidentAI(resident, deltaTime)
            updateResidentMovement(resident, deltaTime)
            updateLIFEMeter(resident, deltaTime)
        
        // 3. Update systems
        updateHappinessDecay(deltaTime)
        checkWarnings()
        
        // 4. Render
        phaserRenderer.draw()
        reactUI.update()
        
        // 5. Save (periodically)
        IF time to save:
            saveToLocalStorage()
```

### Update Frequencies

| System | Frequency | Why |
|--------|-----------|-----|
| Rendering | 60 FPS | Smooth visuals |
| Movement | 60 FPS | Smooth walking |
| AI State | 1 FPS | Decisions don't need 60 FPS |
| LIFE/Happiness | 0.1 FPS (every 10s) | Gradual changes |
| Donations | Every 90 seconds | Timer-based |
| Day/Night | Every 4/2 minutes | Timer-based |

---

## 💰 Resource Management

### Money Flow

```
INCOME:
├─ Donations (every 90 sec)
│  Amount = residents × $25 × reputation × graduates
├─ Fundraisers (manual)
│  Amount = $150-350 (if successful)
└─ Graduation bonuses
   Amount = $500 + reputation boost

EXPENSES:
├─ Daily operating costs
│  $100 + $5/resident + $10/room
├─ Food costs
│  $5-50 per resident (based on portion)
├─ Maintenance (every 5 min)
│  Sum of all room maintenance costs
└─ Random events (15% chance)
   $50-200 emergencies
```

### Reputation System

```
REPUTATION CHANGES:
+5  Resident graduates
+2  Fundraiser succeeds
+1  Premium food (daily)
-3  Resident leaves unhappy
-5  Disaster rejected
-2  Maintenance missed (per room)
-1  Overcrowding (daily)

Reputation affects:
- Donation chance (0-100%)
- Donation amount (0.5x to 1.5x)
- Resident spawn rate
- LIFE meter fill rate
```

---

## 🌐 From Code to Browser Game

### The Build Process

```
1. Development (npm run dev)
   ├─ Vite starts dev server
   ├─ TypeScript compiles on-the-fly
   ├─ Hot reload (see changes instantly)
   └─ Source maps (debug original code)

2. Production (npm run build)
   ├─ TypeScript → JavaScript
   ├─ Minify code (remove spaces, shorten names)
   ├─ Bundle files (combine into fewer files)
   ├─ Tree-shake (remove unused code)
   └─ Output to dist/ folder

3. Browser Loads
   ├─ index.html loads
   ├─ Downloads bundled JS/CSS
   ├─ React initializes
   ├─ Phaser creates canvas
   ├─ Game systems start
   └─ Game loop begins!
```

### File Structure

```
open-arms/
├── src/
│   ├── main.tsx              # Entry point
│   ├── App.tsx               # Main React component
│   ├── components/           # UI components (14 files)
│   │   ├── HUD.tsx          # Top bar (money, day, etc.)
│   │   ├── BuildMenu.tsx    # Room building interface
│   │   └── ...
│   ├── game/
│   │   ├── PhaserGame.ts    # Phaser initialization
│   │   ├── scenes/
│   │   │   └── MainScene.ts # Main game scene
│   │   └── systems/         # Game logic (20 systems)
│   │       ├── PathfindingSystem.ts
│   │       ├── ResidentAISystem.ts
│   │       ├── DonationSystem.ts
│   │       ├── GridSystem.ts
│   │       └── ...
│   ├── types/               # TypeScript types
│   └── constants/           # Game configuration
├── public/                  # Static assets
│   └── assets/
│       └── rooms/           # Room images
└── plans/                   # Design documents
```

### How Systems Connect

```typescript
// 1. React UI calls game function
function BuildMenu() {
  const handleBuild = (roomType) => {
    placeRoom(roomType, x, y);  // Call game system
  };
}

// 2. Game system updates state
function placeRoom(roomType, x, y) {
  const state = gameStateManager.getState();
  
  if (canPlace(state, roomType, x, y)) {
    state.money -= roomCost;
    state.rooms.push(newRoom);
    gameStateManager.forceUpdate();  // Notify subscribers
  }
}

// 3. React auto-updates display
function MoneyDisplay() {
  const gameState = useGameState();  // Subscribes to changes
  return <div>${gameState.money}</div>;  // Auto-updates!
}
```

---

## 🎯 Key Takeaways

### 1. **Separation of Concerns**
- React = UI (what you see)
- Game Systems = Logic (how it works)
- Phaser = Rendering (drawing graphics)
- Each layer has one job

### 2. **State Management**
- One central GameState object
- All systems read/write to it
- Changes trigger UI updates
- Saved to localStorage

### 3. **The Game Loop**
- Runs 60 times per second
- Updates game state
- Renders graphics
- Handles player input

### 4. **Algorithms Are Simple**
- A* pathfinding: Find shortest path
- State machines: Control behavior
- Formulas: Calculate values
- Timers: Schedule events

### 5. **TypeScript Helps**
- Catches errors early
- Documents code structure
- Makes refactoring safe
- Improves IDE support

### 6. **Build Process**
- Development: Fast, debuggable
- Production: Small, optimized
- Vite handles complexity
- One command to build

---

## 🚀 Next Steps

Want to dive deeper?

1. **Read the code:**
   - Start with `src/main.tsx` (entry point)
   - Then `src/App.tsx` (main component)
   - Explore `src/game/systems/` (game logic)

2. **Modify something:**
   - Change donation amount in `constants/index.ts`
   - Add a new room type
   - Adjust LIFE meter fill rate

3. **Run the game:**
   ```bash
   npm install
   npm run dev
   ```

4. **Check other docs:**
   - `DEVELOPER_GUIDE.md` - Technical details
   - `PLAYER_GUIDE.md` - How to play
   - `plans/` folder - Design documents

---

## 📖 Glossary

**Terms you'll see in the code:**

- **State:** Current game data (money, residents, rooms)
- **Component:** Reusable UI piece (button, menu, modal)
- **System:** Game logic module (pathfinding, donations)
- **Delta Time:** Time since last frame (for smooth updates)
- **Render:** Draw graphics on screen
- **Hook:** React function that connects to state
- **Event:** Something that happened (click, timer, etc.)
- **Callback:** Function called when event happens
- **Async:** Code that runs in background
- **Bundle:** Combined JavaScript files

---

## 💡 Common Questions

**Q: Why use TypeScript instead of JavaScript?**  
A: Catches bugs before runtime, better IDE support, documents code structure.

**Q: Why separate React and Phaser?**  
A: React for UI (menus, buttons), Phaser for game world (grid, residents). Each tool does what it's best at.

**Q: How does the game run at 60 FPS?**  
A: The game loop runs 60 times/second using `requestAnimationFrame()`. Each frame updates state and renders.

**Q: Where is game data saved?**  
A: Browser's localStorage. Persists between sessions, cleared if you clear browser data.

**Q: Can I modify the game?**  
A: Yes! It's open source. Change constants, add features, experiment. See DEVELOPER_GUIDE.md.

**Q: Why are there so many files?**  
A: Separation of concerns. Each file has one job. Makes code easier to understand and maintain.

---

**Made with ❤️ to teach game development concepts**

*Now you understand how code becomes a game!* 🎮
