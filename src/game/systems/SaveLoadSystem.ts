import { GameState } from '../../types';
import { ROOM_SPECS, SAVE_VERSION } from '../../constants';
import { createInitialGameState } from './GameStateManager';
import { demolishRoom, placeSouthGate } from './GridSystem';

/**
 * SaveLoadSystem - Enhanced with compression, versioning, and multiple backups
 */

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
  GAME_STATE: "openArmsGameState",
  BACKUP_1: "openArmsGameState_backup1",
  BACKUP_2: "openArmsGameState_backup2",
  BACKUP_3: "openArmsGameState_backup3",
  SETTINGS: "openArmsSettings",
  STATISTICS: "openArmsStatistics",
  SAVE_METADATA: "openArmsSaveMetadata"
};

const CURRENT_VERSION = SAVE_VERSION;

// ============================================================================
// Save Metadata
// ============================================================================

interface SaveMetadata {
  version: string;
  timestamp: number;
  day: number;
  residentCount: number;
  money: number;
  reputation: number;
  compressed: boolean;
}

/**
 * Get save metadata
 */
function getSaveMetadata(gameState: GameState): SaveMetadata {
  return {
    version: CURRENT_VERSION,
    timestamp: Date.now(),
    day: gameState.currentDay,
    residentCount: gameState.residents.length,
    money: gameState.money,
    reputation: gameState.reputation,
    compressed: true
  };
}

// ============================================================================
// Save Functions
// ============================================================================

/**
 * Compress JSON string (simple minification)
 */
function compressJSON(json: string): string {
  // Remove unnecessary whitespace
  return json.replace(/\s+/g, ' ').trim();
}

/**
 * Decompress JSON string
 */
function decompressJSON(compressed: string): string {
  return compressed; // Already valid JSON
}

/**
 * Save game state to localStorage with compression and backups
 */
export function saveGame(gameState: GameState): boolean {
  try {
    // Update save timestamp
    gameState.lastSaved = Date.now();
    
    // Rotate backups before saving (keep last 3 saves)
    rotateBackups();
    
    // Serialize to JSON
    let serialized = JSON.stringify(gameState);
    
    // Compress (minify JSON)
    serialized = compressJSON(serialized);
    
    // Check size (localStorage has ~5-10MB limit)
    const sizeInBytes = new Blob([serialized]).size;
    const sizeInKB = sizeInBytes / 1024;
    
    if (sizeInKB > 5000) {
      console.warn(`Save file is large: ${sizeInKB.toFixed(2)}KB`);
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, serialized);
    
    // Save metadata
    const metadata = getSaveMetadata(gameState);
    localStorage.setItem(STORAGE_KEYS.SAVE_METADATA, JSON.stringify(metadata));
    
    console.log(`Game saved successfully (${sizeInKB.toFixed(2)}KB, compressed)`);
    
    return true;
  } catch (error) {
    console.error("Failed to save game:", error);
    
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.error("Save failed: Storage quota exceeded");
      // Try to free up space by removing oldest backup
      localStorage.removeItem(STORAGE_KEYS.BACKUP_3);
    } else {
      console.error("Save failed: Unknown error");
    }
    
    return false;
  }
}

/**
 * Rotate backup saves (keep last 3)
 */
function rotateBackups(): void {
  try {
    const current = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    if (!current) return;
    
    // Shift backups: backup2 -> backup3, backup1 -> backup2, current -> backup1
    const backup1 = localStorage.getItem(STORAGE_KEYS.BACKUP_1);
    const backup2 = localStorage.getItem(STORAGE_KEYS.BACKUP_2);
    
    if (backup2) {
      localStorage.setItem(STORAGE_KEYS.BACKUP_3, backup2);
    }
    if (backup1) {
      localStorage.setItem(STORAGE_KEYS.BACKUP_2, backup1);
    }
    localStorage.setItem(STORAGE_KEYS.BACKUP_1, current);
  } catch (error) {
    console.error("Failed to rotate backups:", error);
  }
}

/**
 * Create a manual backup of the current save
 */
