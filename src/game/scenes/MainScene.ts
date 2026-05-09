import Phaser from 'phaser';
import { GameStateManager } from '../systems/GameStateManager';
import { GameState, Room, Resident, RoomType, StatusBarVisibilityMode } from '../../types';
import { GRID_CONFIG, COLORS, ROOM_SPECS, VISUAL_CONFIG, STATUS_BAR_CONFIG, STATUS_ICONS } from '../../constants';
import { getInitials } from '../../utils/helpers';
import { GameClock, ThrottledUpdater, PauseManager } from '../systems/TimerManager';
import { checkDayNightTransition } from '../systems/DayNightSystem';
import { updateAllResidents, updateResidentMovement, updateAllResidentHappiness } from '../systems/ResidentAISystem';
import { AutoSaveManager, loadGame, saveGame } from '../systems/SaveLoadSystem';
import { checkDonation } from '../systems/DonationSystem';
import { checkMaintenance } from '../systems/MaintenanceSystem';
import { updateAllResidentsLife } from '../systems/LIFEMeterSystem';
import { checkFundraiserCompletion } from '../systems/FundraiserSystem';
import { checkResidentSpawning } from '../systems/ResidentSpawningSystem';
import { updateSpatialGrid } from '../systems/PathfindingSystem';
import { initializeCollisionDetection, rebuildOccupancyMap } from '../systems/CollisionDetectionSystem';
import { updateFoodGeneration, initializeCafeteriaGeneration, removeCafeteriaGeneration } from '../systems/FoodSystem';

/**
 * Main game scene with optimized rendering (culling, object pooling, dirty flags)
 */
/**
 * Resident Status UI - Manages LIFE and Happiness bars above residents
 */
class ResidentStatusUI {
  private lifeBar: Phaser.GameObjects.Graphics;
  private happinessBar: Phaser.GameObjects.Graphics;
  private statusIcon: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;
  private lastLifeValue: number = -1;
  private lastHappinessValue: number = -1;
  private lastState: string = '';
  private pulseTime: number = 0;
  
  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.lifeBar = scene.add.graphics();
    this.happinessBar = scene.add.graphics();
    this.statusIcon = scene.add.text(0, -18, '', {
      fontSize: '10px',
      resolution: 2
    });
    this.statusIcon.setOrigin(0.5, 0.5);
    
