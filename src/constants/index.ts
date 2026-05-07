import { RoomSpec, RoomType, ResidentProfileSpec, ResidentProfile, AdjacencyBonusConfig, ShelterTierConfig, ShelterTier } from '../types';

// ============================================================================
// Grid Configuration
// ============================================================================

export const GRID_CONFIG = {
  TOTAL_WIDTH: 40,
  TOTAL_HEIGHT: 30,
  STARTER_SIZE: 10,           // Starting with 10x10 for Tier 1 (changed from 20)
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
    buildCost: 300,              // Down from 500 - easier early game
    maintenanceCost: 25,         // Up from 20
    capacity: 4,
    closesAtNight: false,
    needsSatisfied: ["sleep"]
  },
  
  cafeteria: {
    type: "cafeteria",
    width: 5,
    height: 3,
    buildCost: 500,              // Down from 800 - essential building
    maintenanceCost: 50,         // Up from 40
    capacity: 10,
    closesAtNight: true,
    needsSatisfied: ["food"]
  },
  
  learning_center: {
    type: "learning_center",
    width: 4,
    height: 3,
    buildCost: 450,              // Down from 1000
    maintenanceCost: 40,         // Down from 50
    capacity: 6,
    closesAtNight: true,
    needsSatisfied: ["learning"],
    image: "rooms/learning_center"
  },
  
  vocational_room: {
    type: "vocational_room",
    width: 4,
    height: 3,
    buildCost: 550,              // Down from 1200
    maintenanceCost: 45,         // Down from 60
    capacity: 6,
    closesAtNight: true,
    needsSatisfied: ["learning"]
  },
  
  bathroom: {
    type: "bathroom",
    width: 2,
    height: 2,
    buildCost: 200,              // Down from 300
    maintenanceCost: 20,         // Up from 15
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: ["bathroom"]
  },
  
  common_room: {
    type: "common_room",
    width: 3,
    height: 3,
    buildCost: 350,              // Down from 600
    maintenanceCost: 30,         // Up from 25
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: ["social"]
  },
  
  admin_office: {
    type: "admin_office",
    width: 2,
    height: 2,
    buildCost: 700,              // Up from 400 - luxury building
    maintenanceCost: 60,         // Up from 20
    capacity: 0,
    closesAtNight: true,
    needsSatisfied: []
  },
  
  fundraiser_station: {
    type: "fundraiser_station",
    width: 3,
    height: 2,
    buildCost: 400,              // Down from 700
    maintenanceCost: 35,         // Up from 30
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
    lifeFillRate: 60 / 3600,           // 60% per hour = 4% per day (in 4-min day phase)
    happinessDecayRate: 12,            // 12 per day (up from 10) - needs decay faster
    fundraiserEfficiency: 1.2,         // 20% bonus
    graduationBonus: 0,
    displayName: "Young Adult",
    icon: "🧑"
  },
  
  veteran: {
    profile: "veteran",
    lifeFillRate: 60 / 3600,           // 60% per hour = 4% per day (in 4-min day phase)
    happinessDecayRate: 7,             // 7 per day (up from 5) - needs decay faster
    fundraiserEfficiency: 1.0,         // Normal
    graduationBonus: 2,                // +2 reputation on graduation
    displayName: "Veteran",
    icon: "🎖️"
  },
  
  elderly: {
    profile: "elderly",
    lifeFillRate: 60 / 3600,           // 60% per hour = 4% per day (in 4-min day phase)
    happinessDecayRate: 20,            // 20 per day (up from 15) - needs decay faster
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
  STARTING_MONEY: 5000,              // Down from 5000 - less cushion
  STARTING_REPUTATION: 60,           // Down from 50 - harder start
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
  STARTING: 70,
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
// Reputation Decay Configuration
// ============================================================================

export interface DecayThreshold {
  min: number;
  max: number;
  decayMultiplier: number;
}

export const REPUTATION_DECAY = {
  // Decay rate per in-game day (6 minutes real-time)
  BASE_DECAY_RATE: 1, // Lose 1% per day baseline
  
  // Scaling based on current reputation
  DECAY_THRESHOLDS: [
    { min: 90, max: 100, decayMultiplier: 3.0 }, // 3% per day at top tier
    { min: 70, max: 89, decayMultiplier: 2.0 },  // 2% per day
    { min: 50, max: 69, decayMultiplier: 1.0 },  // 1% per day (baseline)
    { min: 30, max: 49, decayMultiplier: 0.5 },  // 0.5% per day
    { min: 0, max: 29, decayMultiplier: 0 },      // No decay at bottom
  ] as DecayThreshold[],
  
  // Decay stops at this floor (can't decay below)
  FLOOR: 30, // Natural decay stops at 30%
  
  // Factors that reduce decay (as percentage reduction)
  MITIGATION: {
    perActiveResident: 0.1,      // -10% decay per resident
    perGraduationThisWeek: 0.2,  // -20% decay per recent graduation
    highHappinessBonus: 0.3,     // -30% decay if avg happiness > 70
    fullCapacityBonus: 0.2,      // -20% decay if at tier capacity
  },
  
  // Recent graduation tracking window (7 in-game days)
  GRADUATION_TRACKING_DAYS: 7,
  
  // High happiness threshold for mitigation bonus
  HIGH_HAPPINESS_THRESHOLD: 70
} as const;

// ============================================================================
// Bankruptcy Configuration
// ============================================================================

export const BANKRUPTCY_CONFIG = {
  THRESHOLD: -500,                         // Money below this triggers bankruptcy
  COUNTDOWN_DURATION: 18 * 60 * 1000,      // 18 minutes (3 in-game days at 6min/day)
  WARNING_MONEY_LOW: 200,                  // Warn when money drops below this
  WARNING_MONEY_DEBT: 0,                   // Warn when money goes negative
  RECOVERY_THRESHOLD: 0                    // Must get above $0 to cancel bankruptcy
} as const;

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
  RESIDENT_LEFT_HOPELESS: -5,
  FOOD_SMALL_PORTION: -1,
  FOOD_NONE: -5,
  MAINTENANCE_MISSED: -2,
  OVERCROWDING: -1,
  DISASTER_REJECTED: -5,
  
  // Neutral
  FOOD_STANDARD: 0
} as const;

