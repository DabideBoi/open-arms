// Core Type Definitions for Open Arms Game

// ============================================================================
// Enums
// ============================================================================

export type ShelterTier = 1 | 2 | 3 | 4;

export type DisasterUrgency = "immediate" | "24hours" | "week";

export type DisasterEventType =
  | "house_fire"
  | "winter_storm"
  | "factory_closure"
  | "domestic_violence"
  | "hospital_discharge"
  | "eviction_wave";

export type ResidentProfile =
  | "young_adult"
  | "veteran"
  | "elderly";

export type ResidentState =
  | "idle"
  | "seeking_need"
  | "pathfinding"
  | "in_use"
  | "satisfied"
  | "sleeping"
  | "leaving";

export type DepartureReason = 'unhappy' | 'hopeless';

export type GameOverReason = 'bankruptcy' | 'reputation' | 'exodus' | null;

export type Need =
  | "food"
  | "bathroom"
  | "learning"
  | "social"
  | "sleep"
  | "fundraiser";

export type RoomType = 
  | "dormitory"
  | "cafeteria"
  | "learning_center"
  | "vocational_room"
  | "bathroom"
  | "admin_office"
  | "common_room"
  | "fundraiser_station";

export type TileType = 
  | "empty"
  | "locked"
  | "hallway"
  | "room"
  | "entrance";

// Legacy FoodPortionSetting (for backward compatibility)
export type FoodPortionSetting = "minimal" | "small" | "standard" | "generous" | "premium" | "large" | "none";

// New food portion tier type (matches FOOD_PORTIONS constant)
export type FoodPortionTier = "minimal" | "small" | "standard" | "generous" | "premium";

export type DayPhase = "day" | "night";

// ============================================================================
// Warning System Types
// ============================================================================

export type WarningSeverity = 'info' | 'warning' | 'critical';

export type WarningType =
  // Financial Warnings
  | 'low_funds'
  | 'in_debt'
  | 'near_bankruptcy'
  | 'maintenance_due'
  | 'operating_costs_due'
  // Resident Warnings
  | 'unhappy_resident'
  | 'at_risk_resident'
  | 'overcrowded'
  | 'hungry_residents'
  // Operational Warnings
  | 'low_reputation'
  | 'reputation_dropping'
  | 'maintenance_overdue'
  | 'capacity_warning'
  // Progression Warnings
  | 'ready_to_upgrade'
  | 'stalled_progress'
  | 'life_meters_stalled';

export interface Warning {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  message: string;
  detail?: string;
  actionLabel?: string;
  actionCallback?: () => void;
  timestamp: number;
  dismissable: boolean;
  // For tracking escalation
  originalSeverity?: WarningSeverity;
  escalatedAt?: number;
  // For duration display
  activeSince: number;
}

export interface WarningCooldown {
  type: WarningType;
  dismissedAt: number;
  cooldownUntil: number;
}

// ============================================================================
// Grid & Tile Structures
// ============================================================================

export interface Tile {
  x: number;
  y: number;
  type: TileType;
  occupiedBy: string | null;  // Room ID if occupied
  walkable: boolean;
}

export interface UnlockedArea {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Grid {
  width: number;
  height: number;
  tiles: Tile[][];
  unlockedArea: UnlockedArea;
}

// ============================================================================
// Pathfinding
// ============================================================================

export interface PathNode {
  x: number;
  y: number;
}

// ============================================================================
// Resident Data Model
// ============================================================================

export interface Resident {
  id: string;
  name: string;
  profile: ResidentProfile;
  
  // Stats
  happiness: number;        // 0-100
  lifeMeter: number;        // 0-100
  
  // State
  currentState: ResidentState;
  currentNeed: Need | null;
  targetRoomId: string | null;
  path: PathNode[] | null;
  pathIndex: number;
  
  // Position
  gridX: number;
  gridY: number;
  
  // Sleep position (locked position when sleeping)
  sleepX: number | null;
  sleepY: number | null;
  
  // Gradual repositioning (for smooth teleport fix)
  repositionTarget: { x: number; y: number; startX?: number; startY?: number } | null;
  repositionStartTime: number | null;
  repositionDuration: number;  // Duration in seconds
  repathAttempts?: number;     // Number of repath attempts made
  
