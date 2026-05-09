import React from 'react';
import { FundraiserCompletionData } from '../game/systems/FundraiserSystem';
import './FundraiserCompleteModal.css';

interface FundraiserCompleteModalProps {
  data: FundraiserCompletionData | null;
  onClose: () => void;
}

/**
 * Modal that displays when a fundraiser completes
 * Shows details about who participated, money raised, and outcomes
 */
export function FundraiserCompleteModal({ data, onClose }: FundraiserCompleteModalProps) {
  if (!data) return null;
  
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    return `${hours}h ${remainingMinutes}m`;
  };
  
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };
  
  const successPercentage = Math.round(data.successChance * 100);
  const rollPercentage = Math.round(data.successRoll * 100);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className={`modal fundraiser-complete-modal ${data.success ? 'success' : 'failure'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`fundraiser-modal-header ${data.success ? 'success-header' : 'failure-header'}`}>
          <h2 className="fundraiser-modal-title">
            {data.success ? '🎉 Fundraiser Complete!' : '😔 Fundraiser Failed'}
          </h2>
          <div className="fundraiser-result-icon">
            {data.success ? '✅' : '❌'}
          </div>
        </div>
        
        {/* Main Content */}
        <div className="fundraiser-modal-content">
          {/* Money Raised Section */}
          <div className={`fundraiser-money-section ${data.success ? 'money-success' : 'money-failure'}`}>
            <div className="money-label">
              {data.success ? 'Money Raised' : 'Money Earned'}
            </div>
            <div className="money-amount">
              ${data.payout.toLocaleString()}
            </div>
            {data.success && data.payout !== data.expectedPayout && (
              <div className="money-comparison">
                {data.payout > data.expectedPayout ? (
                  <span className="above-expected">
                    +${(data.payout - data.expectedPayout).toLocaleString()} above expected!
                  </span>
                ) : (
                  <span className="below-expected">
                    (Expected: ${data.expectedPayout.toLocaleString()})
                  </span>
                )}
              </div>
            )}
          </div>
          
          {/* Details Grid */}
          <div className="fundraiser-details-grid">
            {/* Who participated */}
            <div className="detail-card">
              <div className="detail-header">
                <span className="detail-icon">👥</span>
                <span className="detail-label">Participants</span>
              </div>
              <div className="detail-value participant-count">
                {data.participantCount} resident{data.participantCount !== 1 ? 's' : ''}
              </div>
              <div className="participant-names">
                {data.participantNames.map((name, index) => (
                  <span key={index} className="participant-name">
                    {name}
                  </span>
                ))}
              </div>
            </div>
            
            {/* Duration */}
            <div className="detail-card">
              <div className="detail-header">
                <span className="detail-icon">⏱️</span>
                <span className="detail-label">Duration</span>
              </div>
              <div className="detail-value">
                {formatDuration(data.duration)}
              </div>
              <div className="detail-subtext">
                Completed at {formatTime(data.completedAt)}
              </div>
            </div>
            
            {/* Success Chance */}
            <div className="detail-card">
              <div className="detail-header">
                <span className="detail-icon">🎯</span>
                <span className="detail-label">Success Chance</span>
              </div>
              <div className="detail-value">
                {successPercentage}%
              </div>
              <div className="roll-info">
                <span className="roll-label">Roll:</span>
                <span className={`roll-value ${data.success ? 'roll-success' : 'roll-failure'}`}>
                  {rollPercentage}%
                </span>
              </div>
            </div>
            
            {/* Reputation */}
            <div className="detail-card">
              <div className="detail-header">
                <span className="detail-icon">⭐</span>
                <span className="detail-label">Reputation</span>
              </div>
              <div className={`detail-value ${data.reputationChange > 0 ? 'positive' : 'negative'}`}>
                {data.reputationChange > 0 ? '+' : ''}{data.reputationChange}
              </div>
              <div className="detail-subtext">
                {data.success ? 'Community impressed!' : 'Public disappointment'}
              </div>
            </div>
          </div>
          
          {/* Outcome Message */}
          <div className={`outcome-message ${data.success ? 'outcome-success' : 'outcome-failure'}`}>
            {data.success ? (
              <p>
                🎊 Great job! Your residents worked hard and successfully raised funds for the shelter. 
                They'll need some rest before participating in another fundraiser.
              </p>
            ) : (
              <p>
                💔 Unfortunately, the fundraiser didn't go as planned. 
                Don't worry - the residents tried their best. 
                Focus on improving their happiness for better results next time!
              </p>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="fundraiser-modal-footer">
          <button className="btn-close-modal" onClick={onClose}>
            {data.success ? '🎉 Celebrate!' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
