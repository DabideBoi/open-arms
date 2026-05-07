import React, { useMemo } from 'react';
import { GameState, FinancialHealthStatus } from '../types';
import { getActiveTimerConfig, MAINTENANCE_CONFIG, OPERATING_COSTS_CONFIG } from '../constants';
import { getExpectedDonationAmount, getOperatingCostsBreakdown, getDonationChance } from '../game/systems/DonationSystem';
import { getTotalMaintenanceCost, getMaintenanceStatus } from '../game/systems/MaintenanceSystem';
import { calculateFoodCost, getFoodSettingDisplay } from '../game/systems/FoodSystem';
import { getDonationMultiplier } from '../game/systems/TierSystem';
import './EconomicDashboard.css';

interface EconomicDashboardProps {
  gameState: GameState;
}

// ============================================================================
// Financial Calculation Helpers
// ============================================================================

/**
 * Calculate average donations per day based on recent history
 */
function calculateAverageDonationsPerDay(gameState: GameState): number {
  const { donations } = gameState.financialHistory;
  
  if (donations.length === 0) {
    // Estimate based on expected values
    const expected = getExpectedDonationAmount(gameState);
    const donationChance = getDonationChance(gameState.reputation);
    const TIMER_CONFIG = getActiveTimerConfig();
    const checksPerDay = (8 * 60 * 1000) / TIMER_CONFIG.DONATION_CHECK_INTERVAL; // Day phase only
    return Math.floor(expected.average * donationChance * checksPerDay);
  }
  
  // Calculate from last 24 hours of history
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  const recentDonations = donations.filter(d => d.timestamp > oneDayAgo);
  
  if (recentDonations.length === 0) {
    const expected = getExpectedDonationAmount(gameState);
    const donationChance = getDonationChance(gameState.reputation);
    const TIMER_CONFIG = getActiveTimerConfig();
    const checksPerDay = (8 * 60 * 1000) / TIMER_CONFIG.DONATION_CHECK_INTERVAL;
    return Math.floor(expected.average * donationChance * checksPerDay);
  }
  
  const total = recentDonations.reduce((sum, d) => sum + d.amount, 0);
  return total;
}

/**
 * Calculate total expenses per day
 */
function calculateDailyExpenses(gameState: GameState): {
  food: number;
  maintenance: number;
  operating: number;
  random: number;
  total: number;
} {
  // Food costs
  const residentCount = gameState.residents.length;
  const foodCost = calculateFoodCost(residentCount, gameState.foodPortionSetting);
  
  // Maintenance costs - convert from per-cycle to per-day
  const maintenanceCostPerCycle = getTotalMaintenanceCost(gameState);
  const TIMER_CONFIG = getActiveTimerConfig();
  const maintenanceCyclesPerDay = (24 * 60 * 60 * 1000) / TIMER_CONFIG.MAINTENANCE_CHECK_INTERVAL;
  const maintenancePerDay = Math.floor(maintenanceCostPerCycle * maintenanceCyclesPerDay);
  
  // Operating costs (daily)
  const operatingCosts = getOperatingCostsBreakdown(gameState);
  
  // Random expenses (estimated average)
  const donationChecksPerDay = (8 * 60 * 1000) / TIMER_CONFIG.DONATION_CHECK_INTERVAL;
  const randomExpenseChance = 0.15; // 15% per check
  const avgRandomCost = (25 + 100) / 2; // Average of min/max
  const estimatedRandomExpenses = Math.floor(donationChecksPerDay * randomExpenseChance * avgRandomCost);
  
  return {
    food: foodCost,
    maintenance: maintenancePerDay,
    operating: operatingCosts.total,
    random: estimatedRandomExpenses,
    total: foodCost + maintenancePerDay + operatingCosts.total + estimatedRandomExpenses
  };
}

/**
 * Calculate financial health status
 */