  // History
  arrivalDay: number;
  arrivalReason: string;
  daysInShelter: number;
  
  // Timers
  lastHappinessUpdate: number;
  lastNeedCheck: number;
  lastLifeUpdate: number;
  lastMealTime: number;        // Timestamp of last meal
  
  // Departure tracking
  unhappyDuration: number;     // Time spent below happiness threshold (ms)
  isAtRisk: boolean;           // True if at risk of leaving
  departureReason?: DepartureReason; // Why they're leaving (if leaving)
  
  // Fundraiser fatigue tracking (NEW)
  fundraiserFatigueUntil: number | null;  // Timestamp when fatigue expires (null = not fatigued)
  
  // Fundraiser wander tracking
  lastWanderTime: number;  // Timestamp of last wander position change at fundraiser
}

// ============================================================================
// Adjacency Bonus Types
// ============================================================================

export interface AdjacencyBonusConfig {
  happiness: number;           // Flat happiness bonus/penalty
  lifeFillModifier: number;    // Percentage modifier (0.1 = +10%)
  maintenanceReduction: number; // Percentage reduction (0.1 = -10% cost, negative = more cost)
  description: string;         // Tooltip description
}

export interface RoomAdjacencyBonuses {
  happiness: number;
  lifeFillModifier: number;
  maintenanceReduction: number;
  adjacentRoomIds: string[];   // IDs of rooms providing bonuses
  bonusDescriptions: string[]; // Descriptions of active bonuses
}

// ============================================================================
// Room Data Model
// ============================================================================

export interface Room {
  id: string;
  type: RoomType;
  
  // Grid placement
  gridX: number;
  gridY: number;
  width: number;
  height: number;
  
  // State
  isOpen: boolean;
  currentOccupancy: number;
  
  // Costs
  buildCost: number;
  maintenanceCost: number;
  lastMaintenancePaid: number;
  
  // Adjacency bonuses (calculated dynamically)
  adjacencyBonuses: RoomAdjacencyBonuses;
  
  // Visual
  image?: string;  // Optional image path/key for room tile
}

export interface RoomSpec {
  type: RoomType;
  width: number;
  height: number;
  buildCost: number;
  maintenanceCost: number;
  capacity: number;
  closesAtNight: boolean;
  needsSatisfied: Need[];
  image?: string;  // Optional default image path/key for this room type
}

// ============================================================================
// Fundraiser Data Model
// ============================================================================

export interface Fundraiser {
  id: string;
  stationId: string;              // Room ID of fundraiser station
  startedAt: number;              // Timestamp
  duration: number;               // Duration in minutes
  completesAt: number;            // Timestamp
  assignedResidents: string[];    // Resident IDs
  expectedPayout: number;         // Calculated payout
  successChance: number;          // Success probability (0-1) based on avg happiness (NEW)
  successRoll?: number;           // The random roll used to determine success (NEW)
}

// ============================================================================
// Disaster Event Types
// ============================================================================

export interface DisasterEventConfig {
  type: DisasterEventType;
  title: string;
  description: string;
  residentSurge: number;
  urgency: DisasterUrgency;
  reputationGainAccept: number;
  reputationLossDecline: number;
  donationBonus: number;
  happinessImpact: number;
  maintenanceSurge?: number;      // Multiplier for maintenance during event
  lifeBoost?: boolean;            // These residents are motivated
  securityRequired?: boolean;     // Extra security costs
  medicalCosts?: number;          // Per resident medical supply costs
}

export interface ActiveDisasterEvent {
  id: string;
  config: DisasterEventConfig;
  triggeredAt: number;
  expiresAt: number;
  resolved: boolean;
  acceptedCount?: number;         // For partial accepts
}

// ============================================================================
// Financial Tracking Types
// ============================================================================

export interface DonationRecord {
  timestamp: number;
  amount: number;
  source: 'passive' | 'fundraiser' | 'disaster_bonus' | 'offline';
}

export interface ExpenseRecord {
  timestamp: number;
  amount: number;
  type: 'food' | 'maintenance' | 'operating' | 'random' | 'expansion' | 'building';
  description?: string;
}

export interface FinancialHistory {
  donations: DonationRecord[];
  expenses: ExpenseRecord[];
  lastDayNetIncome: number;
  lastCalculatedDay: number;
}

export type FinancialHealthStatus = 'healthy' | 'stable' | 'warning' | 'critical';

// ============================================================================
// Game State
// ============================================================================

export interface GameState {
  // Meta
  version: string;
  lastSaved: number;
  lastPlayed: number;
  
