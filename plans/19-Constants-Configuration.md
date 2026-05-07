# Constants & Configuration

---

## Overview

This document contains all tunable game constants and configuration values. These values can be adjusted for game balancing without changing code logic.

---

## Timer Constants

```typescript
const TIMER_CONFIG = {
  DONATION_CHECK_INTERVAL: 5 * 60 * 1000,      // 5 minutes
  MAINTENANCE_CHECK_INTERVAL: 15 * 60 * 1000,  // 15 minutes
  DAY_DURATION: 8 * 60 * 1000,                 // 8 minutes
  NIGHT_DURATION: 4 * 60 * 1000,               // 4 minutes
  FULL_DAY_CYCLE: 12 * 60 * 1000,              // 12 minutes
  EVENT_MIN_INTERVAL: 10 * 60 * 1000,          // 10 minutes
  EVENT_MAX_INTERVAL: 30 * 60 * 1000           // 30 minutes
};
```

---

## Economic Constants

### Donation System

```typescript
const DONATION_CONFIG = {
  BASE_AMOUNT_PER_RESIDENT: 50,
  MIN_DONATION: 10,
  GRADUATE_MULTIPLIER: 0.1,           // +10% per graduate
  REPUTATION_MIN_MODIFIER: 0.5,       // At 0% reputation
  REPUTATION_MAX_MODIFIER: 1.5,       // At 100% reputation
  RANDOM_VARIANCE_MIN: 0.8,           // -20%
  RANDOM_VARIANCE_MAX: 1.2            // +20%
};
```

### Food System

```typescript
const FOOD_CONFIG = {
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
};
```

### Maintenance System

```typescript
const MAINTENANCE_CONFIG = {
  CHECK_INTERVAL: 15 * 60 * 1000,
  REPUTATION_PENALTY_PER_ROOM: -2
};

const ROOM_MAINTENANCE_COSTS = {
  dormitory: 20,
  cafeteria: 40,
  learning_center: 50,
  vocational_room: 60,
  bathroom: 15,
  admin_office: 20,
  common_room: 25,
  fundraiser_station: 30
};
```

---

## Room Constants

### Room Specifications

```typescript
const ROOM_SPECS = {
  dormitory: {
    width: 3,
    height: 3,
    buildCost: 500,
    maintenanceCost: 20,
    capacity: 4,
    closesAtNight: false
  },
  
  cafeteria: {
    width: 5,
    height: 3,
    buildCost: 800,
    maintenanceCost: 40,
    capacity: 10,
    closesAtNight: true
  },
  
  learning_center: {
    width: 4,
    height: 3,
    buildCost: 1000,
    maintenanceCost: 50,
    capacity: 6,
    closesAtNight: true
  },
  
  vocational_room: {
    width: 4,
    height: 3,
    buildCost: 1200,
    maintenanceCost: 60,
    capacity: 6,
    closesAtNight: true
  },
  
  bathroom: {
    width: 2,
    height: 2,
    buildCost: 300,
    maintenanceCost: 15,
    capacity: 0,
    closesAtNight: false
  },
  
  common_room: {
    width: 3,
    height: 3,
    buildCost: 600,
    maintenanceCost: 25,
    capacity: 0,
    closesAtNight: false
  },
  
  admin_office: {
    width: 2,
    height: 2,
    buildCost: 400,
    maintenanceCost: 20,
    capacity: 0,
    closesAtNight: true
  },
  
  fundraiser_station: {
    width: 3,
    height: 2,
    buildCost: 700,
    maintenanceCost: 30,
    capacity: 4,
    closesAtNight: true
  }
};
```

### Grid Configuration

```typescript
const GRID_CONFIG = {
  TOTAL_WIDTH: 40,
  TOTAL_HEIGHT: 30,
  STARTER_SIZE: 10,
  TILE_SIZE: 32,                      // Pixels
  EXPANSION_COST_PER_TILE: 100,
  MIN_EXPANSION: 5,
  MAX_EXPANSION: 10
};
```

---

