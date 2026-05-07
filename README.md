# 🏠 Open Arms - Shelter Management Game

A challenging shelter management tycoon game where you build and manage a homeless shelter, helping residents rebuild their lives while balancing finances, reputation, and community needs.

![Version](https://img.shields.io/badge/version-0.9.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Status](https://img.shields.io/badge/status-production--ready-green.svg)

## 🎮 About the Game

**Open Arms** is a web-based tycoon simulation that puts you in charge of managing a homeless shelter. Your mission is to provide safe housing, nutritious meals, and supportive services while helping residents progress through their journey toward independence—all while keeping your shelter financially sustainable.

### ⚡ Fast-Paced Tycoon Gameplay

- **6-minute day cycles** keep the action moving
- **Donations every 90 seconds** require active management
- **Strategic decisions** with real consequences
- **Bankruptcy risk** if you mismanage finances

### 🎯 Key Features

#### Core Systems
- 🏗️ **Grid-Based Building** - Design your shelter with 8 room types across a 10×10 to 25×25 expandable grid
- 👥 **Dynamic Residents** - Three profiles (Young Adult, Veteran, Elderly) with unique needs and progression rates
- 📈 **LIFE Meter Progression** - Guide residents through 4 stages: Survival → Stability → Growth → Independence
- 🎓 **Graduation System** - Help residents achieve independence for reputation and financial rewards

#### Economic Systems
- 💰 **Multi-Source Income** - Donations, fundraisers, graduation bonuses
- 🍽️ **5-Tier Food Portions** - Balance cost vs. happiness vs. LIFE progression
- 🔧 **Maintenance Cycles** - Keep facilities running or face reputation penalties
- 📊 **Economic Dashboard** - Real-time financial projections and alerts
- ⚠️ **Bankruptcy Mechanics** - Fall below -$500 and face game over countdown

#### Strategic Depth
- 📐 **13 Adjacency Rules** - Room placement bonuses and penalties
- 🏛️ **4 Shelter Tiers** - Unlock new rooms, capacity, and donation multipliers
- 🌊 **6 Disaster Events** - Accept emergency residents for rewards or decline to stay stable
- 🎪 **Fundraiser Risk/Reward** - Success based on resident happiness
- 📉 **Reputation Decay** - Active management required to maintain standing

#### Visual & UI
- 🌅 **Day/Night Cycle** - Dynamic lighting and activity changes
- 📊 **Resident Status Bars** - Real-time LIFE and happiness indicators
- 💵 **Money Animations** - Floating gains/losses for feedback
- ⚠️ **16-Type Warning System** - Prioritized alerts for issues
- 🎨 **Clean, Responsive UI** - Works on desktop and mobile

## 🚀 Quick Start

### Play Online
Visit: [Coming Soon - Vercel Deployment]

### Run Locally

```bash
# Clone the repository
git clone https://github.com/DabideBoi/open-arms.git
cd open-arms

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Build for Production

```bash
npm run build
npm run preview  # Test production build locally
```

## 🎯 How to Play

### Getting Started

1. **Build Essential Facilities**
   - Dormitory ($300) - Sleeping quarters
   - Cafeteria ($500) - Food service
   - Bathroom ($200) - Hygiene facilities
   
2. **Manage Your Economy**
   - Starting budget: $2,000
   - Donations arrive every 90 seconds
   - Maintenance due every 5 minutes
   - Daily operating costs accumulate

3. **Care for Residents**
   - Meet their needs (sleep, food, hygiene)
   - Keep happiness above 20% to prevent departures
   - Help them progress through LIFE stages

4. **Grow Your Shelter**
   - Graduate residents for reputation
   - Upgrade through 4 tiers
   - Unlock new room types
   - Expand your grid capacity

### Controls

| Key | Action |
|-----|--------|
| **Space** | Pause/Resume |
| **B** | Toggle status bars |
| **1/2/3** | Speed controls |
| **D** | Dev mode (testing) |
| **Mouse Drag** | Pan camera |

### Room Types (8 Total)

| Room | Size | Cost | Unlocks At |
|------|------|------|------------|
| Dormitory | 3×3 | $300 | Tier 1 |
| Cafeteria | 5×3 | $500 | Tier 1 |
| Bathroom | 2×2 | $200 | Tier 1 |
| Common Room | 3×3 | $350 | Tier 1 |
| Fundraiser Station | 3×2 | $400 | Tier 1 |
| Learning Center | 4×3 | $450 | Tier 2 |
| Admin Office | 2×2 | $700 | Tier 2 |
| Vocational Room | 4×3 | $550 | Tier 3 |

### Shelter Tiers

| Tier | Name | Capacity | Grid | Donation Bonus |
|------|------|----------|------|----------------|
| 1 | Starter Shelter | 10 | 10×10 | 1.0x |
| 2 | Community Hub | 25 | 15×15 | 1.2x |
| 3 | Opportunity Center | 50 | 20×20 | 1.5x |
| 4 | Campus | 100 | 25×25 | 2.0x |

### Tips for Success

- 🏗️ **Place rooms strategically** - Adjacency bonuses can boost LIFE progression by 15%!
- 💰 **Maintain a buffer** - Keep $200+ to handle emergencies
- 🍽️ **Balance food costs** - Standard is break-even; Generous accelerates progress
- 🎪 **Time fundraisers** - Run them when happiness is high (80%+) for 95% success
- 📊 **Watch the dashboard** - It predicts bankruptcy days in advance
- 🌊 **Consider disaster carefully** - High rewards but can overwhelm your capacity

## 🛠️ Technology Stack

- **[React 18](https://react.dev/)** - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Phaser 3](https://phaser.io/)** - Game rendering engine
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server

## 📁 Project Structure

```
open-arms/
├── src/
│   ├── components/          # React UI (14 components)
│   ├── game/
│   │   ├── scenes/          # Phaser scenes
│   │   └── systems/         # 20 game systems
│   ├── types/               # TypeScript definitions
│   ├── constants/           # Game configuration
│   └── utils/               # Helpers & stress testing
├── plans/                   # Design documents (21 files)
├── public/assets/           # Game assets
└── docs/                    # Documentation
```

## 📚 Documentation

- **[Player Guide](PLAYER_GUIDE.md)** - Complete gameplay guide with strategies
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Technical architecture and contribution guide
- **[Implementation](IMPLEMENTATION.md)** - Detailed feature documentation
- **[Changelog](CHANGELOG.md)** - Version history
- **[Launch Checklist](LAUNCH_CHECKLIST.md)** - Pre-launch verification

## 🎮 Game Systems Overview

### Core Gameplay Loop
1. **Build facilities** to house and serve residents
2. **Manage income** through donations and fundraisers
3. **Pay expenses** (food, maintenance, operations)
4. **Keep residents happy** to prevent departures
5. **Graduate residents** for reputation and rewards
6. **Upgrade tiers** to expand capacity and unlock rooms
7. **Survive disasters** for bonus rewards

### Economic Flow
```
Income Sources:
  Donations (every 90s) → $25/resident × tier multiplier
  Fundraisers (manual) → $150-350 (if successful)
  Graduation bonuses → $500 + reputation

Expenses:
  Food → $5-50/resident (based on portion)
  Maintenance → Sum of room costs (every 5 min)
  Operations → $100 + $5/resident + $10/room (daily)
  Random events → $50-200 (15% chance)
```

### Progression Metrics
- **LIFE Meter**: 0-100% (4 stages to graduation)
- **Reputation**: 0-100% (affects donations, spawning)
- **Tier**: 1-4 (unlocks rooms, capacity, bonuses)
- **Graduations**: Track your total impact

## 🤝 Contributing

Contributions are welcome! Please read the [Developer Guide](DEVELOPER_GUIDE.md) for:
- Code organization and architecture
- Adding new features
- Testing procedures
- Performance considerations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

See [CREDITS.md](CREDITS.md) for attributions and acknowledgments.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/DabideBoi/open-arms/issues)
- **Discussions**: [GitHub Discussions](https://github.com/DabideBoi/open-arms/discussions)

## 🗺️ Roadmap

### v1.0.0 (Current)
- [x] Core gameplay systems
- [x] Economic rebalancing
- [x] Tier progression
- [x] Disaster events
- [x] Warning system
- [x] Economic dashboard

### v1.1.0 (Planned)
- [ ] Achievement system
- [ ] Statistics dashboard
- [ ] Additional room types
- [ ] Seasonal events

### v2.0.0 (Future)
- [ ] Campaign mode
- [ ] Challenge scenarios
- [ ] Leaderboards
- [ ] Mobile app

---

**Made with ❤️ to raise awareness about homelessness and shelter management challenges**

*Help someone rebuild their life today.* 🏠
