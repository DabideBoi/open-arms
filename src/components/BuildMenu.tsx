import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RoomType, Room, ShelterTier, GameState, Gender, RoomEffect } from '../types';
import { ROOM_SPECS, ADJACENCY_BONUSES, getAdjacencyBonusKey, SHELTER_TIERS, roomKind } from '../constants';
import { isRoomAvailable, getLockedRooms } from '../game/systems/TierSystem';
import './BuildMenu.css';
import { formatMoney } from '../utils/helpers';

interface BuildMenuProps {
  onPlaceRoom: (roomType: RoomType, gridX: number, gridY: number) => void;
  onRoomSelected: (roomType: RoomType | null, dormGender?: Gender | 'any') => void;
  currentMoney: number;
  gameState: GameState;
  placementPreview?: {
    isPositive: boolean;
    isNegative: boolean;
    summary: string;
    bonusDescriptions: string[];
  } | null;
  // Controlled mode props for single-menu-at-a-time behavior
  isOpen?: boolean;
  onToggle?: () => void;
}

/**
 * Get adjacency synergies for a room type
 */
const effectText = (e: RoomEffect) =>
  [e.health ? `${e.health > 0 ? '+' : ''}${e.health} health` : '',
   e.lifeFillModifier ? `+${Math.round(e.lifeFillModifier * 100)}% LIFE` : ''].filter(Boolean).join(', ');

function getRoomSynergies(roomType: RoomType): { positive: string[]; negative: string[]; notes: string[] } {
  const positive: string[] = [];
  const negative: string[] = [];
  const notes: string[] = [];
  const spec = ROOM_SPECS[roomType];
  if (spec.baseType) notes.push(`Works as a ${spec.baseType.replace(/_/g, ' ')}`);
  if (spec.bonus) notes.push(`Residents here: ${effectText(spec.bonus)}`);
  if (spec.aura) notes.push(`Rooms touching it: ${effectText(spec.aura)}`);
  
  // Pairings are defined between base room kinds only
  const baseTypes = [...new Set((Object.keys(ROOM_SPECS) as RoomType[]).map(roomKind))];
  
  for (const otherType of baseTypes) {
    if (otherType === roomKind(roomType)) continue;
    
    const key = getAdjacencyBonusKey(roomKind(roomType), otherType);
    const bonus = ADJACENCY_BONUSES[key];
    
    if (bonus) {
      const roomName = otherType.replace(/_/g, ' ');
      if (bonus.health > 0 || bonus.lifeFillModifier > 0 || bonus.maintenanceReduction > 0) {
        positive.push(roomName);
      } else if (bonus.health < 0 || bonus.lifeFillModifier < 0 || bonus.maintenanceReduction < 0) {
        negative.push(roomName);
      }
    }
  }
  
  return { positive, negative, notes };
}

/**
 * Get room unlock tier info
 */
function getRoomUnlockTier(roomType: RoomType): ShelterTier {
  for (let tier = 1; tier <= 4; tier++) {
    const tierConfig = SHELTER_TIERS[tier as ShelterTier];
    if (tierConfig.availableRooms === 'all' || tierConfig.availableRooms.includes(roomType)) {
      return tier as ShelterTier;
    }
  }
  return 4; // Default to tier 4 if not found
}

/**
 * Tooltip component that renders via portal with fixed positioning
 */
interface TooltipProps {
  buttonRef: HTMLButtonElement | null;
  panelRef: HTMLDivElement | null;
  synergies: { positive: string[]; negative: string[]; notes: string[] };
}

