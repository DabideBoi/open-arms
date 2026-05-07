import { GameState } from '../../types';
import { GAME_STATE_CONFIG, getActiveTimerConfig } from '../../constants';
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
    nextDonationCheck: now + TIMER_CONFIG.DONATION_CHECK_INTERVAL,
    nextMaintenanceCheck: now + TIMER_CONFIG.MAINTENANCE_CHECK_INTERVAL,
    nextDayNightTransition: now + TIMER_CONFIG.DAY_DURATION,
    currentPhase: GAME_STATE_CONFIG.STARTING_PHASE,
    nextResidentSpawn: now + TIMER_CONFIG.FULL_DAY_CYCLE,
    foodPortionSetting: "standard"
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
   * Update money
   */
  updateMoney(amount: number): void {
    this.state.money += amount;
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
   * Add a resident
   */
  addResident(resident: any): void {
    this.state.residents.push(resident);
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
}
