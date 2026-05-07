import { GameState, Resident, ResidentState, Need, Room, RoomType, DepartureReason } from '../../types';
import { PROFILE_SPECS, HAPPINESS_CONFIG, ROOM_SPECS, DEPARTURE_CONFIG, GRID_CONFIG } from '../../constants';
import { findNearestRoomForNeed, findPath } from './PathfindingSystem';
import { updateSleepingResident } from './DayNightSystem';
import { updateResidentLife } from './LIFEMeterSystem';
import { handleUnhappyDepartureReputation, handleHopelessDepartureReputation } from './ReputationSystem';
import { consumeFood } from './FoodSystem';
import { getRoomHappinessBonus } from './AdjacencySystem';
import {
  canMoveTo,
  updateResidentPosition,
  registerResident,
  unregisterResident,
  addToWaitQueue,
  removeFromWaitQueue,
  isWaiting,
  canProceedFromWait,
  updateWaitingResidents,
  reserveTileForResident,
  clearTileReservation,
  applySocialDistancing,
  findSafeNearbyPosition,
  clampToWalkableBounds
} from './CollisionDetectionSystem';

/**
 * ResidentAISystem - Optimized autonomous resident behavior with staggered updates
 */

// ============================================================================
// Constants
// ============================================================================

const AI_CONFIG = {
  NEED_CHECK_INTERVAL: 5000,        // Check needs every 5 seconds
  MOVE_SPEED: 2,                    // Tiles per second
  ROOM_USAGE_TIME: 10,              // Seconds to satisfy need
  BATHROOM_CHANCE: 0.1,             // 10% chance per check
  BATHROOM_MIN_INTERVAL: 60000,     // Minimum 1 minute between bathroom needs
  EATING_INTERVAL_MIN: 4 * 60 * 1000,  // Minimum 4 game hours (2 minutes real-time in production)
  EATING_INTERVAL_MAX: 6 * 60 * 1000,  // Maximum 6 game hours (3 minutes real-time in production)
  EATING_DURATION: 15,              // Seconds to eat at cafeteria
  MAX_WAIT_TIME: 3000,              // Maximum time to wait for occupied tile (3 seconds)
  REPATH_COOLDOWN: 2000             // Cooldown before attempting to repath (2 seconds)
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a resident is inside a room's bounds
 */
function isResidentInsideRoom(resident: Resident, room: Room): boolean {
  const resX = Math.floor(resident.gridX);
  const resY = Math.floor(resident.gridY);
  
  return (
    resX >= room.gridX &&
    resX < room.gridX + room.width &&
    resY >= room.gridY &&
    resY < room.gridY + room.height
  );
}

// ============================================================================
// Log Throttling
// ============================================================================

// Track last log time per resident to prevent console spam
const lastLogTime = new Map<string, number>();
const LOG_THROTTLE_MS = 30000; // 30 seconds

// ============================================================================
// Staggered Update System
// ============================================================================

class StaggeredUpdateManager {
  private currentBatch: number = 0;
  private batchSize: number = 5; // Process 5 residents per update
  
  /**
   * Get residents to update this frame
   */
  getResidentsToUpdate(residents: Resident[]): Resident[] {
    if (residents.length <= this.batchSize) {
      return residents; // Update all if few residents
    }
    
    const start = this.currentBatch * this.batchSize;
    const end = Math.min(start + this.batchSize, residents.length);
    
    const batch = residents.slice(start, end);
    
    // Move to next batch
    this.currentBatch++;
    if (this.currentBatch * this.batchSize >= residents.length) {
      this.currentBatch = 0;
    }
    
    return batch;
  }
  
  /**
   * Reset batch counter
   */
  reset(): void {
    this.currentBatch = 0;
  }
}

const staggeredUpdater = new StaggeredUpdateManager();

// ============================================================================
// Priority System
// ============================================================================

interface ResidentPriority {
  resident: Resident;
  priority: number;
}

/**
 * Calculate resident update priority
 */
function calculateResidentPriority(resident: Resident, gameState: GameState): number {
  let priority = 0;
  
  // High priority: Low happiness (about to leave)
  if (resident.happiness < 20) {
    priority += 100;
  } else if (resident.happiness < 40) {
    priority += 50;
  }
  
  // High priority: Near graduation
  if (resident.lifeMeter > 80) {
    priority += 30;
  }
  
  // High priority: Active state (pathfinding, in use)
  if (resident.currentState === "pathfinding" || resident.currentState === "in_use") {
    priority += 20;
  }
  
  // Low priority: Sleeping or satisfied
  if (resident.currentState === "sleeping" || resident.currentState === "satisfied") {
    priority -= 30;
  }
  
  // Distance from camera (if we had camera position, we'd prioritize visible residents)
  // For now, just add some randomness to prevent always updating same residents
  priority += Math.random() * 10;
  
  return priority;
}

/**
 * Sort residents by priority
 */
function sortResidentsByPriority(residents: Resident[], gameState: GameState): Resident[] {
  const priorities: ResidentPriority[] = residents.map(resident => ({
    resident,
    priority: calculateResidentPriority(resident, gameState)
  }));
  
  priorities.sort((a, b) => b.priority - a.priority);
  
  return priorities.map(p => p.resident);
}

// ============================================================================
// State Machine Update (Optimized)
// ============================================================================

/**
 * Update all residents' AI state with staggered updates
 */
export function updateAllResidents(gameState: GameState, deltaTime: number): void {
  // Update waiting residents first
  updateWaitingResidents();
  
  // Sort by priority first
  const sortedResidents = sortResidentsByPriority(gameState.residents, gameState);
  
  // Get batch to update this frame
  const residentsToUpdate = staggeredUpdater.getResidentsToUpdate(sortedResidents);
  
  // Update only the batch
  for (const resident of residentsToUpdate) {
    updateResidentState(resident, gameState, deltaTime);
  }
}

/**
 * Update all residents (force update all, used for critical updates)
 */
export function updateAllResidentsForced(gameState: GameState, deltaTime: number): void {
  // Update waiting residents first
  updateWaitingResidents();
  
  for (const resident of gameState.residents) {
    updateResidentState(resident, gameState, deltaTime);
  }
}

/**
 * Update individual resident state machine
 */
export function updateResidentState(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Check departure conditions first (except if already leaving)
  if (resident.currentState !== "leaving") {
    checkDepartureConditions(resident, gameState, deltaTime);
  }
  
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
    
    case "leaving":
      handleLeavingState(resident, gameState, deltaTime);
      break;
  }
}