// ============================================================================
// Departure Configuration
// ============================================================================

export const DEPARTURE_CONFIG = {
  UNHAPPY_THRESHOLD: 20,       // Happiness below this = at risk
  WARNING_DURATION: 720000,    // 12 minutes real-time (1 in-game day) = warning
  DEPARTURE_DURATION: 1440000, // 24 minutes real-time (2 in-game days) = leave
  REPUTATION_PENALTY_UNHAPPY: 3,
  REPUTATION_PENALTY_HOPELESS: 5,
  EXIT_TIMEOUT: 30000,         // 30 seconds to reach exit before teleport
} as const;

// ============================================================================
// Donation Configuration
// ============================================================================

export const DONATION_CONFIG = {
  CHECK_INTERVAL: 90 * 1000,            // 90 seconds (down from 5 minutes)
  BASE_AMOUNT_PER_RESIDENT: 25,         // Down from 50 - smaller but more frequent
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
  
  // Legacy cost mapping (for backward compatibility)
  COST_PER_RESIDENT: {
    premium: 50,
    large: 30,                  // Maps to generous
    generous: 30,
    standard: 18,
    small: 10,
    minimal: 5,
    none: 0
  },
  
  // Legacy effects mapping (for backward compatibility)
  EFFECTS: {
    premium: {
      happinessChange: 20,
      reputationChange: 5
    },
    large: {
      happinessChange: 10,
      reputationChange: 2
    },
    generous: {
      happinessChange: 10,
      reputationChange: 2
    },
    standard: {
      happinessChange: 0,
      reputationChange: 0
    },
    small: {
      happinessChange: -5,
      reputationChange: -1
    },
    minimal: {
      happinessChange: -10,
      reputationChange: -3
    },
    none: {
      happinessChange: -15,
      reputationChange: -5
    }
  }
} as const;

// ============================================================================
// Food Portions Configuration (NEW - Rebalanced)
// ============================================================================

export type FoodPortionTier = 'minimal' | 'small' | 'standard' | 'generous' | 'premium';

export interface FoodPortionConfig {
  cost: number;
  happiness: number;
  reputation: number;
  description: string;
  lifeFillModifier: number;
}

