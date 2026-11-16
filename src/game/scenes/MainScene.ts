import Phaser from 'phaser';
import { GameStateManager } from '../systems/GameStateManager';
import { GameState, Room, Resident, RoomType, StatusBarVisibilityMode, ResidentState } from '../../types';
import { GRID_CONFIG, COLORS, ROOM_SPECS, STATUS_BAR_CONFIG, STATUS_ICONS, roomKind } from '../../constants';
import { ROOM_LOOKS, residentFrame } from '../../constants/roomLooks';
import { GameClock, ThrottledUpdater, PauseManager, shiftGameStateTimestamps } from '../systems/TimerManager';
import { checkDayNightTransition } from '../systems/DayNightSystem';
import { updateAllResidents, updateResidentMovement, updateAllResidentHealth } from '../systems/ResidentAISystem';
import { AutoSaveManager, loadGame, saveGame } from '../systems/SaveLoadSystem';
import { checkDonation } from '../systems/DonationSystem';
import { checkMaintenance } from '../systems/MaintenanceSystem';
import { updateAllResidentsLife } from '../systems/LIFEMeterSystem';
import { checkFundraiserCompletion } from '../systems/FundraiserSystem';
import { updateSpatialGrid } from '../systems/PathfindingSystem';
import { initializeCollisionDetection, rebuildOccupancyMap } from '../systems/CollisionDetectionSystem';
import { updateFoodGeneration, initializeCafeteriaGeneration, removeCafeteriaGeneration, shiftCafeteriaTimers } from '../systems/FoodSystem';

/**
 * Main game scene with optimized rendering (culling, object pooling, dirty flags)
 */
/**
 * Resident Status UI - Manages LIFE and Health bars above residents
 */
class ResidentStatusUI {
  private lifeBar: Phaser.GameObjects.Graphics;
  private healthBar: Phaser.GameObjects.Graphics;
  private statusIcon: Phaser.GameObjects.Text;
  private container: Phaser.GameObjects.Container;
  private lastLifeValue: number = -1;
  private lastHealthValue: number = -1;
  private lastState: string = '';
  private pulseTime: number = 0;
  
  constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.lifeBar = scene.add.graphics();
    this.healthBar = scene.add.graphics();
    this.statusIcon = scene.add.text(0, -18, '', {
      fontSize: '10px',
      resolution: 2
    });
    this.statusIcon.setOrigin(0.5, 0.5);
    
    this.container.add([this.lifeBar, this.healthBar, this.statusIcon]);
    this.container.setDepth(15); // Above residents (10) but below placement preview (100)
  }
  
  update(resident: Resident, x: number, y: number, forceRedraw: boolean = false): void {
    // Position container above resident
    this.container.setPosition(x, y - STATUS_BAR_CONFIG.OFFSET_ABOVE_RESIDENT);
    
    // Only redraw if values changed
    const needsRedraw = forceRedraw ||
      this.lastLifeValue !== resident.lifeMeter ||
      this.lastHealthValue !== resident.health ||
      this.lastState !== resident.currentState;
    
    if (needsRedraw) {
      this.drawLifeBar(resident.lifeMeter);
      this.drawHealthBar(resident.health, resident.isAtRisk);
      this.updateStatusIcon(resident);
      
      this.lastLifeValue = resident.lifeMeter;
      this.lastHealthValue = resident.health;
      this.lastState = resident.currentState;
    }
    
    // Update pulse animation for critical health
    if (resident.health < STATUS_BAR_CONFIG.HEALTH_LOW_THRESHOLD) {
      this.pulseTime += 16; // Approximate frame time
      const pulseAlpha = 0.7 + Math.sin(this.pulseTime / STATUS_BAR_CONFIG.PULSE_SPEED * Math.PI * 2) * 0.3;
      this.healthBar.setAlpha(pulseAlpha);
    } else {
      this.healthBar.setAlpha(1);
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
  
  private drawHealthBar(value: number, isAtRisk: boolean): void {
    this.healthBar.clear();
    
    const halfWidth = STATUS_BAR_CONFIG.BAR_WIDTH / 2;
    const yOffset = STATUS_BAR_CONFIG.BAR_HEIGHT + STATUS_BAR_CONFIG.GAP_BETWEEN_BARS;
    
    // Background
    this.healthBar.fillStyle(STATUS_BAR_CONFIG.BACKGROUND_COLOR, STATUS_BAR_CONFIG.BACKGROUND_ALPHA);
    this.healthBar.fillRect(-halfWidth, yOffset, STATUS_BAR_CONFIG.BAR_WIDTH, STATUS_BAR_CONFIG.HEALTH_BAR_HEIGHT);
    
    // Determine color based on value
    let color: number;
    if (value >= STATUS_BAR_CONFIG.HEALTH_HIGH_THRESHOLD) {
      color = STATUS_BAR_CONFIG.HEALTH_COLOR_HIGH;
    } else if (value >= STATUS_BAR_CONFIG.HEALTH_MEDIUM_THRESHOLD) {
      color = STATUS_BAR_CONFIG.HEALTH_COLOR_MEDIUM;
    } else if (value >= STATUS_BAR_CONFIG.HEALTH_LOW_THRESHOLD) {
      color = STATUS_BAR_CONFIG.HEALTH_COLOR_LOW;
    } else {
      color = STATUS_BAR_CONFIG.HEALTH_COLOR_CRITICAL;
    }
    
    // Fill bar
    const fillWidth = STATUS_BAR_CONFIG.BAR_WIDTH * (value / 100);
    this.healthBar.fillStyle(color, 1);
    this.healthBar.fillRect(-halfWidth, yOffset, fillWidth, STATUS_BAR_CONFIG.HEALTH_BAR_HEIGHT);
    
    // Border
    this.healthBar.lineStyle(1, 0x000000, 0.3);
    this.healthBar.strokeRect(-halfWidth, yOffset, STATUS_BAR_CONFIG.BAR_WIDTH, STATUS_BAR_CONFIG.HEALTH_BAR_HEIGHT);
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
        // Fall back to health-based icons
        if (resident.isAtRisk) {
          icon = STATUS_ICONS.AT_RISK;
        } else if (resident.health > 80) {
          icon = STATUS_ICONS.HEALTHY;
        } else if (resident.health >= 40) {
          icon = STATUS_ICONS.NEUTRAL;
        } else if (resident.health >= 20) {
          icon = STATUS_ICONS.UNHEALTHY;
        } else {
          icon = STATUS_ICONS.AT_RISK;
        }
    }
    
    this.statusIcon.setText(icon);
  }
  
  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  /** Reposition the bars to sit above the (animated) resident head. */
  follow(x: number, y: number): void {
    this.container.setPosition(x, y - STATUS_BAR_CONFIG.OFFSET_ABOVE_RESIDENT);
  }

  destroy(): void {
    this.lifeBar.destroy();
    this.healthBar.destroy();
    this.statusIcon.destroy();
    this.container.destroy();
  }
}

