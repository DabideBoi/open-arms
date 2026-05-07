import { Grid, Resident } from '../../types';

/**
 * CollisionDetectionSystem - Manages spatial occupancy and prevents NPCs from overlapping
 */

// ============================================================================
// Spatial Occupancy Tracking
// ============================================================================

/**
 * Spatial occupancy map - tracks which residents are at which tiles
 */
class SpatialOccupancyMap {
  private occupancy: Map<string, string> = new Map(); // key: "x,y" -> residentId
  private reservations: Map<string, string> = new Map(); // key: "x,y" -> residentId (for pathfinding targets)
  
  /**
   * Generate key for a tile position
   */
  private getKey(x: number, y: number): string {
    return `${Math.floor(x)},${Math.floor(y)}`;
  }
  
  /**
   * Check if a tile is occupied by a resident
   */
  isOccupied(x: number, y: number): boolean {
    const key = this.getKey(x, y);
    return this.occupancy.has(key) || this.reservations.has(key);
  }
  
  /**
   * Check if a tile is occupied (not reserved)
   */
  isPhysicallyOccupied(x: number, y: number): boolean {
    return this.occupancy.has(this.getKey(x, y));
  }
  
  /**
   * Get resident ID at a tile
   */
  getResidentAt(x: number, y: number): string | null {
    return this.occupancy.get(this.getKey(x, y)) || null;
  }
  
  /**
   * Set a tile as occupied by a resident
   */
  setOccupied(x: number, y: number, residentId: string): void {
    const key = this.getKey(x, y);
    this.occupancy.set(key, residentId);
  }
  
  /**
   * Clear a tile (resident moved away)
   */
  clearTile(x: number, y: number): void {
    const key = this.getKey(x, y);
    this.occupancy.delete(key);
  }
  
  /**
   * Update resident position (clear old, set new)
   */
  updateResidentPosition(
    oldX: number,
    oldY: number,
    newX: number,
    newY: number,
    residentId: string
  ): void {
    const oldKey = this.getKey(oldX, oldY);
    const newKey = this.getKey(newX, newY);
    
    // Only update if position actually changed
    if (oldKey !== newKey) {
      this.occupancy.delete(oldKey);
      this.occupancy.set(newKey, residentId);
    }
  }
  
  /**
   * Remove resident from occupancy map
   */
  removeResident(residentId: string): void {
    // Find and remove all entries for this resident
    const keysToDelete: string[] = [];
    
    for (const [key, id] of this.occupancy.entries()) {
      if (id === residentId) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.occupancy.delete(key);
    }
  }
  
  /**
   * Rebuild occupancy map from current resident positions
   */
  rebuild(residents: Resident[]): void {
    this.occupancy.clear();
    
    for (const resident of residents) {
      const x = Math.floor(resident.gridX);
      const y = Math.floor(resident.gridY);
      this.setOccupied(x, y, resident.id);
    }
  }
  
  /**
   * Reserve a tile for a resident (pathfinding target)
   */
  reserveTile(x: number, y: number, residentId: string): void {
    const key = this.getKey(x, y);
    this.reservations.set(key, residentId);
  }
  
  /**
   * Clear reservation for a resident
   */
  clearReservation(residentId: string): void {
    const keysToDelete: string[] = [];
    for (const [key, id] of this.reservations.entries()) {
      if (id === residentId) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      this.reservations.delete(key);
    }
  }
  
  /**
   * Clear all occupancy data
   */
  clear(): void {
    this.occupancy.clear();
    this.reservations.clear();
  }
  
  /**
   * Get statistics
   */
  getStats(): { occupiedTiles: number; reservedTiles: number } {
    return {
      occupiedTiles: this.occupancy.size,
      reservedTiles: this.reservations.size
    };
  }
}

// Global occupancy map instance
const occupancyMap = new SpatialOccupancyMap();

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize collision detection system with current residents
 */
export function initializeCollisionDetection(residents: Resident[]): void {
  occupancyMap.rebuild(residents);
}

/**
 * Check if a tile is occupied by any resident
 */
