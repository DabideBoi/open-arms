import {
  GameState,
  Warning,
  WarningType,
  WarningSeverity,
  WarningCooldown,
  Resident
} from '../../types';
import { BANKRUPTCY_CONFIG, REPUTATION_CONFIG, SHELTER_TIERS, getActiveTimerConfig } from '../../constants';
import { getResidentCap, isApproachingCapacity, isAtResidentCap } from './TierSystem';

// ============================================================================
// Warning System Configuration
// ============================================================================

export const WARNING_CONFIG = {
  // Check interval
  CHECK_INTERVAL: 5000, // Check every 5 seconds
  
  // Cooldown durations (ms)
  COOLDOWN_DEFAULT: 2 * 60 * 1000,      // 2 minutes - same warning can only appear once per 2 min
  COOLDOWN_DISMISSED: 5 * 60 * 1000,    // 5 minutes - after dismissing, don't show for 5 min
  COOLDOWN_CRITICAL: 30 * 1000,         // 30 seconds - critical warnings can reappear sooner
  
  // Escalation (ms)
  ESCALATION_TIME: 3 * 60 * 1000,       // 3 minutes - escalate severity if ignored
  
  // Financial thresholds
  LOW_FUNDS_THRESHOLD: 500,
  IN_DEBT_THRESHOLD: 0,
  NEAR_BANKRUPTCY_THRESHOLD: -300,
  MAINTENANCE_WARNING_MINUTES: 2,       // Warn 2 minutes before maintenance
  
  // Resident thresholds
  UNHAPPY_THRESHOLD: 30,
  UNHAPPY_DURATION_WARNING: 60 * 1000,  // 1 minute below happiness threshold
  LOW_FOOD_PER_RESIDENT: 2,             // Warn if food < residents * 2
  
  // Operational thresholds
  LOW_REPUTATION_THRESHOLD: 40,
  
  // Progression thresholds
  STALLED_PROGRESS_MINUTES: 5,          // 5 minutes with no graduations
  LIFE_METER_STALLED_THRESHOLD: 5,      // If LIFE meter hasn't moved by 5 points in 2 min
} as const;

// ============================================================================
// Warning System Class
// ============================================================================

export class WarningSystem {
  private lastCheck: number = 0;
  private previousLifeMeters: Map<string, { value: number; timestamp: number }> = new Map();
  private previousReputation: number = 50;
  private reputationDrops: number[] = []; // Timestamps of reputation drops
  
  /**
   * Generate a unique warning ID
   */
  private generateId(type: WarningType, suffix?: string): string {
    return `warning_${type}${suffix ? '_' + suffix : ''}_${Date.now()}`;
  }
  
  /**
   * Check if a warning type is on cooldown
   */
  private isOnCooldown(state: GameState, type: WarningType, residentId?: string): boolean {
    const now = Date.now();
    const cooldowns = state.warningCooldowns || [];
    
    // Check if there's an active cooldown for this warning type
    const cooldown = cooldowns.find(c => {
      if (c.type !== type) return false;
      // For resident-specific warnings, we'd need to track by resident ID
      return c.cooldownUntil > now;
    });
    
    return !!cooldown;
  }
  
  /**
   * Check if a warning is already active
   */
  private hasActiveWarning(state: GameState, type: WarningType, residentId?: string): boolean {
    return state.activeWarnings.some(w => {
      if (w.type !== type) return false;
      if (residentId && w.id.includes(residentId)) return true;
      if (!residentId) return true;
      return false;
    });
  }
  
  /**
   * Create a new warning
   */
  private createWarning(
    type: WarningType,
    severity: WarningSeverity,
    message: string,
    options: {
      detail?: string;
      actionLabel?: string;
      actionCallback?: () => void;
      dismissable?: boolean;
      suffix?: string;
    } = {}
  ): Warning {
    const now = Date.now();
    return {
      id: this.generateId(type, options.suffix),
      type,
      severity,
      message,
      detail: options.detail,
      actionLabel: options.actionLabel,
      actionCallback: options.actionCallback,
      timestamp: now,
      dismissable: options.dismissable ?? true,
      originalSeverity: severity,
      activeSince: now
    };
  }
  
  // ============================================================================
  // Financial Warning Checks
  // ============================================================================
  
