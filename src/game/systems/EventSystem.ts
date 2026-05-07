import { GameState, Resident, DisasterEventType, ActiveDisasterEvent, DisasterEventConfig } from '../../types';
import { REPUTATION_CHANGES, DISASTER_EVENTS, DISASTER_CONFIG } from '../../constants';
import { getResidentCap } from './TierSystem';

// ============================================================================
// Event Types & Interfaces
// ============================================================================

export type EventType =
  | "donation_drive"
  | "health_outbreak"
  | "media_coverage"
  | "volunteer_day"
  | "inspection"
  | "community_support"
  | "disaster";

export interface EventEffect {
  type: "money" | "reputation" | "add_residents" | "happiness_modifier" | "maintenance_discount";
  value: number;
  duration?: number; // For temporary effects (in minutes)
}

export interface EventOption {
  label: string;
  effects: EventEffect[];
}

export interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  triggeredAt: number;
  expiresAt: number | null;
  options: EventOption[];
  resolved: boolean;
}

export interface EventHistoryEntry {
  eventType: EventType;
  day: number;
  chosenOption: string;
  timestamp: number;
}

export interface EventTemplate {
  type: EventType;
  title: string;
  descriptions: string[];
  generateOptions: (gameState: GameState) => EventOption[];
}

// ============================================================================
// Event Configuration - FASTER PACED
// ============================================================================

export const EVENT_CONFIG = {
  MIN_INTERVAL: 60 * 1000,           // 1 minute minimum between events (down from 30)
  MAX_INTERVAL: 3 * 60 * 1000,       // 3 minutes maximum between events (down from 60)
  MAX_ACTIVE_EVENTS: 3,              // Maximum simultaneous events
  EVENT_EXPIRY_TIME: 5 * 60 * 1000,  // 5 minutes to respond (down from 10)
  BASE_CHANCE: 0.4                   // 40% chance per check when interval reached
};

// ============================================================================
// Event Templates
// ============================================================================

const DONATION_DRIVE_EVENT: EventTemplate = {
  type: "donation_drive",
  title: "Community Donation Drive",
  descriptions: [
    "A local organization is hosting a donation drive for shelters in the area.",
    "The community wants to support homeless services and has organized a fundraiser.",
    "A charity is collecting donations specifically for your shelter's work."
  ],
  
  generateOptions: (gameState: GameState) => {
    const bonusAmount = Math.floor(gameState.residents.length * 100 + 300);
    
    return [
      {
        label: `Participate in drive (+$${bonusAmount}, +2 reputation)`,
        effects: [
          { type: "money", value: bonusAmount },
          { type: "reputation", value: 2 }
        ]
      },
      {
        label: "Decline (no effect)",
        effects: []
      }
    ];
  }
};

const HEALTH_OUTBREAK_EVENT: EventTemplate = {
  type: "health_outbreak",
  title: "Health Outbreak",
  descriptions: [
    "A flu outbreak is spreading through the shelter. Several residents have fallen ill.",
    "A contagious illness is affecting residents. Medical attention is needed.",
    "Health concerns arise as residents show symptoms of illness."
  ],
  
  generateOptions: (gameState: GameState) => {
    const treatmentCost = Math.max(100, gameState.residents.length * 20);
    
    return [
      {
        label: `Provide treatment (-$${treatmentCost}, +2 reputation)`,
        effects: [
          { type: "money", value: -treatmentCost },
          { type: "reputation", value: 2 }
        ]
      },
      {
        label: "Quarantine only (-10 happiness for 30 min)",
        effects: [
          { type: "happiness_modifier", value: -10, duration: 30 }
        ]
      },
      {
        label: "Ignore (-3 reputation, -15 happiness for 60 min)",
        effects: [
          { type: "reputation", value: -3 },
          { type: "happiness_modifier", value: -15, duration: 60 }
        ]
      }
    ];
  }
};

