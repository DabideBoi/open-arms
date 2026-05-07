import React from 'react';
import { GameOverReason } from '../types';
import './GameOverModal.css';

interface GameStats {
  daysSurvived: number;
  residentsHelped: number;
  graduatedCount: number;
  moneyEarned: number;
  finalReputation: number;
  finalMoney: number;
}

interface GameOverModalProps {
  isVictory: boolean;
  stats: GameStats;
  gameOverReason?: GameOverReason;
  onRestart: () => void;
  onContinue?: () => void;
  onLoadSave?: () => void;
  hasSavedGame?: boolean;
}

/**
 * Get icon for game over reason
 */
function getGameOverIcon(reason: GameOverReason): string {
  switch (reason) {
    case 'bankruptcy':
      return '💸';
    case 'reputation':
      return '📉';
    case 'exodus':
      return '🚪';
    default:
      return '💔';
  }
}

/**
 * Get title for game over reason
 */
function getGameOverTitle(reason: GameOverReason): string {
  switch (reason) {
    case 'bankruptcy':
      return 'Bankruptcy';
    case 'reputation':
      return 'Reputation Collapsed';
    case 'exodus':
      return 'Mass Exodus';
    default:
      return 'Game Over';
  }
}

/**
 * Get message for game over reason
 */
function getGameOverMessage(reason: GameOverReason, stats: GameStats): string {
  switch (reason) {
    case 'bankruptcy':
      return `Your shelter went bankrupt with a final balance of $${stats.finalMoney.toLocaleString()}. Despite your best efforts, the financial burden was too much to bear. But remember, you still helped ${stats.residentsHelped} residents during your time!`;
    case 'reputation':
      return `Your shelter's reputation dropped to 0%. The community lost faith in your ability to run the shelter effectively. Despite this, you managed to help ${stats.residentsHelped} residents over ${stats.daysSurvived} days.`;
    case 'exodus':
      return `All residents have left your shelter. Without anyone to help, the shelter had no purpose. However, you made a difference by helping ${stats.residentsHelped} residents during your operation.`;
    default:
      return `Your shelter had to close. But you still made a difference by helping ${stats.residentsHelped} residents!`;
  }
}

export function GameOverModal({ 
  isVictory, 
  stats, 
  gameOverReason,
  onRestart, 
  onContinue,
  onLoadSave,
  hasSavedGame = false
}: GameOverModalProps) {
  return (
    <div className="modal-overlay">
      <div className={`modal game-end-modal ${isVictory ? 'victory' : 'game-over'}`}>
        <div className="game-end-header">
          {isVictory ? (
            <>
              <div className="trophy-icon">🏆</div>
              <h2>Victory!</h2>
              <p className="subtitle">You've built an amazing shelter!</p>
            </>
          ) : (
            <>
              <div className="game-over-icon">{getGameOverIcon(gameOverReason ?? null)}</div>
              <h2>{getGameOverTitle(gameOverReason ?? null)}</h2>
              <p className="subtitle">Your shelter has closed</p>
            </>
          )}
        </div>
        
        {/* Game Over Reason Banner */}
        {!isVictory && gameOverReason && (
          <div className={`game-over-reason game-over-reason-${gameOverReason}`}>
            <span className="reason-icon">{getGameOverIcon(gameOverReason)}</span>
            <span className="reason-text">
              {gameOverReason === 'bankruptcy' && 'Financial collapse after being in debt too long'}
              {gameOverReason === 'reputation' && 'Community lost all faith in your shelter'}
              {gameOverReason === 'exodus' && 'All residents left the shelter'}
            </span>
          </div>
        )}
        
        <div className="game-end-stats">
          <h3>📊 Final Statistics</h3>
          
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">📅</span>
              <div className="stat-content">
                <span className="stat-label">Days Survived</span>
                <span className="stat-value">{stats.daysSurvived}</span>
              </div>
            </div>
            
            <div className="stat-item">
              <span className="stat-icon">👥</span>
              <div className="stat-content">
                <span className="stat-label">Residents Helped</span>
                <span className="stat-value">{stats.residentsHelped}</span>
              </div>
            </div>
            
            <div className="stat-item highlight">
              <span className="stat-icon">🎓</span>
              <div className="stat-content">
                <span className="stat-label">Graduated</span>
                <span className="stat-value">{stats.graduatedCount}</span>
              </div>
            </div>
            
            <div className="stat-item">
              <span className="stat-icon">💰</span>
              <div className="stat-content">
                <span className="stat-label">Total Money Earned</span>
                <span className="stat-value">${stats.moneyEarned.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <div className="stat-content">
                <span className="stat-label">Final Reputation</span>
                <span className="stat-value" style={{ color: stats.finalReputation <= 20 ? '#ff4444' : undefined }}>
                  {stats.finalReputation}%
                </span>
              </div>
            </div>
            
            <div className="stat-item">
              <span className="stat-icon">🏦</span>
              <div className="stat-content">
                <span className="stat-label">Final Balance</span>
                <span className="stat-value" style={{ color: stats.finalMoney < 0 ? '#ff4444' : undefined }}>
                  ${stats.finalMoney.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {isVictory && (
          <div className="victory-message">
            <p>
              🌟 Congratulations! You've successfully helped {stats.graduatedCount} residents 
              rebuild their lives and achieved {stats.finalReputation}% reputation!
            </p>
          </div>
        )}
        
        {!isVictory && (
          <div className="game-over-message">
            <p>{getGameOverMessage(gameOverReason ?? null, stats)}</p>
          </div>
        )}
        
        <div className="game-end-actions">
          <button 
            className="btn-restart"
            onClick={onRestart}
          >
            🔄 Start New Game
          </button>
          
          {hasSavedGame && onLoadSave && (
            <button 
              className="btn-load"
              onClick={onLoadSave}
            >
              📂 Load Last Save
            </button>
          )}
          
          {isVictory && onContinue && (
            <button 
              className="btn-continue"
              onClick={onContinue}
            >
              ▶️ Keep Playing
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Check victory conditions
 */
export function checkVictoryConditions(
  graduatedCount: number,
  reputation: number,
  daysSurvived: number
): boolean {
  // Victory conditions:
  // - 10+ graduates AND 80%+ reputation
  // OR
  // - 50+ days survived AND 70%+ reputation
  return (
    (graduatedCount >= 10 && reputation >= 80) ||
    (daysSurvived >= 50 && reputation >= 70)
  );
}

/**
 * Check game over conditions (legacy - use GameStateManager.checkAllGameOverConditions instead)
 * @deprecated Use GameStateManager methods instead
 */
export function checkGameOverConditions(
  money: number,
  reputation: number,
  residentCount: number,
  isBankrupt: boolean,
  bankruptcyCountdown: number
): GameOverReason | null {
  // Bankruptcy (countdown expired)
  if (isBankrupt && bankruptcyCountdown <= 0) {
    return 'bankruptcy';
  }
  
  // Reputation collapse
  if (reputation <= 0) {
    return 'reputation';
  }
  
  // Mass exodus (all residents left)
  if (residentCount === 0) {
    return 'exodus';
  }
  
  return null;
}
