import { GameState, ResidentProfile, DisasterEventType } from '../../types';
import { SPAWN_CONFIG, ROOM_SPECS, TIMER_CONFIG, DISASTER_CONFIG } from '../../constants';
import { createResident } from './ResidentSystem';
import { getEntranceTile, isWalkable } from './GridSystem';
import { isTileOccupiedByResident } from './CollisionDetectionSystem';
import { getResidentCap, isAtResidentCap, isApproachingCapacity } from './TierSystem';

/**
 * Initialize the next resident spawn time
 */
export function initializeResidentSpawning(gameState: GameState): void {
  // Set next spawn to 1 day from now
  gameState.nextResidentSpawn = Date.now() + TIMER_CONFIG.FULL_DAY_CYCLE;
}

/**
 * Check if a new resident should spawn and spawn them
 */
export function checkResidentSpawning(gameState: GameState): void {
  const now = Date.now();
  
  // Check if it's time to spawn
  if (now < gameState.nextResidentSpawn) {
    return;
  }
  
  // Check reputation requirement
  if (gameState.reputation < SPAWN_CONFIG.MIN_REPUTATION_FOR_SPAWN) {
    console.log(`Reputation too low (${gameState.reputation}%) for new residents`);
    // Schedule next check
    gameState.nextResidentSpawn = now + TIMER_CONFIG.FULL_DAY_CYCLE;
    return;
  }
  
  // Check tier-based resident cap (primary cap)
  const tierCap = getResidentCap(gameState);
  if (gameState.residents.length >= tierCap) {
    console.log(`Shelter at tier capacity (${gameState.residents.length}/${tierCap}) - upgrade tier to increase!`);
    // Schedule next check
    gameState.nextResidentSpawn = now + TIMER_CONFIG.FULL_DAY_CYCLE;
    
    // Emit capacity warning
    window.dispatchEvent(new CustomEvent('game:show_notification', {
      detail: {
        message: `⚠️ At maximum capacity (${gameState.residents.length}/${tierCap}). Upgrade your shelter tier to accept more residents!`,
        type: 'warning'
      }
    }));
    return;
  }
  
  // Also check dormitory capacity (secondary cap - need beds)
  const dormitoryCap = getDormitoryCapacity(gameState);
  if (dormitoryCap > 0 && gameState.residents.length >= dormitoryCap) {
    console.log(`Not enough beds (${gameState.residents.length}/${dormitoryCap})`);
    // Schedule next check
    gameState.nextResidentSpawn = now + TIMER_CONFIG.FULL_DAY_CYCLE;
    
    // Emit notification
    window.dispatchEvent(new CustomEvent('game:show_notification', {
      detail: {
        message: `⚠️ Not enough dormitory beds. Build more dormitories to house new residents!`,
        type: 'warning'
      }
    }));
    return;
  }
  
  // Check if approaching capacity
  if (isApproachingCapacity(gameState)) {
    window.dispatchEvent(new CustomEvent('game:show_notification', {
      detail: {
        message: `📈 Approaching capacity (${gameState.residents.length}/${tierCap}). Consider upgrading your shelter tier!`,
        type: 'info'
      }
    }));
  }
  
  // Spawn a new resident
  spawnNewResident(gameState);
  
  // Schedule next spawn
  gameState.nextResidentSpawn = now + TIMER_CONFIG.FULL_DAY_CYCLE;
}

/**
 * Find an unoccupied spawn position near entrance
 */
function findSpawnPosition(gameState: GameState, entranceX: number, entranceY: number): { x: number; y: number } {
  // Try entrance first
  if (!isTileOccupiedByResident(entranceX, entranceY)) {
    return { x: entranceX, y: entranceY };
  }
  
  // Spiral outward from entrance
  for (let radius = 1; radius <= 3; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const x = entranceX + dx;
          const y = entranceY + dy;
          
          if (isWalkable(gameState.grid, x, y) && !isTileOccupiedByResident(x, y)) {
            return { x, y };
          }
        }
      }
    }
  }
  
  // Fallback: use entrance with small offset
  return {
    x: entranceX + (Math.random() - 0.5) * 0.5,
    y: entranceY + (Math.random() - 0.5) * 0.5
  };
}

/**
 * Spawn a new resident at the entrance
 */
function spawnNewResident(gameState: GameState): void {
  const entrance = getEntranceTile(gameState.grid);
  if (!entrance) {
    console.error("No entrance tile found for resident spawn");
    return;
  }
  
  // Find unoccupied spawn position
  const spawnPos = findSpawnPosition(gameState, entrance.x, entrance.y);
  
  // Select random profile based on weights
  const profile = selectRandomProfile();
  
  // Create new resident
  const newResident = createResident(
    profile,
    gameState.currentDay,
    spawnPos.x,
    spawnPos.y
  );
  
  gameState.residents.push(newResident);
  
  console.log(`🚪 New resident arrived: ${newResident.name} (${profile}) at (${Math.floor(spawnPos.x)}, ${Math.floor(spawnPos.y)})`);
}

/**
 * Select a random resident profile based on configured weights
 */
function selectRandomProfile(): ResidentProfile {
  const roll = Math.random();
  let cumulative = 0;
  
  const profiles: ResidentProfile[] = ["young_adult", "veteran", "elderly"];
  
  for (const profile of profiles) {
    cumulative += SPAWN_CONFIG.PROFILE_WEIGHTS[profile];
    if (roll < cumulative) {
      return profile;
    }
  }
  
  // Fallback
  return "young_adult";
}