const SynergyTooltip: React.FC<TooltipProps> = ({ buttonRef, panelRef, synergies }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    if (!buttonRef || !panelRef) return;
    
    const updatePosition = () => {
      const buttonRect = buttonRef.getBoundingClientRect();
      const panelRect = panelRef.getBoundingClientRect();
      
      // Position tooltip to the left of the build menu panel (not the button)
      // Use panel's left edge as reference, with 15px gap
      setPosition({
        x: panelRect.left - 15, // 15px gap from panel
        y: buttonRect.top // Align vertically with the hovered button
      });
    };
    
    updatePosition();
    
    // Update position on scroll or resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [buttonRef, panelRef]);
  
  if (!buttonRef) return null;
  
  return createPortal(
    <div
      className="synergy-tooltip-portal"
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateX(-100%)'
      }}
    >
      <h5>📐 Adjacency Synergies</h5>
      {synergies.notes.map(n => (
        <div key={n} className="synergy-positive">
          <span className="synergy-label">✨</span>
          <span className="synergy-list">{n}</span>
        </div>
      ))}
      {synergies.positive.length > 0 && (
        <div className="synergy-positive">
          <span className="synergy-label">✅ Good next to:</span>
          <span className="synergy-list">{synergies.positive.join(', ')}</span>
        </div>
      )}
      {synergies.negative.length > 0 && (
        <div className="synergy-negative">
          <span className="synergy-label">❌ Avoid next to:</span>
          <span className="synergy-list">{synergies.negative.join(', ')}</span>
        </div>
      )}
    </div>,
    document.body
  );
};

/**
 * Build menu for placing rooms with adjacency bonus information
 */