export function createBackup(gameState: GameState): void {
  try {
    const backup = compressJSON(JSON.stringify(gameState));
    localStorage.setItem(STORAGE_KEYS.BACKUP_1, backup);
    console.log("Manual backup created");
  } catch (error) {
    console.error("Failed to create backup:", error);
  }
}

// ============================================================================
// Load Functions
// ============================================================================

/**
 * Load game state from localStorage with decompression
 */
export function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    
    if (!saved) {
      console.log("No save file found");
      return null;
    }
    
    // Decompress
    const decompressed = decompressJSON(saved);
    
    // Parse JSON
    const parsed = JSON.parse(decompressed);
    
    // Validate structure
    if (!isValidGameState(parsed)) {
      console.error("Invalid save file structure, trying backup...");
      return loadFromBackup(1);
    }
    
    // Migrate if needed
    const migrated = migrateGameState(parsed);
    
    console.log(`Game loaded: Day ${migrated.currentDay} (${parsed.residents?.length || 0} residents)`);
    
    return migrated;
  } catch (error) {
    console.error("Failed to load game:", error);
    console.log("Attempting to restore from backup...");
    return loadFromBackup(1);
  }
}

/**
 * Load from specific backup slot
 */
function loadFromBackup(slot: 1 | 2 | 3): GameState | null {
  try {
    const key = slot === 1 ? STORAGE_KEYS.BACKUP_1 :
                slot === 2 ? STORAGE_KEYS.BACKUP_2 :
                STORAGE_KEYS.BACKUP_3;
    
    const backup = localStorage.getItem(key);
    
    if (!backup) {
      console.log(`No backup ${slot} found`);
      if (slot < 3) {
        return loadFromBackup((slot + 1) as 1 | 2 | 3);
      }
      return null;
    }
    
    const decompressed = decompressJSON(backup);
    const parsed = JSON.parse(decompressed);
    
    if (isValidGameState(parsed)) {
      console.log(`Restored from backup ${slot}`);
      return migrateGameState(parsed);
    }
    
    if (slot < 3) {
      return loadFromBackup((slot + 1) as 1 | 2 | 3);
    }
    
    return null;
  } catch (error) {
    console.error(`Failed to restore backup ${slot}:`, error);
    if (slot < 3) {
      return loadFromBackup((slot + 1) as 1 | 2 | 3);
    }
    return null;
  }
}

/**
 * Restore from backup (tries all backup slots)
 */
export function restoreFromBackup(): GameState | null {
  return loadFromBackup(1);
}

/**
 * List available backups
 */
export function listBackups(): SaveMetadata[] {
  const backups: SaveMetadata[] = [];
  
  for (let slot = 1; slot <= 3; slot++) {
    const key = slot === 1 ? STORAGE_KEYS.BACKUP_1 :
                slot === 2 ? STORAGE_KEYS.BACKUP_2 :
                STORAGE_KEYS.BACKUP_3;
    
    const backup = localStorage.getItem(key);
    if (backup) {
      try {
        const parsed = JSON.parse(decompressJSON(backup));
        if (isValidGameState(parsed)) {
          backups.push(getSaveMetadata(parsed));
        }
      } catch (error) {
        // Skip invalid backup
      }
    }
  }
  
  return backups;
}

// ============================================================================
// Manual Save Slots (written only on explicit player action, never by autosave)
// ============================================================================

export type SlotId = 1 | 2 | 3 | 'auto';

export interface SlotInfo {
  savedAt: number;
  day: number;
  residents: number;
  money: number;
}

const slotKey = (slot: SlotId) => slot === 'auto' ? STORAGE_KEYS.GAME_STATE : `openArmsSlot${slot}`;

/** Write the state to a manual slot. Returns false on storage failure (e.g. quota). */
export function saveToSlot(slot: Exclude<SlotId, 'auto'>, gameState: GameState): boolean {
  try {
    gameState.lastSaved = Date.now();
    localStorage.setItem(slotKey(slot), JSON.stringify(gameState));
    return true;
  } catch (error) {
    console.error(`Failed to save slot ${slot}:`, error);
    return false;
  }
}