  checkFinancialWarnings(state: GameState): Warning[] {
    const warnings: Warning[] = [];
    const money = state.money;
    
    // Near Bankruptcy (most severe)
    if (money < WARNING_CONFIG.NEAR_BANKRUPTCY_THRESHOLD) {
      if (!this.hasActiveWarning(state, 'near_bankruptcy') && !this.isOnCooldown(state, 'near_bankruptcy')) {
        warnings.push(this.createWarning(
          'near_bankruptcy',
          'critical',
          'Near Bankruptcy!',
          {
            detail: `Funds at $${money}. Bankruptcy imminent!`,
            actionLabel: 'View Finances',
            dismissable: false
          }
        ));
      }
    }
    // In Debt
    else if (money < WARNING_CONFIG.IN_DEBT_THRESHOLD) {
      if (!this.hasActiveWarning(state, 'in_debt') && !this.isOnCooldown(state, 'in_debt')) {
        warnings.push(this.createWarning(
          'in_debt',
          'warning',
          'Shelter in Debt',
          {
            detail: `Balance: $${money}. Income needed urgently!`,
            actionLabel: 'View Finances'
          }
        ));
      }
    }
    // Low Funds
    else if (money < WARNING_CONFIG.LOW_FUNDS_THRESHOLD) {
      if (!this.hasActiveWarning(state, 'low_funds') && !this.isOnCooldown(state, 'low_funds')) {
        warnings.push(this.createWarning(
          'low_funds',
          'info',
          'Low Funds',
          {
            detail: `Only $${money} remaining. Consider fundraising.`,
            actionLabel: 'View Finances'
          }
        ));
      }
    }
    
    // Maintenance Due Warning
    const now = Date.now();
    const timeToMaintenance = state.nextMaintenanceCheck - now;
    const twoMinutes = WARNING_CONFIG.MAINTENANCE_WARNING_MINUTES * 60 * 1000;
    
    if (timeToMaintenance > 0 && timeToMaintenance < twoMinutes) {
      // Calculate expected maintenance cost
      const totalMaintenanceCost = state.rooms.reduce((sum, room) => {
        // Get maintenance cost from room specs (simplified)
        return sum + (room.maintenanceCost || 25);
      }, 0);
      
      if (totalMaintenanceCost > 0 && money < totalMaintenanceCost) {
        if (!this.hasActiveWarning(state, 'maintenance_due') && !this.isOnCooldown(state, 'maintenance_due')) {
          const minutes = Math.ceil(timeToMaintenance / 60000);
          warnings.push(this.createWarning(
            'maintenance_due',
            money < totalMaintenanceCost / 2 ? 'critical' : 'warning',
            'Maintenance Due Soon',
            {
              detail: `$${totalMaintenanceCost} due in ~${minutes} min. Current balance: $${money}`,
              actionLabel: 'View Rooms'
            }
          ));
        }
      }
    }
    
    // Operating Costs Warning (near day transition)
    const timeToTransition = state.nextDayNightTransition - now;
    if (state.currentPhase === 'day' && timeToTransition > 0 && timeToTransition < 60000) {
      // Approaching night - check if player can handle the next day
      const dailyCost = this.estimateDailyOperatingCost(state);
      if (money < dailyCost) {
        if (!this.hasActiveWarning(state, 'operating_costs_due') && !this.isOnCooldown(state, 'operating_costs_due')) {
          warnings.push(this.createWarning(
            'operating_costs_due',
            'info',
            'Day Ending Soon',
            {
              detail: `Estimated daily costs: $${dailyCost}. Current: $${money}`,
              actionLabel: 'View Finances'
            }
          ));
        }
      }
    }
    
    return warnings;
  }
  
  /**
   * Estimate daily operating cost
   */
  private estimateDailyOperatingCost(state: GameState): number {
    // Food costs
    const foodCostPerResident = 10; // Approximate
    const foodCost = state.residents.length * foodCostPerResident;
    
    // Maintenance (if due today)
    const maintenanceCost = state.rooms.reduce((sum, room) => sum + (room.maintenanceCost || 25), 0);
    
    return foodCost + maintenanceCost;
  }
  
  // ============================================================================
  // Resident Warning Checks
  // ============================================================================
  
