import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { createPhaserGame, destroyPhaserGame } from './game/PhaserGame';
import { GameStateManager, createInitialGameState } from './game/systems/GameStateManager';
import { placeRoom, expandGrid } from './game/systems/GridSystem';
import { startFundraiser, cancelFundraiser } from './game/systems/FundraiserSystem';
import { EventSystem, GameEvent, EventType } from './game/systems/EventSystem';
import { getAudioSystem, playSFX } from './game/systems/AudioSystem';
import { saveGame } from './game/systems/SaveLoadSystem';
import { transitionToDay, transitionToNight } from './game/systems/DayNightSystem';
import { initializeCafeteriaGeneration } from './game/systems/FoodSystem';
import { setDevTimersEnabled, isDevTimersEnabled } from './constants';
import { HUD } from './components/HUD';
import { BuildMenu } from './components/BuildMenu';
import { ManagementPanel } from './components/ManagementPanel';
import { EventModal } from './components/EventModal';
import { NotificationContainer, useNotifications } from './components/NotificationToast';
import { SettingsModal } from './components/SettingsModal';
import { TutorialModal, useTutorial } from './components/TutorialModal';
import { GameOverModal, checkVictoryConditions, checkGameOverConditions } from './components/GameOverModal';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { DevModeMenu } from './components/DevModeMenu';
import { GameState, RoomType } from './types';
import { MainScene } from './game/scenes/MainScene';
import './App.css';

/**
 * Main App component
 */
