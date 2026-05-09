import { Grid, Resident } from '../../types';
import { isWalkable } from './GridSystem';

/**
 * CollisionDetectionSystem - Manages spatial occupancy and prevents NPCs from overlapping
 *
 * Enhanced with "Social Distancing" system:
 * - Gradual separation forces instead of instant teleportation
 * - Soft boundary constraints to keep residents inside walkable areas
 * - Personal space zones for natural crowd behavior
 */

// ============================================================================
// Social Distancing Configuration
// ============================================================================

const SOCIAL_DISTANCING_CONFIG = {
  PERSONAL_SPACE_RADIUS: 0.8,    // Minimum comfortable distance between residents
  SEPARATION_STRENGTH: 2.0,      // How strongly residents push apart
  BOUNDARY_FORCE_STRENGTH: 3.0,  // How strongly boundaries push back
  BOUNDARY_CHECK_RADIUS: 0.5,    // Distance from edge to start applying boundary force
  MAX_SEPARATION_FORCE: 1.5,     // Cap on separation velocity
  CROWD_DENSITY_RADIUS: 2,       // Radius to check for crowd density
  MAX_RESIDENTS_NEARBY: 3,       // Start applying extra separation if more than this
};

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

// ============================================================================
// Social Distancing System - Gradual Separation Forces
// ============================================================================

/**
 * Vector2D helper type
 */
interface Vector2D {
  x: number;
  y: number;
}

/**
 * Calculate separation force from nearby residents
 * Uses inverse-square law for natural feeling repulsion
 */
export function calculateSeparationForce(
  resident: Resident,
  allResidents: Resident[]
): Vector2D {
  const force: Vector2D = { x: 0, y: 0 };
  const { PERSONAL_SPACE_RADIUS, SEPARATION_STRENGTH, MAX_RESIDENTS_NEARBY, CROWD_DENSITY_RADIUS } = SOCIAL_DISTANCING_CONFIG;
  
  let nearbyCount = 0;
  
  for (const other of allResidents) {
    if (other.id === resident.id) continue;
    
    const dx = resident.gridX - other.gridX;
    const dy = resident.gridY - other.gridY;
    const distanceSquared = dx * dx + dy * dy;
    const distance = Math.sqrt(distanceSquared);
    
    // Count nearby residents for density calculation
    if (distance < CROWD_DENSITY_RADIUS) {
      nearbyCount++;
    }
    
    // Apply separation force if within personal space
    if (distance < PERSONAL_SPACE_RADIUS && distance > 0.01) {
      // Inverse-square repulsion: stronger when closer
      const strength = SEPARATION_STRENGTH * (1 - distance / PERSONAL_SPACE_RADIUS);
      
      // Normalize direction and apply force
      const normalizedDx = dx / distance;
      const normalizedDy = dy / distance;
      
      force.x += normalizedDx * strength;
      force.y += normalizedDy * strength;
    } else if (distance <= 0.01) {
      // Nearly on top of each other - apply random separation
      const angle = Math.random() * Math.PI * 2;
      force.x += Math.cos(angle) * SEPARATION_STRENGTH;
      force.y += Math.sin(angle) * SEPARATION_STRENGTH;
    }
  }
  
  // Apply extra separation in crowded areas
  if (nearbyCount > MAX_RESIDENTS_NEARBY) {
    const crowdMultiplier = 1 + (nearbyCount - MAX_RESIDENTS_NEARBY) * 0.3;
    force.x *= crowdMultiplier;
    force.y *= crowdMultiplier;
  }
  
  // Cap maximum force
  const forceMagnitude = Math.sqrt(force.x * force.x + force.y * force.y);
  if (forceMagnitude > SOCIAL_DISTANCING_CONFIG.MAX_SEPARATION_FORCE) {
    const scale = SOCIAL_DISTANCING_CONFIG.MAX_SEPARATION_FORCE / forceMagnitude;
    force.x *= scale;
    force.y *= scale;
  }
  
  return force;
}

/**
 * Calculate boundary force to keep resident inside walkable area
 * Applies soft push-back when approaching non-walkable tiles
 */
