import React, { useState, useEffect } from 'react';
import { ActiveDisasterEvent, DisasterEventConfig } from '../types';
import { DISASTER_CONFIG } from '../constants';
import './DisasterModal.css';

interface DisasterModalProps {
  disaster: ActiveDisasterEvent | null;
  currentResidentCount: number;
  tierCap: number;
  onAccept: () => void;
  onDecline: () => void;
  onPartialAccept: (count: number) => void;
}

export function DisasterModal({ 
  disaster, 
  currentResidentCount,
  tierCap,
  onAccept, 
  onDecline, 
  onPartialAccept 
}: DisasterModalProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [isUrgent, setIsUrgent] = useState<boolean>(false);
  const [partialCount, setPartialCount] = useState<number>(1);
  const [showPartialOptions, setShowPartialOptions] = useState<boolean>(false);
  
  useEffect(() => {
    if (!disaster) return;
    
    const updateTimer = () => {
      const remaining = disaster.expiresAt - Date.now();
      
      if (remaining <= 0) {
        setTimeRemaining('EXPIRED');
        setIsUrgent(true);
        return;
      }
      
      // Mark as urgent when less than 30 seconds remain
      setIsUrgent(remaining < 30000);
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [disaster]);
  
  // Reset partial count when disaster changes
  useEffect(() => {
    if (disaster) {
      setPartialCount(Math.ceil(disaster.config.residentSurge / 2));
      setShowPartialOptions(false);
    }
  }, [disaster?.id]);
  
  if (!disaster || disaster.resolved) return null;
  
  const config = disaster.config;
  const overflowCap = Math.floor(tierCap * DISASTER_CONFIG.OVERFLOW_MULTIPLIER);
  const availableSpace = overflowCap - currentResidentCount;
  const canAcceptAll = availableSpace >= config.residentSurge;
  const canAcceptPartial = availableSpace > 0 && availableSpace < config.residentSurge;
  const showPartialOption = config.residentSurge >= DISASTER_CONFIG.PARTIAL_ACCEPT_THRESHOLD;
  
  const getUrgencyLabel = () => {
    switch (config.urgency) {
      case 'immediate': return '🔴 IMMEDIATE';
      case '24hours': return '🟠 URGENT';
      case 'week': return '🟢 TIME AVAILABLE';
    }
  };
  
  const getUrgencyClass = () => {
    switch (config.urgency) {
      case 'immediate': return 'urgency-immediate';
      case '24hours': return 'urgency-24hours';
      case 'week': return 'urgency-week';
    }
  };
  
  const handleAccept = () => {
    if (canAcceptAll) {
      onAccept();
    } else if (canAcceptPartial) {
      // Auto-accept what we can
      onPartialAccept(availableSpace);
    }
  };
  
  const handlePartialAccept = () => {
    onPartialAccept(partialCount);
    setShowPartialOptions(false);
  };
  
  const calculatePartialReputation = (count: number) => {
    const proportion = count / config.residentSurge;
    return Math.floor(config.reputationGainAccept * proportion);
  };
  
  const calculatePartialDonation = (count: number) => {
    const proportion = count / config.residentSurge;
    return Math.floor(config.donationBonus * proportion);
  };
  
  return (
    <div className="disaster-modal-overlay">
      <div className={`disaster-modal ${getUrgencyClass()} ${isUrgent ? 'pulse' : ''}`}>
        {/* Header with urgency indicator */}
        <div className="disaster-header">
          <div className="disaster-urgency">
            {getUrgencyLabel()}
          </div>
          <div className={`disaster-timer ${isUrgent ? 'urgent' : ''}`}>
            ⏱️ {timeRemaining}
          </div>
        </div>
        
        {/* Title */}
        <h2 className="disaster-title">
          🚨 {config.title}
        </h2>
        
        {/* Description */}
        <div className="disaster-description">
          <p>{config.description}</p>
        </div>
        
        {/* Stats */}
        <div className="disaster-stats">
          <div className="stat-item">
            <span className="stat-icon">👥</span>
            <span className="stat-label">People Needing Help:</span>
            <span className="stat-value">{config.residentSurge}</span>
          </div>
          <div className="stat-item">
            <span className="stat-icon">🏠</span>
            <span className="stat-label">Available Space:</span>
            <span className={`stat-value ${availableSpace < config.residentSurge ? 'warning' : ''}`}>
              {availableSpace} / {overflowCap} (overflow)
            </span>
          </div>
          <div className="stat-item positive">
            <span className="stat-icon">⭐</span>
            <span className="stat-label">Reputation if Accept:</span>
            <span className="stat-value">+{config.reputationGainAccept}</span>
          </div>
          <div className="stat-item positive">
            <span className="stat-icon">💰</span>
            <span className="stat-label">Community Donation:</span>
            <span className="stat-value">+${config.donationBonus}</span>
          </div>
          {config.happinessImpact !== 0 && (
            <div className="stat-item warning">
              <span className="stat-icon">😟</span>
              <span className="stat-label">Happiness Impact:</span>
              <span className="stat-value">{config.happinessImpact}</span>
            </div>
          )}
          {config.securityRequired && (
            <div className="stat-item warning">
              <span className="stat-icon">🔒</span>
              <span className="stat-label">Security Cost:</span>
              <span className="stat-value">-${config.residentSurge * DISASTER_CONFIG.SECURITY_COST_PER_RESIDENT}</span>
            </div>
          )}
          {config.medicalCosts && (
            <div className="stat-item warning">
              <span className="stat-icon">🏥</span>
              <span className="stat-label">Medical Costs:</span>
              <span className="stat-value">-${config.residentSurge * config.medicalCosts}</span>
            </div>
          )}
          {config.maintenanceSurge && (
            <div className="stat-item warning">
              <span className="stat-icon">🔧</span>
              <span className="stat-label">Maintenance Surge:</span>
              <span className="stat-value">+{((config.maintenanceSurge - 1) * 100).toFixed(0)}%</span>
            </div>
          )}
          {config.lifeBoost && (
            <div className="stat-item positive">
              <span className="stat-icon">✨</span>
              <span className="stat-label">Motivated Residents:</span>
              <span className="stat-value">Faster recovery</span>
            </div>
          )}
        </div>
        
        {/* Capacity Warning */}
        {!canAcceptAll && (
          <div className="disaster-warning">
            ⚠️ {canAcceptPartial 
              ? `You can only accept ${availableSpace} of ${config.residentSurge} people due to capacity limits.`
              : 'Your shelter is at maximum capacity!'}
          </div>
        )}
        
        {/* Partial Accept Options */}
        {showPartialOptions && showPartialOption && canAcceptAll && (
          <div className="partial-accept-panel">
            <h3>Accept Some Residents</h3>
            <div className="partial-slider">
              <input
                type="range"
                min={1}
                max={config.residentSurge - 1}
                value={partialCount}
                onChange={(e) => setPartialCount(parseInt(e.target.value))}
              />
              <span className="partial-count">{partialCount} of {config.residentSurge}</span>
            </div>
            <div className="partial-preview">
              <span>+{calculatePartialReputation(partialCount)} reputation</span>
              <span>+${calculatePartialDonation(partialCount)} donation</span>
            </div>
            <div className="partial-actions">
              <button className="btn-partial-confirm" onClick={handlePartialAccept}>
                Accept {partialCount} People
              </button>
              <button className="btn-cancel" onClick={() => setShowPartialOptions(false)}>
                Back
              </button>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        {!showPartialOptions && (
          <div className="disaster-actions">
            <button 
              className="btn-accept"
              onClick={handleAccept}
              disabled={!canAcceptAll && !canAcceptPartial}
            >
              {canAcceptAll 
                ? `✅ Accept All (${config.residentSurge} people)`
                : canAcceptPartial
                  ? `✅ Accept ${availableSpace} (max capacity)`
                  : '❌ No Space Available'}
            </button>
            
            {showPartialOption && canAcceptAll && (
              <button 
                className="btn-partial"
                onClick={() => setShowPartialOptions(true)}
              >
                Accept Some...
              </button>
            )}
            
            <button 
              className="btn-decline"
              onClick={onDecline}
            >
              ❌ Decline (-{config.reputationLossDecline} reputation)
            </button>
          </div>
        )}
        
        {/* Decline Consequence Preview */}
        <div className="disaster-consequence">
          <small>
            If declined: {config.residentSurge} people will find help elsewhere, 
            but your reputation will suffer.
          </small>
        </div>
      </div>
    </div>
  );
}