export const FOOD_PORTIONS: Record<FoodPortionTier, FoodPortionConfig> = {
  minimal: {
    cost: 5,
    happiness: -10,
    reputation: -3,
    description: "Emergency rations only",
    lifeFillModifier: 0.5
  },
  small: {
    cost: 10,
    happiness: -5,
    reputation: -1,
    description: "Basic but adequate",
    lifeFillModifier: 0.8
  },
  standard: {
    cost: 18,
    happiness: 0,           // CHANGED: Now neutral
    reputation: 0,
    description: "Balanced nutrition",
    lifeFillModifier: 1.0
  },
  generous: {
    cost: 30,
    happiness: 10,
    reputation: 2,
    description: "Quality meals",
    lifeFillModifier: 1.2
  },
  premium: {
    cost: 50,
    happiness: 20,
    reputation: 5,
    description: "Restaurant-quality dining",
    lifeFillModifier: 1.5
  }
} as const;

// ============================================================================
// Maintenance Configuration
// ============================================================================

export const MAINTENANCE_CONFIG = {
  CHECK_INTERVAL: 5 * 60 * 1000,        // 5 minutes (down from 15) - more frequent
  REPUTATION_PENALTY_PER_ROOM: -2,      // Reputation loss per room if can't pay
  WARNING_TIME: 2 * 60 * 1000           // Warn 2 minutes before due (down from 5)
} as const;

// ============================================================================
// Daily Operating Costs Configuration (NEW)
// ============================================================================

export const OPERATING_COSTS_CONFIG = {
  BASE_DAILY_COST: 100,                 // Base daily cost regardless of size
  PER_RESIDENT_COST: 5,                 // Additional cost per resident
  PER_ROOM_COST: 10                     // Additional cost per room built
} as const;

// ============================================================================
// Random Expense Events Configuration (NEW)
// ============================================================================

export const EXPENSE_EVENTS_CONFIG = {
  CHANCE_PER_DONATION_CYCLE: 0.15,      // 15% chance each donation cycle
  MIN_COST: 50,                         // Minimum emergency expense
  MAX_COST: 200,                        // Maximum emergency expense
  EVENT_TYPES: [
    "Plumbing emergency",
    "Electrical issue",
    "Health inspection fine",
    "Emergency repairs",
    "Pest control",
    "HVAC maintenance"
  ]
} as const;

// ============================================================================
// Timer Configuration
// ============================================================================

// Default production timers - FASTER PACED
export const TIMER_CONFIG = {
  DONATION_CHECK_INTERVAL: 90 * 1000,          // 90 seconds (down from 5 min)
  MAINTENANCE_CHECK_INTERVAL: 5 * 60 * 1000,   // 5 minutes (down from 15)
  DAY_DURATION: 4 * 60 * 1000,                 // 4 minutes (down from 8)
  NIGHT_DURATION: 2 * 60 * 1000,               // 2 minutes (down from 4)
  FULL_DAY_CYCLE: 6 * 60 * 1000                // 6 minutes (down from 12)
};

