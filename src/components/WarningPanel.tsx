import React, { useState, useEffect, useCallback } from 'react';
import { GameState, Warning, WarningSeverity } from '../types';
import { getWarningSystem } from '../game/systems/WarningSystem';
import './WarningPanel.css';

interface WarningPanelProps {
  gameState: GameState;
  onAction?: (actionType: string, warning: Warning) => void;
  onDismiss?: (warningId: string) => void;
}

/**
 * Get icon for warning type
 */
const getWarningIcon = (type: string): string => {
  const icons: Record<string, string> = {
    // Financial
    low_funds: '💰',
    in_debt: '📉',
    near_bankruptcy: '💀',
    maintenance_due: '🔧',
    operating_costs_due: '📋',
    // Resident
    unhappy_resident: '😢',
    at_risk_resident: '🚪',
    overcrowded: '👥',
    hungry_residents: '🍽️',
    // Operational
    low_reputation: '⭐',
    reputation_dropping: '📉',
    maintenance_overdue: '🛠️',
    capacity_warning: '⚠️',
    // Progression
    ready_to_upgrade: '🎉',
    stalled_progress: '⏸️',
    life_meters_stalled: '📊',
  };
  return icons[type] || '⚠️';
};

/**
 * Get severity color
 */
const getSeverityColor = (severity: WarningSeverity): string => {
  switch (severity) {
    case 'critical':
      return '#ff4444';
    case 'warning':
      return '#ffaa00';
    case 'info':
      return '#4488ff';
    default:
      return '#888888';
  }
};

/**
 * Get action label based on warning type
 */
const getDefaultActionLabel = (type: string): string => {
  const actions: Record<string, string> = {
    low_funds: 'View Finances',
    in_debt: 'View Finances',
    near_bankruptcy: 'View Finances',
    maintenance_due: 'View Rooms',
    operating_costs_due: 'View Finances',
    unhappy_resident: 'View Residents',
    at_risk_resident: 'View Residents',
    overcrowded: 'Upgrade Tier',
    hungry_residents: 'Build Cafeteria',
    low_reputation: 'View Dashboard',
    reputation_dropping: 'View Residents',
    maintenance_overdue: 'View Rooms',
    capacity_warning: 'Upgrade Tier',
    ready_to_upgrade: 'Upgrade Now',
    stalled_progress: 'View Residents',
    life_meters_stalled: 'View Residents',
  };
  return actions[type] || 'View';
};

/**
 * Warning Card Component
 */