/**
 * ResidentSprite — a fully animated character token.
 *
 * Instead of a bare circle snapped to the grid, each resident is a small
 * container holding a soft drop-shadow, a body, a rim highlight and their
 * initials. Motion is smoothed on the render side (the logical position only
 * updates the *target*; the token eases toward it, which rounds off the sharp
 * corners of grid pathing) and layered with a walk-cycle bob, squash & stretch,
 * a directional lead, idle breathing, a sleep pose, and spawn / despawn
 * flourishes. This is what turns "dots on a grid" into "little people".
 */
const RESIDENT_SCALE = GRID_CONFIG.TILE_SIZE / 16; // 16px art -> one game tile
const BODY_Y = -2;                                  // lifts the sprite so its feet sit on the ring


class ResidentSprite {
  readonly container: Phaser.GameObjects.Container;
  private shadow: Phaser.GameObjects.Ellipse;
  private body: Phaser.GameObjects.Image;
  private ring: Phaser.GameObjects.Ellipse; // state-coloured ring under the feet
  private readonly radius: number;

  // Position (world pixels)
  private targetX = 0;
  private targetY = 0;
  private renderX = 0;
  private renderY = 0;
  private lastX = 0;
  private lastY = 0;

  // Animation state
  private bobPhase: number;
  private breathePhase: number;
  private moveBlend = 0;       // 0 = idle, 1 = walking (smoothed)
  private facing = 1;          // -1 left, +1 right
  private lead = 0;            // smoothed horizontal lean into travel
  private speed = 0;           // smoothed px/sec
  private sleepBlend = 0;      // 0 = awake, 1 = lying in bed
  private lieDir = 1;         // +1 head to the right, -1 head to the left (toward the pillow)

  // Lifecycle
  private spawnT = 0;          // 0..1 pop-in
  private dying = false;
  private dieT = 0;            // 0..1 despawn

  // Per-frame flag the scene reads to kick up footstep dust
  steppedThisFrame = false;

  private state: ResidentState = 'idle';

  constructor(scene: Phaser.Scene, worldX: number, worldY: number, color: number, frame: number) {
    this.radius = GRID_CONFIG.TILE_SIZE / 3;
    const r = this.radius;

    this.shadow = scene.add.ellipse(0, 12, 20, 8, 0x05070b, 0.32);
    this.ring = scene.add.ellipse(0, 12, 26, 11);
    this.ring.setStrokeStyle(2, color, 0.95);
    this.body = scene.add.image(0, BODY_Y, 'chars', frame);
    this.body.setScale(RESIDENT_SCALE);

    this.container = scene.add.container(worldX, worldY, [this.shadow, this.ring, this.body]);
    this.container.setDepth(10);
    this.container.setScale(0.001); // grows in via spawn pop

    this.targetX = this.renderX = this.lastX = worldX;
    this.targetY = this.renderY = this.lastY = worldY;
    this.bobPhase = Math.random() * Math.PI * 2;
    this.breathePhase = Math.random() * Math.PI * 2;
  }

  setColor(color: number): void {
    this.ring.setStrokeStyle(2, color, 0.95);
  }

  /** Called from render each frame with the resident's authoritative position/state. */
  setTarget(worldX: number, worldY: number, resident: Resident, lieDir = 1): void {
    this.targetX = worldX;
    this.targetY = worldY;
    this.state = resident.currentState;
    this.lieDir = lieDir;
  }

  setVisible(v: boolean): void {
    this.container.setVisible(v);
  }

  beginDespawn(): void {
    this.dying = true;
  }

  get isDying(): boolean {
    return this.dying;
  }

  get headX(): number {
    return this.renderX;
  }

  get headY(): number {
    return this.renderY;
  }

  /**
   * Advance the animation by dt seconds. Returns false once a dying token has
   * finished its exit and should be destroyed.
   */
  animate(dt: number): boolean {
    const r = this.radius;

    // --- Lifecycle scale (spawn pop / despawn shrink) ---
    if (this.spawnT < 1) {
      this.spawnT = Math.min(1, this.spawnT + dt / 0.42);
    }
    if (this.dying) {
      this.dieT = Math.min(1, this.dieT + dt / 0.5);
      if (this.dieT >= 1) return false;
    }

    // --- Smooth position toward target (corner-rounding ease) ---
    const k = 1 - Math.exp(-dt * 16); // frame-rate independent lerp factor
    this.renderX += (this.targetX - this.renderX) * k;
    this.renderY += (this.targetY - this.renderY) * k;

    // Instantaneous velocity from the eased position
    const vx = (this.renderX - this.lastX) / Math.max(dt, 0.0001);
    const vy = (this.renderY - this.lastY) / Math.max(dt, 0.0001);
    this.lastX = this.renderX;
    this.lastY = this.renderY;

    const instSpeed = Math.hypot(vx, vy);
    this.speed += (instSpeed - this.speed) * Math.min(1, dt * 12);

    const walking = this.state === 'pathfinding' || this.state === 'leaving' || this.speed > 6;
    const wantMove = walking && this.speed > 3 ? 1 : 0;
    this.moveBlend += (wantMove - this.moveBlend) * Math.min(1, dt * 9);

    const sleeping = this.state === 'sleeping' ? 1 : 0;
    this.sleepBlend += (sleeping - this.sleepBlend) * Math.min(1, dt * 6);

    if (Math.abs(vx) > 4) this.facing = vx < 0 ? -1 : 1;
    const leadTarget = Phaser.Math.Clamp(vx * 0.02, -1.4, 1.4) * this.moveBlend;
    this.lead += (leadTarget - this.lead) * Math.min(1, dt * 10);

    // --- Phases ---
    const prevStep = Math.floor(this.bobPhase / Math.PI);
    this.bobPhase += dt * (9 + Math.min(this.speed, 90) * 0.03);
    const newStep = Math.floor(this.bobPhase / Math.PI);
    this.steppedThisFrame = this.moveBlend > 0.55 && newStep !== prevStep && !this.dying;
    this.breathePhase += dt * 2.3;

    // --- Compose transforms ---
    const walkHop = -Math.abs(Math.sin(this.bobPhase)) * 3.4 * this.moveBlend;
    const breathe = Math.sin(this.breathePhase) * 0.025 * (1 - this.moveBlend) * (1 - this.sleepBlend);

    // Walk squash/stretch (foot strike squashes, apex stretches)
    let sx = 1 - Math.sin(this.bobPhase * 2) * 0.06 * this.moveBlend + breathe;
    let sy = 1 + Math.sin(this.bobPhase * 2) * 0.06 * this.moveBlend - breathe;

    // Sleep pose: lie down (rotated toward the pillow) and slow-breathe
    const sleepBob = this.sleepBlend * r * 0.4;
    const sleepBreath = Math.sin(this.breathePhase * 0.5) * 0.03 * this.sleepBlend;
    sx = sx * (1 - this.sleepBlend) + (1 + sleepBreath) * this.sleepBlend;
    sy = sy * (1 - this.sleepBlend) + (1 - sleepBreath) * this.sleepBlend;

    const bodyY = walkHop + sleepBob;

    this.body.setScale((this.sleepBlend > 0.5 ? 1 : this.facing) * sx * RESIDENT_SCALE, sy * RESIDENT_SCALE);
    this.body.setRotation(this.lieDir * (Math.PI / 2) * this.sleepBlend);
    this.body.y = bodyY + BODY_Y;
    this.body.x = this.lead;

    // Shadow shrinks & fades as the body lifts off the ground
    const lift = -walkHop / 3.4; // 0..1
    const shadowScale = 1 - lift * 0.28 + this.sleepBlend * 0.15;
    this.shadow.setScale(shadowScale, shadowScale);
    this.shadow.setAlpha((0.32 - lift * 0.12) * (1 - this.sleepBlend * 0.7));
    this.ring.setAlpha(1 - this.sleepBlend * 0.65);

    // Lifecycle scale + alpha
    const spawnScale = ResidentSprite.backOut(this.spawnT);
    const dieScale = this.dying ? 1 - this.dieT : 1;
    const dieLift = this.dying ? this.dieT * 26 : 0;
    this.container.setScale(spawnScale * dieScale);
    this.container.setPosition(this.renderX, this.renderY - dieLift);
    this.container.setAlpha((this.dying ? 1 - this.dieT : 1) * (1 - this.sleepBlend * 0.15));

    return true;
  }