// ============================================================================
// State Handlers
// ============================================================================

/**
 * Handle idle state - check for needs (optimized)
 */
function handleIdleState(resident: Resident, gameState: GameState): void {
  const now = Date.now();
  const NEED_CHECK_INTERVAL = AI_CONFIG.NEED_CHECK_INTERVAL;
  
  // Check if it's time to evaluate needs
  if (now - resident.lastNeedCheck < NEED_CHECK_INTERVAL) {
    return;
  }
  
  resident.lastNeedCheck = now;
  
  console.log(`🐛 DEBUG: ${resident.name} checking for needs at (${Math.floor(resident.gridX)}, ${Math.floor(resident.gridY)}). Total rooms: ${gameState.rooms.length}`);
  
  // Check if already in a room using it
  if (resident.currentState === "in_use" || resident.currentState === "sleeping") {
    // Check if overlapping with another resident - if so, move to nearby tile
    const currentX = Math.floor(resident.gridX);
    const currentY = Math.floor(resident.gridY);
    const otherResident = gameState.residents.find(r =>
      r.id !== resident.id &&
      Math.floor(r.gridX) === currentX &&
      Math.floor(r.gridY) === currentY
    );
    
    if (otherResident) {
      // Use gradual social distancing instead of instant teleportation
      // The social distancing system will gradually push them apart
      // Don't reset their state - let them continue their activity
    }
    return;
  }
  
  // Check for night time (should sleep)
  if (gameState.currentPhase === "night") {
    resident.currentNeed = "sleep";
    resident.currentState = "seeking_need";
    console.log(`🐛 DEBUG: ${resident.name} needs sleep (night time)`);
    return;
  }
  
  // Detect current need (cached result)
  const need = detectNeedCached(resident, gameState);
  
  if (need) {
    resident.currentNeed = need;
    resident.currentState = "seeking_need";
    console.log(`🐛 DEBUG: ${resident.name} detected need: ${need}`);
  } else {
    console.log(`🐛 DEBUG: ${resident.name} has no needs currently`);
  }
}

/**
 * Handle seeking need state - find room
 */
