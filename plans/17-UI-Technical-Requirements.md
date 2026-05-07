# UI/UX Technical Requirements

---

## Overview

The UI layer is built with React for menus, HUD, and modals, while Phaser/PixiJS handles the game canvas rendering. Communication between layers uses an event bus pattern.

---

## Architecture

### Layer Separation

```
┌─────────────────────────────────────────┐
│         React UI Layer (Overlay)         │
│  - HUD                                   │
│  - Modals                                │
│  - Menus                                 │
│  - Build Mode UI                         │
└──────────────┬──────────────────────────┘
               │ Event Bus
┌──────────────▼──────────────────────────┐
│      Phaser/PixiJS Game Canvas          │
│  - Grid rendering                        │
│  - Room sprites                          │
│  - Resident sprites                      │
│  - Animations                            │
└─────────────────────────────────────────┘
```

---

## React Component Structure

### App Structure

```typescript
<App>
  <GameStateProvider>
    <GameCanvas />           {/* Phaser/PixiJS container */}
    <HUD />                  {/* Top bar with stats */}
    <Sidebar />              {/* Right sidebar */}
    <BuildModeUI />          {/* Build mode controls */}
    <EventModal />           {/* Event dialogs */}
    <ResidentPanel />        {/* Resident details */}
    <SettingsMenu />         {/* Settings */}
    <NotificationContainer /> {/* Toast notifications */}
  </GameStateProvider>
</App>
```

### Component Hierarchy

```typescript
// Context Provider
const GameStateContext = React.createContext<GameState | null>(null);

function GameStateProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  
  useEffect(() => {
    // Subscribe to game state changes
    gameEventBus.on('state_changed', (newState: GameState) => {
      setGameState(newState);
    });
    
    // Load initial state
    const loaded = loadGame() || initializeNewGame();
    setGameState(loaded);
  }, []);
  
  return (
    <GameStateContext.Provider value={gameState}>
      {children}
    </GameStateContext.Provider>
  );
}

// Custom hook
function useGameState(): GameState | null {
  return useContext(GameStateContext);
}
```

---

## HUD Components

### Top HUD

```typescript
function HUD() {
  const gameState = useGameState();
  
  if (!gameState) return null;
  
  return (
    <div className="hud-top">
      <MoneyDisplay money={gameState.money} />
      <ReputationBar reputation={gameState.reputation} />
      <ResidentCount count={gameState.residents.length} />
      <DayDisplay day={gameState.currentDay} phase={gameState.currentPhase} />
    </div>
  );
}

function MoneyDisplay({ money }: { money: number }) {
  const color = money < 0 ? 'red' : money < 500 ? 'orange' : 'green';
  
  return (
    <div className="money-display" style={{ color }}>
      <span className="icon">💰</span>
      <span className="value">${money.toLocaleString()}</span>
    </div>
  );
}

function ReputationBar({ reputation }: { reputation: number }) {
  const tier = getReputationTier(reputation);
  
  return (
    <div className="reputation-bar">
      <div className="label">Reputation</div>
      <div className="bar-container">
        <div 
          className="bar-fill" 
          style={{ 
            width: `${reputation}%`,
            backgroundColor: tier.color
          }}
        />
      </div>
      <div className="value">{reputation}%</div>
    </div>
  );
}
```

### Sidebar

