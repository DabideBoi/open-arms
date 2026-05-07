# 📝 Changelog

All notable changes to the Open Arms project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.9.0] - 2026-05-07

### 🎉 Production Release Candidate

Major update transforming Open Arms into a proper tycoon game with strategic depth, economic challenges, and faster-paced gameplay.

### ✨ New Features

#### Tier Progression System
- **4 Shelter Tiers**: Starter Shelter → Community Hub → Opportunity Center → Campus
- **Progressive Unlocks**: New rooms unlock at higher tiers
- **Capacity Scaling**: 10 → 25 → 50 → 100 maximum residents
- **Donation Multipliers**: 1.0x → 1.2x → 1.5x → 2.0x based on tier
- **Upgrade Requirements**: Money, reputation, graduations, and grid utilization
- **Grid Expansion**: 10×10 → 15×15 → 20×20 → 25×25

#### Adjacency Bonus System
- **13 Adjacency Rules**: Bonuses and penalties for room placement
- **Positive Synergies**:
  - Bathroom + Dormitory: +5 happiness, -10% maintenance
  - Learning Center + Vocational Room: +15% LIFE fill rate
  - Admin Office + Learning Center: +10% LIFE fill rate
  - And 5 more positive combinations
- **Negative Synergies**:
  - Cafeteria + Dormitory: -5 happiness, +10% maintenance
  - Bathroom + Cafeteria: -8 happiness, +15% maintenance
  - And 3 more penalty combinations
- **Placement Preview**: See bonuses before placing rooms

#### Disaster Event System
- **6 Disaster Types**: House Fire, Winter Storm, Factory Closure, Domestic Violence, Hospital Discharge, Mass Eviction
- **Accept/Decline Choices**: Balance rewards vs. capacity
- **Partial Accept**: Take half the residents for 4+ person surges
- **Special Effects**: Some disasters have unique modifiers (maintenance surge, LIFE boost, security costs)
- **Capacity Overflow**: Can exceed tier cap by 50% during emergencies

#### Warning System
- **16 Warning Types**: Financial, resident, operational, and progression warnings
- **3 Severity Levels**: Info (blue), Warning (yellow), Critical (red)
- **Escalation**: Unresolved warnings escalate after 3 minutes
- **Warning Panel**: Dedicated UI showing all active warnings
- **Actionable Alerts**: Click warnings to take action

#### Economic Dashboard
- **Income Breakdown**: Donation estimates, tier multipliers, fundraiser projections
- **Expense Breakdown**: Food, maintenance, operating costs, random events
- **Financial Projections**: 3-day forecast, bankruptcy countdown
- **Efficiency Metrics**: Cost per resident, revenue per resident, efficiency score
- **Health Status**: Visual indicator (Healthy/Stable/Warning/Critical)

#### Food Portion Tiers
- **5 Portion Levels**: Minimal, Small, Standard, Generous, Premium
- **LIFE Fill Modifiers**: 0.5x → 0.8x → 1.0x → 1.2x → 1.5x
- **Happiness Effects**: -10 → -5 → 0 → +10 → +20
- **Reputation Effects**: -3 → -1 → 0 → +2 → +5
- **Strategic Choice**: Balance cost vs. progression speed

#### Resident Departure System
- **Unhappy Threshold**: Happiness below 20% triggers at-risk status
- **Warning Period**: 12 minutes (1 game day) of grace
- **Departure Timer**: 24 minutes (2 game days) before leaving
- **Reputation Penalties**: -3 (unhappy) to -5 (hopeless)
- **Visual Indicators**: 😰 emoji and pulsing red bars

#### Reputation Decay System
- **Tier-Based Decay**: Higher reputation decays faster (3%/day at 90-100%)
- **Decay Floor**: Cannot decay below 30%
- **Mitigation Factors**: Active residents, recent graduations, high happiness, full capacity

#### Visual Enhancements
- **Resident Status Bars**: Toggle with B key
  - LIFE bar (blue, gold when near graduation)
  - Happiness bar (green/yellow/orange/red)
- **Money Animations**: Floating +/- text on income/expenses
- **Status Emojis**: 😊 😐 😟 😰 💤 🍽️ 📚 🚶 🏃

#### Bankruptcy System
- **Threshold**: Money below -$500 triggers countdown
- **Countdown**: 18 minutes (3 game days) to recover
- **Warning Levels**: Low funds ($200), Debt ($0), Near bankruptcy (-$300)
- **Recovery**: Must reach $0+ to cancel countdown