export function calculateBoundaryForce(
  grid: Grid,
  x: number,
  y: number
): Vector2D {
  const force: Vector2D = { x: 0, y: 0 };
  const { BOUNDARY_FORCE_STRENGTH, BOUNDARY_CHECK_RADIUS } = SOCIAL_DISTANCING_CONFIG;
  
  // Check all 8 directions for boundaries
  const directions = [
    { dx: 1, dy: 0 },   // East
    { dx: -1, dy: 0 },  // West
    { dx: 0, dy: 1 },   // South
    { dx: 0, dy: -1 },  // North
    { dx: 1, dy: 1 },   // SE
    { dx: -1, dy: 1 },  // SW
    { dx: 1, dy: -1 },  // NE
    { dx: -1, dy: -1 }, // NW
  ];
  
  for (const dir of directions) {
    const checkX = Math.floor(x + dir.dx * BOUNDARY_CHECK_RADIUS);
    const checkY = Math.floor(y + dir.dy * BOUNDARY_CHECK_RADIUS);
    
    // If the adjacent tile is not walkable, apply force away from it
    if (!isWalkable(grid, checkX, checkY)) {
      // Calculate how close we are to the boundary
      const fractionalX = x - Math.floor(x);
      const fractionalY = y - Math.floor(y);
      
      // Distance to the boundary edge
      let distanceToBoundary = 1;
      if (dir.dx > 0) distanceToBoundary = Math.min(distanceToBoundary, 1 - fractionalX);
      if (dir.dx < 0) distanceToBoundary = Math.min(distanceToBoundary, fractionalX);
      if (dir.dy > 0) distanceToBoundary = Math.min(distanceToBoundary, 1 - fractionalY);
      if (dir.dy < 0) distanceToBoundary = Math.min(distanceToBoundary, fractionalY);
      
      // Apply stronger force as we get closer to boundary
      if (distanceToBoundary < BOUNDARY_CHECK_RADIUS) {
        const strength = BOUNDARY_FORCE_STRENGTH * (1 - distanceToBoundary / BOUNDARY_CHECK_RADIUS);
        force.x -= dir.dx * strength;
        force.y -= dir.dy * strength;
      }
    }
  }
  
  // Also check if current tile is somehow not walkable (shouldn't happen but safety check)
  const currentTileX = Math.floor(x);
  const currentTileY = Math.floor(y);
  if (!isWalkable(grid, currentTileX, currentTileY)) {
    console.log(`🚨 TELEPORT DEBUG: NPC at (${x.toFixed(2)}, ${y.toFixed(2)}) is on NON-WALKABLE tile (${currentTileX}, ${currentTileY})`);
    // Find nearest walkable tile and push towards it
    const nearest = findNearestWalkableTile(grid, currentTileX, currentTileY);
    if (nearest) {
      console.log(`🚨 TELEPORT DEBUG: Nearest walkable tile: (${nearest.x}, ${nearest.y})`);
      const dx = nearest.x + 0.5 - x;
      const dy = nearest.y + 0.5 - y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > 0.01) {
        console.log(`🚨 TELEPORT DEBUG: Applying strong boundary force, distance: ${distance.toFixed(2)}`);
        force.x += (dx / distance) * BOUNDARY_FORCE_STRENGTH * 2;
        force.y += (dy / distance) * BOUNDARY_FORCE_STRENGTH * 2;
      }
    }
  }
  
  return force;
}

/**
 * Find nearest walkable tile from a given position
 */
