import React, { useState, useEffect } from 'react';
import { GameState, Resident } from '../types';
import { EventSystem, EventType } from '../game/systems/EventSystem';
import './DevModeMenu.css';

interface DevModeMenuProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  eventSystem: EventSystem | null;
  onForceDay: () => void;
  onForceNight: () => void;
  onTriggerEvent: (eventType: EventType) => void;
  onModifyResident: (residentId: string, stat: string, value: number) => void;
  onAddMoney: (amount: number) => void;
  onSetReputation: (value: number) => void;
  devTimersEnabled: boolean;
  onToggleDevTimers: (enabled: boolean) => void;
}

export function DevModeMenu({
  isOpen,
  onClose,
  gameState,
  eventSystem,
  onForceDay,
  onForceNight,
  onTriggerEvent,
  onModifyResident,
  onAddMoney,
  onSetReputation,
  devTimersEnabled,
  onToggleDevTimers
}: DevModeMenuProps) {
  // Timer display states
  const [donationTimer, setDonationTimer] = useState<string>('0:00');
  const [maintenanceTimer, setMaintenanceTimer] = useState<string>('0:00');
  const [selectedResident, setSelectedResident] = useState<string>('');
  const [moneyAmount, setMoneyAmount] = useState<number>(1000);
  const [reputationValue, setReputationValue] = useState<number>(50);
  const [happinessValue, setHappinessValue] = useState<number>(50);
  const [lifeMeterValue, setLifeMeterValue] = useState<number>(50);
  
  // Update timer displays
  useEffect(() => {
    const updateTimers = () => {
      const now = Date.now();
      
      // Donation timer
      const donationRemaining = Math.max(0, gameState.nextDonationCheck - now);
      const donationMin = Math.floor(donationRemaining / 60000);
      const donationSec = Math.floor((donationRemaining % 60000) / 1000);
      setDonationTimer(`${donationMin}:${donationSec.toString().padStart(2, '0')}`);
      
      // Maintenance timer
      const maintenanceRemaining = Math.max(0, gameState.nextMaintenanceCheck - now);
      const maintenanceMin = Math.floor(maintenanceRemaining / 60000);
      const maintenanceSec = Math.floor((maintenanceRemaining % 60000) / 1000);
      setMaintenanceTimer(`${maintenanceMin}:${maintenanceSec.toString().padStart(2, '0')}`);
    };
    
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    
    return () => clearInterval(interval);
  }, [gameState.nextDonationCheck, gameState.nextMaintenanceCheck]);
  
  useEffect(() => {
    if (gameState.residents.length > 0 && !selectedResident) {
      setSelectedResident(gameState.residents[0].id);
    }
  }, [gameState.residents, selectedResident]);
  
  if (!isOpen) return null;
  
  const selectedResidentData = gameState.residents.find(r => r.id === selectedResident);
  
  const eventTypes: EventType[] = [
    'donation_drive',
    'health_outbreak',
    'media_coverage',
    'volunteer_day',
    'inspection',
    'community_support'
  ];
  
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  const getTimeUntilNextTransition = () => {
    return Math.max(0, gameState.nextDayNightTransition - Date.now());
  };
  
  const getNextEventTime = () => {
    if (eventSystem) {
      return eventSystem.getTimeUntilNextEvent();
    }
    return 0;
  };
  
  return (
    <>
      <div className="dev-mode-overlay" onClick={onClose} />
      <div className="dev-mode-menu">
        <button className="dev-close-button" onClick={onClose}>×</button>
        
        <h2>🛠️ Developer Mode</h2>
        
        <div className="dev-warning">
          ⚠️ Warning: This menu is for testing and debugging purposes only. Changes made here may affect game balance.
        </div>
        
        {/* Timer Configuration */}
        <div className="dev-section">
          <h3>⏱️ Timer Configuration</h3>
          <div className="dev-toggle">
            <input
              type="checkbox"
              checked={devTimersEnabled}
              onChange={(e) => onToggleDevTimers(e.target.checked)}
            />
            <span style={{ color: '#fff' }}>
              Use Dev Timers (5min day, 30sec night, 1min donation)
            </span>
          </div>
          
          <div className="dev-timer-display">
            <div className="dev-timer-item">
              <div className="label">Day Duration</div>
              <div className="value">{devTimersEnabled ? '5:00' : '8:00'}</div>
            </div>
            <div className="dev-timer-item">
              <div className="label">Night Duration</div>
              <div className="value">{devTimersEnabled ? '0:30' : '4:00'}</div>
            </div>
            <div className="dev-timer-item">
              <div className="label">Donation Interval</div>
              <div className="value">{devTimersEnabled ? '1:00' : '5:00'}</div>
            </div>
          </div>
          
          <div className="dev-info">
            Current Phase: <strong>{gameState.currentPhase === 'day' ? '☀️ Day' : '🌙 Night'}</strong>
            <br />
            Time until transition: <strong>{formatTime(getTimeUntilNextTransition())}</strong>
          </div>
        </div>
        
        {/* Live Timers Section - moved from HUD */}
        <div className="dev-section">
          <h3>⏰ Live Timers</h3>
          <div className="dev-timer-display">
            <div className="dev-timer-item">
              <div className="label">💝 Next Donation</div>
              <div className="value timer-live">{donationTimer}</div>
            </div>
            <div className="dev-timer-item">
              <div className="label">🔧 Next Maintenance</div>
              <div className="value timer-live">{maintenanceTimer}</div>
            </div>
          </div>
          <div className="dev-info">
            These timers show when the next donation check and maintenance check will occur.
            <br />
            <strong>Donation:</strong> Passive income based on reputation.
            <br />
            <strong>Maintenance:</strong> Costs deducted for room upkeep.
          </div>
        </div>
        
        {/* Day/Night Controls */}
        <div className="dev-section">
          <h3>🌓 Day/Night Cycle</h3>
          <div className="dev-controls">
            <button className="dev-button success" onClick={onForceDay}>
              ☀️ Force Day
            </button>
            <button className="dev-button" onClick={onForceNight}>
              🌙 Force Night
            </button>
          </div>
          <div className="dev-info">
            Current Day: <strong>Day {gameState.currentDay}</strong>
          </div>
        </div>
        
        {/* Event Controls */}
        <div className="dev-section">
          <h3>🎲 Event System</h3>
          <div className="dev-control-group">
            <label className="dev-control-label">Trigger Event:</label>
            <div className="dev-controls">
              {eventTypes.map(eventType => (
                <button
                  key={eventType}
                  className="dev-button"
                  onClick={() => onTriggerEvent(eventType)}
                >
                  {eventType.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="dev-info">
            Active Events: <strong>{eventSystem?.getActiveEvents().length || 0}</strong>
            <br />
            Next Event In: <strong>{formatTime(getNextEventTime())}</strong>
          </div>
        </div>
        
        {/* Resource Controls */}
        <div className="dev-section">
          <h3>💰 Resources</h3>
          <div className="dev-stat-grid">
            <div className="dev-stat-item">
              <label>Add Money:</label>
              <input
                type="number"
                className="dev-input"
                value={moneyAmount}
                onChange={(e) => setMoneyAmount(Number(e.target.value))}
                step={100}
              />
            </div>
            <div className="dev-stat-item">
              <button
                className="dev-button success"
                onClick={() => onAddMoney(moneyAmount)}
              >
                Add ${moneyAmount}
              </button>
            </div>
            
            <div className="dev-stat-item">
              <label>Set Reputation:</label>
              <input
                type="number"
                className="dev-input"
                value={reputationValue}
                onChange={(e) => setReputationValue(Number(e.target.value))}
                min={0}
                max={100}
              />
            </div>
            <div className="dev-stat-item">
              <button
                className="dev-button"
                onClick={() => onSetReputation(reputationValue)}
              >
                Set to {reputationValue}
              </button>
            </div>
          </div>
          
          <div className="dev-info">
            Current Money: <strong>${gameState.money}</strong>
            <br />
            Current Reputation: <strong>{gameState.reputation}/100</strong>
          </div>
        </div>
        
        {/* Resident Controls */}
        <div className="dev-section">
          <h3>👥 Resident Stats</h3>
          
          {gameState.residents.length === 0 ? (
            <div className="dev-info">No residents in shelter</div>
          ) : (
            <>
              <div className="dev-control-group">
                <label className="dev-control-label">Select Resident:</label>
                <select
                  className="dev-select"
                  value={selectedResident}
                  onChange={(e) => setSelectedResident(e.target.value)}
                >
                  {gameState.residents.map(resident => (
                    <option key={resident.id} value={resident.id}>
                      {resident.name} ({resident.profile})
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedResidentData && (
                <>
                  <div className="dev-info">
                    <strong>{selectedResidentData.name}</strong>
                    <br />
                    Profile: {selectedResidentData.profile}
                    <br />
                    State: {selectedResidentData.currentState}
                    <br />
                    Current Happiness: {Math.round(selectedResidentData.happiness)}/100
                    <br />
                    Current LIFE Meter: {Math.round(selectedResidentData.lifeMeter)}/100
                    <br />
                    Days in Shelter: {selectedResidentData.daysInShelter}
                  </div>
                  
                  <div className="dev-stat-grid">
                    <div className="dev-stat-item">
                      <label>Happiness:</label>
                      <input
                        type="number"
                        className="dev-input"
                        value={happinessValue}
                        onChange={(e) => setHappinessValue(Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                    </div>
                    <div className="dev-stat-item">
                      <button
                        className="dev-button"
                        onClick={() => onModifyResident(selectedResident, 'happiness', happinessValue)}
                      >
                        Set Happiness
                      </button>
                    </div>
                    
                    <div className="dev-stat-item">
                      <label>LIFE Meter:</label>
                      <input
                        type="number"
                        className="dev-input"
                        value={lifeMeterValue}
                        onChange={(e) => setLifeMeterValue(Number(e.target.value))}
                        min={0}
                        max={100}
                      />
                    </div>
                    <div className="dev-stat-item">
                      <button
                        className="dev-button"
                        onClick={() => onModifyResident(selectedResident, 'lifeMeter', lifeMeterValue)}
                      >
                        Set LIFE Meter
                      </button>
                    </div>
                  </div>
                  
                  <div className="dev-controls" style={{ marginTop: '12px' }}>
                    <button
                      className="dev-button success"
                      onClick={() => onModifyResident(selectedResident, 'happiness', 100)}
                    >
                      Max Happiness
                    </button>
                    <button
                      className="dev-button success"
                      onClick={() => onModifyResident(selectedResident, 'lifeMeter', 100)}
                    >
                      Max LIFE Meter
                    </button>
                    <button
                      className="dev-button danger"
                      onClick={() => {
                        onModifyResident(selectedResident, 'happiness', 0);
                        onModifyResident(selectedResident, 'lifeMeter', 0);
                      }}
                    >
                      Zero All Stats
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Quick Actions */}
        <div className="dev-section">
          <h3>⚡ Quick Actions</h3>
          <div className="dev-controls">
            <button
              className="dev-button success"
              onClick={() => {
                onAddMoney(10000);
                onSetReputation(100);
              }}
            >
              💎 God Mode (Max Resources)
            </button>
            <button
              className="dev-button"
              onClick={() => {
                gameState.residents.forEach(resident => {
                  onModifyResident(resident.id, 'happiness', 100);
                  onModifyResident(resident.id, 'lifeMeter', 100);
                });
              }}
            >
              😊 Max All Residents
            </button>
            <button
              className="dev-button danger"
              onClick={() => {
                onAddMoney(-gameState.money + 100);
                onSetReputation(10);
              }}
            >
              💀 Crisis Mode
            </button>
          </div>
        </div>
        
        <div className="dev-info" style={{ marginTop: '20px', textAlign: 'center' }}>
          Press <strong>F12</strong> to toggle this menu | Press <strong>ESC</strong> to close
        </div>
      </div>
    </>
  );
}
