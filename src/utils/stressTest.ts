import { GameState, Resident, Room, RoomAdjacencyBonuses } from '../types';
import { PROFILE_SPECS, ROOM_SPECS, NAME_LISTS } from '../constants';
import { generateRandomName } from './helpers';

/**
 * Create default adjacency bonuses for stress test rooms
 */
function createDefaultAdjacencyBonuses(): RoomAdjacencyBonuses {
  return {
    happiness: 0,
    lifeFillModifier: 0,
    maintenanceReduction: 0,
    adjacentRoomIds: [],
    bonusDescriptions: []
  };
}

/**
 * Stress Testing Utilities for Performance Testing
 */

// ============================================================================
// Resident Stress Testing
// ============================================================================

/**
 * Spawn multiple residents for stress testing
 */
export function spawnStressTestResidents(
  gameState: GameState,
  count: number
): void {
  console.log(`🧪 Spawning ${count} residents for stress test...`);
  
  const profiles: Array<'young_adult' | 'veteran' | 'elderly'> = ['young_adult', 'veteran', 'elderly'];
  
  for (let i = 0; i < count; i++) {
    const profile = profiles[Math.floor(Math.random() * profiles.length)];
    const spec = PROFILE_SPECS[profile];
    
    const resident: Resident = {
      id: `stress_test_${Date.now()}_${i}`,
      name: generateRandomName(NAME_LISTS.FIRST_NAMES, NAME_LISTS.LAST_NAMES),
      profile,
      arrivalReason: 'arrived for stress testing',
      arrivalDay: gameState.currentDay,
      daysInShelter: 0,
      happiness: 50 + Math.random() * 30,
      lifeMeter: Math.random() * 50,
      currentState: 'idle',
      currentNeed: null,
      targetRoomId: null,
      gridX: 10 + Math.random() * 5,
      gridY: 10 + Math.random() * 5,
      sleepX: null,
      sleepY: null,
      path: null,
      pathIndex: 0,
      lastNeedCheck: Date.now(),
      lastHappinessUpdate: Date.now(),
      lastLifeUpdate: Date.now(),
      lastMealTime: Date.now(),
      // Departure tracking
      unhappyDuration: 0,
      isAtRisk: false,
      departureReason: undefined,
      // Fundraiser fatigue tracking
      fundraiserFatigueUntil: null,
      // Gradual repositioning tracking
      repositionTarget: null,
      repositionStartTime: null,
      repositionDuration: 0,
      // Fundraiser wander tracking
      lastWanderTime: 0
    };
    
    gameState.residents.push(resident);
  }
  
  console.log(`✅ Spawned ${count} residents. Total: ${gameState.residents.length}`);
}

/**
 * Remove all stress test residents
 */
export function removeStressTestResidents(gameState: GameState): void {
  const before = gameState.residents.length;
  gameState.residents = gameState.residents.filter(r => !r.id.startsWith('stress_test_'));
  const removed = before - gameState.residents.length;
  console.log(`🧹 Removed ${removed} stress test residents`);
}

// ============================================================================
// Room Stress Testing
// ============================================================================

/**
 * Build multiple rooms for stress testing
 */
export function buildStressTestRooms(
  gameState: GameState,
  roomType: keyof typeof ROOM_SPECS,
  count: number
): void {
  console.log(`🧪 Building ${count} ${roomType} rooms for stress test...`);
  
  const spec = ROOM_SPECS[roomType];
  let built = 0;
  
  // Try to place rooms in available spaces
  for (let attempt = 0; attempt < count * 10 && built < count; attempt++) {
    const x = Math.floor(Math.random() * (gameState.grid.width - spec.width));
    const y = Math.floor(Math.random() * (gameState.grid.height - spec.height));
    
    // Check if space is available
    let canPlace = true;
    for (let dy = 0; dy < spec.height; dy++) {
      for (let dx = 0; dx < spec.width; dx++) {
        const tile = gameState.grid.tiles[y + dy]?.[x + dx];
        if (!tile || tile.type !== 'empty') {
          canPlace = false;
          break;
        }
      }
      if (!canPlace) break;
    }
    
    if (canPlace) {
      const room: Room = {
        id: `stress_test_room_${Date.now()}_${built}`,
        type: roomType,
        gridX: x,
        gridY: y,
        width: spec.width,
        height: spec.height,
        buildCost: spec.buildCost,
        maintenanceCost: spec.maintenanceCost,
        isOpen: true,
        currentOccupancy: 0,
        lastMaintenancePaid: Date.now(),
        adjacencyBonuses: createDefaultAdjacencyBonuses()
      };
      
      gameState.rooms.push(room);
      
      // Mark tiles as occupied
      for (let dy = 0; dy < spec.height; dy++) {
        for (let dx = 0; dx < spec.width; dx++) {
          gameState.grid.tiles[y + dy][x + dx].type = 'room';
        }
      }
      
      built++;
    }
  }
  
  console.log(`✅ Built ${built} rooms. Total: ${gameState.rooms.length}`);
}

