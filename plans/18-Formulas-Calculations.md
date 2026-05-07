# Formulas & Calculations

---

## Overview

This document contains all mathematical formulas used in the Open Arms game with exact parameters and example calculations.

---

## Donation System

### Donation Amount Formula

```
DonationAmount = BaseAmount × ReputationModifier × RandomModifier × GraduateMultiplier

Where:
- BaseAmount = CurrentResidents × $50
- ReputationModifier = 0.5 + (Reputation / 100)
  Range: 0.5 to 1.5
- RandomModifier = 0.8 + (random() × 0.4)
  Range: 0.8 to 1.2
- GraduateMultiplier = 1 + (GraduatedCount × 0.1)
  Range: 1.0 to infinity

Minimum: $10
```

**Example:**
```
15 residents, 75% reputation, 10 graduates
BaseAmount = 15 × 50 = 750
ReputationModifier = 0.5 + 0.75 = 1.25
RandomModifier = 1.0 (average)
GraduateMultiplier = 1 + (10 × 0.1) = 2.0
Result = 750 × 1.25 × 1.0 × 2.0 = $1,875
```

### Donation Probability

```
DonationChance = Reputation / 100

Where:
- Reputation: 0-100
- Result: 0.0 to 1.0 (0% to 100%)
```

---

## LIFE Meter System

### LIFE Meter Fill Rate

```
FillRate = BaseFillRate × EffectiveMultiplier

Where:
- BaseFillRate = Profile-specific rate (per second)
  - Young Adult: 0.05/sec
  - Veteran: 0.025/sec
  - Elderly: 0.0375/sec
  
- EffectiveMultiplier = (ReputationMultiplier + HappinessMultiplier) / 2
  - ReputationMultiplier = Reputation / 100
  - HappinessMultiplier = Happiness / 100
  
Range: 0.0 to BaseFillRate per second
```

**Example:**
```
Young Adult, 60% reputation, 80% happiness
BaseFillRate = 0.05/sec
ReputationMultiplier = 0.6
HappinessMultiplier = 0.8
EffectiveMultiplier = (0.6 + 0.8) / 2 = 0.7
FillRate = 0.05 × 0.7 = 0.035/sec
Time to 100% = 100 / 0.035 = 2,857 seconds ≈ 48 minutes
```

### Time to Graduation

```
TimeToGraduation = (100 - CurrentLIFE) / FillRate

Where:
- CurrentLIFE: 0-100
- FillRate: calculated above (per second)
- Result: seconds
```

---

## Fundraiser System

### Fundraiser Payout

```
Payout = BasePayout × ResidentMultiplier × ReputationModifier × ProfileEfficiency

Where:
- BasePayout = Fundraiser type base amount
  - Cookie Sale: $200
  - Car Wash: $300
  - Craft Fair: $400
  - Bake Sale: $250
  
- ResidentMultiplier = PerResidentMultiplier ^ ResidentCount
  - Cookie Sale: 1.5 ^ count
  - Car Wash: 2.0 ^ count
  - Craft Fair: 1.8 ^ count
  - Bake Sale: 1.6 ^ count
  
- ReputationModifier = 0.5 + (Reputation / 100)
  Range: 0.5 to 1.5
  
- ProfileEfficiency = Average of all assigned residents
  - Young Adult: 1.2
  - Veteran: 1.0
  - Elderly: 0.8
```

**Example:**
```
Car Wash, 3 young adults, 70% reputation
BasePayout = 300
ResidentMultiplier = 2.0 ^ 3 = 8.0
ReputationModifier = 0.5 + 0.7 = 1.2
ProfileEfficiency = 1.2 (all young adults)
Payout = 300 × 8.0 × 1.2 × 1.2 = $3,456
```

---

## Food System

### Food Cost

```
FoodCost = ResidentCount × CostPerResident

Where:
- CostPerResident:
  - Large: $15
  - Standard: $10
  - Small: $5
  - None: $0
```

### Food Effects

```
Happiness Change:
- Large: +10
- Standard: +3
- Small: -5
- None: -15

Reputation Change (per day):
- Large: +1
- Standard: 0
- Small: -1
- None: -5
```

---

## Happiness System

### Happiness Decay

```
HappinessDecay = DecayRate × TimeFactor

Where:
- DecayRate (per day):
  - Young Adult: 10
  - Veteran: 5
  - Elderly: 15
  
- TimeFactor = DeltaTime / DayDuration
  - DayDuration = 12 minutes = 720 seconds
  - DeltaTime = seconds since last update
```

**Example:**
```
Elderly resident, 10 seconds elapsed
DecayRate = 15 per day
TimeFactor = 10 / 720 = 0.0139
Decay = 15 × 0.0139 = 0.208
New Happiness = Old Happiness - 0.208
```

### Happiness Restoration (Sleep)

```
HappinessRestore = RestoreRate × TimeFactor

Where:
- RestoreRate = 15 per hour
- TimeFactor = DeltaTime / 3600 seconds
```

---

## Maintenance System

### Total Maintenance Cost

```
TotalCost = Σ(RoomMaintenanceCost)

Where each room has:
- Dormitory: $20
- Cafeteria: $40
- Learning Center: $50
- Vocational Room: $60
- Bathroom: $15
- Admin Office: $20
- Common Room: $25
- Fundraiser Station: $30
```

### Reputation Penalty (Missed Maintenance)

```
ReputationPenalty = RoomCount × -2

Where:
- RoomCount = total number of rooms
- Penalty is applied per maintenance cycle missed
```

---

## Reputation System

### Reputation Change Events