function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const gameStateManagerRef = useRef<GameStateManager | null>(null);
  const mainSceneRef = useRef<MainScene | null>(null);
  const eventSystemRef = useRef<EventSystem | null>(null);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [totalMoneyEarned, setTotalMoneyEarned] = useState(0);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [showDevMode, setShowDevMode] = useState(false);
  const [devTimersEnabled, setDevTimersEnabledState] = useState(isDevTimersEnabled());
  
  const { notifications, addNotification, dismissNotification } = useNotifications();
  const { showTutorial, completeTutorial, skipTutorial } = useTutorial();
  const audioSystem = getAudioSystem();
  
  // Check end game conditions
  const checkEndGameConditions = (state: GameState) => {
    if (showGameOver) return; // Already showing game over
    
    const victory = checkVictoryConditions(state.graduatedCount, state.reputation, state.currentDay);
    const gameOver = checkGameOverConditions(state.money, state.reputation);
    
    if (victory && !isVictory) {
      setIsVictory(true);
      setShowGameOver(true);
      playSFX('graduation');
    } else if (gameOver && !showGameOver) {
      setIsVictory(false);
      setShowGameOver(true);
      playSFX('error');
    }
  };
  
  useEffect(() => {
    // Initialize game state manager
    if (!gameStateManagerRef.current) {
      gameStateManagerRef.current = new GameStateManager();
      
      // Subscribe to state changes
      gameStateManagerRef.current.subscribe((state) => {
        setGameState({ ...state });
        checkEndGameConditions(state);
      });
      
      // Set initial state
      const initialState = gameStateManagerRef.current.getState();
      setGameState(initialState);
      setTotalMoneyEarned(initialState.money);
    }
    
    // Initialize event system
    if (!eventSystemRef.current) {
      eventSystemRef.current = new EventSystem();
    }
    
    // Initialize Phaser game - use setTimeout to ensure ref is set
    const initPhaser = () => {
      if (gameContainerRef.current && !gameRef.current && gameStateManagerRef.current) {
        try {
          gameRef.current = createPhaserGame(
            gameContainerRef.current,
            gameStateManagerRef.current
          );
          
          // Get reference to MainScene when it's ready
          if (gameRef.current) {
            // Wait for the scene to be created and started
            const checkScene = () => {
              const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
              if (scene && scene.sys) {
                mainSceneRef.current = scene;
              } else {
                setTimeout(checkScene, 50);
              }
            };
            // Start checking after a short delay to allow scene initialization
            setTimeout(checkScene, 150);
          }
        } catch (error) {
          console.error('[App] Error creating Phaser game:', error);
        }
      }
    };
    
    // Delay Phaser initialization to ensure DOM ref is ready
    setTimeout(initPhaser, 100);
    
    // Set up keyboard shortcuts
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handlePauseToggle();
      } else if (e.code === 'KeyS' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleSaveGame();
      } else if (e.code === 'F12') {
        e.preventDefault();
        setShowDevMode(!showDevMode);
      } else if (e.code === 'Escape') {
        if (showDevMode) {
          setShowDevMode(false);
        } else {
          setShowSettings(false);
          setCurrentEvent(null);
          setSelectedRoomType(null); // Cancel placement mode
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    
    // Set up event listeners for game events
    const handleEventTriggered = (event: CustomEvent) => {
      setCurrentEvent(event.detail);
      playSFX('event');
    };
    
    const handleAddResidents = (event: CustomEvent) => {
      const { count } = event.detail;
      addNotification(`${count} new residents arrived!`, 'info');
    };
    
    window.addEventListener('game:event_triggered' as any, handleEventTriggered);
    window.addEventListener('game:add_residents' as any, handleAddResidents);
    
    // Start background music
    audioSystem.updateMusicForPhase('day');
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('game:event_triggered' as any, handleEventTriggered);
      window.removeEventListener('game:add_residents' as any, handleAddResidents);
      
      if (gameRef.current) {
        destroyPhaserGame(gameRef.current);
        gameRef.current = null;
      }
      
      audioSystem.destroy();
    };
  }, []);
  
  // Update event system
  useEffect(() => {
    if (!eventSystemRef.current || !gameState) return;
    
    const interval = setInterval(() => {
      eventSystemRef.current!.update(gameState);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameState]);
  
  // Update music based on day/night cycle
  useEffect(() => {
    if (gameState) {
      audioSystem.updateMusicForPhase(gameState.currentPhase);
    }
  }, [gameState?.currentPhase]);
  
  const handlePlaceRoom = (roomType: RoomType, gridX: number, gridY: number) => {
    if (!gameStateManagerRef.current) return;
    
    // DEBUG: Log placement handler call
    console.log('[App] handlePlaceRoom called, current selectedRoomType:', selectedRoomType);
    
    const state = gameStateManagerRef.current.getMutableState();
    const result = placeRoom(
      state.grid,
      state.rooms,
      state.money,
      roomType,
      gridX,
      gridY,
      state.currentPhase
    );
    
    if (result.success && result.newMoney !== undefined) {
      state.money = result.newMoney;
      
      // Initialize food generation for cafeterias
      if (roomType === 'cafeteria' && result.room) {
        initializeCafeteriaGeneration(result.room.id);
        console.log(`🍽️ Initialized food generation for cafeteria ${result.room.id}`);
      }
      
      gameStateManagerRef.current.forceUpdate();
      playSFX('build');
      addNotification(`Built ${roomType.replace('_', ' ')}!`, 'success');
      
      // DEBUG: Log before clearing placement mode
      console.log('[App] Room placed successfully, clearing placement mode');
      setSelectedRoomType(null); // Clear placement mode after successful placement
    } else {
      playSFX('error');
      addNotification(result.error || 'Failed to place room', 'error');
    }
  };
  
  const handleRoomSelected = (roomType: RoomType | null) => {
    setSelectedRoomType(roomType);
    
    // Wait for MainScene to be ready before entering placement mode
    if (roomType) {
      const tryEnterPlacementMode = () => {
        if (mainSceneRef.current) {
          mainSceneRef.current.enterPlacementMode(roomType);
        } else {
          // MainScene not ready yet, retry after a short delay
          setTimeout(tryEnterPlacementMode, 50);
        }
      };
      tryEnterPlacementMode();
    } else if (mainSceneRef.current) {
      // Cancel placement mode
      console.log('[App] Canceling placement mode via exitPlacementMode');
      mainSceneRef.current.exitPlacementMode();
    }
  };
  
  // Watch selectedRoomType and exit placement mode when it becomes null
  useEffect(() => {
    if (selectedRoomType === null && mainSceneRef.current) {
      console.log('[App] selectedRoomType is null, exiting placement mode');
      mainSceneRef.current.exitPlacementMode();
    }
  }, [selectedRoomType]);
  
  // Listen for placement events from MainScene
  useEffect(() => {
    // Set up place_room event listener
    
    const handlePlaceRoomEvent = (event: CustomEvent) => {
      const { roomType, gridX, gridY } = event.detail;
      console.log('[App] place_room event received');
      handlePlaceRoom(roomType, gridX, gridY);
    };
    
    const handleShowNotification = (event: CustomEvent) => {
      const { message, type } = event.detail;
      addNotification(message, type);
    };
    
    window.addEventListener('game:place_room' as any, handlePlaceRoomEvent);
    window.addEventListener('game:show_notification' as any, handleShowNotification);
    
    return () => {
      window.removeEventListener('game:place_room' as any, handlePlaceRoomEvent);
      window.removeEventListener('game:show_notification' as any, handleShowNotification);
    };
  }, [handlePlaceRoom]);
  
  const handleStartFundraiser = (stationId: string, residentIds: string[]) => {
    if (!gameStateManagerRef.current) return;
    
    const state = gameStateManagerRef.current.getMutableState();
    const result = startFundraiser(state, stationId, residentIds);
    
    if (result.success) {
      gameStateManagerRef.current.forceUpdate();
      playSFX('click');
      addNotification('Fundraiser started!', 'success');
    } else {
      playSFX('error');
      addNotification(result.error || 'Failed to start fundraiser', 'error');
    }
  };
  
  const handleCancelFundraiser = (fundraiserId: string) => {
    if (!gameStateManagerRef.current) return;
    
    const state = gameStateManagerRef.current.getMutableState();
    const result = cancelFundraiser(state, fundraiserId);
    
    if (result.success) {
      gameStateManagerRef.current.forceUpdate();
      addNotification('Fundraiser cancelled', 'info');
    } else {
      addNotification(result.error || 'Failed to cancel fundraiser', 'error');
    }
  };
  
  const handleExpandGrid = (direction: 'north' | 'south' | 'east' | 'west') => {
    if (!gameStateManagerRef.current) return;
    
    const state = gameStateManagerRef.current.getMutableState();
    const result = expandGrid(state.grid, state.money, direction);
    
    if (result.success && result.newMoney !== undefined) {
      state.money = result.newMoney;
      gameStateManagerRef.current.forceUpdate();
      playSFX('build');
      addNotification(`Grid expanded ${direction}!`, 'success');
    } else {
      playSFX('error');
      addNotification(result.error || 'Failed to expand grid', 'error');
    }
  };
  
  const handlePauseToggle = () => {
    if (mainSceneRef.current) {
      const pauseManager = mainSceneRef.current.getPauseManager();
      pauseManager.toggle();
      setIsPaused(pauseManager.isPaused());
      playSFX('click');
    }
  };
  
  const handleSaveGame = () => {
    if (!gameStateManagerRef.current) return;
    
    const state = gameStateManagerRef.current.getState();
    saveGame(state);
    addNotification('Game saved!', 'success');
    playSFX('click');
  };
  
  const handleResolveEvent = (optionIndex: number) => {
    if (!eventSystemRef.current || !currentEvent || !gameStateManagerRef.current) return;
    
    const state = gameStateManagerRef.current.getMutableState();
    const result = eventSystemRef.current.resolveEvent(state, currentEvent.id, optionIndex);
    
    if (result.success) {
      gameStateManagerRef.current.forceUpdate();
      setCurrentEvent(null);
      playSFX('click');
    }
  };
  
  const handleRestartGame = () => {
    if (gameStateManagerRef.current) {
      const newState = createInitialGameState();
      gameStateManagerRef.current.getMutableState().money = newState.money;
      gameStateManagerRef.current.getMutableState().reputation = newState.reputation;
      gameStateManagerRef.current.getMutableState().residents = newState.residents;
      gameStateManagerRef.current.getMutableState().rooms = [];
      gameStateManagerRef.current.getMutableState().currentDay = 1;
      gameStateManagerRef.current.getMutableState().graduatedCount = 0;
      gameStateManagerRef.current.forceUpdate();
      setShowGameOver(false);
      setIsVictory(false);
      setTotalMoneyEarned(newState.money);
    }
  };
  
  // Dev Mode Handlers
  const handleToggleDevTimers = (enabled: boolean) => {
    setDevTimersEnabled(enabled);
    setDevTimersEnabledState(enabled);
    addNotification(
      `Dev timers ${enabled ? 'enabled' : 'disabled'}`,
      'info'
    );
  };
  
  const handleForceDay = () => {
    if (!gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getMutableState();
    transitionToDay(state);
    gameStateManagerRef.current.forceUpdate();
    addNotification('Forced transition to day', 'info');
    playSFX('click');
  };
  
  const handleForceNight = () => {
    if (!gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getMutableState();
    transitionToNight(state);
    gameStateManagerRef.current.forceUpdate();
    addNotification('Forced transition to night', 'info');
    playSFX('click');
  };
  
  const handleTriggerEvent = (eventType: EventType) => {
    if (!eventSystemRef.current || !gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getState();
    eventSystemRef.current.triggerEventByType(state, eventType);
    addNotification(`Triggered ${eventType.replace('_', ' ')} event`, 'info');
    playSFX('event');
  };
  
  const handleModifyResident = (residentId: string, stat: string, value: number) => {
    if (!gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getMutableState();
    const resident = state.residents.find(r => r.id === residentId);
    
    if (resident) {
      if (stat === 'happiness') {
        resident.happiness = Math.max(0, Math.min(100, value));
      } else if (stat === 'lifeMeter') {
        resident.lifeMeter = Math.max(0, Math.min(100, value));
      }
      gameStateManagerRef.current.forceUpdate();
      addNotification(`Modified ${resident.name}'s ${stat}`, 'info');
      playSFX('click');
    }
  };
  
  const handleAddMoney = (amount: number) => {
    if (!gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getMutableState();
    state.money += amount;
    gameStateManagerRef.current.forceUpdate();
    addNotification(`${amount > 0 ? 'Added' : 'Removed'} $${Math.abs(amount)}`, 'info');
    playSFX('click');
  };
  
  const handleSetReputation = (value: number) => {
    if (!gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getMutableState();
    state.reputation = Math.max(0, Math.min(100, value));
    gameStateManagerRef.current.forceUpdate();
    addNotification(`Set reputation to ${value}`, 'info');
    playSFX('click');
  };
  
  if (!gameState) {
    return (
      <div className="loading">
        <h2>Loading Open Arms...</h2>
      </div>
    );
  }
  
  const gameStats = {
    daysSurvived: gameState.currentDay,
    residentsHelped: gameState.residents.length + gameState.graduatedCount,
    graduatedCount: gameState.graduatedCount,
    moneyEarned: totalMoneyEarned,
    finalReputation: gameState.reputation,
    finalMoney: gameState.money
  };
  
  return (
    <div className="app">
      {/* Tutorial Modal */}
      {showTutorial && (
        <TutorialModal
          onComplete={completeTutorial}
          onSkip={skipTutorial}
        />
      )}
      
      {/* Event Modal */}
      {currentEvent && (
        <EventModal
          event={currentEvent}
          onResolve={handleResolveEvent}
          onClose={() => setCurrentEvent(null)}
        />
      )}
      
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          audioSettings={audioSystem.getSettings()}
          onAudioSettingsChange={(settings) => audioSystem.updateSettings(settings)}
          gameSpeed={gameSpeed}
          onGameSpeedChange={setGameSpeed}
          onResetGame={handleRestartGame}
        />
      )}
      
      {/* Game Over / Victory Modal */}
      {showGameOver && (
        <GameOverModal
          isVictory={isVictory}
          stats={gameStats}
          onRestart={handleRestartGame}
          onContinue={isVictory ? () => setShowGameOver(false) : undefined}
        />
      )}
      
      {/* Dev Mode Menu */}
      {showDevMode && (
        <DevModeMenu
          isOpen={showDevMode}
          onClose={() => setShowDevMode(false)}
          gameState={gameState}
          eventSystem={eventSystemRef.current}
          onForceDay={handleForceDay}
          onForceNight={handleForceNight}
          onTriggerEvent={handleTriggerEvent}
          onModifyResident={handleModifyResident}
          onAddMoney={handleAddMoney}
          onSetReputation={handleSetReputation}
          devTimersEnabled={devTimersEnabled}
          onToggleDevTimers={handleToggleDevTimers}
        />
      )}
      
      {/* Dev Mode Indicator */}
      {devTimersEnabled && (
        <div className="dev-mode-indicator">
          🛠️ DEV MODE
        </div>
      )}
      
      {/* Notifications */}
      <NotificationContainer
        notifications={notifications}
        onDismiss={dismissNotification}
      />
      
      {/* HUD */}
      <HUD
        gameState={gameState}
        onPauseToggle={handlePauseToggle}
        isPaused={isPaused}
        onSettingsClick={() => setShowSettings(true)}
      />
      
      {/* Game Canvas */}
      <div ref={gameContainerRef} className="game-container" />
      
      {/* Build Menu */}
      <BuildMenu
        onPlaceRoom={handlePlaceRoom}
        onRoomSelected={handleRoomSelected}
        currentMoney={gameState.money}
      />
      
      {/* Management Panel */}
      <ManagementPanel
        gameState={gameState}
        onStartFundraiser={handleStartFundraiser}
        onCancelFundraiser={handleCancelFundraiser}
        onExpandGrid={handleExpandGrid}
      />
      
      {/* Performance Monitor (F3 to toggle) */}
      <PerformanceMonitor
        scene={mainSceneRef.current}
        gameState={gameState}
      />
      
      {/* Info Panel */}
      <div className="info-panel">
        <h3>🏠 Open Arms - Phase 6: Optimized & Tested</h3>
        <p>🎮 Drag to pan | Scroll to zoom</p>
        <p>⌨️ SPACE: Pause | B: Build | M: Manage | S: Save | F3: Performance | F12: Dev Mode</p>
        <p>👥 {gameState.residents.length} residents | 🎓 {gameState.graduatedCount} graduated</p>
        <p>🌓 {gameState.currentPhase === 'day' ? '☀️ Daytime' : '🌙 Nighttime'}</p>
        <p>⚡ Optimizations: Culling, Pooling, Caching, Staggered Updates</p>
      </div>
    </div>
  );
}

export default App;