  destroy(): void {
    this.container.destroy(); // destroys children too
  }

  // Back-out easing for a lively, slightly overshooting spawn
  private static backOut(t: number): number {
    const s = 1.70158;
    const p = t - 1;
    return p * p * ((s + 1) * p + s) + 1;
  }
}

export class MainScene extends Phaser.Scene {
  private gameStateManager!: GameStateManager;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private floorGraphics!: Phaser.GameObjects.Graphics;   // checker floors drawn in code
  private wallGraphics!: Phaser.GameObjects.Graphics;
  private roomGraphics!: Phaser.GameObjects.Graphics;     // closed-room dimming, outlines, occupancy bars
  private roomFxGraphics!: Phaser.GameObjects.Graphics;  // animated room effects (fundraiser glow, occupancy pulse)
  private residentViews: Map<string, ResidentSprite> = new Map();
  private roomObjects: Map<string, Phaser.GameObjects.Image[]> = new Map(); // floor + furniture sprites per room id
  private knownRoomIds: Set<string> = new Set();          // to detect freshly-placed rooms
  private roomsSeeded: boolean = false;                    // suppress placement FX on first render

  // Resident Status UI
  private residentStatusUIs: Map<string, ResidentStatusUI> = new Map();
  private hoveredResidentId: string | null = null;

  // Game systems
  private gameClock!: GameClock;
  private lastFundraiserTick = 0; // wall-clock ms of the previous frame, for the night freeze
  private throttledUpdater!: ThrottledUpdater;
  private pauseManager!: PauseManager;
  private autoSaveManager!: AutoSaveManager;

  // Visual effects — lighting is interpolated for smooth day/night transitions
  private ambientLight: number = 1.0;
  private colorTint: number = 0xFFFFFF;
  private nightBlend: number = 0;        // 0 = full day, 1 = full night (smoothed)
  private nightTarget: number = 0;
  private nightOverlay!: Phaser.GameObjects.Rectangle;
  private vignette!: Phaser.GameObjects.Image;
  private entranceGlow: Phaser.GameObjects.Image | null = null;

  // Particle emitters (juice)
  private sparkEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dustEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private heartEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private moteEmitter!: Phaser.GameObjects.Particles.ParticleEmitter;
  private animClock: number = 0;         // seconds accumulator for cyclic effects

  // Optimization: Dirty flags
  private gridDirty: boolean = true;
  private roomsDirty: boolean = true;
  private lastRoomCount: number = 0;
  private lastPhase: "day" | "night" = "day";

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
    // Kenney CC0 sheets: 16px tiles with a 1px gap
    this.load.spritesheet('indoor', 'assets/kenney/indoor.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
    this.load.spritesheet('chars', 'assets/kenney/chars.png', { frameWidth: 16, frameHeight: 16, spacing: 1 });
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
    this.gridGraphics.setDepth(0);
    // Layers: ground 0, floors 1, walls 2, furniture 3, room overlays 4, night wash 6, residents 10
    this.textures.get('indoor').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('chars').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.floorGraphics = this.add.graphics();
    this.floorGraphics.setDepth(1);
    this.wallGraphics = this.add.graphics();
    this.wallGraphics.setDepth(2);
    this.roomGraphics = this.add.graphics();
    this.roomGraphics.setDepth(4);
    this.roomFxGraphics = this.add.graphics();
    this.roomFxGraphics.setDepth(9); // animated room glows, just under residents (10)
    this.placementPreview = this.add.graphics();
    this.placementPreview.setDepth(100); // Render on top

    // Build reusable textures, lighting overlays and particle systems
    this.createVisualFx();

    // Initialize spatial grid for pathfinding
    const initialState = this.gameStateManager.getState();
    updateSpatialGrid(initialState.rooms);
    
    // Initialize collision detection system
    initializeCollisionDetection(initialState.residents);
    
    // Initialize food generation for existing cafeterias
    const cafeterias = initialState.rooms.filter(room => roomKind(room.type) === 'cafeteria');
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
    
    this.pauseManager.onResume((pausedMs) => {
      shiftGameStateTimestamps(this.gameStateManager.getMutableState(), pausedMs);
      shiftCafeteriaTimers(pausedMs);
      this.gameClock.resume();
      console.log("Game resumed");
    });
    
    // Set up auto-pause on window blur
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);
    
    // Set up eating event listener for visual feedback
    window.addEventListener('resident_ate_food', this.handleResidentAteFood as EventListener);
    // Celebrate graduations with a burst of light
    window.addEventListener('resident_graduated', this.handleResidentGraduated as EventListener);