## Resident Constants

### Profile Specifications

```typescript
const PROFILE_SPECS = {
  young_adult: {
    lifeFillRate: 0.05,               // Per second
    happinessDecayRate: 10,           // Per day
    fundraiserEfficiency: 1.2,
    graduationBonus: 0,
    displayName: "Young Adult",
    icon: "🧑"
  },
  
  veteran: {
    lifeFillRate: 0.025,
    happinessDecayRate: 5,
    fundraiserEfficiency: 1.0,
    graduationBonus: 2,
    displayName: "Veteran",
    icon: "🎖️"
  },
  
  elderly: {
    lifeFillRate: 0.0375,
    happinessDecayRate: 15,
    fundraiserEfficiency: 0.8,
    graduationBonus: 0,
    displayName: "Elderly",
    icon: "👴"
  }
};
```

### LIFE Meter Configuration

```typescript
const LIFE_METER_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING_MIN: 10,
  STARTING_MAX: 25,
  GRADUATION_THRESHOLD: 100,
  UPDATE_INTERVAL: 10000              // 10 seconds
};
```

### Happiness Configuration

```typescript
const HAPPINESS_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING: 50,
  UPDATE_INTERVAL: 10000,             // 10 seconds
  SLEEP_RESTORE_RATE: 15,             // Per hour
  COMMON_ROOM_BOOST_RATE: 10          // Per minute
};
```

---

## Fundraiser Constants

```typescript
const FUNDRAISER_SPECS = {
  cookie_sale: {
    basePayout: 200,
    duration: 15,                     // Minutes
    perResidentMultiplier: 1.5,
    lifeBoost: 2,
    happinessCost: 5
  },
  
  car_wash: {
    basePayout: 300,
    duration: 20,
    perResidentMultiplier: 2.0,
    lifeBoost: 2,
    happinessCost: 5
  },
  
  craft_fair: {
    basePayout: 400,
    duration: 30,
    perResidentMultiplier: 1.8,
    lifeBoost: 3,
    happinessCost: 5
  },
  
  bake_sale: {
    basePayout: 250,
    duration: 18,
    perResidentMultiplier: 1.6,
    lifeBoost: 2,
    happinessCost: 5
  }
};
```

---

## Reputation Constants

```typescript
const REPUTATION_CONFIG = {
  MIN: 0,
  MAX: 100,
  STARTING: 50,
  CRITICAL_THRESHOLD: 20,
  GAME_OVER_THRESHOLD: 0
};

const REPUTATION_CHANGES = {
  // Positive
  RESIDENT_GRADUATED: 5,
  RESIDENT_GRADUATED_VETERAN: 7,
  FUNDRAISER_COMPLETED: 2,
  FOOD_LARGE_PORTION: 1,
  DISASTER_ACCEPTED: 3,
  DONATION_DRIVE_ACTIVATED: 2,
  
  // Negative
  RESIDENT_LEFT_UNHAPPY: -3,
  FOOD_SMALL_PORTION: -1,
  FOOD_NONE: -5,
  MAINTENANCE_MISSED: -2,
  OVERCROWDING: -1,
  DISASTER_REJECTED: -5,
  EVENT_IGNORED: -2,
  
  // Neutral
  FOOD_STANDARD: 0
};
```

---

## Event Constants

```typescript
const EVENT_CONFIG = {
  MIN_INTERVAL: 10 * 60 * 1000,
  MAX_INTERVAL: 30 * 60 * 1000,
  MAX_ACTIVE_EVENTS: 3,
  DEFAULT_EXPIRATION: 10 * 60 * 1000  // 10 minutes
};

const EVENT_WEIGHTS = {
  natural_disaster: 0.2,
  donation_drive: 0.3,
  health_outbreak: 0.15,
  media_coverage: 0.2,
  volunteer_day: 0.15
};
```

---

## Pathfinding Constants

```typescript
const PATHFINDING_CONFIG = {
  MAX_ITERATIONS: 1000,
  CACHE_SIZE: 100,
  MOVE_SPEED: 2,                      // Tiles per second
  STUCK_THRESHOLD: 30000              // 30 seconds
};
```

