import React, { useState, useEffect, useRef } from 'react';
import { GameState, Resident, Fundraiser, FoodPortionSetting, ShelterTier } from '../types';
import { FUNDRAISER_CONFIG, EXPANSION_CONFIG, FOOD_PORTIONS, SHELTER_TIERS, TIER_UPGRADE_CONFIG } from '../constants';
import {
  getAllFoodTierOptions,
  getFoodSettingDisplay,
  getNextFoodCostPreview,
  getLifeFillModifier,
  getFoodGenerationMultiplier
} from '../game/systems/FoodSystem';
import {
  getFundraiserStatus,
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
import { ResidentCard } from './ResidentCard';
import './ManagementPanel.css';
import { formatMoney } from '../utils/helpers';

interface ManagementPanelProps {
  gameState: GameState;
  onStartFundraiser: () => void;
  onCancelFundraiser: (fundraiserId: string) => void;
  onExpandGrid: (direction: 'north' | 'east' | 'west') => void;
  onChangeFoodSetting?: (setting: FoodPortionSetting) => void;
  onUpgradeTier?: () => void;
  // Controlled mode props for single-menu-at-a-time behavior
  isOpen?: boolean;
  onToggle?: () => void;
  isPaused?: boolean;
}

export const ManagementPanel: React.FC<ManagementPanelProps> = ({
  isPaused = false,
  gameState,
  onStartFundraiser,
  onCancelFundraiser,
  onExpandGrid,
  onChangeFoodSetting,
  onUpgradeTier,
  isOpen: controlledIsOpen,
  onToggle
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  // Ignore a second click within 500 ms so a double click can't upgrade/expand/start twice
  const lastClick = useRef(0);
  const once = (fn: () => void) => () => {
    const now = Date.now();
    if (now - lastClick.current < 500) return;
    lastClick.current = now;
    fn();
  };
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };
  const [activeTab, setActiveTab] = useState<'food' | 'fundraisers' | 'expansion' | 'residents' | 'upgrade'>('food');
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
    if (isPaused) return;
    const interval = setInterval(updateTimers, 1000);
    return () => clearInterval(interval);
  }, [gameState.activeFundraisers, isPaused]);

  // Get available fundraiser stations
  const fundraiserStations = gameState.rooms.filter(r => r.type === 'fundraiser_station');
  const isNight = gameState.currentPhase === 'night';
  
  // Get fundraiser status
  const fundraiserStatus = getFundraiserStatus(gameState);

  // Calculate expansion cost
  const calculateExpansionCost = () => {
    const { unlockedArea } = gameState.grid;
    const unlockedTiles = (unlockedArea.maxX - unlockedArea.minX) * (unlockedArea.maxY - unlockedArea.minY);
    return Math.floor(EXPANSION_CONFIG.BASE_COST * (1 + unlockedTiles * EXPANSION_CONFIG.COST_FORMULA_MULTIPLIER));
  };

  // Check if expansion is possible in direction
  const canExpandInDirection = (direction: 'north' | 'east' | 'west'): boolean => {
    const { unlockedArea } = gameState.grid;
    const size = EXPANSION_CONFIG.EXPANSION_SIZE;
    
    switch (direction) {
      case 'north': return unlockedArea.minY - size >= 0;
      case 'east': return unlockedArea.maxX + size <= gameState.grid.width;
      case 'west': return unlockedArea.minX - size >= 0;
    }
  };

  const getProfileIcon = (profile: string): string => {
    const icons: Record<string, string> = {
      young_adult: '🧑',
      adult: '🧔',
      elderly: '👴'
    };
    return icons[profile] || '👤';
  };

  // Food portion options
  const foodTierOptions = getAllFoodTierOptions();
  const currentFoodDisplay = getFoodSettingDisplay(gameState.foodPortionSetting);
  const foodCostPreview = getNextFoodCostPreview(gameState);
  const currentLifeModifier = getLifeFillModifier(gameState);
  const currentGenerationMultiplier = getFoodGenerationMultiplier(gameState);

  return (
    <div className="management-panel">
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
                            {formatMoney(requirements.currentMoney)} / {formatMoney(requirements.moneyNeeded)}
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
                            {Math.floor(requirements.currentReputation)}% / {requirements.reputationNeeded}%
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
                    onClick={once(() => {
                      if (onUpgradeTier && canUpgrade(gameState)) {
                        onUpgradeTier();
                      }
                    })}
                    disabled={!canUpgrade(gameState)}
                  >
                    {canUpgrade(gameState)
                      ? `🏛️ Upgrade to ${SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].name} (${formatMoney(SHELTER_TIERS[(gameState.currentTier + 1) as ShelterTier].upgradeCost)})`
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
              <h3>Food Deliveries</h3>
              
              <div className="current-food-setting">
                <div className="food-setting-header">
                  <span className="food-icon">{currentFoodDisplay.icon}</span>
                  <span className="food-label">{currentFoodDisplay.label}</span>
                </div>
                <p className="food-description">{currentFoodDisplay.description}</p>
                <div className="food-effects">
                  <span className={`effect ${currentFoodDisplay.healthChange >= 0 ? 'positive' : 'negative'}`}>
                    ❤️ {currentFoodDisplay.healthChange >= 0 ? '+' : ''}{currentFoodDisplay.healthChange}
                  </span>
                  <span className={`effect ${currentFoodDisplay.reputationChange >= 0 ? 'positive' : 'negative'}`}>
                    ⭐ {currentFoodDisplay.reputationChange >= 0 ? '+' : ''}{currentFoodDisplay.reputationChange}
                  </span>
                  <span className={`effect ${currentLifeModifier >= 1 ? 'positive' : 'negative'}`}>
                    📈 LIFE: {(currentLifeModifier * 100).toFixed(0)}%
                  </span>
                  <span className={`effect ${currentGenerationMultiplier >= 1 ? 'positive' : 'negative'}`}>
                    🚚 Food production: {(currentGenerationMultiplier * 100).toFixed(0)}%
                  </span>
                </div>
                <p className="food-cost">
                  Cost: {formatMoney(currentFoodDisplay.costPerResident)}/resident/day = {formatMoney(foodCostPreview.current)}/day total
                </p>
              </div>

              {currentFoodDisplay.isBelowStandard && (
                <div className="food-warning">
                  ⚠️ Below-standard deliveries reduce health, slow LIFE progression and slow food production!
                </div>
              )}

              <h4>Change Delivery Level</h4>
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
                        <span>{formatMoney(display.costPerResident)}/resident</span>
                        <span className={display.healthChange >= 0 ? 'positive' : 'negative'}>
                          ❤️ {display.healthChange >= 0 ? '+' : ''}{display.healthChange}
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
                        <span>💰 Expected: {formatMoney(fundraiser.expectedPayout)}</span>
                        <span>👥 {fundraiser.assignedResidents.length} residents</span>
                        <span>⏱️ {fundraiserTimers.get(fundraiser.id) || '0:00'}</span>
                        <span className={fundraiser.successChance >= 0.6 ? 'success-high' : 'success-low'}>
                          🎯 {Math.round(fundraiser.successChance * 100)}% chance
                        </span>
                      </div>
                      <button 
                        className="cancel-button"
                        onClick={once(() => onCancelFundraiser(fundraiser.id))}
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
                    <p>Food Cost: {FUNDRAISER_CONFIG.FOOD_COST_PER_RESIDENT} units/resident</p>
                    <p>On Success: +{FUNDRAISER_CONFIG.LIFE_BOOST} LIFE each, -{FUNDRAISER_CONFIG.HEALTH_COST} Health, +{FUNDRAISER_CONFIG.REPUTATION_BOOST} Rep</p>
                    <p>On Failure: No money, +{FUNDRAISER_CONFIG.LIFE_BOOST_FAILURE} LIFE each, {FUNDRAISER_CONFIG.FAILURE_HEALTH_PENALTY} Health, {FUNDRAISER_CONFIG.FAILURE_REPUTATION_PENALTY} Rep</p>
                    <p>Group size: random {FUNDRAISER_CONFIG.MIN_GROUP}-{FUNDRAISER_CONFIG.MAX_GROUP} residents, one group at a time</p>
                  </div>

                  <p className="fundraiser-ready">
                    👥 {fundraiserStatus.availableResidents} rested resident{fundraiserStatus.availableResidents === 1 ? '' : 's'} ready.
                    A random group will take part.
                  </p>
                  {!isNight && fundraiserStatus.stationBusy && (
                    <p className="warning">⏳ The station is busy. Wait for the current group to finish.</p>
                  )}

                  {/* Show fatigued residents separately */}
                  {gameState.residents.some(r => isResidentFatigued(r) || r.currentNeed === "health") && (
                    <div className="fatigued-residents">
                      <h5>⏳ Unavailable Residents</h5>
                      {gameState.residents.filter(r => isResidentFatigued(r) || r.currentNeed === "health").map(resident => {
                        const minutes = Math.ceil(getResidentFatigueRemaining(resident) / 60000);
                        return (
                          <div key={resident.id} className="fatigued-resident-item">
                            <span>{getProfileIcon(resident.profile)} {resident.name}</span>
                            <span>{resident.currentNeed === "health" ? "🏥 In the clinic" : `Ready in ${minutes} min`}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    className="start-fundraiser-button"
                    onClick={once(onStartFundraiser)}
                    disabled={
                      isNight ||
                      !fundraiserStatus.canStart ||
                      gameState.food < calculateFundraiserFoodCost(FUNDRAISER_CONFIG.MIN_NON_FATIGUED_RESIDENTS)
                    }
                  >
                    {isNight ? 'Cannot Start Fundraiser at Night' : '🎪 Start Fundraiser'}
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
                <p>Cost: {formatMoney(calculateExpansionCost())}</p>
              </div>

              <div className="expansion-buttons">
                {(['north', 'east', 'west'] as const).map(direction => {
                  const canExpand = canExpandInDirection(direction);
                  const cost = calculateExpansionCost();
                  const canAfford = gameState.money >= cost;
                  
                  return (
                    <button
                      key={direction}
                      className={`expansion-button ${direction}`}
                      onClick={once(() => onExpandGrid(direction))}
                      disabled={!canExpand || !canAfford}
                      title={!canExpand ? 'Cannot expand beyond grid' : !canAfford ? 'Insufficient funds' : `Expand ${direction}`}
                    >
                      {direction === 'north' && '⬆️'}
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
                {gameState.residents.map(resident => (
                  <ResidentCard key={resident.id} resident={resident} gameState={gameState} />
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