function handleSeekingNeedState(resident: Resident, gameState: GameState): void {
  if (!resident.currentNeed) {
    resident.currentState = "idle";
    return;
  }
  
  // Find nearest room that satisfies the need
  const result = findNearestRoomForNeed(
    gameState.grid,
    gameState.rooms,
    Math.floor(resident.gridX),
    Math.floor(resident.gridY),
    resident.currentNeed,
    gameState.currentPhase
  );
  
  if (!result) {
    // No available room, go back to idle
    // DEBUG: Log room availability details (throttled to prevent spam)
    const now = Date.now();
    const lastLog = lastLogTime.get(resident.id);
    
    if (!lastLog || now - lastLog > LOG_THROTTLE_MS) {
      const needRoomTypes: Record<string, RoomType[]> = {
        sleep: ["dormitory"],
        learning: ["learning_center", "vocational_room"],
        social: ["common_room"],
        bathroom: ["bathroom"],
        food: ["cafeteria"]
      };
      const validTypes = needRoomTypes[resident.currentNeed] || [];
      
      // Enhanced logging to diagnose the issue
      const totalRooms = gameState.rooms.length;
      const roomsMatchingType = gameState.rooms.filter(r => validTypes.includes(r.type));
      const roomsMatchingTypeAndOpen = gameState.rooms.filter(r =>
        validTypes.includes(r.type) && r.isOpen
      );
      
      console.log(`${resident.name} cannot find room for ${resident.currentNeed}.`);
      console.log(`  Total rooms in gameState: ${totalRooms}`);
      console.log(`  Rooms matching type (${validTypes.join(', ')}): ${roomsMatchingType.length}`);
      console.log(`  Rooms matching type AND open: ${roomsMatchingTypeAndOpen.length}`);
      console.log(`  Current phase: ${gameState.currentPhase}`);
      
      // Log details of rooms matching type
      if (roomsMatchingType.length > 0) {
        console.log(`  Details of matching rooms:`);
        roomsMatchingType.forEach(r => {
          console.log(`    - ${r.type} (id: ${r.id.substring(0, 8)}..., isOpen: ${r.isOpen}, occupancy: ${r.currentOccupancy}/${ROOM_SPECS[r.type].capacity})`);
        });
      }
      
      lastLogTime.set(resident.id, now);
    }
    
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

/**
 * Handle pathfinding state - check arrival and transitions
 * Note: Actual movement is handled by MainScene calling updateResidentMovement()
 */
function handlePathfindingState(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  if (!resident.path || resident.path.length === 0) {
    resident.currentState = "idle";
    removeFromWaitQueue(resident.id);
    return;
  }
  
  const currentX = Math.floor(resident.gridX);
  const currentY = Math.floor(resident.gridY);
  
  // Check if waiting for a tile to become available
  if (isWaiting(resident.id)) {
    const { canProceed, reason } = canProceedFromWait(resident.id);
    
    if (canProceed) {
      if (reason === 'timeout') {
        // Waited too long - use social distancing to find safe position
        console.log(`${resident.name} timed out waiting, using social distancing to reposition`);
        
        // Find a safe nearby position using our improved algorithm
        const safePos = findSafeNearbyPosition(
          gameState.grid,
          resident.gridX,
          resident.gridY,
          resident.id,
          gameState.residents
        );
        
        if (safePos) {
          // Validate position is walkable before applying
          const clamped = clampToWalkableBounds(gameState.grid, safePos.x, safePos.y);
          resident.gridX = clamped.x;
          resident.gridY = clamped.y;
          updateResidentPosition(resident, currentX, currentY);
        }
        
        clearTileReservation(resident.id);
        removeFromWaitQueue(resident.id);
        resident.currentState = "idle";
        resident.path = null;
        resident.targetRoomId = null;
        // Don't clear currentNeed - let them try again on next update
        return;
      }
      // If reason is 'available', continue movement below
      removeFromWaitQueue(resident.id);
    } else {
      // Still waiting, don't move
      return;
    }
  }
  
  // Check if target room was demolished while walking to it
  if (resident.targetRoomId) {
    const targetRoom = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (!targetRoom || !targetRoom.isOpen) {
      console.log(`${resident.name}'s target room was removed or closed, resetting`);
      clearTileReservation(resident.id);
      removeFromWaitQueue(resident.id);
      resident.currentState = "idle";
      resident.path = null;
      resident.targetRoomId = null;
      resident.currentNeed = null;
      return;
    }
  }
  
  // Note: Movement is handled by MainScene calling updateResidentMovement()
  // Here we only check if we've arrived at the destination
  
  // EARLY SLEEP CHECK: If resident is seeking sleep and is already inside the dormitory,
  // immediately transition to sleeping state - don't wait for path to complete
  if (resident.currentNeed === "sleep" && resident.targetRoomId) {
    const targetRoom = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (targetRoom && targetRoom.type === "dormitory" && isResidentInsideRoom(resident, targetRoom)) {
      // Resident has entered the dormitory - immediately start sleeping
      resident.path = null;
      resident.pathIndex = 0;
      
      const entered = enterRoom(targetRoom, resident.id);
      if (entered) {
        resident.currentState = "sleeping";
        // Lock the resident's position for sleeping
        resident.sleepX = resident.gridX;
        resident.sleepY = resident.gridY;
        console.log(`😴 ${resident.name} entered dormitory and immediately started sleeping at (${Math.floor(resident.sleepX)}, ${Math.floor(resident.sleepY)})`);
        clearTileReservation(resident.id);
        removeFromWaitQueue(resident.id);
        return;
      }
    }
  }
  
  // Check if arrived at destination (path completed)
  // Note: path may have been cleared by early sleep check above
  if (!resident.path || resident.pathIndex >= resident.path.length) {
    resident.path = null;
    resident.pathIndex = 0;
    
    // Arrived - try to enter room
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    
    if (room && room.isOpen) {
      const entered = enterRoom(room, resident.id);
      
      if (entered) {
        resident.currentState = "in_use";
        
        // If sleeping, transition to sleeping state and lock position
        if (resident.currentNeed === "sleep") {
          resident.currentState = "sleeping";
          // Lock the resident's position for sleeping
          resident.sleepX = resident.gridX;
          resident.sleepY = resident.gridY;
          console.log(`😴 ${resident.name} is now sleeping at (${Math.floor(resident.sleepX)}, ${Math.floor(resident.sleepY)})`);
        }
      } else {
        // Room is full, find alternative or wait
        console.log(`${resident.name} couldn't enter ${room.type} - room is full`);
        // Try to find an alternative room of the same type
        if (resident.currentNeed) {
          const alternative = findNearestRoomForNeed(
            gameState.grid,
            gameState.rooms,
            Math.floor(resident.gridX),
            Math.floor(resident.gridY),
            resident.currentNeed,
            gameState.currentPhase
          );
          
          if (alternative && alternative.room.id !== room.id) {
            // Found alternative, path to it
            resident.path = alternative.path;
            resident.pathIndex = 0;
            resident.targetRoomId = alternative.room.id;
            console.log(`${resident.name} found alternative ${alternative.room.type}`);
          } else {
            // No alternative, go back to idle and try again later
            resident.currentState = "idle";
            resident.targetRoomId = null;
            // Keep currentNeed so they'll try again
          }
        } else {
          resident.currentState = "idle";
          resident.targetRoomId = null;
        }
      }
    } else {
      // Room closed or doesn't exist, go back to idle
      clearTileReservation(resident.id);
      resident.currentState = "idle";
      resident.targetRoomId = null;
      resident.currentNeed = null;
    }
    
    clearTileReservation(resident.id);
    removeFromWaitQueue(resident.id);
  }
}

/**
 * Handle in use state - using room
 */
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
  
  // Check if need is satisfied (simple timer-based for now)
  // In a real implementation, we'd track time in room
  const USAGE_TIME = room.type === "cafeteria" ? AI_CONFIG.EATING_DURATION : AI_CONFIG.ROOM_USAGE_TIME;
  
  // Simple check: if we've been here a bit, satisfy the need
  // This is simplified - a full implementation would track entry time
  if (Math.random() < deltaTime / USAGE_TIME) {
    // If eating at cafeteria, reset meal timer and consume food
    if (room.type === "cafeteria" && resident.currentNeed === "food") {
      // Consume 1 food from global resource
      const foodConsumed = consumeFood(gameState, 1);
      
      if (foodConsumed) {
        resident.lastMealTime = Date.now();
        console.log(`🍽️ ${resident.name} finished eating at cafeteria (consumed 1 food)`);
        
        // Emit eating completed event for visual feedback
        emitResidentAteFood(resident.id, resident.name);
      } else {
        // No food available - resident couldn't eat
        console.warn(`⚠️ ${resident.name} couldn't eat - no food available!`);
        // Still leave the room but don't reset meal timer
      }
    }
    
    leaveRoom(room, resident.id);
    resident.currentState = "satisfied";
  }
}

/**
 * Handle satisfied state - brief pause before returning to idle
 */
function handleSatisfiedState(resident: Resident, gameState: GameState): void {
  // Brief pause before returning to idle
  resident.currentNeed = null;
  resident.targetRoomId = null;
  resident.currentState = "idle";
}

/**
 * Handle sleeping state - restore happiness and enforce position lock
 */
function handleSleepingState(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Enforce sleep position lock - resident must stay still
  if (resident.sleepX !== null && resident.sleepY !== null) {
    // Validate sleep position is still within walkable bounds
    const clampedSleep = clampToWalkableBounds(gameState.grid, resident.sleepX, resident.sleepY);
    resident.sleepX = clampedSleep.x;
    resident.sleepY = clampedSleep.y;
    
    // Lock resident to their sleep position
    resident.gridX = resident.sleepX;
    resident.gridY = resident.sleepY;
    
    // Clear any path to prevent movement
    resident.path = null;
    resident.pathIndex = 0;
  }
  
  // Check if day time
  if (gameState.currentPhase === "day") {
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (room) leaveRoom(room, resident.id);
    
    // Clear sleep position lock
    resident.sleepX = null;
    resident.sleepY = null;
    
    resident.currentState = "idle";
    resident.currentNeed = null;
    resident.targetRoomId = null;
    console.log(`☀️ ${resident.name} woke up and is now idle`);
    return;
  }
  
  // Restore happiness while sleeping
  updateSleepingResident(resident, gameState, deltaTime);
}

// ============================================================================
// Departure System
// ============================================================================

// Track when residents started leaving (for exit timeout)
const leavingStartTime = new Map<string, number>();

/**
 * Check if resident should start leaving due to unhappiness or hopelessness
 */
function checkDepartureConditions(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Check LIFE meter (hopeless departure - immediate)
  if (resident.lifeMeter <= 0) {
    initiateHopelessDeparture(resident, gameState);
    return;
  }
  
  // Check unhappiness duration
  if (resident.happiness < DEPARTURE_CONFIG.UNHAPPY_THRESHOLD) {
    // Accumulate unhappy duration (convert deltaTime from seconds to ms)
    resident.unhappyDuration += deltaTime * 1000;
    
    // Check for warning state (1 in-game day = 12 minutes = 720000ms)
    if (!resident.isAtRisk && resident.unhappyDuration >= DEPARTURE_CONFIG.WARNING_DURATION) {
      resident.isAtRisk = true;
      emitResidentAtRisk(resident.id, resident.name);
      console.log(`⚠️ ${resident.name} is at risk of leaving! (unhappy for ${Math.floor(resident.unhappyDuration / 60000)} minutes)`);
    }
    
    // Check for departure (2 in-game days = 24 minutes = 1440000ms)
    if (resident.unhappyDuration >= DEPARTURE_CONFIG.DEPARTURE_DURATION) {
      initiateUnhappyDeparture(resident, gameState);
    }
  } else {
    // Reset unhappy duration if happiness is above threshold
    if (resident.unhappyDuration > 0) {
      console.log(`😊 ${resident.name}'s happiness recovered, resetting departure timer`);
      resident.unhappyDuration = 0;
      resident.isAtRisk = false;
    }
  }
}

/**
 * Initiate departure due to prolonged unhappiness
 */
function initiateUnhappyDeparture(resident: Resident, gameState: GameState): void {
  console.log(`😢 ${resident.name} has decided to leave due to prolonged unhappiness`);
  
  resident.departureReason = 'unhappy';
  startLeavingProcess(resident, gameState);
}

/**
 * Initiate departure due to LIFE meter reaching 0
 */
function initiateHopelessDeparture(resident: Resident, gameState: GameState): void {
  console.log(`💔 ${resident.name} has lost all hope and decided to leave`);
  
  resident.departureReason = 'hopeless';
  startLeavingProcess(resident, gameState);
}

/**
 * Start the leaving process - find path to exit
 */
function startLeavingProcess(resident: Resident, gameState: GameState): void {
  // Leave any room they're currently in
  if (resident.targetRoomId) {
    const room = gameState.rooms.find(r => r.id === resident.targetRoomId);
    if (room) {
      leaveRoom(room, resident.id);
    }
  }
  
  // Clear sleep position if sleeping
  resident.sleepX = null;
  resident.sleepY = null;
  
  // Find exit tile
  const exitPos = findExitPosition(gameState.grid);
  
  if (exitPos) {
    // Find path to exit
    const path = findPath(
      gameState.grid,
      Math.floor(resident.gridX),
      Math.floor(resident.gridY),
      exitPos.x,
      exitPos.y
    );
    
    if (path && path.length > 0) {
      resident.path = path;
      resident.pathIndex = 0;
    } else {
      // No path found, will teleport after timeout
      resident.path = null;
    }
  } else {
    // No exit found, will teleport after timeout
    resident.path = null;
  }
  
  // Set state and track start time
  resident.currentState = "leaving";
  resident.currentNeed = null;
  resident.targetRoomId = null;
  leavingStartTime.set(resident.id, Date.now());
  
  // Emit departure notification
  emitResidentLeaving(resident.id, resident.name, resident.departureReason || 'unhappy');
}

/**
 * Find the entrance/exit tile position
 */
function findExitPosition(grid: any): { x: number; y: number } | null {
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.tiles[y][x].type === "entrance") {
        return { x, y };
      }
    }
  }
  
  // Fallback: use edge of grid
  return { x: 0, y: Math.floor(grid.height / 2) };
}

