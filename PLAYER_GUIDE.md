# 📖 Open Arms - Player Guide

Welcome to Open Arms! This comprehensive guide will help you master the art of shelter management and make a meaningful difference in your residents' lives.

## 🎯 Table of Contents

1. [Getting Started](#getting-started)
2. [Game Basics](#game-basics)
3. [Room Types & Facilities](#room-types--facilities)
4. [Room Placement Strategy](#room-placement-strategy)
5. [Resident System](#resident-system)
6. [LIFE Meter Progression](#life-meter-progression)
7. [Food System & Deliveries](#food-system--deliveries)
8. [Economic Management](#economic-management)
9. [Fundraiser System](#fundraiser-system)
10. [Tier Progression](#tier-progression)
11. [Disaster Events](#disaster-events)
12. [Day/Night Cycle](#daynight-cycle)
13. [Warning System](#warning-system)
14. [Reputation System](#reputation-system)
15. [Tips & Strategies](#tips--strategies)
16. [Keyboard Shortcuts](#keyboard-shortcuts)
17. [FAQ](#faq)

---

## 🚀 Getting Started

### Your First Day

When you start a new game, you'll have:
- **₱250,000** starting budget
- **40% reputation**
- **3 initial residents**
- **12×12 tile grid** for building (Tier 1)
- **Basic room access** (Dormitory, Cafeteria, Bathroom, Common Room)

### Initial Setup Strategy

1. **Build Essential Facilities First**
   - Place 1 Dormitory (₱15,000) for sleeping
   - Add 1 Cafeteria (₱25,000) for meals
   - Include 1 Bathroom (₱10,000) for hygiene
   - Place them adjacent for bonuses!

2. **Monitor Your Resources**
   - Watch your money carefully (game is faster-paced now)
   - Keep an eye on resident health
   - Check the warning panel for issues

3. **Understand the Pace**
   - Full day cycle: 6 minutes
   - Donations arrive every 90 seconds
   - Maintenance due every 5 minutes

---

## 🎮 Game Basics

### The HUD (Heads-Up Display)

Located at the top of the screen:

- **💰 Money**: Your current budget (goes negative = bankruptcy danger!)
- **⭐ Reputation**: Community trust level (0-100%)
- **👥 Residents**: Current/Maximum capacity for your tier
- **📅 Day**: Current day number
- **🌅 Phase**: Time of day (Day/Night)
- **🍽️ Food**: Current food supply level
- **📊 Dashboard**: Click for detailed economic breakdown

### Camera Controls

- **Pan**: Click and drag on the game canvas
- **Zoom**: Mouse wheel (if enabled)
- **Reset**: Double-click to center view

### Building Placement

1. Click the **Build** button in the HUD
2. Select a room type from the menu
3. **Check the adjacency preview** - green = bonus, red = penalty
4. Click on the grid to place
5. Room becomes functional instantly

### Time & Speed

- Game progresses automatically
- Use **Speed Controls** to adjust pace:
  - ⏸️ Pause
  - ▶️ Normal (1x)
  - ⏩ Fast (2x)
  - ⏭️ Very Fast (3x)

---

## 🏗️ Room Types & Facilities

### Dormitory
**Size**: 3×3 tiles | **Cost**: ₱15,000 | **Capacity**: 4 residents | **Maintenance**: ₱1,250/cycle

**Purpose**: Sleeping quarters where residents rest.

**Good Adjacent To**: Bathroom (+5 health), Common Room (+3 health)  
**Bad Adjacent To**: Cafeteria (-5 health), Fundraiser Station (-3 health)

---

### Cafeteria
**Size**: 5×3 tiles | **Cost**: ₱25,000 | **Capacity**: 5 residents (one per chair) | **Maintenance**: ₱2,500/cycle

**Purpose**: Dining area where residents eat meals. Also generates food over time.

**Good Adjacent To**: Common Room (+5 health)  
**Bad Adjacent To**: Dormitory (-5 health), Bathroom (-8 health)

---

### Bathroom
**Size**: 2×2 tiles | **Cost**: ₱10,000 | **Capacity**: N/A | **Maintenance**: ₱1,000/cycle

**Purpose**: Hygiene facilities for residents.

**Good Adjacent To**: Dormitory (+5 health, -10% maintenance)  
**Bad Adjacent To**: Cafeteria (-8 health)

---

### Common Room
**Size**: 3×3 tiles | **Cost**: ₱17,500 | **Capacity**: N/A | **Maintenance**: ₱1,500/cycle

**Purpose**: Social and recreational space for relaxation.

**Good Adjacent To**: Dormitory (+3 health, +5% LIFE), Cafeteria (+5 health), Fundraiser Station (+2 health)

---

### Clinic (Unlocks at Tier 1)
**Size**: 3×3 tiles | **Cost**: ₱20,000 | **Capacity**: 4 residents | **Maintenance**: ₱1,750/cycle

**Purpose**: Residents whose Health drops below 35% go to the Clinic on their own and recover there (about +2 Health per second while inside).

**Good Adjacent To**: Bathroom (+3 health)
**Bad Adjacent To**: Cafeteria (-3 health)

---

### Admin Office (Unlocks at Tier 2)
**Size**: 2×2 tiles | **Cost**: ₱35,000 | **Capacity**: N/A | **Maintenance**: ₱3,000/cycle

**Purpose**: Management and coordination. Boosts efficiency of adjacent rooms.

**Good Adjacent To**: Fundraiser Station (-10% maintenance)

---

### Fundraiser Station (Unlocks at Tier 1)
**Size**: 3×2 tiles | **Cost**: ₱20,000 | **Capacity**: 4 residents | **Maintenance**: ₱1,750/cycle

**Purpose**: Location for running fundraiser events.

**Good Adjacent To**: Common Room (+2 health), Admin Office (-10% maintenance)  
**Bad Adjacent To**: Dormitory (-3 health)

---

### Upgraded Rooms
Bigger versions of the basics. Each one works exactly like its base room (same needs and adjacency pairings).

| Room | Works as | Unlocks | Size | Cost | Maintenance | Extra |
|------|----------|---------|------|------|-------------|-------|
| Large Dormitory | Dormitory | Tier 2 | 4×3 | ₱27,500 | ₱2,000/cycle | 6 beds |
| Medical Center | Clinic | Tier 3 | 4×3 | ₱40,000 | ₱3,000/cycle | 6 patients, +5 health while inside |
| Dining Hall | Cafeteria | Tier 3 | 6×3 | ₱45,000 | ₱3,750/cycle | 8 seats |

---

### Service Rooms
Social rooms that work like a Common Room, with a bonus for anyone using them.

| Room | Unlocks | Size | Cost | Maintenance | Bonus |
|------|---------|------|------|-------------|-------|
| Library | Tier 2 | 3×3 | ₱25,000 | ₱1,750/cycle | +15% LIFE |
| Garden | Tier 3 | 3×3 | ₱30,000 | ₱1,500/cycle | +3 health, +5% LIFE |

---

### Decorations
1×1 pieces with no use of their own. They boost residents **using any room they touch** (shared edge, not diagonal). Decorations don't boost each other.

| Decoration | Unlocks | Cost | Maintenance | Boost to touching rooms |
|------------|---------|------|-------------|-------------------------|
| Potted Plant | Tier 1 | ₱3,000 | ₱150/cycle | +2 health |
| Fountain | Tier 3 | ₱12,500 | ₱500/cycle | +3 health, +5% LIFE |

---

## 📐 Room Placement Strategy

### Adjacency Bonus System

Rooms that share an edge (not diagonal) can give each other bonuses or penalties. Plan your layout carefully!

### Optimal Layout Tips

1. **Create a "Quiet Zone"**
   - Group Dormitories together
   - Place Bathrooms adjacent to Dormitories
   - Keep Cafeteria and Fundraiser Station away

2. **Create a "Health Zone"**
   - Place the Clinic next to a Bathroom (+3 health)
   - Keep the Clinic away from the Cafeteria (-3 health)

3. **Create a "Social Zone"**
   - Common Room adjacent to Cafeteria (+5 health)
   - Fundraiser Station nearby for events
   - This keeps activity noise away from sleeping areas

### Example Layout (Tier 1)
```
[BATH][DORM DORM DORM]
[BATH][DORM DORM DORM]
      [DORM DORM DORM]
      
[CAFE CAFE CAFE CAFE CAFE][COMMON COMMON COMMON]
[CAFE CAFE CAFE CAFE CAFE][COMMON COMMON COMMON]
[CAFE CAFE CAFE CAFE CAFE][COMMON COMMON COMMON]
```

---

## 👥 Resident System

### Resident Profiles

Each resident has one of three profiles:

New residents only arrive when you accept them in a random event (see [Arrival Events](#-arrival-events)). The percentages below are used when an event doesn't say who is coming.

#### 🧑 Young Adult (40%)
- **LIFE Fill**: 20 points/hour (fastest)
- **Need Decay**: 12 points/day (moderate)
- **Fundraiser Efficiency**: 1.2x
- **Best For**: Quick graduations

#### 🧔 Adult (40%)
- **LIFE Fill**: 12 points/hour (moderate)
- **Need Decay**: 7 points/day (slowest)
- **Fundraiser Fatigue**: 2 minutes
- **Best For**: Steady progression

#### 👴 Elderly (20%)
- **LIFE Fill**: 8 points/hour (slowest)
- **Need Decay**: 20 points/day (fastest)
- **Special**: Requires more care
- **Best For**: When you have resources to spare

### Resident Needs

Residents have 5 core needs (0-100 scale):

1. **🛏️ Sleep** - Restored in Dormitories at night
2. **🍽️ Hunger** - Satisfied in Cafeteria
3. **🚿 Hygiene** - Improved in Bathrooms
4. **💬 Social** - Improved in Common Rooms
5. **❤️ Health** - Affected by all factors; below 35% residents head to the Clinic

### Resident Status Bars

Press **B** to toggle status bars above residents:

- **Blue Bar**: LIFE meter progress
  - Turns gold when near graduation (90%+)
  - Turns grey if stalled
- **Color Bar**: Health level
  - 🟢 Green (70-100%) - Healthy
  - 🟡 Yellow (40-69%) - Neutral
  - 🟠 Orange (20-39%) - Unhealthy
  - 🔴 Red (0-19%) - At risk (pulses!)

### Departure Warning

If health stays below 20% for too long:
1. **Warning Phase** (12 minutes): Resident becomes "at-risk"
2. **Departure Phase** (24 minutes): Resident leaves
3. **Reputation Loss**: -3 to -5 depending on severity

**Prevention**: Watch for the 😰 emoji and red pulsing bars!

---

## 📊 LIFE Meter Progression

The **LIFE (Living Independently For Empowerment)** meter tracks each resident's journey toward independence.

### Four Stages

#### 1. 🔴 Survival (0-25%)
- Focus: Meeting basic needs
- Duration: ~10-20 game days
- Priority: Ensure food, sleep, hygiene

#### 2. 🟡 Stability (25-50%)
- Focus: Establishing routines
- Duration: ~15-30 game days
- Priority: Build trust, provide social opportunities

#### 3. 🟢 Growth (50-75%)
- Focus: Earning through fundraisers
- Duration: ~20-40 game days
- Priority: Keep fundraisers running

#### 4. 🔵 Independence (75-100%)
- Focus: Preparing to graduate
- Duration: ~10-20 game days
- Priority: Final fundraisers

### Boosting LIFE Progression

LIFE now comes mostly from **fundraisers**. Everyone who takes part gains LIFE:

| Source | Effect |
|--------|--------|
| Successful fundraiser | +15 LIFE per participant |
| Failed fundraiser | +5 LIFE per participant |
| Passive fill | Slow trickle for every resident |
| Food: Premium | +50% passive fill rate |
| Food: Generous | +20% passive fill rate |
| High health | Faster passive fill |

### Graduation

When LIFE reaches 100%:
- Resident "graduates" and leaves
- You receive +5 reputation
- Potential ₱25,000 bonus donation
- Progress toward next tier unlock

---

## 🍽️ Food System & Deliveries

Your food **delivery level** sets the supplies that arrive each day. Bigger deliveries cost more, keep residents healthier, and make cafeterias produce food faster.

### Five Delivery Levels

| Level | Cost/Resident | Health | Reputation | LIFE Fill | Food Production |
|-------|---------------|--------|------------|-----------|-----------------|
| **Minimal** | ₱250 | -10 | -3 | 0.5x | 0.6x |
| **Small** | ₱500 | -5 | -1 | 0.8x | 0.8x |
| **Standard** | ₱900 | 0 | 0 | 1.0x | 1.0x |
| **Generous** | ₱1,500 | +10 | +2 | 1.2x | 1.2x |
| **Premium** | ₱2,500 | +20 | +5 | 1.5x | 1.5x |

"No Deliveries" is also available as a last resort: it costs nothing, hurts Health and reputation, and cafeterias only produce 0.3x food.

### Delivery Strategy

**Early Game (Tight Budget)**
- Use **Small** deliveries to save money
- Accept the health penalty temporarily
- Switch to Standard when stable

**Mid Game (Stable)**
- Use **Standard** as baseline
- Switch to **Generous** before fundraisers (boosts health)
- Use **Minimal** only in emergencies

**Late Game (Prosperous)**
- **Generous** or **Premium** accelerates graduations and food production
- Higher reputation = better donations

### Food Generation and Use

- Each cafeteria produces 1 food every 15 seconds at Standard; the delivery level speeds this up or slows it down
- Every time a resident finishes a meal at a cafeteria, 1 food is used up
- Fundraisers also use food (3 per participant)
- If food runs out, residents leave the cafeteria hungry

---

## 💰 Economic Management

### Income Sources

#### 1. Automatic Donations
- **Frequency**: Every 90 seconds
- **Base Amount**: ₱1,250 per resident
- **Reputation Multiplier**: Affects donation chance
- **Tier Multiplier**: 1.0x → 2.0x based on tier

#### 2. Fundraisers
- Manual events with success/failure mechanics
- See [Fundraiser System](#fundraiser-system)

#### 3. Graduation Bonuses
- ₱25,000 potential bonus per graduation

### Expenses

#### 1. Food Costs
- Daily cost = Residents × Delivery Cost
- Example: 10 residents × ₱900 (Standard) = ₱9,000/day

#### 2. Maintenance
- Due every 5 minutes
- Cost = Sum of all room maintenance costs
- **Failure = -2 reputation per room!**

#### 3. Operating Costs (Daily)
- Base: ₱5,000/day
- Per resident: ₱250/day each
- Per room: ₱500/day each
- Example: ₱5,000 + (10 × ₱250) + (5 × ₱500) = ₱10,000/day

#### 4. Random Expenses
- 15% chance each donation cycle
- Range: ₱2,500-₱10,000
- Types: Plumbing, electrical, inspections, etc.

### Economic Dashboard

Click 📊 in the HUD to see:
- **Daily Income Estimate**: Projected donations
- **Daily Expenses**: Breakdown of all costs
- **Net Daily Cash Flow**: Income - Expenses
- **3-Day Projection**: Where you'll be financially
- **Efficiency Score**: Revenue vs. costs per resident

### Bankruptcy Warning

| Money Level | Status |
|-------------|--------|
| Below ₱10,000 | Low funds warning |
| Below ₱0 | In debt warning |
| Below -₱15,000 | Near bankruptcy |
| Below -₱25,000 | **Bankruptcy countdown starts** |

**Bankruptcy Countdown**: 18 minutes to recover above ₱0 or game over!

---

## 🎪 Fundraiser System

### How Fundraisers Work

1. Click "Start Fundraiser" in the management panel (you don't pick anyone)
2. A random group of rested (non-fatigued) residents takes part
3. Duration: 2.5 minutes
4. Outcome based on average health of the group

### Success Chance

| Avg. Health | Success Rate |
|----------------|--------------|
| 80%+ | 95% |
| 60-79% | 80% |
| 40-59% | 60% |
| 20-39% | 40% |
| Below 20% | 20% |

### Outcomes

**On Success:**
- Payout: ₱7,500-₱17,500
- +15 LIFE for each participant
- +2 reputation

**On Failure:**
- +5 LIFE for each participant (taking part is what counts)
- -5 health for participants
- -2 reputation
- No money earned

### Cooldown & Fatigue

- **Fundraiser Cooldown**: 10 minutes between events
- **Resident Fatigue**: 5 minutes after participating
  - Fatigued residents can't participate
  - -5 health during fatigue
- **Minimum Requirement**: at least 1 rested resident, enough food (3 per participant) and an open Fundraiser Station

### Fundraiser Tips

1. **Boost health first** - Use generous food before starting
2. **Wait for cooldown** - Don't rush between fundraisers
3. **Watch fatigue** - Rotate which residents participate
4. **Timing matters** - Run when reputation is high for bonus
5. **Don't rely on them** - Donations are more reliable income

---

## 🏛️ Tier Progression

### Four Shelter Tiers

| Tier | Name | Residents | Donation Bonus |
|------|------|-----------|----------------|
| 1 | Starter Shelter | 10 | 1.0x |
| 2 | Community Hub | 25 | 1.2x |
| 3 | Opportunity Center | 50 | 1.5x |
| 4 | Campus | 100 | 2.0x |

Tier upgrades don't enlarge your build area; use the Expansion tab for that.

### Upgrade Requirements

**To Tier 2 (Community Hub):**
- ₱150,000 cash
- 60% reputation
- 5 graduations
- 40% grid utilization

**To Tier 3 (Opportunity Center):**
- ₱400,000 cash
- 60% reputation
- 15 graduations
- 40% grid utilization

**To Tier 4 (Campus):**
- ₱1,000,000 cash
- 60% reputation
- 40 graduations
- 40% grid utilization

### Room Unlocks by Tier

- **Tier 1**: Dormitory, Cafeteria, Bathroom, Common Room, Clinic, Fundraiser Station
- **Tier 2**: + Admin Office
- **Tier 4**: All rooms

### Tier Strategy

1. **Fill your grid** to 40% before upgrading
2. **Graduate steadily** - don't rush capacity
3. **Save money** for upgrade + post-upgrade building
4. **Maintain reputation** at 60%+ for qualification

---

## 🚪 Arrival Events

Residents never walk in on their own. They arrive through random events you can accept or decline:

| Event | Who arrives | If you accept |
|-------|-------------|---------------|
| Elderly Home Transfer | 1 elderly | +₱12,500 stipend, +3 reputation |
| Job Center Referral | 1 adult | +1 reputation |
| Knock at the Door | 1 young adult | — |
| Family Reunification | 1 relative of a current resident | +2 reputation (declining costs 1) |
| Community Support | 2-4 residents | +3 reputation (or take a cash donation instead) |

You need a free bed (and room under your tier's resident cap) to accept. Without one, the accept option is greyed out, and arrival events show up less often.

---

## 🌊 Disaster Events

Random emergencies that bring new residents seeking shelter.

### Six Disaster Types

| Disaster | Residents | Urgency | Rep Gain | Donation |
|----------|-----------|---------|----------|----------|
| House Fire | 3 | 1 min | +8 | ₱10,000 |
| Winter Storm | 5 | 3 min | +10 | ₱17,500 |
| Factory Closure | 4 | 5 min | +5 | ₱5,000 |
| Domestic Violence | 2 | 1 min | +12 | ₱7,500 |
| Hospital Discharge | 2 | 3 min | +6 | ₱5,000 |
| Mass Eviction | 8 | 1 min | +15 | ₱25,000 |

### Response Options

- **Accept All**: Take all residents, full rewards
- **Accept Partial** (if 4+ residents): Take half, half rewards
- **Refer to a Different Institution**: Reputation penalty (varies by disaster)

### Special Considerations

- **Winter Storm**: +50% maintenance costs temporarily
- **Factory Closure**: Residents get +25% LIFE fill boost
- **Domestic Violence**: Extra ₱1,500/resident security cost
- **Hospital Discharge**: ₱2,500 medical costs

### Capacity Overflow

- Disasters can push you 50% over tier capacity
- Overcrowded residents suffer -2 health penalty
- Consider declining if already near capacity

### Natural Disasters

Earthquakes and winter storms damage a random number of your buildings (1-4, never more than you have). You pay for repairs right away: **₱7,500 per damaged building**. There is no choice to make; keep a cash buffer.

### Disaster Strategy

1. **Keep some capacity buffer** - Don't max out
2. **Check finances first** - Can you afford the extra mouths?
3. **Accept high-value disasters** - Mass Eviction has best rewards
4. **Decline when struggling** - Better than bankrupting

---

## 🌅 Day/Night Cycle

### Timing

- **Full Day**: 6 minutes real-time
- **Day Phase**: 4 minutes
- **Night Phase**: 2 minutes

### Day Phase Activities

- Donations arrive (every 90 seconds)
- Residents use all facilities
- Random events can occur
- Maintenance may be due

### Night Phase Activities

- Some rooms close (Cafeteria, Fundraiser Station, Admin Office)
- Residents sleep in Dormitories
- Energy restores
- Fewer random events

### Strategy

- **Build during day** when you can see activity
- **Review finances** during night
- **Plan next day** during the quiet period
- **Save game** at the start of a new day

---

## ⚠️ Warning System

### Warning Panel

Shows current issues requiring attention. Three severity levels:

| Level | Color | Meaning |
|-------|-------|---------|
| Info | Blue | Awareness (e.g., approaching capacity) |
| Warning | Yellow | Needs attention soon |
| Critical | Red | Immediate action required |

### Warning Types (16 Total)

**Financial Warnings:**
- Low funds (below ₱25,000)
- In debt (below ₱0)
- Near bankruptcy (below -₱15,000)
- Maintenance due soon
- Operating costs due

**Resident Warnings:**
- Unhealthy resident (prolonged low health)
- At-risk resident (about to leave)
- Overcrowded
- Hungry residents (low food)

**Operational Warnings:**
- Low reputation
- Reputation dropping rapidly
- Maintenance overdue
- Approaching capacity

**Progression Warnings:**
- Ready to upgrade
- Progress stalled
- LIFE meters stalled

### Warning Escalation

- Unresolved warnings escalate after 3 minutes
- Info → Warning → Critical
- Critical warnings reappear faster if dismissed

---

## ⭐ Reputation System

### Reputation Scale (0-100%)

| Range | Status | Donation Modifier |
|-------|--------|-------------------|
| 0-29% | Poor | 0.5x |
| 30-49% | Fair | 0.75x |
| 50-69% | Good | 1.0x |
| 70-89% | Great | 1.25x |
| 90-100% | Excellent | 1.5x |

### Reputation Gains

| Action | Change |
|--------|--------|
| Resident graduated | +5 |
| Fundraiser success | +2 |
| Generous food | +1 |
| Premium food | +2 |
| Disaster accepted | +3 to +15 |

### Reputation Losses

| Action | Change |
|--------|--------|
| Resident left unhealthy | -3 |
| Resident left hopeless | -5 |
| Small food delivery | -1 |
| No food | -5 |
| Maintenance missed | -2 |
| Overcrowding | -1 |
| Disaster rejected | -5 to -15 |

### Reputation Decay

Your reputation naturally decays over time:

| Current Rep | Decay Rate |
|-------------|------------|
| 90-100% | -3% per day |
| 70-89% | -2% per day |
| 50-69% | -1% per day |
| 30-49% | -0.5% per day |
| Below 30% | No decay |

**Decay Mitigation:**
- Each active resident: -10% decay
- Recent graduation (7 days): -20% decay
- High health (>70% avg): -30% decay
- At tier capacity: -20% decay

---

## 💡 Tips & Strategies

### Early Game (Days 1-10)

**Priority**: Survive and stabilize

✅ **Do:**
- Build essentials: Dormitory, Cafeteria, Bathroom
- Use Small or Standard food deliveries
- Accept most disasters (need the residents!)
- Place rooms with adjacency bonuses
- Accept arrival events when you have free beds

❌ **Don't:**
- Build luxury rooms yet
- Use Premium food (too expensive)
- Let money drop below ₱10,000
- Ignore health warnings
- Expand too fast

---

### Mid Game (Days 11-50)

**Priority**: Build toward Tier 2

✅ **Do:**
- Graduate residents steadily
- Run fundraisers when health is high
- Build to 40% grid utilization
- Save for Tier 2 upgrade (₱150,000)
- Run fundraisers often: they are the main source of LIFE

❌ **Don't:**
- Let reputation decay below 60%
- Accept disasters if overcapacity
- Skip maintenance payments
- Neglect resident health

---

### Late Game (Days 50+)

**Priority**: Maximize efficiency

✅ **Do:**
- Use Generous/Premium food for faster graduations
- Optimize room adjacencies
- Run fundraisers consistently
- Push for higher tiers
- Maintain 80%+ reputation

❌ **Don't:**
- Rest on success (reputation decays!)
- Ignore the economic dashboard
- Let warnings pile up
- Forget about new residents

---

### Bankruptcy Recovery

If you're heading toward bankruptcy:

1. **Immediately** switch to Minimal food
2. **Run a fundraiser** if cooldown allows
3. **Accept any disaster** for donation bonus
4. **Pause the game** to plan recovery
5. **Sell non-essential rooms** if option available
6. **Wait for donations** (90 seconds between)

---

## ⌨️ Keyboard Shortcuts

### Essential Controls
| Key | Action |
|-----|--------|
| **Space** | Pause/Resume game |
| **Esc** | Close current modal |
| **B** | Toggle resident status bars |
| **D** | Toggle dev mode (testing) |

### Speed Controls
| Key | Action |
|-----|--------|
| **1** | Normal speed (1x) |
| **2** | Fast speed (2x) |
| **3** | Very fast speed (3x) |
| **0** | Pause |

### Navigation
| Key | Action |
|-----|--------|
| **Arrow Keys** | Pan camera |
| **Home** | Center camera |

---

## ❓ FAQ

### Gameplay Questions

**Q: Why are my residents leaving?**
A: Health has been below 20% for too long. Watch for the 😰 emoji and red pulsing status bars. Improve food quality, build social rooms, and ensure needs are met.

**Q: How do I increase LIFE meter faster?**
A: Run fundraisers: every participant gains LIFE (+15 on success, +5 on failure). Keep residents rested and healthy so more of them can take part, and use higher food deliveries for a faster passive fill.

**Q: Why did my fundraiser fail?**
A: Success rate is based on average health. If average health was below 60%, there's a significant chance of failure. Boost health before starting!

**Q: What happens when I go bankrupt?**
A: Money below -₱25,000 starts an 18-minute countdown. Get above ₱0 to cancel. If time runs out, game over.

**Q: How do I unlock more room types?**
A: Upgrade your shelter tier. Tier 2 unlocks the Admin Office.

**Q: Should I accept every disaster?**
A: Not necessarily. Consider your capacity, finances, and current stability. It's okay to decline if you're struggling.

**Q: Why is my reputation dropping?**
A: Reputation decays naturally over time. Higher reputation = faster decay. Mitigate with graduations, high health, and active residents.

---

### Technical Questions

**Q: How do I save my game?**
A: Click Pause (⏸️) and select "Save Game". Auto-saves also occur periodically.

**Q: The game feels too fast. Can I slow it down?**
A: Yes! Use speed controls (1, 2, 3 keys) or pause to plan.

**Q: What do the colored bars above residents mean?**
A: Blue = LIFE progress, Colored = Health. Press B to toggle visibility.

**Q: Can I undo building a room?**
A: There's no undo, but you can demolish rooms through the management panel.

---

## 🏆 Achievements & Milestones

Track your progress with these goals:

### Beginner
- [ ] Survive 10 days
- [ ] Graduate your first resident
- [ ] Build all Tier 1 room types
- [ ] Complete a successful fundraiser

### Intermediate
- [ ] Reach Tier 2 (Community Hub)
- [ ] Graduate 10 residents
- [ ] Reach 70% reputation
- [ ] Survive a Mass Eviction disaster

### Advanced
- [ ] Reach Tier 3 (Opportunity Center)
- [ ] Graduate 30 residents
- [ ] Maintain 85%+ reputation for 5 days
- [ ] Recover from bankruptcy countdown

### Master
- [ ] Reach Tier 4 (Campus)
- [ ] Graduate 100 residents
- [ ] Maintain 95%+ reputation for 10 days
- [ ] Never let a resident leave unhealthy

---

## 📞 Need More Help?

- **In-Game Tutorial**: Click the Tutorial button for guided help
- **Developer Guide**: See DEVELOPER_GUIDE.md for technical details
- **Community**: Join discussions on GitHub
- **Issues**: Report bugs on the GitHub Issues page

---

**Good luck, and thank you for making a difference! 🏠❤️**
