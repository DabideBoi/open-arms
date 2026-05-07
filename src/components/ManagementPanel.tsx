import React, { useState, useEffect } from 'react';
import { GameState, Resident, Fundraiser, FoodPortionSetting, ShelterTier } from '../types';
import { FUNDRAISER_CONFIG, EXPANSION_CONFIG, FOOD_PORTIONS, SHELTER_TIERS, TIER_UPGRADE_CONFIG } from '../constants';
import {
  getAllFoodTierOptions,
  getFoodSettingDisplay,
  getNextFoodCostPreview,
  getLifeFillModifier
} from '../game/systems/FoodSystem';
import {
  getFundraiserStatus,
  getFundraiserSuccessChance,
  isResidentFatigued,
  getResidentFatigueRemaining,
  calculateFundraiserFoodCost
} from '../game/systems/FundraiserSystem';
import {
  getTierConfig,
  getNextTier,
  checkUpgradeRequirements,
  canUpgrade,
  performUpgrade,
  getTierProgress,
  getResidentCap,
  getDonationMultiplier,
  getAvailableRooms,
  getLockedRooms
} from '../game/systems/TierSystem';
import { EconomicDashboard } from './EconomicDashboard';
import './ManagementPanel.css';

interface ManagementPanelProps {
  gameState: GameState;
  onStartFundraiser: (stationId: string, residentIds: string[]) => void;
  onCancelFundraiser: (fundraiserId: string) => void;
  onExpandGrid: (direction: 'north' | 'south' | 'east' | 'west') => void;
  onChangeFoodSetting?: (setting: FoodPortionSetting) => void;
  onUpgradeTier?: () => void;
}

