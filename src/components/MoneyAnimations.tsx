import React, { useState, useEffect, useCallback, useRef } from 'react';
import './MoneyAnimations.css';

// ============================================================================
// Types
// ============================================================================

export interface MoneyChange {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  source: string;
  icon: string;
  timestamp: number;
}

export interface MoneyChangeEvent {
  amount: number;
  source: string;
  icon?: string;
  type?: 'income' | 'expense';
}

// ============================================================================
// Constants
// ============================================================================

const MAX_VISIBLE_ANIMATIONS = 5;
const ANIMATION_DURATION = 1500; // 1.5 seconds

// Source to icon mapping
const SOURCE_ICONS: Record<string, string> = {
  'Donation': '💰',
  'Fundraiser': '🎪',
  'Disaster Aid': '🆘',
  'Food': '🍽️',
  'Maintenance': '🔧',
  'Operating Costs': '🏢',
  'Emergency': '⚠️',
  'Random Event': '❓',
  'Offline': '💤',
};

// ============================================================================
// Utility Functions
// ============================================================================

let idCounter = 0;
const generateId = (): string => {
  idCounter += 1;
  return `money-change-${Date.now()}-${idCounter}`;
};

const getIconForSource = (source: string): string => {
  // Check for exact match first
  if (SOURCE_ICONS[source]) {
    return SOURCE_ICONS[source];
  }
  
  // Check for partial matches
  const lowerSource = source.toLowerCase();
  if (lowerSource.includes('donation')) return '💰';
  if (lowerSource.includes('fundraiser')) return '🎪';
  if (lowerSource.includes('disaster') || lowerSource.includes('aid')) return '🆘';
  if (lowerSource.includes('food')) return '🍽️';
  if (lowerSource.includes('maintenance')) return '🔧';
  if (lowerSource.includes('operating')) return '🏢';
  if (lowerSource.includes('emergency')) return '⚠️';
  if (lowerSource.includes('offline')) return '💤';
  
  // Default icons based on type
  return source.startsWith('-') ? '💸' : '💵';
};

// ============================================================================
// MoneyChangeFloat Component - Single floating animation
// ============================================================================

interface MoneyChangeFloatProps {
  change: MoneyChange;
  index: number;
  onComplete: (id: string) => void;
}

const MoneyChangeFloat: React.FC<MoneyChangeFloatProps> = ({ change, index, onComplete }) => {
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    // Start exit animation after duration minus fade time
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, ANIMATION_DURATION - 300);
    
    // Remove from list after full animation
    const removeTimer = setTimeout(() => {
      onComplete(change.id);
    }, ANIMATION_DURATION);
    
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [change.id, onComplete]);
  
  const isIncome = change.type === 'income';
  const formattedAmount = isIncome 
    ? `+$${Math.abs(change.amount).toLocaleString()}`
    : `-$${Math.abs(change.amount).toLocaleString()}`;
  
  return (
    <div 
      className={`money-change-float ${isIncome ? 'income' : 'expense'} ${isExiting ? 'exiting' : ''}`}
      style={{ '--stack-index': index } as React.CSSProperties}
    >
      <span className="money-change-amount">{formattedAmount}</span>
      <span className="money-change-icon">{change.icon}</span>
      <span className="money-change-source">{change.source}</span>
    </div>
  );
};

// ============================================================================
// MoneyAnimationOverlay Component - Container for all animations
// ============================================================================

export const MoneyAnimationOverlay: React.FC = () => {
  const [changes, setChanges] = useState<MoneyChange[]>([]);
  
  const handleMoneyChange = useCallback((event: CustomEvent<MoneyChangeEvent>) => {
    const { amount, source, icon, type } = event.detail;
    
    const changeType = type || (amount >= 0 ? 'income' : 'expense');
    const changeIcon = icon || getIconForSource(source);
    
    const change: MoneyChange = {
      id: generateId(),
      amount: Math.abs(amount),
      type: changeType,
      source,
      icon: changeIcon,
      timestamp: Date.now()
    };
    
    setChanges(prev => {
      // Keep only last MAX_VISIBLE_ANIMATIONS - 1 to make room for new one
      const recent = prev.slice(-(MAX_VISIBLE_ANIMATIONS - 1));
      return [...recent, change];
    });
  }, []);
  
  const handleComplete = useCallback((id: string) => {
    setChanges(prev => prev.filter(c => c.id !== id));
  }, []);
  
  // Subscribe to money change events
  useEffect(() => {
    window.addEventListener('game:money_change' as any, handleMoneyChange);
    
    return () => {
      window.removeEventListener('game:money_change' as any, handleMoneyChange);
    };
  }, [handleMoneyChange]);
  
  if (changes.length === 0) {
    return null;
  }
  
  return (
    <div className="money-animation-overlay">
      {changes.map((change, index) => (
        <MoneyChangeFloat 
          key={change.id} 
          change={change} 
          index={index}
          onComplete={handleComplete}
        />
      ))}
    </div>
  );
};