  // Core Counters
  money: number;
  reputation: number;
  currentDay: number;
  food: number;  // Food resource generated by cafeterias
  
  // Shelter Tier Progression
  currentTier: ShelterTier;
  tierUnlockProgress: {
    graduationsTowardNext: number; // Track graduations for upgrade
  };
  
  // Residents
  residents: Resident[];
  graduatedCount: number;
  
  // Grid & Building
  grid: Grid;
  rooms: Room[];
  
  // Fundraisers
  activeFundraisers: Fundraiser[];
  lastFundraiserEndTime: number | null;  // Timestamp when last fundraiser ended (NEW - for cooldown)
  
  // Timers
  nextDonationCheck: number;
  nextMaintenanceCheck: number;
  nextDayNightTransition: number;
  currentPhase: DayPhase;
  nextResidentSpawn: number;
  
  // Settings
  foodPortionSetting: FoodPortionSetting;
  statusBarSettings: StatusBarSettings;
  
  // Bankruptcy & Game Over
  isBankrupt: boolean;
  bankruptcyStartTime: number | null;  // When bankruptcy started (timestamp)
  bankruptcyCountdown: number;          // Remaining ms until game over
  isGameOver: boolean;
  gameOverReason: GameOverReason;
  totalResidentsHelped: number;         // Track total residents ever helped (for stats)
  totalMoneyEarned: number;             // Track total money earned (for stats)
  
  // Disaster Events Tracking
  disasterResidentCount: number;        // Current overflow residents from disasters
  lastDisasterTime: number | null;      // For cooldown
  totalDisastersHandled: number;        // For statistics
  activeDisasterEvent: ActiveDisasterEvent | null; // Currently active disaster
  
  // Reputation Decay Tracking
  lastDecayTime: number;                // When decay was last applied (timestamp)
  recentGraduations: { timestamp: number; day: number }[]; // Track for mitigation calc
  reputationDecayApplied: number;       // How much decay was applied this day
  
  // Financial History Tracking
  financialHistory: FinancialHistory;   // Track donations and expenses for economic dashboard
  
  // Warning System Tracking
  activeWarnings: Warning[];            // Currently active warnings
  warningCooldowns: WarningCooldown[];  // Cooldowns for dismissed warnings
  lastWarningCheck: number;             // When warnings were last checked
  lastGraduationTime: number | null;    // For stalled progress detection
}

// ============================================================================
// Profile Specifications
// ============================================================================

export interface ResidentProfileSpec {
  profile: ResidentProfile;
  lifeFillRate: number;
  happinessDecayRate: number;
  fundraiserEfficiency: number;
  graduationBonus: number;
  displayName: string;
  icon: string;
}

// ============================================================================
// Shelter Tier Configuration Types
// ============================================================================

export interface ShelterTierConfig {
  name: string;
  maxResidents: number;
  gridSize: number;
  upgradeCost: number;
  availableRooms: RoomType[] | 'all';
  donationMultiplier: number;
  description: string;
  graduationsRequired: number;
  reputationRequired: number;
}

export interface TierUpgradeRequirements {
  canUpgrade: boolean;
  hasMoney: boolean;
  hasReputation: boolean;
  hasGraduations: boolean;
  hasGridUtilization: boolean;
  moneyNeeded: number;
  reputationNeeded: number;
  graduationsNeeded: number;
  utilizationNeeded: number;
  currentMoney: number;
  currentReputation: number;
  currentGraduations: number;
  currentUtilization: number;
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PlacementResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Status Bar Settings Types
// ============================================================================

export type StatusBarVisibilityMode = 'always' | 'hover' | 'at-risk';

export interface StatusBarSettings {
  enabled: boolean;
  visibilityMode: StatusBarVisibilityMode;
}
