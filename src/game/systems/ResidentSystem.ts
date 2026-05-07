import { Resident, ResidentProfile, Grid } from '../../types/index.ts';
import {
  LIFE_METER_CONFIG,
  HAPPINESS_CONFIG,
  PROFILE_SPECS,
  NAME_LISTS,
  ARRIVAL_REASONS
} from '../../constants/index.ts';
import { generateUUID, generateRandomName, getRandomItem, randomInt } from '../../utils/helpers.ts';
import { registerResident, isTileOccupiedByResident } from './CollisionDetectionSystem';
import { isWalkable } from './GridSystem';

/**
 * Create a new resident with random attributes
 */
export function createResident(
  profile: ResidentProfile,
  currentDay: number,
  spawnX: number,
  spawnY: number
): Resident {
  const name = generateRandomName(NAME_LISTS.FIRST_NAMES, NAME_LISTS.LAST_NAMES);
  const arrivalReason = getRandomItem(ARRIVAL_REASONS);
  const startingLife = randomInt(LIFE_METER_CONFIG.STARTING_MIN, LIFE_METER_CONFIG.STARTING_MAX);
  
  // Add random offset to AI timers (0-4 seconds) to stagger updates and prevent sync movement
  const now = Date.now();
  const randomOffset = Math.random() * 4000;
  
  const resident: Resident = {
    id: generateUUID(),
    name,
    profile,
    happiness: HAPPINESS_CONFIG.STARTING,
    lifeMeter: startingLife,
    currentState: "idle",
    currentNeed: null,
    targetRoomId: null,
    path: null,
    pathIndex: 0,
    gridX: spawnX,
    gridY: spawnY,
    sleepX: null,
    sleepY: null,
    arrivalDay: currentDay,
    arrivalReason,
    daysInShelter: 0,
    lastHappinessUpdate: now - randomOffset,
    lastNeedCheck: now - randomOffset,
    lastLifeUpdate: now - randomOffset,
    lastMealTime: now - randomOffset
  };
  
  // Register in collision detection system
  registerResident(resident);
  console.log(`[ResidentCreate] ${name} registered at (${Math.floor(spawnX)}, ${Math.floor(spawnY)})`);
  
  return resident;
}

/**
 * Find a nearby unoccupied spawn position
 */
function findNearbySpawnPosition(
  grid: Grid,
  centerX: number,
  centerY: number,
  maxRadius: number = 3
): { x: number; y: number } {
  // Try the center first
  const centerOccupied = isTileOccupiedByResident(centerX, centerY);
  console.log(`[SpawnSearch] Center (${centerX}, ${centerY}) - walkable: ${isWalkable(grid, centerX, centerY)}, occupied: ${centerOccupied}`);
  if (isWalkable(grid, centerX, centerY) && !centerOccupied) {
    return { x: centerX, y: centerY };
  }
  
  // Spiral outward from center
  for (let radius = 1; radius <= maxRadius; radius++) {
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        // Only check tiles at current radius (not inner tiles)
        if (Math.abs(dx) === radius || Math.abs(dy) === radius) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (isWalkable(grid, x, y) && !isTileOccupiedByResident(x, y)) {
            console.log(`[SpawnSearch] Found unoccupied tile at (${x}, ${y}) radius ${radius}`);
            return { x, y };
          }
        }
      }
    }
  }
  
  // Fallback: return center with small random offset
  return {
    x: centerX + (Math.random() - 0.5) * 0.5,
    y: centerY + (Math.random() - 0.5) * 0.5
  };
}

/**
 * Create multiple test residents with spread-out spawning
 */
export function createTestResidents(
  count: number,
  currentDay: number,
  spawnX: number,
  spawnY: number,
  grid?: Grid
): Resident[] {
  const residents: Resident[] = [];
  const profiles: ResidentProfile[] = ["young_adult", "veteran", "elderly"];
  
  for (let i = 0; i < count; i++) {
    const profile = profiles[i % profiles.length];
    
    // Find unoccupied spawn position if grid is provided
    let actualSpawnX = spawnX;
    let actualSpawnY = spawnY;
    
    if (grid) {
      const pos = findNearbySpawnPosition(grid, spawnX, spawnY);
      actualSpawnX = pos.x;
      actualSpawnY = pos.y;
      console.log(`[ResidentSpawn] Resident ${i+1}: Spawning at (${Math.floor(actualSpawnX)}, ${Math.floor(actualSpawnY)})`);
    }
    
    residents.push(createResident(profile, currentDay, actualSpawnX, actualSpawnY));
  }
  
  return residents;
}

/**
 * Get resident profile specification
 */
export function getProfileSpec(profile: ResidentProfile) {
  return PROFILE_SPECS[profile];
}