const WarningCard: React.FC<{
  warning: Warning;
  onAction: () => void;
  onDismiss: () => void;
}> = ({ warning, onAction, onDismiss }) => {
  const [duration, setDuration] = useState('0:00');
  
  useEffect(() => {
    const updateDuration = () => {
      const elapsed = Date.now() - warning.activeSince;
      const seconds = Math.floor(elapsed / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      setDuration(`${minutes}:${remainingSeconds.toString().padStart(2, '0')}`);
    };
    
    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [warning.activeSince]);
  
  const severityClass = `warning-card-${warning.severity}`;
  const escalatedClass = warning.escalatedAt ? 'warning-escalated' : '';
  
  return (
    <div className={`warning-card ${severityClass} ${escalatedClass}`}>
      <div className="warning-card-header">
        <span className="warning-icon">{getWarningIcon(warning.type)}</span>
        <span className="warning-message">{warning.message}</span>
        <span 
          className="warning-severity-badge"
          style={{ backgroundColor: getSeverityColor(warning.severity) }}
        >
          {warning.severity.toUpperCase()}
        </span>
      </div>
      
      {warning.detail && (
        <div className="warning-detail">{warning.detail}</div>
      )}
      
      <div className="warning-card-footer">
        <span className="warning-duration">⏱️ {duration}</span>
        <div className="warning-actions">
          <button 
            className="warning-action-btn"
            onClick={onAction}
          >
            {warning.actionLabel || getDefaultActionLabel(warning.type)}
          </button>
          {warning.dismissable && (
            <button 
              className="warning-dismiss-btn"
              onClick={onDismiss}
              title="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Warning Panel Component
 */
export const WarningPanel: React.FC<WarningPanelProps> = ({
  gameState,
  onAction,
  onDismiss
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasNewCritical, setHasNewCritical] = useState(false);
  
  const warnings = gameState.activeWarnings || [];
  const warningSystem = getWarningSystem();
  const counts = warningSystem.getWarningCounts(gameState);
  
  // Sort warnings by severity (critical first, then warning, then info)
  const sortedWarnings = [...warnings].sort((a, b) => {
    const severityOrder: Record<WarningSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2
    };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  // Listen for critical warnings
  useEffect(() => {
    const handleCriticalWarning = () => {
      setHasNewCritical(true);
      // Auto-expand on critical
      setIsExpanded(true);
      
      // Reset after animation
      setTimeout(() => setHasNewCritical(false), 2000);
    };
    
    const handleEscalated = () => {
      setHasNewCritical(true);
      setTimeout(() => setHasNewCritical(false), 2000);
    };
    
    window.addEventListener('game:warning_critical', handleCriticalWarning as EventListener);
    window.addEventListener('game:warning_escalated', handleEscalated as EventListener);
    
    return () => {
      window.removeEventListener('game:warning_critical', handleCriticalWarning as EventListener);
      window.removeEventListener('game:warning_escalated', handleEscalated as EventListener);
    };
  }, []);
  
  const handleAction = useCallback((warning: Warning) => {
    if (onAction) {
      onAction(warning.type, warning);
    }
  }, [onAction]);
  
  const handleDismiss = useCallback((warningId: string) => {
    if (onDismiss) {
      onDismiss(warningId);
    }
  }, [onDismiss]);
  
  // Determine badge color based on most severe warning
  const getBadgeColor = (): string => {
    if (counts.critical > 0) return '#ff4444';
    if (counts.warning > 0) return '#ffaa00';
    if (counts.info > 0) return '#4488ff';
    return '#666666';
  };
  
  // Don't render if no warnings
  if (counts.total === 0) {
    return null;
  }
  
  return (
    <div className={`warning-panel ${isExpanded ? 'expanded' : 'collapsed'} ${hasNewCritical ? 'pulse-critical' : ''}`}>
      {/* Collapsed State - Icon with Badge */}
      <div 
        className="warning-panel-toggle"
        onClick={() => setIsExpanded(!isExpanded)}
        title={`${counts.total} active warning${counts.total !== 1 ? 's' : ''}`}
      >
        <span className="warning-panel-icon">
          {counts.critical > 0 ? '🚨' : counts.warning > 0 ? '⚠️' : 'ℹ️'}
        </span>
        <span 
          className="warning-badge"
          style={{ backgroundColor: getBadgeColor() }}
        >
          {counts.total}
        </span>
        <span className="warning-toggle-arrow">
          {isExpanded ? '▼' : '▲'}
        </span>
      </div>
      
      {/* Expanded State - Warning List */}
      {isExpanded && (
        <div className="warning-panel-content">
          <div className="warning-panel-header">
            <h3>Active Warnings</h3>
            <div className="warning-counts">
              {counts.critical > 0 && (
                <span className="count-badge critical">{counts.critical} Critical</span>
              )}
              {counts.warning > 0 && (
                <span className="count-badge warning">{counts.warning} Warning</span>
              )}
              {counts.info > 0 && (
                <span className="count-badge info">{counts.info} Info</span>
              )}
            </div>
          </div>
          
          <div className="warning-list">
            {sortedWarnings.map(warning => (
              <WarningCard
                key={warning.id}
                warning={warning}
                onAction={() => handleAction(warning)}
                onDismiss={() => handleDismiss(warning.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WarningPanel;