  checkResidentWarnings(state: GameState): Warning[] {
    const warnings: Warning[] = [];
    const now = Date.now();
    
    // Check for unhappy residents
    state.residents.forEach(resident => {
      // Unhappy Resident (happiness < 30 for > 1 minute)
      if (resident.happiness < WARNING_CONFIG.UNHAPPY_THRESHOLD) {
        if (resident.unhappyDuration > WARNING_CONFIG.UNHAPPY_DURATION_WARNING) {
          if (!this.hasActiveWarning(state, 'unhappy_resident') && !this.isOnCooldown(state, 'unhappy_resident')) {
            warnings.push(this.createWarning(
              'unhappy_resident',
              'warning',
              `${resident.name} is Unhappy`,
              {
                detail: `Happiness at ${resident.happiness}%. Address their needs!`,
                actionLabel: 'View Residents',
                suffix: resident.id
              }
            ));
          }
        }
      }
      
      // At-Risk Resident (about to leave)
      if (resident.isAtRisk) {
        if (!this.hasActiveWarning(state, 'at_risk_resident') && !this.isOnCooldown(state, 'at_risk_resident')) {
          warnings.push(this.createWarning(
            'at_risk_resident',
            'critical',
            `${resident.name} May Leave!`,
            {
              detail: `This resident is at risk of departing. Improve their happiness immediately!`,
              actionLabel: 'View Residents',
              suffix: resident.id,
              dismissable: false
            }
          ));
        }
      }
    });
    
    // Overcrowded Warning
    const cap = getResidentCap(state);
    if (state.residents.length > cap) {
      if (!this.hasActiveWarning(state, 'overcrowded') && !this.isOnCooldown(state, 'overcrowded')) {
        warnings.push(this.createWarning(
          'overcrowded',
          'warning',
          'Shelter Overcrowded',
          {
            detail: `${state.residents.length}/${cap} residents. Consider upgrading tier.`,
            actionLabel: 'Upgrade Tier'
          }
        ));
      }
    }
    
    // Hungry Residents (low food with many residents)
    const foodNeeded = state.residents.length * WARNING_CONFIG.LOW_FOOD_PER_RESIDENT;
    if (state.food < foodNeeded && state.residents.length > 0) {
      if (!this.hasActiveWarning(state, 'hungry_residents') && !this.isOnCooldown(state, 'hungry_residents')) {
        warnings.push(this.createWarning(
          'hungry_residents',
          state.food === 0 ? 'critical' : 'warning',
          'Food Running Low',
          {
            detail: `Food: ${state.food}. Need ~${foodNeeded} for ${state.residents.length} residents.`,
            actionLabel: 'Build Cafeteria'
          }
        ));
      }
    }
    
    return warnings;
  }
  
  // ============================================================================
  // Operational Warning Checks
  // ============================================================================
  
