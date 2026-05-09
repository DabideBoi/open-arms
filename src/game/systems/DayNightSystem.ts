import { GameState, Room, Resident, DayPhase } from '../../types';
import { getActiveTimerConfig, ROOM_SPECS } from '../../constants';
import { processDailyFood } from './FoodSystem';
import { deductDailyOperatingCosts } from './DonationSystem';
import { applyReputationDecay } from './ReputationSystem';

/**
 * DayNightSystem - Manages day/night cycle and phase transitions
 * Now with faster 6-minute full day cycle (4 min day, 2 min night)
 */

// ============================================================================
// Phase Transition Functions
// ============================================================================

/**
 * Transition to day phase
 */
export function transitionToDay(gameState: GameState): void {
  console.log(`☀️ Day ${gameState.currentDay} begins`);
  
  // Update phase
  gameState.currentPhase = "day";
  
  // Schedule next transition (to night)
  const TIMER_CONFIG = getActiveTimerConfig();
  gameState.nextDayNightTransition = Date.now() + TIMER_CONFIG.DAY_DURATION;
  
  // Open day-only rooms
  updateRoomsForPhase(gameState.rooms, "day");
  
  // Increment day counter
  gameState.currentDay++;
  
  // Update resident days in shelter
  for (const resident of gameState.residents) {
    resident.daysInShelter++;
  }
  
  // Deduct daily operating costs at the start of each day
  deductDailyOperatingCosts(gameState);
  
  // Process daily food consumption
  processDailyFood(gameState);
  
  // Apply reputation decay at day transition
  applyReputationDecay(gameState);
  
  // Wake up residents
  wakeUpResidents(gameState);
}

/**
 * Transition to night phase
 */
export function transitionToNight(gameState: GameState): void {
  console.log("🌙 Night falls");
  
  // Update phase
  gameState.currentPhase = "night";
  
  // Schedule next transition (to day)
  const TIMER_CONFIG = getActiveTimerConfig();
  gameState.nextDayNightTransition = Date.now() + TIMER_CONFIG.NIGHT_DURATION;
  
  // Close night-closing rooms
  updateRoomsForPhase(gameState.rooms, "night");
  
  // Send residents to sleep
  sendResidentsToSleep(gameState);
}

/**
 * Check if it's time for a phase transition
 */
export function checkDayNightTransition(gameState: GameState): void {
  const now = Date.now();
  
  if (now >= gameState.nextDayNightTransition) {
    if (gameState.currentPhase === "day") {
      transitionToNight(gameState);
    } else {
      transitionToDay(gameState);
    }
  }
}

// ============================================================================
// Room Management
// ============================================================================

/**
 * Update room availability based on phase
 */
