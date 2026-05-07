# Donation System

---

## Overview

The Donation System is the primary income source for the shelter. Donations are checked every 5 minutes with probability based on reputation, and amounts scale with residents, reputation, and graduated count.

---

## Donation Timing

### Timer Configuration

```typescript
const DONATION_CONFIG = {
  CHECK_INTERVAL: 5 * 60 * 1000,     // 5 minutes in milliseconds
  BASE_AMOUNT_PER_RESIDENT: 50,      // Base $ per resident
  MIN_DONATION: 10,                  // Minimum donation amount
  GRADUATE_MULTIPLIER: 0.1           // +10% per graduate
};
```

### Donation Check

```typescript
function checkDonation(gameState: GameState): void {
  const now = Date.now();
  
  // Check if it's time for donation check
  if (now < gameState.nextDonationCheck) {
    return;
  }
  
  // Schedule next check
  gameState.nextDonationCheck = now + DONATION_CONFIG.CHECK_INTERVAL;
  
  // Roll for donation
  const chance = gameState.reputation / 100; // 0-100% becomes 0-1
  const roll = Math.random();
  
  if (roll <= chance) {
    const amount = calculateDonationAmount(gameState);
    gameState.money += amount;
    
    // Trigger UI notification
    showNotification(`💰 Donation received: $${amount}`, "success");
    
    console.log(`Donation: $${amount} (chance: ${(chance * 100).toFixed(1)}%)`);
  } else {
    console.log(`No donation this cycle (chance: ${(chance * 100).toFixed(1)}%)`);
  }
}
```

---

## Donation Amount Calculation

### Formula

```
DonationAmount = BaseAmount × ReputationModifier × RandomModifier × GraduateMultiplier

Where:
- BaseAmount = CurrentResidents × $50
- ReputationModifier = 0.5 + (Reputation / 100)
  - At 0% rep: 0.5x multiplier
  - At 50% rep: 1.0x multiplier
  - At 100% rep: 1.5x multiplier
- RandomModifier = 0.8 to 1.2 (±20% variance)
- GraduateMultiplier = 1 + (GraduatedCount × 0.1)
  - Each graduate adds +10% permanently
```

### Implementation

```typescript
function calculateDonationAmount(gameState: GameState): number {
  // Base amount scales with current residents
  const baseAmount = gameState.residents.length * DONATION_CONFIG.BASE_AMOUNT_PER_RESIDENT;
  
  // Reputation modifier (0.5x to 1.5x)
  const reputationModifier = 0.5 + (gameState.reputation / 100);
  
  // Random variance (0.8x to 1.2x)
  const randomModifier = 0.8 + (Math.random() * 0.4);
  
  // Permanent multiplier from graduated residents
  const graduateMultiplier = 1 + (gameState.graduatedCount * DONATION_CONFIG.GRADUATE_MULTIPLIER);
  
  // Calculate final amount
  const finalAmount = Math.floor(
    baseAmount * reputationModifier * randomModifier * graduateMultiplier
  );
  
  // Ensure minimum donation
  return Math.max(DONATION_CONFIG.MIN_DONATION, finalAmount);
}
```

### Example Calculations

```typescript
// Example 1: Early game
// 5 residents, 50% reputation, 0 graduates
// Base: 5 × 50 = 250
// Rep: 0.5 + 0.5 = 1.0x
// Random: ~1.0x (average)
// Graduate: 1.0x
// Result: ~$250

// Example 2: Mid game
// 15 residents, 75% reputation, 10 graduates
// Base: 15 × 50 = 750
// Rep: 0.5 + 0.75 = 1.25x
// Random: ~1.0x (average)
// Graduate: 1 + (10 × 0.1) = 2.0x
// Result: ~$1,875

// Example 3: Late game
// 30 residents, 90% reputation, 50 graduates
// Base: 30 × 50 = 1,500
// Rep: 0.5 + 0.9 = 1.4x
// Random: ~1.0x (average)
// Graduate: 1 + (50 × 0.1) = 6.0x
// Result: ~$12,600
```

---

## Donation Probability

### Probability by Reputation

| Reputation | Donation Chance | Expected Donations per Hour |
|------------|-----------------|----------------------------|
| 0%         | 0%              | 0                          |
| 20%        | 20%             | ~2.4                       |
| 40%        | 40%             | ~4.8                       |
| 50%        | 50%             | ~6                         |
| 60%        | 60%             | ~7.2                       |
| 80%        | 80%             | ~9.6                       |
| 100%       | 100%            | 12                         |

*Note: 12 checks per hour (every 5 minutes)*

---

## Donation Tracking

### Donation History

```typescript
interface DonationRecord {
  timestamp: number;
  amount: number;
  residentCount: number;
  reputation: number;
  graduatedCount: number;
}

const donationHistory: DonationRecord[] = [];

function recordDonation(gameState: GameState, amount: number): void {
  donationHistory.push({
    timestamp: Date.now(),
    amount,
    residentCount: gameState.residents.length,
    reputation: gameState.reputation,
    graduatedCount: gameState.graduatedCount
  });
  
  // Keep only last 100 donations
  if (donationHistory.length > 100) {
    donationHistory.shift();
  }
}
```

### Donation Statistics

```typescript
function getDonationStats(): {
  totalReceived: number;
  averageAmount: number;
  lastHourTotal: number;
  successRate: number;
} {
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  const recentDonations = donationHistory.filter(d => d.timestamp > oneHourAgo);
  
  const totalReceived = donationHistory.reduce((sum, d) => sum + d.amount, 0);
  const averageAmount = donationHistory.length > 0 
    ? totalReceived / donationHistory.length 
    : 0;
  
  const lastHourTotal = recentDonations.reduce((sum, d) => sum + d.amount, 0);
  
  // Success rate = donations received / checks performed
  const checksPerHour = 12;
  const successRate = recentDonations.length / checksPerHour;
  
  return {
    totalReceived,
    averageAmount,
    lastHourTotal,
    successRate
  };
}
```

