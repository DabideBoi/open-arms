import { GameState, GameOverReason } from '../../types';
import { GAME_STATE_CONFIG, getActiveTimerConfig, BANKRUPTCY_CONFIG, REPUTATION_CONFIG } from '../../constants';
import { initializeGrid } from './GridSystem';
import { createTestResidents } from './ResidentSystem';

/**
 * Create the initial game state
 */
export function createInitialGameState(): GameState {
  const grid = initializeGrid();
  
  // Find entrance tile for spawning residents
  let spawnX = Math.floor(grid.width / 2);
  let spawnY = Math.floor(grid.height / 2);
  
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      if (grid.tiles[y][x].type === "entrance") {
        spawnX = x;
        spawnY = y;
        break;
      }
    }
  }
  
  const now = Date.now();
  const TIMER_CONFIG = getActiveTimerConfig();
  
  return {
    version: "1.0.0",
    lastSaved: now,
    lastPlayed: now,
    money: GAME_STATE_CONFIG.STARTING_MONEY,
    reputation: GAME_STATE_CONFIG.STARTING_REPUTATION,
    currentDay: GAME_STATE_CONFIG.STARTING_DAY,
    food: 0,
    
    // Shelter Tier Progression (start at Tier 1)
    currentTier: 1,
    tierUnlockProgress: {
      graduationsTowardNext: 0
    },
    
    residents: createTestResidents(
      GAME_STATE_CONFIG.STARTING_RESIDENTS,
      GAME_STATE_CONFIG.STARTING_DAY,
      spawnX,
      spawnY,
      grid
    ),
    graduatedCount: 0,
    grid,
    rooms: [],
    activeFundraisers: [],
    lastFundraiserEndTime: null,  // NEW: Track cooldown for fundraisers
    nextDonationCheck: now + TIMER_CONFIG.DONATION_CHECK_INTERVAL,
    nextMaintenanceCheck: now + TIMER_CONFIG.MAINTENANCE_CHECK_INTERVAL,
    nextDayNightTransition: now + TIMER_CONFIG.DAY_DURATION,
    currentPhase: GAME_STATE_CONFIG.STARTING_PHASE,
    nextResidentSpawn: now + TIMER_CONFIG.FULL_DAY_CYCLE,
    foodPortionSetting: "standard",
    statusBarSettings: {
      enabled: true,
      visibilityMode: 'always'
    },
    
    // Bankruptcy & Game Over
    isBankrupt: false,
    bankruptcyStartTime: null,
    bankruptcyCountdown: BANKRUPTCY_CONFIG.COUNTDOWN_DURATION,
    isGameOver: false,
    gameOverReason: null,
    totalResidentsHelped: GAME_STATE_CONFIG.STARTING_RESIDENTS,
    totalMoneyEarned: GAME_STATE_CONFIG.STARTING_MONEY,
    
    // Disaster Events Tracking
    disasterResidentCount: 0,
    lastDisasterTime: null,
    totalDisastersHandled: 0,
    activeDisasterEvent: null,
    
    // Reputation Decay Tracking
    lastDecayTime: now,
    recentGraduations: [],
    reputationDecayApplied: 0,
    
    // Financial History Tracking
    financialHistory: {
      donations: [],
      expenses: [],
      lastDayNetIncome: 0,
      lastCalculatedDay: 1
    },
    
    // Warning System Tracking
    activeWarnings: [],
    warningCooldowns: [],
    lastWarningCheck: now,
    lastGraduationTime: null
  };
}

/**
 * Game State Manager class
 * Central hub for all game state management
 */
export class GameStateManager {
  private state: GameState;
  private listeners: Set<(state: GameState) => void> = new Set();
  
  constructor(initialState?: GameState) {
    this.state = initialState || createInitialGameState();
  }
  
  /**
   * Get current game state (read-only)
   */
  getState(): Readonly<GameState> {
    return this.state;
  }
  
  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
  
  /**
   * Update money (tracks total money earned for stats)
   */
  updateMoney(amount: number): void {
    this.state.money += amount;
    
    // Track total money earned for statistics
    if (amount > 0) {
      this.state.totalMoneyEarned += amount;
    }
    
    this.notifyListeners();
  }
  
  /**
   * Update reputation
   */
  updateReputation(amount: number): void {
    this.state.reputation = Math.max(0, Math.min(100, this.state.reputation + amount));
    this.notifyListeners();
  }
  
  /**
   * Update food resource
   */
  updateFood(amount: number): void {
    this.state.food = Math.max(0, this.state.food + amount);
    this.notifyListeners();
  }
  
  /**
   * Add a resident (tracks total residents helped for stats)
   */
  addResident(resident: any): void {
    this.state.residents.push(resident);
    this.state.totalResidentsHelped++;
    this.notifyListeners();
  }
  
  /**
   * Remove a resident
   */
  removeResident(residentId: string): void {
    this.state.residents = this.state.residents.filter(r => r.id !== residentId);
    this.notifyListeners();
  }
  
  /**
   * Update a resident
   */
  updateResident(residentId: string, updates: Partial<any>): void {
    const resident = this.state.residents.find(r => r.id === residentId);
    if (resident) {
      Object.assign(resident, updates);
      this.notifyListeners();
    }
  }
  
  /**
   * Add a room
   */
  addRoom(room: any): void {
    this.state.rooms.push(room);
    this.notifyListeners();
  }
  
  /**
   * Force a state update notification
   */
  forceUpdate(): void {
    this.notifyListeners();
  }
  