```
Reputation Changes:
- Resident Graduated: +5 (+7 for veterans)
- Resident Left Unhappy: -3
- Fundraiser Completed: +2
- Food Large Portion (daily): +1
- Food Small Portion (daily): -1
- Food None (daily): -5
- Maintenance Missed: -2 per room
- Overcrowding (daily): -1
- Disaster Accepted: +3
- Disaster Rejected: -5
```

### Reputation Bounds

```
Reputation = clamp(Reputation + Change, 0, 100)

Where:
- clamp(value, min, max) = max(min, min(max, value))
```

---

## Grid Expansion

### Expansion Cost

```
ExpansionCost = TileCount × $100

Where:
- TileCount: 5-10 tiles per expansion
- Minimum expansion: 5 tiles
- Maximum expansion: 10 tiles
```

---

## Offline Progress

### Offline Donations

```
OfflineDonations = ExpectedDonations × AverageDonationAmount

Where:
- ExpectedDonations = ChecksOccurred × DonationChance
- ChecksOccurred = min(OfflineTime / 5min, 24 checks)
- DonationChance = Reputation / 100
- AverageDonationAmount = calculateDonationAmount()
```

### Offline Maintenance

```
OfflineMaintenance = CyclesOccurred × MaintenanceCost

Where:
- CyclesOccurred = min(OfflineTime / 15min, 8 cycles)
- MaintenanceCost = total of all room maintenance costs
```

### Offline Days

```
DaysElapsed = min(OfflineTime / 12min, 10 days)

Where:
- 12 minutes = 1 full day/night cycle
- Capped at 10 days to prevent abuse
```

---

## Day/Night Cycle

### Phase Duration

```
Day Duration = 8 minutes = 480 seconds
Night Duration = 4 minutes = 240 seconds
Full Cycle = 12 minutes = 720 seconds
```

### Phase Progress

```
PhaseProgress = (CurrentTime - PhaseStartTime) / PhaseDuration × 100

Where:
- Result: 0-100%
```

---

## Room Capacity

### Dormitory Capacity

```
RequiredDormitories = ceil(ResidentCount / 4)

Where:
- Each dormitory holds 4 residents
- ceil() rounds up to nearest integer
```

### Cafeteria Capacity

```
TotalCapacity = Σ(CafeteriaCapacity)

Where:
- Each cafeteria: 10 residents
- Overcrowding if ResidentCount > TotalCapacity
```

---

## Pathfinding

### Manhattan Distance (Heuristic)

```
Distance = |x2 - x1| + |y2 - y1|

Where:
- (x1, y1) = start position
- (x2, y2) = goal position
- Result: tile distance
```

### Path Cost

```
PathCost = G + H

Where:
- G = cost from start to current node
- H = heuristic cost from current to goal
- F = G + H (total estimated cost)
```

---

## Performance Metrics

### Frame Rate

```
FPS = 1000 / AverageFrameTime

Where:
- AverageFrameTime = average of last 60 frame times (ms)
```

### Cache Hit Rate

```
HitRate = CacheHits / (CacheHits + CacheMisses) × 100

Where:
- Result: 0-100%
```

---

## Statistical Calculations

### Average Happiness

```
AverageHappiness = Σ(ResidentHappiness) / ResidentCount

Where:
- Sum all resident happiness values
- Divide by total residents
- Result: 0-100
```

### Average LIFE Meter

```
AverageLIFE = Σ(ResidentLIFE) / ResidentCount

Where:
- Sum all resident LIFE values
- Divide by total residents
- Result: 0-100
```

---

## Conversion Formulas

### Time Conversions

```
Milliseconds to Seconds: ms / 1000
Seconds to Minutes: sec / 60
Minutes to Hours: min / 60

Seconds to Milliseconds: sec × 1000
Minutes to Seconds: min × 60
Hours to Minutes: hr × 60
```

### Percentage Conversions

```
Decimal to Percentage: decimal × 100
Percentage to Decimal: percentage / 100

Example: 0.75 = 75%
Example: 80% = 0.8
```

---

## Clamping & Bounds

### Clamp Function

```typescript
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Examples:
clamp(150, 0, 100) = 100
clamp(-10, 0, 100) = 0
clamp(50, 0, 100) = 50
```

### Normalize Function

```typescript
function normalize(value: number, min: number, max: number): number {
  return (value - min) / (max - min);
}

// Example: normalize(50, 0, 100) = 0.5
```

---

## Rounding

### Rounding Methods

```typescript
// Round to nearest integer
Math.round(4.5) = 5
Math.round(4.4) = 4

// Round down (floor)
Math.floor(4.9) = 4

// Round up (ceiling)
Math.ceil(4.1) = 5

// Round to decimal places
function roundTo(value: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

// Example: roundTo(3.14159, 2) = 3.14
```

---

## Random Number Generation

### Random Range

```typescript
// Random float between 0 and 1
Math.random()

// Random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Random float between min and max
function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
```

### Weighted Random

```typescript
function weightedRandom(weights: number[]): number {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * total;
  
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) return i;
  }
  
  return weights.length - 1;
}
```

---

## Summary of Key Formulas

| System | Formula | Key Variables |
|--------|---------|---------------|
| Donations | Base × Rep × Random × Graduates | Residents, Reputation, Graduated Count |
| LIFE Meter | BaseRate × (Rep + Happiness) / 2 | Profile, Reputation, Happiness |
| Fundraiser | Base × Residents^n × Rep × Profile | Type, Count, Reputation, Profiles |
| Food | Residents × CostPerTier | Resident Count, Portion Setting |
| Happiness Decay | Rate × Time / DayDuration | Profile, Time Elapsed |
| Maintenance | Σ(Room Costs) | Room Count, Room Types |
| Reputation | Current + Change (clamped 0-100) | Various triggers |
