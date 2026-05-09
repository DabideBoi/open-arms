import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Warning } from '../types';
import { BANKRUPTCY_CONFIG, SHELTER_TIERS } from '../constants';
import { getResidentCap, getTierProgress, isApproachingCapacity, isAtResidentCap } from '../game/systems/TierSystem';
import { getWarningSystem } from '../game/systems/WarningSystem';
import { FinancialIndicator } from './EconomicDashboard';
import { AnimatedMoneyDisplay } from './MoneyAnimations';
import './HUD.css';

interface HUDProps {
  gameState: GameState;
  onPauseToggle?: () => void;
  isPaused?: boolean;
  onSettingsClick?: () => void;
  onWarningClick?: () => void;
  onStatisticsClick?: () => void;
}

/**
 * HUD component displaying game stats
 * Streamlined to show essential stats - detailed stats moved to Statistics modal
 */
export const HUD: React.FC<HUDProps> = ({ gameState, onPauseToggle, isPaused = false, onSettingsClick, onWarningClick, onStatisticsClick }) => {
  const [timeRemaining, setTimeRemaining] = useState<string>('0:00');
  const [phaseProgress, setPhaseProgress] = useState<number>(0);
  const [bankruptcyTimer, setBankruptcyTimer] = useState<string>('0:00');
  const [moneyPulseClass, setMoneyPulseClass] = useState<string>('');
  
  // Update time remaining every second
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, gameState.nextDayNightTransition - now);
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      
      // Calculate progress
      const duration = gameState.currentPhase === 'day' ? 8 * 60 * 1000 : 4 * 60 * 1000;
      const elapsed = duration - remaining;
      const progress = Math.max(0, Math.min(100, (elapsed / duration) * 100));
      setPhaseProgress(progress);
      
      // Bankruptcy timer (when active)
      if (gameState.isBankrupt) {
        const bankruptcyRemaining = Math.max(0, gameState.bankruptcyCountdown);
        const bankruptcyMin = Math.floor(bankruptcyRemaining / 60000);
        const bankruptcySec = Math.floor((bankruptcyRemaining % 60000) / 1000);
        setBankruptcyTimer(`${bankruptcyMin}:${bankruptcySec.toString().padStart(2, '0')}`);
      }
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [gameState.nextDayNightTransition, gameState.currentPhase, gameState.isBankrupt, gameState.bankruptcyCountdown]);
  
  // Get reputation color
  const getReputationColor = (rep: number): string => {
    if (rep <= 20) return '#ff0000';
    if (rep <= 40) return '#ff6600';
    if (rep <= 60) return '#ffcc00';
    if (rep <= 80) return '#66cc00';
    return '#00cc00';
  };
  
  // Get food icon
  const getFoodIcon = (setting: string): string => {
    const icons: Record<string, string> = {
      large: '🍽️',
      standard: '🍲',
      small: '🥄',
      none: '❌'
    };
    return icons[setting] || '🍲';
  };
  
  // Get money warning status
  const getMoneyWarningLevel = (): 'critical' | 'debt' | 'low' | 'normal' => {
    if (gameState.money < BANKRUPTCY_CONFIG.THRESHOLD) return 'critical';
    if (gameState.money < BANKRUPTCY_CONFIG.WARNING_MONEY_DEBT) return 'debt';
    if (gameState.money < BANKRUPTCY_CONFIG.WARNING_MONEY_LOW) return 'low';
    return 'normal';
  };
  
  const moneyWarningLevel = getMoneyWarningLevel();
  
  // Handle pulse effect when money changes
  const handleMoneyPulse = useCallback((type: 'income' | 'expense', isLarge: boolean) => {
    const pulseClass = type === 'income'
      ? (isLarge ? 'money-pulse-income-large' : 'money-pulse-income')
      : (isLarge ? 'money-pulse-expense-large' : 'money-pulse-expense');
    setMoneyPulseClass(pulseClass);
    
    // Clear pulse class after animation
    setTimeout(() => {
      setMoneyPulseClass('');
    }, 600);
  }, []);
  
  return (
    <div className={`hud ${gameState.isBankrupt ? 'hud-bankruptcy-active' : ''}`}>
      {/* Bankruptcy Warning Banner */}
      {gameState.isBankrupt && (
        <div className="hud-bankruptcy-warning">
          <div className="bankruptcy-warning-content">
            <span className="bankruptcy-icon">💀</span>
            <div className="bankruptcy-text">
              <span className="bankruptcy-title">BANKRUPTCY IMMINENT</span>
              <span className="bankruptcy-message">Get above $0 to recover!</span>
            </div>
            <div className="bankruptcy-countdown">
              <span className="countdown-label">Time Left:</span>
              <span className="countdown-value">{bankruptcyTimer}</span>
            </div>
          </div>
          <div className="bankruptcy-progress">
            <div
              className="bankruptcy-progress-bar"
              style={{
                width: `${(gameState.bankruptcyCountdown / BANKRUPTCY_CONFIG.COUNTDOWN_DURATION) * 100}%`
              }}
            />
          </div>
        </div>
      )}
      
      {/* Essential Stats Section */}
      <div className="hud-section">
        <div className={`hud-item hud-money-item ${moneyWarningLevel !== 'normal' ? `money-warning-${moneyWarningLevel}` : ''} ${moneyPulseClass}`} title="Current shelter funds">
          <span className="hud-label">💰 Money:</span>
          <AnimatedMoneyDisplay
            value={gameState.money}
            warningLevel={moneyWarningLevel}
            onPulse={handleMoneyPulse}
            className="hud-value"
          />
        </div>
        <div className="hud-item" title="Community reputation (0-100%)">
          <span className="hud-label">⭐ Reputation:</span>
          <span className="hud-value" style={{ color: getReputationColor(gameState.reputation) }}>
            {gameState.reputation}%
          </span>
        </div>
        <div className="hud-item" title="Food resource generated by cafeterias">
          <span className="hud-label">🍞 Food:</span>
          <span className="hud-value">{gameState.food}</span>
        </div>
        {/* Financial Trend Indicator */}
        <div className="hud-item hud-financial-indicator" title="Daily cash flow trend - click Statistics for details">
          <FinancialIndicator gameState={gameState} />
        </div>
      </div>
      
      {/* Tier Info Section */}
      <div className="hud-section hud-tier-section">
        <div className="hud-tier-info">
          <div className="hud-tier-badge" title={SHELTER_TIERS[gameState.currentTier].description}>
            <span className="tier-icon">🏛️</span>
            <span className="tier-name">{SHELTER_TIERS[gameState.currentTier].name}</span>
          </div>
          {gameState.currentTier < 4 && (
            <div className="hud-tier-progress" title="Progress toward next tier">
              <span className="progress-label">🎓</span>
              <span className="progress-text">
                {gameState.graduatedCount}/{SHELTER_TIERS[(gameState.currentTier + 1) as 1 | 2 | 3 | 4].graduationsRequired}
              </span>
            </div>
          )}
        </div>
      </div>
      
      {/* Residents & Rooms Section */}
      <div className="hud-section">
        <div className={`hud-item ${isAtResidentCap(gameState) ? 'capacity-full' : isApproachingCapacity(gameState) ? 'capacity-warning' : ''}`}
             title={`Resident capacity: ${gameState.residents.length}/${getResidentCap(gameState)} (Tier ${gameState.currentTier} max)`}>
          <span className="hud-label">👥 Residents:</span>
          <span className="hud-value">
            {gameState.residents.length}/{getResidentCap(gameState)}
            {isAtResidentCap(gameState) && <span className="capacity-indicator"> ⚠️</span>}
          </span>
        </div>
        <div className="hud-item">
          <span className="hud-label">📅 Day:</span>
          <span className="hud-value">{gameState.currentDay}</span>
        </div>
        <div className="hud-item">
          <span className="hud-label">🏠 Rooms:</span>
          <span className="hud-value">{gameState.rooms.length}</span>
        </div>
        {gameState.activeFundraisers && gameState.activeFundraisers.length > 0 && (
          <div className="hud-item">
            <span className="hud-label">🎪 Fundraisers:</span>
            <span className="hud-value">{gameState.activeFundraisers.length}</span>
          </div>
        )}
      </div>
      
      <div className="hud-section hud-phase-section">
        <div className="hud-phase-info">
          <div className="hud-phase-header">
            <span className="hud-phase-icon">
              {gameState.currentPhase === 'day' ? '☀️' : '🌙'}
            </span>
            <span className="hud-phase-label">
              {gameState.currentPhase === 'day' ? `Day ${gameState.currentDay}` : 'Night'}
            </span>
            <span className="hud-phase-time">{timeRemaining}</span>
          </div>
          <div className="hud-phase-progress">
            <div 
              className={`hud-phase-progress-bar ${gameState.currentPhase}`}
              style={{ width: `${phaseProgress}%` }}
            />
          </div>
        </div>
      </div>
      
      <div className="hud-section hud-controls">
        {onPauseToggle && (
          <button
            className={`hud-button hud-pause-button ${isPaused ? 'paused' : ''}`}
            onClick={onPauseToggle}
            title={isPaused ? 'Resume (Space)' : 'Pause (Space)'}
          >
            {isPaused ? '▶️' : '⏸️'}
          </button>
        )}
        {/* Warning Indicator Button */}
        {(() => {
          const warningSystem = getWarningSystem();
          const counts = warningSystem.getWarningCounts(gameState);
          if (counts.total > 0) {
            return (
              <button
                className={`hud-button hud-warning-button ${counts.critical > 0 ? 'critical' : counts.warning > 0 ? 'warning' : 'info'}`}
                onClick={onWarningClick}
                title={`${counts.total} active warning${counts.total !== 1 ? 's' : ''}`}
              >
                {counts.critical > 0 ? '🚨' : counts.warning > 0 ? '⚠️' : 'ℹ️'}
                <span className="warning-count-badge">{counts.total}</span>
              </button>
            );
          }
          return null;
        })()}
        {/* Statistics Button */}
        {onStatisticsClick && (
          <button
            className="hud-button hud-statistics-button"
            onClick={onStatisticsClick}
            title="View detailed statistics (decay, graduated, finances, food)"
          >
            📊
          </button>
        )}
        {onSettingsClick && (
          <button
            className="hud-button hud-settings-button"
            onClick={onSettingsClick}
            title="Settings"
          >
            ⚙️
          </button>
        )}
      </div>
    </div>
  );
};