---

## Game State Constants

```typescript
const GAME_STATE_CONFIG = {
  STARTING_MONEY: 1000,
  STARTING_REPUTATION: 50,
  STARTING_DAY: 1,
  STARTING_RESIDENTS: 2,
  STARTING_PHASE: "day"
};
```

---

## Save System Constants

```typescript
const SAVE_CONFIG = {
  STORAGE_KEY: "openArmsGameState",
  BACKUP_KEY: "openArmsGameState_backup",
  SETTINGS_KEY: "openArmsSettings",
  STATISTICS_KEY: "openArmsStatistics",
  MAX_SAVE_SLOTS: 3,
  AUTO_SAVE_DEBOUNCE: 1000,           // 1 second
  PERIODIC_SAVE_INTERVAL: 5 * 60 * 1000, // 5 minutes
  MAX_SAVE_SIZE_KB: 5000              // 5MB
};
```

---

## Offline Progress Constants

```typescript
const OFFLINE_CONFIG = {
  MAX_OFFLINE_TIME: 2 * 60 * 60 * 1000,  // 2 hours
  MAX_OFFLINE_DONATION_CHECKS: 24,       // 2 hours worth
  MAX_OFFLINE_MAINTENANCE_CYCLES: 8,     // 2 hours worth
  MAX_OFFLINE_DAYS: 10
};
```

---

## UI Constants

```typescript
const UI_CONFIG = {
  NOTIFICATION_DURATION: 3000,        // 3 seconds
  MODAL_ANIMATION_DURATION: 300,      // 300ms
  TOOLTIP_DELAY: 500,                 // 500ms
  HUD_UPDATE_INTERVAL: 100            // 100ms
};
```

---

## Performance Constants

```typescript
const PERFORMANCE_CONFIG = {
  TARGET_FPS: 60,
  MIN_ACCEPTABLE_FPS: 30,
  FRAME_TIME_SAMPLES: 60,
  UPDATE_FREQUENCIES: {
    RENDERING: 1 / 60,
    RESIDENT_MOVEMENT: 1 / 60,
    RESIDENT_AI_STATE: 1,
    NEED_DETECTION: 1,
    HAPPINESS_DECAY: 10,
    LIFE_METER_UPDATE: 10,
    WARNING_CHECKS: 10
  }
};
```

---

## Debug Constants

```typescript
const DEBUG_CONFIG = {
  ENABLE_LOGGING: true,
  ENABLE_PERFORMANCE_MONITOR: true,
  ENABLE_DEBUG_COMMANDS: true,
  SHOW_PATHFINDING_PATHS: false,
  SHOW_GRID_COORDINATES: false,
  SHOW_RESIDENT_STATES: false
};
```

---

## Balancing Presets

### Easy Mode

```typescript
const EASY_MODE = {
  STARTING_MONEY: 2000,
  DONATION_BASE_MULTIPLIER: 1.5,
  MAINTENANCE_COST_MULTIPLIER: 0.75,
  HAPPINESS_DECAY_MULTIPLIER: 0.75,
  LIFE_FILL_RATE_MULTIPLIER: 1.25
};
```

### Normal Mode (Default)

```typescript
const NORMAL_MODE = {
  STARTING_MONEY: 1000,
  DONATION_BASE_MULTIPLIER: 1.0,
  MAINTENANCE_COST_MULTIPLIER: 1.0,
  HAPPINESS_DECAY_MULTIPLIER: 1.0,
  LIFE_FILL_RATE_MULTIPLIER: 1.0
};
```

### Hard Mode

```typescript
const HARD_MODE = {
  STARTING_MONEY: 500,
  DONATION_BASE_MULTIPLIER: 0.75,
  MAINTENANCE_COST_MULTIPLIER: 1.25,
  HAPPINESS_DECAY_MULTIPLIER: 1.25,
  LIFE_FILL_RATE_MULTIPLIER: 0.75
};
```