### ⚖️ Balance Changes

#### Game Pace (Faster)
| Parameter | Old | New |
|-----------|-----|-----|
| Day Cycle | 12 min | 6 min |
| Donation Interval | 5 min | 90 sec |
| Maintenance Interval | 15 min | 5 min |
| Event Interval | 30-60 min | 1-3 min |

#### Economy (Tighter)
| Parameter | Old | New |
|-----------|-----|-----|
| Starting Money | $5,000 | $2,000 |
| Starting Reputation | 50% | 40% |
| Starting Grid | 20×20 | 10×10 |
| Base Donation | $50/resident | $25/resident |

#### Room Costs (Adjusted)
| Room | Old | New |
|------|-----|-----|
| Dormitory | $500 | $300 |
| Cafeteria | $800 | $500 |
| Bathroom | $300 | $200 |
| Common Room | $600 | $350 |
| Learning Center | $1000 | $450 |

#### Food Costs (Increased)
| Tier | Old | New |
|------|-----|-----|
| Standard | ~$10 | $18 |
| Generous | - | $30 |
| Premium | - | $50 |

#### Fundraiser Changes
| Parameter | Old | New |
|-----------|-----|-----|
| Payout Range | $200-500 | $150-350 |
| Duration | 30 min | 15 min |
| Cooldown | None | 10 min |
| Success Chance | Fixed | 20-95% based on happiness |
| Resident Fatigue | None | 5 min after participating |

#### Operating Costs (New)
- Base: $100/day
- Per Resident: $5/day
- Per Room: $10/day
- Random Events: 15% chance, $50-200

### 🔧 Technical Changes

#### New Systems
- `TierSystem.ts` - Tier progression management
- `AdjacencySystem.ts` - Room bonus calculations
- `WarningSystem.ts` - Warning generation and management

#### New Components
- `EconomicDashboard.tsx` - Financial projections UI
- `WarningPanel.tsx` - Warning display panel
- `DisasterModal.tsx` - Disaster event handling
- `MoneyAnimations.tsx` - Floating money text

#### State Additions
- `currentTier: ShelterTier`
- `tierUnlockProgress: TierUnlockProgress`
- `activeWarnings: Warning[]`
- `warningCooldowns: WarningCooldown[]`
- `foodPortionSetting: FoodPortionTier`
- `lastGraduationTime: number`
- `activeDisaster: DisasterEvent | null`

#### Constants Expansion
- `SHELTER_TIERS` - Tier configuration
- `ADJACENCY_BONUSES` - 13 adjacency rules
- `FOOD_PORTIONS` - 5 food tier definitions
- `DISASTER_EVENTS` - 6 disaster types
- `DISASTER_CONFIG` - Disaster system settings
- `REPUTATION_DECAY` - Decay configuration
- `BANKRUPTCY_CONFIG` - Bankruptcy thresholds
- `DEPARTURE_CONFIG` - Resident departure settings
- `OPERATING_COSTS_CONFIG` - Daily operating costs
- `EXPENSE_EVENTS_CONFIG` - Random expense events
- `WARNING_CONFIG` - Warning system settings
- `STATUS_BAR_CONFIG` - Status bar visuals

### 📚 Documentation Updates
- Complete rewrite of IMPLEMENTATION.md
- Updated PLAYER_GUIDE.md with all new mechanics
- Updated README.md with current features
- Updated DEVELOPER_GUIDE.md with new systems
- Created PHASE8_COMPLETE.md

### 🐛 Bug Fixes
- Fixed resident pathfinding at room boundaries
- Fixed donation calculation with tier multiplier
- Fixed maintenance timing after game load
- Fixed reputation changes not persisting
- Fixed food consumption calculation

---

## [1.0.0] - 2026-05-07

### 🎉 Initial Release

The first public release of Open Arms - Shelter Management Game!

### ✨ Features

#### Core Gameplay
- **Grid-Based Building System**
  - 20×20 tile grid for shelter construction
  - 5 room types: Dormitory, Cafeteria, Bathroom, Common Room, Learning Center
  - Visual room placement with validation
  - Room capacity and condition tracking

- **Resident Management System**
  - Dynamic resident spawning based on capacity
  - 5 personality types with unique behaviors
  - 5 core needs: Hunger, Sleep, Hygiene, Happiness, Health
  - Individual resident tracking and progression