```typescript
function Sidebar() {
  const gameState = useGameState();
  const [activeTab, setActiveTab] = useState<'timers' | 'events' | 'fundraisers'>('timers');
  
  return (
    <div className="sidebar">
      <div className="tabs">
        <button onClick={() => setActiveTab('timers')}>Timers</button>
        <button onClick={() => setActiveTab('events')}>Events</button>
        <button onClick={() => setActiveTab('fundraisers')}>Fundraisers</button>
      </div>
      
      <div className="content">
        {activeTab === 'timers' && <TimersPanel gameState={gameState} />}
        {activeTab === 'events' && <EventsPanel gameState={gameState} />}
        {activeTab === 'fundraisers' && <FundraisersPanel gameState={gameState} />}
      </div>
    </div>
  );
}

function TimersPanel({ gameState }: { gameState: GameState }) {
  return (
    <div className="timers-panel">
      <TimerDisplay 
        label="Next Donation"
        icon="💰"
        nextTrigger={gameState.nextDonationCheck}
      />
      <TimerDisplay 
        label="Maintenance"
        icon="🔧"
        nextTrigger={gameState.nextMaintenanceCheck}
      />
      <TimerDisplay 
        label="Phase Change"
        icon={gameState.currentPhase === 'day' ? '☀️' : '🌙'}
        nextTrigger={gameState.nextDayNightTransition}
      />
    </div>
  );
}
```

---

## Modal Components

### Event Modal

```typescript
function EventModal({ event, onResolve }: { 
  event: GameEvent; 
  onResolve: (optionIndex: number) => void;
}) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  return (
    <div className="modal-overlay">
      <div className="modal event-modal">
        <h2>{event.title}</h2>
        <p>{event.description}</p>
        
        <div className="options">
          {event.options.map((option, index) => (
            <button
              key={index}
              className={selectedOption === index ? 'selected' : ''}
              onClick={() => setSelectedOption(index)}
            >
              <div className="option-label">{option.label}</div>
              <div className="option-effects">
                {option.effects.map((effect, i) => (
                  <EffectPreview key={i} effect={effect} />
                ))}
              </div>
            </button>
          ))}
        </div>
        
        <div className="modal-actions">
          <button 
            onClick={() => selectedOption !== null && onResolve(selectedOption)}
            disabled={selectedOption === null}
          >
            Confirm
          </button>
        </div>
        
        {event.expiresAt && (
          <div className="timer">
            Time remaining: {getEventTimeRemaining(event)}
          </div>
        )}
      </div>
    </div>
  );
}
```

### Resident Panel

```typescript
function ResidentPanel({ resident, onClose }: { 
  resident: Resident; 
  onClose: () => void;
}) {
  const profileSpec = PROFILE_SPECS[resident.profile];
  
  return (
    <div className="resident-panel">
      <div className="header">
        <span className="icon">{profileSpec.icon}</span>
        <h3>{resident.name}</h3>
        <button className="close" onClick={onClose}>×</button>
      </div>
      
      <div className="stats">
        <StatBar 
          label="Happiness"
          value={resident.happiness}
          max={100}
          color="#FFD700"
        />
        <StatBar 
          label="LIFE Progress"
          value={resident.lifeMeter}
          max={100}
          color="#00CC00"
        />
      </div>
      
      <div className="info">
        <div className="info-row">
          <span className="label">Profile:</span>
          <span className="value">{profileSpec.displayName}</span>
        </div>
        <div className="info-row">
          <span className="label">Days in shelter:</span>
          <span className="value">{resident.daysInShelter}</span>
        </div>
        <div className="info-row">
          <span className="label">Arrival reason:</span>
          <span className="value">{resident.arrivalReason}</span>
        </div>
        <div className="info-row">
          <span className="label">Current state:</span>
          <span className="value">{resident.currentState}</span>
        </div>
      </div>
    </div>
  );
}
```

---

## Build Mode UI

### Build Mode Component