// Dev mode timers (faster for testing)
export const DEV_TIMER_CONFIG = {
  DONATION_CHECK_INTERVAL: 30 * 1000,          // 30 seconds
  MAINTENANCE_CHECK_INTERVAL: 2 * 60 * 1000,   // 2 minutes
  DAY_DURATION: 2 * 60 * 1000,                 // 2 minutes
  NIGHT_DURATION: 30 * 1000,                   // 30 seconds
  FULL_DAY_CYCLE: 2.5 * 60 * 1000              // 2.5 minutes
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
// Fundraiser Configuration (REBALANCED)
// ============================================================================

export const FUNDRAISER_CONFIG = {
  // Payout settings
  BASE_PAYOUT_MIN: 150,                    // Down from 200
  BASE_PAYOUT_MAX: 350,                    // Down from 500
  DURATION_MINUTES: 2.5,                   // 2.5 minutes (2:30) - quick fundraiser cycles
  BASE_REPUTATION_MODIFIER: 0.5,           // Base modifier for payout calculation
  
  // Effects on success
  LIFE_BOOST: 5,                           // +5 LIFE meter points
  HAPPINESS_COST: 10,                      // -10 happiness points
  REPUTATION_BOOST: 2,                     // +2 reputation on completion
  
  // Cooldown system
  COOLDOWN_DURATION: 600000,               // 10 minutes between fundraisers (in ms)
  
  // Food consumption
  FOOD_COST_PER_RESIDENT: 3,               // Food units per participating resident
  
  // Failure consequences
  FAILURE_HAPPINESS_PENALTY: -5,           // Happiness loss on failure (embarrassment)
  FAILURE_REPUTATION_PENALTY: -2,          // Reputation loss on failure (public failure)
  
  // Fatigue system
  FATIGUE_DURATION: 300000,                // 5 minutes (in ms) - resident fatigue duration
  FATIGUE_HAPPINESS_PENALTY: -5,           // Happiness penalty during fatigue
  MIN_NON_FATIGUED_RESIDENTS: 1,           // Minimum non-fatigued residents to start (lowered for early game)
  
  // Success chance thresholds based on average happiness
  SUCCESS_CHANCE: {
    HAPPINESS_80_PLUS: 0.95,               // 95% success if avg happiness >= 80
    HAPPINESS_60_PLUS: 0.80,               // 80% success if avg happiness >= 60
    HAPPINESS_40_PLUS: 0.60,               // 60% success if avg happiness >= 40
    HAPPINESS_20_PLUS: 0.40,               // 40% success if avg happiness >= 20
    HAPPINESS_BELOW_20: 0.20               // 20% success if avg happiness < 20
  }
} as const;

// ============================================================================
// Resident Spawning Configuration
// ============================================================================

export const SPAWN_CONFIG = {
  MIN_REPUTATION_FOR_SPAWN: 40,            // 40%+ reputation required (down from 50)
  SPAWN_RATE_PER_DAY: 1,                   // 1 resident per day at 40%+ reputation
  SPAWN_CHECK_INTERVAL: 45 * 1000,         // 45 seconds (NEW - faster spawning checks)
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

// ============================================================================
// Adjacency Bonuses Configuration
// ============================================================================

// Adjacency bonus key format: "room1_room2" (sorted alphabetically)
// This allows checking both directions with a single lookup
export const ADJACENCY_BONUSES: Record<string, AdjacencyBonusConfig> = {
  // ========== POSITIVE SYNERGIES ==========
  
  // Dormitory combinations
  bathroom_dormitory: {
    happiness: 5,
    lifeFillModifier: 0,
    maintenanceReduction: 0.1, // 10% cheaper maintenance
    description: "Residents appreciate bathrooms near sleeping areas"
  },
  common_room_dormitory: {
    happiness: 3,
    lifeFillModifier: 0.05, // 5% faster LIFE fill
    maintenanceReduction: 0,
    description: "Easy access to relaxation areas"
  },
  
  // Cafeteria combinations
  cafeteria_common_room: {
    happiness: 5,
    lifeFillModifier: 0,
    maintenanceReduction: 0,
    description: "Social dining experience"
  },
  
  // Learning combinations
  admin_office_learning_center: {
    happiness: 0,
    lifeFillModifier: 0.1, // 10% faster LIFE fill
    maintenanceReduction: 0,
    description: "Better program coordination"
  },
  learning_center_vocational_room: {
    happiness: 0,
    lifeFillModifier: 0.15, // 15% faster LIFE fill
    maintenanceReduction: 0,
    description: "Comprehensive education pathway"
  },
  admin_office_vocational_room: {
    happiness: 0,
    lifeFillModifier: 0.08, // 8% faster LIFE fill
    maintenanceReduction: 0.05,
    description: "Efficient program administration"
  },
  
  // Fundraiser station combinations
  common_room_fundraiser_station: {
    happiness: 2,
    lifeFillModifier: 0,
    maintenanceReduction: 0.05,
    description: "Comfortable preparation area"
  },
  admin_office_fundraiser_station: {
    happiness: 0,
    lifeFillModifier: 0,
    maintenanceReduction: 0.1, // 10% cheaper maintenance
    description: "Streamlined fundraiser coordination"
  },
  
  // ========== NEGATIVE SYNERGIES (PENALTIES) ==========
  
  // Dormitory penalties
  cafeteria_dormitory: {
    happiness: -5,
    lifeFillModifier: 0,
    maintenanceReduction: -0.1, // 10% MORE maintenance (noise, smells)
    description: "Kitchen noise disturbs sleep"
  },
  dormitory_fundraiser_station: {
    happiness: -3,
    lifeFillModifier: 0,
    maintenanceReduction: -0.05,
    description: "Fundraiser activities disturb rest"
  },
  
  // Bathroom penalties
  bathroom_cafeteria: {
    happiness: -8,
    lifeFillModifier: 0,
    maintenanceReduction: -0.15, // 15% MORE maintenance
    description: "Unpleasant proximity"
  },
  bathroom_learning_center: {
    happiness: -2,
    lifeFillModifier: -0.05, // 5% slower LIFE fill
    maintenanceReduction: 0,
    description: "Distracting location for learning"
  },
  bathroom_vocational_room: {
    happiness: -2,
    lifeFillModifier: -0.05,
    maintenanceReduction: 0,
    description: "Distracting location for training"
  }
} as const;

/**
 * Get adjacency bonus key (sorted alphabetically for consistency)
 */
export function getAdjacencyBonusKey(room1Type: RoomType, room2Type: RoomType): string {
  const types = [room1Type, room2Type].sort();
  return `${types[0]}_${types[1]}`;
}

// ============================================================================
// Shelter Tier Progression Configuration
// ============================================================================

export const SHELTER_TIERS: Record<ShelterTier, ShelterTierConfig> = {
  1: {
    name: "Starter Shelter",
    maxResidents: 10,
    gridSize: 10, // 10x10 playable area
    upgradeCost: 0, // Starting tier
    availableRooms: ['dormitory', 'cafeteria', 'bathroom', 'common_room', 'learning_center', 'fundraiser_station'],
    donationMultiplier: 1.0,
    description: "A small shelter providing basic services",
    graduationsRequired: 0, // Starting tier
    reputationRequired: 0   // Starting tier
  },
  2: {
    name: "Community Hub",
    maxResidents: 25,
    gridSize: 15,
    upgradeCost: 3000,
    availableRooms: ['dormitory', 'cafeteria', 'bathroom', 'common_room', 'learning_center', 'admin_office'],
    donationMultiplier: 1.2, // 20% more donations
    description: "Growing community with educational services",
    graduationsRequired: 5,
    reputationRequired: 60
  },
  3: {
    name: "Opportunity Center",
    maxResidents: 50,
    gridSize: 20,
    upgradeCost: 8000,
    availableRooms: ['dormitory', 'cafeteria', 'bathroom', 'common_room', 'learning_center', 'admin_office', 'vocational_room'],
    donationMultiplier: 1.5, // 50% more donations
    description: "Comprehensive support with job training",
    graduationsRequired: 15,
    reputationRequired: 60
  },
  4: {
    name: "Campus",
    maxResidents: 100,
    gridSize: 25,
    upgradeCost: 20000,
    availableRooms: 'all', // All room types
    donationMultiplier: 2.0, // Double donations
    description: "Full-service campus changing lives",
    graduationsRequired: 40,
    reputationRequired: 60
  }
} as const;

// ============================================================================
// Tier Upgrade Configuration
// ============================================================================

export const TIER_UPGRADE_CONFIG = {
  MIN_GRID_UTILIZATION: 0.7, // Must have 70% of grid utilized to upgrade
  CAPACITY_WARNING_THRESHOLD: 0.9 // Show warning when at 90% capacity
} as const;

// ============================================================================
// Disaster Events Configuration
// ============================================================================

import { DisasterEventConfig, DisasterEventType } from '../types';

export const DISASTER_EVENTS: Record<DisasterEventType, DisasterEventConfig> = {
  house_fire: {
    type: "house_fire",
    title: "House Fire",
    description: "A nearby house fire has displaced a family. They desperately need shelter.",
    residentSurge: 3,
    urgency: "immediate",
    reputationGainAccept: 8,
    reputationLossDecline: 5,
    donationBonus: 200,
    happinessImpact: -5
  },
  winter_storm: {
    type: "winter_storm",
    title: "Winter Storm Emergency",
    description: "A severe winter storm has left people stranded without heat. Emergency services are asking for help.",
    residentSurge: 5,
    urgency: "24hours",
    reputationGainAccept: 10,
    reputationLossDecline: 8,
    donationBonus: 350,
    happinessImpact: -10,
    maintenanceSurge: 1.5
  },
  factory_closure: {
    type: "factory_closure",
    title: "Factory Closure",
    description: "The local factory closed suddenly. Several workers need temporary housing while they find new jobs.",
    residentSurge: 4,
    urgency: "week",
    reputationGainAccept: 5,
    reputationLossDecline: 2,
    donationBonus: 100,
    happinessImpact: 0,
    lifeBoost: true
  },
  domestic_violence: {
    type: "domestic_violence",
    title: "Domestic Violence Refuge",
    description: "A family is fleeing an abusive situation. They need immediate safe shelter.",
    residentSurge: 2,
    urgency: "immediate",
    reputationGainAccept: 12,
    reputationLossDecline: 10,
    donationBonus: 150,
    happinessImpact: -3,
    securityRequired: true
  },
  hospital_discharge: {
    type: "hospital_discharge",
    title: "Hospital Discharge",
    description: "Patients are being discharged but have nowhere to go during recovery.",
    residentSurge: 2,
    urgency: "24hours",
    reputationGainAccept: 6,
    reputationLossDecline: 4,
    donationBonus: 100,
    happinessImpact: -2,
    medicalCosts: 50
  },
  eviction_wave: {
    type: "eviction_wave",
    title: "Mass Eviction",
    description: "A landlord evicted an entire apartment building. Families are on the street.",
    residentSurge: 8,
    urgency: "immediate",
    reputationGainAccept: 15,
    reputationLossDecline: 12,
    donationBonus: 500,
    happinessImpact: -15
  }
} as const;

// ============================================================================
// Disaster System Configuration
// ============================================================================

export const DISASTER_CONFIG = {
  // Event triggering
  BASE_CHANCE: 0.10,                       // 10% base chance per event check
  HIGH_REPUTATION_THRESHOLD: 70,           // Reputation above this increases disaster chance
  HIGH_REPUTATION_BONUS: 0.05,             // +5% chance if reputation > 70
  AT_CAPACITY_PENALTY: 0.05,               // -5% chance if already at capacity
  
  // Cooldown
  COOLDOWN_DURATION: 5 * 60 * 1000,        // 5 minutes between disasters
  
  // Capacity overflow
  OVERFLOW_MULTIPLIER: 1.5,                // Disasters can exceed tier cap by 50%
  OVERCROWDING_HAPPINESS_PENALTY: -2,      // Per-resident happiness penalty when overcrowded
  
  // Urgency timers (time to respond)
  URGENCY_TIMERS: {
    immediate: 60 * 1000,                  // 1 minute to decide
    "24hours": 3 * 60 * 1000,              // 3 minutes to decide
    week: 5 * 60 * 1000                    // 5 minutes to decide
  },
  
  // Partial accept threshold (only show for large surges)
  PARTIAL_ACCEPT_THRESHOLD: 4,             // Show partial accept for 4+ residents
  
  // Security costs for domestic violence cases
  SECURITY_COST_PER_RESIDENT: 30,          // Extra cost per resident
  
  // Life boost for motivated residents (factory closure)
  LIFE_BOOST_MULTIPLIER: 1.25              // 25% faster LIFE fill
} as const;

// ============================================================================
// Resident Status Bar Configuration
// ============================================================================

export const STATUS_BAR_CONFIG = {
  // Dimensions
  BAR_WIDTH: 30,
  BAR_HEIGHT: 4,
  HAPPINESS_BAR_HEIGHT: 3,
  GAP_BETWEEN_BARS: 2,
  OFFSET_ABOVE_RESIDENT: 25,
  
  // LIFE Meter Colors
  LIFE_COLOR_DEFAULT: 0x2196F3,     // Blue
  LIFE_COLOR_NEAR_GRADUATION: 0xFFD700,  // Gold (90-100%)
  LIFE_COLOR_STALLED: 0x9E9E9E,     // Grey
  
  // Happiness Colors
  HAPPINESS_COLOR_HIGH: 0x4CAF50,   // Green (70-100%)
  HAPPINESS_COLOR_MEDIUM: 0xFFC107, // Yellow (40-69%)
  HAPPINESS_COLOR_LOW: 0xFF9800,    // Orange (20-39%)
  HAPPINESS_COLOR_CRITICAL: 0xF44336, // Red (0-19%)
  
  // Thresholds
  NEAR_GRADUATION_THRESHOLD: 90,
  HAPPINESS_HIGH_THRESHOLD: 70,
  HAPPINESS_MEDIUM_THRESHOLD: 40,
  HAPPINESS_LOW_THRESHOLD: 20,
  
  // Stalled detection (ms since last LIFE change)
  STALLED_DURATION: 60000, // 1 minute
  
  // Animation
  PULSE_SPEED: 500,  // ms per pulse cycle for critical happiness
  GLOW_INTENSITY: 0.5,
  
  // Background
  BACKGROUND_COLOR: 0x333333,
  BACKGROUND_ALPHA: 0.5
} as const;

// Status Icons for resident states
export const STATUS_ICONS = {
  HAPPY: '😊',       // happiness > 80
  NEUTRAL: '😐',     // happiness 40-80
  UNHAPPY: '😟',     // happiness 20-39
  AT_RISK: '😰',     // happiness < 20 for extended time
  SLEEPING: '💤',    // in dormitory sleeping
  EATING: '🍽️',      // in cafeteria
  LEARNING: '📚',    // in learning center
  WALKING: '🚶',     // pathfinding state
  LEAVING: '🏃'      // departure state
} as const;