- **LIFE Meter Progression**
  - 4-stage progression system: Survival → Stability → Growth → Independence
  - Graduation system when residents reach 100%
  - Reputation and financial bonuses for graduations

- **AI & Pathfinding**
  - A* pathfinding algorithm for resident movement
  - Need-based autonomous behavior
  - Activity scheduling based on time of day
  - Social interactions between residents

#### Time & Economy
- **Day/Night Cycle**
  - 4 phases per day: Morning, Afternoon, Evening, Night
  - 30-second phase duration (real-time)
  - Phase-specific resident activities
  - Time control: Pause, 1x, 2x, 3x speed

- **Economic Systems**
  - Daily donation system with reputation multiplier
  - Food management and purchasing
  - Facility maintenance and repair costs
  - Fundraiser events (Bake Sale, Charity Dinner, Gala)

- **Reputation System**
  - 0-100 reputation scale
  - Affects donation income (0.5x to 2.0x multiplier)
  - Influenced by resident satisfaction and facility condition
  - Impacts event frequency and outcomes

#### Events & Challenges
- **Random Event System**
  - Positive events (donations, volunteers, food drives)
  - Negative events (breakdowns, shortages, crises)
  - Choice-based events with multiple outcomes
  - Dynamic event frequency based on reputation

#### User Interface
- **HUD (Heads-Up Display)**
  - Real-time stats: Money, Reputation, Residents, Day, Phase, Food
  - Quick access buttons: Build, Management, Settings, Pause
  - Clean, intuitive design

- **Build Menu**
  - Visual room selection
  - Cost and capacity information
  - Room descriptions and requirements

- **Management Panel**
  - Detailed resident information
  - Facility status and maintenance needs
  - Statistics and analytics
  - Tabbed interface for organization

- **Tutorial System**
  - Step-by-step onboarding
  - Interactive guidance
  - Contextual help
  - Skippable for experienced players

- **Settings & Controls**
  - Audio controls (music and SFX volume)
  - Game speed adjustment
  - Performance monitoring toggle
  - Accessibility options

#### Persistence & Quality of Life
- **Save/Load System**
  - Manual save via pause menu
  - Auto-save every 5 minutes
  - Browser localStorage persistence
  - Full game state preservation

- **Notifications**
  - Toast notifications for important events
  - Warning system for low resources
  - Success messages for achievements
  - Error handling with user-friendly messages

- **Performance Optimization**
  - Object pooling for efficiency
  - Spatial partitioning for fast lookups
  - Path caching for pathfinding
  - Performance monitor for debugging

### 🎨 Design & Polish
- Responsive design for desktop and mobile
- Accessible color palette
- Smooth animations and transitions
- Intuitive camera controls (pan and zoom)
- Professional UI styling

### 📚 Documentation
- Comprehensive README with quick start guide
- Detailed Player Guide with strategies and tips
- Technical Developer Guide for contributors
- Launch Checklist for deployment
- Credits and attributions

### 🚀 Deployment
- Optimized production build configuration
- Vercel deployment setup with caching
- SEO meta tags and Open Graph support
- Source maps for debugging
- Code splitting for faster loading

---

## [Unreleased]

### 🔮 Planned Features

#### Short-term (v1.1.0)
- Achievement system
- Statistics dashboard
- Additional room types (Medical Center, Counseling)
- Seasonal events
- More resident personality types

#### Medium-term (v1.2.0)
- Campaign mode with objectives
- Challenge scenarios
- Custom shelter naming
- Photo mode
- Resident stories/backgrounds

#### Long-term (v2.0.0)
- Multiplayer/leaderboards
- Mobile app version
- Mod support
- Community challenges

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 0.9.0 | 2026-05-07 | Production release candidate with tycoon features |
| 1.0.0 | 2026-05-07 | Initial public release |

---

## Links

- **Repository**: [github.com/DabideBoi/open-arms](https://github.com/DabideBoi/open-arms)
- **Issues**: [GitHub Issues](https://github.com/DabideBoi/open-arms/issues)
- **Releases**: [GitHub Releases](https://github.com/DabideBoi/open-arms/releases)

---

## Contributing

See [DEVELOPER_GUIDE.md](DEVELOPER_GUIDE.md) for information on contributing to the project.