---

## Donation Events

### Special Donation Events

```typescript
interface DonationEvent {
  type: "large_donation" | "matching_grant" | "anonymous_donor";
  multiplier: number;
  duration?: number; // minutes
}

function triggerDonationEvent(
  gameState: GameState,
  event: DonationEvent
): void {
  switch (event.type) {
    case "large_donation":
      // One-time large donation
      const amount = calculateDonationAmount(gameState) * event.multiplier;
      gameState.money += amount;
      showNotification(`🎉 Large donation received: $${amount}!`, "success");
      break;
    
    case "matching_grant":
      // Next X donations are matched
      // Implementation would require temporary state
      showNotification(`🎁 Matching grant active for ${event.duration} minutes!`, "success");
      break;
    
    case "anonymous_donor":
      // Guaranteed donations for duration
      showNotification(`💝 Anonymous donor pledged support!`, "success");
      break;
  }
}
```

---

## Offline Donation Calculation

### Offline Progress

```typescript
function calculateOfflineDonations(gameState: GameState): number {
  const now = Date.now();
  const timeSinceLastPlayed = now - gameState.lastPlayed;
  
  // Calculate how many donation checks occurred
  const checksOccurred = Math.floor(timeSinceLastPlayed / DONATION_CONFIG.CHECK_INTERVAL);
  
  if (checksOccurred === 0) return 0;
  
  // Cap offline checks to prevent abuse
  const MAX_OFFLINE_CHECKS = 24; // 2 hours worth
  const actualChecks = Math.min(checksOccurred, MAX_OFFLINE_CHECKS);
  
  // Calculate expected donations based on reputation
  const donationChance = gameState.reputation / 100;
  const expectedDonations = Math.floor(actualChecks * donationChance);
  
  // Calculate total amount
  let totalDonations = 0;
  for (let i = 0; i < expectedDonations; i++) {
    totalDonations += calculateDonationAmount(gameState);
  }
  
  return totalDonations;
}

function applyOfflineProgress(gameState: GameState): void {
  const offlineDonations = calculateOfflineDonations(gameState);
  
  if (offlineDonations > 0) {
    gameState.money += offlineDonations;
    showNotification(
      `💰 While you were away: $${offlineDonations} in donations`,
      "info"
    );
  }
  
  // Update last played time
  gameState.lastPlayed = Date.now();
}
```

---

## Donation UI

### Donation Notification

```typescript
function showDonationNotification(amount: number, gameState: GameState): void {
  const notification = {
    type: "success" as const,
    message: `💰 Donation received: $${amount}`,
    details: [
      `Current residents: ${gameState.residents.length}`,
      `Reputation: ${gameState.reputation}%`,
      `Graduates: ${gameState.graduatedCount}`
    ]
  };
  
  displayNotification(notification);
}
```

### Next Donation Timer Display

```typescript
function getNextDonationTimeRemaining(gameState: GameState): string {
  const now = Date.now();
  const remaining = gameState.nextDonationCheck - now;
  
  if (remaining <= 0) return "Checking now...";
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
```

---

## Donation Modifiers

### Temporary Modifiers

```typescript
interface DonationModifier {
  id: string;
  type: "multiplier" | "bonus" | "guaranteed";
  value: number;
  expiresAt: number;
  source: string; // "event", "upgrade", etc.
}

const activeDonationModifiers: DonationModifier[] = [];

function applyDonationModifiers(baseAmount: number): number {
  let finalAmount = baseAmount;
  
  for (const modifier of activeDonationModifiers) {
    if (Date.now() > modifier.expiresAt) {
      // Expired, remove it
      const index = activeDonationModifiers.indexOf(modifier);
      activeDonationModifiers.splice(index, 1);
      continue;
    }
    
    switch (modifier.type) {
      case "multiplier":
        finalAmount *= modifier.value;
        break;
      case "bonus":
        finalAmount += modifier.value;
        break;
    }
  }
  
  return Math.floor(finalAmount);
}
```

---

## Integration Notes

### Reputation System Integration
- Donation probability directly tied to reputation
- Low reputation = fewer donations
- See [`07-Reputation-System.md`](07-Reputation-System.md)

### Timer Manager Integration
- Donation checks scheduled by Timer Manager
- Runs every 5 minutes
- See [`15-Game-Loop-Timing.md`](15-Game-Loop-Timing.md)

### Graduate Counter Integration
- Each graduate permanently increases donation amounts
- Provides long-term progression incentive
- Encourages helping residents succeed

### UI Integration
- Display next donation timer in HUD
- Show donation notifications prominently
- Track donation history in statistics screen

---

## Balancing Notes

### Early Game (0-5 graduates)
- Donations are modest ($100-$500)
- Reputation is critical for survival
- Focus on graduating first residents

### Mid Game (5-20 graduates)
- Donations become substantial ($500-$2000)
- Graduate multiplier starts to compound
- Can support larger shelter

### Late Game (20+ graduates)
- Donations are very large ($2000-$10000+)
- Graduate multiplier dominates formula
- Can afford expensive expansions

### Reputation Impact
- At 0% reputation: No donations (game over imminent)
- At 50% reputation: Baseline donation rate
- At 100% reputation: 1.5x donation amounts + guaranteed checks