export const ManagementPanel: React.FC<ManagementPanelProps> = ({
  gameState,
  onStartFundraiser,
  onCancelFundraiser,
  onExpandGrid,
  onChangeFoodSetting,
  onUpgradeTier
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'food' | 'fundraisers' | 'expansion' | 'residents' | 'upgrade' | 'finances'>('food');
  const [selectedResidents, setSelectedResidents] = useState<Set<string>>(new Set());
  const [fundraiserTimers, setFundraiserTimers] = useState<Map<string, string>>(new Map());
  const [cooldownTimer, setCooldownTimer] = useState<string>('Ready');

  // Update fundraiser and cooldown timers
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
      
      // Update cooldown timer
      if (gameState.lastFundraiserEndTime) {
        const cooldownEnd = gameState.lastFundraiserEndTime + FUNDRAISER_CONFIG.COOLDOWN_DURATION;
        const cooldownRemaining = Math.max(0, cooldownEnd - now);
        if (cooldownRemaining > 0) {
          const minutes = Math.floor(cooldownRemaining / 60000);
          const seconds = Math.floor((cooldownRemaining % 60000) / 1000);
          setCooldownTimer(`${minutes}:${seconds.toString().padStart(2, '0')}`);
        } else {
          setCooldownTimer('Ready');
        }
      } else {
        setCooldownTimer('Ready');
      }
    };
    
    updateTimers();
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState.activeFundraisers, gameState.lastFundraiserEndTime]);

  // Get available fundraiser stations
  const fundraiserStations = gameState.rooms.filter(r => r.type === 'fundraiser_station' && r.isOpen);
  
  // Get available residents (not in fundraiser, healthy, not fatigued)
  const availableResidents = gameState.residents.filter(r => {
    const inFundraiser = gameState.activeFundraisers?.some(f => f.assignedResidents.includes(r.id));
    const fatigued = isResidentFatigued(r);
    return !inFundraiser && !fatigued && r.happiness > 20 && r.lifeMeter < 95;
  });

  // Get fundraiser status
  const fundraiserStatus = getFundraiserStatus(gameState);

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

    if (selectedResidents.size < FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS) {
      alert(`Need at least ${FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS} residents to start a fundraiser!`);
      return;
    }

    const foodCost = calculateFundraiserFoodCost(selectedResidents.size);
    if (gameState.food < foodCost) {
      alert(`Not enough food! Need ${foodCost} units, have ${gameState.food}`);
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

  // Calculate success chance for selected residents
  const getSelectedResidentsSuccessChance = (): number => {
    if (selectedResidents.size === 0) return 0;
    const selected = gameState.residents.filter(r => selectedResidents.has(r.id));
    return getFundraiserSuccessChance(selected);
  };

  // Food portion options
  const foodTierOptions = getAllFoodTierOptions();
  const currentFoodDisplay = getFoodSettingDisplay(gameState.foodPortionSetting);
  const foodCostPreview = getNextFoodCostPreview(gameState);
  const currentLifeModifier = getLifeFillModifier(gameState);

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
              className={`tab ${activeTab === 'upgrade' ? 'active' : ''} ${canUpgrade(gameState) ? 'tab-highlight' : ''}`}
              onClick={() => setActiveTab('upgrade')}
            >
              🏛️ Upgrade {canUpgrade(gameState) && '✨'}
            </button>
            <button
              className={`tab ${activeTab === 'food' ? 'active' : ''}`}
              onClick={() => setActiveTab('food')}
            >
              🍽️ Food
            </button>
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
            <button
              className={`tab ${activeTab === 'finances' ? 'active' : ''}`}
              onClick={() => setActiveTab('finances')}
            >
              💹 Finances
            </button>
          </div>

          {/* UPGRADE TAB */}
          {activeTab === 'upgrade' && (
            <div className="tab-content">
              <h3>🏛️ Shelter Tier Progression</h3>
              
              {/* Current Tier Info */}
              <div className="current-tier-info">
                <div className="tier-header">
                  <span className="tier-badge-large">Tier {gameState.currentTier}</span>
                  <span className="tier-name-large">{SHELTER_TIERS[gameState.currentTier].name}</span>
                </div>
                <p className="tier-description">{SHELTER_TIERS[gameState.currentTier].description}</p>
                <div className="tier-benefits">
                  <div className="benefit">
                    <span className="benefit-label">👥 Max Residents:</span>
                    <span className="benefit-value">{SHELTER_TIERS[gameState.currentTier].maxResidents}</span>
                  </div>
                  <div className="benefit">
                    <span className="benefit-label">📐 Grid Size:</span>
                    <span className="benefit-value">{SHELTER_TIERS[gameState.currentTier].gridSize}×{SHELTER_TIERS[gameState.currentTier].gridSize}</span>
                  </div>
                  <div className="benefit">
                    <span className="benefit-label">💰 Donation Bonus:</span>
                    <span className="benefit-value">×{SHELTER_TIERS[gameState.currentTier].donationMultiplier.toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Next Tier Preview */}
              {gameState.currentTier < 4 ? (
                <>
                  <h4>⬆️ Upgrade to Tier {gameState.currentTier + 1}: {SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].name}</h4>
                  
                  <div className="next-tier-preview">
                    <p className="tier-preview-desc">{SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].description}</p>
                    <div className="tier-improvements">
                      <div className="improvement">
                        <span>👥</span>
                        <span>{SHELTER_TIERS[gameState.currentTier].maxResidents} → {SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].maxResidents}</span>
                      </div>
                      <div className="improvement">
                        <span>📐</span>
                        <span>{SHELTER_TIERS[gameState.currentTier].gridSize}×{SHELTER_TIERS[gameState.currentTier].gridSize} → {SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].gridSize}×{SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].gridSize}</span>
                      </div>
                      <div className="improvement">
                        <span>💰</span>
                        <span>×{SHELTER_TIERS[gameState.currentTier].donationMultiplier.toFixed(1)} → ×{SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].donationMultiplier.toFixed(1)}</span>
                      </div>
                    </div>
                    
                    {/* New Rooms Unlocked */}
                    {(() => {
                      const currentRooms = SHELTER_TIERS[gameState.currentTier].availableRooms;
                      const nextRooms = SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].availableRooms;
                      const currentRoomsList = currentRooms === 'all' ? [] : currentRooms;
                      const nextRoomsList = nextRooms === 'all' ? ['All rooms available!'] : nextRooms.filter(r => !currentRoomsList.includes(r));
                      
                      if (nextRoomsList.length > 0) {
                        return (
                          <div className="new-rooms-preview">
                            <span className="new-rooms-label">🔓 New Rooms:</span>
                            <span className="new-rooms-list">
                              {nextRoomsList.map(r => r.replace(/_/g, ' ')).join(', ')}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* Requirements */}
                  <h4>📋 Requirements</h4>
                  {(() => {
                    const requirements = checkUpgradeRequirements(gameState);
                    return (
                      <div className="upgrade-requirements">
                        <div className={`requirement ${requirements.hasMoney ? 'met' : 'unmet'}`}>
                          <span className="req-icon">{requirements.hasMoney ? '✅' : '❌'}</span>
                          <span className="req-label">💰 Money:</span>
                          <span className="req-value">
                            ${requirements.currentMoney.toLocaleString()} / ${requirements.moneyNeeded.toLocaleString()}
                          </span>
                          {!requirements.hasMoney && (
                            <div className="req-progress-bar">
                              <div
                                className="req-progress-fill money"
                                style={{ width: `${Math.min(100, (requirements.currentMoney / requirements.moneyNeeded) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className={`requirement ${requirements.hasReputation ? 'met' : 'unmet'}`}>
                          <span className="req-icon">{requirements.hasReputation ? '✅' : '❌'}</span>
                          <span className="req-label">⭐ Reputation:</span>
                          <span className="req-value">
                            {requirements.currentReputation}% / {requirements.reputationNeeded}%
                          </span>
                          {!requirements.hasReputation && (
                            <div className="req-progress-bar">
                              <div
                                className="req-progress-fill reputation"
                                style={{ width: `${Math.min(100, (requirements.currentReputation / requirements.reputationNeeded) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className={`requirement ${requirements.hasGraduations ? 'met' : 'unmet'}`}>
                          <span className="req-icon">{requirements.hasGraduations ? '✅' : '❌'}</span>
                          <span className="req-label">🎓 Graduations:</span>
                          <span className="req-value">
                            {requirements.currentGraduations} / {requirements.graduationsNeeded}
                          </span>
                          {!requirements.hasGraduations && (
                            <div className="req-progress-bar">
                              <div
                                className="req-progress-fill graduations"
                                style={{ width: `${Math.min(100, (requirements.currentGraduations / requirements.graduationsNeeded) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                        
                        <div className={`requirement ${requirements.hasGridUtilization ? 'met' : 'unmet'}`}>
                          <span className="req-icon">{requirements.hasGridUtilization ? '✅' : '❌'}</span>
                          <span className="req-label">📐 Grid Usage:</span>
                          <span className="req-value">
                            {requirements.currentUtilization}% / {requirements.utilizationNeeded}%
                          </span>
                          {!requirements.hasGridUtilization && (
                            <div className="req-progress-bar">
                              <div
                                className="req-progress-fill utilization"
                                style={{ width: `${Math.min(100, (requirements.currentUtilization / requirements.utilizationNeeded) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                  
                  {/* Upgrade Button */}
                  <button
                    className={`upgrade-button ${canUpgrade(gameState) ? 'ready' : 'disabled'}`}
                    onClick={() => {
                      if (onUpgradeTier && canUpgrade(gameState)) {
                        onUpgradeTier();
                      }
                    }}
                    disabled={!canUpgrade(gameState)}
                  >
                    {canUpgrade(gameState)
                      ? `🏛️ Upgrade to ${SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].name} ($${SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].upgradeCost.toLocaleString()})`
                      : '🔒 Requirements Not Met'
                    }
                  </button>
                </>
              ) : (
                <div className="max-tier-reached">
                  <span className="max-tier-icon">🏆</span>
                  <h4>Maximum Tier Reached!</h4>
                  <p>Your shelter has reached its full potential as a Campus.</p>
                  <p>Continue helping residents graduate and maintaining your excellent reputation!</p>
                </div>
              )}
            </div>
          )}

          {/* FOOD TAB - NEW */}
          {activeTab === 'food' && (
            <div className="tab-content">
              <h3>Food Portions</h3>
              
              <div className="current-food-setting">
                <div className="food-setting-header">
                  <span className="food-icon">{currentFoodDisplay.icon}</span>
                  <span className="food-label">{currentFoodDisplay.label}</span>
                </div>
                <p className="food-description">{currentFoodDisplay.description}</p>
                <div className="food-effects">
                  <span className={`effect ${currentFoodDisplay.happinessChange >= 0 ? 'positive' : 'negative'}`}>
                    😊 {currentFoodDisplay.happinessChange >= 0 ? '+' : ''}{currentFoodDisplay.happinessChange}
                  </span>
                  <span className={`effect ${currentFoodDisplay.reputationChange >= 0 ? 'positive' : 'negative'}`}>
                    ⭐ {currentFoodDisplay.reputationChange >= 0 ? '+' : ''}{currentFoodDisplay.reputationChange}
                  </span>
                  <span className={`effect ${currentLifeModifier >= 1 ? 'positive' : 'negative'}`}>
                    📈 LIFE: {(currentLifeModifier * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="food-cost">
                  Cost: ${currentFoodDisplay.costPerResident}/resident/day = ${foodCostPreview.current}/day total
                </p>
              </div>

              {currentFoodDisplay.isBelowStandard && (
                <div className="food-warning">
                  ⚠️ Below-standard food reduces happiness and slows LIFE progression!
                </div>
              )}

              <h4>Change Food Setting</h4>
              <div className="food-options">
                {foodTierOptions.map(({ tier, display }) => {
                  const isSelected = tier === gameState.foodPortionSetting;
                  const totalCost = gameState.residents.length * display.costPerResident;
                  const canAfford = gameState.money >= totalCost;
                  
                  return (
                    <div 
                      key={tier}
                      className={`food-option ${isSelected ? 'selected' : ''} ${display.isBelowStandard ? 'below-standard' : ''} ${!canAfford ? 'unaffordable' : ''}`}
                      onClick={() => {
                        if (onChangeFoodSetting && canAfford) {
                          onChangeFoodSetting(tier as FoodPortionSetting);
                        }
                      }}
                    >
                      <div className="food-option-header">
                        <span className="food-option-icon">{display.icon}</span>
                        <span className="food-option-label">{display.label}</span>
                        {isSelected && <span className="selected-badge">✓</span>}
                      </div>
                      <div className="food-option-details">
                        <span>${display.costPerResident}/resident</span>
                        <span className={display.happinessChange >= 0 ? 'positive' : 'negative'}>
                          😊 {display.happinessChange >= 0 ? '+' : ''}{display.happinessChange}
                        </span>
                        <span className={display.lifeFillModifier >= 1 ? 'positive' : 'negative'}>
                          📈 {(display.lifeFillModifier * 100).toFixed(0)}%
                        </span>
                      </div>
                      {display.isBelowStandard && (
                        <div className="below-standard-warning">⚠️ Below standard</div>
                      )}
                      {!canAfford && (
                        <div className="unaffordable-warning">💰 Can't afford</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FUNDRAISERS TAB - UPDATED */}
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
                        <span className={fundraiser.successChance >= 0.6 ? 'success-high' : 'success-low'}>
                          🎯 {Math.round(fundraiser.successChance * 100)}% chance
                        </span>
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

              {/* Cooldown Status */}
              <div className={`cooldown-status ${cooldownTimer === 'Ready' ? 'ready' : 'cooling'}`}>
                <span>⏳ Cooldown: {cooldownTimer}</span>
                {cooldownTimer !== 'Ready' && (
                  <span className="cooldown-note">Must wait between fundraisers</span>
                )}
              </div>

              <h3>Start New Fundraiser</h3>
              
              {fundraiserStations.length === 0 ? (
                <p className="warning">⚠️ Build a Fundraiser Station first!</p>
              ) : cooldownTimer !== 'Ready' ? (
                <p className="warning">⏳ Fundraiser on cooldown. Wait {cooldownTimer}</p>
              ) : (
                <>
                  <div className="fundraiser-info-box">
                    <p>Duration: {FUNDRAISER_CONFIG.DURATION_MINUTES} minutes</p>
                    <p>Food Cost: {FUNDRAISER_CONFIG.FOOD_COST_PER_RESIDENT} units/resident</p>
                    <p>On Success: +{FUNDRAISER_CONFIG.LIFE_BOOST} LIFE, -{FUNDRAISER_CONFIG.HAPPINESS_COST} Happiness, +{FUNDRAISER_CONFIG.REPUTATION_BOOST} Rep</p>
                    <p>On Failure: No money, {FUNDRAISER_CONFIG.FAILURE_HAPPINESS_PENALTY} Happiness, {FUNDRAISER_CONFIG.FAILURE_REPUTATION_PENALTY} Rep</p>
                    <p>Minimum Residents: {FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS}</p>
                  </div>

                  {/* Selected residents preview */}
                  {selectedResidents.size > 0 && (
                    <div className="fundraiser-preview">
                      <p>
                        <strong>Food Required:</strong> {calculateFundraiserFoodCost(selectedResidents.size)} units 
                        {gameState.food < calculateFundraiserFoodCost(selectedResidents.size) && 
                          <span className="warning-inline"> (Not enough! Have {gameState.food})</span>
                        }
                      </p>
                      <p>
                        <strong>Success Chance:</strong> 
                        <span className={getSelectedResidentsSuccessChance() >= 0.6 ? 'success-high' : 'success-low'}>
                          {' '}{Math.round(getSelectedResidentsSuccessChance() * 100)}%
                        </span>
                      </p>
                    </div>
                  )}

                  <h4>Select Residents ({selectedResidents.size}/{FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS}+ required)</h4>
                  <div className="resident-selection">
                    {availableResidents.length === 0 ? (
                      <p className="empty-message">
                        No available residents 
                        {gameState.residents.some(r => isResidentFatigued(r)) && 
                          ' (some are fatigued)'
                        }
                      </p>
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

                  {/* Show fatigued residents separately */}
                  {gameState.residents.some(r => isResidentFatigued(r)) && (
                    <div className="fatigued-residents">
                      <h5>⏳ Fatigued Residents</h5>
                      {gameState.residents.filter(r => isResidentFatigued(r)).map(resident => {
                        const fatigueRemaining = getResidentFatigueRemaining(resident);
                        const minutes = Math.ceil(fatigueRemaining / 60000);
                        return (
                          <div key={resident.id} className="fatigued-resident-item">
                            <span>{getProfileIcon(resident.profile)} {resident.name}</span>
                            <span>Ready in {minutes} min</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button 
                    className="start-fundraiser-button"
                    onClick={handleStartFundraiser}
                    disabled={
                      selectedResidents.size < FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS || 
                      fundraiserStations.length === 0 ||
                      gameState.food < calculateFundraiserFoodCost(selectedResidents.size) ||
                      cooldownTimer !== 'Ready'
                    }
                  >
                    🎪 Start Fundraiser ({selectedResidents.size} residents, {calculateFundraiserFoodCost(selectedResidents.size)} food)
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
                  const fatigued = isResidentFatigued(resident);
                  
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
                        {fatigued && (
                          <span className="status-badge fatigue">
                            ⏳ Fatigued ({Math.ceil(getResidentFatigueRemaining(resident) / 60000)}m)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* FINANCES TAB */}
          {activeTab === 'finances' && (
            <div className="tab-content">
              <h3>💹 Financial Overview</h3>
              <EconomicDashboard gameState={gameState} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