/**
 * Remove all stress test rooms
 */
export function removeStressTestRooms(gameState: GameState): void {
  const before = gameState.rooms.length;
  const stressTestRooms = gameState.rooms.filter(r => r.id.startsWith('stress_test_room_'));
  
  // Clear tiles
  for (const room of stressTestRooms) {
    for (let dy = 0; dy < room.height; dy++) {
      for (let dx = 0; dx < room.width; dx++) {
        const tile = gameState.grid.tiles[room.gridY + dy]?.[room.gridX + dx];
        if (tile && tile.type === 'room') {
          tile.type = 'empty';
        }
      }
    }
  }
  
  gameState.rooms = gameState.rooms.filter(r => !r.id.startsWith('stress_test_room_'));
  const removed = before - gameState.rooms.length;
  console.log(`🧹 Removed ${removed} stress test rooms`);
}

// ============================================================================
// Performance Testing Scenarios
// ============================================================================

/**
 * Run performance test scenario
 */
export function runPerformanceTest(
  gameState: GameState,
  scenario: 'light' | 'medium' | 'heavy' | 'extreme'
): void {
  console.log(`🧪 Running ${scenario} performance test...`);
  
  switch (scenario) {
    case 'light':
      // 10 residents, 5 rooms
      spawnStressTestResidents(gameState, 10);
      buildStressTestRooms(gameState, 'dormitory', 2);
      buildStressTestRooms(gameState, 'common_room', 2);
      buildStressTestRooms(gameState, 'bathroom', 1);
      break;
      
    case 'medium':
      // 30 residents, 15 rooms
      spawnStressTestResidents(gameState, 30);
      buildStressTestRooms(gameState, 'dormitory', 4);
      buildStressTestRooms(gameState, 'cafeteria', 2);
      buildStressTestRooms(gameState, 'learning_center', 3);
      buildStressTestRooms(gameState, 'common_room', 3);
      buildStressTestRooms(gameState, 'bathroom', 3);
      break;
      
    case 'heavy':
      // 50 residents, 25 rooms
      spawnStressTestResidents(gameState, 50);
      buildStressTestRooms(gameState, 'dormitory', 6);
      buildStressTestRooms(gameState, 'cafeteria', 3);
      buildStressTestRooms(gameState, 'learning_center', 5);
      buildStressTestRooms(gameState, 'vocational_room', 3);
      buildStressTestRooms(gameState, 'common_room', 4);
      buildStressTestRooms(gameState, 'bathroom', 4);
      break;
      
    case 'extreme':
      // 100 residents, 40 rooms
      spawnStressTestResidents(gameState, 100);
      buildStressTestRooms(gameState, 'dormitory', 10);
      buildStressTestRooms(gameState, 'cafeteria', 5);
      buildStressTestRooms(gameState, 'learning_center', 8);
      buildStressTestRooms(gameState, 'vocational_room', 5);
      buildStressTestRooms(gameState, 'common_room', 6);
      buildStressTestRooms(gameState, 'bathroom', 6);
      break;
  }
  
  console.log(`✅ ${scenario} test setup complete`);
  console.log(`   Residents: ${gameState.residents.length}`);
  console.log(`   Rooms: ${gameState.rooms.length}`);
}

