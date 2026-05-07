# Performance Considerations

---

## Overview

This document outlines optimization strategies, performance targets, and best practices for maintaining smooth gameplay with many residents and complex systems.

---

## Performance Targets

### Frame Rate Goals

```typescript
const PERFORMANCE_TARGETS = {
  TARGET_FPS: 60,
  MIN_ACCEPTABLE_FPS: 30,
  CRITICAL_FPS: 20
};
```

**Target Scenarios:**
- 10 residents: 60 FPS
- 30 residents: 60 FPS
- 50 residents: 45+ FPS
- 100 residents: 30+ FPS

---

## Pathfinding Optimization

### Strategy 1: Path Caching

```typescript
// Cache frequently used paths
const pathCache = new Map<string, CachedPath>();

function findPathCached(
  grid: Grid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): Path | null {
  const key = `${startX},${startY}->${goalX},${goalY}`;
  
  // Check cache
  const cached = pathCache.get(key);
  if (cached && isPathValid(grid, cached.path)) {
    return cached.path;
  }
  
  // Calculate new path
  const path = findPath(grid, startX, startY, goalX, goalY);
  
  if (path) {
    // Add to cache
    pathCache.set(key, {
      path,
      timestamp: Date.now(),
      uses: 1
    });
    
    // Limit cache size
    if (pathCache.size > 100) {
      evictOldestCachePath();
    }
  }
  
  return path;
}
```

**Benefits:**
- Reduces redundant A* calculations
- ~70-90% cache hit rate in typical gameplay
- Significant CPU savings with many residents

### Strategy 2: Spatial Partitioning

```typescript
// Divide grid into cells for faster room queries
class SpatialGrid {
  private cellSize: number = 5;
  private cells: Map<string, Room[]> = new Map();
  
  addRoom(room: Room): void {
    const cellX = Math.floor(room.gridX / this.cellSize);
    const cellY = Math.floor(room.gridY / this.cellSize);
    const key = `${cellX},${cellY}`;
    
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    this.cells.get(key)!.push(room);
  }
  
  getNearbyRooms(x: number, y: number, radius: number = 1): Room[] {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    const rooms: Room[] = [];
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cellRooms = this.cells.get(key);
        if (cellRooms) {
          rooms.push(...cellRooms);
        }
      }
    }
    
    return rooms;
  }
}
```

**Benefits:**
- O(1) room lookups instead of O(n)
- Faster nearest room queries
- Scales well with many rooms

### Strategy 3: Early Exit Optimization

```typescript
function findPath(
  grid: Grid,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number
): Path | null {
  // Early exit if goal is unreachable
  if (!isWalkable(grid, goalX, goalY)) {
    return null;
  }
  
  // Early exit if straight-line distance is too far
  const straightLineDistance = heuristic(startX, startY, goalX, goalY);
  if (straightLineDistance > MAX_PATH_DISTANCE) {
    return null;
  }
  
  // Limit iterations to prevent infinite loops
  let iterations = 0;
  const MAX_ITERATIONS = 1000;
  
  while (openSet.length > 0 && iterations < MAX_ITERATIONS) {
    iterations++;
    // ... A* algorithm
  }
  
  return null;
}
```

---

## Rendering Optimization

### Strategy 1: Object Pooling

```typescript
class SpritePool {
  private pool: Phaser.GameObjects.Sprite[] = [];
  private active: Set<Phaser.GameObjects.Sprite> = new Set();
  
  acquire(scene: Phaser.Scene, texture: string): Phaser.GameObjects.Sprite {
    let sprite = this.pool.pop();
    
    if (!sprite) {
      sprite = scene.add.sprite(0, 0, texture);
    } else {
      sprite.setTexture(texture);
      sprite.setVisible(true);
    }
    
    this.active.add(sprite);
    return sprite;
  }
  
  release(sprite: Phaser.GameObjects.Sprite): void {
    sprite.setVisible(false);
    this.active.delete(sprite);
    this.pool.push(sprite);
  }
}
```

**Benefits:**
- Reduces garbage collection
- Faster sprite creation/destruction
- Smoother frame rates

### Strategy 2: Culling

```typescript
function updateVisibleSprites(camera: Phaser.Cameras.Scene2D.Camera): void {
  const bounds = camera.worldView;
  
  for (const [id, sprite] of residentSprites.entries()) {
    const inView = bounds.contains(sprite.x, sprite.y);
    sprite.setVisible(inView);
    
    // Only update sprites in view
    if (inView) {
      updateResidentSprite(sprite);
    }
  }
}
```

**Benefits:**
- Only renders visible sprites
- Reduces draw calls
- Better performance with large grids

### Strategy 3: Batch Rendering

```typescript
// Group similar sprites for batch rendering
function renderRooms(rooms: Room[]): void {
  // Group by texture
  const roomsByTexture = new Map<string, Room[]>();
  
  for (const room of rooms) {
    const texture = getRoomTexture(room.type);
    if (!roomsByTexture.has(texture)) {
      roomsByTexture.set(texture, []);
    }
    roomsByTexture.get(texture)!.push(room);
  }
  
  // Render each group
  for (const [texture, roomGroup] of roomsByTexture.entries()) {
    batchRenderRooms(texture, roomGroup);
  }
}
```