/**
 * Handle leaving state - walk to exit then remove
 */
function handleLeavingState(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  const startTime = leavingStartTime.get(resident.id) || Date.now();
  const elapsedTime = Date.now() - startTime;
  
  // Check if we've exceeded the exit timeout
  if (elapsedTime > DEPARTURE_CONFIG.EXIT_TIMEOUT) {
    console.log(`⏱️ ${resident.name} couldn't reach exit in time, teleporting out`);
    completeResidentDeparture(resident, gameState);
    return;
  }
  
  // Check if reached exit (at entrance tile or path completed)
  const exitPos = findExitPosition(gameState.grid);
  const atExit = exitPos &&
    Math.floor(resident.gridX) === exitPos.x &&
    Math.floor(resident.gridY) === exitPos.y;
  
  if (atExit || (!resident.path && !resident.pathIndex)) {
    // Give a little movement time before removing
    if (!resident.path || resident.pathIndex >= (resident.path?.length || 0)) {
      completeResidentDeparture(resident, gameState);
    }
  }
  
  // Movement is handled by updateResidentMovement which is called from MainScene
}

/**
 * Complete the departure - apply penalties and remove resident
 */
function completeResidentDeparture(resident: Resident, gameState: GameState): void {
  console.log(`👋 ${resident.name} has left the shelter`);
  
  // Apply reputation penalty based on departure reason
  if (resident.departureReason === 'hopeless') {
    handleHopelessDepartureReputation(gameState, resident.name);
  } else {
    handleUnhappyDepartureReputation(gameState, resident.name);
  }
  
  // Emit departure completed event
  emitResidentDeparted(resident.id, resident.name, resident.departureReason || 'unhappy');
  
  // Clean up tracking
  leavingStartTime.delete(resident.id);
  
  // Remove resident from game
  removeResident(gameState, resident.id);
}

