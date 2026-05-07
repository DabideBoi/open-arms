# Game Loop & Timing

---

## Overview

The Game Loop & Timing system manages the central game clock, coordinates all timer-based systems, handles pause/resume, and calculates offline progress. All recurring timers are managed centrally for consistency.

---

## Central Game Clock

### Game Clock Structure

```typescript
class GameClock {
  private running: boolean = false;
  private lastUpdateTime: number = 0;
  private accumulatedTime: number = 0;
  private timeScale: number = 1.0;
  
  start(): void {
    this.running = true;
    this.lastUpdateTime = Date.now();
    this.tick();
  }
  
  stop(): void {
    this.running = false;
  }
  
  pause(): void {
    this.running = false;
  }
  
  resume(): void {
    this.running = true;
    this.lastUpdateTime = Date.now();
    this.tick();
  }
  
  private tick(): void {
    if (!this.running) return;
    
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;
    
    // Apply time scale
    const scaledDelta = deltaTime * this.timeScale;
    
    // Update game systems
    this.update(scaledDelta);
    
    // Schedule next tick
    requestAnimationFrame(() => this.tick());
  }
  
  private update(deltaTime: number): void {
    // Update all game systems
    updateGameSystems(deltaTime);
  }
  
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(5.0, scale));
  }
}
```

---

## Update Loop

### Main Update Function

```typescript
function updateGameSystems(deltaTime: number): void {
  const gameState = gameStateManager.getState();
  
  // 1. Timer checks (donations, maintenance, day/night)
  checkTimers(gameState);
  
  // 2. Resident AI updates
  updateResidents(gameState, deltaTime);
  
  // 3. Fundraiser progress
  checkFundraiserCompletion(gameState);
  
  // 4. Event expiration
  checkExpiredEvents(gameState);
  
  // 5. Happiness decay (throttled)
  updateHappinessDecay(gameState, deltaTime);
  
  // 6. LIFE meter updates (throttled)
  updateLifeMeters(gameState, deltaTime);
  
  // 7. Warnings and notifications
  checkWarnings(gameState);
  
  // 8. Phaser/PixiJS rendering
  renderGame(gameState);
}
```

---

## Timer Management

### Timer Registry

```typescript
interface GameTimer {
  id: string;
  nextTrigger: number;        // Unix timestamp
  interval: number;           // Milliseconds
  callback: (gameState: GameState) => void;
  enabled: boolean;
}

class TimerManager {
  private timers: Map<string, GameTimer> = new Map();
  
  registerTimer(
    id: string,
    interval: number,
    callback: (gameState: GameState) => void
  ): void {
    this.timers.set(id, {
      id,
      nextTrigger: Date.now() + interval,
      interval,
      callback,
      enabled: true
    });
  }
  
  checkTimers(gameState: GameState): void {
    const now = Date.now();
    
    for (const timer of this.timers.values()) {
      if (!timer.enabled) continue;
      
      if (now >= timer.nextTrigger) {
        // Execute callback
        timer.callback(gameState);
        
        // Schedule next trigger
        timer.nextTrigger = now + timer.interval;
      }
    }
  }
  
  pauseTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) timer.enabled = false;
  }
  
  resumeTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      timer.enabled = true;
      // Adjust next trigger to account for pause time
      timer.nextTrigger = Date.now() + timer.interval;
    }
  }
  
  resetTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      timer.nextTrigger = Date.now() + timer.interval;
    }
  }
}
```

### Timer Registration

```typescript
function initializeTimers(timerManager: TimerManager): void {
  // Donation check (every 5 minutes)
  timerManager.registerTimer(
    "donation_check",
    5 * 60 * 1000,
    (gameState) => checkDonation(gameState)
  );
  
  // Maintenance check (every 15 minutes)
  timerManager.registerTimer(
    "maintenance_check",
    15 * 60 * 1000,
    (gameState) => processMaintenance(gameState)
  );
  
  // Day/Night transition (variable)
  timerManager.registerTimer(
    "day_night_transition",
    8 * 60 * 1000, // Initial: day duration
    (gameState) => checkDayNightTransition(gameState)
  );
  
  // Event scheduling (random 10-30 minutes)
  timerManager.registerTimer(
    "event_trigger",
    20 * 60 * 1000, // Average
    (gameState) => triggerRandomEvent(gameState)
  );
}
```

---

## Update Frequencies

### System Update Rates

```typescript
const UPDATE_FREQUENCIES = {
  // Every frame (60 FPS)
  RENDERING: 1 / 60,
  RESIDENT_MOVEMENT: 1 / 60,
  
  // Once per second (1 FPS)
  RESIDENT_AI_STATE: 1,
  NEED_DETECTION: 1,
  
  // Every 10 seconds (0.1 FPS)
  HAPPINESS_DECAY: 10,
  LIFE_METER_UPDATE: 10,
  WARNING_CHECKS: 10,
  
  // Timer-based (variable)
  DONATION_CHECK: 5 * 60,        // 5 minutes
  MAINTENANCE_CHECK: 15 * 60,    // 15 minutes
  DAY_NIGHT_TRANSITION: null,    // Variable (8 or 4 minutes)
  EVENT_TRIGGER: null            // Random (10-30 minutes)
};
```