export const BuildMenu: React.FC<BuildMenuProps> = ({
  onPlaceRoom,
  onRoomSelected,
  currentMoney,
  gameState,
  placementPreview,
  isOpen: controlledIsOpen,
  onToggle
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;
  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalIsOpen(!internalIsOpen);
    }
  };
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [dormGender, setDormGender] = useState<Gender | 'any'>('any');
  // Menu closes once a room is picked; drop the stale 'Placing' state with it
  useEffect(() => { if (!isOpen) setSelectedRoom(null); }, [isOpen]);
  const [hoveredRoom, setHoveredRoom] = useState<RoomType | null>(null);
  const [hoveredButtonRef, setHoveredButtonRef] = useState<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  const currentTier = gameState.currentTier;
  const tierConfig = SHELTER_TIERS[currentTier];
  
  // Group rooms by category for better organization
  const roomCategories = {
    'Essential': ['dormitory', 'cafeteria', 'bathroom'] as RoomType[],
    'Upgrades': ['large_dormitory', 'dining_hall', 'medical_center'] as RoomType[],
    'Health': ['clinic'] as RoomType[],
    'Social': ['common_room', 'library', 'garden'] as RoomType[],
    'Decor': ['potted_plant', 'fountain'] as RoomType[],
    'Management': ['admin_office', 'fundraiser_station'] as RoomType[]
  };
  
  const handleRoomSelect = (roomType: RoomType) => {
    setSelectedRoom(roomType);
    // Enter placement mode - notify parent component
    onRoomSelected(roomType, roomKind(roomType) === 'dormitory' ? dormGender : undefined);
  };
  
  const handleCancelPlacement = () => {
    setSelectedRoom(null);
    onRoomSelected(null);
  };
  
  // Get synergies for hovered room
  const synergies = hoveredRoom ? getRoomSynergies(hoveredRoom) : null;
  
  return (
    <div className="build-menu">
      {isOpen && (
        <div className="build-menu-panel" ref={panelRef}>
          <h3>Build Rooms</h3>
          
          {/* Placement Preview */}
          {selectedRoom && placementPreview && (
            <div className={`placement-preview ${placementPreview.isPositive ? 'positive' : ''} ${placementPreview.isNegative ? 'negative' : ''}`}>
              <div className="preview-header">
                <strong>Placement Preview</strong>
                <button className="cancel-btn" onClick={handleCancelPlacement}>✕</button>
              </div>
              <div className="preview-summary">{placementPreview.summary}</div>
              {placementPreview.bonusDescriptions.length > 0 && (
                <ul className="preview-details">
                  {placementPreview.bonusDescriptions.map((desc, i) => (
                    <li key={i}>{desc}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          
          {/* Selected Room Indicator */}
          {selectedRoom && !placementPreview && (
            <div className="selected-room-indicator">
              <span>Placing: {selectedRoom.replace(/_/g, ' ').toUpperCase()}</span>
              <button className="cancel-btn" onClick={handleCancelPlacement}>✕ Cancel</button>
            </div>
          )}
          
          {/* Current Tier Info */}
          <div className="tier-info-bar">
            <span className="tier-badge">🏠 {tierConfig.name}</span>
            <span className="tier-capacity">Max {tierConfig.maxResidents} residents</span>
          </div>
          
          {Object.entries(roomCategories).map(([category, types]) => (
            <div key={category} className="room-category">
              <h4>{category}</h4>
              <div className="room-list">
                {types.map(roomType => {
                  const spec = ROOM_SPECS[roomType];
                  const canAfford = currentMoney >= spec.buildCost;
                  const isSelected = selectedRoom === roomType;
                  const isAvailable = isRoomAvailable(gameState, roomType);
                  const unlockTier = getRoomUnlockTier(roomType);
                  const isLocked = !isAvailable;
                  const isHovered = hoveredRoom === roomType;
                  const roomSynergies = isHovered ? getRoomSynergies(roomType) : null;
                  
                  return (
                    <div key={roomType} className="room-button-container">
                      <button
                        ref={(el) => {
                          if (isHovered) {
                            setHoveredButtonRef(el);
                          }
                        }}
                        className={`room-button ${!canAfford && !isLocked ? 'disabled' : ''} ${isSelected ? 'selected' : ''} ${isLocked ? 'locked' : ''}`}
                        onClick={() => !isLocked && canAfford && handleRoomSelect(roomType)}
                        onMouseEnter={(e) => {
                          setHoveredRoom(roomType);
                          setHoveredButtonRef(e.currentTarget);
                        }}
                        onMouseLeave={() => {
                          setHoveredRoom(null);
                          setHoveredButtonRef(null);
                        }}
                        disabled={!canAfford || isLocked}
                      >
                        <div className="room-name">
                          {roomType.replace(/_/g, ' ').toUpperCase()}
                          {isLocked && <span className="lock-icon">🔒</span>}
                        </div>
                        
                        {isLocked ? (
                          <div className="locked-message">
                            <span className="unlock-requirement">
                              Requires Tier {unlockTier}: {SHELTER_TIERS[unlockTier].name}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="room-info">
                              <span>Size: {spec.width}×{spec.height}</span>
                              <span className={canAfford ? 'cost-affordable' : 'cost-expensive'}>
                                💰 {formatMoney(spec.buildCost)}
                              </span>
                            </div>
                            <div className="room-details">
                              Capacity: {spec.capacity > 0 ? spec.capacity : 'Unlimited'} |
                              Maintenance: {formatMoney(spec.maintenanceCost)}/cycle
                            </div>
                          </>
                        )}
                      </button>
                      {roomKind(roomType) === 'dormitory' && (
                        <div className="dorm-gender-picker">
                          {(['any', 'male', 'female'] as const).map(g => (
                            <button
                              key={g}
                              type="button"
                              className={`dorm-gender-option ${dormGender === g ? 'active' : ''}`}
                              onClick={() => setDormGender(g)}
                            >
                              {g === 'any' ? 'Any' : g === 'male' ? '♂ Male' : '♀ Female'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Portal-based tooltip that renders outside the menu panel */}
      {hoveredRoom && hoveredButtonRef && synergies && (synergies.positive.length > 0 || synergies.negative.length > 0 || synergies.notes.length > 0) && (
        <SynergyTooltip buttonRef={hoveredButtonRef} panelRef={panelRef.current} synergies={synergies} />
      )}
    </div>
  );
};