---

## Update Loop Optimization

### Strategy 1: Throttled Updates

```typescript
class ThrottledSystem {
  private lastUpdate: number = 0;
  private updateInterval: number;
  
  constructor(updatesPerSecond: number) {
    this.updateInterval = 1000 / updatesPerSecond;
  }
  
  shouldUpdate(currentTime: number): boolean {
    if (currentTime - this.lastUpdate >= this.updateInterval) {
      this.lastUpdate = currentTime;
      return true;
    }
    return false;
  }
}

// Usage
const happinessSystem = new ThrottledSystem(0.1); // 0.1 FPS = every 10 seconds
const aiSystem = new ThrottledSystem(1);          // 1 FPS = every second

function update(time: number): void {
  // Always update
  updateResidentMovement();
  
  // Throttled updates
  if (aiSystem.shouldUpdate(time)) {
    updateResidentAI();
  }
  
  if (happinessSystem.shouldUpdate(time)) {
    updateHappinessDecay();
  }
}
```

**Benefits:**
- Reduces CPU usage
- Prioritizes critical updates
- Maintains smooth frame rate

### Strategy 2: Incremental Processing

```typescript
// Process residents in batches instead of all at once
class IncrementalProcessor {
  private index: number = 0;
  private batchSize: number = 5;
  
  processResidents(residents: Resident[], callback: (r: Resident) => void): void {
    const end = Math.min(this.index + this.batchSize, residents.length);
    
    for (let i = this.index; i < end; i++) {
      callback(residents[i]);
    }
    
    this.index = end;
    if (this.index >= residents.length) {
      this.index = 0; // Wrap around
    }
  }
}

// Process 5 residents per frame instead of all 100
const processor = new IncrementalProcessor();

function update(): void {
  processor.processResidents(gameState.residents, (resident) => {
    updateResidentNeeds(resident);
  });
}
```

---

## Memory Optimization

### Strategy 1: Lazy Loading

```typescript
// Load textures on demand
class TextureManager {
  private loaded: Set<string> = new Set();
  
  async loadTexture(scene: Phaser.Scene, key: string, path: string): Promise<void> {
    if (this.loaded.has(key)) return;
    
    await scene.load.image(key, path);
    this.loaded.add(key);
  }
  
  unloadTexture(scene: Phaser.Scene, key: string): void {
    scene.textures.remove(key);
    this.loaded.delete(key);
  }
}
```

### Strategy 2: Data Structure Optimization

```typescript
// Use typed arrays for large datasets
class OptimizedGrid {
  private tiles: Uint8Array;
  private width: number;
  private height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.tiles = new Uint8Array(width * height);
  }
  
  getTile(x: number, y: number): number {
    return this.tiles[y * this.width + x];
  }
  
  setTile(x: number, y: number, value: number): void {
    this.tiles[y * this.width + x] = value;
  }
}
```

**Benefits:**
- Smaller memory footprint
- Better cache locality
- Faster access times

---

## Timer Optimization

### Strategy 1: Centralized Timer Manager

```typescript
// Single timer manager instead of individual timers
class TimerManager {
  private timers: Map<string, Timer> = new Map();
  
  update(currentTime: number): void {
    for (const timer of this.timers.values()) {
      if (currentTime >= timer.nextTrigger) {
        timer.callback();
        timer.nextTrigger = currentTime + timer.interval;
      }
    }
  }
}
```

**Benefits:**
- Single update loop
- No setTimeout overhead
- Easier to pause/resume

---

## Save/Load Optimization

### Strategy 1: Debounced Saves

```typescript
class SaveManager {
  private saveTimeout: NodeJS.Timeout | null = null;
  private readonly DEBOUNCE_TIME = 1000;
  
  scheduleSave(gameState: GameState): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.performSave(gameState);
    }, this.DEBOUNCE_TIME);
  }
}
```

**Benefits:**
- Prevents excessive localStorage writes
- Reduces I/O overhead
- Smoother gameplay

### Strategy 2: Compression

```typescript
// Optional: Compress large save files
function compressSave(gameState: GameState): string {
  const json = JSON.stringify(gameState);
  
  // Use LZ-string or similar
  return LZString.compress(json);
}

function decompressSave(compressed: string): GameState {
  const json = LZString.decompress(compressed);
  return JSON.parse(json);
}
```

---

## Profiling & Monitoring

### Performance Monitor

```typescript
class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startMeasure(label: string): void {
    performance.mark(`${label}-start`);
  }
  
  endMeasure(label: string): void {
    performance.mark(`${label}-end`);
    performance.measure(label, `${label}-start`, `${label}-end`);
    
    const measure = performance.getEntriesByName(label)[0];
    this.recordMetric(label, measure.duration);
  }
  
  private recordMetric(label: string, duration: number): void {
    if (!this.metrics.has(label)) {
      this.metrics.set(label, []);
    }
    
    const values = this.metrics.get(label)!;
    values.push(duration);
    
    // Keep only last 100 samples
    if (values.length > 100) {
      values.shift();
    }
  }
  
  getAverageTime(label: string): number {
    const values = this.metrics.get(label);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  report(): void {
    console.log("=== Performance Report ===");
    for (const [label, values] of this.metrics.entries()) {
      const avg = this.getAverageTime(label);
      console.log(`${label}: ${avg.toFixed(2)}ms`);
    }
  }
}

// Usage
const perfMonitor = new PerformanceMonitor();

function updateResidents(): void {
  perfMonitor.startMeasure('resident-update');
  // ... update logic
  perfMonitor.endMeasure('resident-update');
}
```