  checkOperationalWarnings(state: GameState): Warning[] {
    const warnings: Warning[] = [];
    
    // Low Reputation
    if (state.reputation < WARNING_CONFIG.LOW_REPUTATION_THRESHOLD) {
      if (!this.hasActiveWarning(state, 'low_reputation') && !this.isOnCooldown(state, 'low_reputation')) {
        warnings.push(this.createWarning(
          'low_reputation',
          state.reputation < 20 ? 'critical' : 'warning',
          'Low Reputation',
          {
            detail: `Reputation at ${state.reputation}%. Focus on resident happiness and graduations.`,
            actionLabel: 'View Dashboard'
          }
        ));
      }
    }
    
    // Reputation Dropping (track recent drops)
    const now = Date.now();
    if (state.reputation < this.previousReputation) {
      this.reputationDrops.push(now);
    }
    // Keep only drops from last 2 minutes
    this.reputationDrops = this.reputationDrops.filter(t => now - t < 2 * 60 * 1000);
    
    if (this.reputationDrops.length >= 3) { // 3+ drops in 2 minutes
      if (!this.hasActiveWarning(state, 'reputation_dropping') && !this.isOnCooldown(state, 'reputation_dropping')) {
        warnings.push(this.createWarning(
          'reputation_dropping',
          'warning',
          'Reputation Dropping',
          {
            detail: `Reputation is declining rapidly! Check for unhappy residents.`,
            actionLabel: 'View Residents'
          }
        ));
      }
    }
    this.previousReputation = state.reputation;
    
    // Maintenance Overdue (rooms needing maintenance)
    const roomsNeedingMaintenance = state.rooms.filter(room => {
      const timeSinceMaintenance = now - (room.lastMaintenancePaid || 0);
      const TIMER_CONFIG = getActiveTimerConfig();
      return timeSinceMaintenance > TIMER_CONFIG.MAINTENANCE_CHECK_INTERVAL * 1.5;
    });
    
    if (roomsNeedingMaintenance.length > 0) {
      if (!this.hasActiveWarning(state, 'maintenance_overdue') && !this.isOnCooldown(state, 'maintenance_overdue')) {
        warnings.push(this.createWarning(
          'maintenance_overdue',
          'warning',
          'Maintenance Overdue',
          {
            detail: `${roomsNeedingMaintenance.length} room(s) need maintenance.`,
            actionLabel: 'View Rooms'
          }
        ));
      }
    }
    
    // Capacity Warning (approaching limit)
    if (isApproachingCapacity(state) && !isAtResidentCap(state)) {
      if (!this.hasActiveWarning(state, 'capacity_warning') && !this.isOnCooldown(state, 'capacity_warning')) {
        const cap = getResidentCap(state);
        warnings.push(this.createWarning(
          'capacity_warning',
          'info',
          'Approaching Capacity',
          {
            detail: `${state.residents.length}/${cap} residents. Consider upgrading.`,
            actionLabel: 'Upgrade Tier'
          }
        ));
      }
    }
    
    return warnings;
  }
  
  // ============================================================================
  // Progression Warning Checks
  // ============================================================================
  
  checkProgressionWarnings(state: GameState): Warning[] {
    const warnings: Warning[] = [];
    const now = Date.now();
    
    // Ready to Upgrade
    if (state.currentTier < 4) {
      const nextTier = SHELTER_TIERS[(state.currentTier + 1) as 1 | 2 | 3 | 4];
      const currentGraduations = state.tierUnlockProgress.graduationsTowardNext;
      const requiredGraduations = nextTier.graduationsRequired;
      
      if (
        currentGraduations >= requiredGraduations &&
        state.reputation >= nextTier.reputationRequired &&
        state.money >= nextTier.upgradeCost
      ) {
        if (!this.hasActiveWarning(state, 'ready_to_upgrade') && !this.isOnCooldown(state, 'ready_to_upgrade')) {
          warnings.push(this.createWarning(
            'ready_to_upgrade',
            'info',
            'Ready to Upgrade!',
            {
              detail: `All requirements met for Tier ${state.currentTier + 1}!`,
              actionLabel: 'Upgrade Now'
            }
          ));
        }
      }
    }
    
    // Stalled Progress (no graduations in 5+ minutes)
    const stalledMinutes = WARNING_CONFIG.STALLED_PROGRESS_MINUTES;
    const lastGradTime = state.lastGraduationTime || (now - stalledMinutes * 60 * 1000 - 1);
    
    if (now - lastGradTime > stalledMinutes * 60 * 1000) {
      // Only warn if there are residents who could graduate
      const potentialGraduates = state.residents.filter(r => r.lifeMeter >= 80);
      if (state.residents.length > 0 && potentialGraduates.length === 0) {
        if (!this.hasActiveWarning(state, 'stalled_progress') && !this.isOnCooldown(state, 'stalled_progress')) {
          warnings.push(this.createWarning(
            'stalled_progress',
            'info',
            'Progress Stalled',
            {
              detail: `No graduations recently. Focus on resident LIFE meters.`,
              actionLabel: 'View Residents'
            }
          ));
        }
      }
    }
    
    // LIFE Meters Stalled
    let stalledResidents = 0;
    state.residents.forEach(resident => {
      const previous = this.previousLifeMeters.get(resident.id);
      if (previous) {
        const timeDiff = now - previous.timestamp;
        const valueDiff = Math.abs(resident.lifeMeter - previous.value);
        
        // If 2+ minutes have passed and LIFE hasn't changed by at least 5
        if (timeDiff > 2 * 60 * 1000 && valueDiff < WARNING_CONFIG.LIFE_METER_STALLED_THRESHOLD) {
          stalledResidents++;
        }
      }
      
      // Update tracking
      this.previousLifeMeters.set(resident.id, {
        value: resident.lifeMeter,
        timestamp: now
      });
    });
    
    // Clean up residents who are no longer in the game
    const residentIds = new Set(state.residents.map(r => r.id));
    this.previousLifeMeters.forEach((_, id) => {
      if (!residentIds.has(id)) {
        this.previousLifeMeters.delete(id);
      }
    });
    
    if (stalledResidents >= 2) {
      if (!this.hasActiveWarning(state, 'life_meters_stalled') && !this.isOnCooldown(state, 'life_meters_stalled')) {
        warnings.push(this.createWarning(
          'life_meters_stalled',
          'warning',
          'LIFE Meters Stalled',
          {
            detail: `${stalledResidents} residents not progressing. Check room availability.`,
            actionLabel: 'View Residents'
          }
        ));
      }
    }
    
    return warnings;
  }
  