### Throttled Updates

```typescript
class ThrottledUpdater {
  private lastUpdate: Map<string, number> = new Map();
  
  shouldUpdate(id: string, interval: number): boolean {
    const now = Date.now();
    const last = this.lastUpdate.get(id) || 0;
    
    if (now - last >= interval * 1000) {
      this.lastUpdate.set(id, now);
      return true;
    }
    
    return false;
  }
}

const throttler = new ThrottledUpdater();

function updateGameSystems(deltaTime: number): void {
  const gameState = gameStateManager.getState();
  
  // Always update
  updateResidentMovement(gameState, deltaTime);
  
  // Throttled updates
  if (throttler.shouldUpdate("resident_ai", 1)) {
    updateResidentAI(gameState);
  }
  
  if (throttler.shouldUpdate("happiness_decay", 10)) {
    updateAllResidentHappiness(gameState, 10);
  }
  
  if (throttler.shouldUpdate("life_meters", 10)) {
    updateAllLifeMeters(gameState, 10);
  }
  
  if (throttler.shouldUpdate("warnings", 10)) {
    checkAllWarnings(gameState);
  }
}
```

---

## Pause & Resume

### Pause System

```typescript
class PauseManager {
  private paused: boolean = false;
  private pauseStartTime: number = 0;
  private totalPausedTime: number = 0;
  
  pause(): void {
    if (this.paused) return;
    
    this.paused = true;
    this.pauseStartTime = Date.now();
    
    // Pause game clock
    gameClock.pause();
    
    // Pause timers
    timerManager.pauseAll();
    
    // Show pause UI
    showPauseMenu();
  }
  
  resume(): void {
    if (!this.paused) return;
    
    const pauseDuration = Date.now() - this.pauseStartTime;
    this.totalPausedTime += pauseDuration;
    
    this.paused = false;
    
    // Adjust all timer next triggers
    adjustTimersForPause(pauseDuration);
    
    // Resume game clock
    gameClock.resume();
    
    // Resume timers
    timerManager.resumeAll();
    
    // Hide pause UI
    hidePauseMenu();
  }
  
  isPaused(): boolean {
    return this.paused;
  }
}

function adjustTimersForPause(pauseDuration: number): void {
  const gameState = gameStateManager.getState();
  
  // Adjust donation check
  gameState.nextDonationCheck += pauseDuration;
  
  // Adjust maintenance check
  gameState.nextMaintenanceCheck += pauseDuration;
  
  // Adjust day/night transition
  gameState.nextDayNightTransition += pauseDuration;
  
  // Adjust fundraiser completion times
  for (const fundraiser of gameState.activeFundraisers) {
    fundraiser.completesAt += pauseDuration;
  }
  
  // Adjust event expiration times
  for (const event of gameState.activeEvents) {
    if (event.expiresAt) {
      event.expiresAt += pauseDuration;
    }
  }
}
```

### Auto-Pause Conditions

```typescript
function setupAutoPause(): void {
  // Pause when tab loses focus
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseManager.pause();
    } else {
      pauseManager.resume();
    }
  });
  
  // Pause when window loses focus
  window.addEventListener("blur", () => {
    pauseManager.pause();
  });
  
  window.addEventListener("focus", () => {
    pauseManager.resume();
  });
}
```

---

## Offline Progress

### Calculate Offline Progress

```typescript
function calculateOfflineProgress(gameState: GameState): void {
  const now = Date.now();
  const timeSinceLastPlayed = now - gameState.lastPlayed;
  
  // Cap offline time to prevent abuse
  const MAX_OFFLINE_TIME = 2 * 60 * 60 * 1000; // 2 hours
  const effectiveOfflineTime = Math.min(timeSinceLastPlayed, MAX_OFFLINE_TIME);
  
  console.log(`Offline for ${Math.floor(effectiveOfflineTime / 60000)} minutes`);
  
  // Calculate offline donations
  const offlineDonations = calculateOfflineDonations(gameState);
  gameState.money += offlineDonations;
  
  // Calculate offline maintenance
  const offlineMaintenance = calculateOfflineMaintenance(gameState);
  gameState.money -= offlineMaintenance.totalCost;
  if (offlineMaintenance.reputationLost < 0) {
    gameState.reputation = Math.max(0, gameState.reputation + offlineMaintenance.reputationLost);
  }
  
  // Calculate offline day/night cycles
  const offlineCycles = calculateOfflineDayNightCycles(gameState);
  gameState.currentDay += offlineCycles.daysElapsed;
  
  // Update resident days
  for (const resident of gameState.residents) {
    resident.daysInShelter += offlineCycles.daysElapsed;
  }
  
  // Show summary
  showOfflineProgressSummary({
    timeAway: effectiveOfflineTime,
    donations: offlineDonations,
    maintenance: offlineMaintenance.totalCost,
    daysElapsed: offlineCycles.daysElapsed
  });
  
  // Update last played time
  gameState.lastPlayed = now;
}
```

