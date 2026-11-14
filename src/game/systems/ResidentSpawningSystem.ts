import { GameState, Resident, ResidentProfile, DisasterEventType, Gender } from '../../types';
import { SPAWN_CONFIG, ROOM_SPECS, DISASTER_CONFIG, roomKind } from '../../constants';
import { createResident } from './ResidentSystem';
import { getEntranceTile, isWalkable } from './GridSystem';
import { isTileOccupiedByResident } from './CollisionDetectionSystem';
import { getResidentCap, isAtResidentCap } from './TierSystem';

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
 * Spawn a new resident at the entrance. Residents only arrive by accepting an event.
 */
export function spawnNewResident(gameState: GameState, profile: ResidentProfile = selectRandomProfile()): Resident | null {
  const entrance = getEntranceTile(gameState.grid);
  if (!entrance) {
    console.error("No entrance tile found for resident spawn");
    return null;
  }

  // Only a gender with a free bed may arrive (no bed for either = nobody arrives)
  const beds = getFreeBeds(gameState);
  const options: Gender[] = [];
  if (beds.male > 0) options.push('male');
  if (beds.female > 0) options.push('female');
  if (options.length === 0) return null;
  const gender = options[Math.floor(Math.random() * options.length)];
  
  // Find unoccupied spawn position
  const spawnPos = findSpawnPosition(gameState, entrance.x, entrance.y);
  
  // Create new resident
  const newResident = createResident(
    profile,
    gameState.currentDay,
    spawnPos.x,
    spawnPos.y,
    gender
  );
  
  gameState.residents.push(newResident);
  gameState.totalResidentsHelped++;
  
  console.log(`🚪 New resident arrived: ${newResident.name} (${profile}) at (${Math.floor(spawnPos.x)}, ${Math.floor(spawnPos.y)})`);
  return newResident;
}

/**
 * Free beds by gender. Residents fill dorms of their own gender first and spill into
 * 'any' dorms; old data without a gender on room or resident counts as 'any'.
 * male/female = how many more of that gender could be housed; total = all free beds.
 */
export function getFreeBeds(gameState: GameState): { male: number; female: number; total: number } {
  let capM = 0, capF = 0, capAny = 0;
  for (const r of gameState.rooms) {
    if (roomKind(r.type) !== "dormitory") continue;
    const beds = ROOM_SPECS[r.type].capacity;
    if (r.gender === 'male') capM += beds;
    else if (r.gender === 'female') capF += beds;
    else capAny += beds;
  }
  const men = gameState.residents.filter(r => r.gender === 'male').length;
  const women = gameState.residents.filter(r => r.gender === 'female').length;
  const unknown = gameState.residents.length - men - women;

  const freeM = Math.max(0, capM - men);
  const freeF = Math.max(0, capF - women);
  const overflow = Math.max(0, men - capM) + Math.max(0, women - capF) + unknown;
  const freeAny = Math.max(0, capAny - overflow);
  return { male: freeM + freeAny, female: freeF + freeAny, total: freeM + freeF + freeAny };
}

/** How many more residents fit right now (tier cap and beds). */
export function getFreeResidentSlots(gameState: GameState): number {
  const tierSlots = Math.max(0, getResidentCap(gameState) - gameState.residents.length);
  return Math.min(tierSlots, getFreeBeds(gameState).total);
}

/**
 * Select a random resident profile based on configured weights
 */
function selectRandomProfile(): ResidentProfile {
  const roll = Math.random();
  let cumulative = 0;
  
  const profiles: ResidentProfile[] = ["young_adult", "adult", "elderly"];
  
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
  return gameState.rooms
    .filter(r => roomKind(r.type) === "dormitory")
    .reduce((beds, r) => beds + ROOM_SPECS[r.type].capacity, 0);
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

    // Prefer a gender that still has a free bed; disasters may overflow, so fall back to random
    const beds = getFreeBeds(gameState);
    const disasterGender: Gender | undefined =
      beds.male > 0 && beds.female === 0 ? 'male' : beds.female > 0 && beds.male === 0 ? 'female' : undefined;
    
    // Create new resident with disaster-specific arrival reason
    const newResident = createResident(
      profile,
      gameState.currentDay,
      spawnPos.x,
      spawnPos.y,
      disasterGender
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
    earthquake: "arrived after the earthquake",
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