// ============================================================================
// useMoneyAnimation Hook - For programmatic triggering
// ============================================================================

export const useMoneyAnimation = () => {
  const triggerMoneyChange = useCallback((
    amount: number,
    source: string,
    icon?: string,
    type?: 'income' | 'expense'
  ) => {
    const event = new CustomEvent('game:money_change', {
      detail: { amount, source, icon, type }
    });
    window.dispatchEvent(event);
  }, []);
  
  const triggerIncome = useCallback((amount: number, source: string, icon?: string) => {
    triggerMoneyChange(amount, source, icon, 'income');
  }, [triggerMoneyChange]);
  
  const triggerExpense = useCallback((amount: number, source: string, icon?: string) => {
    triggerMoneyChange(-amount, source, icon, 'expense');
  }, [triggerMoneyChange]);
  
  return {
    triggerMoneyChange,
    triggerIncome,
    triggerExpense
  };
};

// ============================================================================
// AnimatedMoneyDisplay Component - For HUD number counting effect
// ============================================================================

interface AnimatedMoneyDisplayProps {
  value: number;
  duration?: number;
  className?: string;
  warningLevel?: 'normal' | 'low' | 'debt' | 'critical';
  onPulse?: (type: 'income' | 'expense', isLarge: boolean) => void;
}

export const AnimatedMoneyDisplay: React.FC<AnimatedMoneyDisplayProps> = ({
  value,
  duration = 500,
  className = '',
  warningLevel = 'normal',
  onPulse
}) => {
  const [displayValue, setDisplayValue] = useState(value);
  const [pulseClass, setPulseClass] = useState('');
  const previousValueRef = useRef(value);
  const animationRef = useRef<number | null>(null);
  
  useEffect(() => {
    const previousValue = previousValueRef.current;
    const difference = value - previousValue;
    
    if (difference === 0) return;
    
    // Trigger pulse effect
    const isIncome = difference > 0;
    const isLarge = Math.abs(difference) > 200;
    const newPulseClass = isIncome 
      ? (isLarge ? 'pulse-income-large' : 'pulse-income')
      : (isLarge ? 'pulse-expense-large' : 'pulse-expense');
    
    setPulseClass(newPulseClass);
    onPulse?.(isIncome ? 'income' : 'expense', isLarge);
    
    // Clear pulse after animation
    const pulseTimeout = setTimeout(() => {
      setPulseClass('');
    }, 600);
    
    // Animate the number counting
    const startTime = performance.now();
    const startValue = previousValue;
    const endValue = value;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = Math.round(startValue + (endValue - startValue) * eased);
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
      }
    };
    
    animationRef.current = requestAnimationFrame(animate);
    previousValueRef.current = value;
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(pulseTimeout);
    };
  }, [value, duration, onPulse]);
  
  // Warning classes based on threshold
  const warningClass = warningLevel !== 'normal' ? `money-warning-${warningLevel}` : '';
  
  // Color based on warning level
  const getColor = () => {
    switch (warningLevel) {
      case 'critical': return '#ff0000';
      case 'debt': return '#ff4444';
      case 'low': return '#ffcc00';
      default: return '#ffffff';
    }
  };
  
  return (
    <span 
      className={`animated-money-display ${className} ${pulseClass} ${warningClass}`}
      style={{ color: getColor() }}
    >
      ${displayValue.toLocaleString()}
      {warningLevel === 'critical' && ' ⚠️'}
      {warningLevel === 'debt' && ' ⚡'}
    </span>
  );
};

// ============================================================================
// Emit money change event helper (for use in systems)
// ============================================================================

export const emitMoneyChange = (
  amount: number,
  source: string,
  icon?: string,
  type?: 'income' | 'expense'
) => {
  const event = new CustomEvent('game:money_change', {
    detail: { 
      amount, 
      source, 
      icon,
      type: type || (amount >= 0 ? 'income' : 'expense')
    }
  });
  window.dispatchEvent(event);
};

export default MoneyAnimationOverlay;