/**
 * Calculate dormitory bed capacity
 */
export function getDormitoryCapacity(gameState: GameState): number {
  const dormitories = gameState.rooms.filter(r => r.type === "dormitory");
  const dormitoryCapacity = ROOM_SPECS.dormitory.capacity;
  
  return dormitories.length * dormitoryCapacity;
}

/**
 * Calculate maximum resident capacity (minimum of tier cap and dormitory beds)
 * The tier cap is the hard limit, but dormitory beds are also needed
 */
export function getMaxResidentCapacity(gameState: GameState): number {
  const tierCap = getResidentCap(gameState);
  const dormitoryCap = getDormitoryCapacity(gameState);
  
  // If no dormitories, return 0 (need beds)
  if (dormitoryCap === 0) return 0;
  
  // Return the minimum of tier cap and dormitory capacity
  return Math.min(tierCap, dormitoryCap);
}

/**
 * Get current occupancy percentage based on tier cap
 */
export function getOccupancyPercentage(gameState: GameState): number {
  const tierCap = getResidentCap(gameState);
  if (tierCap === 0) return 0;
  
  return Math.floor((gameState.residents.length / tierCap) * 100);
}

/**
 * Check if shelter can accept more residents
 */
export function canAcceptMoreResidents(gameState: GameState): boolean {
  return !isAtResidentCap(gameState) && gameState.residents.length < getDormitoryCapacity(gameState);
}

// ============================================================================
// Disaster Resident Spawning
// ============================================================================

/**
 * Spawn multiple disaster residents at once
 * These residents can temporarily exceed normal capacity
 */
export function spawnDisasterResidents(
  gameState: GameState,
  count: number,
  disasterType: DisasterEventType,
  lifeBoost: boolean = false
): void {
  const entrance = getEntranceTile(gameState.grid);
  if (!entrance) {
    console.error("No entrance tile found for disaster resident spawn");
    return;
  }
  
  const spawnedResidents: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Find spawn position with slight offset for multiple spawns
    const basePos = findSpawnPosition(gameState, entrance.x, entrance.y);
    const spawnPos = {
      x: basePos.x + (Math.random() - 0.5) * 0.3,
      y: basePos.y + (Math.random() - 0.5) * 0.3
    };
    
    // Select random profile
    const profile = selectRandomProfile();
    
    // Create new resident with disaster-specific arrival reason
    const newResident = createResident(
      profile,
      gameState.currentDay,
      spawnPos.x,
      spawnPos.y
    );
    
    // Override arrival reason based on disaster type
    newResident.arrivalReason = getDisasterArrivalReason(disasterType);
    
    // Apply life boost if disaster type provides it (e.g., factory closure)
    if (lifeBoost) {
      // These residents start with higher LIFE meter and faster fill rate
      newResident.lifeMeter = Math.min(100, newResident.lifeMeter + 15);
    }
    
    gameState.residents.push(newResident);
    spawnedResidents.push(newResident.name);
    
    // Track total residents helped
    gameState.totalResidentsHelped++;
  }
  
  console.log(`🚨 Disaster residents arrived (${count}): ${spawnedResidents.join(', ')}`);
  
  // Show notification
  window.dispatchEvent(new CustomEvent('game:show_notification', {
    detail: {
      message: `🚨 ${count} people have arrived seeking shelter!`,
      type: 'info'
    }
  }));
}

/**
 * Get arrival reason based on disaster type
 */
function getDisasterArrivalReason(disasterType: DisasterEventType): string {
  const reasons: Record<DisasterEventType, string> = {
    house_fire: "arrived after a devastating house fire",
    winter_storm: "arrived seeking refuge from the winter storm",
    factory_closure: "arrived after sudden factory closure",
    domestic_violence: "arrived seeking safe refuge",
    hospital_discharge: "arrived after hospital discharge",
    eviction_wave: "arrived after mass eviction"
  };
  
  return reasons[disasterType] || "arrived seeking emergency shelter";
}

/**
 * Calculate the disaster overflow capacity (allows exceeding tier cap)
 */
export function getDisasterOverflowCapacity(gameState: GameState): number {
  const tierCap = getResidentCap(gameState);
  return Math.floor(tierCap * DISASTER_CONFIG.OVERFLOW_MULTIPLIER);
}

/**
 * Check if shelter can accept disaster residents (allows overflow)
 */
export function canAcceptDisasterResidents(gameState: GameState, count: number): boolean {
  const overflowCap = getDisasterOverflowCapacity(gameState);
  return gameState.residents.length + count <= overflowCap;
}

/**
 * Get how many disaster residents can still be accepted
 */
export function getRemainingDisasterCapacity(gameState: GameState): number {
  const overflowCap = getDisasterOverflowCapacity(gameState);
  return Math.max(0, overflowCap - gameState.residents.length);
}

/**
 * Check if shelter is currently overcrowded (above tier cap but within disaster overflow)
 */
export function isOvercrowded(gameState: GameState): boolean {
  const tierCap = getResidentCap(gameState);
  return gameState.residents.length > tierCap;
}

/**
 * Decrement disaster resident count when residents graduate or leave
 */
export function decrementDisasterResidentCount(gameState: GameState): void {
  if (gameState.disasterResidentCount > 0) {
    gameState.disasterResidentCount--;
  }
}
