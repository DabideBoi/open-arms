import React from 'react';
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
  onRestart: () => void;
  onContinue?: () => void;
}

export function GameOverModal({ isVictory, stats, onRestart, onContinue }: GameOverModalProps) {
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
              <div className="game-over-icon">💔</div>
              <h2>Game Over</h2>
              <p className="subtitle">Your shelter has closed</p>
            </>
          )}
        </div>
        
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
                <span className="stat-value">{stats.finalReputation}%</span>
              </div>
            </div>
            
            <div className="stat-item">
              <span className="stat-icon">🏦</span>
              <div className="stat-content">
                <span className="stat-label">Final Balance</span>
                <span className="stat-value">${stats.finalMoney.toLocaleString()}</span>
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
            <p>
              Your shelter ran out of funds and had to close. 
              But you still made a difference by helping {stats.residentsHelped} residents!
            </p>
          </div>
        )}
        
        <div className="game-end-actions">
          <button 
            className="btn-restart"
            onClick={onRestart}
          >
            🔄 Start New Game
          </button>
          
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
 * Check game over conditions
 */
export function checkGameOverConditions(
  money: number,
  reputation: number
): boolean {
  // Game over if:
  // - Money is negative and can't recover
  // - Reputation drops to 0
  return money < -1000 || reputation <= 0;
}