// ============================================================================
// Departure Event Emissions
// ============================================================================

/**
 * Emit event when resident becomes at-risk of leaving
 */
function emitResidentAtRisk(residentId: string, residentName: string): void {
  window.dispatchEvent(new CustomEvent('resident_at_risk', {
    detail: {
      residentId,
      residentName,
      message: `${residentName} is unhappy and may leave soon!`
    }
  }));
}

/**
 * Emit event when resident starts leaving
 */
function emitResidentLeaving(residentId: string, residentName: string, reason: DepartureReason): void {
  window.dispatchEvent(new CustomEvent('resident_leaving', {
    detail: {
      residentId,
      residentName,
      reason,
      message: reason === 'hopeless'
        ? `${residentName} has lost hope and is leaving!`
        : `${residentName} is unhappy and leaving!`
    }
  }));
}

/**
 * Emit event when resident has fully departed
 */
function emitResidentDeparted(residentId: string, residentName: string, reason: DepartureReason): void {
  window.dispatchEvent(new CustomEvent('resident_departed', {
    detail: {
      residentId,
      residentName,
      reason,
      message: reason === 'hopeless'
        ? `${residentName} has left the shelter, having lost all hope`
        : `${residentName} has left the shelter disappointed`
    }
  }));
}

// ============================================================================
// Movement
// ============================================================================