const MEDIA_COVERAGE_EVENT: EventTemplate = {
  type: "media_coverage",
  title: "Media Coverage",
  descriptions: [
    "A news crew wants to feature your shelter in an upcoming story.",
    "A journalist is writing an article about homeless services in the area.",
    "Local media has expressed interest in covering your shelter's work."
  ],
  
  generateOptions: (gameState: GameState) => {
    const isPositive = gameState.reputation >= 60;
    
    return [
      {
        label: isPositive 
          ? "Allow coverage (+10 reputation, +$500)" 
          : "Allow coverage (-8 reputation)",
        effects: isPositive ? [
          { type: "reputation", value: 10 },
          { type: "money", value: 500 }
        ] : [
          { type: "reputation", value: -8 }
        ]
      },
      {
        label: "Decline (-2 reputation)",
        effects: [
          { type: "reputation", value: -2 }
        ]
      }
    ];
  }
};

const VOLUNTEER_DAY_EVENT: EventTemplate = {
  type: "volunteer_day",
  title: "Volunteer Day",
  descriptions: [
    "A group of volunteers wants to help with maintenance at the shelter.",
    "Community members are offering their time to assist with upkeep.",
    "Local volunteers are available to help with shelter maintenance."
  ],
  
  generateOptions: (gameState: GameState) => {
    return [
      {
        label: "Accept volunteers (Free maintenance for 60 min, +3 reputation)",
        effects: [
          { type: "maintenance_discount", value: 100, duration: 60 },
          { type: "reputation", value: 3 }
        ]
      },
      {
        label: "Decline (no effect)",
        effects: []
      }
    ];
  }
};

const INSPECTION_EVENT: EventTemplate = {
  type: "inspection",
  title: "Government Inspection",
  descriptions: [
    "A government inspector is scheduled to evaluate your shelter's conditions.",
    "Health and safety officials are conducting a routine inspection.",
    "Your shelter is being reviewed for compliance with regulations."
  ],
  
  generateOptions: (gameState: GameState) => {
    const passed = gameState.reputation >= 50;
    
    return [
      {
        label: passed 
          ? "Undergo inspection (+$1000 grant, +5 reputation)" 
          : "Undergo inspection (-5 reputation, -$500 fine)",
        effects: passed ? [
          { type: "money", value: 1000 },
          { type: "reputation", value: 5 }
        ] : [
          { type: "reputation", value: -5 },
          { type: "money", value: -500 }
        ]
      }
    ];
  }
};

const COMMUNITY_SUPPORT_EVENT: EventTemplate = {
  type: "community_support",
  title: "Community Support",
  descriptions: [
    "Local residents have heard about your work and want to help.",
    "A neighborhood group has organized support for your shelter.",
    "Community members are rallying to provide assistance."
  ],
  
  generateOptions: (gameState: GameState) => {
    const residentCount = Math.floor(Math.random() * 3) + 2; // 2-4 residents
    const moneyAmount = Math.floor(Math.random() * 500) + 300; // $300-800
    
    return [
      {
        label: `Accept ${residentCount} new residents (+${residentCount} residents, +3 reputation)`,
        effects: [
          { type: "add_residents", value: residentCount },
          { type: "reputation", value: 3 }
        ]
      },
      {
        label: `Accept monetary donation (+$${moneyAmount}, +2 reputation)`,
        effects: [
          { type: "money", value: moneyAmount },
          { type: "reputation", value: 2 }
        ]
      },
      {
        label: "Decline (no effect)",
        effects: []
      }
    ];
  }
};

// ============================================================================
// Event Templates Array
// ============================================================================

const EVENT_TEMPLATES: EventTemplate[] = [
  DONATION_DRIVE_EVENT,
  HEALTH_OUTBREAK_EVENT,
  MEDIA_COVERAGE_EVENT,
  VOLUNTEER_DAY_EVENT,
  INSPECTION_EVENT,
  COMMUNITY_SUPPORT_EVENT
];

// ============================================================================
// Event System Class
// ============================================================================

export class EventSystem {
  private activeEvents: GameEvent[] = [];
  private eventHistory: EventHistoryEntry[] = [];
  private nextEventTime: number = 0;
  private temporaryEffects: Map<string, { expiresAt: number; effect: EventEffect }> = new Map();
  
  constructor() {
    this.scheduleNextEvent();
  }
  