export function isTileOccupiedByResident(x: number, y: number): boolean {
  return occupancyMap.isOccupied(x, y);
}

/**
 * Check if a tile is occupied by a specific resident (excluding them)
 */
export function isTileOccupiedByOther(
  x: number,
  y: number,
  excludeResidentId: string
): boolean {
  const key = `${Math.floor(x)},${Math.floor(y)}`;
  const residentId = occupancyMap.getResidentAt(x, y);
  
  // Check physical occupancy by another resident
  if (residentId !== null && residentId !== excludeResidentId) {
    return true;
  }
  
  // Check if reserved by another resident (not by self)
  const reservedBy = occupancyMap['reservations'].get(key);
  if (reservedBy && reservedBy !== excludeResidentId) {
    return true;
  }
  
  return false;
}

/**
 * Get resident ID at a tile
 */
export function getResidentAtTile(x: number, y: number): string | null {
  return occupancyMap.getResidentAt(x, y);
}

/**
 * Check if movement to a tile is valid (walkable and not occupied)
 */
export function canMoveTo(
  grid: Grid,
  x: number,
  y: number,
  residentId: string
): boolean {
  // Check bounds
  if (x < 0 || y < 0 || x >= grid.width || y >= grid.height) {
    return false;
  }
  
  // Check if walkable
  if (!grid.tiles[y][x].walkable) {
    return false;
  }
  
  // Check if occupied by another resident
  if (isTileOccupiedByOther(x, y, residentId)) {
    return false;
  }
  
  return true;
}

/**
 * Update resident position in occupancy map
 */
export function updateResidentPosition(
  resident: Resident,
  oldX: number,
  oldY: number
): void {
  const newX = Math.floor(resident.gridX);
  const newY = Math.floor(resident.gridY);
  
  occupancyMap.updateResidentPosition(oldX, oldY, newX, newY, resident.id);
}

/**
 * Register a new resident in the occupancy map
 */
export function registerResident(resident: Resident): void {
  const x = Math.floor(resident.gridX);
  const y = Math.floor(resident.gridY);
  occupancyMap.setOccupied(x, y, resident.id);
}

/**
 * Unregister a resident from the occupancy map
 */
export function unregisterResident(residentId: string): void {
  occupancyMap.removeResident(residentId);
}

/**
 * Rebuild occupancy map from scratch (use after loading save)
 */
export function rebuildOccupancyMap(residents: Resident[]): void {
  occupancyMap.rebuild(residents);
}

/**
 * Clear all collision detection data
 */
export function clearCollisionDetection(): void {
  occupancyMap.clear();
}

/**
 * Reserve a tile for a resident's pathfinding target
 */
export function reserveTileForResident(x: number, y: number, residentId: string): void {
  occupancyMap.reserveTile(x, y, residentId);
  console.log(`[Collision] ${residentId.substring(0, 8)} reserved tile (${Math.floor(x)}, ${Math.floor(y)})`);
}

/**
 * Clear tile reservation for a resident
 */
export function clearTileReservation(residentId: string): void {
  occupancyMap.clearReservation(residentId);
}

/**
 * Get collision detection statistics
 */
export function getCollisionStats(): { occupiedTiles: number; reservedTiles: number } {
  return occupancyMap.getStats();
}

// ============================================================================
// Waiting/Queueing Behavior
// ============================================================================

interface WaitingResident {
  residentId: string;
  targetX: number;
  targetY: number;
  waitStartTime: number;
  maxWaitTime: number;
  forcedTimeout?: boolean; // Flag for deadlock-forced timeouts
}

const waitingResidents: Map<string, WaitingResident> = new Map();

/**
 * Add resident to waiting queue for a tile
 */
export function addToWaitQueue(
  residentId: string,
  targetX: number,
  targetY: number,
  maxWaitTime: number = 5000 // 5 seconds default
): void {
  waitingResidents.set(residentId, {
    residentId,
    targetX,
    targetY,
    waitStartTime: Date.now(),
    maxWaitTime
  });
}

/**
 * Remove resident from waiting queue
 */