function findNearestWalkableTile(
  grid: Grid,
  startX: number,
  startY: number,
  maxRadius: number = 5
): { x: number; y: number } | null {
  // Spiral outward search
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const x = startX + dx;
          const y = startY + dy;
          if (isWalkable(grid, x, y)) {
            return { x, y };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Apply social distancing forces to get adjusted position
 * This is the main function to call for gradual separation
 */
export function applySocialDistancing(
  resident: Resident,
  allResidents: Resident[],
  grid: Grid,
  deltaTime: number
): { newX: number; newY: number; wasAdjusted: boolean } {
  // Calculate separation force from other residents
  const separationForce = calculateSeparationForce(resident, allResidents);
  
  // Calculate boundary force to stay inside walkable area
  const boundaryForce = calculateBoundaryForce(grid, resident.gridX, resident.gridY);
  
  // Combine forces
  const totalForceX = separationForce.x + boundaryForce.x;
  const totalForceY = separationForce.y + boundaryForce.y;
  
  // Check if any adjustment is needed
  const forceMagnitude = Math.sqrt(totalForceX * totalForceX + totalForceY * totalForceY);
  if (forceMagnitude < 0.01) {
    return { newX: resident.gridX, newY: resident.gridY, wasAdjusted: false };
  }
  
  // Apply force with deltaTime for smooth movement
  let newX = resident.gridX + totalForceX * deltaTime;
  let newY = resident.gridY + totalForceY * deltaTime;
  
  // Final boundary check - ensure we don't end up outside walkable area
  const targetTileX = Math.floor(newX);
  const targetTileY = Math.floor(newY);
  
  if (!isWalkable(grid, targetTileX, targetTileY)) {
    console.log(`🚨 TELEPORT DEBUG: Social distancing target (${targetTileX}, ${targetTileY}) is NOT walkable`);
    // Clamp to current tile if target is not walkable
    const currentTileX = Math.floor(resident.gridX);
    const currentTileY = Math.floor(resident.gridY);
    
    // Try to stay within current tile bounds
    if (isWalkable(grid, currentTileX, currentTileY)) {
      console.log(`🚨 TELEPORT DEBUG: Clamping to current tile (${currentTileX}, ${currentTileY})`);
      newX = Math.max(currentTileX + 0.1, Math.min(currentTileX + 0.9, newX));
      newY = Math.max(currentTileY + 0.1, Math.min(currentTileY + 0.9, newY));
    } else {
      // Current tile isn't walkable either - find nearest walkable
      console.log(`🚨 TELEPORT DEBUG: Current tile (${currentTileX}, ${currentTileY}) is ALSO not walkable! Finding nearest walkable...`);
      const nearest = findNearestWalkableTile(grid, currentTileX, currentTileY);
      if (nearest) {
        console.log(`🚨 TELEPORT DEBUG: TELEPORTING from (${resident.gridX.toFixed(2)}, ${resident.gridY.toFixed(2)}) to (${nearest.x + 0.5}, ${nearest.y + 0.5})`);
        newX = nearest.x + 0.5;
        newY = nearest.y + 0.5;
      }
    }
  }
  
  return { newX, newY, wasAdjusted: true };
}

/**
 * Find safe nearby position that is walkable and not too crowded
 * Used as a fallback when resident needs to be repositioned
 */
export function findSafeNearbyPosition(
  grid: Grid,
  startX: number,
  startY: number,
  excludeResidentId: string,
  allResidents: Resident[],
  maxRadius: number = 3
): { x: number; y: number } | null {
  const candidates: Array<{ x: number; y: number; score: number }> = [];
  
  // Spiral outward search for candidate positions
  for (let radius = 0; radius <= maxRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only check tiles at current radius (spiral shell)
        if (radius > 0 && Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        
        const x = Math.floor(startX) + dx;
        const y = Math.floor(startY) + dy;
        
        // Check if walkable
        if (!isWalkable(grid, x, y)) continue;
        
        // Check if occupied by another resident
        if (isTileOccupiedByOther(x, y, excludeResidentId)) continue;
        
        // Calculate crowd score (lower is better)
        let crowdScore = 0;
        for (const other of allResidents) {
          if (other.id === excludeResidentId) continue;
          const distX = x + 0.5 - other.gridX;
          const distY = y + 0.5 - other.gridY;
          const dist = Math.sqrt(distX * distX + distY * distY);
          if (dist < SOCIAL_DISTANCING_CONFIG.CROWD_DENSITY_RADIUS) {
            crowdScore += 1 / (dist + 0.1); // Inverse distance scoring
          }
        }
        
        // Prefer tiles closer to original position
        const distanceScore = radius * 0.5;
        
        candidates.push({
          x: x + 0.5, // Center of tile
          y: y + 0.5,
          score: crowdScore + distanceScore
        });
      }
    }
  }
  
  if (candidates.length === 0) return null;
  
  // Sort by score (lower is better) and return best
  candidates.sort((a, b) => a.score - b.score);
  return { x: candidates[0].x, y: candidates[0].y };
}

/**
 * Clamp position to ensure it stays within walkable bounds
 */
export function clampToWalkableBounds(
  grid: Grid,
  x: number,
  y: number
): { x: number; y: number } {
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  
  // If current position is walkable, just clamp within tile
  if (isWalkable(grid, tileX, tileY)) {
    return {
      x: Math.max(tileX + 0.05, Math.min(tileX + 0.95, x)),
      y: Math.max(tileY + 0.05, Math.min(tileY + 0.95, y))
    };
  }
  
  // Find nearest walkable tile and return its center
  const nearest = findNearestWalkableTile(grid, tileX, tileY);
  if (nearest) {
    return { x: nearest.x + 0.5, y: nearest.y + 0.5 };
  }
  
  // Fallback: return original position
  return { x, y };
}

/**
 * Check if a position would cause stacking with other residents
 */
export function wouldCauseStacking(
  x: number,
  y: number,
  excludeResidentId: string,
  allResidents: Resident[]
): boolean {
  const { PERSONAL_SPACE_RADIUS } = SOCIAL_DISTANCING_CONFIG;
  
  for (const other of allResidents) {
    if (other.id === excludeResidentId) continue;
    
    const dx = x - other.gridX;
    const dy = y - other.gridY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < PERSONAL_SPACE_RADIUS * 0.5) {
      return true; // Too close
    }
  }
  
  return false;
}
