import { RoomSpec, RoomType, ResidentProfileSpec, ResidentProfile, AdjacencyBonusConfig, ShelterTierConfig, ShelterTier } from '../types';

// ============================================================================
// Grid Configuration
// ============================================================================

// Save format version. New games start at this so load-time migrations never re-apply.
export const SAVE_VERSION = "1.4.0";

export const GRID_CONFIG = {
  TOTAL_WIDTH: 40,
  TOTAL_HEIGHT: 30,
  STARTER_SIZE: 12,           // Starting with 12x12 for Tier 1
  TILE_SIZE: 32,              // Pixels per tile
  EXPANSION_COST_PER_TILE: 5000,
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
    buildCost: 19000,
    maintenanceCost: 1400,
    capacity: 4,
    closesAtNight: false,
    needsSatisfied: ["sleep"],
  },
  
  cafeteria: {
    type: "cafeteria",
    width: 5,
    height: 3,
    buildCost: 31500,
    maintenanceCost: 2750,
    capacity: 5,                 // one per chair (see ROOM_LOOKS.cafeteria.seats)
    closesAtNight: true,
    needsSatisfied: ["food"],
  },
  
  clinic: {
    type: "clinic",
    width: 3,
    height: 3,
    buildCost: 25000,
    maintenanceCost: 1950,
    capacity: 4,
    closesAtNight: false,
    needsSatisfied: ["health"]
  },
  
  bathroom: {
    type: "bathroom",
    width: 2,
    height: 2,
    buildCost: 12500,
    maintenanceCost: 1100,
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: ["bathroom"]
  },
  
  common_room: {
    type: "common_room",
    width: 3,
    height: 3,
    buildCost: 22000,
    maintenanceCost: 1650,
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: ["social"]
  },
  
  admin_office: {
    type: "admin_office",
    width: 2,
    height: 2,
    buildCost: 44000,
    maintenanceCost: 3300,
    capacity: 0,
    closesAtNight: true,
    needsSatisfied: []
  },
  
  fundraiser_station: {
    type: "fundraiser_station",
    width: 3,
    height: 2,
    buildCost: 25000,
    maintenanceCost: 1950,
    capacity: 3,
    closesAtNight: true,
    needsSatisfied: [],
  },

  // --- Decorations ---------------------------------------------------------
  potted_plant: {
    type: "potted_plant",
    width: 1,
    height: 1,
    buildCost: 4000,
    maintenanceCost: 150,
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: [],
    isDecoration: true,
    aura: { health: 2, lifeFillModifier: 0 },
  },

  fountain: {
    type: "fountain",
    width: 1,
    height: 1,
    buildCost: 15500,
    maintenanceCost: 550,
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: [],
    isDecoration: true,
    aura: { health: 3, lifeFillModifier: 0.05 },
  },

  // --- Upgraded rooms --------------------------------------------------------
  large_dormitory: {
    type: "large_dormitory",
    width: 4,
    height: 3,
    buildCost: 34500,
    maintenanceCost: 2200,
    capacity: 6,                 // one per bed (see ROOM_LOOKS.large_dormitory.seats)
    closesAtNight: false,
    needsSatisfied: ["sleep"],
    baseType: "dormitory",
  },

  medical_center: {
    type: "medical_center",
    width: 4,
    height: 3,
    buildCost: 50000,
    maintenanceCost: 3300,
    capacity: 6,
    closesAtNight: false,
    needsSatisfied: ["health"],
    baseType: "clinic",
    bonus: { health: 5, lifeFillModifier: 0 },
  },

  dining_hall: {
    type: "dining_hall",
    width: 6,
    height: 3,
    buildCost: 56500,
    maintenanceCost: 4150,
    capacity: 8,                 // one per chair (see ROOM_LOOKS.dining_hall.seats)
    closesAtNight: true,
    needsSatisfied: ["food"],
    baseType: "cafeteria",
  },

  // --- Service rooms ---------------------------------------------------------
  library: {
    type: "library",
    width: 3,
    height: 3,
    buildCost: 31500,
    maintenanceCost: 1950,
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: ["social"],
    baseType: "common_room",
    bonus: { health: 0, lifeFillModifier: 0.15 },
  },

  garden: {
    type: "garden",
    width: 3,
    height: 3,
    buildCost: 37500,
    maintenanceCost: 1650,
    capacity: 0,
    closesAtNight: false,
    needsSatisfied: ["social"],
    baseType: "common_room",
    bonus: { health: 3, lifeFillModifier: 0.05 },
  }
};

