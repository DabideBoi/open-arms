# Day/Night Cycle

---

## Overview

The Day/Night Cycle creates a natural rhythm of activity and rest. Days last 8 minutes, nights last 4 minutes (12 minutes total per full cycle). The cycle affects room availability, resident behavior, and visual presentation.

---

## Cycle Configuration

### Timing

```typescript
const DAY_NIGHT_CONFIG = {
  DAY_DURATION: 8 * 60 * 1000,       // 8 minutes in milliseconds
  NIGHT_DURATION: 4 * 60 * 1000,     // 4 minutes in milliseconds
  FULL_CYCLE: 12 * 60 * 1000         // 12 minutes total
};

type Phase = "day" | "night";
```

---

## Phase Transitions

### Transition to Day

```typescript
function transitionToDay(gameState: GameState): void {
  console.log(`☀️ Day ${gameState.currentDay} begins`);
  
  // Update phase
  gameState.currentPhase = "day";
  
  // Schedule next transition (to night)
  gameState.nextDayNightTransition = Date.now() + DAY_NIGHT_CONFIG.DAY_DURATION;
  
  // Open day-only rooms
  updateRoomsForPhase(gameState.rooms, "day");
  
  // Process daily food
  processDailyFood(gameState);
  
  // Increment day counter
  gameState.currentDay++;
  
  // Update resident days in shelter
  for (const resident of gameState.residents) {
    resident.daysInShelter++;
  }
  
  // Wake up residents
  wakeUpResidents(gameState);
  
  // Apply visual changes
  applyDayVisuals();
  
  // Trigger UI update
  emitGameEvent("phase_changed", { phase: "day", day: gameState.currentDay });
  
  showNotification(`☀️ Day ${gameState.currentDay}`, "info");
}
```

### Transition to Night

```typescript
function transitionToNight(gameState: GameState): void {
  console.log("🌙 Night falls");
  
  // Update phase
  gameState.currentPhase = "night";
  
  // Schedule next transition (to day)
  gameState.nextDayNightTransition = Date.now() + DAY_NIGHT_CONFIG.NIGHT_DURATION;
  
  // Close night-closing rooms
  updateRoomsForPhase(gameState.rooms, "night");
  
  // Send residents to sleep
  sendResidentsToSleep(gameState);
  
  // Apply visual changes
  applyNightVisuals();
  
  // Trigger UI update
  emitGameEvent("phase_changed", { phase: "night", day: gameState.currentDay });
  
  showNotification("🌙 Night time", "info");
}
```

### Check Phase Transition

```typescript
function checkDayNightTransition(gameState: GameState): void {
  const now = Date.now();
  
  if (now >= gameState.nextDayNightTransition) {
    if (gameState.currentPhase === "day") {
      transitionToNight(gameState);
    } else {
      transitionToDay(gameState);
    }
  }
}
```

---

## Room Behavior

### Update Rooms for Phase

```typescript
function updateRoomsForPhase(rooms: Room[], phase: Phase): void {
  for (const room of rooms) {
    const spec = ROOM_SPECS[room.type];
    
    if (spec.closesAtNight) {
      room.isOpen = phase === "day";
      
      // If closing, reset occupancy
      if (!room.isOpen) {
        room.currentOccupancy = 0;
      }
    }
  }
}
```

### Rooms That Close at Night

```typescript
const NIGHT_CLOSING_ROOMS: RoomType[] = [
  "cafeteria",
  "learning_center",
  "vocational_room",
  "admin_office",
  "fundraiser_station"
];

const ALWAYS_OPEN_ROOMS: RoomType[] = [
  "dormitory",
  "bathroom",
  "common_room"  // Optional - can be configured
];
```

---

## Resident Behavior

### Send Residents to Sleep

```typescript
function sendResidentsToSleep(gameState: GameState): void {
  for (const resident of gameState.residents) {
    // Interrupt current activity
    if (resident.currentState === "in_use" || resident.currentState === "pathfinding") {
      // Leave current room
      if (resident.targetRoomId) {
        const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
        if (room) {
          leaveRoom(room, resident.id);
        }
      }
    }
    
    // Set need to sleep
    resident.currentNeed = "sleep";
    resident.currentState = "seeking_need";
    resident.path = null;
    resident.pathIndex = 0;
  }
}
```

### Wake Up Residents

```typescript
function wakeUpResidents(gameState: GameState): void {
  for (const resident of gameState.residents) {
    if (resident.currentState === "sleeping") {
      // Leave dormitory
      if (resident.targetRoomId) {
        const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
        if (room) {
          leaveRoom(room, resident.id);
        }
      }
      
      // Return to idle
      resident.currentState = "idle";
      resident.currentNeed = null;
      resident.targetRoomId = null;
    }
  }
}
```

### Sleep Happiness Restoration