    this.container.add([this.lifeBar, this.happinessBar, this.statusIcon]);
    this.container.setDepth(15); // Above residents (10) but below placement preview (100)
  }
  
  update(resident: Resident, x: number, y: number, forceRedraw: boolean = false): void {
    // Position container above resident
    this.container.setPosition(x, y - STATUS_BAR_CONFIG.OFFSET_ABOVE_RESIDENT);
    
    // Only redraw if values changed
    const needsRedraw = forceRedraw ||
      this.lastLifeValue !== resident.lifeMeter ||
      this.lastHappinessValue !== resident.happiness ||
      this.lastState !== resident.currentState;
    
    if (needsRedraw) {
      this.drawLifeBar(resident.lifeMeter);
      this.drawHappinessBar(resident.happiness, resident.isAtRisk);
      this.updateStatusIcon(resident);
      
      this.lastLifeValue = resident.lifeMeter;
      this.lastHappinessValue = resident.happiness;
      this.lastState = resident.currentState;
    }
    
    // Update pulse animation for critical happiness
    if (resident.happiness < STATUS_BAR_CONFIG.HAPPINESS_LOW_THRESHOLD) {
      this.pulseTime += 16; // Approximate frame time
      const pulseAlpha = 0.7 + Math.sin(this.pulseTime / STATUS_BAR_CONFIG.PULSE_SPEED * Math.PI * 2) * 0.3;
      this.happinessBar.setAlpha(pulseAlpha);
    } else {
      this.happinessBar.setAlpha(1);
    }
    
    // Glow effect for near-graduation residents
    if (resident.lifeMeter >= STATUS_BAR_CONFIG.NEAR_GRADUATION_THRESHOLD) {
      const glowAlpha = 0.8 + Math.sin(Date.now() / 300) * 0.2;
      this.lifeBar.setAlpha(glowAlpha);
    } else {
      this.lifeBar.setAlpha(1);
    }
  }
  
  private drawLifeBar(value: number): void {
    this.lifeBar.clear();
    
    const halfWidth = STATUS_BAR_CONFIG.BAR_WIDTH / 2;
    
    // Background
    this.lifeBar.fillStyle(STATUS_BAR_CONFIG.BACKGROUND_COLOR, STATUS_BAR_CONFIG.BACKGROUND_ALPHA);
    this.lifeBar.fillRect(-halfWidth, 0, STATUS_BAR_CONFIG.BAR_WIDTH, STATUS_BAR_CONFIG.BAR_HEIGHT);
    
    // Determine color based on value
    let color: number = STATUS_BAR_CONFIG.LIFE_COLOR_DEFAULT;
    if (value >= STATUS_BAR_CONFIG.NEAR_GRADUATION_THRESHOLD) {
      color = STATUS_BAR_CONFIG.LIFE_COLOR_NEAR_GRADUATION;
    }
    
    // Fill bar
    const fillWidth = STATUS_BAR_CONFIG.BAR_WIDTH * (value / 100);
    this.lifeBar.fillStyle(color, 1);
    this.lifeBar.fillRect(-halfWidth, 0, fillWidth, STATUS_BAR_CONFIG.BAR_HEIGHT);
    
    // Border
    this.lifeBar.lineStyle(1, 0x000000, 0.3);
    this.lifeBar.strokeRect(-halfWidth, 0, STATUS_BAR_CONFIG.BAR_WIDTH, STATUS_BAR_CONFIG.BAR_HEIGHT);
  }
  
  private drawHappinessBar(value: number, isAtRisk: boolean): void {
    this.happinessBar.clear();
    
    const halfWidth = STATUS_BAR_CONFIG.BAR_WIDTH / 2;
    const yOffset = STATUS_BAR_CONFIG.BAR_HEIGHT + STATUS_BAR_CONFIG.GAP_BETWEEN_BARS;
    
    // Background
    this.happinessBar.fillStyle(STATUS_BAR_CONFIG.BACKGROUND_COLOR, STATUS_BAR_CONFIG.BACKGROUND_ALPHA);
    this.happinessBar.fillRect(-halfWidth, yOffset, STATUS_BAR_CONFIG.BAR_WIDTH, STATUS_BAR_CONFIG.HAPPINESS_BAR_HEIGHT);
    
    // Determine color based on value
    let color: number;
    if (value >= STATUS_BAR_CONFIG.HAPPINESS_HIGH_THRESHOLD) {
      color = STATUS_BAR_CONFIG.HAPPINESS_COLOR_HIGH;
    } else if (value >= STATUS_BAR_CONFIG.HAPPINESS_MEDIUM_THRESHOLD) {
      color = STATUS_BAR_CONFIG.HAPPINESS_COLOR_MEDIUM;
    } else if (value >= STATUS_BAR_CONFIG.HAPPINESS_LOW_THRESHOLD) {
      color = STATUS_BAR_CONFIG.HAPPINESS_COLOR_LOW;
    } else {
      color = STATUS_BAR_CONFIG.HAPPINESS_COLOR_CRITICAL;
    }
    
    // Fill bar
    const fillWidth = STATUS_BAR_CONFIG.BAR_WIDTH * (value / 100);
    this.happinessBar.fillStyle(color, 1);
    this.happinessBar.fillRect(-halfWidth, yOffset, fillWidth, STATUS_BAR_CONFIG.HAPPINESS_BAR_HEIGHT);
    
    // Border
    this.happinessBar.lineStyle(1, 0x000000, 0.3);
    this.happinessBar.strokeRect(-halfWidth, yOffset, STATUS_BAR_CONFIG.BAR_WIDTH, STATUS_BAR_CONFIG.HAPPINESS_BAR_HEIGHT);
  }
  
  private updateStatusIcon(resident: Resident): void {
    let icon = '';
    
    // Activity-based icons take priority
    switch (resident.currentState) {
      case 'sleeping':
        icon = STATUS_ICONS.SLEEPING;
        break;
      case 'leaving':
        icon = STATUS_ICONS.LEAVING;
        break;
      case 'pathfinding':
        icon = STATUS_ICONS.WALKING;
        break;
      case 'in_use':
        // Check what room they're in for activity icon
        if (resident.targetRoomId) {
          // We'd need room info here, but for now just show neutral
          icon = STATUS_ICONS.NEUTRAL;
        }
        break;
      default:
        // Fall back to happiness-based icons
        if (resident.isAtRisk) {
          icon = STATUS_ICONS.AT_RISK;
        } else if (resident.happiness > 80) {
          icon = STATUS_ICONS.HAPPY;
        } else if (resident.happiness >= 40) {
          icon = STATUS_ICONS.NEUTRAL;
        } else if (resident.happiness >= 20) {
          icon = STATUS_ICONS.UNHAPPY;
        } else {
          icon = STATUS_ICONS.AT_RISK;
        }
    }
    
    this.statusIcon.setText(icon);
  }
  
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }
  
  destroy(): void {
    this.lifeBar.destroy();
    this.happinessBar.destroy();
    this.statusIcon.destroy();
    this.container.destroy();
  }
}

export class MainScene extends Phaser.Scene {
  private gameStateManager!: GameStateManager;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private roomGraphics!: Phaser.GameObjects.Graphics;
  private residentSprites: Map<string, Phaser.GameObjects.Arc> = new Map();
  private residentInitials: Map<string, Phaser.GameObjects.Text> = new Map();
  private roomImages: Map<string, Phaser.GameObjects.Image> = new Map();
  
  // Resident Status UI
  private residentStatusUIs: Map<string, ResidentStatusUI> = new Map();
  private hoveredResidentId: string | null = null;
  
  // Game systems
  private gameClock!: GameClock;
  private throttledUpdater!: ThrottledUpdater;
  private pauseManager!: PauseManager;
  private autoSaveManager!: AutoSaveManager;
  
  // Visual effects
  private ambientLight: number = 1.0;
  private colorTint: number = 0xFFFFFF;
  
  // Optimization: Dirty flags
  private gridDirty: boolean = true;
  private roomsDirty: boolean = true;
  private lastRoomCount: number = 0;
  private lastPhase: "day" | "night" = "day";
  
  // Optimization: Object pooling
  private spritePool: Phaser.GameObjects.Arc[] = [];
  private readonly POOL_SIZE = 50;
  
