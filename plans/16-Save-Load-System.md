# Save/Load System

---

## Overview

The Save/Load System handles game state persistence using browser localStorage. It includes serialization, deserialization, version migration, and corruption recovery.

---

## localStorage Schema

### Storage Key

```typescript
const STORAGE_KEYS = {
  GAME_STATE: "openArmsGameState",
  SETTINGS: "openArmsSettings",
  STATISTICS: "openArmsStatistics"
};
```

### Saved Data Structure

```json
{
  "version": "1.0.0",
  "lastSaved": 1715040000000,
  "lastPlayed": 1715040000000,
  "money": 5000,
  "reputation": 65,
  "currentDay": 12,
  "residents": [...],
  "graduatedCount": 8,
  "grid": {...},
  "rooms": [...],
  "nextDonationCheck": 1715040300000,
  "nextMaintenanceCheck": 1715040900000,
  "nextDayNightTransition": 1715040480000,
  "currentPhase": "day",
  "foodPortionSetting": "standard",
  "activeEvents": [...],
  "eventHistory": [...],
  "activeFundraisers": [...]
}
```

---

## Save Implementation

### Save Game

```typescript
function saveGame(gameState: GameState): boolean {
  try {
    // Update save timestamp
    gameState.lastSaved = Date.now();
    
    // Serialize to JSON
    const serialized = JSON.stringify(gameState);
    
    // Check size (localStorage has ~5-10MB limit)
    const sizeInBytes = new Blob([serialized]).size;
    const sizeInKB = sizeInBytes / 1024;
    
    if (sizeInKB > 5000) {
      console.warn(`Save file is large: ${sizeInKB.toFixed(2)}KB`);
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, serialized);
    
    console.log(`Game saved successfully (${sizeInKB.toFixed(2)}KB)`);
    
    return true;
  } catch (error) {
    console.error("Failed to save game:", error);
    
    if (error.name === "QuotaExceededError") {
      showNotification("Save failed: Storage quota exceeded", "error");
    } else {
      showNotification("Save failed: Unknown error", "error");
    }
    
    return false;
  }
}
```

### Auto-Save

```typescript
class AutoSaveManager {
  private saveTimeout: NodeJS.Timeout | null = null;
  private lastSaveTime: number = 0;
  private readonly SAVE_DEBOUNCE = 1000;      // 1 second
  private readonly PERIODIC_SAVE = 5 * 60 * 1000; // 5 minutes
  
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
  
  private performSave(gameState: GameState): void {
    const success = saveGame(gameState);
    
    if (success) {
      this.lastSaveTime = Date.now();
    }
    
    this.saveTimeout = null;
  }
  
  startPeriodicSave(gameState: GameState): void {
    setInterval(() => {
      const timeSinceLastSave = Date.now() - this.lastSaveTime;
      
      if (timeSinceLastSave >= this.PERIODIC_SAVE) {
        console.log("Periodic auto-save");
        this.performSave(gameState);
      }
    }, this.PERIODIC_SAVE);
  }
  
  forceSave(gameState: GameState): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    this.performSave(gameState);
  }
}

const autoSaveManager = new AutoSaveManager();
```

### Save Triggers

```typescript
function setupSaveTriggers(): void {
  // Save on important game events
  gameEventBus.on("resident_graduated", () => {
    autoSaveManager.scheduleSave(gameState);
  });
  
  gameEventBus.on("room_added", () => {
    autoSaveManager.scheduleSave(gameState);
  });
  
  gameEventBus.on("event_resolved", () => {
    autoSaveManager.scheduleSave(gameState);
  });
  
  // Save on window events
  window.addEventListener("beforeunload", () => {
    autoSaveManager.forceSave(gameState);
  });
  
  window.addEventListener("blur", () => {
    autoSaveManager.forceSave(gameState);
  });
  
  // Start periodic saves
  autoSaveManager.startPeriodicSave(gameState);
}
```

---

## Load Implementation

### Load Game

```typescript
function loadGame(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE);
    
    if (!saved) {
      console.log("No save file found");
      return null;
    }
    
    // Parse JSON
    const parsed = JSON.parse(saved);
    
    // Validate structure
    if (!isValidGameState(parsed)) {
      console.error("Invalid save file structure");
      return null;
    }
    
    // Migrate if needed
    const migrated = migrateGameState(parsed);
    
    // Calculate offline progress
    const withOfflineProgress = applyOfflineProgress(migrated);
    
    console.log(`Game loaded: Day ${withOfflineProgress.currentDay}`);
    
    return withOfflineProgress;
  } catch (error) {
    console.error("Failed to load game:", error);
    showNotification("Failed to load save file", "error");
    return null;
  }
}
```

### Validation

```typescript
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
```

---

## Version Migration

### Version System