```typescript
function updateSleepingResident(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  if (resident.currentState !== "sleeping") return;
  if (gameState.currentPhase !== "night") return;
  
  // Restore happiness while sleeping
  const HAPPINESS_RESTORE_RATE = 15; // Per hour
  const restorePerSecond = HAPPINESS_RESTORE_RATE / 3600;
  const restore = restorePerSecond * deltaTime;
  
  resident.happiness = Math.min(100, resident.happiness + restore);
}
```

---

## Visual Treatment

### Day Visuals

```typescript
function applyDayVisuals(): void {
  // Phaser/PixiJS rendering changes
  
  // 1. Lighting
  setAmbientLight(1.0); // Full brightness
  setColorTint(0xFFFFFF); // Neutral white
  
  // 2. Sky/Background
  setSkyColor(0x87CEEB); // Sky blue
  
  // 3. Room lighting
  for (const room of rooms) {
    setRoomLighting(room, 1.0);
  }
  
  // 4. UI indicator
  setPhaseIcon("☀️");
}
```

### Night Visuals

```typescript
function applyNightVisuals(): void {
  // Phaser/PixiJS rendering changes
  
  // 1. Lighting
  setAmbientLight(0.4); // Dimmed
  setColorTint(0x4444AA); // Cool blue tint
  
  // 2. Sky/Background
  setSkyColor(0x1a1a2e); // Dark blue
  
  // 3. Room lighting (warm glow from windows)
  for (const room of rooms) {
    if (room.isOpen) {
      setRoomLighting(room, 0.8);
      setRoomGlow(room, 0xFFAA44); // Warm orange glow
    } else {
      setRoomLighting(room, 0.3);
    }
  }
  
  // 4. UI indicator
  setPhaseIcon("🌙");
  
  // 5. Stars/moon
  showStars(true);
}
```

### Transition Animation

```typescript
function animatePhaseTransition(fromPhase: Phase, toPhase: Phase, duration: number = 2000): void {
  const startTime = Date.now();
  
  function updateTransition() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Smooth easing
    const eased = easeInOutCubic(progress);
    
    if (toPhase === "night") {
      // Day to night
      setAmbientLight(1.0 - (0.6 * eased));
      const tint = lerpColor(0xFFFFFF, 0x4444AA, eased);
      setColorTint(tint);
    } else {
      // Night to day
      setAmbientLight(0.4 + (0.6 * eased));
      const tint = lerpColor(0x4444AA, 0xFFFFFF, eased);
      setColorTint(tint);
    }
    
    if (progress < 1) {
      requestAnimationFrame(updateTransition);
    }
  }
  
  updateTransition();
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpColor(color1: number, color2: number, t: number): number {
  const r1 = (color1 >> 16) & 0xFF;
  const g1 = (color1 >> 8) & 0xFF;
  const b1 = color1 & 0xFF;
  
  const r2 = (color2 >> 16) & 0xFF;
  const g2 = (color2 >> 8) & 0xFF;
  const b2 = color2 & 0xFF;
  
  const r = Math.floor(r1 + (r2 - r1) * t);
  const g = Math.floor(g1 + (g2 - g1) * t);
  const b = Math.floor(b1 + (b2 - b1) * t);
  
  return (r << 16) | (g << 8) | b;
}
```

---

## UI Integration

### Phase Indicator

```typescript
function getPhaseDisplay(gameState: GameState): {
  icon: string;
  label: string;
  timeRemaining: string;
  progress: number;
} {
  const now = Date.now();
  const remaining = gameState.nextDayNightTransition - now;
  
  const phase = gameState.currentPhase;
  const duration = phase === "day" 
    ? DAY_NIGHT_CONFIG.DAY_DURATION 
    : DAY_NIGHT_CONFIG.NIGHT_DURATION;
  
  const elapsed = duration - remaining;
  const progress = (elapsed / duration) * 100;
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  const timeRemaining = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  return {
    icon: phase === "day" ? "☀️" : "🌙",
    label: phase === "day" ? `Day ${gameState.currentDay}` : "Night",
    timeRemaining,
    progress
  };
}
```

### Phase Progress Bar

```typescript
function renderPhaseProgressBar(x: number, y: number, width: number): void {
  const display = getPhaseDisplay(gameState);
  const fillWidth = (display.progress / 100) * width;
  
  // Background
  drawRect(x, y, width, 20, "#333333");
  
  // Fill (different color for day/night)
  const fillColor = gameState.currentPhase === "day" ? "#FFD700" : "#4444AA";
  drawRect(x, y, fillWidth, 20, fillColor);
  
  // Icon and text
  drawText(display.icon, x + 5, y + 10);
  drawText(display.label, x + 30, y + 10);
  drawText(display.timeRemaining, x + width - 50, y + 10);
}
```

---

## Design Implications

### Planning Window

Night provides a natural pause for players to:
- Review statistics
- Plan room construction
- Set up fundraisers for the next day
- Adjust food settings
- Check finances

### Progression Gating

- LIFE meter only fills during the day
- Fundraisers only run during the day
- Forces players to optimize daytime activities

### Dormitory Importance

- Residents must have dormitories to sleep
- Overcrowded dormitories = unhappy residents in morning
- Missing dormitories = residents can't sleep properly

