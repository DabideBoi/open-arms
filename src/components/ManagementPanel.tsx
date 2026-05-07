import React, { useState, useEffect } from 'react';
import { GameState, Resident, Fundraiser } from '../types';
import { FUNDRAISER_CONFIG, EXPANSION_CONFIG } from '../constants';
import './ManagementPanel.css';

interface ManagementPanelProps {
  gameState: GameState;
  onStartFundraiser: (stationId: string, residentIds: string[]) => void;
  onCancelFundraiser: (fundraiserId: string) => void;
  onExpandGrid: (direction: 'north' | 'south' | 'east' | 'west') => void;
}

export const ManagementPanel: React.FC<ManagementPanelProps> = ({
  gameState,
  onStartFundraiser,
  onCancelFundraiser,
  onExpandGrid
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'fundraisers' | 'expansion' | 'residents'>('fundraisers');
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set());
  const [fundraiserTimers, setFundraiserTimers] = useState<Map<string, string>>(new Map());

  // Update fundraiser timers
  useEffect(() => {
    const updateTimers = () => {
      const newTimers = new Map<string, string>();
      const now = Date.now();
      
      gameState.activeFundraisers?.forEach(fundraiser => {
        const remaining = Math.max(0, fundraiser.completesAt - now);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        newTimers.set(fundraiser.id, `${minutes}:${seconds.toString().padStart(2, '0')}`);
      });
      
      setFundraiserTimers(newTimers);
    };
    
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState.activeFundraisers]);

  // Get available fundraiser stations
  const fundraiserStations = gameState.rooms.filter(r => r.type === 'fundraiser_station' && r.isOpen);
  
  // Get available residents (not in fundraiser, healthy)
  const availableResidents = gameState.residents.filter(r => {
    const inFundraiser = gameState.activeFundraisers?.some(f => f.assignedResidents.includes(r.id));
    return !inFundraiser && r.happiness > 20 && r.lifeMeter < 95;
  });

  // Calculate expansion cost
  const calculateExpansionCost = () => {
    const { unlockedArea } = gameState.grid;
    const unlockedTiles = (unlockedArea.maxX - unlockedArea.minX) * (unlockedArea.maxY - unlockedArea.minY);
    return Math.floor(EXPANSION_CONFIG.BASE_COST * (1 + unlockedTiles * EXPANSION_CONFIG.COST_FORMULA_MULTIPLIER));
  };

  // Check if expansion is possible in direction
  const canExpandInDirection = (direction: 'north' | 'south' | 'east' | 'west'): boolean => {
    const { unlockedArea } = gameState.grid;
    const size = EXPANSION_CONFIG.EXPANSION_SIZE;
    
    switch (direction) {
      case 'north': return unlockedArea.minY - size >= 0;
      case 'south': return unlockedArea.maxY + size <= gameState.grid.height;
      case 'east': return unlockedArea.maxX + size <= gameState.grid.width;
      case 'west': return unlockedArea.minX - size >= 0;
    }
  };

  const handleToggleResident = (residentId: string) => {
    const newSelected = new Set(selectedResidents);
    if (newSelected.has(residentId)) {
      newSelected.delete(residentId);
    } else {
      newSelected.add(residentId);
    }
    setSelectedResidents(newSelected);
  };

  const handleStartFundraiser = () => {
    if (fundraiserStations.length === 0) {
      alert('No fundraiser station available!');
      return;
    }
    
    if (selectedResidents.size === 0) {
      alert('Please select at least one resident!');
      return;
    }
    
    onStartFundraiser(fundraiserStations[0].id, Array.from(selectedResidents));
    setSelectedResidents(new Set());
  };

  const getProfileIcon = (profile: string): string => {
    const icons: Record<string, string> = {
      young_adult: '🧑',
      veteran: '🎖️',
      elderly: '👴'
    };
    return icons[profile] || '👤';
  };

  return (
    <div className="management-panel">
      <button 
        className="management-panel-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        ⚙️ Management
      </button>
      
      {isOpen && (
        <div className="management-panel-content">
          <div className="management-tabs">
            <button 
              className={`tab ${activeTab === 'fundraisers' ? 'active' : ''}`}
              onClick={() => setActiveTab('fundraisers')}
            >
              🎪 Fundraisers
            </button>
            <button 
              className={`tab ${activeTab === 'expansion' ? 'active' : ''}`}
              onClick={() => setActiveTab('expansion')}
            >
              🏗️ Expansion
            </button>
            <button 
              className={`tab ${activeTab === 'residents' ? 'active' : ''}`}
              onClick={() => setActiveTab('residents')}
            >
              👥 Residents
            </button>
          </div>

          {activeTab === 'fundraisers' && (
            <div className="tab-content">
              <h3>Active Fundraisers ({gameState.activeFundraisers?.length || 0})</h3>
              
              {gameState.activeFundraisers && gameState.activeFundraisers.length > 0 ? (
                <div className="fundraiser-list">
                  {gameState.activeFundraisers.map(fundraiser => (
                    <div key={fundraiser.id} className="fundraiser-item">
                      <div className="fundraiser-info">
                        <span>💰 Expected: ${fundraiser.expectedPayout}</span>
                        <span>👥 {fundraiser.assignedResidents.length} residents</span>
                        <span>⏱️ {fundraiserTimers.get(fundraiser.id) || '0:00'}</span>
                      </div>
                      <button 
                        className="cancel-button"
                        onClick={() => onCancelFundraiser(fundraiser.id)}
                      >
                        ❌ Cancel
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-message">No active fundraisers</p>
              )}

              <h3>Start New Fundraiser</h3>
              
              {fundraiserStations.length === 0 ? (
                <p className="warning">⚠️ Build a Fundraiser Station first!</p>
              ) : (
                <>
                  <div className="fundraiser-info-box">
                    <p>Duration: {FUNDRAISER_CONFIG.DURATION_MINUTES} minutes</p>
                    <p>Effects: +{FUNDRAISER_CONFIG.LIFE_BOOST} LIFE, -{FUNDRAISER_CONFIG.HAPPINESS_COST} Happiness</p>
                    <p>Payout: $200-500 × residents × reputation</p>
                  </div>

                  <h4>Select Residents ({selectedResidents.size}/4)</h4>
                  <div className="resident-selection">
                    {availableResidents.length === 0 ? (
                      <p className="empty-message">No available residents</p>
                    ) : (
                      availableResidents.map(resident => (
                        <div 
                          key={resident.id}
                          className={`resident-select-item ${selectedResidents.has(resident.id) ? 'selected' : ''}`}
                          onClick={() => handleToggleResident(resident.id)}
                        >
                          <span>{getProfileIcon(resident.profile)} {resident.name}</span>
                          <span>😊 {Math.floor(resident.happiness)}% | 📈 {Math.floor(resident.lifeMeter)}%</span>
                        </div>
                      ))
                    )}
                  </div>

                  <button 
                    className="start-fundraiser-button"
                    onClick={handleStartFundraiser}
                    disabled={selectedResidents.size === 0 || fundraiserStations.length === 0}
                  >
                    🎪 Start Fundraiser
                  </button>
                </>
              )}
            </div>
          )}

          {activeTab === 'expansion' && (
            <div className="tab-content">
              <h3>Grid Expansion</h3>
              
              <div className="expansion-info">
                <p>Current Size: {gameState.grid.unlockedArea.maxX - gameState.grid.unlockedArea.minX} × {gameState.grid.unlockedArea.maxY - gameState.grid.unlockedArea.minY}</p>
                <p>Expansion Size: {EXPANSION_CONFIG.EXPANSION_SIZE} tiles per direction</p>
                <p>Cost: ${calculateExpansionCost()}</p>
              </div>

              <div className="expansion-buttons">
                {(['north', 'south', 'east', 'west'] as const).map(direction => {
                  const canExpand = canExpandInDirection(direction);
                  const cost = calculateExpansionCost();
                  const canAfford = gameState.money >= cost;
                  
                  return (
                    <button
                      key={direction}
                      className={`expansion-button ${direction}`}
                      onClick={() => onExpandGrid(direction)}
                      disabled={!canExpand || !canAfford}
                      title={!canExpand ? 'Cannot expand beyond grid' : !canAfford ? 'Insufficient funds' : `Expand ${direction}`}
                    >
                      {direction === 'north' && '⬆️'}
                      {direction === 'south' && '⬇️'}
                      {direction === 'east' && '➡️'}
                      {direction === 'west' && '⬅️'}
                      {' '}
                      {direction.toUpperCase()}
                      {!canExpand && ' ❌'}
                      {canExpand && !canAfford && ' 💰'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'residents' && (
            <div className="tab-content">
              <h3>All Residents ({gameState.residents.length})</h3>
              
              <div className="resident-list">
                {gameState.residents.map(resident => {
                  const inFundraiser = gameState.activeFundraisers?.some(f => 
                    f.assignedResidents.includes(resident.id)
                  );
                  
                  return (
                    <div key={resident.id} className="resident-detail-item">
                      <div className="resident-header">
                        <span>{getProfileIcon(resident.profile)} {resident.name}</span>
                        <span className="resident-profile">{resident.profile.replace('_', ' ')}</span>
                      </div>
                      <div className="resident-stats">
                        <div className="stat">
                          <span>😊 Happiness:</span>
                          <div className="stat-bar">
                            <div 
                              className="stat-bar-fill happiness"
                              style={{ width: `${resident.happiness}%` }}
                            />
                          </div>
                          <span>{Math.floor(resident.happiness)}%</span>
                        </div>
                        <div className="stat">
                          <span>📈 LIFE:</span>
                          <div className="stat-bar">
                            <div 
                              className="stat-bar-fill life"
                              style={{ width: `${resident.lifeMeter}%` }}
                            />
                          </div>
                          <span>{Math.floor(resident.lifeMeter)}%</span>
                        </div>
                      </div>
                      <div className="resident-status">
                        <span>Status: {resident.currentState}</span>
                        {inFundraiser && <span className="status-badge">🎪 In Fundraiser</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