  // Optimization: Performance monitoring
  private performanceStats = {
    fps: 60,
    frameTime: 0,
    residentCount: 0,
    roomCount: 0,
    visibleResidents: 0
  };
  
  // Placement mode
  private placementMode: boolean = false;
  private selectedRoomType: RoomType | null = null;
  private placementPreview!: Phaser.GameObjects.Graphics;
  private lastPreviewGridX: number = -1;
  private lastPreviewGridY: number = -1;
  
  constructor() {
    super({ key: 'MainScene' });
  }
  
  /**
   * Preload assets
   */
  preload() {
    // Load room images
    this.load.image('rooms/learning_center', 'assets/rooms/learning_center.png');
    this.load.image('rooms/dormitory', 'assets/rooms/dormitory.png');
    this.load.image('rooms/cafeteria', 'assets/rooms/cafeteria.png');
    this.load.image('rooms/fundraser_station', 'assets/rooms/fundraser_station.png');
  }
  
  /**
   * Initialize scene with game state manager
   */
  init(data: { gameStateManager?: GameStateManager }) {
    // Get gameStateManager from data passed by PhaserGame.ts
    if (!data.gameStateManager) {
      console.error('[MainScene] GameStateManager not found!');
      return;
    }
    
    this.gameStateManager = data.gameStateManager;
  }
  
  create() {
    if (!this.gameStateManager) {
      console.error('[MainScene] create() - No GameStateManager! Scene cannot initialize.');
      return;
    }
    
    // Initialize systems
    this.gameClock = new GameClock();
    this.throttledUpdater = new ThrottledUpdater();
    this.pauseManager = new PauseManager();
    this.autoSaveManager = new AutoSaveManager();
    
    // Create graphics objects
    this.gridGraphics = this.add.graphics();
    this.roomGraphics = this.add.graphics();
    this.placementPreview = this.add.graphics();
    this.placementPreview.setDepth(100); // Render on top
    
    // Initialize sprite pool
    this.initializeSpritePool();
    
    // Initialize spatial grid for pathfinding
    const initialState = this.gameStateManager.getState();
    updateSpatialGrid(initialState.rooms);
    
    // Initialize collision detection system
    initializeCollisionDetection(initialState.residents);
    
    // Initialize food generation for existing cafeterias
    const cafeterias = initialState.rooms.filter(room => room.type === 'cafeteria');
    cafeterias.forEach(cafeteria => {
      initializeCafeteriaGeneration(cafeteria.id);
      console.log(`🍽️ Initialized food generation for existing cafeteria ${cafeteria.id}`);
    });
    
    // Subscribe to state changes
    this.gameStateManager.subscribe((state) => {
      this.renderGame(state);
      // Schedule auto-save on state changes
      this.autoSaveManager.scheduleSave(state);
    });
    
    // Set up pause manager callbacks
    this.pauseManager.onPause(() => {
      this.gameClock.pause();
      console.log("Game paused");
    });
    
    this.pauseManager.onResume(() => {
      this.gameClock.resume();
      console.log("Game resumed");
    });
    
    // Set up auto-pause on window blur
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);
    
    // Set up eating event listener for visual feedback
    window.addEventListener('resident_ate_food', this.handleResidentAteFood as EventListener);
    
    // Start periodic auto-save
    this.autoSaveManager.startPeriodicSave(this.gameStateManager.getMutableState());
    
    // Set up camera BEFORE rendering
    this.setupCamera();
    
    // Initial render
    this.renderGame(initialState);
    
    // Start game clock
    this.gameClock.start((deltaTime) => this.updateGameSystems(deltaTime));
    
