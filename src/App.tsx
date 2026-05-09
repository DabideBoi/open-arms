import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { createPhaserGame, destroyPhaserGame } from './game/PhaserGame';
import { GameStateManager, createInitialGameState } from './game/systems/GameStateManager';
import { placeRoom, expandGrid } from './game/systems/GridSystem';
import { startFundraiser, cancelFundraiser, FundraiserCompletionData } from './game/systems/FundraiserSystem';
import { EventSystem, GameEvent, EventType } from './game/systems/EventSystem';
import { getAudioSystem, playSFX } from './game/systems/AudioSystem';
import { saveGame } from './game/systems/SaveLoadSystem';
import { transitionToDay, transitionToNight } from './game/systems/DayNightSystem';
import { initializeCafeteriaGeneration, changeFoodSetting } from './game/systems/FoodSystem';
import { performUpgrade } from './game/systems/TierSystem';
import { getWarningSystem } from './game/systems/WarningSystem';
import { setDevTimersEnabled, isDevTimersEnabled } from './constants';
import { HUD } from './components/HUD';
import { BuildMenu } from './components/BuildMenu';
import { ManagementPanel } from './components/ManagementPanel';
import { EventModal } from './components/EventModal';
import { NotificationContainer, useNotifications } from './components/NotificationToast';
import { SettingsModal } from './components/SettingsModal';
import { TutorialModal, useTutorial } from './components/TutorialModal';
import { GameOverModal, checkVictoryConditions } from './components/GameOverModal';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { DevModeMenu } from './components/DevModeMenu';
import { MoneyAnimationOverlay } from './components/MoneyAnimations';
import { WarningPanel } from './components/WarningPanel';
import { StatisticsModal } from './components/StatisticsModal';
import { FundraiserCompleteModal } from './components/FundraiserCompleteModal';
import { GameState, RoomType, GameOverReason, Warning, FoodPortionSetting } from './types';
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
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const [showDevMode, setShowDevMode] = useState(false);
  const [devTimersEnabled, setDevTimersEnabledState] = useState(isDevTimersEnabled());
  const [showManagementPanel, setShowManagementPanel] = useState(false);
  const [managementPanelTab, setManagementPanelTab] = useState<string>('residents');
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showWarningPanel, setShowWarningPanel] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
  const [fundraiserCompletionData, setFundraiserCompletionData] = useState<FundraiserCompletionData | null>(null);
  
  // Menu types that are mutually exclusive (only one can be open at a time)
  // Settings modal is a full overlay, so it's treated separately
  type MenuType = 'build' | 'management' | 'warning' | 'devMode' | null;
  
  // Close all side menus (not modals like Settings)
  const closeAllSideMenus = useCallback(() => {
    setShowBuildMenu(false);
    setShowManagementPanel(false);
    setShowWarningPanel(false);
    setShowDevMode(false);
  }, []);
  
  // Open a specific menu, closing others first
  const openMenu = useCallback((menu: MenuType) => {
    closeAllSideMenus();
    switch (menu) {
      case 'build':
        setShowBuildMenu(true);
        break;
      case 'management':
        setShowManagementPanel(true);
        break;
      case 'warning':
        setShowWarningPanel(true);
        break;
      case 'devMode':
        setShowDevMode(true);
        break;
    }
  }, [closeAllSideMenus]);
  
  // Toggle handlers for each menu
  const handleToggleBuildMenu = useCallback(() => {
    if (showBuildMenu) {
      setShowBuildMenu(false);
    } else {
      openMenu('build');
    }
  }, [showBuildMenu, openMenu]);
  
  const handleToggleManagementPanel = useCallback(() => {
    if (showManagementPanel) {
      setShowManagementPanel(false);
    } else {
      openMenu('management');
    }
  }, [showManagementPanel, openMenu]);
  
  const handleToggleWarningPanel = useCallback(() => {
    if (showWarningPanel) {
      setShowWarningPanel(false);
    } else {
      openMenu('warning');
    }
  }, [showWarningPanel, openMenu]);
  
  const handleToggleDevMode = useCallback(() => {
    if (showDevMode) {
      setShowDevMode(false);
    } else {
      openMenu('devMode');
    }
  }, [showDevMode, openMenu]);
  
  const { notifications, addNotification, dismissNotification } = useNotifications();
  const warningSystem = getWarningSystem();
  const { showTutorial, completeTutorial, skipTutorial } = useTutorial();
  const audioSystem = getAudioSystem();
  
  // Check end game conditions
  const checkEndGameConditions = (state: GameState) => {
    if (showGameOver) return; // Already showing game over
    
    // Check victory conditions
    const victory = checkVictoryConditions(state.graduatedCount, state.reputation, state.currentDay);
    
    if (victory && !isVictory) {
      setIsVictory(true);
      setShowGameOver(true);
      setGameOverReason(null);
      playSFX('graduation');
    } else if (state.isGameOver && state.gameOverReason && !showGameOver) {
      // Game over triggered by GameStateManager
      setIsVictory(false);
      setShowGameOver(true);
      setGameOverReason(state.gameOverReason);
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
        handleToggleDevMode();
      } else if (e.code === 'Escape') {
        // Close any open menu/modal
        closeAllSideMenus();
        setShowSettings(false);
        setCurrentEvent(null);
        setSelectedRoomType(null); // Cancel placement mode
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
    
    // Handle game over event from GameStateManager
    const handleGameOver = (event: CustomEvent) => {
      const { reason, message, stats } = event.detail;
      console.log('[App] Game over event received:', reason, message);
      setIsVictory(false);
      setShowGameOver(true);
      setGameOverReason(reason);
      playSFX('error');
    };
    
    // NOTE: Financial warnings are handled by WarningSystem with proper deduplication
    // and cooldowns. See src/game/systems/WarningSystem.ts - checkFinancialWarnings()
    // The WarningSystem dispatches 'game:warning_critical' for critical financial warnings.
    
    // Handle critical warning toast notifications
    const handleCriticalWarning = (event: CustomEvent) => {
      const { warning } = event.detail;
      addNotification(`🚨 ${warning.message}: ${warning.detail || ''}`, 'error');
      playSFX('error');
    };
    
    // Handle warning escalation notifications
    const handleWarningEscalated = (event: CustomEvent) => {
      const { warning } = event.detail;
      addNotification(`⚠️ Warning escalated: ${warning.message}`, 'warning');
    };
    
    // Handle fundraiser completion - show modal with details
    const handleFundraiserCompleted = (event: CustomEvent) => {
      const completionData = event.detail as FundraiserCompletionData;
      setFundraiserCompletionData(completionData);
      
      // Play appropriate sound
      if (completionData.success) {
        playSFX('graduation'); // Success sound
      } else {
        playSFX('error'); // Failure sound
      }
      
      // Also show a notification
      if (completionData.success) {
        addNotification(`🎉 Fundraiser complete! Raised $${completionData.payout.toLocaleString()}`, 'success');
      } else {
        addNotification(`😔 Fundraiser failed. No money raised.`, 'warning');
      }
    };
    
    window.addEventListener('game:event_triggered' as any, handleEventTriggered);
    window.addEventListener('game:add_residents' as any, handleAddResidents);
    window.addEventListener('game:game_over' as any, handleGameOver);
    window.addEventListener('game:warning_critical' as any, handleCriticalWarning);
    window.addEventListener('game:warning_escalated' as any, handleWarningEscalated);
    window.addEventListener('fundraiser_completed' as any, handleFundraiserCompleted);
    
    // Start background music
    audioSystem.updateMusicForPhase('day');
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('game:event_triggered' as any, handleEventTriggered);
      window.removeEventListener('game:add_residents' as any, handleAddResidents);
      window.removeEventListener('game:game_over' as any, handleGameOver);
      window.removeEventListener('game:warning_critical' as any, handleCriticalWarning);
      window.removeEventListener('game:warning_escalated' as any, handleWarningEscalated);
      window.removeEventListener('fundraiser_completed' as any, handleFundraiserCompleted);
      
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
  
  // Update warning system periodically
  useEffect(() => {
    if (!gameStateManagerRef.current || !gameState) return;
    
    const interval = setInterval(() => {
      const mutableState = gameStateManagerRef.current?.getMutableState();
      if (mutableState) {
        warningSystem.updateWarnings(mutableState);
        gameStateManagerRef.current?.forceUpdate();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, [gameState, warningSystem]);
  
  // Update music based on day/night cycle
  useEffect(() => {
    if (gameState) {
      audioSystem.updateMusicForPhase(gameState.currentPhase);
    }
  }, [gameState?.currentPhase]);
  
  const handlePlaceRoom = (roomType: RoomType, gridX: number, gridY: number) => {
    if (!gameStateManagerRef.current) return;
    
    // Check if building is allowed (not during bankruptcy)
    if (!gameStateManagerRef.current.canBuild()) {
      addNotification('Cannot build during bankruptcy! Focus on recovering your finances.', 'error');
      playSFX('error');
      return;
    }
    
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
    
    // Check if fundraisers are allowed (not during bankruptcy)
    if (!gameStateManagerRef.current.canStartFundraiser()) {
      addNotification('Cannot start fundraisers during bankruptcy! Focus on recovering your finances.', 'error');
      playSFX('error');
      return;
    }
    
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
      
      // Mark grid as dirty so MainScene re-renders the expanded grid
      if (mainSceneRef.current) {
        mainSceneRef.current.markGridDirty();
      }
      
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
      // Use the resetGame method to properly reset all state including bankruptcy
      gameStateManagerRef.current.resetGame();
      setShowGameOver(false);
      setIsVictory(false);
      setGameOverReason(null);
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
  
  const handleChangeFoodSetting = (setting: FoodPortionSetting) => {
    if (!gameStateManagerRef.current) return;
    
    const state = gameStateManagerRef.current.getMutableState();
    const result = changeFoodSetting(state, setting);
    
    if (result.success) {
      gameStateManagerRef.current.forceUpdate();
      addNotification(result.message, 'success');
      
      // Show warning if applicable
      if (result.warning) {
        addNotification(result.warning, 'warning');
      }
      
      playSFX('click');
    } else {
      addNotification(result.message, 'error');
      playSFX('error');
    }
  };
  
  const handleUpgradeTier = () => {
    if (!gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getMutableState();
    const result = performUpgrade(state);
    if (result.success) {
      gameStateManagerRef.current.forceUpdate();
      const newRoomsText = result.newRooms && result.newRooms.length > 0
        ? ` New rooms unlocked: ${result.newRooms.join(', ')}`
        : '';
      addNotification(`Tier upgraded successfully!${newRoomsText}`, 'success');
      playSFX('graduation');
    } else {
      addNotification(result.error || 'Cannot upgrade tier', 'warning');
      playSFX('error');
    }
  };
  
  // Warning system action handlers
  const handleWarningAction = useCallback((actionType: string, warning: Warning) => {
    playSFX('click');
    
    // Close other menus and open management panel
    openMenu('management');
    
    switch (actionType) {
      case 'low_funds':
      case 'in_debt':
      case 'near_bankruptcy':
      case 'maintenance_due':
      case 'operating_costs_due':
        // Open finances tab in management panel
        setManagementPanelTab('finances');
        break;
      case 'unhappy_resident':
      case 'at_risk_resident':
      case 'stalled_progress':
      case 'life_meters_stalled':
      case 'reputation_dropping':
        // Open residents tab in management panel
        setManagementPanelTab('residents');
        break;
      case 'overcrowded':
      case 'capacity_warning':
      case 'ready_to_upgrade':
        // Open tier upgrade tab
        setManagementPanelTab('tier');
        break;
      case 'hungry_residents':
      case 'maintenance_overdue':
        // Open rooms tab
        setManagementPanelTab('rooms');
        break;
      case 'low_reputation':
        // Show general dashboard
        setManagementPanelTab('overview');
        break;
      default:
        // Default to showing residents
        setManagementPanelTab('residents');
    }
  }, [openMenu]);
  
  const handleWarningDismiss = useCallback((warningId: string) => {
    if (!gameStateManagerRef.current) return;
    
    const mutableState = gameStateManagerRef.current.getMutableState();
    warningSystem.dismissWarning(mutableState, warningId);
    gameStateManagerRef.current.forceUpdate();
    playSFX('click');
  }, [warningSystem]);
  
  const handleWarningClick = useCallback(() => {
    // Warning button in HUD clicked - just let the panel handle expansion
    // The WarningPanel has its own expand/collapse logic
  }, []);
  
  if (!gameState) {
    return (
      <div className="loading">
        <h2>Loading Open Arms...</h2>
      </div>
    );
  }
  
  const gameStats = {
    daysSurvived: gameState.currentDay,
    residentsHelped: gameState.totalResidentsHelped,
    graduatedCount: gameState.graduatedCount,
    moneyEarned: gameState.totalMoneyEarned,
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
          statusBarSettings={gameState.statusBarSettings}
          onStatusBarSettingsChange={(settings) => {
            const mutableState = gameStateManagerRef.current?.getMutableState();
            if (mutableState) {
              Object.assign(mutableState.statusBarSettings, settings);
              gameStateManagerRef.current?.forceUpdate();
            }
          }}
        />
      )}
      
      {/* Game Over / Victory Modal */}
      {showGameOver && (
        <GameOverModal
          isVictory={isVictory}
          stats={gameStats}
          gameOverReason={gameOverReason}
          onRestart={handleRestartGame}
          onContinue={isVictory ? () => setShowGameOver(false) : undefined}
        />
      )}
      
      {/* Fundraiser Complete Modal */}
      {fundraiserCompletionData && (
        <FundraiserCompleteModal
          data={fundraiserCompletionData}
          onClose={() => setFundraiserCompletionData(null)}
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
      
      {/* Money Animation Overlay */}
      <MoneyAnimationOverlay />
      
      {/* HUD */}
      <HUD
        gameState={gameState}
        onPauseToggle={handlePauseToggle}
        isPaused={isPaused}
        onSettingsClick={() => setShowSettings(true)}
        onWarningClick={handleWarningClick}
        onStatisticsClick={() => setShowStatistics(true)}
      />
      
      {/* Statistics Modal */}
      {showStatistics && (
        <StatisticsModal
          isOpen={showStatistics}
          onClose={() => setShowStatistics(false)}
          gameState={gameState}
          onChangeFoodSetting={handleChangeFoodSetting}
        />
      )}
      
      {/* Warning Panel */}
      <WarningPanel
        gameState={gameState}
        onAction={handleWarningAction}
        onDismiss={handleWarningDismiss}
        isExpanded={showWarningPanel}
        onToggle={handleToggleWarningPanel}
      />
      
      {/* Game Canvas */}
      <div ref={gameContainerRef} className="game-container" />
      
      {/* Build Menu */}
      <BuildMenu
        onPlaceRoom={handlePlaceRoom}
        onRoomSelected={handleRoomSelected}
        currentMoney={gameState.money}
        gameState={gameState}
        isOpen={showBuildMenu}
        onToggle={handleToggleBuildMenu}
      />
      
      {/* Management Panel */}
      <ManagementPanel
        gameState={gameState}
        onStartFundraiser={handleStartFundraiser}
        onCancelFundraiser={handleCancelFundraiser}
        onExpandGrid={handleExpandGrid}
        onChangeFoodSetting={handleChangeFoodSetting}
        onUpgradeTier={handleUpgradeTier}
        isOpen={showManagementPanel}
        onToggle={handleToggleManagementPanel}
      />
      
      {/* Performance Monitor (F3 to toggle) */}
      <PerformanceMonitor
        scene={mainSceneRef.current}
        gameState={gameState}
      />
      
    </div>
  );
}

export default App;