/**
 * Update resident movement along path (with collision detection and social distancing)
 */
export function updateResidentMovement(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Store old position for collision detection
  const oldX = Math.floor(resident.gridX);
  const oldY = Math.floor(resident.gridY);
  
  // Only apply social distancing when NOT on a path (idle/stationary residents)
  // This prevents interference with normal pathfinding movement
  if (!resident.path || resident.path.length === 0) {
    // Check if we're overlapping with another resident
    const isOverlapping = gameState.residents.some(other =>
      other.id !== resident.id &&
      Math.abs(other.gridX - resident.gridX) < 0.5 &&
      Math.abs(other.gridY - resident.gridY) < 0.5
    );
    
    // Only apply separation if actually overlapping
    if (isOverlapping) {
      const socialResult = applySocialDistancing(
        resident,
        gameState.residents,
        gameState.grid,
        deltaTime
      );
      
      if (socialResult.wasAdjusted) {
        const newTileX = Math.floor(socialResult.newX);
        const newTileY = Math.floor(socialResult.newY);
        
        if (canMoveTo(gameState.grid, newTileX, newTileY, resident.id) ||
            (newTileX === oldX && newTileY === oldY)) {
          resident.gridX = socialResult.newX;
          resident.gridY = socialResult.newY;
          
          if (newTileX !== oldX || newTileY !== oldY) {
            updateResidentPosition(resident, oldX, oldY);
          }
        }
      }
    }
    return; // No path, done
  }
  
  const MOVE_SPEED = AI_CONFIG.MOVE_SPEED;
  const targetNode = resident.path[resident.pathIndex];
  
  // Calculate movement toward path target
  const dx = targetNode.x - resident.gridX;
  const dy = targetNode.y - resident.gridY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  if (distance < 0.1) {
    // About to reach waypoint - check if it's occupied
    const targetX = Math.floor(targetNode.x);
    const targetY = Math.floor(targetNode.y);
    
    if (!canMoveTo(gameState.grid, targetX, targetY, resident.id)) {
      // Target tile is occupied, wait for it to become available
      if (!isWaiting(resident.id)) {
        console.log(`${resident.name} waiting for tile (${targetX}, ${targetY}) to become available`);
        addToWaitQueue(resident.id, targetX, targetY, AI_CONFIG.MAX_WAIT_TIME);
      }
      return;
    }
    
    // Reached waypoint
    resident.gridX = targetNode.x;
    resident.gridY = targetNode.y;
    resident.pathIndex++;
    
    // Update collision detection
    const newX = Math.floor(resident.gridX);
    const newY = Math.floor(resident.gridY);
    if (oldX !== newX || oldY !== newY) {
      updateResidentPosition(resident, oldX, oldY);
    }
    
    // Check if reached end of path
    if (resident.pathIndex >= resident.path.length) {
      resident.path = null;
      resident.pathIndex = 0;
    }
  } else {
    // Move toward waypoint at normal speed
    const moveDistance = MOVE_SPEED * deltaTime;
    const ratio = Math.min(moveDistance / distance, 1);
    
    let newGridX = resident.gridX + dx * ratio;
    let newGridY = resident.gridY + dy * ratio;
    
    // Check if new position crosses into a new tile
    const newX = Math.floor(newGridX);
    const newY = Math.floor(newGridY);
    
    // Only validate if moving to a different tile
    if (newX !== oldX || newY !== oldY) {
      if (!canMoveTo(gameState.grid, newX, newY, resident.id)) {
        // Can't move to new tile, wait
        if (!isWaiting(resident.id)) {
          console.log(`${resident.name} blocked at (${newX}, ${newY}), waiting`);
          addToWaitQueue(resident.id, newX, newY, AI_CONFIG.MAX_WAIT_TIME);
        }
        return;
      }
      
      // Update position and collision map
      resident.gridX = newGridX;
      resident.gridY = newGridY;
      updateResidentPosition(resident, oldX, oldY);
    } else {
      // Moving within same tile, just update position
      resident.gridX = newGridX;
      resident.gridY = newGridY;
    }
  }
}

