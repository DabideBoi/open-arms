# Maintenance System

---

## Overview

The Maintenance System handles recurring facility costs. Every 15 minutes, maintenance costs are deducted for all rooms. If funds are insufficient, costs are still deducted (can go negative) and reputation takes a hit.

---

## Maintenance Configuration

### Timing

```typescript
const MAINTENANCE_CONFIG = {
  CHECK_INTERVAL: 15 * 60 * 1000,    // 15 minutes in milliseconds
  REPUTATION_PENALTY_PER_ROOM: -2    // Reputation loss per room if can't pay
};
```

### Room Maintenance Costs

```typescript
const ROOM_MAINTENANCE_COSTS: Record<RoomType, number> = {
  dormitory: 20,
  cafeteria: 40,
  learning_center: 50,
  vocational_room: 60,
  bathroom: 15,
  admin_office: 20,
  common_room: 25,
  fundraiser_station: 30
};
```

---

## Maintenance Processing

### Check Maintenance

```typescript
function checkMaintenance(gameState: GameState): void {
  const now = Date.now();
  
  // Check if it's time for maintenance
  if (now < gameState.nextMaintenanceCheck) {
    return;
  }
  
  // Schedule next check
  gameState.nextMaintenanceCheck = now + MAINTENANCE_CONFIG.CHECK_INTERVAL;
  
  // Process maintenance
  processMaintenance(gameState);
}
```

### Process Maintenance

```typescript
function processMaintenance(gameState: GameState): void {
  const totalCost = getTotalMaintenanceCost(gameState);
  
  if (totalCost === 0) {
    console.log("No maintenance costs (no rooms)");
    return;
  }
  
  const canAfford = gameState.money >= totalCost;
  
  if (canAfford) {
    // Normal maintenance
    gameState.money -= totalCost;
    
    // Update last maintenance paid for all rooms
    for (const room of gameState.rooms) {
      room.lastMaintenancePaid = Date.now();
    }
    
    console.log(`Maintenance paid: $${totalCost} for ${gameState.rooms.length} rooms`);
    
    showNotification(
      `🔧 Maintenance: $${totalCost}`,
      "info"
    );
  } else {
    // Can't afford maintenance
    const roomCount = gameState.rooms.length;
    const repPenalty = MAINTENANCE_CONFIG.REPUTATION_PENALTY_PER_ROOM * roomCount;
    
    // Still deduct cost (can go negative)
    gameState.money -= totalCost;
    
    // Reputation penalty
    modifyReputation(
      gameState,
      repPenalty,
      `Missed maintenance on ${roomCount} rooms`
    );
    
    console.log(`Maintenance missed: $${totalCost} (had $${gameState.money + totalCost})`);
    
    showNotification(
      `⚠️ Insufficient funds for maintenance! -$${totalCost}, ${repPenalty} reputation`,
      "error"
    );
  }
}
```

---

## Cost Calculation

### Total Maintenance Cost

```typescript
function getTotalMaintenanceCost(gameState: GameState): number {
  return gameState.rooms.reduce((sum, room) => sum + room.maintenanceCost, 0);
}
```

### Cost by Room Type

```typescript
function getMaintenanceCostByType(gameState: GameState): Record<RoomType, number> {
  const costs: Partial<Record<RoomType, number>> = {};
  
  for (const room of gameState.rooms) {
    costs[room.type] = (costs[room.type] || 0) + room.maintenanceCost;
  }
  
  return costs as Record<RoomType, number>;
}
```

### Next Maintenance Cost Preview

```typescript
function getNextMaintenanceCost(gameState: GameState): {
  total: number;
  canAfford: boolean;
  timeUntilDue: number;
} {
  const total = getTotalMaintenanceCost(gameState);
  const canAfford = gameState.money >= total;
  const timeUntilDue = gameState.nextMaintenanceCheck - Date.now();
  
  return {
    total,
    canAfford,
    timeUntilDue
  };
}
```

---

## Maintenance Warnings

### Low Funds Warning

```typescript
function checkMaintenanceWarning(gameState: GameState): void {
  const nextCost = getTotalMaintenanceCost(gameState);
  const timeUntilDue = gameState.nextMaintenanceCheck - Date.now();
  
  // Warn if can't afford and maintenance is due soon
  if (gameState.money < nextCost && timeUntilDue < 5 * 60 * 1000) {
    showNotification(
      `⚠️ Maintenance due in ${Math.floor(timeUntilDue / 60000)} minutes. Need $${nextCost}, have $${gameState.money}`,
      "warning"
    );
  }
}
```

---

## Maintenance UI

### Time Until Next Maintenance

