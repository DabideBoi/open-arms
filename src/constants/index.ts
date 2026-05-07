import { RoomSpec, RoomType, ResidentProfileSpec, ResidentProfile } from '../types';

// ============================================================================
// Grid Configuration
// ============================================================================

export const GRID_CONFIG = {
  TOTAL_WIDTH: 40,
  TOTAL_HEIGHT: 30,
  STARTER_SIZE: 20,           // Starting with 20x20 for Phase 1
  TILE_SIZE: 32,              // Pixels per tile
  EXPANSION_COST_PER_TILE: 100,
  MIN_EXPANSION: 5,
  MAX_EXPANSION: 10
} as const;

// ============================================================================
// Room Specifications
// ============================================================================

export const ROOM_SPECS: Record<RoomType, RoomSpec> = {
  dormitory: {
    type: "dormitory",
    width: 3,
    height: 3,
    buildCost: 500,
    maintenanceCost: 20,
    capacity: 4,
    closesAtNight: false,
    needsSatisfied: ["sleep"]
  },
  
  cafeteria: {
    type: "cafeteria",
    width: 5,
    height: 3,
    buildCost: 800,
    maintenanceCost: 40,
    capacity: 10,
    closesAtNight: true,
    needsSatisfied: ["food"]
  },
  
  learning_center: {
    type: "learning_center",
    width: 4,
    height: 3,
    buildCost: 1000,
    maintenanceCost: 50,
    capacity: 6,
    closesAtNight: true,
    needsSatisfied: ["learning"],
    image: "rooms/learning_center"
  },
  
  vocational_room: {
    type: "vocational_room",
    width: 4,
    height: 3,
    buildCost: 1200,
    maintenanceCost: 60,
    capacity: 6,
    closesAtNight: true,
    needsSatisfied: ["learning"]
  },
  
  bathroom: {
    type: "bathroom",
    width: 2,
    height: 2,
    buildCost: 300,
    maintenanceCost: 15,
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: ["bathroom"]
  },
  
  common_room: {
    type: "common_room",
    width: 3,
    height: 3,
    buildCost: 600,
    maintenanceCost: 25,
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: ["social"]
  },
  
  admin_office: {
    type: "admin_office",
    width: 2,
    height: 2,
    buildCost: 400,
    maintenanceCost: 20,
    capacity: 0,
    closesAtNight: true,
    needsSatisfied: []
  },
  
  fundraiser_station: {
    type: "fundraiser_station",
    width: 3,
    height: 2,
    buildCost: 700,
    maintenanceCost: 30,
    capacity: 4,
    closesAtNight: true,
    needsSatisfied: []
  }
};

// ============================================================================
// Resident Profile Specifications
// ============================================================================

export const PROFILE_SPECS: Record<ResidentProfile, ResidentProfileSpec> = {
  young_adult: {
    profile: "young_adult",
    lifeFillRate: 15 / 3600,           // 15 per hour (converted to per second)
    happinessDecayRate: 10,            // 10 per day
    fundraiserEfficiency: 1.2,         // 20% bonus
    graduationBonus: 0,
    displayName: "Young Adult",
    icon: "🧑"
  },
  
  veteran: {
    profile: "veteran",
    lifeFillRate: 8 / 3600,            // 8 per hour (converted to per second)
    happinessDecayRate: 5,             // 5 per day (stable)
    fundraiserEfficiency: 1.0,         // Normal
    graduationBonus: 2,                // +2 reputation on graduation
    displayName: "Veteran",
    icon: "🎖️"
  },
  
  elderly: {
    profile: "elderly",
    lifeFillRate: 5 / 3600,            // 5 per hour (converted to per second)
    happinessDecayRate: 15,            // 15 per day (needs comfort)
    fundraiserEfficiency: 0.8,         // 20% penalty
    graduationBonus: 0,
    displayName: "Elderly",
    icon: "👴"
  }
};

// ============================================================================
// Game State Configuration
// ============================================================================

export const GAME_STATE_CONFIG = {
  STARTING_MONEY: 5000,
  STARTING_REPUTATION: 50,
  STARTING_DAY: 1,
  STARTING_RESIDENTS: 3,
  STARTING_PHASE: "day" as const
};

// ============================================================================
// LIFE Meter Configuration
// ============================================================================

export const LIFE_METER_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING_MIN: 10,
  STARTING_MAX: 25,
  GRADUATION_THRESHOLD: 100,
  UPDATE_INTERVAL: 10000
};

// ============================================================================
// Happiness Configuration
// ============================================================================

export const HAPPINESS_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING: 50,
  UPDATE_INTERVAL: 10000,
  SLEEP_RESTORE_RATE: 15,
  COMMON_ROOM_BOOST_RATE: 10
};