```typescript
const CURRENT_VERSION = "1.0.0";

interface MigrationFunction {
  fromVersion: string;
  toVersion: string;
  migrate: (state: any) => any;
}

const MIGRATIONS: MigrationFunction[] = [
  // Example migration from 0.9.0 to 1.0.0
  {
    fromVersion: "0.9.0",
    toVersion: "1.0.0",
    migrate: (state) => {
      // Add new properties
      state.eventHistory = state.eventHistory || [];
      state.activeFundraisers = state.activeFundraisers || [];
      
      // Rename properties
      if ("residentList" in state) {
        state.residents = state.residentList;
        delete state.residentList;
      }
      
      return state;
    }
  }
];
```

### Migration Logic

```typescript
function migrateGameState(state: any): GameState {
  let currentVersion = state.version || "0.9.0";
  
  // Apply migrations in sequence
  for (const migration of MIGRATIONS) {
    if (currentVersion === migration.fromVersion) {
      console.log(`Migrating from ${migration.fromVersion} to ${migration.toVersion}`);
      state = migration.migrate(state);
      currentVersion = migration.toVersion;
      state.version = currentVersion;
    }
  }
  
  // Update to current version
  if (currentVersion !== CURRENT_VERSION) {
    console.warn(`Save file version ${currentVersion} doesn't match current ${CURRENT_VERSION}`);
    state.version = CURRENT_VERSION;
  }
  
  return state as GameState;
}
```

---

## Corruption Recovery

### Backup System

```typescript
function createBackup(gameState: GameState): void {
  try {
    const backup = JSON.stringify(gameState);
    localStorage.setItem(STORAGE_KEYS.GAME_STATE + "_backup", backup);
    console.log("Backup created");
  } catch (error) {
    console.error("Failed to create backup:", error);
  }
}

function restoreFromBackup(): GameState | null {
  try {
    const backup = localStorage.getItem(STORAGE_KEYS.GAME_STATE + "_backup");
    
    if (!backup) {
      console.log("No backup found");
      return null;
    }
    
    const parsed = JSON.parse(backup);
    
    if (isValidGameState(parsed)) {
      console.log("Restored from backup");
      return parsed;
    }
    
    return null;
  } catch (error) {
    console.error("Failed to restore backup:", error);
    return null;
  }
}
```

### Corruption Detection

```typescript
function detectCorruption(gameState: GameState): string[] {
  const issues: string[] = [];
  
  // Check for NaN values
  if (isNaN(gameState.money)) issues.push("Money is NaN");
  if (isNaN(gameState.reputation)) issues.push("Reputation is NaN");
  
  // Check for invalid arrays
  if (!Array.isArray(gameState.residents)) issues.push("Residents is not an array");
  if (!Array.isArray(gameState.rooms)) issues.push("Rooms is not an array");
  
  // Check for missing grid
  if (!gameState.grid || !gameState.grid.tiles) issues.push("Grid is corrupted");
  
  // Check for invalid timestamps
  if (gameState.nextDonationCheck < 0) issues.push("Invalid donation timer");
  if (gameState.nextMaintenanceCheck < 0) issues.push("Invalid maintenance timer");
  
  return issues;
}