function getFinancialHealthStatus(dailyNet: number, daysUntilBankrupt: number | null): FinancialHealthStatus {
  if (dailyNet > 50) return 'healthy';
  if (dailyNet >= -20) return 'stable';
  if (daysUntilBankrupt !== null && daysUntilBankrupt <= 5) return 'critical';
  if (dailyNet < -50) return 'critical';
  return 'warning';
}

/**
 * Calculate days until bankrupt at current rate
 */
function calculateDaysUntilBankrupt(money: number, dailyNet: number): number | null {
  if (dailyNet >= 0) return null; // Not going bankrupt
  if (money <= 0) return 0; // Already bankrupt
  return Math.ceil(money / Math.abs(dailyNet));
}

/**
 * Calculate efficiency metrics
 */
function calculateEfficiencyMetrics(
  gameState: GameState,
  dailyIncome: number,
  dailyExpenses: number
): {
  costPerResident: number;
  revenuePerResident: number;
  efficiencyScore: number;
} {
  const residentCount = gameState.residents.length;
  
  if (residentCount === 0) {
    return {
      costPerResident: 0,
      revenuePerResident: 0,
      efficiencyScore: 100
    };
  }
  
  const costPerResident = dailyExpenses / residentCount;
  const revenuePerResident = dailyIncome / residentCount;
  const efficiencyScore = dailyExpenses > 0 
    ? Math.min(200, Math.round((dailyIncome / dailyExpenses) * 100))
    : 100;
  
  return {
    costPerResident: Math.round(costPerResident),
    revenuePerResident: Math.round(revenuePerResident),
    efficiencyScore
  };
}

/**
 * Generate financial alerts/warnings
 */
function generateFinancialAlerts(
  gameState: GameState,
  dailyExpenses: { food: number; maintenance: number; total: number },
  dailyIncome: number,
  daysUntilBankrupt: number | null
): string[] {
  const alerts: string[] = [];
  
  // Food costs exceeding threshold
  if (dailyIncome > 0 && dailyExpenses.food / dailyIncome > 0.4) {
    alerts.push('⚠️ Food costs exceeding 40% of income');
  }
  
  // Maintenance warning
  const maintenanceStatus = getMaintenanceStatus(gameState);
  if (maintenanceStatus.status === 'warning') {
    alerts.push(`⚠️ Cannot afford next maintenance ($${maintenanceStatus.nextCost})`);
  } else if (maintenanceStatus.status === 'critical') {
    const timeMinutes = Math.floor(maintenanceStatus.timeRemaining / 60000);
    alerts.push(`⚠️ Maintenance due in ${timeMinutes} minutes: $${maintenanceStatus.nextCost}`);
  }
  
  // Bankruptcy warning
  if (daysUntilBankrupt !== null && daysUntilBankrupt <= 5) {
    alerts.push(`⚠️ Projected bankrupt in ${daysUntilBankrupt} days at current rate`);
  }
  
  // Low money warning
  if (gameState.money < 200 && gameState.money > 0) {
    alerts.push('⚠️ Low funds - consider running a fundraiser');
  }
  
  // Positive message if doing well
  if (alerts.length === 0 && dailyIncome > dailyExpenses.total) {
    alerts.push('✓ Operating sustainably');
  }
  
  return alerts;
}

// ============================================================================
// Sub-components
// ============================================================================

interface IncomeBreakdownProps {
  gameState: GameState;
  dailyIncome: number;
}