// ============================================================================
// Reputation Configuration
// ============================================================================

export const REPUTATION_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING: 50,
  CRITICAL_THRESHOLD: 20,
  GAME_OVER_THRESHOLD: 0
};

// ============================================================================
// Reputation Changes
// ============================================================================

export const REPUTATION_CHANGES = {
  // Positive changes
  RESIDENT_GRADUATED: 5,
  RESIDENT_GRADUATED_VETERAN: 7,
  FUNDRAISER_COMPLETED: 2,
  FOOD_LARGE_PORTION: 1,
  DISASTER_ACCEPTED: 3,
  
  // Negative changes
  RESIDENT_LEFT_UNHAPPY: -3,
  FOOD_SMALL_PORTION: -1,
  FOOD_NONE: -5,
  MAINTENANCE_MISSED: -2,
  OVERCROWDING: -1,
  DISASTER_REJECTED: -5,
  
  // Neutral
  FOOD_STANDARD: 0
} as const;

// ============================================================================
// Donation Configuration
// ============================================================================

export const DONATION_CONFIG = {
  CHECK_INTERVAL: 5 * 60 * 1000,        // 5 minutes
  BASE_AMOUNT_PER_RESIDENT: 50,         // Base $ per resident
  MIN_DONATION: 10,                     // Minimum donation amount
  GRADUATE_MULTIPLIER: 0.1,             // +10% per graduate
  RANDOM_VARIANCE_MIN: 0.8,             // 80% of calculated
  RANDOM_VARIANCE_MAX: 1.2              // 120% of calculated
} as const;

// ============================================================================
// Food Configuration
// ============================================================================

export const FOOD_CONFIG = {
  GENERATION_INTERVAL: 15000,  // 15 seconds - cafeterias generate 1 food per interval
  GENERATION_AMOUNT: 1,         // Amount of food generated per cafeteria per interval
  
  COST_PER_RESIDENT: {
    large: 15,
    standard: 10,
    small: 5,
    none: 0
  },
  
  EFFECTS: {
    large: {
      happinessChange: 10,
      reputationChange: 1
    },
    standard: {
      happinessChange: 3,
      reputationChange: 0
    },
    small: {
      happinessChange: -5,
      reputationChange: -1
    },
    none: {
      happinessChange: -15,
      reputationChange: -5
    }
  }
} as const;

// ============================================================================
// Maintenance Configuration
// ============================================================================

export const MAINTENANCE_CONFIG = {
  CHECK_INTERVAL: 15 * 60 * 1000,       // 15 minutes
  REPUTATION_PENALTY_PER_ROOM: -2,      // Reputation loss per room if can't pay
  WARNING_TIME: 5 * 60 * 1000           // Warn 5 minutes before due
} as const;

// ============================================================================
// Timer Configuration
// ============================================================================

// Default production timers
export const TIMER_CONFIG = {
  DONATION_CHECK_INTERVAL: 5 * 60 * 1000,      // 5 minutes
  MAINTENANCE_CHECK_INTERVAL: 15 * 60 * 1000,  // 15 minutes
  DAY_DURATION: 8 * 60 * 1000,                 // 8 minutes
  NIGHT_DURATION: 4 * 60 * 1000,               // 4 minutes
  FULL_DAY_CYCLE: 12 * 60 * 1000               // 12 minutes
};

// Dev mode timers (faster for testing)
export const DEV_TIMER_CONFIG = {
  DONATION_CHECK_INTERVAL: 1 * 60 * 1000,      // 1 minute
  MAINTENANCE_CHECK_INTERVAL: 15 * 60 * 1000,  // 15 minutes (unchanged)
  DAY_DURATION: 5 * 60 * 1000,                 // 5 minutes
  NIGHT_DURATION: 30 * 1000,                   // 30 seconds
  FULL_DAY_CYCLE: 5.5 * 60 * 1000              // 5.5 minutes
};

// Active timer configuration (can be switched at runtime)
let activeTimerConfig = TIMER_CONFIG;

export function getActiveTimerConfig() {
  return activeTimerConfig;
}

export function setDevTimersEnabled(enabled: boolean) {
  activeTimerConfig = enabled ? DEV_TIMER_CONFIG : TIMER_CONFIG;
  console.log(`[TimerConfig] Switched to ${enabled ? 'DEV' : 'PRODUCTION'} timers`);
}

export function isDevTimersEnabled(): boolean {
  return activeTimerConfig === DEV_TIMER_CONFIG;
}

// ============================================================================
// Fundraiser Configuration
// ============================================================================

