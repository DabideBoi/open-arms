import React from 'react';
import './Toolbar.css';

export type ToolbarPanel = 'build' | 'management' | 'reports';

interface ToolbarProps {
  active: ToolbarPanel | null;
  alertCount: number;
  alertLevel: 'critical' | 'warning' | 'info' | null;
  onSelect: (panel: ToolbarPanel) => void;
}

const ITEMS: { id: ToolbarPanel; label: string }[] = [
  { id: 'build', label: 'Build' },
  { id: 'management', label: 'Manage' },
  { id: 'reports', label: 'Reports' },
];

/** The one bar of buttons that opens every panel; only one panel is open at a time. */
export const Toolbar: React.FC<ToolbarProps> = ({ active, alertCount, alertLevel, onSelect }) => (
  <nav className="toolbar" aria-label="Main menu">
    {ITEMS.map(item => (
      <button
        key={item.id}
        className={`toolbar-button ${active === item.id ? 'active' : ''}`}
        aria-pressed={active === item.id}
        onClick={() => onSelect(item.id)}
      >
        {item.label}
        {item.id === 'reports' && alertCount > 0 && (
          <span className={`toolbar-badge ${alertLevel ?? 'info'}`} aria-label={`${alertCount} alerts`}>
            {alertCount}
          </span>
        )}
      </button>
    ))}
  </nav>
);