const IncomeBreakdown: React.FC<IncomeBreakdownProps> = ({ gameState, dailyIncome }) => {
  const expected = getExpectedDonationAmount(gameState);
  const donationChance = getDonationChance(gameState.reputation);
  const tierMultiplier = getDonationMultiplier(gameState);
  
  // Estimate fundraiser income (if any active)
  const activeFundraisers = gameState.activeFundraisers?.length || 0;
  const avgFundraiserPayout = activeFundraisers > 0 
    ? Math.floor(gameState.activeFundraisers.reduce((sum, f) => sum + f.expectedPayout, 0) / activeFundraisers)
    : 0;
  
  return (
    <div className="economic-section income-section">
      <h4>💰 Daily Income Estimate</h4>
      <div className="breakdown-list">
        <div className="breakdown-item">
          <span className="item-label">Donations:</span>
          <span className="item-value">~${dailyIncome}/day</span>
        </div>
        <div className="breakdown-item sub-item">
          <span className="item-label">├ Chance per check:</span>
          <span className="item-value">{Math.round(donationChance * 100)}%</span>
        </div>
        <div className="breakdown-item sub-item">
          <span className="item-label">├ Expected amount:</span>
          <span className="item-value">${expected.min}-${expected.max}</span>
        </div>
        <div className="breakdown-item sub-item">
          <span className="item-label">└ Tier multiplier:</span>
          <span className="item-value">×{tierMultiplier.toFixed(1)}</span>
        </div>
        {activeFundraisers > 0 && (
          <div className="breakdown-item">
            <span className="item-label">Fundraisers:</span>
            <span className="item-value">~${avgFundraiserPayout} (if successful)</span>
          </div>
        )}
      </div>
      <div className="breakdown-total">
        <span>Total:</span>
        <span className="positive">~${dailyIncome}/day</span>
      </div>
    </div>
  );
};

interface ExpenseBreakdownProps {
  expenses: {
    food: number;
    maintenance: number;
    operating: number;
    random: number;
    total: number;
  };
  gameState: GameState;
}

const ExpenseBreakdown: React.FC<ExpenseBreakdownProps> = ({ expenses, gameState }) => {
  const operatingBreakdown = getOperatingCostsBreakdown(gameState);
  const foodDisplay = getFoodSettingDisplay(gameState.foodPortionSetting);
  
  return (
    <div className="economic-section expense-section">
      <h4>💸 Daily Expenses</h4>
      <div className="breakdown-list">
        <div className="breakdown-item">
          <span className="item-label">Food ({gameState.foodPortionSetting}):</span>
          <span className="item-value">${expenses.food}/day</span>
        </div>
        <div className="breakdown-item sub-item">
          <span className="item-label">└ {gameState.residents.length} residents × ${foodDisplay.costPerResident}</span>
        </div>
        <div className="breakdown-item">
          <span className="item-label">Maintenance:</span>
          <span className="item-value">${expenses.maintenance}/day</span>
        </div>
        <div className="breakdown-item sub-item">
          <span className="item-label">└ {gameState.rooms.length} rooms</span>
        </div>
        <div className="breakdown-item">
          <span className="item-label">Operating:</span>
          <span className="item-value">${expenses.operating}/day</span>
        </div>
        <div className="breakdown-item sub-item">
          <span className="item-label">├ Base: ${operatingBreakdown.base}</span>
        </div>
        <div className="breakdown-item sub-item">
          <span className="item-label">├ Residents: ${operatingBreakdown.residents}</span>
        </div>
        <div className="breakdown-item sub-item">
          <span className="item-label">└ Rooms: ${operatingBreakdown.rooms}</span>
        </div>
        <div className="breakdown-item">
          <span className="item-label">Random (avg):</span>
          <span className="item-value">~${expenses.random}/day</span>
        </div>
      </div>
      <div className="breakdown-total">
        <span>Total:</span>
        <span className="negative">~${expenses.total}/day</span>
      </div>
    </div>
  );
};

interface ProjectionSectionProps {
  dailyNet: number;
  daysUntilBankrupt: number | null;
  currentMoney: number;
}

