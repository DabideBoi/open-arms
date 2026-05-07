# 🏠 Open Arms – Technical Specification Index
> Version 1.0 | Based on GDD v0.2

---

## Overview

This technical specification is organized into modular documents, each covering a specific system or aspect of the Open Arms game. This structure makes it easier to navigate, implement, and maintain individual systems independently.

---

## 📚 Specification Documents

### Core Architecture
- **[01-System-Architecture.md](01-System-Architecture.md)** - High-level architecture, component relationships, data flow patterns

### Data & State
- **[02-Data-Models.md](02-Data-Models.md)** - Complete data structures for all game entities
- **[03-Game-State.md](03-Game-State.md)** - Root game state structure and state management

### Core Systems
- **[04-Grid-Building-System.md](04-Grid-Building-System.md)** - Tile system, placement validation, room specifications
- **[05-Pathfinding-System.md](05-Pathfinding-System.md)** - A* implementation, grid navigation, obstacle handling
- **[06-Resident-AI-System.md](06-Resident-AI-System.md)** - State machine, need priorities, behavior logic
- **[07-Reputation-System.md](07-Reputation-System.md)** - Calculation formulas, triggers, thresholds
- **[08-Donation-System.md](08-Donation-System.md)** - Timing mechanism, calculation formulas, modifiers
- **[09-Food-System.md](09-Food-System.md)** - Daily cycle, cost calculations, portion tier logic
- **[10-LIFE-Meter-System.md](10-LIFE-Meter-System.md)** - Fill rate formulas, graduation trigger, profile modifiers
- **[11-Fundraiser-System.md](11-Fundraiser-System.md)** - Timer implementation, payout formulas, state management
- **[12-Maintenance-System.md](12-Maintenance-System.md)** - Timer implementation, cost calculations, penalty logic
- **[13-Event-System.md](13-Event-System.md)** - Event scheduling, probability calculations, effect implementations
- **[14-Day-Night-Cycle.md](14-Day-Night-Cycle.md)** - Timing mechanism, phase transitions, room state changes

### Game Infrastructure
- **[15-Game-Loop-Timing.md](15-Game-Loop-Timing.md)** - Central game clock, timer management, pause/resume handling
- **[16-Save-Load-System.md](16-Save-Load-System.md)** - localStorage implementation, serialization, version migration

### UI/UX
- **[17-UI-Technical-Requirements.md](17-UI-Technical-Requirements.md)** - React components, Phaser integration, event communication

### Reference
- **[18-Formulas-Calculations.md](18-Formulas-Calculations.md)** - All mathematical formulas with exact parameters
- **[19-Constants-Configuration.md](19-Constants-Configuration.md)** - All tunable game constants and configuration values
- **[20-Performance-Considerations.md](20-Performance-Considerations.md)** - Optimization strategies for pathfinding, rendering, timers

### Implementation
- **[21-Implementation-Priority.md](21-Implementation-Priority.md)** - Suggested implementation order, MVP features, dependencies

---

## 🎯 Quick Reference

### For Implementing Core Gameplay
Start with: `04-Grid-Building-System.md` → `06-Resident-AI-System.md` → `10-LIFE-Meter-System.md`

### For Implementing Economy
Start with: `07-Reputation-System.md` → `08-Donation-System.md` → `09-Food-System.md`

### For Implementing Timers
Start with: `15-Game-Loop-Timing.md` → `08-Donation-System.md` → `12-Maintenance-System.md`

### For UI Integration
Start with: `17-UI-Technical-Requirements.md` → `03-Game-State.md`

---

## 📖 How to Use This Specification

1. **Start with the Index** (this file) to understand the overall structure
2. **Read System Architecture** ([`01-System-Architecture.md`](01-System-Architecture.md)) for the big picture
3. **Review Data Models** ([`02-Data-Models.md`](02-Data-Models.md)) to understand data structures
4. **Dive into specific systems** as needed for implementation
5. **Reference Formulas & Constants** ([`18-Formulas-Calculations.md`](18-Formulas-Calculations.md), [`19-Constants-Configuration.md`](19-Constants-Configuration.md)) during implementation
6. **Follow Implementation Priority** ([`21-Implementation-Priority.md`](21-Implementation-Priority.md)) for structured development

---

## 🔄 Document Status

| Document | Status | Notes |
|----------|--------|-------|
| All Core Systems | ✅ Complete | Ready for implementation |
| All Data Models | ✅ Complete | Ready for implementation |
| UI Requirements | ✅ Complete | Ready for implementation |
| Performance Guide | ✅ Complete | Reference during optimization |

---

## 📝 Version History

- **v1.0** (2026-05-07) - Initial modular specification based on GDD v0.2
