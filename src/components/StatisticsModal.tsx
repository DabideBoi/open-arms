import React, { useState, useEffect } from 'react';
import { GameState, FoodPortionSetting } from '../types';
import { getDecayRateInfo } from '../game/systems/ReputationSystem';
import { roomKind } from '../constants';
import './StatisticsModal.css';
import { formatMoney } from '../utils/helpers';

interface StatisticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  onChangeFoodSetting?: (setting: FoodPortionSetting) => void;
  embedded?: boolean; // render inline (Reports panel) instead of as a modal
}

/**
 * Statistics Modal - displays detailed game statistics
 * Includes: decay rate, graduated count, daily net income/expenses, food deliveries
 */
export const StatisticsModal: React.FC<StatisticsModalProps> = ({
  isOpen,
  onClose,
  gameState,
  onChangeFoodSetting,
  embedded = false
}) => {
  const [dailyIncome, setDailyIncome] = useState(0);
  const [dailyExpenses, setDailyExpenses] = useState(0);

  // Calculate daily income/expenses from financial history
  useEffect(() => {
    if (!gameState) return;

    const financialHistory = gameState.financialHistory;
    if (financialHistory) {
      // Calculate today's income from donations
      const todayStart = new Date().setHours(0, 0, 0, 0);
      const todayDonations = financialHistory.donations
        .filter(d => d.timestamp >= todayStart)
        .reduce((sum, d) => sum + d.amount, 0);
      
      // Calculate today's expenses
      const todayExpenses = financialHistory.expenses
        .filter(e => e.timestamp >= todayStart)
        .reduce((sum, e) => sum + e.amount, 0);
      
      setDailyIncome(todayDonations);
      setDailyExpenses(todayExpenses);
    }
  }, [gameState]);

  if (!isOpen) return null;

  const decayInfo = getDecayRateInfo(gameState);
  const dailyNet = dailyIncome - dailyExpenses;

  // Get food icon
  const getFoodIcon = (setting: string): string => {
    const icons: Record<string, string> = {
      premium: '👑',
      generous: '🍽️',
      large: '🍽️',
      standard: '🍲',
      small: '🥄',
      minimal: '🥣',
      none: '❌'
    };
    return icons[setting] || '🍲';
  };

  // Get food setting description
  const getFoodDescription = (setting: FoodPortionSetting): string => {
    const descriptions: Record<FoodPortionSetting, string> = {
      premium: 'Premium deliveries - Highest cost, maximum health, fastest food',
      generous: 'Generous deliveries - High cost, very healthy residents, faster food',
      large: 'Large deliveries - Higher cost, healthier residents, faster food',
      standard: 'Standard deliveries - Balanced approach',
      small: 'Small deliveries - Lower cost, less health, slower food',
      minimal: 'Minimal deliveries - Very low cost, unhealthy residents, slowest food',
      none: 'No food - Saves money but residents suffer'
    };
    return descriptions[setting];
  };

  // Calculate decay protection sources
  const getProtectionSources = (): string[] => {
    const sources: string[] = [];
    
    // Check for admin office
    const hasAdminOffice = gameState.rooms.some(r => r.type === 'admin_office');
    if (hasAdminOffice) sources.push('Admin Office');
    
    // Check active fundraisers
    if (gameState.activeFundraisers && gameState.activeFundraisers.length > 0) {
      sources.push('Active Fundraisers');
    }
    
    // Check high-health residents
    const healthyResidents = gameState.residents.filter(r => r.health >= 80).length;
    if (healthyResidents > 0) {
      sources.push(`${healthyResidents} Healthy Residents`);
    }
    
    return sources;
  };

  const protectionSources = getProtectionSources();

  // Get last day net income from financial history
  const lastDayNetIncome = gameState.financialHistory?.lastDayNetIncome || 0;

  return (
    <>
      {!embedded && <div className="statistics-modal-overlay" onClick={onClose} />}
      <div className={`statistics-modal${embedded ? ' embedded' : ''}`}>
        <button className="statistics-close-button" onClick={onClose}>×</button>
        
        <h2>📊 Statistics</h2>
        
        {/* Reputation Decay Section */}
        <div className="statistics-section">
          <h3>📉 Reputation Decay</h3>
          <div className="statistics-content">
            {decayInfo.isAtFloor ? (
              <div className="decay-status decay-protected">
                <span className="decay-icon">🛡️</span>
                <div className="decay-info">
                  <span className="decay-label">At Floor</span>
                  <span className="decay-value">No decay - reputation at {decayInfo.floor}%</span>
                </div>
              </div>
            ) : decayInfo.isFullyMitigated ? (
              <div className="decay-status decay-protected">
                <span className="decay-icon">🛡️</span>
                <div className="decay-info">
                  <span className="decay-label">Fully Protected</span>
                  <span className="decay-value">Decay mitigated by facilities</span>
                </div>
              </div>
            ) : (
              <div className="decay-status decay-active">
                <span className="decay-icon">📊</span>
                <div className="decay-info">
                  <span className="decay-label">Active Decay</span>
                  <span className="decay-value" style={{ color: decayInfo.netDecayRate > 1.5 ? '#ff6600' : '#ffcc00' }}>
                    -{decayInfo.netDecayRate.toFixed(2)}% per day
                  </span>
                </div>
              </div>
            )}
            
            <div className="decay-details">
              <div className="detail-row">
                <span className="detail-label">Base Decay Rate:</span>
                <span className="detail-value">-{decayInfo.baseDecayRate.toFixed(2)}%/day</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Net Decay Rate:</span>
                <span className="detail-value" style={{ color: decayInfo.netDecayRate > 0 ? '#ff6600' : '#66cc00' }}>
                  -{decayInfo.netDecayRate.toFixed(2)}%/day
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Floor:</span>
                <span className="detail-value">{decayInfo.floor}%</span>
              </div>
            </div>
            
            {protectionSources.length > 0 && (
              <div className="protection-sources">
                <span className="protection-label">🛡️ Protection from:</span>
                <div className="protection-list">
                  {protectionSources.map((source, index) => (
                    <span key={index} className="protection-item">{source}</span>
                  ))}
                </div>
              </div>
            )}
            
            {decayInfo.mitigations && decayInfo.mitigations.descriptions && decayInfo.mitigations.descriptions.length > 0 && (
              <div className="mitigation-details">
                <span className="mitigation-label">Mitigation Details:</span>
                <ul className="mitigation-list">
                  {decayInfo.mitigations.descriptions.map((desc: string, index: number) => (
                    <li key={index}>{desc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {/* Graduation Progress Section */}
        <div className="statistics-section">
          <h3>🎓 Graduation Progress</h3>
          <div className="statistics-content">
            <div className="graduation-stats">
              <div className="stat-card">
                <span className="stat-value">{gameState.graduatedCount}</span>
                <span className="stat-label">Total Graduated</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{gameState.totalResidentsHelped || 0}</span>
                <span className="stat-label">Total Helped</span>
              </div>
              <div className="stat-card">
                <span className="stat-value">{gameState.residents.length}</span>
                <span className="stat-label">Current Residents</span>
              </div>
            </div>
            
            {/* Residents approaching graduation */}
            <div className="graduation-progress">
              <span className="progress-label">Residents Near Graduation:</span>
              <div className="progress-residents">
                {gameState.residents
                  .filter(r => r.lifeMeter >= 80)
                  .map(r => (
                    <div key={r.id} className="progress-resident">
                      <span className="resident-name">{r.name}</span>
                      <span className="resident-progress">{Math.round(r.lifeMeter)}%</span>
                    </div>
                  ))
                }
                {gameState.residents.filter(r => r.lifeMeter >= 80).length === 0 && (
                  <span className="no-residents">No residents near graduation (80%+ LIFE meter)</span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Daily Finances Section */}
        <div className="statistics-section">
          <h3>💰 Daily Finances</h3>
          <div className="statistics-content">
            <div className="finance-stats">
              <div className="stat-card income">
                <span className="stat-value">+{formatMoney(dailyIncome)}</span>
                <span className="stat-label">Today's Income</span>
              </div>
              <div className="stat-card expenses">
                <span className="stat-value">-${dailyExpenses.toLocaleString()}</span>
                <span className="stat-label">Today's Expenses</span>
              </div>
              <div className={`stat-card net ${dailyNet >= 0 ? 'positive' : 'negative'}`}>
                <span className="stat-value">
                  {dailyNet >= 0 ? '+' : ''}{formatMoney(dailyNet)}
                </span>
                <span className="stat-label">Today's Net</span>
              </div>
            </div>
            
            <div className="finance-breakdown">
              <div className="breakdown-section">
                <h4>📈 Yesterday's Summary</h4>
                <div className="breakdown-items">
                  <div className="breakdown-item">
                    <span>Last Day Net:</span>
                    <span style={{ color: lastDayNetIncome >= 0 ? '#66cc00' : '#ff6600' }}>
                      {lastDayNetIncome >= 0 ? '+' : ''}{formatMoney(lastDayNetIncome)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="breakdown-section">
                <h4>💵 Current Balance</h4>
                <div className="breakdown-items">
                  <div className="breakdown-item">
                    <span>Money:</span>
                    <span style={{ color: gameState.money >= 0 ? '#66cc00' : '#ff6600' }}>
                      {formatMoney(gameState.money)}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span>Total Earned:</span>
                    <span>+{formatMoney((gameState.totalMoneyEarned || 0))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Food Portions Section */}
        <div className="statistics-section">
          <h3>🍽️ Food Deliveries</h3>
          <div className="statistics-content">
            <div className="food-current">
              <span className="food-icon">{getFoodIcon(gameState.foodPortionSetting)}</span>
              <div className="food-info">
                <span className="food-setting">{gameState.foodPortionSetting.charAt(0).toUpperCase() + gameState.foodPortionSetting.slice(1)} Deliveries</span>
                <span className="food-description">{getFoodDescription(gameState.foodPortionSetting)}</span>
              </div>
            </div>
            
            <div className="food-stats">
              <div className="detail-row">
                <span className="detail-label">Current Food Supply:</span>
                <span className="detail-value">{gameState.food} units</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Cafeterias:</span>
                <span className="detail-value">{gameState.rooms.filter(r => roomKind(r.type) === 'cafeteria').length}</span>
              </div>
            </div>
            
            {onChangeFoodSetting && (
              <div className="food-settings">
                <span className="settings-label">Change Food Setting:</span>
                <div className="food-options">
                  {(['premium', 'generous', 'large', 'standard', 'small', 'minimal', 'none'] as FoodPortionSetting[]).map(setting => (
                    <button
                      key={setting}
                      className={`food-option ${gameState.foodPortionSetting === setting ? 'active' : ''}`}
                      onClick={() => onChangeFoodSetting(setting)}
                    >
                      {getFoodIcon(setting)} {setting.charAt(0).toUpperCase() + setting.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="statistics-footer">
          <span className="footer-hint">Press ESC or click outside to close</span>
        </div>
      </div>
    </>
  );
};
