// Core Type Definitions for Open Arms Game

// ============================================================================
// Enums
// ============================================================================

export type ShelterTier = 1 | 2 | 3 | 4;

export type DisasterUrgency = "immediate" | "24hours" | "week";

export type DisasterEventType =
  | "house_fire"
  | "winter_storm"
  | "earthquake"
  | "factory_closure"
  | "domestic_violence"
  | "hospital_discharge"
  | "eviction_wave";

export type ResidentProfile =
  | "young_adult"
  | "adult"
  | "elderly";

export type ResidentState =
  | "idle"
  | "seeking_need"
  | "pathfinding"
  | "in_use"
  | "satisfied"
  | "sleeping"
  | "leaving";

export type DepartureReason = 'unhealthy' | 'hopeless';

export type GameOverReason = 'bankruptcy' | 'reputation' | 'exodus' | null;

export type Need =
  | "food"
  | "bathroom"
  | "health"
  | "social"
  | "sleep"
  | "fundraiser";

export type RoomType = 
  | "dormitory"
  | "cafeteria"
  | "clinic"
  | "bathroom"
  | "admin_office"
  | "common_room"
  | "fundraiser_station"
  // Decorations (1×1): no use of their own, boost the rooms next to them
  | "potted_plant"
  | "fountain"
  // Higher-tier versions of existing rooms (see RoomSpec.baseType)
  | "large_dormitory"
  | "medical_center"
  | "dining_hall"
  // Service rooms (social, like common_room)
  | "library"
  | "garden";

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
  | 'unhealthy_resident'
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

export type Gender = 'male' | 'female';

export interface Resident {
  id: string;
  name: string;
  gender?: Gender; // missing on old saves; treated as 'any' room-wise
  profile: ResidentProfile;
  
  // Stats
  health: number;        // 0-100
  lifeMeter: number;        // 0-100
  
  // State
  currentState: ResidentState;
  currentNeed: Need | null;
  targetRoomId: string | null;
  path: PathNode[] | null;
  pathIndex: number;
  seat?: PathNode | null; // claimed bed/chair tile in targetRoomId (dormitory, cafeteria)
  bed?: { roomId: string; x: number; y: number } | null; // the resident's own bed: same one every night
  
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
  blockedFor?: number;         // Seconds spent stuck behind another resident while walking
  
  // History
  arrivalDay: number;
  arrivalReason: string;
  daysInShelter: number;
  
  // Timers
  lastHealthUpdate: number;
  lastNeedCheck: number;
  lastLifeUpdate: number;
  lastMealTime: number;        // Timestamp of last meal
  
  // Departure tracking
  unhealthyDuration: number;     // Time spent below health threshold (ms)
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
  health: number;           // Flat health bonus/penalty
  lifeFillModifier: number;    // Percentage modifier (0.1 = +10%)
  maintenanceReduction: number; // Percentage reduction (0.1 = -10% cost, negative = more cost)
  description: string;         // Tooltip description
}

export interface RoomAdjacencyBonuses {
  health: number;
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
  
  // Dormitory only: who may sleep here (missing = any)
  gender?: Gender | 'any';
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
  baseType?: RoomType;      // behaves as this room (upgrades, service rooms)
  bonus?: RoomEffect;       // for residents using this room
  aura?: RoomEffect;        // decorations: for residents using adjacent rooms
  isDecoration?: boolean;
}

export interface RoomEffect {
  health: number;           // same scale as AdjacencyBonusConfig.health
  lifeFillModifier: number; // 0.1 = +10% LIFE fill
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
  successChance: number;          // Success probability (0-1) based on avg health (NEW)
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
  healthImpact: number;
  naturalDisaster?: boolean;      // Damages buildings; player pays repair costs immediately
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
  healthDecayRate: number;
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