---

## Performance Budgets

### Frame Time Budget (60 FPS = 16.67ms)

```typescript
const FRAME_BUDGET = {
  RENDERING: 8.0,          // 48% of frame
  GAME_LOGIC: 6.0,         // 36% of frame
  PATHFINDING: 1.5,        // 9% of frame
  UI_UPDATES: 1.0,         // 6% of frame
  OVERHEAD: 0.17           // 1% of frame
};
```

### Memory Budget

```typescript
const MEMORY_BUDGET = {
  GAME_STATE: 5,           // 5 MB
  TEXTURES: 50,            // 50 MB
  AUDIO: 20,               // 20 MB
  TOTAL: 75                // 75 MB target
};
```

---

## Optimization Checklist

### Before Release

- [ ] Profile all major systems
- [ ] Verify 60 FPS with 30 residents
- [ ] Verify 30 FPS with 100 residents
- [ ] Test save/load with large saves
- [ ] Test offline progress calculation
- [ ] Verify no memory leaks
- [ ] Test on low-end devices
- [ ] Optimize asset sizes
- [ ] Enable production builds
- [ ] Minify JavaScript

### During Development

- [ ] Use object pooling for sprites
- [ ] Cache pathfinding results
- [ ] Throttle non-critical updates
- [ ] Batch similar render calls
- [ ] Cull off-screen objects
- [ ] Debounce save operations
- [ ] Use spatial partitioning
- [ ] Limit A* iterations
- [ ] Profile regularly
- [ ] Monitor frame rate

---

## Common Performance Issues

### Issue 1: Low FPS with Many Residents

**Symptoms:**
- Frame rate drops below 30 FPS
- Stuttering movement
- Slow UI response

**Solutions:**
- Implement object pooling
- Add sprite culling
- Throttle AI updates
- Use spatial partitioning
- Reduce pathfinding frequency

### Issue 2: Slow Pathfinding

**Symptoms:**
- Residents freeze when seeking rooms
- Long delays before movement
- CPU spikes

**Solutions:**
- Implement path caching
- Add early exit conditions
- Limit A* iterations
- Use simpler heuristics
- Reduce grid size

### Issue 3: Save/Load Lag

**Symptoms:**
- Game freezes when saving
- Long load times
- localStorage errors

**Solutions:**
- Debounce save operations
- Compress save data
- Use incremental saves
- Validate before saving
- Handle errors gracefully

---

## Browser-Specific Considerations

### Chrome/Edge
- Good performance overall
- localStorage limit: ~10MB
- Excellent dev tools

### Firefox
- Slightly slower canvas rendering
- localStorage limit: ~10MB
- Good profiling tools

### Safari
- More aggressive garbage collection
- localStorage limit: ~5MB
- Requires webkit prefixes

### Mobile Browsers
- Limited memory
- Touch input considerations
- Battery usage concerns
- Reduce visual effects
- Lower target FPS (30)

---

## Testing Performance

### Performance Test Suite

```typescript
function runPerformanceTests(): void {
  console.log("=== Performance Tests ===");
  
  // Test 1: Pathfinding
  const pathStart = performance.now();
  for (let i = 0; i < 100; i++) {
    findPath(grid, 0, 0, 39, 29);
  }
  const pathTime = performance.now() - pathStart;
  console.log(`100 pathfinding calls: ${pathTime.toFixed(2)}ms`);
  
  // Test 2: Resident updates
  const updateStart = performance.now();
  for (let i = 0; i < 1000; i++) {
    updateAllResidents(gameState, 0.016);
  }
  const updateTime = performance.now() - updateStart;
  console.log(`1000 resident updates: ${updateTime.toFixed(2)}ms`);
  
  // Test 3: Save/load
  const saveStart = performance.now();
  saveGame(gameState);
  const saveTime = performance.now() - saveStart;
  console.log(`Save operation: ${saveTime.toFixed(2)}ms`);
  
  const loadStart = performance.now();
  loadGame();
  const loadTime = performance.now() - loadStart;
  console.log(`Load operation: ${loadTime.toFixed(2)}ms`);
}
```

---

## Optimization Priority

1. **Critical** (Do first)
   - Pathfinding optimization
   - Rendering culling
   - Update throttling

2. **High** (Do soon)
   - Object pooling
   - Path caching
   - Spatial partitioning

3. **Medium** (Nice to have)
   - Save compression
   - Texture optimization
   - Memory profiling

4. **Low** (Polish)
   - Advanced culling
   - Predictive caching
   - Custom shaders
