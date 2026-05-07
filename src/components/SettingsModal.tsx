import React, { useState } from 'react';
import { AudioSettings } from '../game/systems/AudioSystem';
import { StatusBarSettings, StatusBarVisibilityMode } from '../types';
import './SettingsModal.css';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioSettings: AudioSettings;
  onAudioSettingsChange: (settings: Partial<AudioSettings>) => void;
  gameSpeed: number;
  onGameSpeedChange: (speed: number) => void;
  onResetGame: () => void;
  statusBarSettings: StatusBarSettings;
  onStatusBarSettingsChange: (settings: Partial<StatusBarSettings>) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  audioSettings,
  onAudioSettingsChange,
  gameSpeed,
  onGameSpeedChange,
  onResetGame,
  statusBarSettings,
  onStatusBarSettingsChange
}: SettingsModalProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  if (!isOpen) return null;
  
  const handleResetConfirm = () => {
    onResetGame();
    setShowResetConfirm(false);
    onClose();
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ Settings</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="settings-content">
          {/* Audio Settings */}
          <section className="settings-section">
            <h3>🔊 Audio</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={!audioSettings.muted}
                  onChange={(e) => onAudioSettingsChange({ muted: !e.target.checked })}
                />
                <span>Enable Sound</span>
              </label>
            </div>
            
            <div className="setting-item">
              <label htmlFor="master-volume">Master Volume</label>
              <div className="slider-container">
                <input
                  id="master-volume"
                  type="range"
                  min="0"
                  max="100"
                  value={audioSettings.masterVolume * 100}
                  onChange={(e) => onAudioSettingsChange({ masterVolume: parseInt(e.target.value) / 100 })}
                  disabled={audioSettings.muted}
                />
                <span className="slider-value">{Math.round(audioSettings.masterVolume * 100)}%</span>
              </div>
            </div>
            
            <div className="setting-item">
              <label htmlFor="music-volume">Music Volume</label>
              <div className="slider-container">
                <input
                  id="music-volume"
                  type="range"
                  min="0"
                  max="100"
                  value={audioSettings.musicVolume * 100}
                  onChange={(e) => onAudioSettingsChange({ musicVolume: parseInt(e.target.value) / 100 })}
                  disabled={audioSettings.muted}
                />
                <span className="slider-value">{Math.round(audioSettings.musicVolume * 100)}%</span>
              </div>
            </div>
            
            <div className="setting-item">
              <label htmlFor="sfx-volume">Sound Effects Volume</label>
              <div className="slider-container">
                <input
                  id="sfx-volume"
                  type="range"
                  min="0"
                  max="100"
                  value={audioSettings.sfxVolume * 100}
                  onChange={(e) => onAudioSettingsChange({ sfxVolume: parseInt(e.target.value) / 100 })}
                  disabled={audioSettings.muted}
                />
                <span className="slider-value">{Math.round(audioSettings.sfxVolume * 100)}%</span>
              </div>
            </div>
          </section>
          
          {/* Game Speed */}
          <section className="settings-section">
            <h3>⏱️ Game Speed</h3>
            
            <div className="speed-buttons">
              {[0.5, 1, 2, 5].map(speed => (
                <button
                  key={speed}
                  className={`speed-btn ${gameSpeed === speed ? 'active' : ''}`}
                  onClick={() => onGameSpeedChange(speed)}
                >
                  {speed}x
                </button>
              ))}
            </div>
            
            <p className="setting-description">
              Current speed: <strong>{gameSpeed}x</strong>
            </p>
          </section>
          
          {/* Resident Status Bars */}
          <section className="settings-section">
            <h3>👥 Resident Status Bars</h3>
            
            <div className="setting-item">
              <label>
                <input
                  type="checkbox"
                  checked={statusBarSettings.enabled}
                  onChange={(e) => onStatusBarSettingsChange({ enabled: e.target.checked })}
                />
                <span>Show Status Bars Above Residents</span>
              </label>
            </div>
            
            <div className="setting-item">
              <label htmlFor="visibility-mode">Visibility Mode</label>
              <select
                id="visibility-mode"
                value={statusBarSettings.visibilityMode}
                onChange={(e) => onStatusBarSettingsChange({
                  visibilityMode: e.target.value as StatusBarVisibilityMode
                })}
                disabled={!statusBarSettings.enabled}
              >
                <option value="always">Always Show</option>
                <option value="hover">Show on Hover</option>
                <option value="at-risk">Only At-Risk Residents</option>
              </select>
            </div>
            
            <p className="setting-description">
              Status bars show LIFE meter (blue) and happiness (color-coded).
              Press <kbd>B</kbd> to toggle quickly.
            </p>
          </section>
          
          {/* Keyboard Shortcuts */}
          <section className="settings-section">
            <h3>⌨️ Keyboard Shortcuts</h3>
            
            <div className="shortcuts-list">
              <div className="shortcut-item">
                <kbd>Space</kbd>
                <span>Pause/Resume Game</span>
              </div>
              <div className="shortcut-item">
                <kbd>B</kbd>
                <span>Toggle Status Bars</span>
              </div>
              <div className="shortcut-item">
                <kbd>M</kbd>
                <span>Toggle Management Panel</span>
              </div>
              <div className="shortcut-item">
                <kbd>S</kbd>
                <span>Save Game</span>
              </div>
              <div className="shortcut-item">
                <kbd>Esc</kbd>
                <span>Close Modals</span>
              </div>
            </div>
          </section>
          
          {/* Game Management */}
          <section className="settings-section">
            <h3>🎮 Game Management</h3>
            
            {!showResetConfirm ? (
              <button 
                className="reset-btn"
                onClick={() => setShowResetConfirm(true)}
              >
                🔄 Reset Game
              </button>
            ) : (
              <div className="reset-confirm">
                <p className="warning-text">⚠️ This will delete all progress!</p>
                <div className="confirm-buttons">
                  <button 
                    className="confirm-yes"
                    onClick={handleResetConfirm}
                  >
                    Yes, Reset
                  </button>
                  <button 
                    className="confirm-no"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
          
          {/* Credits */}
          <section className="settings-section">
            <h3>ℹ️ About</h3>
            
            <div className="credits">
              <p><strong>Open Arms</strong></p>
              <p>Version 1.0.0</p>
              <p>A shelter management simulation game</p>
              <p className="credits-note">
                Help residents rebuild their lives through compassion and effective management.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