/** What a room behaves as: upgrades and service rooms act like their base room. */
export function roomKind(type: RoomType): RoomType {
  return ROOM_SPECS[type]?.baseType ?? type;
}

// ============================================================================
// Resident Profile Specifications
// ============================================================================

export const PROFILE_SPECS: Record<ResidentProfile, ResidentProfileSpec> = {
  young_adult: {
    profile: "young_adult",
    lifeFillRate: 15 / 3600,           // slow passive fill; fundraisers are the main LIFE source
    healthDecayRate: 12,            // 12 per day (up from 10) - needs decay faster
    fundraiserEfficiency: 1.2,         // 20% bonus
    graduationBonus: 0,
    displayName: "Young Adult",
    icon: "🧑"
  },
  
  adult: {
    profile: "adult",
    lifeFillRate: 15 / 3600,           // slow passive fill; fundraisers are the main LIFE source
    healthDecayRate: 7,             // 7 per day (up from 5) - needs decay faster
    fundraiserEfficiency: 1.0,         // Normal
    graduationBonus: 0,
    displayName: "Adult",
    icon: "🧔"
  },
  
  elderly: {
    profile: "elderly",
    lifeFillRate: 15 / 3600,           // slow passive fill; fundraisers are the main LIFE source
    healthDecayRate: 20,            // 20 per day (up from 15) - needs decay faster
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
  STARTING_MONEY: 250000,
  STARTING_REPUTATION: 60,           // Down from 50 - harder start
  STARTING_DAY: 1,
  STARTING_FOOD: 50,
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
// LIFE Meter Activity Growth Rate Multipliers
// ============================================================================
// These multipliers are applied to the base LIFE fill rate depending on
// what activity the resident is currently doing.
// LIFE now comes mainly from fundraisers; these rates only scale the small passive fill.

export const LIFE_ACTIVITY_RATES = {
  // Eating provides moderate LIFE growth (50% of base rate)
  // Good nutrition contributes to personal development
  EATING: 0.5,
  
  // Sleeping provides passive LIFE growth (25% of base rate)
  // Rest and recovery support progress
  SLEEPING: 0.25,
  
  // Idle/other activities provide minimal growth (10% of base rate)
  // Just being in the shelter environment provides some benefit
  IDLE: 0.1,
  
  // Social activities (common room) provide small growth (15% of base rate)
  // Building social connections supports personal development
  SOCIAL: 0.15,
  
  // Using bathroom - no LIFE growth (0%)
  BATHROOM: 0
} as const;

// ============================================================================
// Health Configuration
// ============================================================================

export const HEALTH_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING: 70,
  UPDATE_INTERVAL: 10000,
  SLEEP_RESTORE_RATE: 15,
  COMMON_ROOM_BOOST_RATE: 10,
  CLINIC_SEEK_THRESHOLD: 35,   // residents below this Health look for a clinic
  CLINIC_RECOVERY_RATE: 2,     // Health restored per second while in a clinic
  CLINIC_VISIT_RESTORE: 15,    // flat Health gained when a clinic visit finishes
  MEAL_HEALTH_RESTORE: 10      // flat Health gained when a cafeteria meal finishes
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
  BASE_DECAY_RATE: 1.5, // Lose 1% per day baseline
  
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
    highHealthBonus: 0.3,     // -30% decay if avg health > 70
    fullCapacityBonus: 0.2,      // -20% decay if at tier capacity
  },
  
  // Recent graduation tracking window (7 in-game days)
  GRADUATION_TRACKING_DAYS: 7,
  
  // High health threshold for mitigation bonus
  HIGH_HEALTH_THRESHOLD: 70
} as const;

// ============================================================================
// Bankruptcy Configuration
// ============================================================================