// ============================================================================
// Overlap Resolution (Legacy - kept for compatibility, but prefer findSafeNearbyPosition)
// ============================================================================

/**
 * Find a nearby unoccupied tile to move to
 * @deprecated Use findSafeNearbyPosition from CollisionDetectionSystem instead
 * This legacy function is kept for backward compatibility but should be avoided
 * as it doesn't account for crowd density or walkable bounds properly
 */
function findNearbyUnoccupiedTile(
  grid: any,
  centerX: number,
  centerY: number,
  residentId: string,
  maxRadius: number = 2
): { x: number; y: number } | null {
  // Spiral outward from center
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (canMoveTo(grid, x, y, residentId)) {
            // Additional boundary validation - ensure we're in walkable area
            const clamped = clampToWalkableBounds(grid, x + 0.5, y + 0.5);
            if (Math.floor(clamped.x) === x && Math.floor(clamped.y) === y) {
              return { x: clamped.x, y: clamped.y };
            }
          }
        }
      }
    }
  }
  
  return null;
}

// ============================================================================
// Need Detection
// ============================================================================

interface NeedPriority {
  need: Need;
  priority: number;
}

// Cache for need detection results
const needDetectionCache = new Map<string, { need: Need | null; timestamp: number }>();
const NEED_CACHE_DURATION = 2000; // Cache for 2 seconds

/**
 * Detect current need based on priorities (with caching)
 */
function detectNeedCached(resident: Resident, gameState: GameState): Need | null {
  const now = Date.now();
  const cacheKey = resident.id;
  const cached = needDetectionCache.get(cacheKey);
  
  // Return cached result if still valid
  if (cached && now - cached.timestamp < NEED_CACHE_DURATION) {
    return cached.need;
  }
  
  // Calculate need
  const need = detectNeed(resident, gameState);
  
  // Cache result
  needDetectionCache.set(cacheKey, { need, timestamp: now });
  
  // Clean old cache entries (limit size)
  if (needDetectionCache.size > 100) {
    const oldestKey = needDetectionCache.keys().next().value;
    if (oldestKey) {
      needDetectionCache.delete(oldestKey);
    }
  }
  
  return need;
}

/**
 * Detect current need based on priorities
 */