---

## Name Generation

```typescript
const NAME_LISTS = {
  FIRST_NAMES: [
    "John", "Maria", "James", "Sarah", "Michael", "Jennifer",
    "David", "Lisa", "Robert", "Patricia", "William", "Linda",
    "Richard", "Barbara", "Joseph", "Elizabeth", "Thomas", "Susan",
    "Charles", "Jessica", "Christopher", "Karen", "Daniel", "Nancy",
    "Matthew", "Betty", "Anthony", "Helen", "Mark", "Sandra"
  ],
  
  LAST_NAMES: [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia",
    "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez",
    "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson",
    "Martin", "Lee", "Perez", "Thompson", "White", "Harris",
    "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker"
  ]
};
```

---

## Arrival Reasons

```typescript
const ARRIVAL_REASONS = [
  "arrived seeking shelter",
  "arrived after a house fire",
  "arrived after losing their job",
  "arrived after a family crisis",
  "arrived after an eviction",
  "arrived after a natural disaster",
  "arrived after medical emergency",
  "arrived after domestic situation",
  "arrived seeking a fresh start"
];
```

---

## Visual Constants

```typescript
const VISUAL_CONFIG = {
  TILE_SIZE: 32,
  SPRITE_SCALE: 1.0,
  ANIMATION_SPEED: 1.0,
  CONFETTI_PARTICLE_COUNT: 20,
  CONFETTI_DURATION: 2000,
  DAY_AMBIENT_LIGHT: 1.0,
  NIGHT_AMBIENT_LIGHT: 0.4,
  DAY_COLOR_TINT: 0xFFFFFF,
  NIGHT_COLOR_TINT: 0x4444AA,
  TRANSITION_DURATION: 2000
};
```

---

## Audio Constants

```typescript
const AUDIO_CONFIG = {
  MUSIC_VOLUME: 0.5,
  SFX_VOLUME: 0.7,
  AMBIENT_VOLUME: 0.3,
  FADE_DURATION: 1000
};
```

---

## Validation Constants

```typescript
const VALIDATION_CONFIG = {
  MIN_RESIDENT_NAME_LENGTH: 2,
  MAX_RESIDENT_NAME_LENGTH: 50,
  MIN_MONEY: -10000,                  // Can go negative
  MAX_MONEY: 999999999,
  MIN_REPUTATION: 0,
  MAX_REPUTATION: 100,
  MIN_HAPPINESS: 0,
  MAX_HAPPINESS: 100,
  MIN_LIFE_METER: 0,
  MAX_LIFE_METER: 100
};
```

---

## Configuration Management

### Loading Configuration

```typescript
function loadConfig(): GameConfig {
  // Load from settings or use defaults
  const saved = localStorage.getItem('gameConfig');
  
  if (saved) {
    try {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (error) {
      console.error('Failed to load config, using defaults');
    }
  }
  
  return DEFAULT_CONFIG;
}
```

### Saving Configuration

```typescript
function saveConfig(config: GameConfig): void {
  try {
    localStorage.setItem('gameConfig', JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save config');
  }
}
```

---

## Tuning Guidelines

### When Adjusting Constants

1. **Test incrementally** - Change one value at a time
2. **Document changes** - Note why values were changed
3. **Playtest thoroughly** - Verify balance across game stages
4. **Consider interactions** - How changes affect other systems
5. **Maintain ratios** - Keep relative values consistent

### Common Tuning Scenarios

**Game too easy:**
- Reduce donation amounts
- Increase maintenance costs
- Increase happiness decay rates
- Reduce LIFE fill rates

**Game too hard:**
- Increase donation amounts
- Reduce maintenance costs
- Reduce happiness decay rates
- Increase LIFE fill rates

**Progression too slow:**
- Increase LIFE fill rates
- Reduce day/night cycle duration
- Increase fundraiser payouts

**Progression too fast:**
- Reduce LIFE fill rates
- Increase day/night cycle duration
- Reduce fundraiser payouts
