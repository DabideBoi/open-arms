import React from 'react';
import { GameState, Resident } from '../types';
import { isResidentFatigued, getResidentFatigueRemaining, getFatigueDurationForProfile } from '../game/systems/FundraiserSystem';
import { residentFrame, CHARS_SHEET_COLUMNS } from '../constants/roomLooks';
import { PROFILE_SPECS } from '../constants';
import './ManagementPanel.css'; // .resident-detail-item / .stat-bar styles

// chars.png: 16px frames + 1px gap, shown at 2x
const SPRITE_STEP = 17 * 2;
const SPRITE_SHEET_SIZE = `${918 * 2}px ${203 * 2}px`;
const SPRITE_URL = `url(${import.meta.env.BASE_URL}assets/kenney/chars.png)`;

const ResidentSprite: React.FC<{ id: string; gender?: 'male' | 'female' }> = ({ id, gender }) => {
  const f = residentFrame(id, gender);
  return (
    <span
      className="resident-sprite"
      aria-hidden="true"
      style={{
        backgroundImage: SPRITE_URL,
        backgroundSize: SPRITE_SHEET_SIZE,
        backgroundPosition: `-${(f % CHARS_SHEET_COLUMNS) * SPRITE_STEP}px -${Math.floor(f / CHARS_SHEET_COLUMNS) * SPRITE_STEP}px`,
      }}
    />
  );
};
const GENDER_ICONS: Record<string, string> = { male: '♂', female: '♀' };

interface ResidentCardProps {
  resident: Resident;
  gameState: GameState;
}

/** One resident's stats: shared by the Management panel list and the click-to-inspect popup */
export const ResidentCard: React.FC<ResidentCardProps> = ({ resident, gameState }) => {
  const inFundraiser = gameState.activeFundraisers?.some(f => f.assignedResidents.includes(resident.id));
  const fatigued = isResidentFatigued(resident);
  const fatigueMs = getResidentFatigueRemaining(resident);
  const energy = fatigued ? Math.max(0, Math.min(100, (1 - fatigueMs / getFatigueDurationForProfile(resident.profile)) * 100)) : 100;

  return (
    <div className="resident-detail-item">
      <div className="resident-header">
        <span className="resident-name">
          <ResidentSprite id={resident.id} gender={resident.gender} />
          {resident.name}
          {resident.gender && ` ${GENDER_ICONS[resident.gender]}`}
        </span>
        <span className="resident-profile">
          {PROFILE_SPECS[resident.profile]?.icon} {PROFILE_SPECS[resident.profile]?.displayName ?? resident.profile}
        </span>
      </div>
      <div className="resident-stats">
        <div className="stat">
          <span>❤️ Health:</span>
          <div className="stat-bar">
            <div className="stat-bar-fill health" style={{ width: `${resident.health}%` }} />
          </div>
          <span>{Math.floor(resident.health)}%</span>
        </div>
        <div className="stat">
          <span>📈 LIFE:</span>
          <div className="stat-bar">
            <div className="stat-bar-fill life" style={{ width: `${resident.lifeMeter}%` }} />
          </div>
          <span>{Math.floor(resident.lifeMeter)}%</span>
        </div>
        <div className="stat">
          <span>😴 Energy:</span>
          <div className="stat-bar">
            <div className="stat-bar-fill energy" style={{ width: `${energy}%` }} />
          </div>
          <span>{fatigued ? `${Math.ceil(fatigueMs / 1000)}s` : 'Rested'}</span>
        </div>
      </div>
      <div className="resident-status">
        <span>Status: {resident.currentState}</span>
        <span>Day {resident.daysInShelter} in shelter</span>
        {inFundraiser && <span className="status-badge">🎪 In Fundraiser</span>}
      </div>
    </div>
  );
};