export const BANKRUPTCY_CONFIG = {
  THRESHOLD: -25000,                         // Money below this triggers bankruptcy
  COUNTDOWN_DURATION: 18 * 60 * 1000,      // 18 minutes (3 in-game days at 6min/day)
  WARNING_MONEY_LOW: 10000,                  // Warn when money drops below this
  WARNING_MONEY_DEBT: 0,                   // Warn when money goes negative
  RECOVERY_THRESHOLD: 0                    // Must get above ₱0 to cancel bankruptcy
} as const;

// ============================================================================
// Reputation Changes
// ============================================================================

export const REPUTATION_CHANGES = {
  // Positive changes
  RESIDENT_GRADUATED: 5,
  FUNDRAISER_COMPLETED: 2,
  FOOD_LARGE_PORTION: 1,
  DISASTER_ACCEPTED: 3,
  
  // Negative changes
  RESIDENT_LEFT_UNHEALTHY: -3,
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
  UNHEALTHY_THRESHOLD: 20,       // Health below this = at risk
  WARNING_DURATION: 720000,    // 12 minutes real-time (1 in-game day) = warning
  DEPARTURE_DURATION: 1440000, // 24 minutes real-time (2 in-game days) = leave
  REPUTATION_PENALTY_UNHEALTHY: 3,
  REPUTATION_PENALTY_HOPELESS: 5,
  EXIT_TIMEOUT: 30000,         // 30 seconds to reach exit before teleport
} as const;

// ============================================================================
// Donation Configuration
// ============================================================================