```typescript
function getMaintenanceTimeRemaining(gameState: GameState): string {
  const now = Date.now();
  const remaining = gameState.nextMaintenanceCheck - now;
  
  if (remaining <= 0) return "Due now";
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

### Maintenance Status Display

```typescript
function getMaintenanceStatus(gameState: GameState): {
  nextCost: number;
  canAfford: boolean;
  timeRemaining: string;
  status: "ok" | "warning" | "critical";
} {
  const nextCost = getTotalMaintenanceCost(gameState);
  const canAfford = gameState.money >= nextCost;
  const timeRemaining = getMaintenanceTimeRemaining(gameState);
  
  let status: "ok" | "warning" | "critical";
  
  if (canAfford) {
    status = "ok";
  } else {
    const timeUntilDue = gameState.nextMaintenanceCheck - Date.now();
    if (timeUntilDue < 5 * 60 * 1000) {
      status = "critical";
    } else {
      status = "warning";
    }
  }
  
  return {
    nextCost,
    canAfford,
    timeRemaining,
    status
  };
}
```

---

## Maintenance Statistics

### Tracking

```typescript
interface MaintenanceRecord {
  timestamp: number;
  cost: number;
  roomCount: number;
  paid: boolean;
  reputationPenalty: number;
}

const maintenanceHistory: MaintenanceRecord[] = [];

function recordMaintenance(
  cost: number,
  roomCount: number,
  paid: boolean,
  reputationPenalty: number
): void {
  maintenanceHistory.push({
    timestamp: Date.now(),
    cost,
    roomCount,
    paid,
    reputationPenalty
  });
  
  // Keep only last 50 records
  if (maintenanceHistory.length > 50) {
    maintenanceHistory.shift();
  }
}

function getMaintenanceStats(): {
  totalSpent: number;
  totalMissed: number;
  missedCount: number;
  averageCost: number;
} {
  const totalSpent = maintenanceHistory
    .filter(r => r.paid)
    .reduce((sum, r) => sum + r.cost, 0);
  
  const missedRecords = maintenanceHistory.filter(r => !r.paid);
  const totalMissed = missedRecords.reduce((sum, r) => sum + r.cost, 0);
  const missedCount = missedRecords.length;
  
  const averageCost = maintenanceHistory.length > 0
    ? maintenanceHistory.reduce((sum, r) => sum + r.cost, 0) / maintenanceHistory.length
    : 0;
  
  return {
    totalSpent,
    totalMissed,
    missedCount,
    averageCost
  };
}
```

---

## Maintenance Optimization

### Cost Reduction Strategies

```typescript
function getMaintenanceOptimizationSuggestions(gameState: GameState): string[] {
  const suggestions: string[] = [];
  const costByType = getMaintenanceCostByType(gameState);
  
  // Find most expensive room types
  const sortedTypes = Object.entries(costByType)
    .sort(([, a], [, b]) => b - a);
  
  if (sortedTypes.length > 0) {
    const [mostExpensiveType, cost] = sortedTypes[0];
    suggestions.push(
      `${mostExpensiveType} rooms cost $${cost} per cycle. Consider if all are necessary.`
    );
  }
  
  // Check for unused rooms
  const unusedRooms = gameState.rooms.filter(r => r.currentOccupancy === 0);
  if (unusedRooms.length > 0) {
    suggestions.push(
      `${unusedRooms.length} rooms are unused. Consider removing them to reduce costs.`
    );
  }
  
  return suggestions;
}
```

---

## Maintenance Events

### Volunteer Maintenance Event

```typescript
function triggerVolunteerMaintenanceEvent(gameState: GameState): void {
  const event: GameEvent = {
    id: generateUUID(),
    type: "volunteer_day",
    title: "Volunteer Maintenance Day",
    description: "Volunteers offer to handle maintenance for free this cycle!",
    triggeredAt: Date.now(),
    expiresAt: null,
    options: [
      {
        label: "Accept help",
        effects: [
          { type: "reputation", value: 2 }
        ]
      }
    ],
    resolved: false
  };
  
  gameState.activeEvents.push(event);
  
  // Skip next maintenance cost
  // Implementation would require temporary maintenance discount
}
```

### Maintenance Crisis Event

```typescript
function triggerMaintenanceCrisisEvent(gameState: GameState): void {
  const event: GameEvent = {
    id: generateUUID(),
    type: "health_outbreak",
    title: "Maintenance Crisis",
    description: "Emergency repairs needed! Maintenance costs doubled for next 3 cycles.",
    triggeredAt: Date.now(),
    expiresAt: null,
    options: [
      {
        label: "Pay for repairs",
        effects: [
          { type: "money", value: -1000 }
        ]
      },
      {
        label: "Delay repairs",
        effects: [
          { type: "reputation", value: -5 }
        ]
      }
    ],
    resolved: false
  };
  
  gameState.activeEvents.push(event);
}
```

---

## Offline Maintenance Calculation

### Offline Progress

```typescript
function calculateOfflineMaintenance(gameState: GameState): {
  cyclesOccurred: number;
  totalCost: number;
  reputationLost: number;
} {
  const now = Date.now();
  const timeSinceLastPlayed = now - gameState.lastPlayed;
  
  // Calculate how many maintenance cycles occurred
  const cyclesOccurred = Math.floor(timeSinceLastPlayed / MAINTENANCE_CONFIG.CHECK_INTERVAL);
  
  if (cyclesOccurred === 0) {
    return { cyclesOccurred: 0, totalCost: 0, reputationLost: 0 };
  }
  
  // Cap offline cycles to prevent abuse
  const MAX_OFFLINE_CYCLES = 8; // 2 hours worth
  const actualCycles = Math.min(cyclesOccurred, MAX_OFFLINE_CYCLES);
  
  const costPerCycle = getTotalMaintenanceCost(gameState);
  const totalCost = costPerCycle * actualCycles;
  
  // Calculate reputation loss if couldn't afford
  let reputationLost = 0;
  let remainingMoney = gameState.money;
  
  for (let i = 0; i < actualCycles; i++) {
    if (remainingMoney < costPerCycle) {
      // Couldn't afford this cycle
      const roomCount = gameState.rooms.length;
      reputationLost += MAINTENANCE_CONFIG.REPUTATION_PENALTY_PER_ROOM * roomCount;
    }
    remainingMoney -= costPerCycle;
  }
  
  return {
    cyclesOccurred: actualCycles,
    totalCost,
    reputationLost
  };
}