### Offline Progress Summary

```typescript
interface OfflineProgressSummary {
  timeAway: number;
  donations: number;
  maintenance: number;
  daysElapsed: number;
}

function showOfflineProgressSummary(summary: OfflineProgressSummary): void {
  const minutes = Math.floor(summary.timeAway / 60000);
  const netIncome = summary.donations - summary.maintenance;
  
  const message = `
Welcome back! You were away for ${minutes} minutes.

While you were gone:
- ${summary.daysElapsed} days passed
- Received $${summary.donations} in donations
- Paid $${summary.maintenance} in maintenance
- Net: ${netIncome >= 0 ? '+' : ''}$${netIncome}
  `.trim();
  
  showNotification(message, "info");
}
```

---

## Performance Monitoring

### Frame Rate Tracking

```typescript
class PerformanceMonitor {
  private frameTimes: number[] = [];
  private lastFrameTime: number = 0;
  
  recordFrame(): void {
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      
      // Keep only last 60 frames
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }
    }
    
    this.lastFrameTime = now;
  }
  
  getAverageFPS(): number {
    if (this.frameTimes.length === 0) return 0;
    
    const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    return 1000 / avgFrameTime;
  }
  
  isPerformanceGood(): boolean {
    return this.getAverageFPS() >= 30;
  }
}

const perfMonitor = new PerformanceMonitor();
```

### Performance Warnings

```typescript
function checkPerformance(): void {
  if (!perfMonitor.isPerformanceGood()) {
    console.warn(`Low FPS: ${perfMonitor.getAverageFPS().toFixed(1)}`);
    
    // Reduce visual effects
    reduceVisualQuality();
  }
}
```

---

## Time Scale

### Speed Control

```typescript
function setGameSpeed(speed: number): void {
  // speed: 0.5 = half speed, 1.0 = normal, 2.0 = double speed
  gameClock.setTimeScale(speed);
  
  showNotification(
    `Game speed: ${speed}x`,
    "info"
  );
}

// Useful for testing or player preference
const SPEED_PRESETS = {
  SLOW: 0.5,
  NORMAL: 1.0,
  FAST: 2.0,
  VERY_FAST: 5.0
};
```

---

## Integration Notes

### All Systems Use Central Clock
- Donations: Timer-based (5 min)
- Maintenance: Timer-based (15 min)
- Day/Night: Timer-based (8/4 min)
- Events: Timer-based (10-30 min)
- Fundraisers: Duration-based
- Resident AI: Frame-based + throttled
- LIFE meters: Throttled (10s)
- Happiness: Throttled (10s)

### Save on Important Events
- After timer triggers
- After resident graduation
- After event resolution
- On pause
- On window blur
- Periodically (every 5 minutes)

### Offline Progress Limits
- Maximum 2 hours of offline progress
- Prevents exploitation
- Encourages regular play
- Still rewards returning players

---

## Debugging Tools

### Time Debug Commands

```typescript
const DEBUG_COMMANDS = {
  skipToNight: () => {
    gameState.nextDayNightTransition = Date.now();
    checkDayNightTransition(gameState);
  },
  
  skipToDay: () => {
    gameState.nextDayNightTransition = Date.now();
    checkDayNightTransition(gameState);
  },
  
  triggerDonation: () => {
    gameState.nextDonationCheck = Date.now();
    checkDonation(gameState);
  },
  
  triggerMaintenance: () => {
    gameState.nextMaintenanceCheck = Date.now();
    processMaintenance(gameState);
  },
  
  advanceDay: () => {
    gameState.currentDay++;
    transitionToDay(gameState);
  }
};
```

### Timer Display

```typescript
function showTimerDebugInfo(): void {
  const gameState = gameStateManager.getState();
  const now = Date.now();
  
  console.log("=== Timer Status ===");
  console.log(`Donation: ${Math.floor((gameState.nextDonationCheck - now) / 1000)}s`);
  console.log(`Maintenance: ${Math.floor((gameState.nextMaintenanceCheck - now) / 1000)}s`);
  console.log(`Day/Night: ${Math.floor((gameState.nextDayNightTransition - now) / 1000)}s`);
  console.log(`Phase: ${gameState.currentPhase}`);
  console.log(`Day: ${gameState.currentDay}`);
}
```
