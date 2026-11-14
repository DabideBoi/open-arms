import React, { useEffect } from 'react';
import { GameState, Warning, FoodPortionSetting } from '../types';
import { WarningPanel } from './WarningPanel';
import { StatisticsModal } from './StatisticsModal';
import { EconomicDashboard } from './EconomicDashboard';
import './ReportsPanel.css';

export type ReportsTab = 'alerts' | 'stats' | 'finances';

interface ReportsPanelProps {
  gameState: GameState;
  tab: ReportsTab;
  onTab: (tab: ReportsTab) => void;
  onClose: () => void;
  onChangeFoodSetting?: (setting: FoodPortionSetting) => void;
  onWarningAction: (actionType: string, warning: Warning) => void;
  onWarningDismiss: (warningId: string) => void;
}

const TABS: { id: ReportsTab; label: string }[] = [
  { id: 'alerts', label: 'Alerts' },
  { id: 'stats', label: 'Stats' },
  { id: 'finances', label: 'Finances' },
];

/** One tabbed panel that replaces the separate warning list, statistics modal and finance dashboard. */
export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  gameState, tab, onTab, onClose, onChangeFoodSetting, onWarningAction, onWarningDismiss,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <section className="reports-panel" role="dialog" aria-label="Reports">
      <header className="reports-header">
        <div className="reports-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              className={`reports-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => onTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <button className="reports-close" onClick={onClose} aria-label="Close reports">×</button>
      </header>
      <div className="reports-body">
        {tab === 'alerts' && (
          <WarningPanel gameState={gameState} onAction={onWarningAction} onDismiss={onWarningDismiss} embedded />
        )}
        {tab === 'stats' && (
          <StatisticsModal isOpen onClose={onClose} gameState={gameState} onChangeFoodSetting={onChangeFoodSetting} embedded />
        )}
        {tab === 'finances' && <EconomicDashboard gameState={gameState} />}
      </div>
    </section>
  );
};
