import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { createPhaserGame, destroyPhaserGame } from './game/PhaserGame';
import { GameStateManager, createInitialGameState } from './game/systems/GameStateManager';
import { placeRoom, expandGrid, demolishRoom } from './game/systems/GridSystem';
import { startRandomFundraiser, cancelFundraiser, FundraiserCompletionData } from './game/systems/FundraiserSystem';
import { EventSystem, GameEvent, EventType } from './game/systems/EventSystem';
import { getAudioSystem, playSFX } from './game/systems/AudioSystem';
import { saveGame, saveToSlot, loadSlot, listSlots, SlotId } from './game/systems/SaveLoadSystem';
import { transitionToDay, transitionToNight } from './game/systems/DayNightSystem';
import { initializeCafeteriaGeneration, removeCafeteriaGeneration, changeFoodSetting } from './game/systems/FoodSystem';
import { performUpgrade } from './game/systems/TierSystem';
import { getWarningSystem } from './game/systems/WarningSystem';
import { setDevTimersEnabled, isDevTimersEnabled, roomKind } from './constants';
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
import { Toolbar, ToolbarPanel } from './components/Toolbar';
import { ReportsPanel, ReportsTab } from './components/ReportsPanel';
import { ResidentCard } from './components/ResidentCard';
import { FundraiserCompleteModal } from './components/FundraiserCompleteModal';
import { GameState, RoomType, GameOverReason, Warning, FoodPortionSetting, Gender } from './types';
import { MainScene } from './game/scenes/MainScene';
import './App.css';
import { formatMoney } from './utils/helpers';
import './skin.css'; // last, so it overrides the per-component styles

/**
 * Main App component
 */
