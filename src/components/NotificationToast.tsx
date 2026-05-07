import React, { useState, useEffect } from 'react';
import './NotificationToast.css';

export type NotificationType = 'success' | 'warning' | 'info' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration?: number;
}

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  useEffect(() => {
    const duration = notification.duration || 5000;
    const timer = setTimeout(() => {
      onDismiss(notification.id);
    }, duration);
    
    return () => clearTimeout(timer);
  }, [notification, onDismiss]);
  
  const getIcon = (): string => {
    switch (notification.type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'error': return '❌';
      default: return '📢';
    }
  };
  
  return (
    <div className={`notification-toast ${notification.type}`}>
      <span className="notification-icon">{getIcon()}</span>
      <span className="notification-message">{notification.message}</span>
      <button 
        className="notification-close"
        onClick={() => onDismiss(notification.id)}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

interface NotificationContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

export function NotificationContainer({ notifications, onDismiss }: NotificationContainerProps) {
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}

/**
 * Hook for managing notifications
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const addNotification = (message: string, type: NotificationType = 'info', duration?: number) => {
    const id = `notification-${Date.now()}-${Math.random()}`;
    const notification: Notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
  };
  
  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  useEffect(() => {
    const handleNotification = (event: CustomEvent) => {
      const { message, type } = event.detail;
      addNotification(message, type || 'info');
    };
    
    window.addEventListener('game:notification' as any, handleNotification);
    
    return () => {
      window.removeEventListener('game:notification' as any, handleNotification);
    };
  }, []);
  
  return {
    notifications,
    addNotification,
    dismissNotification
  };
}