```typescript
function BuildModeUI({ active, onExit }: { 
  active: boolean; 
  onExit: () => void;
}) {
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const gameState = useGameState();
  
  if (!active) return null;
  
  return (
    <div className="build-mode-ui">
      <div className="build-menu">
        <h3>Build Mode</h3>
        
        <div className="room-types">
          {Object.entries(ROOM_SPECS).map(([type, spec]) => (
            <RoomTypeButton
              key={type}
              roomType={type as RoomType}
              spec={spec}
              selected={selectedRoomType === type}
              canAfford={gameState.money >= spec.buildCost}
              onClick={() => setSelectedRoomType(type as RoomType)}
            />
          ))}
        </div>
        
        <button className="exit-build-mode" onClick={onExit}>
          Exit Build Mode
        </button>
      </div>
      
      {selectedRoomType && (
        <div className="placement-info">
          <p>Click on the grid to place {selectedRoomType}</p>
          <p>Cost: ${ROOM_SPECS[selectedRoomType].buildCost}</p>
        </div>
      )}
    </div>
  );
}

function RoomTypeButton({ roomType, spec, selected, canAfford, onClick }: {
  roomType: RoomType;
  spec: RoomSpec;
  selected: boolean;
  canAfford: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`room-type-button ${selected ? 'selected' : ''} ${!canAfford ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={!canAfford}
    >
      <div className="room-icon">{getRoomIcon(roomType)}</div>
      <div className="room-name">{roomType.replace('_', ' ')}</div>
      <div className="room-cost">${spec.buildCost}</div>
      <div className="room-size">{spec.width}×{spec.height}</div>
    </button>
  );
}
```

---

## Phaser Integration

### Game Canvas Component

```typescript
function GameCanvas() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize Phaser
    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: canvasRef.current,
      width: 1280,
      height: 720,
      scene: [MainScene],
      physics: {
        default: 'arcade',
        arcade: {
          debug: false
        }
      }
    };
    
    gameRef.current = new Phaser.Game(config);
    
    return () => {
      gameRef.current?.destroy(true);
    };
  }, []);
  
  return <div ref={canvasRef} className="game-canvas" />;
}
```

### Main Scene

```typescript
class MainScene extends Phaser.Scene {
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private roomSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private residentSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  
  create() {
    // Initialize graphics
    this.gridGraphics = this.add.graphics();
    
    // Subscribe to game state changes
    gameEventBus.on('state_changed', (gameState: GameState) => {
      this.updateScene(gameState);
    });
    
    // Subscribe to specific events
    gameEventBus.on('resident_graduated', (data) => {
      this.playGraduationAnimation(data.residentId);
    });
    
    // Handle clicks
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.handleClick(pointer.x, pointer.y);
    });
  }
  
  update(time: number, delta: number) {
    // Update resident sprite positions
    const gameState = gameStateManager.getState();
    
    for (const resident of gameState.residents) {
      const sprite = this.residentSprites.get(resident.id);
      if (sprite) {
        sprite.x = resident.gridX * TILE_SIZE;
        sprite.y = resident.gridY * TILE_SIZE;
      }
    }
  }
  
  private updateScene(gameState: GameState) {
    this.renderGrid(gameState.grid);
    this.renderRooms(gameState.rooms);
    this.renderResidents(gameState.residents);
  }
  
  private renderGrid(grid: Grid) {
    this.gridGraphics.clear();
    
    // Draw tiles
    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {
        const tile = grid.tiles[y][x];
        const color = this.getTileColor(tile);
        
        this.gridGraphics.fillStyle(color, 0.3);
        this.gridGraphics.fillRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
        
        // Grid lines
        this.gridGraphics.lineStyle(1, 0x666666, 0.5);
        this.gridGraphics.strokeRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }
  
  private renderRooms(rooms: Room[]) {
    // Add/update room sprites
    for (const room of rooms) {
      if (!this.roomSprites.has(room.id)) {
        const sprite = this.add.sprite(
          room.gridX * TILE_SIZE,
          room.gridY * TILE_SIZE,
          getRoomTexture(room.type)
        );
        sprite.setOrigin(0, 0);
        this.roomSprites.set(room.id, sprite);
      }
    }
    
    // Remove deleted rooms
    for (const [id, sprite] of this.roomSprites.entries()) {
      if (!rooms.find(r => r.id === id)) {
        sprite.destroy();
        this.roomSprites.delete(id);
      }
    }
  }
  
  private renderResidents(residents: Resident[]) {
    // Add/update resident sprites
    for (const resident of residents) {
      if (!this.residentSprites.has(resident.id)) {
        const sprite = this.add.sprite(
          resident.gridX * TILE_SIZE,
          resident.gridY * TILE_SIZE,
          getResidentTexture(resident.profile)
        );
        this.residentSprites.set(resident.id, sprite);
        
        // Make clickable
        sprite.setInteractive();
        sprite.on('pointerdown', () => {
          gameEventBus.emit('resident_clicked', resident);
        });
      }
    }
    
    // Remove departed residents
    for (const [id, sprite] of this.residentSprites.entries()) {
      if (!residents.find(r => r.id === id)) {
        sprite.destroy();
        this.residentSprites.delete(id);
      }
    }
  }
  
  private playGraduationAnimation(residentId: string) {
    const sprite = this.residentSprites.get(residentId);
    if (!sprite) return;
    
    // Confetti particles
    const particles = this.add.particles('confetti');
    const emitter = particles.createEmitter({
      x: sprite.x,
      y: sprite.y,
      speed: { min: 100, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 1, end: 0 },
      lifespan: 1000,
      quantity: 20
    });
    
    // Clean up after animation
    setTimeout(() => {
      emitter.stop();
      particles.destroy();
    }, 2000);
  }
}
```

---

## Event Bus Communication

### Event Bus Implementation

```typescript
class EventBus {
  private listeners: Map<string, Function[]> = new Map();
  
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index !== -1) {
        callbacks.splice(index, 1);
      }
    }
  }
  
  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      for (const callback of callbacks) {
        callback(data);
      }
    }
  }
}