const ProjectionSection: React.FC<ProjectionSectionProps> = ({ 
  dailyNet, 
  daysUntilBankrupt, 
  currentMoney 
}) => {
  // Project money over next 3 days
  const projections = [1, 2, 3].map(days => ({
    day: days,
    money: Math.floor(currentMoney + (dailyNet * days))
  }));
  
  return (
    <div className="economic-section projection-section">
      <h4>📊 Projections</h4>
      <div className="projection-net">
        <span className="projection-label">Daily Net:</span>
        <span className={`projection-value ${dailyNet >= 0 ? 'positive' : 'negative'}`}>
          {dailyNet >= 0 ? '+' : ''}${dailyNet}/day
          <span className="trend-arrow">{dailyNet >= 0 ? '↑' : '↓'}</span>
        </span>
      </div>
      
      {daysUntilBankrupt !== null && (
        <div className="bankruptcy-warning">
          <span className="warning-icon">⚠️</span>
          <span>Days Until Bankrupt: <strong>{daysUntilBankrupt}</strong></span>
        </div>
      )}
      
      <div className="projection-timeline">
        <span className="timeline-label">3-Day Forecast:</span>
        <div className="timeline-bars">
          {projections.map(p => (
            <div key={p.day} className="timeline-bar-container">
              <div 
                className={`timeline-bar ${p.money >= 0 ? 'positive' : 'negative'}`}
                style={{ 
                  width: `${Math.min(100, Math.abs(p.money) / Math.max(1, currentMoney) * 100)}%`
                }}
              />
              <span className="timeline-value">${p.money}</span>
              <span className="timeline-day">Day +{p.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface EfficiencyMetricsProps {
  metrics: {
    costPerResident: number;
    revenuePerResident: number;
    efficiencyScore: number;
  };
}

const EfficiencyMetrics: React.FC<EfficiencyMetricsProps> = ({ metrics }) => {
  const getScoreColor = (score: number): string => {
    if (score >= 100) return 'healthy';
    if (score >= 80) return 'stable';
    if (score >= 60) return 'warning';
    return 'critical';
  };
  
  return (
    <div className="economic-section efficiency-section">
      <h4>📈 Efficiency Metrics</h4>
      <div className="metric-grid">
        <div className="metric-item">
          <span className="metric-label">Cost/Resident:</span>
          <span className="metric-value">${metrics.costPerResident}/day</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">Revenue/Resident:</span>
          <span className="metric-value">${metrics.revenuePerResident}/day</span>
        </div>
        <div className="metric-item full-width">
          <span className="metric-label">Efficiency Score:</span>
          <div className="efficiency-bar-container">
            <div 
              className={`efficiency-bar ${getScoreColor(metrics.efficiencyScore)}`}
              style={{ width: `${Math.min(100, metrics.efficiencyScore)}%` }}
            />
            <span className="efficiency-value">{metrics.efficiencyScore}%</span>
          </div>
          <span className="efficiency-label">
            {metrics.efficiencyScore >= 100 ? '(Break-even+)' : '(Below break-even)'}
          </span>
        </div>
      </div>
    </div>
  );
};

interface AlertsSectionProps {
  alerts: string[];
}

const AlertsSection: React.FC<AlertsSectionProps> = ({ alerts }) => {
  if (alerts.length === 0) return null;
  
  return (
    <div className="economic-section alerts-section">
      <h4>🔔 Alerts</h4>
      <div className="alerts-list">
        {alerts.map((alert, index) => (
          <div 
            key={index}
            className={`alert-item ${alert.startsWith('✓') ? 'success' : 'warning'}`}
          >
            {alert}
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const EconomicDashboard: React.FC<EconomicDashboardProps> = ({ gameState }) => {
  // Calculate all financial data
  const dailyIncome = useMemo(
    () => calculateAverageDonationsPerDay(gameState),
    [gameState.financialHistory.donations, gameState.reputation, gameState.residents.length]
  );
  
  const dailyExpenses = useMemo(
    () => calculateDailyExpenses(gameState),
    [gameState.residents.length, gameState.rooms.length, gameState.foodPortionSetting]
  );
  
  const dailyNet = dailyIncome - dailyExpenses.total;
  const daysUntilBankrupt = calculateDaysUntilBankrupt(gameState.money, dailyNet);
  const healthStatus = getFinancialHealthStatus(dailyNet, daysUntilBankrupt);
  
  const efficiencyMetrics = useMemo(
    () => calculateEfficiencyMetrics(gameState, dailyIncome, dailyExpenses.total),
    [gameState.residents.length, dailyIncome, dailyExpenses.total]
  );
  
  const alerts = useMemo(
    () => generateFinancialAlerts(gameState, dailyExpenses, dailyIncome, daysUntilBankrupt),
    [gameState, dailyExpenses, dailyIncome, daysUntilBankrupt]
  );
  
  return (
    <div className={`economic-dashboard health-${healthStatus}`}>
      {/* Summary Header */}
      <div className="dashboard-summary">
        <div className="summary-item current-money">
          <span className="summary-label">Current Balance</span>
          <span className={`summary-value ${gameState.money < 0 ? 'negative' : ''}`}>
            ${gameState.money.toLocaleString()}
          </span>
        </div>
        <div className="summary-item daily-net">
          <span className="summary-label">Daily Net</span>
          <span className={`summary-value ${dailyNet >= 0 ? 'positive' : 'negative'}`}>
            {dailyNet >= 0 ? '+' : ''}${dailyNet}
          </span>
        </div>
        <div className="summary-item health-status">
          <span className="summary-label">Status</span>
          <span className={`summary-value status-${healthStatus}`}>
            {healthStatus === 'healthy' && '💚 Healthy'}
            {healthStatus === 'stable' && '💛 Stable'}
            {healthStatus === 'warning' && '🟠 Warning'}
            {healthStatus === 'critical' && '🔴 Critical'}
          </span>
        </div>
      </div>
      
      {/* Cash Flow Breakdown */}
      <div className="dashboard-grid">
        <IncomeBreakdown gameState={gameState} dailyIncome={dailyIncome} />
        <ExpenseBreakdown expenses={dailyExpenses} gameState={gameState} />
      </div>
      
      {/* Projections */}
      <ProjectionSection 
        dailyNet={dailyNet}
        daysUntilBankrupt={daysUntilBankrupt}
        currentMoney={gameState.money}
      />
      
      {/* Efficiency Metrics */}
      <EfficiencyMetrics metrics={efficiencyMetrics} />
      
      {/* Alerts */}
      <AlertsSection alerts={alerts} />
    </div>
  );
};

// ============================================================================
// Mini HUD Indicator Component
// ============================================================================

interface FinancialIndicatorProps {
  gameState: GameState;
  onClick?: () => void;
}

export const FinancialIndicator: React.FC<FinancialIndicatorProps> = ({ gameState, onClick }) => {
  const dailyIncome = useMemo(
    () => calculateAverageDonationsPerDay(gameState),
    [gameState.financialHistory.donations, gameState.reputation, gameState.residents.length]
  );
  
  const dailyExpenses = useMemo(
    () => calculateDailyExpenses(gameState),
    [gameState.residents.length, gameState.rooms.length, gameState.foodPortionSetting]
  );
  
  const dailyNet = dailyIncome - dailyExpenses.total;
  const daysUntilBankrupt = calculateDaysUntilBankrupt(gameState.money, dailyNet);
  const healthStatus = getFinancialHealthStatus(dailyNet, daysUntilBankrupt);
  
  return (
    <div 
      className={`financial-indicator health-${healthStatus}`}
      onClick={onClick}
      title={`Daily net: ${dailyNet >= 0 ? '+' : ''}$${dailyNet}. Click for details.`}
    >
      <span className="indicator-icon">
        {healthStatus === 'healthy' && '📈'}
        {healthStatus === 'stable' && '📊'}
        {healthStatus === 'warning' && '📉'}
        {healthStatus === 'critical' && '🚨'}
      </span>
      <span className={`indicator-value ${dailyNet >= 0 ? 'positive' : 'negative'}`}>
        {dailyNet >= 0 ? '+' : ''}{dailyNet}
      </span>
    </div>
  );
};