export function removeFromWaitQueue(residentId: string): void {
  waitingResidents.delete(residentId);
}

/**
 * Check if resident is waiting
 */
export function isWaiting(residentId: string): boolean {
  return waitingResidents.has(residentId);
}

/**
 * Check if resident can proceed (tile became available or timeout)
 */
export function canProceedFromWait(residentId: string): {
  canProceed: boolean;
  reason: 'available' | 'timeout' | null;
} {
  const waiting = waitingResidents.get(residentId);
  
  if (!waiting) {
    return { canProceed: true, reason: null };
  }
  
  // Check if forced timeout by deadlock detection
  if (waiting.forcedTimeout) {
    return { canProceed: true, reason: 'timeout' };
  }
  
  // Check if tile is now available
  if (!isTileOccupiedByOther(waiting.targetX, waiting.targetY, residentId)) {
    return { canProceed: true, reason: 'available' };
  }
  
  // Check if wait time exceeded
  const waitTime = Date.now() - waiting.waitStartTime;
  if (waitTime > waiting.maxWaitTime) {
    return { canProceed: true, reason: 'timeout' };
  }
  
  return { canProceed: false, reason: null };
}

/**
 * Detect circular deadlocks where residents are waiting for each other
 */
function detectDeadlock(): string | null {
  // If multiple residents are waiting for the same tile, that's a potential deadlock
  const tileWaitCounts = new Map<string, string[]>();
  
  for (const [residentId, waiting] of waitingResidents.entries()) {
    const key = `${Math.floor(waiting.targetX)},${Math.floor(waiting.targetY)}`;
    if (!tileWaitCounts.has(key)) {
      tileWaitCounts.set(key, []);
    }
    tileWaitCounts.get(key)!.push(residentId);
  }
  
  // Find tiles with multiple waiters
  for (const [tileKey, waiters] of tileWaitCounts.entries()) {
    if (waiters.length > 1) {
      // Multiple residents waiting for same tile - return one to force timeout
      return waiters[0];
    }
  }
  
  // Check for circular waits: A waits for B's tile, B waits for C's tile, C waits for A's tile
  for (const [residentId, waiting] of waitingResidents.entries()) {
    const targetKey = `${Math.floor(waiting.targetX)},${Math.floor(waiting.targetY)}`;
    const occupyingResident = occupancyMap.getResidentAt(waiting.targetX, waiting.targetY);
    
    if (occupyingResident && waitingResidents.has(occupyingResident)) {
      // The resident we're waiting for is also waiting - potential circular deadlock
      return residentId;
    }
  }
  
  return null;
}

/**
 * Update all waiting residents (call each frame)
 */
export function updateWaitingResidents(): void {
  const now = Date.now();
  
  // First, detect and break deadlocks
  const deadlockedResident = detectDeadlock();
  if (deadlockedResident) {
    const waiting = waitingResidents.get(deadlockedResident);
    if (waiting) {
      console.log(`[Deadlock] Forcing timeout for ${deadlockedResident.substring(0, 8)} to break deadlock`);
      // Mark as forced timeout instead of deleting
      waiting.forcedTimeout = true;
    }
  }
  
  // Then update normal wait times
  for (const [residentId, waiting] of waitingResidents.entries()) {
    const waitTime = now - waiting.waitStartTime;
    
    // Mark as timed out if wait time exceeded
    if (waitTime > waiting.maxWaitTime) {
      waiting.forcedTimeout = true;
    }
  }
}

/**
 * Clear all waiting residents
 */
export function clearWaitQueue(): void {
  waitingResidents.clear();
}

/**
 * Get waiting queue statistics
 */
export function getWaitQueueStats(): {
  waitingCount: number;
  averageWaitTime: number;
} {
  const now = Date.now();
  let totalWaitTime = 0;
  
  for (const waiting of waitingResidents.values()) {
    totalWaitTime += now - waiting.waitStartTime;
  }
  
  return {
    waitingCount: waitingResidents.size,
    averageWaitTime: waitingResidents.size > 0 ? totalWaitTime / waitingResidents.size : 0
  };
}