  // ============================================================================
  // Main Update Function
  // ============================================================================
  
  /**
   * Main update function - checks all warning conditions
   */
  updateWarnings(state: GameState): void {
    const now = Date.now();
    
    // Only check every CHECK_INTERVAL
    if (now - this.lastCheck < WARNING_CONFIG.CHECK_INTERVAL) {
      return;
    }
    this.lastCheck = now;
    
    // Collect all new warnings
    const newWarnings: Warning[] = [
      ...this.checkFinancialWarnings(state),
      ...this.checkResidentWarnings(state),
      ...this.checkOperationalWarnings(state),
      ...this.checkProgressionWarnings(state)
    ];
    
    // Add new warnings to state (avoiding duplicates by type)
    newWarnings.forEach(warning => {
      const exists = state.activeWarnings.some(w => w.type === warning.type);
      if (!exists) {
        state.activeWarnings.push(warning);
        
        // Dispatch event for toast notification on critical warnings
        if (warning.severity === 'critical') {
          window.dispatchEvent(new CustomEvent('game:warning_critical', {
            detail: { warning }
          }));
        }
      }
    });
    
    // Auto-resolve warnings when conditions clear
    state.activeWarnings = state.activeWarnings.filter(warning => {
      const shouldKeep = this.shouldKeepWarning(state, warning);
      return shouldKeep;
    });
    
    // Escalate severity for long-standing warnings
    state.activeWarnings.forEach(warning => {
      const age = now - warning.activeSince;
      if (age > WARNING_CONFIG.ESCALATION_TIME && warning.severity !== 'critical') {
        if (!warning.escalatedAt) {
          warning.severity = warning.severity === 'info' ? 'warning' : 'critical';
          warning.escalatedAt = now;
          
          // Dispatch escalation event
          window.dispatchEvent(new CustomEvent('game:warning_escalated', {
            detail: { warning }
          }));
        }
      }
    });
    
    // Clean up expired cooldowns
    state.warningCooldowns = state.warningCooldowns.filter(c => c.cooldownUntil > now);
    
    // Update last check timestamp
    state.lastWarningCheck = now;
  }
  
