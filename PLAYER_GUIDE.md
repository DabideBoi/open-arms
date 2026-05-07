# 📖 Open Arms - Player Guide

Welcome to Open Arms! This comprehensive guide will help you master the art of shelter management and make a meaningful difference in your residents' lives.

## 🎯 Table of Contents

1. [Getting Started](#getting-started)
2. [Game Basics](#game-basics)
3. [Room Types & Facilities](#room-types--facilities)
4. [Room Placement Strategy](#room-placement-strategy)
5. [Resident System](#resident-system)
6. [LIFE Meter Progression](#life-meter-progression)
7. [Food System & Portions](#food-system--portions)
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
- **$2,000** starting budget
- **40% reputation**
- **3 initial residents**
- **10×10 tile grid** for building (Tier 1)
- **Basic room access** (Dormitory, Cafeteria, Bathroom, Common Room)

### Initial Setup Strategy

1. **Build Essential Facilities First**
   - Place 1 Dormitory ($300) for sleeping
   - Add 1 Cafeteria ($500) for meals
   - Include 1 Bathroom ($200) for hygiene
   - Place them adjacent for bonuses!

2. **Monitor Your Resources**
   - Watch your money carefully (game is faster-paced now)
   - Keep an eye on resident happiness
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
**Size**: 3×3 tiles | **Cost**: $300 | **Capacity**: 4 residents | **Maintenance**: $25/cycle

**Purpose**: Sleeping quarters where residents rest.

**Good Adjacent To**: Bathroom (+5 happiness), Common Room (+3 happiness)  
**Bad Adjacent To**: Cafeteria (-5 happiness), Fundraiser Station (-3 happiness)

---

### Cafeteria
**Size**: 5×3 tiles | **Cost**: $500 | **Capacity**: 10 residents | **Maintenance**: $50/cycle

**Purpose**: Dining area where residents eat meals. Also generates food over time.

**Good Adjacent To**: Common Room (+5 happiness)  
**Bad Adjacent To**: Dormitory (-5 happiness), Bathroom (-8 happiness)

---

### Bathroom
**Size**: 2×2 tiles | **Cost**: $200 | **Capacity**: N/A | **Maintenance**: $20/cycle

**Purpose**: Hygiene facilities for residents.

**Good Adjacent To**: Dormitory (+5 happiness, -10% maintenance)  
**Bad Adjacent To**: Cafeteria (-8 happiness), Learning Center (-5% LIFE fill)

---

### Common Room
**Size**: 3×3 tiles | **Cost**: $350 | **Capacity**: N/A | **Maintenance**: $30/cycle

**Purpose**: Social and recreational space for relaxation.

**Good Adjacent To**: Dormitory (+3 happiness, +5% LIFE), Cafeteria (+5 happiness), Fundraiser Station (+2 happiness)

---

### Learning Center (Unlocks at Tier 2)
**Size**: 4×3 tiles | **Cost**: $450 | **Capacity**: 6 residents | **Maintenance**: $40/cycle

**Purpose**: Education and skill development facility. Accelerates LIFE meter!

**Good Adjacent To**: Admin Office (+10% LIFE fill), Vocational Room (+15% LIFE fill)  
**Bad Adjacent To**: Bathroom (-2 happiness, -5% LIFE fill)

---

### Vocational Room (Unlocks at Tier 3)
**Size**: 4×3 tiles | **Cost**: $550 | **Capacity**: 6 residents | **Maintenance**: $45/cycle

**Purpose**: Job training and career preparation.

**Good Adjacent To**: Learning Center (+15% LIFE fill), Admin Office (+8% LIFE fill)  
**Bad Adjacent To**: Bathroom (-2 happiness, -5% LIFE fill)

---

### Admin Office (Unlocks at Tier 2)
**Size**: 2×2 tiles | **Cost**: $700 | **Capacity**: N/A | **Maintenance**: $60/cycle

**Purpose**: Management and coordination. Boosts efficiency of adjacent rooms.

**Good Adjacent To**: Learning Center (+10% LIFE), Vocational Room (+8% LIFE), Fundraiser Station (-10% maintenance)

---

### Fundraiser Station (Unlocks at Tier 1)
**Size**: 3×2 tiles | **Cost**: $400 | **Capacity**: 4 residents | **Maintenance**: $35/cycle

**Purpose**: Location for running fundraiser events.

**Good Adjacent To**: Common Room (+2 happiness), Admin Office (-10% maintenance)  
**Bad Adjacent To**: Dormitory (-3 happiness)

---

## 📐 Room Placement Strategy

### Adjacency Bonus System

Rooms that share an edge (not diagonal) can give each other bonuses or penalties. Plan your layout carefully!

### Optimal Layout Tips

1. **Create a "Quiet Zone"**
   - Group Dormitories together
   - Place Bathrooms adjacent to Dormitories
   - Keep Cafeteria and Fundraiser Station away

2. **Create an "Education Zone"**
   - Place Learning Center next to Vocational Room (+15% LIFE!)
   - Add Admin Office for extra efficiency
   - Keep Bathrooms far away

3. **Create a "Social Zone"**
   - Common Room adjacent to Cafeteria (+5 happiness)
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

#### 🧑 Young Adult (40% spawn rate)
- **LIFE Fill**: 20 points/hour (fastest)
- **Need Decay**: 12 points/day (moderate)
- **Fundraiser Efficiency**: 1.2x
- **Best For**: Quick graduations

#### 🎖️ Veteran (40% spawn rate)
- **LIFE Fill**: 12 points/hour (moderate)
- **Need Decay**: 7 points/day (slowest)
- **Graduation Bonus**: +2 reputation
- **Best For**: Steady progression, reputation building

#### 👴 Elderly (20% spawn rate)
- **LIFE Fill**: 8 points/hour (slowest)
- **Need Decay**: 20 points/day (fastest)
- **Special**: Requires more care
- **Best For**: When you have resources to spare

### Resident Needs

Residents have 5 core needs (0-100 scale):

1. **🛏️ Sleep** - Restored in Dormitories at night
2. **🍽️ Hunger** - Satisfied in Cafeteria
3. **🚿 Hygiene** - Improved in Bathrooms
4. **😊 Happiness** - Affected by all factors
5. **🏥 Health** - Deteriorates if needs unmet

### Resident Status Bars

Press **B** to toggle status bars above residents:

- **Blue Bar**: LIFE meter progress
  - Turns gold when near graduation (90%+)
  - Turns grey if stalled
- **Color Bar**: Happiness level
  - 🟢 Green (70-100%) - Happy
  - 🟡 Yellow (40-69%) - Neutral
  - 🟠 Orange (20-39%) - Unhappy
  - 🔴 Red (0-19%) - At risk (pulses!)

### Departure Warning

If happiness stays below 20% for too long:
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
- Focus: Skill development
- Duration: ~20-40 game days
- Priority: Learning Centers, Vocational Rooms

#### 4. 🔵 Independence (75-100%)
- Focus: Preparing to graduate
- Duration: ~10-20 game days
- Priority: Final support, job preparation

### Boosting LIFE Progression

| Factor | Effect |
|--------|--------|
| Learning Center | +0.5% per visit |
| Vocational Room | +0.5% per visit |
| Food: Premium | +50% fill rate |
| Food: Generous | +20% fill rate |
| Adjacent bonuses | Up to +15% fill rate |
| High happiness | Faster progression |

### Graduation

When LIFE reaches 100%:
- Resident "graduates" and leaves
- You receive +5 reputation (+7 for Veterans)
- Potential $500 bonus donation
- Progress toward next tier unlock

---

## 🍽️ Food System & Portions

### Five Food Tiers

| Tier | Cost/Resident | Happiness | Reputation | LIFE Fill |
|------|---------------|-----------|------------|-----------|
| **Minimal** | $5 | -10 | -3 | 0.5x |
| **Small** | $10 | -5 | -1 | 0.8x |
| **Standard** | $18 | 0 | 0 | 1.0x |
| **Generous** | $30 | +10 | +2 | 1.2x |
| **Premium** | $50 | +20 | +5 | 1.5x |

### Food Strategy

**Early Game (Tight Budget)**
- Use **Small** portions to save money
- Accept the happiness penalty temporarily
- Switch to Standard when stable

**Mid Game (Stable)**
- Use **Standard** as baseline
- Switch to **Generous** before fundraisers (boosts happiness)
- Use **Minimal** only in emergencies

**Late Game (Prosperous)**
- **Generous** or **Premium** accelerates graduations
- Higher reputation = better donations
- ROI is positive at higher tiers

### Food Generation

- Cafeterias generate 1 food every 15 seconds
- More cafeterias = more passive food income
- Food is consumed daily based on portion setting

---

## 💰 Economic Management

### Income Sources

#### 1. Automatic Donations
- **Frequency**: Every 90 seconds
- **Base Amount**: $25 per resident
- **Reputation Multiplier**: Affects donation chance
- **Tier Multiplier**: 1.0x → 2.0x based on tier

#### 2. Fundraisers
- Manual events with success/failure mechanics
- See [Fundraiser System](#fundraiser-system)

#### 3. Graduation Bonuses
- $500 potential bonus per graduation
- Veterans provide +$200 extra

### Expenses

#### 1. Food Costs
- Daily cost = Residents × Portion Cost
- Example: 10 residents × $18 (Standard) = $180/day

#### 2. Maintenance
- Due every 5 minutes
- Cost = Sum of all room maintenance costs
- **Failure = -2 reputation per room!**

#### 3. Operating Costs (Daily)
- Base: $100/day
- Per resident: $5/day each
- Per room: $10/day each
- Example: $100 + (10 × $5) + (5 × $10) = $200/day

#### 4. Random Expenses
- 15% chance each donation cycle
- Range: $50-$200
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
| Below $200 | Low funds warning |
| Below $0 | In debt warning |
| Below -$300 | Near bankruptcy |
| Below -$500 | **Bankruptcy countdown starts** |

**Bankruptcy Countdown**: 18 minutes to recover above $0 or game over!

---

## 🎪 Fundraiser System

### How Fundraisers Work

1. Click "Start Fundraiser" in management panel
2. Non-fatigued residents participate
3. Duration: 15 minutes
4. Outcome based on average happiness

### Success Chance

| Avg. Happiness | Success Rate |
|----------------|--------------|
| 80%+ | 95% |
| 60-79% | 80% |
| 40-59% | 60% |
| 20-39% | 40% |
| Below 20% | 20% |

### Outcomes

**On Success:**
- Payout: $150-$350
- +5 LIFE meter for participants
- +2 reputation

**On Failure:**
- -5 happiness for participants
- -2 reputation
- No money earned

### Cooldown & Fatigue

- **Fundraiser Cooldown**: 10 minutes between events
- **Resident Fatigue**: 5 minutes after participating
  - Fatigued residents can't participate
  - -5 happiness during fatigue
- **Minimum Requirement**: 3 non-fatigued residents to start

### Fundraiser Tips

1. **Boost happiness first** - Use generous food before starting
2. **Wait for cooldown** - Don't rush between fundraisers
3. **Watch fatigue** - Rotate which residents participate
4. **Timing matters** - Run when reputation is high for bonus
5. **Don't rely on them** - Donations are more reliable income

---

## 🏛️ Tier Progression

### Four Shelter Tiers

| Tier | Name | Residents | Grid | Donation Bonus |
|------|------|-----------|------|----------------|
| 1 | Starter Shelter | 10 | 10×10 | 1.0x |
| 2 | Community Hub | 25 | 15×15 | 1.2x |
| 3 | Opportunity Center | 50 | 20×20 | 1.5x |
| 4 | Campus | 100 | 25×25 | 2.0x |

### Upgrade Requirements

**To Tier 2 (Community Hub):**
- $3,000 cash
- 60% reputation
- 5 graduations
- 70% grid utilization

**To Tier 3 (Opportunity Center):**
- $8,000 cash
- 60% reputation
- 15 graduations
- 70% grid utilization

**To Tier 4 (Campus):**
- $20,000 cash
- 60% reputation
- 40 graduations
- 70% grid utilization

### Room Unlocks by Tier

- **Tier 1**: Dormitory, Cafeteria, Bathroom, Common Room, Fundraiser Station
- **Tier 2**: + Learning Center, Admin Office
- **Tier 3**: + Vocational Room
- **Tier 4**: All rooms

### Tier Strategy

1. **Fill your grid** to 70% before upgrading
2. **Graduate steadily** - don't rush capacity
3. **Save money** for upgrade + post-upgrade building
4. **Maintain reputation** at 60%+ for qualification

---

## 🌊 Disaster Events

Random emergencies that bring new residents seeking shelter.

### Six Disaster Types

| Disaster | Residents | Urgency | Rep Gain | Donation |
|----------|-----------|---------|----------|----------|
| House Fire | 3 | 1 min | +8 | $200 |
| Winter Storm | 5 | 3 min | +10 | $350 |
| Factory Closure | 4 | 5 min | +5 | $100 |
| Domestic Violence | 2 | 1 min | +12 | $150 |
| Hospital Discharge | 2 | 3 min | +6 | $100 |
| Mass Eviction | 8 | 1 min | +15 | $500 |

### Response Options

- **Accept All**: Take all residents, full rewards
- **Accept Partial** (if 4+ residents): Take half, half rewards
- **Decline**: Reputation penalty (varies by disaster)

### Special Considerations

- **Winter Storm**: +50% maintenance costs temporarily
- **Factory Closure**: Residents get +25% LIFE fill boost
- **Domestic Violence**: Extra $30/resident security cost
- **Hospital Discharge**: $50 medical costs

### Capacity Overflow

- Disasters can push you 50% over tier capacity
- Overcrowded residents suffer -2 happiness penalty
- Consider declining if already near capacity

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

- Some rooms close (Learning Center, Vocational Room)
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
- Low funds (below $500)
- In debt (below $0)
- Near bankruptcy (below -$300)
- Maintenance due soon
- Operating costs due

**Resident Warnings:**
- Unhappy resident (prolonged low happiness)
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
| Veteran graduated | +7 |
| Fundraiser success | +2 |
| Generous food | +1 |
| Premium food | +2 |
| Disaster accepted | +3 to +15 |

### Reputation Losses

| Action | Change |
|--------|--------|
| Resident left unhappy | -3 |
| Resident left hopeless | -5 |
| Small food portion | -1 |
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
- High happiness (>70% avg): -30% decay
- At tier capacity: -20% decay

---

## 💡 Tips & Strategies

### Early Game (Days 1-10)

**Priority**: Survive and stabilize

✅ **Do:**
- Build essentials: Dormitory, Cafeteria, Bathroom
- Use Small or Standard food portions
- Accept most disasters (need the residents!)
- Place rooms with adjacency bonuses
- Maintain 40%+ reputation for spawns

❌ **Don't:**
- Build luxury rooms yet
- Use Premium food (too expensive)
- Let money drop below $200
- Ignore happiness warnings
- Expand too fast

---

### Mid Game (Days 11-50)

**Priority**: Build toward Tier 2

✅ **Do:**
- Graduate residents steadily
- Run fundraisers when happiness is high
- Build to 70% grid utilization
- Save for Tier 2 upgrade ($3,000)
- Unlock Learning Center for faster LIFE fill

❌ **Don't:**
- Let reputation decay below 60%
- Accept disasters if overcapacity
- Skip maintenance payments
- Neglect resident happiness

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
A: Happiness has been below 20% for too long. Watch for the 😰 emoji and red pulsing status bars. Improve food quality, build social rooms, and ensure needs are met.

**Q: How do I increase LIFE meter faster?**
A: Build Learning Centers and Vocational Rooms (Tier 2+), use higher food portions, optimize room adjacencies, and keep happiness high.

**Q: Why did my fundraiser fail?**
A: Success rate is based on average happiness. If average happiness was below 60%, there's a significant chance of failure. Boost happiness before starting!

**Q: What happens when I go bankrupt?**
A: Money below -$500 starts an 18-minute countdown. Get above $0 to cancel. If time runs out, game over.

**Q: How do I unlock more room types?**
A: Upgrade your shelter tier. Tier 2 unlocks Learning Center and Admin Office. Tier 3 unlocks Vocational Room.

**Q: Should I accept every disaster?**
A: Not necessarily. Consider your capacity, finances, and current stability. It's okay to decline if you're struggling.

**Q: Why is my reputation dropping?**
A: Reputation decays naturally over time. Higher reputation = faster decay. Mitigate with graduations, high happiness, and active residents.

---

### Technical Questions

**Q: How do I save my game?**
A: Click Pause (⏸️) and select "Save Game". Auto-saves also occur periodically.

**Q: The game feels too fast. Can I slow it down?**
A: Yes! Use speed controls (1, 2, 3 keys) or pause to plan.

**Q: What do the colored bars above residents mean?**
A: Blue = LIFE progress, Colored = Happiness. Press B to toggle visibility.

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
- [ ] Never let a resident leave unhappy

---

## 📞 Need More Help?

- **In-Game Tutorial**: Click the Tutorial button for guided help
- **Developer Guide**: See DEVELOPER_GUIDE.md for technical details
- **Community**: Join discussions on GitHub
- **Issues**: Report bugs on the GitHub Issues page

---

**Good luck, and thank you for making a difference! 🏠❤️**
