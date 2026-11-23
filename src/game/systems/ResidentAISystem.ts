import { GameState, Resident, ResidentState, Need, Room, RoomType, DepartureReason } from '../../types';
import { PROFILE_SPECS, HEALTH_CONFIG, ROOM_SPECS, DEPARTURE_CONFIG, GRID_CONFIG, AI_CONFIG, FOOD_CONFIG, roomKind } from '../../constants';
import { ROOM_LOOKS } from '../../constants/roomLooks';
import { findNearestRoomForNeed, findPath } from './PathfindingSystem';
import { isWalkable } from './GridSystem';
import { updateSleepingResident } from './DayNightSystem';
import { handleUnhealthyDepartureReputation, handleHopelessDepartureReputation } from './ReputationSystem';
import { consumeFood } from './FoodSystem';
import { getRoomHealthBonus } from './AdjacencySystem';
import {
  canMoveTo,
  getResidentAtTile,
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



const PROFILE_SPEED: Record<Resident["profile"], number> = { young_adult: 1, adult: 0.9, elderly: 0.7 };

// ============================================================================
// Fundraiser Helper Functions
// ============================================================================

/**
 * Check if a resident is assigned to an active fundraiser
 */
function isResidentInActiveFundraiser(resident: Resident, gameState: GameState): boolean {
  if (!gameState.activeFundraisers || gameState.activeFundraisers.length === 0) {
    return false;
  }
  
  return gameState.activeFundraisers.some(f => f.assignedResidents.includes(resident.id));
}

/**
 * Get the fundraiser a resident is assigned to (if any)
 */
function getResidentFundraiser(resident: Resident, gameState: GameState): { id: string; stationId: string } | null {
  if (!gameState.activeFundraisers || gameState.activeFundraisers.length === 0) {
    return null;
  }
  
  const fundraiser = gameState.activeFundraisers.find(f => f.assignedResidents.includes(resident.id));
  if (fundraiser) {
    return { id: fundraiser.id, stationId: fundraiser.stationId };
  }
  return null;
}

/**
 * Get a random wander position within the bounds of a room
 * Returns a position that is within the room's grid boundaries
 */
function getRandomWanderPositionInRoom(room: Room): { x: number; y: number } {
  // Pick a random position within the room bounds
  // Add 0.5 to center the position within each tile
  const x = room.gridX + Math.random() * (room.width - 1) + 0.5;
  const y = room.gridY + Math.random() * (room.height - 1) + 0.5;
  
  return { x, y };
}

// ============================================================================
// Gradual Repositioning System
// ============================================================================

/**
 * Start gradual repositioning for a resident
 */
function startGradualReposition(
  resident: Resident,
  targetX: number,
  targetY: number,
  duration: number = AI_CONFIG.REPOSITION_DURATION
): void {
  resident.repositionTarget = { x: targetX, y: targetY };
  resident.repositionStartTime = Date.now();
  resident.repositionDuration = duration;
  console.log(`🔄 ${resident.name} starting gradual reposition from (${resident.gridX.toFixed(2)}, ${resident.gridY.toFixed(2)}) to (${targetX.toFixed(2)}, ${targetY.toFixed(2)}) over ${duration}s`);
}

/**
 * Update gradual repositioning (call each frame)
 * Returns true if repositioning is complete
 */
function updateGradualReposition(resident: Resident, deltaTime: number): boolean {
  if (!resident.repositionTarget || resident.repositionStartTime === null) {
    return false;
  }
  
  const elapsed = (Date.now() - resident.repositionStartTime) / 1000; // Convert to seconds
  const progress = Math.min(elapsed / resident.repositionDuration, 1.0);
  
  // Smooth easing function (ease-out cubic)
  const easedProgress = 1 - Math.pow(1 - progress, 3);
  
  // Store start position on first frame
  if (resident.repositionTarget.startX === undefined) {
    resident.repositionTarget.startX = resident.gridX;
    resident.repositionTarget.startY = resident.gridY;
  }
  
  const startX = resident.repositionTarget.startX!;
  const startY = resident.repositionTarget.startY!;
  const targetX = resident.repositionTarget.x;
  const targetY = resident.repositionTarget.y;
  
  // Calculate new position with easing
  resident.gridX = startX + (targetX - startX) * easedProgress;
  resident.gridY = startY + (targetY - startY) * easedProgress;
  
  // Check if repositioning is complete
  if (progress >= 1.0) {
    console.log(`✅ ${resident.name} completed gradual reposition at (${resident.gridX.toFixed(2)}, ${resident.gridY.toFixed(2)})`);
    resident.repositionTarget = null;
    resident.repositionStartTime = null;
    return true; // Repositioning complete
  }
  
  return false; // Still repositioning
}

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
  
  // High priority: Low health (about to leave)
  if (resident.health < 20) {
    priority += 100;
  } else if (resident.health < 40) {
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
  
  // CRITICAL FIX: Don't detect new needs if resident is assigned to an active fundraiser
  // Fundraiser assignments should take priority over social, etc.
  // Exception: Sleep can still override (handled above)
  if (isResidentInActiveFundraiser(resident, gameState)) {
    console.log(`🎪 ${resident.name} is assigned to active fundraiser - skipping need detection`);
    // Set them back to seeking/pathfinding to the fundraiser if they somehow became idle
    if (resident.currentNeed !== 'fundraiser') {
      resident.currentNeed = 'fundraiser';
      // If they already have a path, set to pathfinding; otherwise seeking_need
      if (resident.path && resident.path.length > 0) {
        resident.currentState = 'pathfinding';
        console.log(`🎪 ${resident.name} reassigned to fundraiser (pathfinding)`);
      } else {
        resident.currentState = 'seeking_need';
        console.log(`🎪 ${resident.name} reassigned to fundraiser (seeking path)`);
      }
    }
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
    tryStroll(resident, gameState);
  }
}

// Idle residents (no need) occasionally walk somewhere. State stays "idle" so the
// next need check (every 5s) naturally interrupts the stroll; movement follows resident.path.

function tryStroll(resident: Resident, gameState: GameState): void {
  if (gameState.currentPhase !== "day" || (resident.path && resident.path.length > 0)) return;
  if (Math.random() > AI_CONFIG.STROLL_CHANCE[resident.profile]) return;

  const strolling = gameState.residents.filter(r => r.currentState === "idle" && r.path && r.path.length > 0).length;
  if (strolling >= Math.ceil(gameState.residents.length * AI_CONFIG.STROLL_MAX_FRACTION)) return;

  const dest = pickStrollDestination(gameState);
  if (!dest) return;
  const path = findPath(gameState.grid, Math.round(resident.gridX), Math.round(resident.gridY), dest.x, dest.y, resident.id);
  if (path && path.length > 1) {
    resident.path = path;
    resident.pathIndex = 0;
  }
}

/** Most strolls visit a common room (least crowded favoured; never cafeterias, only hungry residents eat; never clinics, only residents who need care go there), otherwise a random hallway tile. */
function pickStrollDestination(gameState: GameState): { x: number; y: number } | null {
  const { grid, rooms } = gameState;
  const visitable = rooms.filter(r => r.isOpen && roomKind(r.type) === "common_room");
  if (visitable.length > 0 && Math.random() < AI_CONFIG.STROLL_ROOM_VISIT_CHANCE) {
    const load = (r: Room) => gameState.residents.filter(o => Math.floor(o.gridX) >= r.gridX && Math.floor(o.gridX) < r.gridX + r.width && Math.floor(o.gridY) >= r.gridY && Math.floor(o.gridY) < r.gridY + r.height).length;
    // Two random picks, keep the emptier one: cheap spreading without sorting every room
    const [p, q] = [visitable[Math.floor(Math.random() * visitable.length)], visitable[Math.floor(Math.random() * visitable.length)]];
    const room = load(q) < load(p) ? q : p;
    const seats = ROOM_LOOKS[room.type].seats ?? []; // keep chairs free for diners
    for (let i = 0; i < 6; i++) {
      const x = room.gridX + Math.floor(Math.random() * room.width);
      const y = room.gridY + Math.floor(Math.random() * room.height);
      if (grid.tiles[y]?.[x]?.walkable && !seats.some(t => room.gridX + t.x === x && room.gridY + t.y === y)) return { x, y };
    }
  }
  const a = grid.unlockedArea;
  for (let i = 0; i < 12; i++) {
    const x = a.minX + Math.floor(Math.random() * (a.maxX - a.minX + 1));
    const y = a.minY + Math.floor(Math.random() * (a.maxY - a.minY + 1));
    const t = grid.tiles[y]?.[x];
    if (t && t.walkable && t.type === "hallway") return { x, y };
  }
  return null;
}

// ============================================================================
// Seats (one resident per bed / chair)
// ============================================================================

const SEAT_HOLDER_STATES: ResidentState[] = ["pathfinding", "in_use", "sleeping"];

/** A random seat in the room nobody else holds, or null if all are taken. Rooms without seats return undefined. */
function pickFreeSeat(room: Room, gameState: GameState, selfId: string): { x: number; y: number } | null | undefined {
  const layout = ROOM_LOOKS[room.type].seats;
  if (!layout) return undefined;
  // Derived from resident state (no separate registry), so a stale claim can't leak a seat.
  const taken = new Set(
    gameState.residents
      .filter(r => r.id !== selfId && r.seat && r.targetRoomId === room.id && SEAT_HOLDER_STATES.includes(r.currentState))
      .map(r => `${r.seat!.x},${r.seat!.y}`)
  );
  const self = gameState.residents.find(r => r.id === selfId);
  // Other residents' own beds stay reserved for them, even while they're up and about.
  for (const r of gameState.residents) {
    if (r.id !== selfId && r.bed?.roomId === room.id) taken.add(`${r.bed.x},${r.bed.y}`);
  }
  const free = layout
    .map(s => ({ x: room.gridX + s.x, y: room.gridY + s.y }))
    .filter(s => !taken.has(`${s.x},${s.y}`));
  const own = self?.bed?.roomId === room.id && free.find(s => s.x === self.bed!.x && s.y === self.bed!.y);
  return own || (free.length ? free[Math.floor(Math.random() * free.length)] : null);
}

/**
 * Nearest room for a need, skipping seated rooms (dorm, cafeteria) with no free seat.
 * For seated rooms the returned path leads to a claimed seat instead of a random tile.
 */
/** Dormitories can be gender-restricted; every other room (and unrestricted/legacy data) is open to all */
function mayUseRoom(resident: Resident, room: GameState["rooms"][number]): boolean {
  return roomKind(room.type) !== "dormitory" || !room.gender || room.gender === "any" || !resident.gender || room.gender === resident.gender;
}

function findRoomForNeed(resident: Resident, gameState: GameState, need: Need) {
  const x = Math.round(resident.gridX);
  const y = Math.round(resident.gridY);
  // Sleep: go to your own bed if its room is open and the bed still exists (otherwise fall through and pick a new one)
  const home = need === "sleep" && resident.bed ? gameState.rooms.find(r => r.id === resident.bed!.roomId && r.isOpen && mayUseRoom(resident, r)) : undefined;
  const rooms = home ? [home] : gameState.rooms.filter(r => mayUseRoom(resident, r) && pickFreeSeat(r, gameState, resident.id) !== null);
  const result = findNearestRoomForNeed(gameState.grid, rooms, x, y, need, gameState.currentPhase, resident.id);
  resident.seat = null;
  if (!result) return null;

  const seat = pickFreeSeat(result.room, gameState, resident.id);
  if (!seat) return result; // room has no seats: keep the generic path
  const path = findPath(gameState.grid, x, y, seat.x, seat.y, resident.id); // id: route around sleepers/diners
  if (!path) return null;
  resident.seat = seat;
  if (need === "sleep") resident.bed = { roomId: result.room.id, x: seat.x, y: seat.y };
  return { room: result.room, path };
}

/**
 * Handle seeking need state - find room
 */
function handleSeekingNeedState(resident: Resident, gameState: GameState): void {
  if (!resident.currentNeed) {
    resident.currentState = "idle";
    return;
  }
  
  // Special handling for fundraiser need - the targetRoomId is already set by FundraiserSystem
  if (resident.currentNeed === "fundraiser") {
    // Sleep wipes targetRoomId; recover the station from the active fundraiser
    resident.targetRoomId = getResidentFundraiser(resident, gameState)?.stationId ?? resident.targetRoomId;
    console.log(`🎪 [ResidentAI] ${resident.name} in seeking_need with fundraiser need - Current state: "${resident.currentState}", Has path: ${!!resident.path}, Path length: ${resident.path?.length || 0}`);
    
    // If FundraiserSystem already set a valid path, just transition to pathfinding
    if (resident.path && resident.path.length > 0 && resident.targetRoomId) {
      console.log(`🎪 [ResidentAI] ${resident.name} already has path from FundraiserSystem, transitioning to pathfinding`);
      resident.currentState = "pathfinding";
      return;
    }
    
    // Otherwise, calculate path to the target station
    if (resident.targetRoomId) {
      const station = gameState.rooms.find(r => r.id === resident.targetRoomId);
      if (station && station.isOpen) {
        const stationCenterX = station.gridX + Math.floor(station.width / 2);
        const stationCenterY = station.gridY + Math.floor(station.height / 2);
        
        const path = findPath(
          gameState.grid,
          Math.floor(resident.gridX),
          Math.floor(resident.gridY),
          stationCenterX,
          stationCenterY
        );
        
        if (path && path.length > 0) {
          console.log(`🎪 [ResidentAI] ${resident.name} calculating path to fundraiser station`);
          resident.path = path;
          resident.pathIndex = 0;
          resident.currentState = "pathfinding";
          console.log(`🎪 ${resident.name} seeking fundraiser station at (${stationCenterX}, ${stationCenterY})`);
          return;
        } else {
          // No path found - set them to in_use at the station
          console.warn(`⚠️ ${resident.name} couldn't find path to fundraiser station, setting in_use`);
          resident.currentState = "in_use";
          return;
        }
      }
    }
    // No valid target, clear the fundraiser need
    console.warn(`⚠️ ${resident.name} has fundraiser need but no valid target station`);
    resident.currentNeed = null;
    resident.currentState = "idle";
    return;
  }
  
  // Find nearest room that satisfies the need
  const result = findRoomForNeed(resident, gameState, resident.currentNeed);
  
  if (!result) {
    // No available room, go back to idle
    // DEBUG: Log room availability details (throttled to prevent spam)
    const now = Date.now();
    const lastLog = lastLogTime.get(resident.id);
    
    if (!lastLog || now - lastLog > LOG_THROTTLE_MS) {
      const needRoomTypes: Record<string, RoomType[]> = {
        sleep: ["dormitory"],
        health: ["clinic"],
        social: ["common_room"],
        bathroom: ["bathroom"],
        food: ["cafeteria"],
        fundraiser: ["fundraiser_station"]
      };
      const validTypes = needRoomTypes[resident.currentNeed] || [];
      
      // Enhanced logging to diagnose the issue
      const totalRooms = gameState.rooms.length;
      const roomsMatchingType = gameState.rooms.filter(r => validTypes.includes(roomKind(r.type)));
      const roomsMatchingTypeAndOpen = gameState.rooms.filter(r =>
        validTypes.includes(roomKind(r.type)) && r.isOpen
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
  // Debug log for fundraiser residents
  if (resident.currentNeed === "fundraiser") {
    console.log(`🚶 [handlePathfindingState] ${resident.name} - Need: "${resident.currentNeed}", Path: ${resident.path?.length || 0} nodes, PathIndex: ${resident.pathIndex}, TargetRoom: ${resident.targetRoomId?.substring(0, 8)}`);
  }
  
  if (!resident.path || resident.path.length === 0) {
    // Movement clears the path on the last waypoint, so for seated rooms an empty path
    // inside the target room means "arrived at my bed/chair": fall through to the arrival code.
    const target = resident.targetRoomId ? gameState.rooms.find(r => r.id === resident.targetRoomId) : undefined;
    const arrivedAtSeat = !!target && !!ROOM_LOOKS[target.type].seats && !!resident.seat && isResidentInsideRoom(resident, target);
    if (!arrivedAtSeat) {
      console.error(`⚠️ [handlePathfindingState] ${resident.name} has no path! Need: "${resident.currentNeed}", TargetRoom: ${resident.targetRoomId?.substring(0, 8)}, returning to idle`);
      resident.currentState = "idle";
      removeFromWaitQueue(resident.id);
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
    // With a claimed bed they must walk to it; only seat-less (legacy) dorms sleep at the doorway.
    if (targetRoom && roomKind(targetRoom.type) === "dormitory" && !resident.seat && isResidentInsideRoom(resident, targetRoom)) {
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
        
        // Meal is paid for on entry; no food means they leave hungry (meal timer untouched)
        if (roomKind(room.type) === "cafeteria" && resident.currentNeed === "food" &&
            !consumeFood(gameState, FOOD_CONFIG.FOOD_PER_MEAL)) {
          console.warn(`⚠️ ${resident.name} couldn't eat - no food available!`);
          leaveRoom(room, resident.id);
          resident.currentState = "satisfied";
          return;
        }
        
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
          const alternative = findRoomForNeed(resident, gameState, resident.currentNeed);
          
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
  
  // Check if resident is assigned to an active fundraiser at this station
  if (room.type === "fundraiser_station") {
    const fundraiser = getResidentFundraiser(resident, gameState);
    
    if (fundraiser && fundraiser.stationId === room.id) {
      // Resident is participating in an active fundraiser at this station
      // They should stay here until the fundraiser completes
      
      // EXCEPTION: Sleep takes priority - if it's night, allow them to go sleep
      if (gameState.currentPhase === "night") {
        console.log(`🌙 ${resident.name} leaving fundraiser station to sleep (night time)`);
        // Don't leave the room occupancy - fundraiser system handles this
        resident.currentNeed = "sleep";
        resident.currentState = "seeking_need";
        // Keep targetRoomId so we remember the fundraiser station
        return;
      }
      
      // Wander around the fundraiser station area to look active
      const now = Date.now();
      // Handle undefined lastWanderTime (first time entering) - use Infinity to trigger immediately
      const timeSinceLastWander = resident.lastWanderTime ? now - resident.lastWanderTime : Infinity;
      
      // Check if it's time to pick a new wander position
      // Also check that we're not currently repositioning
      if (timeSinceLastWander >= AI_CONFIG.FUNDRAISER_WANDER_INTERVAL &&
          !resident.repositionTarget) {
        // Pick a random position within the room bounds
        const wanderPos = getRandomWanderPositionInRoom(room);
        
        // Calculate distance and duration for smooth movement
        const dx = wanderPos.x - resident.gridX;
        const dy = wanderPos.y - resident.gridY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only move if the distance is meaningful (avoid jittery small movements)
        if (distance > 0.5) {
          // Calculate duration based on wander speed
          const duration = distance / AI_CONFIG.FUNDRAISER_WANDER_SPEED;
          
          // Start gradual reposition to the new wander position
          startGradualReposition(resident, wanderPos.x, wanderPos.y, duration);
          console.log(`🚶 ${resident.name} wandering to (${wanderPos.x.toFixed(1)}, ${wanderPos.y.toFixed(1)}) at fundraiser station`);
        }
        
        // Update last wander time regardless (to avoid rapid checks)
        resident.lastWanderTime = now;
      }
      
      // Stay at the fundraiser station - don't transition to satisfied
      return;
    }
  }
  
  // Check if need is satisfied (simple timer-based for now)
  // In a real implementation, we'd track time in room
  const USAGE_TIME = roomKind(room.type) === "cafeteria" ? AI_CONFIG.EATING_DURATION : AI_CONFIG.ROOM_USAGE_TIME;
  
  // Simple check: if we've been here a bit, satisfy the need
  // This is simplified - a full implementation would track entry time
  if (Math.random() < deltaTime / USAGE_TIME) {
    // If eating at cafeteria, reset meal timer and consume food
    if (roomKind(room.type) === "cafeteria" && resident.currentNeed === "food") {
      // Food was already taken on entry
      resident.lastMealTime = Date.now();
      console.log(`🍽️ ${resident.name} finished eating at cafeteria`);
      emitResidentAteFood(resident.id, resident.name);
      resident.health = Math.min(HEALTH_CONFIG.MAX, resident.health + HEALTH_CONFIG.MEAL_HEALTH_RESTORE);
    }
    if (roomKind(room.type) === "clinic" && resident.currentNeed === "health") {
      resident.health = Math.min(HEALTH_CONFIG.MAX, resident.health + HEALTH_CONFIG.CLINIC_VISIT_RESTORE);
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
  resident.seat = null;
  resident.currentNeed = null;
  resident.targetRoomId = null;
  resident.currentState = "idle";
}

/**
 * Handle sleeping state - restore health and enforce position lock
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
    
    // Check if sleep position changed (indicating a teleport)
    if (Math.abs(clampedSleep.x - resident.sleepX) > 0.01 || Math.abs(clampedSleep.y - resident.sleepY) > 0.01) {
      console.log(`🚨 TELEPORT DEBUG: Sleep position clamped from (${resident.sleepX.toFixed(2)}, ${resident.sleepY.toFixed(2)}) to (${clampedSleep.x.toFixed(2)}, ${clampedSleep.y.toFixed(2)})`);
    }
    
    resident.sleepX = clampedSleep.x;
    resident.sleepY = clampedSleep.y;
    
    // Lock resident to their sleep position
    if (Math.abs(resident.gridX - resident.sleepX) > 0.01 || Math.abs(resident.gridY - resident.sleepY) > 0.01) {
      console.log(`🚨 TELEPORT DEBUG: ${resident.name} snapped back to sleep position from (${resident.gridX.toFixed(2)}, ${resident.gridY.toFixed(2)}) to (${resident.sleepX.toFixed(2)}, ${resident.sleepY.toFixed(2)})`);
    }
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
    
    // Check if resident is still assigned to an active fundraiser
    // If so, send them back to the fundraiser station instead of going idle
    const fundraiser = getResidentFundraiser(resident, gameState);
    if (fundraiser) {
      const station = gameState.rooms.find(r => r.id === fundraiser.stationId);
      if (station) {
        console.log(`☀️ ${resident.name} woke up and returning to active fundraiser at station`);
        
        // Find path to the fundraiser station
        const stationCenterX = station.gridX + Math.floor(station.width / 2);
        const stationCenterY = station.gridY + Math.floor(station.height / 2);
        
        const path = findPath(
          gameState.grid,
          Math.floor(resident.gridX),
          Math.floor(resident.gridY),
          stationCenterX,
          stationCenterY
        );
        
        if (path && path.length > 0) {
          resident.path = path;
          resident.pathIndex = 0;
          resident.currentState = "pathfinding";
          resident.targetRoomId = fundraiser.stationId;
          resident.currentNeed = null;
        } else {
          // No path found - set them to in_use anyway at the station
          resident.currentState = "in_use";
          resident.targetRoomId = fundraiser.stationId;
          resident.currentNeed = null;
        }
        return;
      }
    }
    
    resident.currentState = "idle";
    resident.currentNeed = null;
    resident.targetRoomId = null;
    console.log(`☀️ ${resident.name} woke up and is now idle`);
    return;
  }
  
  // Restore health while sleeping
  updateSleepingResident(resident, gameState, deltaTime);
}

// ============================================================================
// Departure System
// ============================================================================

// Track when residents started leaving (for exit timeout)
const leavingStartTime = new Map<string, number>();

/**
 * Check if resident should start leaving due to unhealthiness or hopelessness
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
  
  // Check unhealthiness duration
  if (resident.health < DEPARTURE_CONFIG.UNHEALTHY_THRESHOLD) {
    // Accumulate unhealthy duration (convert deltaTime from seconds to ms)
    resident.unhealthyDuration += deltaTime * 1000;
    
    // Check for warning state (1 in-game day = 12 minutes = 720000ms)
    if (!resident.isAtRisk && resident.unhealthyDuration >= DEPARTURE_CONFIG.WARNING_DURATION) {
      resident.isAtRisk = true;
      emitResidentAtRisk(resident.id, resident.name);
      console.log(`⚠️ ${resident.name} is at risk of leaving! (unhealthy for ${Math.floor(resident.unhealthyDuration / 60000)} minutes)`);
    }
    
    // Check for departure (2 in-game days = 24 minutes = 1440000ms)
    if (resident.unhealthyDuration >= DEPARTURE_CONFIG.DEPARTURE_DURATION) {
      initiateUnhealthyDeparture(resident, gameState);
    }
  } else {
    // Reset unhealthy duration if health is above threshold
    if (resident.unhealthyDuration > 0) {
      console.log(`😊 ${resident.name}'s health recovered, resetting departure timer`);
      resident.unhealthyDuration = 0;
      resident.isAtRisk = false;
    }
  }
}

/**
 * Initiate departure due to prolonged unhealthiness
 */
function initiateUnhealthyDeparture(resident: Resident, gameState: GameState): void {
  console.log(`😢 ${resident.name} has decided to leave due to prolonged unhealthiness`);
  
  resident.departureReason = 'unhealthy';
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
  emitResidentLeaving(resident.id, resident.name, resident.departureReason || 'unhealthy');
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
    handleUnhealthyDepartureReputation(gameState, resident.name);
  }
  
  // Emit departure completed event
  emitResidentDeparted(resident.id, resident.name, resident.departureReason || 'unhealthy');
  
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
      message: `${residentName} is unhealthy and may leave soon!`
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
        : `${residentName} is unhealthy and leaving!`
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
        : `${residentName} was transferred to another institution due to inadequate treatment`
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
  // Debug log for fundraiser residents
  if (resident.currentNeed === "fundraiser" && resident.currentState === "pathfinding") {
    console.log(`🚶 [updateResidentMovement] ${resident.name} - State: ${resident.currentState}, Path: ${resident.path?.length || 0}, PathIndex: ${resident.pathIndex}`);
  }
  
  // Tile we currently hold: nearest tile centre (sprites are drawn at gridX + 0.5)
  const oldX = Math.round(resident.gridX);
  const oldY = Math.round(resident.gridY);
  
  // Check if resident is currently being gradually repositioned
  if (resident.repositionTarget && resident.repositionStartTime !== null) {
    const repositionComplete = updateGradualReposition(resident, deltaTime);
    
    // Update collision map if position changed tiles
    const newX = Math.round(resident.gridX);
    const newY = Math.round(resident.gridY);
    if (oldX !== newX || oldY !== newY) {
      updateResidentPosition(resident, oldX, oldY);
    }
    
    // If repositioning is complete, allow normal movement to resume
    if (repositionComplete) {
      console.log(`✅ ${resident.name} repositioning complete, resuming normal behavior`);
    }
    
    return; // Don't do normal movement while repositioning
  }
  
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
        const newTileX = Math.round(socialResult.newX);
        const newTileY = Math.round(socialResult.newY);
        
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
    resident.blockedFor = 0;
    return; // No path, done
  }
  
  const target = resident.path[resident.pathIndex];
  const dx = target.x - resident.gridX;
  const dy = target.y - resident.gridY;
  const distance = Math.hypot(dx, dy);
  // Clamp dt so a stalled frame can't fling a resident across the map
  const dt = Math.min(deltaTime, 0.1);
  const step = AI_CONFIG.MOVE_SPEED * PROFILE_SPEED[resident.profile] * dt;
  const arrive = distance <= step;
  const nextX = arrive ? target.x : resident.gridX + (dx / distance) * step;
  const nextY = arrive ? target.y : resident.gridY + (dy / distance) * step;

  const tileX = Math.round(nextX);
  const tileY = Math.round(nextY);
  const changesTile = tileX !== oldX || tileY !== oldY;
  if (changesTile && !canMoveTo(gameState.grid, tileX, tileY, resident.id) && !shouldPushThrough(resident, gameState, tileX, tileY, oldX, oldY, dt)) {
    return; // someone is in the way: stand still (or have just been re-routed)
  }

  resident.blockedFor = 0;
  resident.gridX = nextX;
  resident.gridY = nextY;
  if (changesTile) updateResidentPosition(resident, oldX, oldY);

  if (arrive && ++resident.pathIndex >= resident.path.length) {
    resident.path = null;
    resident.pathIndex = 0;
  }
}

/**
 * Called each frame a resident is stuck behind someone. First tries a detour that treats other
 * residents as walls; if there is none (1-wide hallway, head-on), returns true after a short wait
 * so they walk through each other instead of deadlocking.
 */
function shouldPushThrough(
  resident: Resident, gameState: GameState, tileX: number, tileY: number, oldX: number, oldY: number, dt: number
): boolean {
  const blockerId = getResidentAtTile(tileX, tileY);
  const blocker = blockerId ? gameState.residents.find(r => r.id === blockerId) : undefined;
  const standing = !blocker?.path?.length; // a walker will clear the tile soon, a stander won't
  const rerouteAt = standing ? 0.3 : 0.8;

  const before = resident.blockedFor ?? 0;
  resident.blockedFor = before + dt;
  if (before < rerouteAt && resident.blockedFor >= rerouteAt) {
    const goal = resident.path![resident.path!.length - 1];
    const detour = findPath(gameState.grid, oldX, oldY, goal.x, goal.y, resident.id, true);
    // A detour whose next step is the same blocked tile (e.g. the goal itself) just yanks them back to the tile centre
    if (detour && !(detour[1]?.x === tileX && detour[1]?.y === tileY)) {
      resident.path = detour;
      resident.pathIndex = 0;
      resident.blockedFor = 0;
      return false;
    }
  }
  return resident.blockedFor > (standing ? 1.5 : 3) && isWalkable(gameState.grid, tileX, tileY);
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
  
  // Clinic (low health) - above social, below night-time sleep
  if (resident.health < HEALTH_CONFIG.CLINIC_SEEK_THRESHOLD) {
    const priority = 75 + (HEALTH_CONFIG.CLINIC_SEEK_THRESHOLD - resident.health) * 0.5;
    needs.push({ need: "health", priority });
  }
  
  // Social (based on health)
  if (resident.health < 60) {
    const priority = 40 + (60 - resident.health) * 0.5;
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
 * Includes adjacency health bonuses when using rooms
 */
function applyRoomEffects(
  resident: Resident,
  room: Room,
  gameState: GameState,
  deltaTime: number
): void {
  // Apply adjacency health bonus (applied gradually while using any room)
  const adjacencyHealthBonus = getRoomHealthBonus(room);
  if (adjacencyHealthBonus !== 0) {
    // Apply bonus over time (spread across 10 seconds of room usage)
    const healthChange = (adjacencyHealthBonus / 10) * deltaTime;
    resident.health = Math.max(0, Math.min(100, resident.health + healthChange));
  }
  
  switch (roomKind(room.type)) {
    case "clinic":
      // Restore health while being treated
      resident.health = Math.min(100, resident.health + HEALTH_CONFIG.CLINIC_RECOVERY_RATE * deltaTime);
      break;
    
    case "common_room":
      // Boost health (10 per minute) + adjacency bonus already applied above
      const healthGain = (HEALTH_CONFIG.COMMON_ROOM_BOOST_RATE / 60) * deltaTime;
      resident.health = Math.min(100, resident.health + healthGain);
      break;
    
    case "dormitory":
      if (gameState.currentPhase === "night") {
        // Restore health while sleeping (handled in sleeping state)
        const restoreRate = (HEALTH_CONFIG.SLEEP_RESTORE_RATE / 3600) * deltaTime;
        resident.health = Math.min(100, resident.health + restoreRate);
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
// Health System
// ============================================================================

/**
 * Update health decay for all residents
 */
export function updateAllResidentHealth(
  gameState: GameState,
  deltaTime: number
): void {
  for (const resident of gameState.residents) {
    updateResidentHealth(resident, gameState, deltaTime);
  }
}

/**
 * Update individual resident health
 */
export function updateResidentHealth(
  resident: Resident,
  gameState: GameState,
  deltaTime: number
): void {
  // Get decay rate based on profile
  const decayRate = PROFILE_SPECS[resident.profile].healthDecayRate;
  
  // Calculate decay per second
  // Decay rate is per day, and a day is 12 minutes (720 seconds)
  const decayPerSecond = decayRate / 720;
  const decay = decayPerSecond * deltaTime;
  
  // Apply decay
  resident.health = Math.max(0, resident.health - decay);
  
  // Check for leaving condition
  if (resident.health <= 0) {
    handleResidentLeaving(resident, gameState);
  }
}

/**
 * Handle resident leaving due to unhealthiness
 */
function handleResidentLeaving(resident: Resident, gameState: GameState): void {
  console.log(`😞 ${resident.name} left unhealthy`);
  
  // Reputation penalty
  handleUnhealthyDepartureReputation(gameState, resident.name);
  emitResidentDeparted(resident.id, resident.name, 'unhealthy');
  
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