  /**
   * Check if a warning should still be active
   */
  private shouldKeepWarning(state: GameState, warning: Warning): boolean {
    switch (warning.type) {
      case 'low_funds':
        return state.money < WARNING_CONFIG.LOW_FUNDS_THRESHOLD && state.money >= WARNING_CONFIG.IN_DEBT_THRESHOLD;
      case 'in_debt':
        return state.money < WARNING_CONFIG.IN_DEBT_THRESHOLD && state.money >= WARNING_CONFIG.NEAR_BANKRUPTCY_THRESHOLD;
      case 'near_bankruptcy':
        return state.money < WARNING_CONFIG.NEAR_BANKRUPTCY_THRESHOLD;
      case 'maintenance_due':
        return state.nextMaintenanceCheck - Date.now() < WARNING_CONFIG.MAINTENANCE_WARNING_MINUTES * 60 * 1000;
      case 'operating_costs_due':
        return state.currentPhase === 'day' && state.nextDayNightTransition - Date.now() < 60000;
      case 'unhappy_resident':
      case 'at_risk_resident':
        // Check if the specific resident is still in this state
        const residentId = warning.id.split('_').slice(-2)[0];
        const resident = state.residents.find(r => warning.id.includes(r.id));
        if (!resident) return false;
        if (warning.type === 'unhappy_resident') {
          return resident.happiness < WARNING_CONFIG.UNHAPPY_THRESHOLD;
        }
        return resident.isAtRisk;
      case 'overcrowded':
        return state.residents.length > getResidentCap(state);
      case 'hungry_residents':
        return state.food < state.residents.length * WARNING_CONFIG.LOW_FOOD_PER_RESIDENT;
      case 'low_reputation':
        return state.reputation < WARNING_CONFIG.LOW_REPUTATION_THRESHOLD;
      case 'reputation_dropping':
        return this.reputationDrops.length >= 3;
      case 'maintenance_overdue':
        return state.rooms.some(room => {
          const timeSinceMaintenance = Date.now() - (room.lastMaintenancePaid || 0);
          const TIMER_CONFIG = getActiveTimerConfig();
          return timeSinceMaintenance > TIMER_CONFIG.MAINTENANCE_CHECK_INTERVAL * 1.5;
        });
      case 'capacity_warning':
        return isApproachingCapacity(state) && !isAtResidentCap(state);
      case 'ready_to_upgrade':
        if (state.currentTier >= 4) return false;
        const nextTier = SHELTER_TIERS[(state.currentTier + 1) as 1 | 2 | 3 | 4];
        return (
          state.tierUnlockProgress.graduationsTowardNext >= nextTier.graduationsRequired &&
          state.reputation >= nextTier.reputationRequired &&
          state.money >= nextTier.upgradeCost
        );
      case 'stalled_progress':
        const timeSinceGrad = Date.now() - (state.lastGraduationTime || 0);
        return timeSinceGrad > WARNING_CONFIG.STALLED_PROGRESS_MINUTES * 60 * 1000;
      case 'life_meters_stalled':
        // Will be re-evaluated on next check
        return true;
      default:
        return true;
    }
  }
  
  /**
   * Dismiss a warning (add to cooldown)
   */
  dismissWarning(state: GameState, warningId: string): void {
    const warning = state.activeWarnings.find(w => w.id === warningId);
    if (!warning || !warning.dismissable) return;
    
    // Remove from active warnings
    state.activeWarnings = state.activeWarnings.filter(w => w.id !== warningId);
    
    // Add to cooldowns
    const now = Date.now();
    const cooldownDuration = warning.severity === 'critical'
      ? WARNING_CONFIG.COOLDOWN_CRITICAL
      : WARNING_CONFIG.COOLDOWN_DISMISSED;
    
    state.warningCooldowns.push({
      type: warning.type,
      dismissedAt: now,
      cooldownUntil: now + cooldownDuration
    });
  }
  
  /**
   * Get warning count by severity
   */
  getWarningCounts(state: GameState): { info: number; warning: number; critical: number; total: number } {
    const counts = { info: 0, warning: 0, critical: 0, total: 0 };
    
    state.activeWarnings.forEach(warning => {
      counts[warning.severity]++;
      counts.total++;
    });
    
    return counts;
  }
  
  /**
   * Get the most severe active warning
   */
  getMostSevereWarning(state: GameState): Warning | null {
    const criticals = state.activeWarnings.filter(w => w.severity === 'critical');
    if (criticals.length > 0) return criticals[0];
    
    const warnings = state.activeWarnings.filter(w => w.severity === 'warning');
    if (warnings.length > 0) return warnings[0];
    
    const infos = state.activeWarnings.filter(w => w.severity === 'info');
    if (infos.length > 0) return infos[0];
    
    return null;
  }
  
  /**
   * Format warning duration for display
   */
  formatWarningDuration(warning: Warning): string {
    const duration = Date.now() - warning.activeSince;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `0:${seconds.toString().padStart(2, '0')}`;
  }
}

// Singleton instance
let warningSystemInstance: WarningSystem | null = null;

export function getWarningSystem(): WarningSystem {
  if (!warningSystemInstance) {
    warningSystemInstance = new WarningSystem();
  }
  return warningSystemInstance;
}

export function resetWarningSystem(): void {
  warningSystemInstance = new WarningSystem();
}