function detectNeed(resident: Resident, gameState: GameState): Need | null {
  const needs: NeedPriority[] = [];
  const now = Date.now();
  
  // Sleep (highest priority at night)
  if (gameState.currentPhase === "night") {
    needs.push({ need: "sleep", priority: 100 });
  }
  
  // Food/Eating (periodic need during day time)
  if (gameState.currentPhase === "day") {
    const timeSinceLastMeal = now - resident.lastMealTime;
    // Random interval between 4-6 game hours
    const nextMealInterval = AI_CONFIG.EATING_INTERVAL_MIN +
      Math.random() * (AI_CONFIG.EATING_INTERVAL_MAX - AI_CONFIG.EATING_INTERVAL_MIN);
    
    if (timeSinceLastMeal > nextMealInterval) {
      // High priority when it's been a while since last meal
      const priority = 70 + Math.min(30, (timeSinceLastMeal - nextMealInterval) / 60000);
      needs.push({ need: "food", priority });
    }
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
  const timeSinceLastCheck = now - resident.lastNeedCheck;
  if (Math.random() < AI_CONFIG.BATHROOM_CHANCE && timeSinceLastCheck > AI_CONFIG.BATHROOM_MIN_INTERVAL) {
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

/**
 * Clear need detection cache (call when resident is removed)
 */
export function clearNeedCache(residentId?: string): void {
  if (residentId) {
    needDetectionCache.delete(residentId);
  } else {
    needDetectionCache.clear();
  }
}

// ============================================================================
// Room Interaction
// ============================================================================

/**
 * Enter a room
 * Returns true if entry was successful, false if room is full
 */
export function enterRoom(room: Room, residentId: string): boolean {
  const spec = ROOM_SPECS[room.type];
  
  // Check capacity (0 means unlimited)
  if (spec.capacity > 0 && room.currentOccupancy >= spec.capacity) {
    console.log(`Room ${room.type} is full (${room.currentOccupancy}/${spec.capacity})`);
    return false;
  }
  
  // Track occupancy
  room.currentOccupancy++;
  console.log(`${residentId.substring(0, 8)}... entered ${room.type} (${room.currentOccupancy}/${spec.capacity || '∞'})`);
  return true;
}

/**
 * Leave a room
 */
export function leaveRoom(room: Room, residentId: string): void {
  if (room.currentOccupancy > 0) {
    room.currentOccupancy--;
  }
}

// ============================================================================
// Room Effects
// ============================================================================

/**
 * Apply room effects to resident
 * Includes adjacency happiness bonuses when using rooms
 */
function applyRoomEffects(
  resident: Resident,
  room: Room,
  gameState: GameState,
  deltaTime: number
): void {
  // Apply adjacency happiness bonus (applied gradually while using any room)
  const adjacencyHappinessBonus = getRoomHappinessBonus(room);
  if (adjacencyHappinessBonus !== 0) {
    // Apply bonus over time (spread across 10 seconds of room usage)
    const happinessChange = (adjacencyHappinessBonus / 10) * deltaTime;
    resident.happiness = Math.max(0, Math.min(100, resident.happiness + happinessChange));
  }
  
  switch (room.type) {
    case "learning_center":
    case "vocational_room":
      // LIFE meter progression (adjacency modifier is handled in LIFEMeterSystem)
      updateResidentLife(resident, gameState, deltaTime);
      break;
    
    case "common_room":
      // Boost happiness (10 per minute) + adjacency bonus already applied above
      const happinessGain = (HAPPINESS_CONFIG.COMMON_ROOM_BOOST_RATE / 60) * deltaTime;
      resident.happiness = Math.min(100, resident.happiness + happinessGain);
      break;
    
    case "dormitory":
      if (gameState.currentPhase === "night") {
        // Restore happiness while sleeping (handled in sleeping state)
        const restoreRate = (HAPPINESS_CONFIG.SLEEP_RESTORE_RATE / 3600) * deltaTime;
        resident.happiness = Math.min(100, resident.happiness + restoreRate);
      }
      break;
    
    case "bathroom":
      // Instant satisfaction (no ongoing effect, but adjacency bonus still applies)
      break;
    
    case "cafeteria":
      // Eating at cafeteria - resident is consuming food
      // The actual food cost is handled by daily food system
      // Here we just track that they ate and emit visual feedback
      // Adjacency bonus already applied above
      break;
  }
}

// ============================================================================
// Happiness System
// ============================================================================

/**
 * Update happiness decay for all residents
 */
export function updateAllResidentHappiness(
  gameState: GameState,
  deltaTime: number
): void {
  for (const resident of gameState.residents) {
    updateResidentHappiness(resident, gameState, deltaTime);
  }
}

/**
 * Update individual resident happiness
 */
export function updateResidentHappiness(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Get decay rate based on profile
  const decayRate = PROFILE_SPECS[resident.profile].happinessDecayRate;
  
  // Calculate decay per second
  // Decay rate is per day, and a day is 12 minutes (720 seconds)
  const decayPerSecond = decayRate / 720;
  const decay = decayPerSecond * deltaTime;
  
  // Apply decay
  resident.happiness = Math.max(0, resident.happiness - decay);
  
  // Check for leaving condition
  if (resident.happiness <= 0) {
    handleResidentLeaving(resident, gameState);
  }
}

/**
 * Handle resident leaving due to unhappiness
 */
function handleResidentLeaving(resident: Resident, gameState: GameState): void {
  console.log(`😞 ${resident.name} left unhappy`);
  
  // Reputation penalty
  handleUnhappyDepartureReputation(gameState, resident.name);
  
  // Remove resident
  removeResident(gameState, resident.id);
}

/**
 * Remove a resident from the game
 */
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
    
    // Remove from collision detection
    unregisterResident(resident.id);
    removeFromWaitQueue(resident.id);
    
    gameState.residents.splice(index, 1);
  }
}

// ============================================================================
// Event Emission
// ============================================================================

/**
 * Emit event when resident finishes eating
 */
function emitResidentAteFood(residentId: string, residentName: string): void {
  window.dispatchEvent(new CustomEvent('resident_ate_food', {
    detail: { residentId, residentName }
  }));
}