  /**
   * Get mutable state (use with caution!)
   */
  getMutableState(): GameState {
    return this.state;
  }
  
  /**
   * Start bankruptcy countdown
   */
  startBankruptcy(): void {
    if (!this.state.isBankrupt) {
      this.state.isBankrupt = true;
      this.state.bankruptcyStartTime = Date.now();
      this.state.bankruptcyCountdown = BANKRUPTCY_CONFIG.COUNTDOWN_DURATION;
      
      console.log(`💀 BANKRUPTCY STARTED! Countdown: ${BANKRUPTCY_CONFIG.COUNTDOWN_DURATION / 60000} minutes`);
      
      // Dispatch warning event
      window.dispatchEvent(new CustomEvent('game:show_notification', {
        detail: {
          message: `⚠️ CRITICAL: Shelter facing bankruptcy! Get above $0 within 3 days or close.`,
          type: 'error'
        }
      }));
      
      this.notifyListeners();
    }
  }
  
  /**
   * Cancel bankruptcy (when player recovers)
   */
  cancelBankruptcy(): void {
    if (this.state.isBankrupt) {
      this.state.isBankrupt = false;
      this.state.bankruptcyStartTime = null;
      this.state.bankruptcyCountdown = BANKRUPTCY_CONFIG.COUNTDOWN_DURATION;
      
      console.log(`✅ BANKRUPTCY CANCELLED! Player recovered.`);
      
      // Dispatch recovery event
      window.dispatchEvent(new CustomEvent('game:show_notification', {
        detail: {
          message: `✅ Financial crisis averted! Your shelter is back in the positive.`,
          type: 'success'
        }
      }));
      
      this.notifyListeners();
    }
  }
  
  /**
   * Update bankruptcy countdown
   */
  updateBankruptcyCountdown(deltaMs: number): void {
    if (this.state.isBankrupt && !this.state.isGameOver) {
      this.state.bankruptcyCountdown -= deltaMs;
      
      if (this.state.bankruptcyCountdown <= 0) {
        this.triggerGameOver('bankruptcy');
      }
    }
  }
  
  /**
   * Trigger game over with a specific reason
   */
  triggerGameOver(reason: GameOverReason): void {
    if (this.state.isGameOver) return; // Prevent multiple triggers
    
    this.state.isGameOver = true;
    this.state.gameOverReason = reason;
    
    let message = '';
    switch (reason) {
      case 'bankruptcy':
        message = '💸 Your shelter has gone bankrupt and must close.';
        break;
      case 'reputation':
        message = '😔 Your reputation has dropped to 0%. No one trusts your shelter anymore.';
        break;
      case 'exodus':
        message = '🚪 All residents have left. Your shelter is empty.';
        break;
    }
    
    console.log(`🎮 GAME OVER: ${reason}`);
    
    // Dispatch game over event
    window.dispatchEvent(new CustomEvent('game:game_over', {
      detail: {
        reason,
        message,
        stats: {
          daysSurvived: this.state.currentDay,
          residentsHelped: this.state.totalResidentsHelped,
          graduatedCount: this.state.graduatedCount,
          moneyEarned: this.state.totalMoneyEarned,
          finalReputation: this.state.reputation,
          finalMoney: this.state.money
        }
      }
    }));
    
    this.notifyListeners();
  }
  
  /**
   * Check all financial status conditions
   */
  checkFinancialStatus(): void {
    const money = this.state.money;
    
    // NOTE: Financial warnings (low funds, in debt) are handled by WarningSystem
    // which runs every 5 seconds with proper deduplication and cooldowns.
    // See src/game/systems/WarningSystem.ts - checkFinancialWarnings()
    
    // Start bankruptcy countdown at -$500
    if (money < BANKRUPTCY_CONFIG.THRESHOLD) {
      if (!this.state.isBankrupt) {
        this.startBankruptcy();
      }
    } else if (this.state.isBankrupt && money >= BANKRUPTCY_CONFIG.RECOVERY_THRESHOLD) {
      // Recovered - money above $0
      this.cancelBankruptcy();
    }
  }
  
  /**
   * Check reputation game over condition
   */
  checkReputationStatus(): void {
    if (this.state.reputation <= REPUTATION_CONFIG.GAME_OVER_THRESHOLD && !this.state.isGameOver) {
      this.triggerGameOver('reputation');
    }
  }
  
  /**
   * Check exodus (all residents left) game over condition
   */
  checkExodusStatus(): void {
    // Only trigger if we had residents at some point (totalResidentsHelped > STARTING_RESIDENTS)
    // and now have none
    if (this.state.residents.length === 0 &&
        this.state.totalResidentsHelped > GAME_STATE_CONFIG.STARTING_RESIDENTS &&
        !this.state.isGameOver) {
      this.triggerGameOver('exodus');
    }
  }
  
  /**
   * Check all game over conditions
   */
  checkAllGameOverConditions(): void {
    if (this.state.isGameOver) return;
    
    this.checkFinancialStatus();
    this.checkReputationStatus();
    this.checkExodusStatus();
  }
  
  /**
   * Reset game to initial state
   */
  resetGame(): void {
    this.state = createInitialGameState();
    this.notifyListeners();
  }
  
  /**
   * Check if player can afford to build (prevented during bankruptcy)
   */
  canBuild(): boolean {
    return !this.state.isBankrupt;
  }
  
  /**
   * Check if player can start fundraiser (prevented during bankruptcy)
   */
  canStartFundraiser(): boolean {
    return !this.state.isBankrupt;
  }
}