const gameEventBus = new EventBus();
```

### Event Types

```typescript
// React → Phaser
gameEventBus.emit('build_mode_activated', { roomType: 'dormitory' });
gameEventBus.emit('room_placement_requested', { x: 10, y: 5, type: 'cafeteria' });

// Phaser → React
gameEventBus.emit('resident_clicked', resident);
gameEventBus.emit('room_clicked', room);
gameEventBus.emit('tile_clicked', { x: 10, y: 5 });

// Game State → Both
gameEventBus.emit('state_changed', gameState);
gameEventBus.emit('money_changed', { amount: 1000, reason: 'donation' });
gameEventBus.emit('resident_graduated', { residentId: 'abc-123', name: 'John Doe' });
```

---

## Notification System

```typescript
function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  useEffect(() => {
    gameEventBus.on('notification', (notification: Notification) => {
      setNotifications(prev => [...prev, notification]);
      
      // Auto-remove after duration
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
      }, notification.duration);
    });
  }, []);
  
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <NotificationToast key={notification.id} notification={notification} />
      ))}
    </div>
  );
}

function showNotification(message: string, type: NotificationType): void {
  const notification: Notification = {
    id: generateUUID(),
    type,
    message,
    timestamp: Date.now(),
    duration: 3000
  };
  
  gameEventBus.emit('notification', notification);
}
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile */
@media (max-width: 768px) {
  .hud-top {
    flex-direction: column;
  }
  
  .sidebar {
    display: none; /* Hide on mobile */
  }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .sidebar {
    width: 200px;
  }
}

/* Desktop */
@media (min-width: 1025px) {
  .sidebar {
    width: 300px;
  }
}
```

---

## Accessibility

### Keyboard Navigation

```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        // Close modals
        break;
      case 'b':
        // Toggle build mode
        break;
      case 'p':
        // Pause game
        break;
      case 's':
        // Save game
        break;
    }
  };
  
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

### ARIA Labels

```typescript
<button aria-label="Open build mode">
  🏗️
</button>

<div role="progressbar" aria-valuenow={reputation} aria-valuemin={0} aria-valuemax={100}>
  Reputation: {reputation}%
</div>
```
