import { GameState } from '../../types';

/**
 * TimerManager - Central game clock and timer coordination
 */

// ============================================================================
// Timer Interface
// ============================================================================

interface GameTimer {
  id: string;
  nextTrigger: number;        // Unix timestamp
  interval: number;           // Milliseconds
  callback: (gameState: GameState) => void;
  enabled: boolean;
}

// ============================================================================
// TimerManager Class
// ============================================================================

export class TimerManager {
  private timers: Map<string, GameTimer> = new Map();
  
  /**
   * Register a new timer
   */
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
  
  /**
   * Check all timers and execute callbacks if needed
   */
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
  
  /**
   * Pause a specific timer
   */
  pauseTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) timer.enabled = false;
  }
  
  /**
   * Resume a specific timer
   */
  resumeTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      timer.enabled = true;
      // Adjust next trigger to account for pause time
      timer.nextTrigger = Date.now() + timer.interval;
    }
  }
  
  /**
   * Pause all timers
   */
  pauseAll(): void {
    for (const timer of this.timers.values()) {
      timer.enabled = false;
    }
  }
  
  /**
   * Resume all timers
   */
  resumeAll(): void {
    for (const timer of this.timers.values()) {
      timer.enabled = true;
    }
  }
  
  /**
   * Reset a timer to trigger after its full interval
   */
  resetTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      timer.nextTrigger = Date.now() + timer.interval;
    }
  }
  
  /**
   * Get time until next trigger for a timer
   */
  getTimeUntilTrigger(id: string): number {
    const timer = this.timers.get(id);
    if (!timer) return 0;
    
    return Math.max(0, timer.nextTrigger - Date.now());
  }
  
  /**
   * Remove a timer
   */
  removeTimer(id: string): void {
    this.timers.delete(id);
  }
  
  /**
   * Clear all timers
   */
  clearAll(): void {
    this.timers.clear();
  }
}

// ============================================================================
// Throttled Updater
// ============================================================================

export class ThrottledUpdater {
  private lastUpdate: Map<string, number> = new Map();
  
  /**
   * Check if enough time has passed to update
   */
  shouldUpdate(id: string, interval: number): boolean {
    const now = Date.now();
    const last = this.lastUpdate.get(id) || 0;
    
    if (now - last >= interval * 1000) {
      this.lastUpdate.set(id, now);
      return true;
    }
    
    return false;
  }
  
  /**
   * Force an update to happen next check
   */
  forceUpdate(id: string): void {
    this.lastUpdate.delete(id);
  }
  
  /**
   * Reset all throttles
   */
  reset(): void {
    this.lastUpdate.clear();
  }
}

// ============================================================================
// Game Clock
// ============================================================================

export class GameClock {
  private running: boolean = false;
  private lastUpdateTime: number = 0;
  private timeScale: number = 1.0;
  private updateCallback: ((deltaTime: number) => void) | null = null;
  private animationFrameId: number | null = null;
  
  /**
   * Start the game clock
   */
  start(updateCallback: (deltaTime: number) => void): void {
    this.running = true;
    this.lastUpdateTime = Date.now();
    this.updateCallback = updateCallback;
    this.tick();
  }
  
  /**
   * Stop the game clock
   */
  stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
  
  /**
   * Pause the game clock
   */
  pause(): void {
    this.running = false;
  }
  
  /**
   * Resume the game clock
   */
  resume(): void {
    this.running = true;
    this.lastUpdateTime = Date.now();
    this.tick();
  }
  
  /**
   * Check if clock is running
   */
  isRunning(): boolean {
    return this.running;
  }
  
  /**
   * Set time scale (1.0 = normal, 2.0 = double speed, etc.)
   */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(5.0, scale));
  }
  
  /**
   * Get current time scale
   */
  getTimeScale(): number {
    return this.timeScale;
  }
  
  /**
   * Main tick function
   */
  private tick(): void {
    if (!this.running) return;
    
    const now = Date.now();
    const deltaTime = (now - this.lastUpdateTime) / 1000; // Convert to seconds
    this.lastUpdateTime = now;
    
    // Apply time scale
    const scaledDelta = deltaTime * this.timeScale;
    
    // Call update callback
    if (this.updateCallback) {
      this.updateCallback(scaledDelta);
    }
    
    // Schedule next tick
    this.animationFrameId = requestAnimationFrame(() => this.tick());
  }
}

// ============================================================================
// Pause Manager
// ============================================================================

export class PauseManager {
  private paused: boolean = false;
  private pauseStartTime: number = 0;
  private totalPausedTime: number = 0;
  private pauseCallbacks: Set<() => void> = new Set();
  private resumeCallbacks: Set<() => void> = new Set();
  
  /**
   * Pause the game
   */
  pause(): void {
    if (this.paused) return;
    
    this.paused = true;
    this.pauseStartTime = Date.now();
    
    // Notify listeners
    this.pauseCallbacks.forEach(cb => cb());
  }
  
  /**
   * Resume the game
   */
  resume(): void {
    if (!this.paused) return;
    
    const pauseDuration = Date.now() - this.pauseStartTime;
    this.totalPausedTime += pauseDuration;
    
    this.paused = false;
    
    // Notify listeners
    this.resumeCallbacks.forEach(cb => cb());
  }
  
  /**
   * Toggle pause state
   */
  toggle(): void {
    if (this.paused) {
      this.resume();
    } else {
      this.pause();
    }
  }
  
  /**
   * Check if game is paused
   */
  isPaused(): boolean {
    return this.paused;
  }
  
  /**
   * Get total time spent paused
   */
  getTotalPausedTime(): number {
    return this.totalPausedTime;
  }
  
  /**
   * Register callback for pause event
   */
  onPause(callback: () => void): void {
    this.pauseCallbacks.add(callback);
  }
  
  /**
   * Register callback for resume event
   */
  onResume(callback: () => void): void {
    this.resumeCallbacks.add(callback);
  }
  
  /**
   * Adjust a timestamp for pause duration
   */
  adjustTimestamp(timestamp: number): number {
    if (this.paused) {
      const currentPauseDuration = Date.now() - this.pauseStartTime;
      return timestamp + currentPauseDuration;
    }
    return timestamp;
  }
}
