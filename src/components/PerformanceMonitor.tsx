import React, { useState, useEffect } from 'react';
import './PerformanceMonitor.css';
import { getPathfindingStats } from '../game/systems/PathfindingSystem';

/**
 * Performance monitoring dashboard (F3 to toggle)
 */

interface PerformanceMonitorProps {
  scene: any; // MainScene instance
  gameState: any;
}

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memory: number;
  residentCount: number;
  roomCount: number;
  visibleResidents: number;
  pathfindingCache: {
    size: number;
    hits: number;
    misses: number;
    hitRate: number;
  };
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ scene, gameState }) => {
  const [visible, setVisible] = useState(false);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    frameTime: 16.67,
    memory: 0,
    residentCount: 0,
    roomCount: 0,
    visibleResidents: 0,
    pathfindingCache: {
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0
    }
  });

  // Toggle visibility with F3 or ~ key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F3' || e.key === '~' || e.key === '`') {
        e.preventDefault();
        setVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Update metrics every second
  useEffect(() => {
    if (!visible) return;

    const updateMetrics = () => {
      try {
        // Get scene performance stats
        const sceneStats = scene?.getPerformanceStats?.() || {};
        
        // Get pathfinding stats
        const pathStats = getPathfindingStats();
        
        // Get memory usage (if available)
        const memory = (performance as any).memory?.usedJSHeapSize || 0;
        
        setMetrics({
          fps: sceneStats.fps || 60,
          frameTime: sceneStats.frameTime || 16.67,
          memory: memory / (1024 * 1024), // Convert to MB
          residentCount: gameState?.residents?.length || 0,
          roomCount: gameState?.rooms?.length || 0,
          visibleResidents: sceneStats.visibleResidents || 0,
          pathfindingCache: {
            size: pathStats.cacheSize,
            hits: pathStats.hits,
            misses: pathStats.misses,
            hitRate: pathStats.hitRate
          }
        });
      } catch (error) {
        console.error('Failed to update performance metrics:', error);
      }
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, [visible, scene, gameState]);

  if (!visible) return null;

  const getFPSColor = (fps: number): string => {
    if (fps >= 55) return '#00ff00';
    if (fps >= 30) return '#ffff00';
    return '#ff0000';
  };

  const getMemoryColor = (mb: number): string => {
    if (mb < 50) return '#00ff00';
    if (mb < 100) return '#ffff00';
    return '#ff0000';
  };

  return (
    <div className="performance-monitor">
      <div className="performance-header">
        <h3>Performance Monitor</h3>
        <span className="performance-hint">Press F3 or ~ to toggle</span>
      </div>

      <div className="performance-section">
        <h4>Frame Rate</h4>
        <div className="metric">
          <span className="metric-label">FPS:</span>
          <span className="metric-value" style={{ color: getFPSColor(metrics.fps) }}>
            {metrics.fps.toFixed(1)}
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Frame Time:</span>
          <span className="metric-value">
            {metrics.frameTime.toFixed(2)}ms
          </span>
        </div>
      </div>

      <div className="performance-section">
        <h4>Memory</h4>
        <div className="metric">
          <span className="metric-label">Heap Used:</span>
          <span className="metric-value" style={{ color: getMemoryColor(metrics.memory) }}>
            {metrics.memory.toFixed(2)} MB
          </span>
        </div>
      </div>

      <div className="performance-section">
        <h4>Game Objects</h4>
        <div className="metric">
          <span className="metric-label">Residents:</span>
          <span className="metric-value">{metrics.residentCount}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Visible:</span>
          <span className="metric-value">{metrics.visibleResidents}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Rooms:</span>
          <span className="metric-value">{metrics.roomCount}</span>
        </div>
      </div>

      <div className="performance-section">
        <h4>Pathfinding Cache</h4>
        <div className="metric">
          <span className="metric-label">Cache Size:</span>
          <span className="metric-value">{metrics.pathfindingCache.size}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Hit Rate:</span>
          <span className="metric-value">
            {metrics.pathfindingCache.hitRate.toFixed(1)}%
          </span>
        </div>
        <div className="metric">
          <span className="metric-label">Hits:</span>
          <span className="metric-value">{metrics.pathfindingCache.hits}</span>
        </div>
        <div className="metric">
          <span className="metric-label">Misses:</span>
          <span className="metric-value">{metrics.pathfindingCache.misses}</span>
        </div>
      </div>

      <div className="performance-section">
        <h4>Performance Targets</h4>
        <div className="metric">
          <span className="metric-label">Target FPS:</span>
          <span className="metric-value">60</span>
        </div>
        <div className="metric">
          <span className="metric-label">Min FPS:</span>
          <span className="metric-value">30</span>
        </div>
        <div className="metric">
          <span className="metric-label">Max Memory:</span>
          <span className="metric-value">100 MB</span>
        </div>
      </div>
    </div>
  );
};