export const FUNDRAISER_CONFIG = {
  BASE_PAYOUT_MIN: 200,
  BASE_PAYOUT_MAX: 500,
  DURATION_MINUTES: 30,                    // 30 minutes real-time
  LIFE_BOOST: 5,                           // +5 LIFE meter points
  HAPPINESS_COST: 10,                      // -10 happiness points
  REPUTATION_BOOST: 2,                     // +2 reputation on completion
  BASE_REPUTATION_MODIFIER: 0.5            // Base modifier for payout calculation
} as const;

// ============================================================================
// Resident Spawning Configuration
// ============================================================================

export const SPAWN_CONFIG = {
  MIN_REPUTATION_FOR_SPAWN: 50,            // 50%+ reputation required
  SPAWN_RATE_PER_DAY: 1,                   // 1 resident per day at 50%+ reputation
  PROFILE_WEIGHTS: {
    young_adult: 0.4,                      // 40%
    veteran: 0.4,                          // 40%
    elderly: 0.2                           // 20%
  }
} as const;

// ============================================================================
// Grid Expansion Configuration
// ============================================================================

export const EXPANSION_CONFIG = {
  BASE_COST: 1000,                         // Base cost per expansion
  EXPANSION_SIZE: 5,                       // Each expansion unlocks 5x5 area
  COST_FORMULA_MULTIPLIER: 0.01            // Cost = Base × (1 + UnlockedTiles/100)
} as const;

// ============================================================================
// AI & Pathfinding Configuration
// ============================================================================

export const AI_CONFIG = {
  NEED_CHECK_INTERVAL: 5000,        // Check needs every 5 seconds
  MOVE_SPEED: 2,                    // Tiles per second
  ROOM_USAGE_TIME: 10,              // Seconds to satisfy need
  BATHROOM_CHANCE: 0.1,             // 10% chance per check
  BATHROOM_MIN_INTERVAL: 60000,     // Minimum 1 minute between bathroom needs
  EATING_INTERVAL_MIN: 30 * 1000,  // Minimum 30 seconds real-time
  EATING_INTERVAL_MAX: 60 * 1000,  // Maximum 60 seconds real-time (1 minute)
  EATING_DURATION: 15,              // Seconds to eat at cafeteria
  UPDATE_FREQUENCY: 1,              // AI state updates per second
  MOVEMENT_UPDATE_FREQUENCY: 60     // Movement updates per second (60 FPS)
};

export const PATHFINDING_CONFIG = {
  MAX_ITERATIONS: 1000,             // Maximum A* iterations
  CACHE_SIZE: 100,                  // Maximum cached paths
  CACHE_ENABLED: true               // Enable path caching
};

// ============================================================================
// Name Generation
// ============================================================================

export const NAME_LISTS = {
  FIRST_NAMES: [
    "John", "Maria", "James", "Sarah", "Michael", "Jennifer",
    "David", "Lisa", "Robert", "Patricia", "William", "Linda",
    "Richard", "Barbara", "Joseph", "Elizabeth", "Thomas", "Susan",
    "Charles", "Jessica", "Christopher", "Karen", "Daniel", "Nancy"
  ],
  
  LAST_NAMES: [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
    "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson"
  ]
};

// ============================================================================
// Arrival Reasons
// ============================================================================

export const ARRIVAL_REASONS = [
  "arrived seeking shelter",
  "arrived after a house fire",
  "arrived after losing their job",
  "arrived after a family crisis",
  "arrived after an eviction",
  "arrived after a natural disaster",
  "arrived seeking a fresh start"
];

// ============================================================================
// Visual Configuration
// ============================================================================

export const VISUAL_CONFIG = {
  TILE_SIZE: 32,
  SPRITE_SCALE: 1.0,
  DAY_AMBIENT_LIGHT: 1.0,
  NIGHT_AMBIENT_LIGHT: 0.4,
  DAY_COLOR_TINT: 0xFFFFFF,
  NIGHT_COLOR_TINT: 0x4444AA
};

// ============================================================================
// Colors
// ============================================================================

export const COLORS = {
  GRID_LINE: 0x444444,
  TILE_EMPTY: 0x2a2a2a,
  TILE_LOCKED: 0x1a1a1a,
  TILE_ENTRANCE: 0x4a9eff,
  ROOM_DORMITORY: 0x8b4513,
  ROOM_CAFETERIA: 0xff8c00,
  ROOM_LEARNING: 0x4169e1,
  ROOM_VOCATIONAL: 0x9370db,
  ROOM_BATHROOM: 0x87ceeb,
  ROOM_COMMON: 0x32cd32,
  ROOM_ADMIN: 0x696969,
  ROOM_FUNDRAISER: 0xffd700,
  RESIDENT_YOUNG: 0x00ff00,
  RESIDENT_VETERAN: 0xff0000,
  RESIDENT_ELDERLY: 0xffff00
};