export function updateRoomsForPhase(rooms: Room[], phase: DayPhase): void {
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

// ============================================================================
// Resident Behavior
// ============================================================================

/**
 * Send all residents to sleep at night
 */
export function sendResidentsToSleep(gameState: GameState): void {
  for (const resident of gameState.residents) {
    // Interrupt current activity
    if (resident.currentState === "in_use" || resident.currentState === "pathfinding") {
      // Leave current room
      if (resident.targetRoomId) {
        const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
        if (room && room.currentOccupancy > 0) {
          room.currentOccupancy--;
        }
      }
    }
    
    // Set need to sleep
    resident.currentNeed = "sleep";
    resident.currentState = "seeking_need";
    resident.path = null;
    resident.pathIndex = 0;
    resident.targetRoomId = null;
  }
}

/**
 * Wake up all sleeping residents
 */
export function wakeUpResidents(gameState: GameState): void {
  for (const resident of gameState.residents) {
    if (resident.currentState === "sleeping") {
      // Leave dormitory
      if (resident.targetRoomId) {
        const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
        if (room && room.currentOccupancy > 0) {
          room.currentOccupancy--;
        }
      }
      
      // Apply +30 happiness increase from sleep (capped at 100)
      const previousHappiness = resident.happiness;
      resident.happiness = Math.min(100, resident.happiness + 30);
      const happinessGain = resident.happiness - previousHappiness;
      
      // Clear sleep position lock
      resident.sleepX = null;
      resident.sleepY = null;
      
      // Return to idle
      resident.currentState = "idle";
      resident.currentNeed = null;
      resident.targetRoomId = null;
      
      console.log(`☀️ ${resident.name} woke up from sleep (+${happinessGain} happiness)`);
    }
  }
}

/**
 * Update sleeping resident (restore happiness)
 */
export function updateSleepingResident(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  if (resident.currentState !== "sleeping") return;
  if (gameState.currentPhase !== "night") return;
  
  // Restore happiness while sleeping (15 per hour)
  const HAPPINESS_RESTORE_RATE = 15;
  const restorePerSecond = HAPPINESS_RESTORE_RATE / 3600;
  const restore = restorePerSecond * deltaTime;
  
  resident.happiness = Math.min(100, resident.happiness + restore);
}

// ============================================================================
// Phase Display Information
// ============================================================================

/**
 * Get display information for current phase
 */
export function getPhaseDisplay(gameState: GameState): {
  icon: string;
  label: string;
  timeRemaining: string;
  progress: number;
} {
  const now = Date.now();
  const remaining = gameState.nextDayNightTransition - now;
  
  const phase = gameState.currentPhase;
  const TIMER_CONFIG = getActiveTimerConfig();
  const duration = phase === "day"
    ? TIMER_CONFIG.DAY_DURATION
    : TIMER_CONFIG.NIGHT_DURATION;
  
  const elapsed = duration - remaining;
  const progress = Math.max(0, Math.min(100, (elapsed / duration) * 100));
  
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

// ============================================================================
// Dormitory Requirements
// ============================================================================

/**
 * Calculate required dormitories for current residents
 */
export function getRequiredDormitories(residentCount: number): number {
  const CAPACITY_PER_DORM = ROOM_SPECS.dormitory.capacity; // 4
  return Math.ceil(residentCount / CAPACITY_PER_DORM);
}

/**
 * Check dormitory capacity
 */
export function checkDormitoryCapacity(gameState: GameState): {
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

// ============================================================================
// Offline Progress
// ============================================================================

/**
 * Calculate offline day/night cycles
 */
export function calculateOfflineDayNightCycles(gameState: GameState): {
  fullCycles: number;
  daysElapsed: number;
} {
  const now = Date.now();
  const timeSinceLastPlayed = now - gameState.lastPlayed;
  
  const TIMER_CONFIG = getActiveTimerConfig();
  const fullCycles = Math.floor(timeSinceLastPlayed / TIMER_CONFIG.FULL_DAY_CYCLE);
  const daysElapsed = fullCycles; // 1 full cycle = 1 day
  
  return {
    fullCycles,
    daysElapsed
  };
}

/**
 * Apply offline day/night progress
 */
export function applyOfflineDayNightProgress(gameState: GameState): void {
  const offline = calculateOfflineDayNightCycles(gameState);
  
  if (offline.daysElapsed > 0) {
    // Cap offline days to prevent abuse
    const MAX_OFFLINE_DAYS = 10;
    const actualDays = Math.min(offline.daysElapsed, MAX_OFFLINE_DAYS);
    
    // Advance day counter
    gameState.currentDay += actualDays;
    
    // Update resident days
    for (const resident of gameState.residents) {
      resident.daysInShelter += actualDays;
    }
    
    console.log(`⏰ ${actualDays} days passed while you were away`);
  }
  
  // Determine current phase based on time
  const now = Date.now();
  const TIMER_CONFIG = getActiveTimerConfig();
  const timeInCurrentCycle = (now - gameState.lastPlayed) % TIMER_CONFIG.FULL_DAY_CYCLE;
  gameState.currentPhase = timeInCurrentCycle < TIMER_CONFIG.DAY_DURATION ? "day" : "night";
  
  // Set next transition time
  if (gameState.currentPhase === "day") {
    const timeLeftInDay = TIMER_CONFIG.DAY_DURATION - timeInCurrentCycle;
    gameState.nextDayNightTransition = now + timeLeftInDay;
  } else {
    const timeLeftInNight = TIMER_CONFIG.FULL_DAY_CYCLE - timeInCurrentCycle;
    gameState.nextDayNightTransition = now + timeLeftInNight;
  }
}