function applyOfflineMaintenance(gameState: GameState): void {
  const offline = calculateOfflineMaintenance(gameState);
  
  if (offline.cyclesOccurred > 0) {
    // Deduct costs
    gameState.money -= offline.totalCost;
    
    // Apply reputation loss
    if (offline.reputationLost < 0) {
      modifyReputation(
        gameState,
        offline.reputationLost,
        "Missed maintenance while offline"
      );
    }
    
    // Show notification
    showNotification(
      `While away: $${offline.totalCost} in maintenance (${offline.cyclesOccurred} cycles)`,
      offline.reputationLost < 0 ? "warning" : "info"
    );
  }
}
```

---

## Maintenance Balancing

### Cost Scaling

| Shelter Size | Rooms | Cost per Cycle | Cost per Hour |
|--------------|-------|----------------|---------------|
| Small (5 rooms) | 5 | ~$150 | ~$600 |
| Medium (15 rooms) | 15 | ~$450 | ~$1,800 |
| Large (30 rooms) | 30 | ~$900 | ~$3,600 |
| Huge (50 rooms) | 50 | ~$1,500 | ~$6,000 |

*Assumes mixed room types*

### Budget Guidelines

**Early Game:**
- Keep maintenance under $200 per cycle
- Build only essential rooms
- Ensure donation income covers maintenance

**Mid Game:**
- Maintenance $400-$800 per cycle is manageable
- Expand strategically
- Balance room count with income

**Late Game:**
- Maintenance $1000+ per cycle
- High donation income supports large shelters
- Can afford specialized rooms

---

## Integration Notes

### Timer Manager Integration
- Maintenance checks scheduled by Timer Manager
- Runs every 15 minutes
- See [`15-Game-Loop-Timing.md`](15-Game-Loop-Timing.md)

### Reputation System Integration
- Missed maintenance damages reputation
- Penalty scales with room count
- See [`07-Reputation-System.md`](07-Reputation-System.md)

### Economy Integration
- Maintenance is a recurring expense
- Must balance with donation income
- Can go into negative balance

### Room System Integration
- Each room has maintenance cost
- Costs defined in room specs
- See [`04-Grid-Building-System.md`](04-Grid-Building-System.md)

---

## Design Notes

### No Room Degradation

Unlike some management games, rooms do **not** degrade or break if maintenance is missed. This design choice:

- Keeps the system simple
- Focuses on financial pressure
- Avoids frustrating "broken room" mechanics
- Reputation penalty is sufficient consequence

### Negative Balance Allowed

The game allows going into negative balance for maintenance:

- Prevents sudden game over
- Gives player time to recover
- Creates tension without hard failure
- Reputation damage is the real penalty

This creates a "debt spiral" risk that players must manage carefully.
