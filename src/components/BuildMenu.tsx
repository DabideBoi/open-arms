import React, { useState } from 'react';
import { RoomType } from '../types';
import { ROOM_SPECS } from '../constants';
import './BuildMenu.css';

interface BuildMenuProps {
  onPlaceRoom: (roomType: RoomType, gridX: number, gridY: number) => void;
  onRoomSelected: (roomType: RoomType | null) => void;
  currentMoney: number;
}

/**
 * Build menu for placing rooms
 */
export const BuildMenu: React.FC<BuildMenuProps> = ({ onPlaceRoom, onRoomSelected, currentMoney }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  
  const roomTypes: RoomType[] = [
    'dormitory',
    'cafeteria',
    'learning_center',
    'vocational_room',
    'bathroom',
    'common_room',
    'admin_office',
    'fundraiser_station'
  ];
  
  // Group rooms by category for better organization
  const roomCategories = {
    'Essential': ['dormitory', 'cafeteria', 'bathroom'] as RoomType[],
    'Learning': ['learning_center', 'vocational_room'] as RoomType[],
    'Social': ['common_room'] as RoomType[],
    'Management': ['admin_office', 'fundraiser_station'] as RoomType[]
  };
  
  const handleRoomSelect = (roomType: RoomType) => {
    setSelectedRoom(roomType);
    // Enter placement mode - notify parent component
    onRoomSelected(roomType);
  };
  
  return (
    <div className="build-menu">
      <button
        className="build-menu-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        🏗️ Build Menu
      </button>
      
      {isOpen && (
        <div className="build-menu-panel">
          <h3>Build Rooms</h3>
          {Object.entries(roomCategories).map(([category, types]) => (
            <div key={category} className="room-category">
              <h4>{category}</h4>
              <div className="room-list">
                {types.map(roomType => {
                  const spec = ROOM_SPECS[roomType];
                  const canAfford = currentMoney >= spec.buildCost;
                  
                  return (
                    <button
                      key={roomType}
                      className={`room-button ${!canAfford ? 'disabled' : ''}`}
                      onClick={() => canAfford && handleRoomSelect(roomType)}
                      disabled={!canAfford}
                    >
                      <div className="room-name">
                        {roomType.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="room-info">
                        <span>Size: {spec.width}×{spec.height}</span>
                        <span className={canAfford ? 'cost-affordable' : 'cost-expensive'}>
                          💰 ${spec.buildCost}
                        </span>
                      </div>
                      <div className="room-details">
                        Capacity: {spec.capacity > 0 ? spec.capacity : 'Unlimited'} |
                        Maintenance: ${spec.maintenanceCost}/cycle
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