export const DONATION_CONFIG = {
  CHECK_INTERVAL: 90 * 1000,            // 90 seconds (down from 5 minutes)
  BASE_AMOUNT_PER_RESIDENT: 1250,
  MIN_DONATION: 500,                     // Minimum donation amount
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
  FOOD_PER_MEAL: 3,             // Food taken from stock each time a hungry resident enters a cafeteria
  
  // Legacy cost mapping (for backward compatibility)
  COST_PER_RESIDENT: {
    premium: 3500,
    large: 2200,                  // Maps to generous
    generous: 2200,
    standard: 1400,
    small: 800,
    minimal: 400,
    none: 0
  },
  
  // Legacy effects mapping (for backward compatibility)
  EFFECTS: {
    premium: {
      healthChange: 20,
      reputationChange: 2
    },
    large: {
      healthChange: 10,
      reputationChange: 1
    },
    generous: {
      healthChange: 10,
      reputationChange: 1
    },
    standard: {
      healthChange: 0,
      reputationChange: 0
    },
    small: {
      healthChange: -5,
      reputationChange: -1
    },
    minimal: {
      healthChange: -10,
      reputationChange: -3
    },
    none: {
      healthChange: -15,
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
  health: number;
  reputation: number;
  description: string;
  lifeFillModifier: number;
  generationMultiplier: number; // cafeteria food production speed (bigger deliveries = faster)
}

export const FOOD_PORTIONS: Record<FoodPortionTier, FoodPortionConfig> = {
  minimal: {
    cost: 700,
    health: -10,
    reputation: -3,
    description: "Emergency supplies only",
    lifeFillModifier: 0.5,
    generationMultiplier: 0.6
  },
  small: {
    cost: 1400,
    health: -5,
    reputation: -1,
    description: "Basic but adequate",
    lifeFillModifier: 0.8,
    generationMultiplier: 0.8
  },
  standard: {
    cost: 2450,
    health: 0,           // CHANGED: Now neutral
    reputation: 0,
    description: "Balanced nutrition",
    lifeFillModifier: 1.0,
    generationMultiplier: 1
  },
  generous: {
    cost: 3850,
    health: 10,
    reputation: 1,
    description: "Quality meals",
    lifeFillModifier: 1.2,
    generationMultiplier: 1.2
  },
  premium: {
    cost: 6100,
    health: 20,
    reputation: 2,
    description: "Restaurant-quality dining",
    lifeFillModifier: 1.5,
    generationMultiplier: 1.5
  }
} as const;

// ============================================================================
// Maintenance Configuration
// ============================================================================

export const MAINTENANCE_CONFIG = {
  REPUTATION_PENALTY_PER_ROOM: -2,      // Reputation loss per room if can't pay
  WARNING_TIME: 2 * 60 * 1000           // Warn 2 minutes before due (down from 5)
} as const;

// ============================================================================
// Daily Operating Costs Configuration (NEW)
// ============================================================================

export const OPERATING_COSTS_CONFIG = {
  BASE_DAILY_COST: 1500,                 // Base daily cost regardless of size
  PER_RESIDENT_COST: 100,                 // Additional cost per resident
  PER_ROOM_COST: 100                     // Additional cost per room built
} as const;

// ============================================================================
// Random Expense Events Configuration (NEW)
// ============================================================================

export const EXPENSE_EVENTS_CONFIG = {
  CHANCE_PER_DONATION_CYCLE: 0.15,      // 15% chance each donation cycle
  MIN_COST: 1500,                         // Minimum emergency expense
  MAX_COST: 5000,                        // Maximum emergency expense
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
  NIGHT_DURATION: 45 * 1000,                   // 45 seconds
  FULL_DAY_CYCLE: 4.75 * 60 * 1000             // 4 min 45 s (day + night)
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
  BASE_PAYOUT_MIN: 1000,
  BASE_PAYOUT_MAX: 2500,
  DURATION_MINUTES: 2.5,                   // 2.5 minutes (2:30) - quick fundraiser cycles
  BASE_REPUTATION_MODIFIER: 0.25,          // Base modifier for payout calculation
  
  // Effects on success
  LIFE_BOOST: 22.5,                        // +22.5 LIFE per participant on success
  LIFE_BOOST_FAILURE: 7.5,                 // +7.5 LIFE per participant on failure (taking part is what counts)
  HEALTH_COST: 10,                      // -10 health points
  REPUTATION_BOOST: 2,                     // +2 reputation on completion
  
  // Cooldown system
  COOLDOWN_DURATION: 600000,               // 10 minutes between fundraisers (in ms)
  
  // Food consumption
  FOOD_COST_PER_RESIDENT: 3,               // Food units per participating resident
  
  // Failure consequences
  FAILURE_HEALTH_PENALTY: -5,           // Health loss on failure (embarrassment)
  FAILURE_REPUTATION_PENALTY: -2,          // Reputation loss on failure (public failure)
  
  // Fatigue system
  FATIGUE_DURATION: 300000,                // 5 minutes (in ms) - resident fatigue duration
  FATIGUE_BY_PROFILE: { young_adult: 30 * 1000, adult: 2 * 60 * 1000, elderly: 5 * 60 * 1000 } as Record<ResidentProfile, number>,
  FATIGUE_HEALTH_PENALTY: -5,           // Health penalty during fatigue
  MIN_NON_FATIGUED_RESIDENTS: 1,           // Minimum non-fatigued residents to start (lowered for early game)
  MIN_GROUP: 1,                            // Each fundraiser rolls a required group size in [MIN_GROUP, MAX_GROUP]
  MAX_GROUP: 3,                            // = fundraiser station capacity (one group at a time)
  
  // Success chance thresholds based on average health
  SUCCESS_CHANCE: {
    HEALTH_80_PLUS: 0.95,               // 95% success if avg health >= 80
    HEALTH_60_PLUS: 0.80,               // 80% success if avg health >= 60
    HEALTH_40_PLUS: 0.60,               // 60% success if avg health >= 40
    HEALTH_20_PLUS: 0.40,               // 40% success if avg health >= 20
    HEALTH_BELOW_20: 0.20               // 20% success if avg health < 20
  }
} as const;

// ============================================================================
// Resident Spawning Configuration
// ============================================================================

// Residents only arrive by accepting events; these weights pick the profile when an event doesn't.
// ============================================================================
// Warnings
// ============================================================================

export const WARNING_CONFIG = {
  // Check interval
  CHECK_INTERVAL: 5000, // Check every 5 seconds
  
  // Cooldown durations (ms)
  COOLDOWN_DEFAULT: 2 * 60 * 1000,      // 2 minutes - same warning can only appear once per 2 min
  COOLDOWN_DISMISSED: 5 * 60 * 1000,    // 5 minutes - after dismissing, don't show for 5 min
  COOLDOWN_CRITICAL: 30 * 1000,         // 30 seconds - critical warnings can reappear sooner
  
  // Escalation (ms)
  ESCALATION_TIME: 3 * 60 * 1000,       // 3 minutes - escalate severity if ignored
  
  // Financial thresholds
  LOW_FUNDS_THRESHOLD: 25000,
  IN_DEBT_THRESHOLD: 0,
  NEAR_BANKRUPTCY_THRESHOLD: -15000,
  MAINTENANCE_WARNING_MINUTES: 2,       // Warn 2 minutes before maintenance
  
  // Resident thresholds
  UNHEALTHY_THRESHOLD: 30,
  UNHEALTHY_DURATION_WARNING: 60 * 1000,  // 1 minute below health threshold
  LOW_FOOD_PER_RESIDENT: 2,             // Warn if food < residents * 2
  
  // Operational thresholds
  LOW_REPUTATION_THRESHOLD: 40,
  
  // Progression thresholds
  STALLED_PROGRESS_MINUTES: 5,          // 5 minutes with no graduations
  LIFE_METER_STALLED_THRESHOLD: 5,      // If LIFE meter hasn't moved by 5 points in 2 min
};

// ============================================================================
// Random Events
// ============================================================================

export const EVENT_CONFIG = {
  MIN_INTERVAL: 45 * 1000,           // 45 seconds minimum between events
  MAX_INTERVAL: 2 * 60 * 1000,       // 2 minutes maximum between events
  MAX_ACTIVE_EVENTS: 3,              // Maximum simultaneous events
  EVENT_EXPIRY_TIME: 5 * 60 * 1000,  // 5 minutes to respond
};

// Relative weights (normalised when picking). Arrival events are the only way residents join.
export const EVENT_WEIGHTS = {
  donation_drive: 0.15,
  health_outbreak: 0.10,
  media_coverage: 0.12,
  volunteer_day: 0.10,
  inspection: 0.08,
  community_support: 0.14,
  elder_transfer: 0.14,
  job_referral: 0.14,
  knock_at_door: 0.14,
  family_reunification: 0.08,
  street_outreach: 0.12,
  hospital_referral: 0.08,
  pipe_burst: 0.08,
  LOW_MONEY_DONATION_DRIVE: 0.25,     // used instead when money is low
  NO_ROOM_ARRIVAL_MULTIPLIER: 0.3,    // arrival events are rarer when the shelter is full
};

export const EVENT_ECONOMY = {
  DONATION_DRIVE_BASE: 15000,
  DONATION_DRIVE_PER_RESIDENT: 5000,
  OUTBREAK_TREATMENT_MIN: 20000,
  OUTBREAK_TREATMENT_PER_RESIDENT: 3750,
  MEDIA_GRANT: 25000,
  INSPECTION_GRANT: 50000,
  INSPECTION_FINE: 25000,
  INSPECTION_PREP_COST: 10000,
  PIPE_REPAIR_COST: 5000,
  HOSPITAL_STIPEND: 8000,
  COMMUNITY_DONATION_MIN: 15000,
  COMMUNITY_DONATION_MAX: 40000,
  ELDER_TRANSFER_STIPEND: 12500,
  LOW_MONEY_THRESHOLD: 25000,
};

export const SPAWN_CONFIG = {
  PROFILE_WEIGHTS: {
    young_adult: 0.4,                      // 40%
    adult: 0.4,                            // 40%
    elderly: 0.2                           // 20%
  }
} as const;

// ============================================================================
// Grid Expansion Configuration
// ============================================================================

export const EXPANSION_CONFIG = {
  BASE_COST: 50000,                         // Base cost per expansion
  EXPANSION_SIZE: 5,                       // Each expansion unlocks 5x5 area
  COST_FORMULA_MULTIPLIER: 0.01            // Cost = Base × (1 + UnlockedTiles/100)
} as const;

// ============================================================================
// AI & Pathfinding Configuration
// ============================================================================

export const AI_CONFIG = {
  NEED_CHECK_INTERVAL: 5000,        // Check needs every 5 seconds
  MOVE_SPEED: 0.8,                  // Tiles per second (before profile factor)
  ROOM_USAGE_TIME: 10,              // Seconds to satisfy need
  BATHROOM_CHANCE: 0.1,             // 10% chance per check
  BATHROOM_MIN_INTERVAL: 60000,     // Minimum 1 minute between bathroom needs
  EATING_INTERVAL_MIN: 2 * 60 * 1000,  // Minimum real time since last meal (daytime only, paused at night)
  EATING_INTERVAL_MAX: 3 * 60 * 1000,  // Maximum real time since last meal
  EATING_DURATION: 15,              // Seconds to eat at cafeteria
  MAX_WAIT_TIME: 10000,             // Maximum time to wait for occupied tile (10 seconds - INCREASED)
  REPATH_COOLDOWN: 2000,            // Cooldown before attempting to repath (2 seconds)
  REPOSITION_DURATION: 1.0,         // Duration for gradual repositioning animation (1 second)
  REPATH_ATTEMPTS: 2,               // Number of repath attempts before repositioning
  FUNDRAISER_WANDER_INTERVAL: 3000, // Interval between wander position changes at fundraiser (3 seconds)
  FUNDRAISER_WANDER_SPEED: 1.5,     // Slower movement speed when wandering (tiles per second)
  STROLL_CHANCE: { young_adult: 0.5, adult: 0.4, elderly: 0.25 } as Record<ResidentProfile, number>, // idle residents going for a walk
  STROLL_MAX_FRACTION: 0.33,        // cap on idle residents strolling at once, so hallways don't jam
  STROLL_ROOM_VISIT_CHANCE: 0.85,    // a stroll visits a room rather than a hallway tile
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
  MALE_FIRST_NAMES: [
    "John", "James", "Michael", "David", "Robert", "William",
    "Richard", "Joseph", "Thomas", "Charles", "Christopher", "Daniel"
  ],
  FEMALE_FIRST_NAMES: [
    "Maria", "Sarah", "Jennifer", "Lisa", "Patricia", "Linda",
    "Barbara", "Elizabeth", "Susan", "Jessica", "Karen", "Nancy"
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
  NIGHT_AMBIENT_LIGHT: 0.55,
  DAY_COLOR_TINT: 0xFFFFFF,
  NIGHT_COLOR_TINT: 0x8891d6
};

// ============================================================================
// Colors — cohesive slate/teal base palette with soft, readable accents
// ============================================================================

export const COLORS = {
  GRID_LINE: 0x557a42,
  TILE_EMPTY: 0x769b5a,        // buildable land (grass), lighter than locked
  TILE_LOCKED: 0x3a4733,       // not-yet-unlocked land
  TILE_ENTRANCE: 0xd9c28f,     // welcoming doorway (sandy path)
  ROOM_DORMITORY: 0xb07a4a,
  ROOM_CAFETERIA: 0xf59e0b,
  ROOM_CLINIC: 0xf472b6,
  ROOM_BATHROOM: 0x67d3e6,
  ROOM_COMMON: 0x4ade80,
  ROOM_ADMIN: 0x94a3b8,
  ROOM_FUNDRAISER: 0xfacc15,
  RESIDENT_YOUNG: 0x4ade80,
  RESIDENT_ADULT: 0xf87171,
  RESIDENT_ELDERLY: 0xfbbf24
};

// Background beyond the shelter grid (Phaser canvas clear color)
export const BACKGROUND_COLOR = 0x1a1f16;

// ============================================================================
// Adjacency Bonuses Configuration
// ============================================================================

// Adjacency bonus key format: "room1_room2" (sorted alphabetically)
// This allows checking both directions with a single lookup
export const ADJACENCY_BONUSES: Record<string, AdjacencyBonusConfig> = {
  // ========== POSITIVE SYNERGIES ==========
  
  // Dormitory combinations
  bathroom_dormitory: {
    health: 5,
    lifeFillModifier: 0,
    maintenanceReduction: 0.1, // 10% cheaper maintenance
    description: "Residents appreciate bathrooms near sleeping areas"
  },
  common_room_dormitory: {
    health: 3,
    lifeFillModifier: 0.05, // 5% faster LIFE fill
    maintenanceReduction: 0,
    description: "Easy access to relaxation areas"
  },
  
  // Cafeteria combinations
  cafeteria_common_room: {
    health: 5,
    lifeFillModifier: 0,
    maintenanceReduction: 0,
    description: "Social dining experience"
  },
  
  // Clinic combinations
  bathroom_clinic: {
    health: 3,
    lifeFillModifier: 0,
    maintenanceReduction: 0,
    description: "Convenient hygiene facilities"
  },
  cafeteria_clinic: {
    health: -3,
    lifeFillModifier: 0,
    maintenanceReduction: 0,
    description: "Kitchen noise and smells disturb patients"
  },
  
  // Fundraiser station combinations
  common_room_fundraiser_station: {
    health: 2,
    lifeFillModifier: 0,
    maintenanceReduction: 0.05,
    description: "Comfortable preparation area"
  },
  admin_office_fundraiser_station: {
    health: 0,
    lifeFillModifier: 0,
    maintenanceReduction: 0.1, // 10% cheaper maintenance
    description: "Streamlined fundraiser coordination"
  },
  
  // ========== NEGATIVE SYNERGIES (PENALTIES) ==========
  
  // Dormitory penalties
  cafeteria_dormitory: {
    health: -5,
    lifeFillModifier: 0,
    maintenanceReduction: -0.1, // 10% MORE maintenance (noise, smells)
    description: "Kitchen noise disturbs sleep"
  },
  dormitory_fundraiser_station: {
    health: -3,
    lifeFillModifier: 0,
    maintenanceReduction: -0.05,
    description: "Fundraiser activities disturb rest"
  },
  
  // Bathroom penalties
  bathroom_cafeteria: {
    health: -8,
    lifeFillModifier: 0,
    maintenanceReduction: -0.15, // 15% MORE maintenance
    description: "Unpleasant proximity"
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
    gridSize: 12, // 12x12 playable area
    upgradeCost: 0, // Starting tier
    availableRooms: ['dormitory', 'cafeteria', 'bathroom', 'common_room', 'clinic', 'fundraiser_station', 'potted_plant'],
    donationMultiplier: 1.0,
    description: "A small shelter providing basic services",
    graduationsRequired: 0, // Starting tier
    reputationRequired: 0   // Starting tier
  },
  2: {
    name: "Community Hub",
    maxResidents: 25,
    gridSize: 18,
    upgradeCost: 150000,
    availableRooms: ['dormitory', 'cafeteria', 'bathroom', 'common_room', 'clinic', 'fundraiser_station', 'potted_plant', 'admin_office', 'large_dormitory', 'library'],
    donationMultiplier: 1.2, // 20% more donations
    description: "Growing community with expanded services",
    graduationsRequired: 5,
    reputationRequired: 60
  },
  3: {
    name: "Opportunity Center",
    maxResidents: 50,
    gridSize: 22,
    upgradeCost: 400000,
    availableRooms: ['dormitory', 'cafeteria', 'bathroom', 'common_room', 'clinic', 'fundraiser_station', 'potted_plant', 'admin_office', 'large_dormitory', 'library', 'fountain', 'medical_center', 'dining_hall', 'garden'],
    donationMultiplier: 1.5, // 50% more donations
    description: "Comprehensive support for residents",
    graduationsRequired: 15,
    reputationRequired: 60
  },
  4: {
    name: "Campus",
    maxResidents: 100,
    gridSize: 26,
    upgradeCost: 1000000,
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
  MIN_GRID_UTILIZATION: 0.4, // Must have 40% of grid utilized to upgrade
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
    donationBonus: 10000,
    healthImpact: -5
  },
  winter_storm: {
    type: "winter_storm",
    title: "Winter Storm Emergency",
    description: "A severe winter storm has left people stranded without heat. Emergency services are asking for help.",
    residentSurge: 5,
    urgency: "24hours",
    reputationGainAccept: 10,
    reputationLossDecline: 8,
    donationBonus: 17500,
    healthImpact: -10,
    naturalDisaster: true,
    maintenanceSurge: 1.5
  },
  earthquake: {
    type: "earthquake",
    title: "Earthquake",
    description: "A strong earthquake has shaken the shelter and damaged buildings.",
    residentSurge: 0,
    urgency: "immediate",
    reputationGainAccept: 0,
    reputationLossDecline: 0,
    donationBonus: 0,
    healthImpact: 0,
    naturalDisaster: true
  },
  factory_closure: {
    type: "factory_closure",
    title: "Factory Closure",
    description: "The local factory closed suddenly. Several workers need temporary housing while they find new jobs.",
    residentSurge: 4,
    urgency: "week",
    reputationGainAccept: 5,
    reputationLossDecline: 2,
    donationBonus: 5000,
    healthImpact: 0,
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
    donationBonus: 7500,
    healthImpact: -3,
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
    donationBonus: 5000,
    healthImpact: -2,
    medicalCosts: 10000
  },
  eviction_wave: {
    type: "eviction_wave",
    title: "Mass Eviction",
    description: "A landlord evicted an entire apartment building. Families are on the street.",
    residentSurge: 8,
    urgency: "immediate",
    reputationGainAccept: 15,
    reputationLossDecline: 12,
    donationBonus: 25000,
    healthImpact: -15
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
  OVERCROWDING_HEALTH_PENALTY: -2,      // Per-resident health penalty when overcrowded
  
  // Urgency timers (time to respond)
  URGENCY_TIMERS: {
    immediate: 60 * 1000,                  // 1 minute to decide
    "24hours": 3 * 60 * 1000,              // 3 minutes to decide
    week: 5 * 60 * 1000                    // 5 minutes to decide
  },
  
  // Partial accept threshold (only show for large surges)
  PARTIAL_ACCEPT_THRESHOLD: 4,             // Show partial accept for 4+ residents
  
  // Security costs for domestic violence cases
  SECURITY_COST_PER_RESIDENT: 1500,          // Extra cost per resident
  
  // Life boost for motivated residents (factory closure)
  LIFE_BOOST_MULTIPLIER: 1.25,             // 25% faster LIFE fill

  // Natural disasters (earthquake, winter storm) damage buildings
  MAX_DAMAGED_BUILDINGS: 4,                // 1..4 buildings damaged (capped by rooms built)
  REPAIR_COST_PER_BUILDING: 7500            // Charged immediately per damaged building
} as const;

// ============================================================================
// Resident Status Bar Configuration
// ============================================================================

export const STATUS_BAR_CONFIG = {
  // Dimensions
  BAR_WIDTH: 30,
  BAR_HEIGHT: 4,
  HEALTH_BAR_HEIGHT: 3,
  GAP_BETWEEN_BARS: 2,
  OFFSET_ABOVE_RESIDENT: 25,
  
  // LIFE Meter Colors
  LIFE_COLOR_DEFAULT: 0x2196F3,     // Blue
  LIFE_COLOR_NEAR_GRADUATION: 0xFFD700,  // Gold (90-100%)
  LIFE_COLOR_STALLED: 0x9E9E9E,     // Grey
  
  // Health Colors
  HEALTH_COLOR_HIGH: 0x4CAF50,   // Green (70-100%)
  HEALTH_COLOR_MEDIUM: 0xFFC107, // Yellow (40-69%)
  HEALTH_COLOR_LOW: 0xFF9800,    // Orange (20-39%)
  HEALTH_COLOR_CRITICAL: 0xF44336, // Red (0-19%)
  
  // Thresholds
  NEAR_GRADUATION_THRESHOLD: 90,
  HEALTH_HIGH_THRESHOLD: 70,
  HEALTH_MEDIUM_THRESHOLD: 40,
  HEALTH_LOW_THRESHOLD: 20,
  
  // Stalled detection (ms since last LIFE change)
  STALLED_DURATION: 60000, // 1 minute
  
  // Animation
  PULSE_SPEED: 500,  // ms per pulse cycle for critical health
  GLOW_INTENSITY: 0.5,
  
  // Background
  BACKGROUND_COLOR: 0x333333,
  BACKGROUND_ALPHA: 0.5
} as const;

// Status Icons for resident states
export const STATUS_ICONS = {
  HEALTHY: '💚',       // health > 80
  NEUTRAL: '💛',     // health 40-80
  UNHEALTHY: '🤒',     // health 20-39
  AT_RISK: '🚑',     // health < 20 for extended time
  SLEEPING: '💤',    // in dormitory sleeping
  EATING: '🍽️',      // in cafeteria
  WALKING: '🚶',     // pathfinding state
  LEAVING: '🏃'      // departure state
} as const;