    // Start periodic auto-save
    this.autoSaveManager.startPeriodicSave(this.gameStateManager.getMutableState());
    
    // Set up camera BEFORE rendering
    this.setupCamera();
    
    // Initial render
    this.renderGame(initialState);

    // Place ambient effects that depend on the grid layout
    this.createEntranceGlow(initialState.grid);
    this.positionAmbientMotes();

    // Start game clock
    this.gameClock.start((deltaTime) => this.updateGameSystems(deltaTime));

    // Apply initial day/night visuals (snap to phase, no transition on load)
    this.applyPhaseVisuals(initialState.currentPhase, true);
  }
  
  /**
   * Build reusable soft textures, the day/night lighting overlays and the
   * particle emitters that carry most of the "juice".
   */
  private createVisualFx(): void {
    // --- Soft radial dot (used for sparks, motes, glows) ---
    this.makeSoftCircleTexture('soft-dot', 64);
    // --- Heart glyph for care/eating feedback ---
    this.makeHeartTexture('heart', 48);

    const camW = this.scale.width;
    const camH = this.scale.height;
    const worldW = GRID_CONFIG.TOTAL_WIDTH * GRID_CONFIG.TILE_SIZE;
    const worldH = GRID_CONFIG.TOTAL_HEIGHT * GRID_CONFIG.TILE_SIZE;

    // --- Night wash: a cool rectangle over the world that fades in at night ---
    this.nightOverlay = this.add.rectangle(worldW / 2, worldH / 2, worldW + 400, worldH + 400, 0x0a1533, 0);
    this.nightOverlay.setDepth(6); // above ground & rooms, below residents (10)

    // --- Vignette: screen-fixed radial darkening for cinematic framing ---
    this.makeVignetteTexture('vignette', camW, camH);
    this.vignette = this.add.image(camW / 2, camH / 2, 'vignette');
    this.vignette.setScrollFactor(0);
    this.vignette.setDepth(70);
    this.vignette.setAlpha(0.55);

    // --- Ambient dust motes drifting across the shelter ---
    this.moteEmitter = this.add.particles(0, 0, 'soft-dot', {
      x: { min: 0, max: worldW },
      y: { min: 0, max: worldH },
      scale: { min: 0.05, max: 0.16 },
      // Fade each mote in and out over its lifetime for a gentle shimmer
      alpha: (_p: any, _k: string, t: number) => Math.sin(t * Math.PI) * 0.4,
      lifespan: 9000,
      frequency: 420,
      quantity: 1,
      speedX: { min: -6, max: 6 },
      speedY: { min: -10, max: -2 },
      blendMode: 'ADD',
      tint: 0x9fd4ff,
    });
    this.moteEmitter.setDepth(8);

    // --- Spark burst (spawns, graduations, fundraiser wins) ---
    this.sparkEmitter = this.add.particles(0, 0, 'soft-dot', {
      lifespan: 780,
      speed: { min: 40, max: 150 },
      scale: { start: 0.28, end: 0 },
      alpha: { start: 0.9, end: 0 },
      rotate: { min: 0, max: 360 },
      gravityY: 60,
      blendMode: 'NORMAL', // additive light blows out on the bright grass
      emitting: false,
    });
    this.sparkEmitter.setDepth(30);

    // --- Footstep dust (kicked up while walking) ---
    this.dustEmitter = this.add.particles(0, 0, 'soft-dot', {
      lifespan: 460,
      speed: { min: 4, max: 20 },
      scale: { start: 0.22, end: 0 },
      alpha: { start: 0.5, end: 0 },
      tint: 0x9a8f7d,
      emitting: false,
    });
    this.dustEmitter.setDepth(9);

    // --- Hearts (eating / care) ---
    this.heartEmitter = this.add.particles(0, 0, 'heart', {
      lifespan: 1300,
      speedY: { min: -46, max: -26 },
      speedX: { min: -14, max: 14 },
      scale: { start: 0.6, end: 0.1 },
      alpha: { start: 1, end: 0 },
      rotate: { min: -12, max: 12 },
      tint: [0xff8fb0, 0xffd166, 0x8ce0a0],
      emitting: false,
    });
    this.heartEmitter.setDepth(31);
  }

  /** Generate a soft-edged radial dot texture. */
  private makeSoftCircleTexture(key: string, size: number): void {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    const r = size / 2;
    const grad = ctx.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }

  /** Generate a small heart glyph texture. */
  private makeHeartTexture(key: string, size: number): void {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, size, size);
    if (!tex) return;
    const ctx = tex.getContext();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const s = size;
    ctx.moveTo(s * 0.5, s * 0.86);
    ctx.bezierCurveTo(s * 0.05, s * 0.55, s * 0.18, s * 0.12, s * 0.5, s * 0.34);
    ctx.bezierCurveTo(s * 0.82, s * 0.12, s * 0.95, s * 0.55, s * 0.5, s * 0.86);
    ctx.closePath();
    ctx.fill();
    tex.refresh();
  }

  /** Generate a screen-sized vignette (transparent center, dark edges). */
  private makeVignetteTexture(key: string, w: number, h: number): void {
    if (this.textures.exists(key)) return;
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) return;
    const ctx = tex.getContext();
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.32, cx, cy, Math.max(w, h) * 0.72);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(4,6,12,0.28)');
    grad.addColorStop(1, 'rgba(2,3,8,0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    tex.refresh();
  }

  /** Position the drifting motes over the currently-unlocked shelter area. */
  private positionAmbientMotes(): void {
    if (!this.moteEmitter) return;
    const ua = this.gameStateManager.getState().grid.unlockedArea;
    const t = GRID_CONFIG.TILE_SIZE;
    this.moteEmitter.setPosition(0, 0);
    // Constrain emission zone to the unlocked area for a lived-in feel
    this.moteEmitter.setEmitZone({
      type: 'random',
      source: new Phaser.Geom.Rectangle(ua.minX * t, ua.minY * t, (ua.maxX - ua.minX) * t, (ua.maxY - ua.minY) * t),
    } as any);
  }

  /** Create a gentle pulsing glow on the entrance tile. */
  private createEntranceGlow(grid: any): void {
    this.entranceGlow?.destroy();
    this.entranceGlow = null;
    let ex = -1;
    let ey = -1;
    for (let y = 0; y < grid.height && ex < 0; y++) {
      for (let x = 0; x < grid.width; x++) {
        if (grid.tiles[y][x].type === 'entrance') {
          ex = x;
          ey = y;
          break;
        }
      }
    }
    if (ex < 0) return;
    const t = GRID_CONFIG.TILE_SIZE;
    this.entranceGlow = this.add.image(ex * t + t / 2, ey * t + t / 2, 'soft-dot');
    this.entranceGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.entranceGlow.setTint(0xffe08a);
    this.entranceGlow.setDepth(2);
    this.entranceGlow.setScale(t / 22);
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

    // Center the view on the player's unlocked shelter area so they see their
    // residents/rooms immediately instead of an empty corner of the map.
    const state = this.gameStateManager.getState();
    const ua = state.grid.unlockedArea;
    const centerX = ((ua.minX + ua.maxX) / 2) * GRID_CONFIG.TILE_SIZE;
    const centerY = ((ua.minY + ua.maxY) / 2) * GRID_CONFIG.TILE_SIZE;
    camera.centerOn(centerX, centerY);
    
    // Simple drag controls
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragScrollX = 0;
    let dragScrollY = 0;
    let dragMoved = false;
    
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if in placement mode
      if (this.placementMode && this.selectedRoomType) {
        this.handlePlacementClick(pointer);
        return;
      }
      
      isDragging = true;
      dragMoved = false;
      dragStartX = pointer.x;
      dragStartY = pointer.y;
      dragScrollX = camera.scrollX;
      dragScrollY = camera.scrollY;
    });
    
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Update placement preview
      if (this.placementMode && this.selectedRoomType) {
        this.updatePlacementPreview(pointer);
      } else if (isDragging) {
        if (Math.abs(pointer.x - dragStartX) + Math.abs(pointer.y - dragStartY) > 4) dragMoved = true;
        camera.scrollX = dragScrollX - (pointer.x - dragStartX) / camera.zoom;
        camera.scrollY = dragScrollY - (pointer.y - dragStartY) / camera.zoom;
      }
    });
    
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      // A click without dragging selects the resident under the cursor (or clears)
      if (isDragging && !dragMoved) this.selectResidentAt(pointer);
      isDragging = false;
    });

    // Mouse wheel zoom
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.zoomBy(dy > 0 ? 0.9 : 1.1);
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
    
    // Throttled: Health decay (every 10 seconds)
    if (this.throttledUpdater.shouldUpdate("health_decay", 10)) {
      updateAllResidentHealth(gameState, 10);
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
    
    // Fundraisers don't progress at night: push deadlines forward by the real time elapsed
    const nowMs = Date.now();
    if (gameState.currentPhase === 'night' && this.lastFundraiserTick > 0) {
      const ms = Math.min(nowMs - this.lastFundraiserTick, 1000);
      for (const f of gameState.activeFundraisers) { f.startedAt += ms; f.completesAt += ms; }
    }
    this.lastFundraiserTick = nowMs;

    // Check fundraiser completion
    checkFundraiserCompletion(gameState);
    
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
    // Guard against being called before create() finishes wiring the camera, or
    // on a scene instance that is being torn down (Phaser restarts this scene
    // once at boot to inject game state).
    if (!this.gameStateManager || !this.cameras || !this.cameras.main) {
      return;
    }

    // Day/night is now a smooth lighting transition (see update()), so the grid
    // itself only needs redrawing when its structure actually changes.
    if (this.gridDirty) {
      this.renderGrid(state.grid);
      this.createEntranceGlow(state.grid); // the gate moves when a tier upgrade grows the grid
      this.gridDirty = false;
    }

    // Rooms still redraw on a phase flip because closed rooms dim their alpha.
    if (this.roomsDirty || state.rooms.length !== this.lastRoomCount || state.currentPhase !== this.lastPhase) {
      this.renderRooms(state.rooms);
      this.roomsDirty = false;
      this.lastRoomCount = state.rooms.length;

      // Update spatial grid when rooms change
      updateSpatialGrid(state.rooms);
    }

    // Kick off a smooth dawn / dusk when the phase changes
    if (state.currentPhase !== this.lastPhase) {
      this.applyPhaseVisuals(state.currentPhase);
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
   * Re-sync scene and module-level systems after GameStateManager.loadState().
   */
  onStateLoaded(): void {
    const state = this.gameStateManager.getMutableState();
    // Saved timers are absolute Date.now() values; shift them so they don't all fire at once
    const elapsed = Math.max(0, Date.now() - state.lastSaved);
    shiftGameStateTimestamps(state, elapsed);

    updateSpatialGrid(state.rooms);
    initializeCollisionDetection(state.residents);
    state.rooms
      .filter(room => roomKind(room.type) === 'cafeteria')
      .forEach(cafeteria => initializeCafeteriaGeneration(cafeteria.id));

    this.markGridDirty();
    this.markRoomsDirty();
    this.renderGame(state);
  }
  
  /**
   * Render the grid
   */
  private renderGrid(grid: any) {
    this.gridGraphics.clear();

    const tileSize = GRID_CONFIG.TILE_SIZE;
    const ua = grid.unlockedArea;

    // Draw tiles
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        const pixelX = x * tileSize;
        const pixelY = y * tileSize;

        const isUnlocked = ua && x >= ua.minX && x < ua.maxX && y >= ua.minY && y < ua.maxY;

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

          // Subtle checkerboard shading on buildable land for readable depth
          if (isUnlocked && tile.type === "empty" && (x + y) % 2 === 0) {
            this.gridGraphics.fillStyle(0xffffff, 0.05);
            this.gridGraphics.fillRect(pixelX, pixelY, tileSize, tileSize);
          }
        }

        // Draw grid lines — brighter inside the buildable area, faint outside
        this.gridGraphics.lineStyle(1, COLORS.GRID_LINE, isUnlocked ? 0.45 : 0.12);
        this.gridGraphics.strokeRect(pixelX, pixelY, tileSize, tileSize);
      }
    }

    // Frame the buildable area with an accent border so the play space reads clearly
    if (ua) {
      const bx = ua.minX * tileSize;
      const by = ua.minY * tileSize;
      const bw = (ua.maxX - ua.minX) * tileSize;
      const bh = (ua.maxY - ua.minY) * tileSize;
      this.gridGraphics.lineStyle(3, 0xf2e6c4, 0.5);
      this.gridGraphics.strokeRect(bx - 1, by - 1, bw + 2, bh + 2);
      this.gridGraphics.lineStyle(1, 0xf2e6c4, 0.2);
      this.gridGraphics.strokeRect(bx - 4, by - 4, bw + 8, bh + 8);
    }
  }
  
  /**
   * Render all rooms
   */
  private renderRooms(rooms: Room[]) {
    this.roomGraphics.clear();
    this.floorGraphics.clear();
    this.wallGraphics.clear();
    
    const tileSize = GRID_CONFIG.TILE_SIZE;
    const gameState = this.gameStateManager.getState();
    
    // Drop sprites for rooms that no longer exist
    const activeRoomIds = new Set(rooms.map(r => r.id));
    for (const [roomId, objs] of this.roomObjects.entries()) {
      if (!activeRoomIds.has(roomId)) {
        objs.forEach(o => o.destroy());
        this.roomObjects.delete(roomId);
      }
    }

    for (const room of rooms) {
      const pixelX = room.gridX * tileSize;
      const pixelY = room.gridY * tileSize;
      const pixelWidth = room.width * tileSize;
      const pixelHeight = room.height * tileSize;
      const look = ROOM_LOOKS[room.type];

      // Sprite floors and furniture are built once per room; the rest is redrawn every time
      if (!this.roomObjects.has(room.id)) {
        this.roomObjects.set(room.id, this.buildRoomSprites(room));
        this.applyRoomTint();
      }

      // Tile floor (the sheet has no tile frame, so draw checks in code)
      if (look.checker) {
        const half = tileSize / 2;
        this.floorGraphics.fillStyle(this.applyAmbientLight(look.checker[0]), 1);
        this.floorGraphics.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
        this.floorGraphics.fillStyle(this.applyAmbientLight(look.checker[1]), 1);
        for (let cy = 0; cy < room.height * 2; cy++) {
          for (let cx = 0; cx < room.width * 2; cx++) {
            if ((cx + cy) % 2 === 1) this.floorGraphics.fillRect(pixelX + cx * half, pixelY + cy * half, half, half);
          }
        }
      }

      // Walls: a thick back wall along the top, thin trim on the other sides.
      // Residents can cross any edge, so there are no doors to line up with.
      const wallFace = this.applyAmbientLight(0xd9cdb0);
      const wallLip = this.applyAmbientLight(0xb3a487);
      const wallEdge = this.applyAmbientLight(0x3b2f24);
      const top = 10;
      const trim = 4;
      this.wallGraphics.fillStyle(wallFace, 1);
      this.wallGraphics.fillRect(pixelX, pixelY, pixelWidth, top);
      this.wallGraphics.fillRect(pixelX, pixelY, trim, pixelHeight);
      this.wallGraphics.fillRect(pixelX + pixelWidth - trim, pixelY, trim, pixelHeight);
      this.wallGraphics.fillRect(pixelX, pixelY + pixelHeight - trim, pixelWidth, trim);
      this.wallGraphics.fillStyle(wallLip, 1);
      this.wallGraphics.fillRect(pixelX, pixelY + top - 3, pixelWidth, 3);
      this.wallGraphics.fillStyle(0x000000, 0.16); // soft shadow the wall casts on the floor
      this.wallGraphics.fillRect(pixelX + trim, pixelY + top, pixelWidth - trim * 2, 4);
      this.wallGraphics.lineStyle(2, wallEdge, 1);
      this.wallGraphics.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);

      // Closed rooms are dimmed; active fundraisers get a steady gold outline
      // (their animated glow comes from roomFxGraphics in update()).
      if (!room.isOpen) {
        this.roomGraphics.fillStyle(0x0a0f1a, 0.4);
        this.roomGraphics.fillRect(pixelX, pixelY, pixelWidth, pixelHeight);
      }
      if (gameState.activeFundraisers?.some(f => f.stationId === room.id)) {
        this.roomGraphics.lineStyle(3, 0xffd700, 0.75);
        this.roomGraphics.strokeRect(pixelX, pixelY, pixelWidth, pixelHeight);
      }
    }

    // Detect freshly-placed rooms and give them a satisfying "stamp".
    if (this.roomsSeeded) {
      for (const room of rooms) {
        if (!this.knownRoomIds.has(room.id)) {
          this.playRoomPlacement(room);
        }
      }
    }
    this.knownRoomIds = new Set(rooms.map(r => r.id));
    this.roomsSeeded = true;
  }

  /** Create the sprite floor and furniture for one room (see ROOM_LOOKS). */
  private buildRoomSprites(room: Room): Phaser.GameObjects.Image[] {
    const t = GRID_CONFIG.TILE_SIZE;
    const look = ROOM_LOOKS[room.type];
    const objs: Phaser.GameObjects.Image[] = [];
    const place = (frame: number, x: number, y: number, depth: number, base: number, flip = false) => {
      const img = this.add.image((room.gridX + x) * t, (room.gridY + y) * t, 'indoor', frame);
      img.setOrigin(0, 0).setScale(t / 16).setDepth(depth).setFlipX(flip).setData('base', base);
      objs.push(img);
    };
    if (!look.checker) {
      for (let y = 0; y < room.height; y++) {
        for (let x = 0; x < room.width; x++) place(look.floor, x, y, 1, look.tint ?? 0xffffff);
      }
    }
    for (const p of look.props) {
      if (p.x < room.width && p.y < room.height) place(p.f, p.x, p.y, 3, 0xffffff, p.flip);
    }
    return objs;
  }

  /** Multiply each sprite's own base tint by the current day/night tint. */
  private applyRoomTint(): void {
    for (const objs of this.roomObjects.values()) {
      for (const o of objs) o.setTint(MainScene.mulColor(o.getData('base') ?? 0xffffff, this.colorTint));
    }
  }

  /** Multiply two 0xRRGGBB colours channel by channel. */
  private static mulColor(a: number, b: number): number {
    const ch = (shift: number) => ((((a >> shift) & 255) * ((b >> shift) & 255)) / 255) | 0;
    return (ch(16) << 16) | (ch(8) << 8) | ch(0);
  }

  /** A satisfying sparkle + light flash when a room is placed. */
  private playRoomPlacement(room: Room): void {
    const t = GRID_CONFIG.TILE_SIZE;
    const cx = (room.gridX + room.width / 2) * t;
    const cy = (room.gridY + room.height / 2) * t;

    if (this.sparkEmitter) {
      this.sparkEmitter.setParticleTint(0xffe08a);
      this.sparkEmitter.emitParticleAt(cx, cy, 16);
    }

    const flash = this.add.image(cx, cy, 'soft-dot');
    flash.setBlendMode(Phaser.BlendModes.ADD);
    flash.setTint(0xffe08a);
    flash.setDepth(8);
    flash.setAlpha(0.45);
    flash.setScale((Math.max(room.width, room.height) * t) / 40);
    this.tweens.add({
      targets: flash,
      scale: flash.scale * 2.2,
      alpha: 0,
      duration: 420,
      ease: 'Cubic.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  /** Resolve a resident's body colour from their profile. */
  private residentColor(resident: Resident): number {
    if (resident.profile === 'adult') return COLORS.RESIDENT_ADULT;
    if (resident.profile === 'elderly') return COLORS.RESIDENT_ELDERLY;
    return COLORS.RESIDENT_YOUNG;
  }

  /**
   * Reconcile resident sprites with game state: spawn newcomers (with an
   * arrival sparkle), retire the departed (with a graceful fade), refresh
   * status bars, and hand off per-frame motion to update(). Culling keeps
   * offscreen tokens cheap.
   */
  private renderResidents(residents: Resident[]) {
    const tileSize = GRID_CONFIG.TILE_SIZE;
    const camera = this.cameras.main;
    const gameState = this.gameStateManager.getState();
    const statusBarSettings = gameState.statusBarSettings;

    const padding = tileSize * 3;
    const wv = camera.worldView;
    const vb = {
      left: wv.x - padding,
      right: wv.right + padding,
      top: wv.y - padding,
      bottom: wv.bottom + padding,
    };

    const currentIds = new Set(residents.map(r => r.id));

    // Residents that left the game → play a graceful exit (kept alive by
    // update() until the animation finishes, then destroyed there).
    for (const [id, view] of this.residentViews.entries()) {
      if (!currentIds.has(id) && !view.isDying) {
        view.beginDespawn();
      }
    }
    // Status bars only belong to living residents
    for (const [id, statusUI] of this.residentStatusUIs.entries()) {
      if (!currentIds.has(id)) {
        statusUI.destroy();
        this.residentStatusUIs.delete(id);
      }
    }

    let visibleCount = 0;

    for (const resident of residents) {
      const pixelX = resident.gridX * tileSize + tileSize / 2;
      const pixelY = resident.gridY * tileSize + tileSize / 2;
      const isVisible =
        pixelX >= vb.left && pixelX <= vb.right && pixelY >= vb.top && pixelY <= vb.bottom;

      let view = this.residentViews.get(resident.id);
      if (!view) {
        view = new ResidentSprite(this, pixelX, pixelY, this.residentColor(resident), residentFrame(resident.id, resident.gender));
        this.residentViews.set(resident.id, view);
        if (isVisible) {
          // Arrival flourish
          this.sparkEmitter.setParticleTint(0xfff1c2);
          this.sparkEmitter.emitParticleAt(pixelX, pixelY, 9);
        }
      }

      // Sleepers lie head-toward-pillow: the left bed tile of a pair has its pillow on the right, and vice versa.
      let lieDir = 1;
      if (resident.currentState === 'sleeping') {
        const bedRoom = gameState.rooms.find(r => r.id === resident.targetRoomId);
        if (bedRoom && Math.floor(resident.gridX) > bedRoom.gridX) lieDir = -1;
      }
      view.setTarget(pixelX, pixelY, resident, lieDir);
      view.setVisible(isVisible);
      if (isVisible) visibleCount++;

      // Status bars: content refresh here, precise positioning in update()
      let statusUI = this.residentStatusUIs.get(resident.id);
      if (!statusUI && statusBarSettings.enabled) {
        statusUI = new ResidentStatusUI(this);
        this.residentStatusUIs.set(resident.id, statusUI);
      }
      if (statusUI) {
        const show = isVisible && this.shouldShowStatusBar(resident, statusBarSettings);
        statusUI.setVisible(show);
        if (show) statusUI.update(resident, view.headX, view.headY);
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
        return resident.isAtRisk || resident.health < STATUS_BAR_CONFIG.HEALTH_LOW_THRESHOLD;
      default:
        return true;
    }
  }
  
  /** Multiply camera zoom, clamped to a sane range */
  private zoomBy(factor: number): void {
    const camera = this.cameras.main;
    // Min 1: the world (1280x960) is bigger than the canvas, so below 1 it would show empty space
    camera.setZoom(Phaser.Math.Clamp(camera.zoom * factor, 1, 2));
    this.vignette?.setScale(1 / camera.zoom); // vignette is screen-fixed; undo camera zoom on it
  }

  public zoomIn(): void { this.zoomBy(1.2); }
  public zoomOut(): void { this.zoomBy(1 / 1.2); }

  /** Resident id under the pointer (world-space hit test), or null */
  private residentIdAt(pointer: Phaser.Input.Pointer): string | null {
    const tileSize = GRID_CONFIG.TILE_SIZE;
    const { x, y } = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const hit = this.gameStateManager.getState().residents.find(r =>
      Math.hypot(x - (r.gridX * tileSize + tileSize / 2), y - (r.gridY * tileSize + tileSize / 2)) <= tileSize / 2
    );
    return hit ? hit.id : null;
  }

  private selectResidentAt(pointer: Phaser.Input.Pointer): void {
    const id = this.residentIdAt(pointer);
    let roomId: string | null = null;
    if (!id) { // no resident under the cursor: select the room on that tile, if any
      const t = GRID_CONFIG.TILE_SIZE;
      const { x, y } = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      roomId = this.gameStateManager.getState().grid.tiles[Math.floor(y / t)]?.[Math.floor(x / t)]?.occupiedBy ?? null;
    }
    window.dispatchEvent(new CustomEvent('game:resident_selected', { detail: { id, roomId } }));
  }

  /**
   * Update hovered resident for hover visibility mode
   */
  private updateHoveredResident(pointer: Phaser.Input.Pointer): void {
    const gameState = this.gameStateManager.getState();
    const foundResident = this.residentIdAt(pointer);
    
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
   * Set the day/night lighting target. The actual transition is eased every
   * frame in update() (see updateLighting) for a smooth dawn / dusk. Pass
   * snap=true to jump straight to the phase (used on initial load).
   */
  private applyPhaseVisuals(phase: "day" | "night", snap: boolean = false): void {
    this.nightTarget = phase === "night" ? 1 : 0;
    if (snap) {
      this.nightBlend = this.nightTarget;
    }
  }

  /**
   * Apply ambient light to a color (kept for grid/room fallback rendering).
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

  /**
   * Phaser render loop — drives all purely-visual animation at the display
   * refresh rate, independent of the fixed-step game clock. This is what makes
   * the whole thing feel alive: eased lighting, breathing/walking characters,
   * footstep dust and animated room effects.
   */
  update(_time: number, delta: number) {
    // Only animate once the scene is fully initialised and rendering
    if (!this.gameStateManager || !this.cameras || !this.cameras.main) {
      return;
    }
    const dt = Math.min(delta, 60) / 1000; // clamp big frame gaps (tab refocus)
    this.animClock += dt;
    this.updateLighting(dt);
    this.animateResidents(dt);
    this.updateRoomFx();
  }

  /** Ease day/night lighting and apply it to the overlay, vignette and rooms. */
  private updateLighting(dt: number): void {
    if (this.nightBlend !== this.nightTarget) {
      this.nightBlend += (this.nightTarget - this.nightBlend) * Math.min(1, dt * 1.7);
      if (Math.abs(this.nightTarget - this.nightBlend) < 0.002) this.nightBlend = this.nightTarget;
    }

    const b = this.nightBlend;
    if (this.nightOverlay) this.nightOverlay.setAlpha(0.46 * b);
    if (this.vignette) this.vignette.setAlpha(0.5 + 0.24 * b);

    // Cool the room tint toward moonlight as night falls
    this.colorTint = MainScene.lerpColor(0xffffff, 0x8f9bd6, b);
    this.applyRoomTint();

    // Entrance beacon breathes; warmer/brighter at night
    if (this.entranceGlow) {
      const breath = Math.sin(this.animClock * 2.1);
      this.entranceGlow.setAlpha(Phaser.Math.Clamp(0.14 + breath * 0.05 + b * 0.3, 0, 1));
      const base = GRID_CONFIG.TILE_SIZE / 22;
      this.entranceGlow.setScale(base * (1 + breath * 0.07 + b * 0.16));
    }
  }

  /** Animate every resident token and keep its status bar glued to its head. */
  private animateResidents(dt: number): void {
    const cam = this.cameras.main;
    for (const [id, view] of this.residentViews.entries()) {
      const alive = view.animate(dt);
      if (!alive) {
        view.destroy();
        this.residentViews.delete(id);
        const ui = this.residentStatusUIs.get(id);
        if (ui) {
          ui.destroy();
          this.residentStatusUIs.delete(id);
        }
        continue;
      }

      // Footstep dust while walking (only when on-screen)
      if (view.steppedThisFrame && this.dustEmitter && cam.worldView.contains(view.headX, view.headY)) {
        this.dustEmitter.emitParticleAt(
          view.headX + (Math.random() * 6 - 3),
          view.headY + GRID_CONFIG.TILE_SIZE / 3,
          1
        );
      }

      const ui = this.residentStatusUIs.get(id);
      if (ui) ui.follow(view.headX, view.headY);
    }
  }

  /** Draw animated glows around rooms hosting active fundraisers. */
  private updateRoomFx(): void {
    if (!this.roomFxGraphics) return;
    this.roomFxGraphics.clear();

    const gameState = this.gameStateManager.getState();
    const active = gameState.activeFundraisers;
    if (!active || active.length === 0) return;

    const t = GRID_CONFIG.TILE_SIZE;
    const g = this.roomFxGraphics;

    for (const f of active) {
      const room = gameState.rooms.find(r => r.id === f.stationId);
      if (!room) continue;

      const cx = (room.gridX + room.width / 2) * t;
      const cy = (room.gridY + room.height / 2) * t;
      const baseR = Math.max(room.width, room.height) * t * 0.55;

      // Two outward-rippling rings
      const span = 46;
      for (let i = 0; i < 2; i++) {
        const prog = ((this.animClock * 34 + i * (span / 2)) % span) / span;
        const rr = baseR + prog * span;
        const a = (1 - prog) * 0.35;
        g.lineStyle(3, 0xffd54a, a);
        g.strokeCircle(cx, cy, rr);
      }

      // Breathing outline hugging the station
      const pulse = 0.45 + Math.sin(this.animClock * 3) * 0.3;
      g.lineStyle(3, 0xffe08a, pulse);
      g.strokeRoundedRect(room.gridX * t + 2, room.gridY * t + 2, room.width * t - 4, room.height * t - 4, 6);
    }
  }

  /** Linearly interpolate between two 0xRRGGBB colours. */
  private static lerpColor(a: number, b: number, t: number): number {
    const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
    const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl = Math.round(ab + (bb - ab) * t);
    return (r << 16) | (g << 8) | bl;
  }

  /**
   * Clean up on scene shutdown
   */
  shutdown() {
    this.gameClock.stop();
    this.autoSaveManager.stopPeriodicSave();

    // Force final save
    this.autoSaveManager.forceSave(this.gameStateManager.getMutableState());

    // Clean up resident tokens
    for (const view of this.residentViews.values()) {
      view.destroy();
    }
    this.residentViews.clear();

    // Clean up status UIs
    for (const statusUI of this.residentStatusUIs.values()) {
      statusUI.destroy();
    }
    this.residentStatusUIs.clear();

    // Clean up room sprites
    for (const objs of this.roomObjects.values()) objs.forEach(o => o.destroy());
    this.roomObjects.clear();

    // Remove event listeners
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('focus', this.handleFocus);
    window.removeEventListener('resident_ate_food', this.handleResidentAteFood as EventListener);
    window.removeEventListener('resident_graduated', this.handleResidentGraduated as EventListener);
  }
  
  // Only auto-resume on focus if blur did the pausing; a manual pause must stick.
  private pausedByBlur = false;

  private handleBlur = () => {
    if (!this.pauseManager.isPaused()) {
      this.pausedByBlur = true;
      this.pauseManager.pause();
    }
    this.autoSaveManager.forceSave(this.gameStateManager.getMutableState());
  };
  
  private handleFocus = () => {
    if (this.pausedByBlur) {
      this.pausedByBlur = false;
      this.pauseManager.resume();
    }
  };
  
  private handleResidentAteFood = (event: CustomEvent) => {
    const { residentId } = event.detail;
    const view = this.residentViews.get(residentId);
    if (!view) return;

    // A little rising heart at the resident's head
    if (this.heartEmitter) {
      this.heartEmitter.emitParticleAt(view.headX, view.headY - GRID_CONFIG.TILE_SIZE / 3, 1);
    }
  };

  private handleResidentGraduated = (event: CustomEvent) => {
    const { residentId } = event.detail;
    const view = this.residentViews.get(residentId);
    // The resident is about to be removed from state; celebrate at their spot
    // (fall back to screen centre if the token is already gone).
    const x = view ? view.headX : this.cameras.main.midPoint.x;
    const y = view ? view.headY : this.cameras.main.midPoint.y;

    if (this.sparkEmitter) {
      this.sparkEmitter.setParticleTint(0xffd166);
      this.sparkEmitter.emitParticleAt(x, y, 26);
    }
    if (this.heartEmitter) {
      this.heartEmitter.emitParticleAt(x, y, 6);
    }

    // Expanding golden ring
    const ring = this.add.image(x, y, 'soft-dot');
    ring.setBlendMode(Phaser.BlendModes.ADD);
    ring.setTint(0xffe08a);
    ring.setDepth(32);
    ring.setScale(0.3);
    this.tweens.add({
      targets: ring,
      scale: 3.4,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
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
    
    const { x: worldX, y: worldY } = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
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
    
    const { x: worldX, y: worldY } = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    
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