    // Apply initial day/night visuals
    this.applyPhaseVisuals(initialState.currentPhase);
  }
  
  /**
   * Initialize sprite pool for object pooling
   */
  private initializeSpritePool(): void {
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const sprite = this.add.circle(0, 0, GRID_CONFIG.TILE_SIZE / 3, 0xffffff);
      sprite.setVisible(false);
      sprite.setDepth(10); // Render residents above room images
      this.spritePool.push(sprite);
    }
  }
  
  /**
   * Acquire sprite from pool
   */
  private acquireSprite(): Phaser.GameObjects.Arc {
    const sprite = this.spritePool.pop();
    if (sprite) {
      sprite.setVisible(true);
      return sprite;
    }
    // Pool exhausted, create new sprite
    return this.add.circle(0, 0, GRID_CONFIG.TILE_SIZE / 3, 0xffffff);
  }
  
  /**
   * Release sprite back to pool
   */
  private releaseSprite(sprite: Phaser.GameObjects.Arc): void {
    sprite.setVisible(false);
    if (this.spritePool.length < this.POOL_SIZE) {
      this.spritePool.push(sprite);
    } else {
      sprite.destroy();
    }
  }
  
  /**
   * Set up camera controls
   */
  private setupCamera() {
    const camera = this.cameras.main;
    
    // Center camera on grid
    const gridPixelWidth = GRID_CONFIG.TOTAL_WIDTH * GRID_CONFIG.TILE_SIZE;
    const gridPixelHeight = GRID_CONFIG.TOTAL_HEIGHT * GRID_CONFIG.TILE_SIZE;
    
    camera.setBounds(0, 0, gridPixelWidth, gridPixelHeight);
    
    // Enable camera controls (drag to pan)
    camera.setZoom(1);
    
    // Simple drag controls
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if in placement mode
      if (this.placementMode && this.selectedRoomType) {
        this.handlePlacementClick(pointer);
        return;
      }
      
      isDragging = true;
      dragStartX = pointer.x + camera.scrollX;
      dragStartY = pointer.y + camera.scrollY;
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Update placement preview
      if (this.placementMode && this.selectedRoomType) {
        this.updatePlacementPreview(pointer);
      } else if (isDragging) {
        camera.scrollX = dragStartX - pointer.x;
        camera.scrollY = dragStartY - pointer.y;
      }
    });
    
    this.input.on('pointerup', () => {
      isDragging = false;
    });
    
    // ESC key to cancel placement
    this.input.keyboard?.on('keydown-ESC', () => {
      if (this.placementMode) {
        this.exitPlacementMode();
      }
    });
    
    // B key to toggle status bars
    this.input.keyboard?.on('keydown-B', () => {
      const gameState = this.gameStateManager.getMutableState();
      gameState.statusBarSettings.enabled = !gameState.statusBarSettings.enabled;
      this.gameStateManager.forceUpdate();
      
      // Dispatch notification
      window.dispatchEvent(new CustomEvent('game:show_notification', {
        detail: {
          message: `Status bars ${gameState.statusBarSettings.enabled ? 'enabled' : 'disabled'}`,
          type: 'info'
        }
      }));
    });
    
    // Track hovered resident for hover mode
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.placementMode) {
        this.updateHoveredResident(pointer);
      }
    });
  }
  
  /**
   * Update all game systems
   */
  private updateGameSystems(deltaTime: number): void {
    if (this.pauseManager.isPaused()) {
      return;
    }
    
    const gameState = this.gameStateManager.getMutableState();
    
    // Check if game is over - stop all updates
    if (gameState.isGameOver) {
      return;
    }
    
    // Always update: Resident movement (60 FPS)
    for (const resident of gameState.residents) {
      updateResidentMovement(resident, gameState, deltaTime);
    }
    
    // Throttled: AI state updates (1 FPS)
    if (this.throttledUpdater.shouldUpdate("resident_ai", 1)) {
      updateAllResidents(gameState, deltaTime);
    }
    
    // Throttled: Happiness decay (every 10 seconds)
    if (this.throttledUpdater.shouldUpdate("happiness_decay", 10)) {
      updateAllResidentHappiness(gameState, 10);
    }
    
    // Throttled: LIFE meter updates (every 10 seconds)
    if (this.throttledUpdater.shouldUpdate("life_meter", 10)) {
      updateAllResidentsLife(gameState, 10);
    }
    
    // Update food generation from cafeterias
    updateFoodGeneration(gameState);
    
    // Check day/night transition (includes daily food)
    checkDayNightTransition(gameState);
    
    // Check donation timer
    checkDonation(gameState);
    
    // Check maintenance timer
    checkMaintenance(gameState);
    
    // Check fundraiser completion
    checkFundraiserCompletion(gameState);
    
    // Check resident spawning
    checkResidentSpawning(gameState);
    
    // Update bankruptcy countdown (if active)
    if (gameState.isBankrupt) {
      this.gameStateManager.updateBankruptcyCountdown(deltaTime);
    }
    
    // Check all game over conditions (bankruptcy, reputation, exodus)
    this.gameStateManager.checkAllGameOverConditions();
    
    // Force render update
    this.gameStateManager.forceUpdate();
    
    // Update performance stats
    this.updatePerformanceStats();
  }
  
  /**
   * Update performance statistics
   */
  private updatePerformanceStats(): void {
    const gameState = this.gameStateManager.getState();
    this.performanceStats.residentCount = gameState.residents.length;
    this.performanceStats.roomCount = gameState.rooms.length;
    this.performanceStats.fps = this.game.loop.actualFps;
    this.performanceStats.frameTime = this.game.loop.delta;
  }
  
  /**
   * Render the entire game state (with dirty flag optimization)
   */
  private renderGame(state: GameState) {
    // Check if grid needs redraw
    if (this.gridDirty || state.currentPhase !== this.lastPhase) {
      this.renderGrid(state.grid);
      this.gridDirty = false;
    }
    
    // Check if rooms need redraw
    if (this.roomsDirty || state.rooms.length !== this.lastRoomCount || state.currentPhase !== this.lastPhase) {
      this.renderRooms(state.rooms);
      this.roomsDirty = false;
      this.lastRoomCount = state.rooms.length;
      
      // Update spatial grid when rooms change
      updateSpatialGrid(state.rooms);
    }
    
    // Always render residents (they move constantly)
    this.renderResidents(state.residents);
    
    // Update last phase
    this.lastPhase = state.currentPhase;
  }
  
  /**
   * Mark grid as dirty (needs redraw)
   */
  markGridDirty(): void {
    this.gridDirty = true;
  }
  
  /**
   * Mark rooms as dirty (needs redraw)
   */
  markRoomsDirty(): void {
    this.roomsDirty = true;
  }
  
  /**
   * Render the grid
   */
  private renderGrid(grid: any) {
    this.gridGraphics.clear();
    
    const tileSize = GRID_CONFIG.TILE_SIZE;
    
    // Draw tiles
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        const pixelX = x * tileSize;
        const pixelY = y * tileSize;
        
        // Choose color based on tile type
        let color = COLORS.TILE_EMPTY;
        if (tile.type === "locked") {
          color = COLORS.TILE_LOCKED;
        } else if (tile.type === "entrance") {
          color = COLORS.TILE_ENTRANCE;
        }
        
        // Apply ambient light
        color = this.applyAmbientLight(color);
        
        // Draw tile background (skip if it's a room, we'll draw those separately)
        if (tile.type !== "room") {
          this.gridGraphics.fillStyle(color, 1);
          this.gridGraphics.fillRect(pixelX, pixelY, tileSize, tileSize);
        }
        
        // Draw grid lines
        this.gridGraphics.lineStyle(1, COLORS.GRID_LINE, 0.3);
        this.gridGraphics.strokeRect(pixelX, pixelY, tileSize, tileSize);
      }
    }
  }
  
  /**
   * Render all rooms
   */
  private renderRooms(rooms: Room[]) {
    this.roomGraphics.clear();
    
    const tileSize = GRID_CONFIG.TILE_SIZE;
    const gameState = this.gameStateManager.getState();
    
    // Track which room images are still in use
    const activeRoomIds = new Set(rooms.map(r => r.id));
    
    // Remove images for rooms that no longer exist
    for (const [roomId, image] of this.roomImages.entries()) {
      if (!activeRoomIds.has(roomId)) {
        image.destroy();
        this.roomImages.delete(roomId);
      }
    }
    
    for (const room of rooms) {
      const pixelX = room.gridX * tileSize;
      const pixelY = room.gridY * tileSize;
      const pixelWidth = room.width * tileSize;
      const pixelHeight = room.height * tileSize;
      
      // Check if room has an image and if it's loaded
      const hasImage = room.image && this.textures.exists(room.image);
      
      if (hasImage) {
        // Render using image
        let roomImage = this.roomImages.get(room.id);
        
        if (!roomImage) {
          // Create new image
          roomImage = this.add.image(pixelX, pixelY, room.image!);
          roomImage.setOrigin(0, 0);
          roomImage.setDepth(0); // Render below residents (residents are at depth 10)
          this.roomImages.set(room.id, roomImage);
        }
        
        // Update image properties
        roomImage.setPosition(pixelX, pixelY);
        roomImage.setDisplaySize(pixelWidth, pixelHeight);
        
        // Apply alpha based on room state - make images semi-transparent so NPCs are visible on top
        const hasActiveFundraiser = gameState.activeFundraisers?.some(f => f.stationId === room.id);
        let alpha = room.isOpen ? 0.6 : 0.4; // Semi-transparent (0.6 for open, 0.4 for closed)
        if (hasActiveFundraiser) {
          alpha = 0.7; // Slightly more visible for active fundraisers
        }
        roomImage.setAlpha(alpha);
        
        // Apply ambient light tint
        const tintColor = this.colorTint;
        roomImage.setTint(tintColor);
        
      } else {
        // Fallback to color rendering
        // Remove any existing image for this room
        const existingImage = this.roomImages.get(room.id);
        if (existingImage) {
          existingImage.destroy();
          this.roomImages.delete(room.id);
        }
        
        // Choose color based on room type
        let color = COLORS.ROOM_DORMITORY;
        switch (room.type) {
          case "dormitory":
            color = COLORS.ROOM_DORMITORY;
            break;
          case "cafeteria":
            color = COLORS.ROOM_CAFETERIA;
            break;
          case "learning_center":
            color = COLORS.ROOM_LEARNING;
            break;
          case "vocational_room":
            color = COLORS.ROOM_VOCATIONAL;
            break;
          case "bathroom":
            color = COLORS.ROOM_BATHROOM;
            break;
          case "common_room":
            color = COLORS.ROOM_COMMON;
            break;
          case "admin_office":
            color = COLORS.ROOM_ADMIN;
            break;
          case "fundraiser_station":
            color = COLORS.ROOM_FUNDRAISER;
            break;
        }
        
        // Apply ambient light
        color = this.applyAmbientLight(color);
        
        // Check if this room has an active fundraiser
        const hasActiveFundraiser = gameState.activeFundraisers?.some(f => f.stationId === room.id);
        
        // Dim closed rooms, brighten active fundraisers
        let alpha = room.isOpen ? 0.8 : 0.4;
        if (hasActiveFundraiser) {
          alpha = 0.9;
        }
        
        // Draw room
        this.roomGraphics.fillStyle(color, alpha);
        this.roomGraphics.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
      }
      
      // Draw room border (for both image and color modes)
      const hasActiveFundraiser = gameState.activeFundraisers?.some(f => f.stationId === room.id);
      if (hasActiveFundraiser) {
        // Pulsing border for active fundraisers
        const pulseAlpha = 0.5 + Math.sin(Date.now() / 500) * 0.3;
        this.roomGraphics.lineStyle(3, 0xffd700, pulseAlpha);
      } else {
        this.roomGraphics.lineStyle(2, 0xffffff, room.isOpen ? 0.5 : 0.2);
      }
      this.roomGraphics.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
      
      // Show capacity indicator for rooms with capacity limits
      const spec = ROOM_SPECS[room.type];
      if (spec.capacity > 0 && room.currentOccupancy > 0) {
        const occupancyPercent = room.currentOccupancy / spec.capacity;
        const barWidth = pixelWidth * 0.8;
        const barHeight = 4;
        const barX = pixelX + (pixelWidth - barWidth) / 2;
        const barY = pixelY + pixelHeight - 8;
        
        // Background
        this.roomGraphics.fillStyle(0x000000, 0.5);
        this.roomGraphics.fillRect(barX, barY, barWidth, barHeight);
        
        // Fill
        const fillColor = occupancyPercent >= 1 ? 0xff0000 : 0x00ff00;
        this.roomGraphics.fillStyle(fillColor, 0.8);
        this.roomGraphics.fillRect(barX, barY, barWidth * Math.min(occupancyPercent, 1), barHeight);
      }
    }
  }
  
  /**
   * Render all residents (with culling and object pooling)
   */
  private renderResidents(residents: Resident[]) {
    const tileSize = GRID_CONFIG.TILE_SIZE;
    const camera = this.cameras.main;
    const gameState = this.gameStateManager.getState();
    const statusBarSettings = gameState.statusBarSettings;
    
    // Calculate visible bounds with padding
    const padding = tileSize * 2;
    const visibleBounds = {
      left: camera.scrollX - padding,
      right: camera.scrollX + camera.width + padding,
      top: camera.scrollY - padding,
      bottom: camera.scrollY + camera.height + padding
    };
    
    // Remove sprites, initials, and status UIs for residents that no longer exist
    const currentResidentIds = new Set(residents.map(r => r.id));
    for (const [id, sprite] of this.residentSprites.entries()) {
      if (!currentResidentIds.has(id)) {
        this.releaseSprite(sprite);
        this.residentSprites.delete(id);
      }
    }
    for (const [id, initialsText] of this.residentInitials.entries()) {
      if (!currentResidentIds.has(id)) {
        initialsText.destroy();
        this.residentInitials.delete(id);
      }
    }
    for (const [id, statusUI] of this.residentStatusUIs.entries()) {
      if (!currentResidentIds.has(id)) {
        statusUI.destroy();
        this.residentStatusUIs.delete(id);
      }
    }
    
    let visibleCount = 0;
    
    // Create or update sprites for each resident
    for (const resident of residents) {
      const pixelX = resident.gridX * tileSize + tileSize / 2;
      const pixelY = resident.gridY * tileSize + tileSize / 2;
      
      // Culling: Check if resident is visible
      const isVisible = pixelX >= visibleBounds.left &&
                       pixelX <= visibleBounds.right &&
                       pixelY >= visibleBounds.top &&
                       pixelY <= visibleBounds.bottom;
      
      let sprite = this.residentSprites.get(resident.id);
      let initialsText = this.residentInitials.get(resident.id);
      let statusUI = this.residentStatusUIs.get(resident.id);
      
      if (!isVisible) {
        // Hide sprite, initials, and status UI if not visible
        if (sprite) {
          sprite.setVisible(false);
        }
        if (initialsText) {
          initialsText.setVisible(false);
        }
        if (statusUI) {
          statusUI.setVisible(false);
        }
        continue;
      }
      
      visibleCount++;
      
      if (!sprite) {
        // Acquire sprite from pool
        sprite = this.acquireSprite();
        
        // Set color based on profile
        let color = COLORS.RESIDENT_YOUNG;
        if (resident.profile === "veteran") {
          color = COLORS.RESIDENT_VETERAN;
        } else if (resident.profile === "elderly") {
          color = COLORS.RESIDENT_ELDERLY;
        }
        sprite.setFillStyle(color);
        
        this.residentSprites.set(resident.id, sprite);
      }
      
      // Create initials text if needed
      if (!initialsText) {
        const initials = getInitials(resident.name);
        initialsText = this.add.text(0, 0, initials, {
          fontSize: '9px',
          fontFamily: 'Arial, sans-serif',
          fontStyle: 'bold',
          color: '#ffffff',
          resolution: 2
        });
        initialsText.setOrigin(0.5, 0.5);
        initialsText.setDepth(11); // Above residents (10) but below status bars (15)
        this.residentInitials.set(resident.id, initialsText);
      }
      
      // Create status UI if needed
      if (!statusUI && statusBarSettings.enabled) {
        statusUI = new ResidentStatusUI(this);
        this.residentStatusUIs.set(resident.id, statusUI);
      }
      
      // Update sprite
      sprite.setVisible(true);
      sprite.setPosition(pixelX, pixelY);
      
      // Update initials position and visibility
      initialsText.setVisible(true);
      initialsText.setPosition(pixelX, pixelY);
      
      // Update alpha based on state
      if (resident.currentState === "sleeping") {
        sprite.setAlpha(0.5);
        initialsText.setAlpha(0.5);
      } else {
        sprite.setAlpha(1.0);
        initialsText.setAlpha(1.0);
      }
      
      // Update status UI visibility and position
      if (statusUI) {
        const shouldShowBar = this.shouldShowStatusBar(resident, statusBarSettings);
        statusUI.setVisible(shouldShowBar);
        if (shouldShowBar) {
          statusUI.update(resident, pixelX, pixelY);
        }
      }
    }
    
    this.performanceStats.visibleResidents = visibleCount;
  }
  
  /**
   * Determine if status bar should be shown for a resident based on settings
   */
  private shouldShowStatusBar(resident: Resident, settings: { enabled: boolean; visibilityMode: StatusBarVisibilityMode }): boolean {
    if (!settings.enabled) return false;
    
    switch (settings.visibilityMode) {
      case 'always':
        return true;
      case 'hover':
        return this.hoveredResidentId === resident.id;
      case 'at-risk':
        return resident.isAtRisk || resident.happiness < STATUS_BAR_CONFIG.HAPPINESS_LOW_THRESHOLD;
      default:
        return true;
    }
  }
  
  /**
   * Update hovered resident for hover visibility mode
   */
  private updateHoveredResident(pointer: Phaser.Input.Pointer): void {
    const camera = this.cameras.main;
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    
    const tileSize = GRID_CONFIG.TILE_SIZE;
    const gameState = this.gameStateManager.getState();
    
    // Check each resident to see if pointer is over them
    let foundResident: string | null = null;
    const hoverRadius = tileSize / 2; // Radius around resident center
    
    for (const resident of gameState.residents) {
      const residentX = resident.gridX * tileSize + tileSize / 2;
      const residentY = resident.gridY * tileSize + tileSize / 2;
      
      const distance = Math.sqrt(
        Math.pow(worldX - residentX, 2) +
        Math.pow(worldY - residentY, 2)
      );
      
      if (distance <= hoverRadius) {
        foundResident = resident.id;
        break;
      }
    }
    
    // Only trigger update if hovered resident changed
    if (this.hoveredResidentId !== foundResident) {
      this.hoveredResidentId = foundResident;
      // Force re-render to update status bar visibility
      if (gameState.statusBarSettings.visibilityMode === 'hover') {
        this.gameStateManager.forceUpdate();
      }
    }
  }
  
  /**
   * Apply phase visuals (day/night)
   */
  private applyPhaseVisuals(phase: "day" | "night"): void {
    if (phase === "day") {
      this.ambientLight = VISUAL_CONFIG.DAY_AMBIENT_LIGHT;
      this.colorTint = VISUAL_CONFIG.DAY_COLOR_TINT;
    } else {
      this.ambientLight = VISUAL_CONFIG.NIGHT_AMBIENT_LIGHT;
      this.colorTint = VISUAL_CONFIG.NIGHT_COLOR_TINT;
    }
    
    // Force re-render
    this.renderGame(this.gameStateManager.getState());
  }
  
  /**
   * Apply ambient light to a color
   */
  private applyAmbientLight(color: number): number {
    const r = (color >> 16) & 0xFF;
    const g = (color >> 8) & 0xFF;
    const b = color & 0xFF;
    
    const newR = Math.floor(r * this.ambientLight);
    const newG = Math.floor(g * this.ambientLight);
    const newB = Math.floor(b * this.ambientLight);
    
    return (newR << 16) | (newG << 8) | newB;
  }
  
  update(time: number, delta: number) {
    // Main update is handled by GameClock
    // This Phaser update is kept for compatibility
  }
  
  /**
   * Clean up on scene shutdown
   */
  shutdown() {
    this.gameClock.stop();
    this.autoSaveManager.stopPeriodicSave();
    
    // Force final save
    this.autoSaveManager.forceSave(this.gameStateManager.getMutableState());
    
    // Clean up sprites
    for (const sprite of this.residentSprites.values()) {
      sprite.destroy();
    }
    this.residentSprites.clear();
    
    // Clean up initials text
    for (const initialsText of this.residentInitials.values()) {
      initialsText.destroy();
    }
    this.residentInitials.clear();
    
    // Clean up status UIs
    for (const statusUI of this.residentStatusUIs.values()) {
      statusUI.destroy();
    }
    this.residentStatusUIs.clear();
    
    // Clean up room images
    for (const image of this.roomImages.values()) {
      image.destroy();
    }
    this.roomImages.clear();
    
    // Clean up sprite pool
    for (const sprite of this.spritePool) {
      sprite.destroy();
    }
    this.spritePool = [];
    
    // Remove event listeners
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('resident_ate_food', this.handleResidentAteFood as EventListener);
  }
  
  private handleBlur = () => {
    this.pauseManager.pause();
    this.autoSaveManager.forceSave(this.gameStateManager.getMutableState());
  };
  
  private handleFocus = () => {
    this.pauseManager.resume();
  };
  
  private handleResidentAteFood = (event: CustomEvent) => {
    const { residentId, residentName } = event.detail;
    
    // Find the resident sprite
    const sprite = this.residentSprites.get(residentId);
    if (!sprite) return;
    
    // Create a food icon (🍽️) above the resident
    const text = this.add.text(sprite.x, sprite.y - 20, '🍽️', {
      fontSize: '20px',
      color: '#ffffff'
    });
    text.setDepth(20);
    text.setOrigin(0.5, 0.5);
    
    // Animate the icon: fade in, float up, fade out
    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 2000,
      ease: 'Power2',
      onComplete: () => {
        text.destroy();
      }
    });
    
    console.log(`🍽️ Visual feedback: ${residentName} ate food`);
  };
  
  /**
   * Get pause manager (for UI access)
   */
  getPauseManager(): PauseManager {
    return this.pauseManager;
  }
  
  /**
   * Get auto-save manager (for UI access)
   */
  getAutoSaveManager(): AutoSaveManager {
    return this.autoSaveManager;
  }
  
  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return { ...this.performanceStats };
  }
  
  /**
   * Enter placement mode
   */
  enterPlacementMode(roomType: RoomType): void {
    this.placementMode = true;
    this.selectedRoomType = roomType;
  }
  
  /**
   * Exit placement mode
   */
  exitPlacementMode(): void {
    this.placementMode = false;
    this.selectedRoomType = null;
    this.placementPreview.clear();
    this.lastPreviewGridX = -1;
    this.lastPreviewGridY = -1;
  }
  
  /**
   * Update placement preview
   */
  private updatePlacementPreview(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedRoomType) return;
    
    const camera = this.cameras.main;
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    
    const gridX = Math.floor(worldX / GRID_CONFIG.TILE_SIZE);
    const gridY = Math.floor(worldY / GRID_CONFIG.TILE_SIZE);
    
    // Only update if grid position changed
    if (gridX === this.lastPreviewGridX && gridY === this.lastPreviewGridY) {
      return;
    }
    
    this.lastPreviewGridX = gridX;
    this.lastPreviewGridY = gridY;
    
    // Clear previous preview
    this.placementPreview.clear();
    
    const roomSpec = ROOM_SPECS[this.selectedRoomType];
    const gameState = this.gameStateManager.getState();
    
    // Check if placement is valid
    const isValid = this.canPlaceRoomAt(gridX, gridY, this.selectedRoomType);
    
    // Draw preview
    const pixelX = gridX * GRID_CONFIG.TILE_SIZE;
    const pixelY = gridY * GRID_CONFIG.TILE_SIZE;
    const pixelWidth = roomSpec.width * GRID_CONFIG.TILE_SIZE;
    const pixelHeight = roomSpec.height * GRID_CONFIG.TILE_SIZE;
    
    // Choose color based on validity
    const color = isValid ? 0x00ff00 : 0xff0000;
    const alpha = 0.3;
    
    // Draw filled rectangle
    this.placementPreview.fillStyle(color, alpha);
    this.placementPreview.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
    
    // Draw border
    this.placementPreview.lineStyle(2, color, 0.8);
    this.placementPreview.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
    
    // Draw grid lines for each tile
    this.placementPreview.lineStyle(1, color, 0.5);
    for (let y = 0; y <= roomSpec.height; y++) {
      this.placementPreview.lineBetween(
        pixelX,
        pixelY + y * GRID_CONFIG.TILE_SIZE,
        pixelX + pixelWidth,
        pixelY + y * GRID_CONFIG.TILE_SIZE
      );
    }
    for (let x = 0; x <= roomSpec.width; x++) {
      this.placementPreview.lineBetween(
        pixelX + x * GRID_CONFIG.TILE_SIZE,
        pixelY,
        pixelX + x * GRID_CONFIG.TILE_SIZE,
        pixelY + pixelHeight
      );
    }
  }
  
  /**
   * Handle placement click
   */
  private handlePlacementClick(pointer: Phaser.Input.Pointer): void {
    if (!this.selectedRoomType) return;
    
    const camera = this.cameras.main;
    const worldX = pointer.x + camera.scrollX;
    const worldY = pointer.y + camera.scrollY;
    
    const gridX = Math.floor(worldX / GRID_CONFIG.TILE_SIZE);
    const gridY = Math.floor(worldY / GRID_CONFIG.TILE_SIZE);
    
    // Check if placement is valid
    if (this.canPlaceRoomAt(gridX, gridY, this.selectedRoomType)) {
      // DEBUG: Log placement event dispatch
      console.log('[MainScene] Dispatching place_room event, current placement mode:', this.placementMode);
      
      // Trigger room placement via custom event
      window.dispatchEvent(new CustomEvent('game:place_room', {
        detail: {
          roomType: this.selectedRoomType,
          gridX,
          gridY
        }
      }));
      
      // DEBUG: Log placement mode after event
      console.log('[MainScene] After dispatch, placement mode:', this.placementMode);
    } else {
      // Show error notification
      window.dispatchEvent(new CustomEvent('game:show_notification', {
        detail: {
          message: 'Cannot place room here',
          type: 'error'
        }
      }));
    }
  }
  
  /**
   * Check if room can be placed at position
   */
  private canPlaceRoomAt(gridX: number, gridY: number, roomType: RoomType): boolean {
    const gameState = this.gameStateManager.getState();
    const grid = gameState.grid;
    const roomSpec = ROOM_SPECS[roomType];
    
    // Check bounds
    if (gridX < 0 || gridY < 0) return false;
    if (gridX + roomSpec.width > grid.width) return false;
    if (gridY + roomSpec.height > grid.height) return false;
    
    // Check if within unlocked area
    const { unlockedArea } = grid;
    if (gridX < unlockedArea.minX || gridX + roomSpec.width > unlockedArea.maxX) return false;
    if (gridY < unlockedArea.minY || gridY + roomSpec.height > unlockedArea.maxY) return false;
    
    // Check if all tiles are available
    for (let y = gridY; y < gridY + roomSpec.height; y++) {
      for (let x = gridX; x < gridX + roomSpec.width; x++) {
        const tile = grid.tiles[y][x];
        
        // Must be empty or hallway
        if (tile.type !== "empty" && tile.type !== "hallway") {
          return false;
        }
        
        // Must not be occupied
        if (tile.occupiedBy !== null) {
          return false;
        }
      }
    }
    
    return true;
  }
}
