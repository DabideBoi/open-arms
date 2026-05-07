# 🏠 Open Arms - Shelter Management Game

A compassionate shelter management simulation game where you build and manage a homeless shelter, helping residents rebuild their lives while balancing resources, reputation, and community needs.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## 🎮 About the Game

**Open Arms** is a web-based simulation game that puts you in charge of managing a homeless shelter. Your mission is to provide safe housing, nutritious meals, and supportive services while helping residents progress through their journey toward independence.

### Key Features

- 🏗️ **Grid-Based Building System** - Design and expand your shelter with various room types
- 👥 **Dynamic Resident System** - Each resident has unique needs, personalities, and stories
- 🎯 **LIFE Meter Progression** - Help residents advance through stages: Survival → Stability → Growth → Independence
- 💰 **Economic Management** - Balance donations, expenses, and fundraising events
- 🌅 **Day/Night Cycle** - Manage different activities across morning, afternoon, evening, and night phases
- 📊 **Reputation System** - Build community trust through successful shelter management
- 🎲 **Random Events** - Handle challenges and opportunities that test your decision-making
- 💾 **Save/Load System** - Continue your progress across sessions
- 📱 **Responsive Design** - Play on desktop or mobile devices

## 🎯 How to Play

### Getting Started

1. **Build Essential Facilities**
   - Start with Dormitories for sleeping
   - Add a Cafeteria for meals
   - Include Bathrooms for hygiene
   - Expand with Common Rooms and Learning Centers

2. **Manage Resources**
   - Monitor your budget carefully
   - Ensure adequate food supplies
   - Maintain facilities to prevent deterioration
   - Balance spending with incoming donations

3. **Care for Residents**
   - Meet their basic needs (sleep, food, hygiene)
   - Provide social and educational opportunities
   - Help them progress through LIFE stages
   - Celebrate graduations as residents achieve independence

4. **Build Reputation**
   - Maintain high resident satisfaction
   - Keep facilities clean and functional
   - Handle events wisely
   - Attract more donations through good management

### Controls

- **Mouse/Touch**: Click to interact with UI elements
- **Camera**: Click and drag on the game canvas to pan
- **Build Menu**: Access via the "Build" button in the HUD
- **Management Panel**: View detailed resident and facility information
- **Settings**: Adjust audio and game speed
- **Save/Load**: Access from the pause menu

### Room Types

| Room | Size | Cost | Purpose |
|------|------|------|---------|
| **Dormitory** | 3×3 | $500 | Sleeping quarters for residents |
| **Cafeteria** | 5×3 | $800 | Dining area for meals |
| **Bathroom** | 2×2 | $300 | Hygiene facilities |
| **Common Room** | 3×3 | $600 | Social and recreational space |
| **Learning Center** | 4×3 | $1000 | Education and skill development |

### Tips for Success

- 🏗️ Build a balanced mix of facilities early
- 💰 Don't overspend - maintain a financial buffer
- 🍽️ Keep food supplies stocked (aim for 7+ days)
- 🔧 Perform regular maintenance to avoid costly repairs
- 📈 Focus on resident satisfaction to boost reputation
- 🎯 Help residents progress through LIFE stages for graduations
- 🎲 Save before making risky event decisions
- ⏰ Use time controls to manage complex situations

## 🚀 Development Setup

### Prerequisites