/** Load one specific slot. Unlike loadGame, a bad slot returns null instead of falling back to a backup. */
export function loadSlot(slot: SlotId): GameState | null {
  try {
    const raw = localStorage.getItem(slotKey(slot));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidGameState(parsed) ? migrateGameState(parsed) : null;
  } catch (error) {
    console.error(`Failed to load slot ${slot}:`, error);
    return null;
  }
}

/** Summary of each slot (null = empty or unreadable), in order 1, 2, 3, auto. */
export function listSlots(): (SlotInfo | null)[] {
  return ([1, 2, 3, 'auto'] as SlotId[]).map(slot => {
    try {
      const raw = localStorage.getItem(slotKey(slot));
      const s = raw && JSON.parse(raw);
      if (!s || !isValidGameState(s)) return null;
      return { savedAt: s.lastSaved, day: s.currentDay, residents: s.residents.length, money: s.money };
    } catch {
      return null;
    }
  });
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate game state structure
 */
function isValidGameState(obj: any): obj is GameState {
  // Check required properties
  const requiredProps = [
    "version",
    "money",
    "reputation",
    "currentDay",
    "residents",
    "graduatedCount",
    "grid",
    "rooms"
  ];
  
  for (const prop of requiredProps) {
    if (!(prop in obj)) {
      console.error(`Missing required property: ${prop}`);
      return false;
    }
  }
  
  // Validate types
  if (typeof obj.money !== "number") return false;
  if (typeof obj.reputation !== "number") return false;
  if (!Array.isArray(obj.residents)) return false;
  if (!Array.isArray(obj.rooms)) return false;
  
  // Validate ranges
  if (obj.reputation < 0 || obj.reputation > 100) {
    console.warn("Reputation out of range, clamping");
    obj.reputation = Math.max(0, Math.min(100, obj.reputation));
  }
  
  return true;
}

// ============================================================================
// Migration
// ============================================================================

/**
 * Migrate game state to current version
 */
export function migrateGameState(state: any): GameState {
  let currentVersion = state.version || "0.9.0";
  
  // Apply migrations if needed
  if (currentVersion !== CURRENT_VERSION) {
    console.log(`Migrating save from ${currentVersion} to ${CURRENT_VERSION}`);
    
    // Version-specific migrations
    if (currentVersion === "0.9.0") {
      // Migrate from 0.9.0 to 1.0.0
      state = migrateFrom_0_9_0(state);
      currentVersion = "1.0.0";
    }

    if (currentVersion === "1.0.0") {
      state = migrateFrom_1_0_0(state);
      currentVersion = "1.1.0";
    }

    if (currentVersion === "1.1.0") {
      state = migrateFrom_1_1_0(state);
      currentVersion = "1.2.0";
    }

    if (currentVersion === "1.2.0") {
      state = migrateFrom_1_2_0(state);
      currentVersion = "1.3.0";
    }

    if (currentVersion === "1.3.0") {
      state = migrateFrom_1_3_0(state);
      currentVersion = "1.4.0";
    }
    
    state.version = CURRENT_VERSION;
  }
  
  return state as GameState;
}

/**
 * Migrate from version 0.9.0 to 1.0.0
 */
function migrateFrom_0_9_0(state: any): any {
  // Add any missing fields that were added in 1.0.0
  if (!state.activeFundraisers) {
    state.activeFundraisers = [];
  }
  if (!state.events) {
    state.events = [];
  }
  if (!state.notifications) {
    state.notifications = [];
  }

  return state;
}

/**
 * Migrate 1.2.0 -> 1.3.0
 * - currency is now the Philippine peso: every money amount ×50
 * - the veteran profile became "adult"
 */
const PESO_SCALE = 50;
function migrateFrom_1_2_0(state: any): any {
  const scale = (n: unknown) => (typeof n === 'number' ? Math.round(n * PESO_SCALE) : n);
  state.money = scale(state.money);
  state.totalMoneyEarned = scale(state.totalMoneyEarned);
  const fh = state.financialHistory;
  if (fh) {
    for (const d of fh.donations ?? []) d.amount = scale(d.amount);
    for (const e of fh.expenses ?? []) e.amount = scale(e.amount);
    fh.lastDayNetIncome = scale(fh.lastDayNetIncome);
  }
  for (const f of state.activeFundraisers ?? []) f.expectedPayout = scale(f.expectedPayout);
  for (const room of state.rooms ?? []) {
    const spec = ROOM_SPECS[room.type as keyof typeof ROOM_SPECS];
    room.buildCost = spec ? spec.buildCost : scale(room.buildCost);
    room.maintenanceCost = spec ? spec.maintenanceCost : scale(room.maintenanceCost);
  }
  for (const r of state.residents ?? []) {
    if (r.profile === 'veteran') r.profile = 'adult';
  }
  return state;
}

/**
 * Migrate 1.1.0 -> 1.2.0
 * - entrance is now the south gate (bottom edge of the unlocked area)
 * - residents gained a gender; dormitories default to 'any' (gender missing = any)
 */
// 1.4.0 rebalanced upkeep: rooms store their own maintenanceCost, so refresh it from the specs.
function migrateFrom_1_3_0(state: any): any {
  for (const room of state.rooms ?? []) {
    const spec = ROOM_SPECS[room.type as keyof typeof ROOM_SPECS];
    if (spec) room.maintenanceCost = spec.maintenanceCost;
  }
  return state;
}

function migrateFrom_1_1_0(state: any): any {
  if (state.grid) placeSouthGate(state.grid);
  for (const r of state.residents ?? []) {
    if (!r.gender) r.gender = Math.random() < 0.5 ? 'male' : 'female';
  }
  return state;
}

/**
 * Migrate 1.0.0 -> 1.1.0
 * - happiness became health (residents, room adjacency bonuses, stored disaster config)
 * - learning centers and vocational rooms were removed
 */
function migrateFrom_1_0_0(state: any): any {
  // Rename resident fields
  for (const r of state.residents ?? []) {
    if (r.health === undefined) r.health = r.happiness ?? 70;
    if (r.lastHealthUpdate === undefined) r.lastHealthUpdate = r.lastHappinessUpdate ?? Date.now();
    if (r.unhealthyDuration === undefined) r.unhealthyDuration = r.unhappyDuration ?? 0;
    delete r.happiness;
    delete r.lastHappinessUpdate;
    delete r.unhappyDuration;
    if (r.departureReason === 'unhappy') r.departureReason = 'unhealthy';
  }

  // Rename adjacency bonus field on rooms
  for (const room of state.rooms ?? []) {
    const bonuses = room.adjacencyBonuses;
    if (bonuses && bonuses.health === undefined) {
      bonuses.health = bonuses.happiness ?? 0;
    }
    if (bonuses) delete bonuses.happiness;
  }

  // Active disaster keeps a copy of its config
  const disasterConfig = state.activeDisasterEvent?.config;
  if (disasterConfig && disasterConfig.healthImpact === undefined) {
    disasterConfig.healthImpact = disasterConfig.happinessImpact ?? 0;
    delete disasterConfig.happinessImpact;
  }

  // Remove learning centers / vocational rooms (no refund) and free their tiles
  const removedRoomIds = new Set<string>();
  for (const room of [...(state.rooms ?? [])]) {
    if (room.type === 'learning_center' || room.type === 'vocational_room') {
      removedRoomIds.add(room.id);
      demolishRoom(state.grid, state.rooms, room.id);
    }
  }

  // Anyone heading to a removed room, or with the removed "learning" need, goes back to idle
  for (const r of state.residents ?? []) {
    if (removedRoomIds.has(r.targetRoomId) || r.currentNeed === 'learning') {
      r.currentState = 'idle';
      r.currentNeed = null;
      r.targetRoomId = null;
      r.path = null;
      r.pathIndex = 0;
    }
  }

  return state;
}

// ============================================================================
// Auto-Save Manager
// ============================================================================

export class AutoSaveManager {
  private saveTimeout: number | null = null;
  private lastSaveTime: number = 0;
  private readonly SAVE_DEBOUNCE = 1000;      // 1 second
  private readonly PERIODIC_SAVE = 5 * 60 * 1000; // 5 minutes
  private periodicInterval: number | null = null;
  
  /**
   * Schedule a debounced save
   */
  scheduleSave(gameState: GameState): void {
    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Schedule debounced save
    this.saveTimeout = setTimeout(() => {
      this.performSave(gameState);
    }, this.SAVE_DEBOUNCE);
  }
  
  /**
   * Perform the actual save
   */
  private performSave(gameState: GameState): void {
    const success = saveGame(gameState);
    
    if (success) {
      this.lastSaveTime = Date.now();
    }
    
    this.saveTimeout = null;
  }
  
  /**
   * Start periodic auto-save
   */
  startPeriodicSave(gameState: GameState): void {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
    }
    
    this.periodicInterval = setInterval(() => {
      const timeSinceLastSave = Date.now() - this.lastSaveTime;
      
      if (timeSinceLastSave >= this.PERIODIC_SAVE) {
        console.log("Periodic auto-save");
        this.performSave(gameState);
      }
    }, this.PERIODIC_SAVE);
  }
  
  /**
   * Stop periodic auto-save
   */
  stopPeriodicSave(): void {
    if (this.periodicInterval) {
      clearInterval(this.periodicInterval);
      this.periodicInterval = null;
    }
  }
  
  /**
   * Force immediate save
   */
  forceSave(gameState: GameState): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    this.performSave(gameState);
  }
  
  /**
   * Get time since last save
   */
  getTimeSinceLastSave(): number {
    return Date.now() - this.lastSaveTime;
  }
}