function App() {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const gameStateManagerRef = useRef<GameStateManager | null>(null);
  const mainSceneRef = useRef<MainScene | null>(null);
  const eventSystemRef = useRef<EventSystem | null>(null);

  // React UI throttle: the game loop calls forceUpdate() ~60x/sec. Feeding every
  // one of those into React state would re-render the whole UI tree at 60fps,
  // starving Phaser's render loop and causing visible stutter/jitter. The HUD only
  // needs a few updates per second, so we throttle React updates to ~12fps with a
  // trailing edge (Phaser keeps rendering at full rate via its own subscription).
  const REACT_UPDATE_INTERVAL = 80; // ms (~12.5fps)
  const lastReactUpdateRef = useRef<number>(0);
  const pendingReactUpdateRef = useRef<number | null>(null);
  
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<GameEvent | null>(null);
  const [showGameOver, setShowGameOver] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [gameOverReason, setGameOverReason] = useState<GameOverReason>(null);
  const [selectedRoomType, setSelectedRoomType] = useState<RoomType | null>(null);
  const dormGenderRef = useRef<Gender | 'any'>('any'); // chosen in BuildMenu, applied when a dormitory is placed
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showDevMode, setShowDevMode] = useState(false);
  const [devTimersEnabled, setDevTimersEnabledState] = useState(isDevTimersEnabled());
  const [showManagementPanel, setShowManagementPanel] = useState(false);
  const [managementPanelTab, setManagementPanelTab] = useState<string>('residents');
  const [showBuildMenu, setShowBuildMenu] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [reportsTab, setReportsTab] = useState<ReportsTab>('alerts');
  const [fundraiserCompletionData, setFundraiserCompletionData] = useState<FundraiserCompletionData | null>(null);
  
  // Menu types that are mutually exclusive (only one can be open at a time)
  // Settings modal is a full overlay, so it's treated separately
  type MenuType = 'build' | 'management' | 'reports' | 'devMode' | null;
  
  // Close all side menus (not modals like Settings)
  const closeAllSideMenus = useCallback(() => {
    setShowBuildMenu(false);
    setShowManagementPanel(false);
    setShowReports(false);
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
      case 'reports':
        setShowReports(true);
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
  
  // The toolbar opens one panel at a time; pressing the active one closes it
  const handleToolbarSelect = useCallback((panel: ToolbarPanel) => {
    const isOpen = panel === 'build' ? showBuildMenu : panel === 'management' ? showManagementPanel : showReports;
    if (isOpen) closeAllSideMenus();
    else openMenu(panel);
  }, [showBuildMenu, showManagementPanel, showReports, closeAllSideMenus, openMenu]);
  
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
  
  // Guard so end-game (victory/defeat) is only handled once per game. This
  // callback runs on every game-loop notification, and the closure's copies of
  // showGameOver/isVictory are stale, so without this ref the win/lose SFX would
  // fire ~60x/sec once the condition is met. Reset in handleRestartGame().
  const endGameHandledRef = useRef(false);

  // Check end game conditions
  const checkEndGameConditions = (state: GameState) => {
    if (endGameHandledRef.current) return; // Already handled this game

    // Check victory conditions
    const victory = checkVictoryConditions(state.graduatedCount, state.reputation, state.currentDay);

    if (victory) {
      endGameHandledRef.current = true;
      setIsVictory(true);
      setShowGameOver(true);
      setGameOverReason(null);
      playSFX('graduation');
    } else if (state.isGameOver && state.gameOverReason) {
      // Game over triggered by GameStateManager
      endGameHandledRef.current = true;
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
      
      // Subscribe to state changes (throttled so the 60fps game loop doesn't
      // re-render the whole React tree every frame).
      const flushReactUpdate = () => {
        pendingReactUpdateRef.current = null;
        lastReactUpdateRef.current = Date.now();
        const latest = gameStateManagerRef.current?.getState();
        if (latest) setGameState({ ...latest });
      };

      gameStateManagerRef.current.subscribe((state) => {
        // End-game checks are cheap and must react immediately.
        checkEndGameConditions(state);

        const now = Date.now();
        const elapsed = now - lastReactUpdateRef.current;
        if (elapsed >= REACT_UPDATE_INTERVAL) {
          if (pendingReactUpdateRef.current !== null) {
            clearTimeout(pendingReactUpdateRef.current);
            pendingReactUpdateRef.current = null;
          }
          lastReactUpdateRef.current = now;
          setGameState({ ...state });
        } else if (pendingReactUpdateRef.current === null) {
          // Schedule a trailing update so the final state always renders.
          pendingReactUpdateRef.current = window.setTimeout(
            flushReactUpdate,
            REACT_UPDATE_INTERVAL - elapsed
          );
        }
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
                // Keep React's pause flag in sync (blur/focus also pause) and freeze event timers.
                const pm = scene.getPauseManager();
                pm.onPause(() => setIsPaused(true));
                pm.onResume((pausedMs) => {
                  eventSystemRef.current?.shiftTimers(pausedMs);
                  setIsPaused(false);
                });
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
        addNotification(`🎉 Fundraiser complete! Raised ${formatMoney(completionData.payout)}`, 'success');
      } else {
        addNotification(`😔 Fundraiser failed. No money raised.`, 'warning');
      }
    };
    
    const handleResidentGraduated = (event: CustomEvent) => {
      addNotification(`🎓 ${event.detail.name} reached 100% LIFE and graduated!`, 'success');
    };

    const handleResidentDeparted = (event: CustomEvent) => {
      addNotification(`👋 ${event.detail.message}`, 'warning');
    };
    
    window.addEventListener('game:event_triggered' as any, handleEventTriggered);
    window.addEventListener('resident_graduated' as any, handleResidentGraduated);
    window.addEventListener('resident_departed' as any, handleResidentDeparted);
    window.addEventListener('game:game_over' as any, handleGameOver);
    window.addEventListener('game:warning_critical' as any, handleCriticalWarning);
    window.addEventListener('game:warning_escalated' as any, handleWarningEscalated);
    window.addEventListener('fundraiser_completed' as any, handleFundraiserCompleted);
    
    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('game:event_triggered' as any, handleEventTriggered);
      window.removeEventListener('game:game_over' as any, handleGameOver);
      window.removeEventListener('game:warning_critical' as any, handleCriticalWarning);
      window.removeEventListener('game:warning_escalated' as any, handleWarningEscalated);
      window.removeEventListener('fundraiser_completed' as any, handleFundraiserCompleted);
      window.removeEventListener('resident_graduated' as any, handleResidentGraduated);
      window.removeEventListener('resident_departed' as any, handleResidentDeparted);
      
      if (pendingReactUpdateRef.current !== null) {
        clearTimeout(pendingReactUpdateRef.current);
        pendingReactUpdateRef.current = null;
      }

      if (gameRef.current) {
        destroyPhaserGame(gameRef.current);
        gameRef.current = null;
      }

      audioSystem.destroy();
    };
  }, []);
  
  // Update event system on a stable 1s interval. We read the live state from the
  // manager ref rather than closing over `gameState`, so this interval is created
  // once instead of being torn down/recreated on every state change (which would
  // otherwise clear the timer before it could ever fire).
  useEffect(() => {
    const interval = setInterval(() => {
      const es = eventSystemRef.current;
      const gsm = gameStateManagerRef.current;
      if (es && gsm && !mainSceneRef.current?.getPauseManager().isPaused()) {
        es.update(gsm.getState());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Update warning system on a stable 5s interval (same rationale as above).
  useEffect(() => {
    const interval = setInterval(() => {
      const gsm = gameStateManagerRef.current;
      const mutableState = gsm?.getMutableState();
      if (mutableState && !mainSceneRef.current?.getPauseManager().isPaused()) {
        warningSystem.updateWarnings(mutableState);
        gsm?.forceUpdate();
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [warningSystem]);
  
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
      state.currentPhase,
      dormGenderRef.current
    );
    
    if (result.success && result.newMoney !== undefined) {
      state.money = result.newMoney;
      
      // Initialize food generation for cafeterias
      if (roomKind(roomType) === 'cafeteria' && result.room) {
        initializeCafeteriaGeneration(result.room.id);
        console.log(`🍽️ Initialized food generation for cafeteria ${result.room.id}`);
      }
      
      gameStateManagerRef.current.forceUpdate();
      playSFX('build');
      addNotification(`Built ${roomType.replace(/_/g, ' ')}!`, 'success');
      
      // DEBUG: Log before clearing placement mode
      console.log('[App] Room placed successfully, clearing placement mode');
      setSelectedRoomType(null); // Clear placement mode after successful placement
    } else {
      playSFX('error');
      addNotification(result.error || 'Failed to place room', 'error');
    }
  };
  
  const handleRoomSelected = (roomType: RoomType | null, dormGender: Gender | 'any' = 'any') => {
    setSelectedRoomType(roomType);
    dormGenderRef.current = dormGender;
    
    // Wait for MainScene to be ready before entering placement mode
    if (roomType) {
      setShowBuildMenu(false); // get the menu out of the way while placing (ESC cancels)
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
    const handleResidentSelected = (event: CustomEvent) => {
      setSelectedResidentId(event.detail.id);
      setSelectedRoomId(event.detail.roomId ?? null);
    };
    
    window.addEventListener('game:show_notification' as any, handleShowNotification);
    window.addEventListener('game:resident_selected' as any, handleResidentSelected);
    
    return () => {
      window.removeEventListener('game:place_room' as any, handlePlaceRoomEvent);
      window.removeEventListener('game:show_notification' as any, handleShowNotification);
      window.removeEventListener('game:resident_selected' as any, handleResidentSelected);
    };
  }, [handlePlaceRoom]);
  
  const handleStartFundraiser = () => {
    if (!gameStateManagerRef.current) return;
    
    // Check if fundraisers are allowed (not during bankruptcy)
    if (!gameStateManagerRef.current.canStartFundraiser()) {
      addNotification('Cannot start fundraisers during bankruptcy! Focus on recovering your finances.', 'error');
      playSFX('error');
      return;
    }
    
    const state = gameStateManagerRef.current.getMutableState();
    const result = startRandomFundraiser(state);
    
    if (result.success) {
      gameStateManagerRef.current.forceUpdate();
      playSFX('click');
      addNotification('Fundraiser started!', 'success');
    } else {
      playSFX('error');
      addNotification(result.error || 'Failed to start fundraiser', 'error');
    }
  };
  
  const handleRemoveRoom = (roomId: string) => {
    if (!gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getMutableState();
    const room = state.rooms.find(r => r.id === roomId);
    if (!room) return;
    if (state.currentPhase === 'night') {
      addNotification('Cannot remove buildings at night', 'error');
      playSFX('error');
      return;
    }
    if (state.activeFundraisers.some(f => f.stationId === roomId)) {
      addNotification('Cannot remove a fundraiser station while a fundraiser is running', 'error');
      playSFX('error');
      return;
    }
    const result = demolishRoom(state.grid, state.rooms, roomId);
    if (result.success) {
      state.money += result.refund ?? 0;
      if (roomKind(room.type) === 'cafeteria') removeCafeteriaGeneration(roomId);
      gameStateManagerRef.current.forceUpdate();
      playSFX('click');
      addNotification(`Removed ${room.type.replace(/_/g, ' ')} (refund ${formatMoney(result.refund ?? 0)})`, 'info');
    } else {
      playSFX('error');
      addNotification(result.error || 'Failed to remove room', 'error');
    }
    setSelectedRoomId(null);
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
  
  const handleExpandGrid = (direction: 'north' | 'east' | 'west') => {
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
  
  const handleSaveToSlot = (slot: 1 | 2 | 3) => {
    if (!gameStateManagerRef.current) return;
    const ok = saveToSlot(slot, gameStateManagerRef.current.getState() as GameState);
    addNotification(ok ? `Saved to slot ${slot}` : 'Save failed (storage full?)', ok ? 'success' : 'error');
    playSFX(ok ? 'click' : 'error');
  };

  const handleLoadSlot = (slot: SlotId) => {
    if (!gameStateManagerRef.current) return;
    const loaded = loadSlot(slot);
    if (!loaded) {
      addNotification('Could not load that save', 'error');
      playSFX('error');
      return;
    }
    gameStateManagerRef.current.loadState(loaded);
    mainSceneRef.current?.onStateLoaded();
    endGameHandledRef.current = false;
    setShowGameOver(false);
    setIsVictory(false);
    setGameOverReason(null);
    setCurrentEvent(null);
    setShowSettings(false);
    addNotification('Game loaded', 'success');
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
    } else {
      playSFX('error');
      addNotification(result.error || 'Could not resolve event', 'error');
    }
  };
  
  const handleRestartGame = () => {
    if (gameStateManagerRef.current) {
      // Use the resetGame method to properly reset all state including bankruptcy
      gameStateManagerRef.current.resetGame();
      endGameHandledRef.current = false;
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
    addNotification(`Triggered ${eventType.replace(/_/g, ' ')} event`, 'info');
    playSFX('event');
  };
  
  const handleModifyResident = (residentId: string, stat: string, value: number) => {
    if (!gameStateManagerRef.current) return;
    const state = gameStateManagerRef.current.getMutableState();
    const resident = state.residents.find(r => r.id === residentId);
    
    if (resident) {
      if (stat === 'health') {
        resident.health = Math.max(0, Math.min(100, value));
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
    addNotification(`${amount > 0 ? 'Added' : 'Removed'} ${formatMoney(Math.abs(amount))}`, 'info');
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
      mainSceneRef.current?.markGridDirty(); // new area + moved south gate
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
      case 'unhealthy_resident':
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
          isPaused={isPaused}
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
          listSlots={listSlots}
          onSaveSlot={handleSaveToSlot}
          onLoadSlot={handleLoadSlot}
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
        onZoomIn={() => mainSceneRef.current?.zoomIn()}
        onZoomOut={() => mainSceneRef.current?.zoomOut()}
      />
      
      {/* Clicked resident's stats */}
      {(() => {
        const resident = selectedResidentId ? gameState.residents.find(r => r.id === selectedResidentId) : null;
        return resident ? (
          <div className="resident-popup">
            <button className="resident-popup-close" onClick={() => setSelectedResidentId(null)} title="Close">✕</button>
            <ResidentCard resident={resident} gameState={gameState} />
          </div>
        ) : null;
      })()}
      
      {/* Clicked room: remove option */}
      {(() => {
        const room = selectedRoomId ? gameState.rooms.find(r => r.id === selectedRoomId) : null;
        return room ? (
          <div className="resident-popup">
            <button className="resident-popup-close" onClick={() => setSelectedRoomId(null)} title="Close">✕</button>
            <div className="resident-detail-item">
              <div className="resident-header"><span className="resident-name">{room.type.replace(/_/g, ' ')}</span></div>
              <button className="cancel-button" disabled={gameState.currentPhase === 'night'} onClick={() => handleRemoveRoom(room.id)}>
                {gameState.currentPhase === 'night' ? 'Cannot remove buildings at night' : `🗑️ Remove (refund ${formatMoney(Math.floor(room.buildCost * 0.2))})`}
              </button>
            </div>
          </div>
        ) : null;
      })()}
      
      {/* Reports (alerts, stats, finances) */}
      {showReports && (
        <ReportsPanel
          gameState={gameState}
          tab={reportsTab}
          onTab={setReportsTab}
          onClose={closeAllSideMenus}
          onChangeFoodSetting={handleChangeFoodSetting}
          onWarningAction={handleWarningAction}
          onWarningDismiss={handleWarningDismiss}
        />
      )}
      
      {/* Bottom toolbar */}
      <Toolbar
        active={showBuildMenu ? 'build' : showManagementPanel ? 'management' : showReports ? 'reports' : null}
        alertCount={warningSystem.getWarningCounts(gameState).total}
        alertLevel={(() => {
          const c = warningSystem.getWarningCounts(gameState);
          return c.critical > 0 ? 'critical' : c.warning > 0 ? 'warning' : c.total > 0 ? 'info' : null;
        })()}
        onSelect={handleToolbarSelect}
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
        isPaused={isPaused}
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