- **Node.js** 16+ and npm
- Modern web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/DabideBoi/open-arms.git
cd open-arms
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:3000`

### Build Commands

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

## 📦 Production Build

The production build is optimized for performance:

- **Code Splitting**: Separate vendor chunks for React and Phaser
- **Minification**: JavaScript and CSS minified with esbuild
- **Source Maps**: Generated for debugging production issues
- **Asset Optimization**: Images and fonts properly cached
- **Tree Shaking**: Unused code eliminated

Build output is in the `dist/` directory.

## 🌐 Deployment

### Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts to complete deployment

The project includes a `vercel.json` configuration file with optimized settings for SPA routing and caching.

### Other Platforms

The game can be deployed to any static hosting service:
- **Netlify**: Drag and drop the `dist/` folder
- **GitHub Pages**: Use the `gh-pages` package
- **Cloudflare Pages**: Connect your repository
- **AWS S3**: Upload the `dist/` folder

## 🛠️ Technology Stack

- **[React 18](https://react.dev/)** - UI framework
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development
- **[Phaser 3](https://phaser.io/)** - Game rendering engine
- **[Vite](https://vitejs.dev/)** - Fast build tool and dev server

## 📁 Project Structure

```
open-arms/
├── src/
│   ├── components/          # React UI components
│   │   ├── HUD.tsx         # Heads-up display
│   │   ├── BuildMenu.tsx   # Room building interface
│   │   ├── ManagementPanel.tsx  # Detailed management view
│   │   ├── EventModal.tsx  # Event handling UI
│   │   ├── TutorialModal.tsx    # Tutorial system
│   │   └── ...
│   ├── game/               # Phaser game logic
│   │   ├── scenes/         # Phaser scenes
│   │   │   └── MainScene.ts
│   │   ├── systems/        # Game systems
│   │   │   ├── GameStateManager.ts    # Central state
│   │   │   ├── GridSystem.ts          # Grid & building
│   │   │   ├── ResidentSystem.ts      # Resident management
│   │   │   ├── PathfindingSystem.ts   # A* pathfinding
│   │   │   ├── DayNightSystem.ts      # Time management
│   │   │   ├── DonationSystem.ts      # Economy
│   │   │   ├── FoodSystem.ts          # Food management
│   │   │   ├── ReputationSystem.ts    # Reputation tracking
│   │   │   ├── LIFEMeterSystem.ts     # Resident progression
│   │   │   ├── EventSystem.ts         # Random events
│   │   │   ├── FundraiserSystem.ts    # Fundraising
│   │   │   ├── MaintenanceSystem.ts   # Facility upkeep
│   │   │   ├── SaveLoadSystem.ts      # Persistence
│   │   │   └── ...
│   │   └── PhaserGame.ts   # Phaser initialization
│   ├── types/              # TypeScript definitions
│   ├── constants/          # Game configuration
│   ├── utils/              # Utility functions
│   └── App.tsx             # Main React app
├── plans/                  # Design documents
├── public/                 # Static assets
├── dist/                   # Production build (generated)
└── ...
```

## 📚 Documentation

- **[Player Guide](PLAYER_GUIDE.md)** - Comprehensive gameplay guide
- **[Developer Guide](DEVELOPER_GUIDE.md)** - Architecture and development docs
- **[Changelog](CHANGELOG.md)** - Version history and updates
- **[Launch Checklist](LAUNCH_CHECKLIST.md)** - Pre-launch verification

## 🎨 Game Systems

### Core Systems
- **Grid System**: 20×20 tile-based building area
- **Pathfinding**: A* algorithm for resident movement
- **Resident AI**: Need-based behavior system
- **Day/Night Cycle**: 4 phases per day (Morning, Afternoon, Evening, Night)

### Economic Systems
- **Donations**: Base income + reputation bonuses
- **Food Management**: Daily consumption and purchasing
- **Maintenance**: Facility deterioration and repair costs
- **Fundraisers**: Special events for extra income

### Progression Systems
- **LIFE Meter**: 4-stage progression (Survival → Stability → Growth → Independence)
- **Reputation**: Community trust affects donations and resident intake
- **Events**: Random challenges and opportunities

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

## 🎯 Roadmap

Future enhancements being considered:
- Additional room types (Medical Center, Job Training, Counseling)
- More resident personality types and stories
- Seasonal events and challenges
- Achievement system
- Multiplayer/leaderboard features
- Mobile app version

---

**Made with ❤️ to raise awareness about homelessness and shelter management challenges**