// ============================================================================
// Delete Functions
// ============================================================================

/**
 * Delete save data
 */
export function deleteSave(): void {
  localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  localStorage.removeItem(STORAGE_KEYS.BACKUP_1);
  localStorage.removeItem(STORAGE_KEYS.BACKUP_2);
  localStorage.removeItem(STORAGE_KEYS.BACKUP_3);
  localStorage.removeItem(STORAGE_KEYS.SAVE_METADATA);
  console.log("Save deleted");
}

/**
 * Clear all game data
 */
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
  localStorage.removeItem(STORAGE_KEYS.BACKUP_1);
  localStorage.removeItem(STORAGE_KEYS.BACKUP_2);
  localStorage.removeItem(STORAGE_KEYS.BACKUP_3);
  localStorage.removeItem(STORAGE_KEYS.SAVE_METADATA);
  localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  localStorage.removeItem(STORAGE_KEYS.STATISTICS);
  console.log("All game data cleared");
}

/**
 * Get storage usage statistics
 */
export function getStorageStats(): {
  used: number;
  total: number;
  percentage: number;
  saves: { [key: string]: number };
} {
  let totalSize = 0;
  const saves: { [key: string]: number } = {};
  
  for (const key in STORAGE_KEYS) {
    const item = localStorage.getItem(STORAGE_KEYS[key as keyof typeof STORAGE_KEYS]);
    if (item) {
      const size = new Blob([item]).size;
      saves[key] = size;
      totalSize += size;
    }
  }
  
  // Estimate total localStorage capacity (usually 5-10MB)
  const estimatedTotal = 5 * 1024 * 1024; // 5MB
  
  return {
    used: totalSize,
    total: estimatedTotal,
    percentage: (totalSize / estimatedTotal) * 100,
    saves
  };
}

// ============================================================================
// Export/Import
// ============================================================================

/**
 * Export save to file
 */
export function exportSave(gameState: GameState): void {
  const serialized = JSON.stringify(gameState, null, 2);
  const blob = new Blob([serialized], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `open-arms-save-day${gameState.currentDay}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  
  console.log("Save file exported");
}

/**
 * Import save from file
 */
export function importSave(file: File): Promise<GameState | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (isValidGameState(parsed)) {
          const migrated = migrateGameState(parsed);
          resolve(migrated);
          console.log("Save file imported");
        } else {
          console.error("Invalid save file");
          resolve(null);
        }
      } catch (error) {
        console.error("Failed to import save:", error);
        resolve(null);
      }
    };
    
    reader.readAsText(file);
  });
}

// ============================================================================
// Settings Persistence
// ============================================================================

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  showTutorial: boolean;
  autoSave: boolean;
  notifications: boolean;
}

/**
 * Save settings
 */
export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

/**
 * Load settings
 */
export function loadSettings(): GameSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  
  // Return defaults
  return {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    showTutorial: true,
    autoSave: true,
    notifications: true
  };
}
