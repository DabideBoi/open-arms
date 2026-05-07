import React, { useState, useEffect } from 'react';
import { GameEvent, EventOption } from '../game/systems/EventSystem';
import './EventModal.css';

interface EventModalProps {
  event: GameEvent | null;
  onResolve: (optionIndex: number) => void;
  onClose?: () => void;
}

export function EventModal({ event, onResolve, onClose }: EventModalProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  
  useEffect(() => {
    if (!event || !event.expiresAt) return;
    
    const updateTimer = () => {
      const remaining = event.expiresAt! - Date.now();
      
      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }
      
      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [event]);
  
  if (!event) return null;
  
  const handleConfirm = () => {
    if (selectedOption !== null) {
      onResolve(selectedOption);
      setSelectedOption(null);
    }
  };
  
  const getEffectIcon = (effectType: string): string => {
    switch (effectType) {
      case 'money': return '💰';
      case 'reputation': return '⭐';
      case 'add_residents': return '👥';
      case 'happiness_modifier': return '😊';
      case 'maintenance_discount': return '🔧';
      default: return '📋';
    }
  };
  
  const getEffectText = (effect: any): string => {
    switch (effect.type) {
      case 'money':
        return `${effect.value > 0 ? '+' : ''}$${effect.value}`;
      case 'reputation':
        return `${effect.value > 0 ? '+' : ''}${effect.value} reputation`;
      case 'add_residents':
        return `+${effect.value} residents`;
      case 'happiness_modifier':
        return `${effect.value > 0 ? '+' : ''}${effect.value} happiness for ${effect.duration}min`;
      case 'maintenance_discount':
        return `${effect.value}% off maintenance for ${effect.duration}min`;
      default:
        return 'Unknown effect';
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-modal-header">
          <h2 className="event-title">🎯 {event.title}</h2>
          {event.expiresAt && (
            <div className="event-timer">
              ⏱️ {timeRemaining}
            </div>
          )}
        </div>
        
        <div className="event-description">
          <p>{event.description}</p>
        </div>
        
        <div className="event-options">
          {event.options.map((option, index) => (
            <button
              key={index}
              className={`event-option ${selectedOption === index ? 'selected' : ''}`}
              onClick={() => setSelectedOption(index)}
            >
              <div className="option-label">{option.label}</div>
              {option.effects.length > 0 && (
                <div className="option-effects">
                  {option.effects.map((effect, i) => (
                    <span key={i} className={`effect-badge ${effect.value < 0 ? 'negative' : 'positive'}`}>
                      {getEffectIcon(effect.type)} {getEffectText(effect)}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
        
        <div className="event-modal-actions">
          <button 
            className="btn-confirm"
            onClick={handleConfirm}
            disabled={selectedOption === null}
          >
            Confirm Choice
          </button>
        </div>
      </div>
    </div>
  );
}