---

## Dormitory Requirements

### Calculate Required Dormitories

```typescript
function getRequiredDormitories(residentCount: number): number {
  const CAPACITY_PER_DORM = ROOM_SPECS.dormitory.capacity; // 4
  return Math.ceil(residentCount / CAPACITY_PER_DORM);
}

function checkDormitoryCapacity(gameState: GameState): {
  required: number;
  available: number;
  sufficient: boolean;
} {
  const required = getRequiredDormitories(gameState.residents.length);
  const dormitories = gameState.rooms.filter(r => r.type === "dormitory");
  const available = dormitories.length;
  
  return {
    required,
    available,
    sufficient: available >= required
  };
}
```

### Dormitory Warning

```typescript
function checkDormitoryWarning(gameState: GameState): void {
  const capacity = checkDormitoryCapacity(gameState);
  
  if (!capacity.sufficient && gameState.currentPhase === "day") {
    showNotification(
      `⚠️ Need ${capacity.required} dormitories for ${gameState.residents.length} residents. Currently have ${capacity.available}.`,
      "warning"
    );
  }
}
```

---

## Offline Progress

### Calculate Offline Cycles

```typescript
function calculateOfflineDayNightCycles(gameState: GameState): {
  fullCycles: number;
  daysElapsed: number;
} {
  const now = Date.now();
  const timeSinceLastPlayed = now - gameState.lastPlayed;
  
  const fullCycles = Math.floor(timeSinceLastPlayed / DAY_NIGHT_CONFIG.FULL_CYCLE);
  const daysElapsed = fullCycles; // 1 full cycle = 1 day
  
  return {
    fullCycles,
    daysElapsed
  };
}

function applyOfflineDayNightProgress(gameState: GameState): void {
  const offline = calculateOfflineDayNightCycles(gameState);
  
  if (offline.daysElapsed > 0) {
    // Cap offline days to prevent abuse
    const MAX_OFFLINE_DAYS = 10;
    const actualDays = Math.min(offline.daysElapsed, MAX_OFFLINE_DAYS);
    
    // Advance day counter
    gameState.currentDay += actualDays;
    
    // Process food for each day
    for (let i = 0; i < actualDays; i++) {
      processDailyFood(gameState);
    }
    
    // Update resident days
    for (const resident of gameState.residents) {
      resident.daysInShelter += actualDays;
    }
    
    showNotification(
      `⏰ ${actualDays} days passed while you were away`,
      "info"
    );
  }
  
  // Determine current phase based on time
  const timeInCurrentCycle = (now - gameState.lastPlayed) % DAY_NIGHT_CONFIG.FULL_CYCLE;
  gameState.currentPhase = timeInCurrentCycle < DAY_NIGHT_CONFIG.DAY_DURATION ? "day" : "night";
  
  // Set next transition time
  if (gameState.currentPhase === "day") {
    const timeLeftInDay = DAY_NIGHT_CONFIG.DAY_DURATION - timeInCurrentCycle;
    gameState.nextDayNightTransition = now + timeLeftInDay;
  } else {
    const timeLeftInNight = DAY_NIGHT_CONFIG.FULL_CYCLE - timeInCurrentCycle;
    gameState.nextDayNightTransition = now + timeLeftInNight;
  }
}
```

---

## Balancing Notes

### Cycle Duration

**Day: 8 minutes**
- Enough time for residents to:
  - Seek and use learning centers (2-3 visits)
  - Participate in activities
  - Satisfy multiple needs
- Not so long that players get bored

**Night: 4 minutes**
- Short enough to not feel like dead time
- Long enough for planning
- Provides meaningful happiness restoration

**Full Cycle: 12 minutes**
- ~5 full days per hour of play
- Allows for meaningful progression
- Frequent enough to maintain engagement

---

## Integration Notes

### Food System Integration
- Food is consumed at the start of each day
- Daily food costs are a key economic pressure
- See [`09-Food-System.md`](09-Food-System.md)

### Resident AI Integration
- Residents automatically seek dormitories at night
- Sleep restores happiness
- Day/night affects need priorities
- See [`06-Resident-AI-System.md`](06-Resident-AI-System.md)

### Room System Integration
- Rooms open/close based on phase
- Dormitories are critical for night
- See [`04-Grid-Building-System.md`](04-Grid-Building-System.md)

### LIFE Meter Integration
- LIFE meter only fills during day
- Night provides no progression
- Encourages efficient daytime use
- See [`10-LIFE-Meter-System.md`](10-LIFE-Meter-System.md)

---

## Future Enhancements

### Potential Additions

1. **Weather System**
   - Rain, snow, sunny days
   - Affects resident mood
   - Visual variety

2. **Seasonal Cycle**
   - Winter: higher heating costs
   - Summer: more volunteers
   - Spring/Fall: balanced

3. **Weekend vs. Weekday**
   - More volunteers on weekends
   - Different donation patterns
   - Special weekend events

4. **Time Acceleration**
   - Player can speed up time
   - Useful during night
   - Risk of missing events