  /**
   * Schedule the next random event
   */
  private scheduleNextEvent(): void {
    const interval = EVENT_CONFIG.MIN_INTERVAL + 
      Math.random() * (EVENT_CONFIG.MAX_INTERVAL - EVENT_CONFIG.MIN_INTERVAL);
    
    this.nextEventTime = Date.now() + interval;
    console.log(`Next event scheduled in ${Math.floor(interval / 60000)} minutes`);
  }
  
  /**
   * Update event system - check for new events and expired effects
   */
  update(gameState: GameState): void {
    const now = Date.now();
    
    // Check if it's time to trigger a new event
    if (now >= this.nextEventTime && this.activeEvents.length < EVENT_CONFIG.MAX_ACTIVE_EVENTS) {
      this.triggerRandomEvent(gameState);
    }
    
    // Check for expired events
    this.checkExpiredEvents(gameState);
    
    // Check for expired temporary effects
    this.checkExpiredEffects(gameState);
    
    // Check for disaster events (separate from regular events)
    this.checkDisasterEvent(gameState);
    
    // Check for expired disaster
    this.checkExpiredDisaster(gameState);
  }
  
  /**
   * Trigger a random event
   */
  private triggerRandomEvent(gameState: GameState): void {
    // Select weighted event based on game state
    const template = this.selectWeightedEvent(gameState);
    
    // Generate event
    const event = this.generateEvent(template, gameState);
    
    // Add to active events
    this.activeEvents.push(event);
    
    console.log(`Event triggered: ${event.title}`);
    
    // Schedule next event
    this.scheduleNextEvent();
    
    // Emit event for UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:event_triggered', { detail: event }));
    }
  }
  
  /**
   * Select event based on weighted probabilities
   */
  private selectWeightedEvent(gameState: GameState): EventTemplate {
    // Use a partial record since disaster events are handled separately
    const weights: Partial<Record<EventType, number>> = {
      donation_drive: 0.25,
      health_outbreak: 0.15,
      media_coverage: 0.20,
      volunteer_day: 0.15,
      inspection: 0.10,
      community_support: 0.15
    };
    
    // Adjust weights based on game state
    if (gameState.money < 500) {
      weights.donation_drive = 0.35;
      weights.community_support = 0.20;
    }
    
    if (gameState.reputation > 70) {
      weights.inspection = 0.15;
      weights.media_coverage = 0.25;
    }
    
    if (gameState.reputation < 40) {
      weights.health_outbreak = 0.20;
      weights.volunteer_day = 0.20;
    }
    
    // Select based on weights
    const roll = Math.random();
    let cumulative = 0;
    
    for (const template of EVENT_TEMPLATES) {
      cumulative += weights[template.type] || 0;
      if (roll < cumulative) {
        return template;
      }
    }
    
    return DONATION_DRIVE_EVENT; // Fallback
  }
  
  /**
   * Generate an event from a template
   */
  private generateEvent(template: EventTemplate, gameState: GameState): GameEvent {
    const description = template.descriptions[
      Math.floor(Math.random() * template.descriptions.length)
    ];
    
    const options = template.generateOptions(gameState);
    
    return {
      id: this.generateUUID(),
      type: template.type,
      title: template.title,
      description,
      triggeredAt: Date.now(),
      expiresAt: Date.now() + EVENT_CONFIG.EVENT_EXPIRY_TIME,
      options,
      resolved: false
    };
  }
  
  /**
   * Resolve an event with a chosen option
   */
  resolveEvent(
    gameState: GameState,
    eventId: string,
    optionIndex: number,
    onResolve?: (effects: EventEffect[]) => void
  ): { success: boolean; error?: string } {
    const event = this.activeEvents.find(e => e.id === eventId);
    
    if (!event) {
      return { success: false, error: "Event not found" };
    }
    
    if (event.resolved) {
      return { success: false, error: "Event already resolved" };
    }
    
    const option = event.options[optionIndex];
    
    if (!option) {
      return { success: false, error: "Invalid option" };
    }
    
    // Apply effects
    for (const effect of option.effects) {
      this.applyEventEffect(gameState, effect);
    }
    
    // Mark as resolved
    event.resolved = true;
    
    // Add to history
    this.eventHistory.push({
      eventType: event.type,
      day: gameState.currentDay,
      chosenOption: option.label,
      timestamp: Date.now()
    });
    
    // Remove from active events
    this.activeEvents = this.activeEvents.filter(e => e.id !== eventId);
    
    console.log(`Event resolved: ${event.title} - ${option.label}`);
    
    // Callback for UI updates
    if (onResolve) {
      onResolve(option.effects);
    }
    
    return { success: true };
  }
  
  /**
   * Apply an event effect to the game state
   */
  private applyEventEffect(gameState: GameState, effect: EventEffect): void {
    switch (effect.type) {
      case "money":
        gameState.money += effect.value;
        this.showNotification(
          `${effect.value > 0 ? '+' : ''}$${effect.value}`,
          effect.value > 0 ? "success" : "warning"
        );
        break;
      
      case "reputation":
        gameState.reputation = Math.max(0, Math.min(100, gameState.reputation + effect.value));
        this.showNotification(
          `Reputation ${effect.value > 0 ? '+' : ''}${effect.value}`,
          effect.value > 0 ? "success" : "warning"
        );
        break;
      
      case "add_residents":
        this.addResidentsFromEvent(gameState, effect.value);
        break;
      
      case "happiness_modifier":
        if (effect.duration) {
          this.applyTemporaryEffect(effect);
        }
        break;
      
      case "maintenance_discount":
        if (effect.duration) {
          this.applyTemporaryEffect(effect);
        }
        break;
    }
  }
  
  /**
   * Add residents from an event
   */
  private addResidentsFromEvent(gameState: GameState, count: number): void {
    // This will be handled by the UI/main game loop
    // Just emit an event for now
    this.showNotification(
      `${count} new residents arrived`,
      "info"
    );
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:add_residents', { detail: { count } }));
    }
  }
  
  /**
   * Apply a temporary effect
   */
  private applyTemporaryEffect(effect: EventEffect): void {
    if (!effect.duration) return;
    
    const id = this.generateUUID();
    const expiresAt = Date.now() + (effect.duration * 60 * 1000);
    
    this.temporaryEffects.set(id, { expiresAt, effect });
    
    console.log(`Temporary effect applied: ${effect.type} for ${effect.duration} minutes`);
  }
  
  /**
   * Check for expired events
   */
  private checkExpiredEvents(gameState: GameState): void {
    const now = Date.now();
    
    for (let i = this.activeEvents.length - 1; i >= 0; i--) {
      const event = this.activeEvents[i];
      
      if (event.expiresAt && now >= event.expiresAt && !event.resolved) {
        // Event expired without response
        this.handleExpiredEvent(gameState, event);
        this.activeEvents.splice(i, 1);
      }
    }
  }
  
  /**
   * Handle an expired event
   */
  private handleExpiredEvent(gameState: GameState, event: GameEvent): void {
    // Apply default consequence (usually negative)
    gameState.reputation = Math.max(0, gameState.reputation - 2);
    
    this.showNotification(
      `⚠️ Event expired: ${event.title}`,
      "warning"
    );
    
    // Add to history
    this.eventHistory.push({
      eventType: event.type,
      day: gameState.currentDay,
      chosenOption: "Ignored",
      timestamp: Date.now()
    });
  }
  
  /**
   * Check for expired temporary effects
   */
  private checkExpiredEffects(gameState: GameState): void {
    const now = Date.now();
    
    for (const [id, { expiresAt }] of this.temporaryEffects.entries()) {
      if (now >= expiresAt) {
        this.temporaryEffects.delete(id);
        console.log(`Temporary effect expired`);
      }
    }
  }
  
  /**
   * Get active temporary effects
   */
  getActiveEffects(): EventEffect[] {
    return Array.from(this.temporaryEffects.values()).map(({ effect }) => effect);
  }
  
  /**
   * Get happiness modifier from temporary effects
   */
  getHappinessModifier(): number {
    let modifier = 0;
    for (const { effect } of this.temporaryEffects.values()) {
      if (effect.type === "happiness_modifier") {
        modifier += effect.value;
      }
    }
    return modifier;
  }
  
  /**
   * Get maintenance discount from temporary effects
   */
  getMaintenanceDiscount(): number {
    let discount = 0;
    for (const { effect } of this.temporaryEffects.values()) {
      if (effect.type === "maintenance_discount") {
        discount = Math.max(discount, effect.value);
      }
    }
    return discount;
  }
  
  /**
   * Get active events
   */
  getActiveEvents(): GameEvent[] {
    return [...this.activeEvents];
  }
  
  /**
   * Get event history
   */
  getEventHistory(): EventHistoryEntry[] {
    return [...this.eventHistory];
  }
  
  /**
   * Get time until next event
   */
  getTimeUntilNextEvent(): number {
    return Math.max(0, this.nextEventTime - Date.now());
  }
  
  /**
   * Manually trigger a specific event type (for dev mode)
   */
  triggerEventByType(gameState: GameState, eventType: EventType): void {
    const template = EVENT_TEMPLATES.find(t => t.type === eventType);
    
    if (!template) {
      console.error(`Event type ${eventType} not found`);
      return;
    }
    
    if (this.activeEvents.length >= EVENT_CONFIG.MAX_ACTIVE_EVENTS) {
      console.warn('Maximum active events reached');
      return;
    }
    
    // Generate and trigger the event
    const event = this.generateEvent(template, gameState);
    this.activeEvents.push(event);
    
    console.log(`[DevMode] Manually triggered event: ${event.title}`);
    
    // Emit event for UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:event_triggered', { detail: event }));
    }
  }
  
  /**
   * Show notification
   */
  private showNotification(message: string, type: string): void {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:notification', {
        detail: { message, type }
      }));
    }
  }
  
  /**
   * Generate UUID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // ============================================================================
  // Disaster Event System
  // ============================================================================
  
  /**
   * Check if a disaster event should trigger
   */
  checkDisasterEvent(gameState: GameState): void {
    const now = Date.now();
    
    // Check cooldown
    if (gameState.lastDisasterTime &&
        now - gameState.lastDisasterTime < DISASTER_CONFIG.COOLDOWN_DURATION) {
      return;
    }
    
    // Don't trigger if already have an active disaster
    if (gameState.activeDisasterEvent) {
      return;
    }
    
    // Calculate disaster chance
    let chance = DISASTER_CONFIG.BASE_CHANCE;
    
    // Increase chance if reputation is high (you're known for helping)
    if (gameState.reputation > DISASTER_CONFIG.HIGH_REPUTATION_THRESHOLD) {
      chance += DISASTER_CONFIG.HIGH_REPUTATION_BONUS;
    }
    
    // Decrease chance if at capacity
    const tierCap = getResidentCap(gameState);
    if (gameState.residents.length >= tierCap) {
      chance -= DISASTER_CONFIG.AT_CAPACITY_PENALTY;
    }
    
    // Roll for disaster
    if (Math.random() < chance) {
      this.triggerDisasterEvent(gameState);
    }
  }
  
  /**
   * Trigger a random disaster event
   */
  private triggerDisasterEvent(gameState: GameState): void {
    // Select a random disaster type
    const disasterTypes: DisasterEventType[] = [
      'house_fire', 'winter_storm', 'factory_closure',
      'domestic_violence', 'hospital_discharge', 'eviction_wave'
    ];
    
    const selectedType = disasterTypes[Math.floor(Math.random() * disasterTypes.length)];
    const config = DISASTER_EVENTS[selectedType];
    
    // Calculate expiry based on urgency
    const expiryTime = DISASTER_CONFIG.URGENCY_TIMERS[config.urgency];
    
    // Create the active disaster event
    const disasterEvent: ActiveDisasterEvent = {
      id: this.generateUUID(),
      config,
      triggeredAt: Date.now(),
      expiresAt: Date.now() + expiryTime,
      resolved: false
    };
    
    // Store in game state
    gameState.activeDisasterEvent = disasterEvent;
    
    console.log(`🚨 DISASTER TRIGGERED: ${config.title}`);
    
    // Emit event for UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:disaster_triggered', {
        detail: disasterEvent
      }));
    }
  }
  
  /**
   * Resolve a disaster event with accept/decline/partial
   */
  resolveDisasterEvent(
    gameState: GameState,
    decision: 'accept' | 'decline' | 'partial',
    partialCount?: number
  ): { success: boolean; error?: string; residentsAdded?: number } {
    const disaster = gameState.activeDisasterEvent;
    
    if (!disaster) {
      return { success: false, error: "No active disaster event" };
    }
    
    if (disaster.resolved) {
      return { success: false, error: "Disaster already resolved" };
    }
    
    const config = disaster.config;
    let residentsToAdd = 0;
    let reputationChange = 0;
    let moneyChange = 0;
    
    switch (decision) {
      case 'accept':
        residentsToAdd = config.residentSurge;
        reputationChange = config.reputationGainAccept;
        moneyChange = config.donationBonus;
        
        // Apply happiness impact to existing residents
        this.applyHappinessImpactToAll(gameState, config.happinessImpact);
        
        // Handle special costs
        if (config.securityRequired) {
          const securityCost = residentsToAdd * DISASTER_CONFIG.SECURITY_COST_PER_RESIDENT;
          moneyChange -= securityCost;
          this.showNotification(`Security costs: -$${securityCost}`, "warning");
        }
        
        if (config.medicalCosts) {
          const medicalCost = residentsToAdd * config.medicalCosts;
          moneyChange -= medicalCost;
          this.showNotification(`Medical costs: -$${medicalCost}`, "warning");
        }
        
        this.showNotification(
          `✅ Accepted ${residentsToAdd} disaster residents (+${reputationChange} reputation)`,
          "success"
        );
        break;
        
      case 'partial':
        if (!partialCount || partialCount <= 0 || partialCount >= config.residentSurge) {
          return { success: false, error: "Invalid partial count" };
        }
        
        residentsToAdd = partialCount;
        // Proportional reputation gain
        const proportion = partialCount / config.residentSurge;
        reputationChange = Math.floor(config.reputationGainAccept * proportion);
        moneyChange = Math.floor(config.donationBonus * proportion);
        
        // Reduced happiness impact for partial accept
        const partialHappinessImpact = Math.floor(config.happinessImpact * proportion);
        this.applyHappinessImpactToAll(gameState, partialHappinessImpact);
        
        // Handle special costs proportionally
        if (config.securityRequired) {
          const securityCost = residentsToAdd * DISASTER_CONFIG.SECURITY_COST_PER_RESIDENT;
          moneyChange -= securityCost;
        }
        
        if (config.medicalCosts) {
          const medicalCost = residentsToAdd * config.medicalCosts;
          moneyChange -= medicalCost;
        }
        
        this.showNotification(
          `Accepted ${residentsToAdd} of ${config.residentSurge} people (+${reputationChange} reputation)`,
          "info"
        );
        break;
        
      case 'decline':
        reputationChange = -config.reputationLossDecline;
        
        this.showNotification(
          `❌ Declined to help. ${config.residentSurge} people found other help. (${reputationChange} reputation)`,
          "warning"
        );
        break;
    }
    
    // Apply reputation change
    gameState.reputation = Math.max(0, Math.min(100, gameState.reputation + reputationChange));
    
    // Apply money change
    gameState.money += moneyChange;
    if (moneyChange > 0) {
      gameState.totalMoneyEarned += moneyChange;
    }
    
    // Mark disaster as resolved
    disaster.resolved = true;
    disaster.acceptedCount = residentsToAdd;
    
    // Update disaster tracking
    gameState.lastDisasterTime = Date.now();
    gameState.totalDisastersHandled++;
    
    // Track disaster residents for overflow tracking
    if (residentsToAdd > 0) {
      const tierCap = getResidentCap(gameState);
      const currentCount = gameState.residents.length;
      const overflowCount = Math.max(0, (currentCount + residentsToAdd) - tierCap);
      gameState.disasterResidentCount += overflowCount;
    }
    
    // Add to event history
    this.eventHistory.push({
      eventType: 'disaster',
      day: gameState.currentDay,
      chosenOption: `${config.title}: ${decision}${partialCount ? ` (${partialCount})` : ''}`,
      timestamp: Date.now()
    });
    
    // Clear active disaster after a short delay (let UI show result)
    setTimeout(() => {
      if (gameState.activeDisasterEvent?.id === disaster.id) {
        gameState.activeDisasterEvent = null;
      }
    }, 1000);
    
    // Emit event for spawning residents
    if (residentsToAdd > 0 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:spawn_disaster_residents', {
        detail: {
          count: residentsToAdd,
          disasterType: config.type,
          lifeBoost: config.lifeBoost || false
        }
      }));
    }
    
    console.log(`Disaster resolved: ${config.title} - ${decision} (${residentsToAdd} residents)`);
    
    return { success: true, residentsAdded: residentsToAdd };
  }
  
  /**
   * Check for expired disaster events
   */
  checkExpiredDisaster(gameState: GameState): void {
    const disaster = gameState.activeDisasterEvent;
    
    if (!disaster || disaster.resolved) return;
    
    if (Date.now() >= disaster.expiresAt) {
      // Disaster expired - apply decline penalty
      const config = disaster.config;
      
      gameState.reputation = Math.max(0, gameState.reputation - config.reputationLossDecline);
      
      disaster.resolved = true;
      gameState.lastDisasterTime = Date.now();
      
      this.showNotification(
        `⚠️ ${config.title} expired! People found help elsewhere. (-${config.reputationLossDecline} reputation)`,
        "error"
      );
      
      // Add to event history
      this.eventHistory.push({
        eventType: 'disaster',
        day: gameState.currentDay,
        chosenOption: `${config.title}: expired`,
        timestamp: Date.now()
      });
      
      // Clear active disaster
      setTimeout(() => {
        if (gameState.activeDisasterEvent?.id === disaster.id) {
          gameState.activeDisasterEvent = null;
        }
      }, 1000);
    }
  }
  
  /**
   * Apply happiness impact to all existing residents
   */
  private applyHappinessImpactToAll(gameState: GameState, impact: number): void {
    if (impact === 0) return;
    
    for (const resident of gameState.residents) {
      resident.happiness = Math.max(0, Math.min(100, resident.happiness + impact));
    }
    
    if (impact < 0) {
      this.showNotification(
        `Existing residents stressed (${impact} happiness)`,
        "warning"
      );
    }
  }
  
  /**
   * Get the maximum overflow capacity for disasters
   */
  getDisasterOverflowCapacity(gameState: GameState): number {
    const tierCap = getResidentCap(gameState);
    return Math.floor(tierCap * DISASTER_CONFIG.OVERFLOW_MULTIPLIER);
  }
  
  /**
   * Check if shelter is overcrowded due to disaster residents
   */
  isOvercrowded(gameState: GameState): boolean {
    const tierCap = getResidentCap(gameState);
    return gameState.residents.length > tierCap;
  }
  
  /**
   * Get the overcrowding happiness penalty
   */
  getOvercrowdingPenalty(gameState: GameState): number {
    if (!this.isOvercrowded(gameState)) return 0;
    
    const tierCap = getResidentCap(gameState);
    const overCount = gameState.residents.length - tierCap;
    return overCount * DISASTER_CONFIG.OVERCROWDING_HAPPINESS_PENALTY;
  }
  
  /**
   * Manually trigger a specific disaster type (for dev mode)
   */
  triggerDisasterByType(gameState: GameState, disasterType: DisasterEventType): void {
    if (gameState.activeDisasterEvent) {
      console.warn('Cannot trigger disaster: one already active');
      return;
    }
    
    const config = DISASTER_EVENTS[disasterType];
    const expiryTime = DISASTER_CONFIG.URGENCY_TIMERS[config.urgency];
    
    const disasterEvent: ActiveDisasterEvent = {
      id: this.generateUUID(),
      config,
      triggeredAt: Date.now(),
      expiresAt: Date.now() + expiryTime,
      resolved: false
    };
    
    gameState.activeDisasterEvent = disasterEvent;
    
    console.log(`[DevMode] Manually triggered disaster: ${config.title}`);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('game:disaster_triggered', {
        detail: disasterEvent
      }));
    }
  }
  
  /**
   * Get active disaster event
   */
  getActiveDisaster(gameState: GameState): ActiveDisasterEvent | null {
    return gameState.activeDisasterEvent;
  }
  
  /**
   * Get time remaining on active disaster
   */
  getDisasterTimeRemaining(gameState: GameState): number {
    const disaster = gameState.activeDisasterEvent;
    if (!disaster || disaster.resolved) return 0;
    
    return Math.max(0, disaster.expiresAt - Date.now());
  }
}