/**
 * Clean up all stress test data
 */
export function cleanupStressTest(gameState: GameState): void {
  console.log('🧹 Cleaning up stress test...');
  removeStressTestResidents(gameState);
  removeStressTestRooms(gameState);
  console.log('✅ Stress test cleanup complete');
}

// ============================================================================
// Performance Measurement
// ============================================================================

interface PerformanceTestResult {
  scenario: string;
  residentCount: number;
  roomCount: number;
  avgFPS: number;
  minFPS: number;
  maxFPS: number;
  avgFrameTime: number;
  memoryUsed: number;
  pathfindingHitRate: number;
  duration: number;
}

/**
 * Measure performance over time
 */
export class PerformanceTester {
  private samples: number[] = [];
  private startTime: number = 0;
  private scenario: string = '';
  
  start(scenario: string): void {
    this.scenario = scenario;
    this.samples = [];
    this.startTime = performance.now();
    console.log(`📊 Starting performance measurement for ${scenario}...`);
  }
  
  sample(fps: number): void {
    this.samples.push(fps);
  }
  
  finish(gameState: GameState): PerformanceTestResult {
    const duration = performance.now() - this.startTime;
    
    const avgFPS = this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
    const minFPS = Math.min(...this.samples);
    const maxFPS = Math.max(...this.samples);
    const avgFrameTime = 1000 / avgFPS;
    
    const memory = (performance as any).memory?.usedJSHeapSize || 0;
    
    const result: PerformanceTestResult = {
      scenario: this.scenario,
      residentCount: gameState.residents.length,
      roomCount: gameState.rooms.length,
      avgFPS: Math.round(avgFPS * 10) / 10,
      minFPS: Math.round(minFPS * 10) / 10,
      maxFPS: Math.round(maxFPS * 10) / 10,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      memoryUsed: Math.round(memory / (1024 * 1024) * 10) / 10,
      pathfindingHitRate: 0, // Would need to get from pathfinding system
      duration: Math.round(duration)
    };
    
    console.log('📊 Performance Test Results:');
    console.log(`   Scenario: ${result.scenario}`);
    console.log(`   Residents: ${result.residentCount}`);
    console.log(`   Rooms: ${result.roomCount}`);
    console.log(`   Avg FPS: ${result.avgFPS}`);
    console.log(`   Min FPS: ${result.minFPS}`);
    console.log(`   Max FPS: ${result.maxFPS}`);
    console.log(`   Avg Frame Time: ${result.avgFrameTime}ms`);
    console.log(`   Memory Used: ${result.memoryUsed}MB`);
    console.log(`   Duration: ${result.duration}ms`);
    
    return result;
  }
}

// ============================================================================
// Console Commands (for debugging)
// ============================================================================

/**
 * Register stress test commands on window object for console access
 */
export function registerStressTestCommands(gameState: GameState): void {
  (window as any).stressTest = {
    spawn: (count: number) => spawnStressTestResidents(gameState, count),
    removeResidents: () => removeStressTestResidents(gameState),
    buildRooms: (type: string, count: number) => buildStressTestRooms(gameState, type as any, count),
    removeRooms: () => removeStressTestRooms(gameState),
    runTest: (scenario: string) => runPerformanceTest(gameState, scenario as any),
    cleanup: () => cleanupStressTest(gameState),
    
    // Quick test commands
    light: () => runPerformanceTest(gameState, 'light'),
    medium: () => runPerformanceTest(gameState, 'medium'),
    heavy: () => runPerformanceTest(gameState, 'heavy'),
    extreme: () => runPerformanceTest(gameState, 'extreme')
  };
  
  console.log('🧪 Stress test commands registered:');
  console.log('   stressTest.spawn(count) - Spawn residents');
  console.log('   stressTest.buildRooms(type, count) - Build rooms');
  console.log('   stressTest.light() - Run light test (10 residents)');
  console.log('   stressTest.medium() - Run medium test (30 residents)');
  console.log('   stressTest.heavy() - Run heavy test (50 residents)');
  console.log('   stressTest.extreme() - Run extreme test (100 residents)');
  console.log('   stressTest.cleanup() - Clean up all test data');
}
