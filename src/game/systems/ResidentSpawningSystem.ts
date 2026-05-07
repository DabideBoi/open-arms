import { GameState, ResidentProfile } from '../../types';
import { SPAWN_CONFIG, ROOM_SPECS, TIMER_CONFIG } from '../../constants';
import { createResident } from './ResidentSystem';
import { getEntranceTile, isWalkable } from './GridSystem';
import { isTileOccupiedByResident } from './CollisionDetectionSystem';

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
  
  // Check capacity (based on dormitory beds)
  const maxCapacity = getMaxResidentCapacity(gameState);
  if (gameState.residents.length >= maxCapacity) {
    console.log(`Shelter at capacity (${gameState.residents.length}/${maxCapacity})`);
    // Schedule next check
    gameState.nextResidentSpawn = now + TIMER_CONFIG.FULL_DAY_CYCLE;
    return;
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
 * Calculate maximum resident capacity based on dormitory beds
 */
export function getMaxResidentCapacity(gameState: GameState): number {
  const dormitories = gameState.rooms.filter(r => r.type === "dormitory");
  const dormitoryCapacity = ROOM_SPECS.dormitory.capacity;
  
  return dormitories.length * dormitoryCapacity;
}

/**
 * Get current occupancy percentage
 */
export function getOccupancyPercentage(gameState: GameState): number {
  const maxCapacity = getMaxResidentCapacity(gameState);
  if (maxCapacity === 0) return 0;
  
  return Math.floor((gameState.residents.length / maxCapacity) * 100);
}