function attemptRepair(gameState: GameState): GameState {
  console.log("Attempting to repair corrupted save...");
  
  // Fix NaN values
  if (isNaN(gameState.money)) gameState.money = 1000;
  if (isNaN(gameState.reputation)) gameState.reputation = 50;
  
  // Fix invalid arrays
  if (!Array.isArray(gameState.residents)) gameState.residents = [];
  if (!Array.isArray(gameState.rooms)) gameState.rooms = [];
  
  // Fix missing grid
  if (!gameState.grid || !gameState.grid.tiles) {
    gameState.grid = initializeGrid();
  }
  
  // Fix invalid timestamps
  const now = Date.now();
  if (gameState.nextDonationCheck < now) {
    gameState.nextDonationCheck = now + (5 * 60 * 1000);
  }
  if (gameState.nextMaintenanceCheck < now) {
    gameState.nextMaintenanceCheck = now + (15 * 60 * 1000);
  }
  
  console.log("Repair complete");
  return gameState;
}
```

---

## Import/Export

### Export Save

```typescript
function exportSave(gameState: GameState): void {
  const serialized = JSON.stringify(gameState, null, 2);
  const blob = new Blob([serialized], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `open-arms-save-day${gameState.currentDay}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  
  showNotification("Save file exported", "success");
}
```

### Import Save

```typescript
function importSave(file: File): Promise<GameState | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        
        if (isValidGameState(parsed)) {
          const migrated = migrateGameState(parsed);
          resolve(migrated);
          showNotification("Save file imported", "success");
        } else {
          showNotification("Invalid save file", "error");
          resolve(null);
        }
      } catch (error) {
        console.error("Failed to import save:", error);
        showNotification("Failed to import save file", "error");
        resolve(null);
      }
    };
    
    reader.readAsText(file);
  });
}
```

---

## Save Slots

### Multiple Save Slots

```typescript
const MAX_SAVE_SLOTS = 3;

function saveToSlot(gameState: GameState, slot: number): boolean {
  if (slot < 0 || slot >= MAX_SAVE_SLOTS) {
    console.error("Invalid save slot");
    return false;
  }
  
  const key = `${STORAGE_KEYS.GAME_STATE}_slot${slot}`;
  
  try {
    const serialized = JSON.stringify(gameState);
    localStorage.setItem(key, serialized);
    
    // Save metadata
    const metadata = {
      slot,
      day: gameState.currentDay,
      money: gameState.money,
      reputation: gameState.reputation,
      residents: gameState.residents.length,
      savedAt: Date.now()
    };
    
    localStorage.setItem(`${key}_meta`, JSON.stringify(metadata));
    
    return true;
  } catch (error) {
    console.error("Failed to save to slot:", error);
    return false;
  }
}

function loadFromSlot(slot: number): GameState | null {
  if (slot < 0 || slot >= MAX_SAVE_SLOTS) {
    console.error("Invalid save slot");
    return null;
  }
  
  const key = `${STORAGE_KEYS.GAME_STATE}_slot${slot}`;
  
  try {
    const saved = localStorage.getItem(key);
    
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    
    if (isValidGameState(parsed)) {
      return migrateGameState(parsed);
    }
    
    return null;
  } catch (error) {
    console.error("Failed to load from slot:", error);
    return null;
  }
}

function getSaveSlotMetadata(slot: number): any {
  const key = `${STORAGE_KEYS.GAME_STATE}_slot${slot}_meta`;
  
  try {
    const meta = localStorage.getItem(key);
    return meta ? JSON.parse(meta) : null;
  } catch (error) {
    return null;
  }
}
```

---

## Clear Save Data

### Delete Save

```typescript
function deleteSave(): void {
  if (confirm("Are you sure you want to delete your save? This cannot be undone.")) {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE + "_backup");
    
    showNotification("Save deleted", "info");
    
    // Reload page to start new game
    window.location.reload();
  }
}

function deleteAllSaves(): void {
  if (confirm("Delete ALL save slots? This cannot be undone.")) {
    for (let i = 0; i < MAX_SAVE_SLOTS; i++) {
      localStorage.removeItem(`${STORAGE_KEYS.GAME_STATE}_slot${i}`);
      localStorage.removeItem(`${STORAGE_KEYS.GAME_STATE}_slot${i}_meta`);
    }
    
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE);
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE + "_backup");
    
    showNotification("All saves deleted", "info");
    window.location.reload();
  }
}
```

---

## Settings Persistence

### Save Settings

```typescript
interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  showTutorial: boolean;
  autoSave: boolean;
  notifications: boolean;
}

function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}

function loadSettings(): GameSettings {
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
```

---

## Statistics Tracking

### Save Statistics

```typescript
interface GameStatistics {
  totalPlayTime: number;
  totalMoneyEarned: number;
  totalResidentsHelped: number;
  highestReputation: number;
  longestStreak: number;
  gamesPlayed: number;
}

function saveStatistics(stats: GameStatistics): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STATISTICS, JSON.stringify(stats));
  } catch (error) {
    console.error("Failed to save statistics:", error);
  }
}

function loadStatistics(): GameStatistics {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STATISTICS);
    
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error("Failed to load statistics:", error);
  }
  
  // Return defaults
  return {
    totalPlayTime: 0,
    totalMoneyEarned: 0,
    totalResidentsHelped: 0,
    highestReputation: 0,
    longestStreak: 0,
    gamesPlayed: 0
  };
}
```

---

## Integration Notes

### Game State Manager Integration
- Auto-save triggers on state changes
- Debounced to prevent excessive writes
- Force save on critical events

### Offline Progress Integration
- Load calculates time since last played
- Applies offline donations, maintenance, day cycles
- Caps offline progress to prevent abuse

### UI Integration
- Show save indicator when saving
- Display last save time
- Provide manual save button
- Show save slot selection screen

---

## Best Practices

### Save Frequency
- Auto-save every 5 minutes
- Save on important events
- Save on window blur/close
- Debounce rapid changes

### Error Handling
- Validate before saving
- Validate after loading
- Create backups
- Attempt repair on corruption
- Provide export/import as fallback

### Performance
- Debounce saves (1 second)
- Compress large saves (optional)
- Monitor save file size
- Clean up old data

### User Experience
- Show save indicator
- Never lose progress unexpectedly
- Provide manual save option
- Allow multiple save slots
- Support import/export
