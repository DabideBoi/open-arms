
# 🏠 Open Arms – Game Design Document
> Version 0.2 | Status: Brainstorm / Pre-Production

---

## 1. Overview

**Genre:** Tycoon / Simulation / Base Builder  
**Perspective:** Top-down, grid-based  
**Visual Style:** Rimworld-esque (functional, readable, slightly detailed sprite work)  
**Platform:** Web (React + Node.js, deployed on Vercel)  
**Save System:** Browser `localStorage` (no backend database required)

**Elevator Pitch:**  
*Open Arms* is a shelter management tycoon game where you build and run a homeless shelter. You manage resources, happiness, food, and education to help your residents get back on their feet — and eventually graduate into a better life. The more people you genuinely help, the more support the world gives back to you.

Inspired by: *Two Point Hospital*, *Rimworld*, *Papers Please* (stakes/tone), and *Firefly Studios' Stronghold* (reputation as a living, reactive system).

---

## 2. Core Pillars

| Pillar | Description |
|---|---|
| **Compassion Economy** | Doing right by your residents is mechanically rewarded, not just morally |
| **Living Shelter** | NPCs pathfind, have needs, and feel like real people — not just stats |
| **Organic Growth** | The shelter expands naturally as your reputation and funds grow |
| **Systemic Storytelling** | Random events create emergent narratives without scripted cutscenes |

---

## 3. Gameplay Loop

```
Receive Residents → House & Feed Them → Educate & Support Them
        ↓                                          ↓
  Manage Resources ←── Donations / Fundraisers ──→ Graduate Residents
        ↓                                          ↓
  Reputation Changes ←────────────────────── Permanent Counter Boost
```

### Win Condition (Soft)
There is no hard "win." The goal is continuous improvement:
- Maximize reputation
- Graduate as many residents as possible
- Expand the shelter to accommodate more people
- Survive random events

### Lose Condition
- Running out of money (shelter closes)
- Reputation hitting 0% (donors stop giving, residents leave en masse)

---

## 4. Core Mechanics

### 4.1 Base Building
- Grid-based building system (place rooms on a tile grid)
- Rooms snap to the grid and connect via hallways
- Start with a small starter building; unlock expansions over time
- **Room Types (Draft):**
  - 🛏️ Dormitory – housing (capacity: X residents per room)
  - 🍽️ Cafeteria – food delivery point
  - 📚 Learning Center / Vocational Room – fills the LIFE meter
  - 🚿 Bathrooms – basic need satisfaction
  - 🏢 Admin Office – manages donations and events
  - 🪑 Common Room – boosts happiness passively
  - 🛒 Fundraiser Station – used for cookie sales, etc.

### 4.2 Reputation System
- **Range:** 0% – 100%
- Acts as both a currency and a multiplier
- **Increases when:**
  - Residents graduate (find a job)
  - Fundraisers are completed successfully
  - Random disaster events are responded to
  - Residents are well-fed (large portions)
  - Facilities are well-maintained
- **Decreases when:**
  - Residents leave unhappy
  - Food portions are cut
  - Facilities fall into disrepair
  - Overcrowding occurs
  - Random negative events are ignored

### 4.3 Donation System
- **Passive check:** Every **5 minutes**, a random roll determines if a donation occurs
- **Chance modifier:** Reputation directly increases the probability of a successful roll
  - e.g., 10% rep = ~10% chance, 80% rep = ~80% chance
- **Base amount:** Scales with the **current number of residents** in the shelter
- **Randomized modifier:** A slight random multiplier (influenced by reputation) adds variance to each donation
- **Permanent multiplier:** Total number of **graduated residents** (all-time counter) increases donation amounts permanently — every graduate is a long-term investment
- Donations are the primary income source throughout the game

### 4.4 Food System
- Food is consumed **once per in-game day** by all current residents
- Cost scales directly with the number of residents
- Player chooses a **portion size setting** which affects daily cost, happiness, and reputation:

| Portion Size | Cost | Happiness Effect | Reputation Effect |
|---|---|---|---|
| Large | High | +++ | + |
| Standard | Medium | + | Neutral |
| Small | Low | - | - |
| None | None | --- | --- |

- If funds are insufficient for the chosen portion size, the system automatically drops to the next affordable tier
- No individual hunger tracking — food is a shelter-wide daily expense

### 4.5 LIFE Meter (Resident Progression)
- Every resident has a `LIFE` meter (0–100), **visible to the player**
- Starts at a randomized value between **10–25%** on arrival
- **Reaches 0** → resident loses hope and **leaves the shelter** (negative rep impact)
- Fills when residents use **Vocational Rooms** or **Learning Centers**
- Fill rate is multiplied by the **current overall reputation/happiness**
  - High rep shelter = faster LIFE gain
  - Low rep shelter = very slow or stalled progress (demoralized residents)
- **Fundraising** also increases the LIFE meter slightly (sense of purpose and contribution)
  - However, happiness slightly decreases after fundraising due to fatigue
- At **LIFE = 100**, the resident "graduates":
  - Confetti pops around their character sprite ✨
  - They walk out the front door with a small animation
  - Permanently adds +1 to the all-time graduated counter
  - Boosts reputation
  - Increases future donation amounts (permanent)

### 4.6 Fundraiser System
- Residents can be assigned to **Fundraiser Stations**
- Fully **timer-based** (no mini-games) — assign residents and wait
- Types (draft): cookie sale, car wash, craft fair, bake sale
- Each fundraiser takes a set number of real-time minutes to complete
- **Payout** = base amount × number of assigned residents × reputation modifier
- **Side effects per participating resident:**
  - LIFE meter increases slightly (sense of purpose)
  - Happiness decreases slightly (fatigue)
- Adds meaningful tradeoffs: fundraising helps financially and progression-wise, but at a small morale cost

### 4.7 Facility Maintenance
- Every room has a small **recurring maintenance cost**
- Checked every **15 minutes** of real time
- If you can't pay maintenance:
  - The cost is deducted from your balance (can push you into the negative)
  - Reputation takes a small hit
- **No room degradation** — maintenance is purely a financial pressure mechanic

### 4.8 Random Event System
Events fire periodically and require a player decision or resource investment.

| Event | Effect | Player Response |
|---|---|---|
| Natural Disaster | Surge of new residents | Accept or turn away (rep impact either way) |
| Donation Drive | Temporary rep/donation boost | Activate or ignore |
| Health Outbreak | Reduces happiness, may require spending | Quarantine, treat, or ignore |
| Media Coverage | Massive rep boost or drop | Manage PR |
| Volunteer Day | Free labor for maintenance | Schedule and use |
> **Note:** Homeless people arriving from disasters do **not** count toward the donation counter — they are tracked separately so the economy doesn't get gamed by disaster surges.

---

## 5. Resident AI & Pathfinding

- Residents are NPCs that pathfind through the shelter grid using **A\***
- Each resident has:
  - `happiness` (0–100)
  - `LIFE` meter (0–100)
  - `name` (randomly generated)
  - `arrival reason` (randomly assigned event tag, e.g. "arrived after a house fire")
- Residents autonomously seek out rooms that satisfy their current need
- If `happiness` drops too low for too long → resident **leaves** (counted negatively)
- **Overcrowding mechanic applies only to the Kitchen/Cafeteria**
  - Surge event residents may overwhelm the kitchen temporarily
  - Other rooms do not have a hard capacity limit (overcrowding reflected in happiness instead)

### Resident Identity
Each resident is generated with:
- A **first and last name** (randomized from a pool)
- An **arrival reason** tied to the event that brought them (e.g. *"John arrived after a house fire on Day 3"*)
- No deep backstory — just enough to make them feel like a person, not a stat

### Resident States
```
IDLE → SEEKING_NEED → IN_USE → SATISFIED → IDLE
                                    ↓
                             (repeat cycle)
```

---

## 6. Economy Summary

```
INCOME                          EXPENSES
──────────────────────          ──────────────────────
Donations (passive rolls)       Food (per resident, per cycle)
Fundraiser payouts              Maintenance (per room, per 15min)
                                Expansions (one-time build cost)
                                Event responses (optional spend)
```

---

## 7. Progression & Upgrades

### Shelter Tiers (Draft)
| Tier | Name | Max Residents | Unlocks |
|---|---|---|---|
| 1 | Starter Shelter | 10 | Basic rooms only |
| 2 | Community Hub | 25 | Vocational rooms, fundraiser stations |
| 3 | Opportunity Center | 50 | Multiple wings, upgraded learning center |
| 4 | New Beginnings Campus | 100+ | Full campus layout, PR office, medical room |

### Physical Expansion System
- **No room level upgrades** — progression is purely spatial
- Players spend money to **expand the grid**, unlocking new buildable tiles
- Each room type has a **fixed grid size requirement:**

| Room | Grid Size |
|---|---|
| Bedroom / Dormitory | 3×3 |
| Kitchen / Cafeteria | 5×3 |
| Learning Center | 4×3 |
| Vocational Room | 4×3 |
| Common Room | 3×3 |
| Bathroom | 2×2 |
| Fundraiser Station | 3×2 |
| Admin Office | 2×2 |

- Expansions are expensive — a deliberate money sink to pace progression
- Players must plan their layout carefully; grid space is limited and precious

---

## 8. UI/UX Concepts

- **Top HUD:** Money | Reputation bar | Current resident count | Happiness average
- **Sidebar:** Upcoming events | Active fundraisers | Maintenance alerts
- **Resident Panel:** Click a resident to see their stats and LIFE meter
- **Build Mode:** Toggle to place/delete/upgrade rooms
- **Event Modal:** Pop-up with flavor text and response options

---

## 9. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (UI layer — HUD, modals, menus) |
| Game Renderer | Phaser.js or PixiJS (canvas-based tile world + NPC rendering) |
| Backend | Node.js (minimal — mostly static hosting) |
| Save System | Browser `localStorage` (JSON snapshot of game state) |
| Deployment | Vercel (static frontend) |
| Pathfinding | A* algorithm on the grid (client-side) |

### Key Technical Considerations
- **Save/Load:** Full game state (grid layout, residents, counters, timers) is serialized to `localStorage` as JSON
- **Timer management:** All recurring timers (donations every 5min, maintenance every 15min, food daily) run client-side using a central game clock — paused when the tab is not active
- **React + Phaser integration:** React handles all UI overlays; Phaser manages the game canvas. Communication via a shared event bus or context
- **NPC pathfinding** runs entirely client-side on the in-memory grid state

---

## 10. Open Questions / To Brainstorm

- [x] ~~Day/Night Cycle?~~ — **Yes.** See Section 12 below.
- [x] ~~Resident Types?~~ — **Yes.** See Section 13 below.
- [x] ~~Is there a narrative intro / tutorial?~~ — Decided: **No formal tutorial.** Organic onboarding through play.
- [x] ~~How does the player first receive residents?~~ — **Guaranteed 2 residents at the start** (arrived from a house fire event), framing the first moments as an emergency response.
- [x] ~~Should fundraisers be mini-games or purely idle/timer-based?~~ — **Timer-based only.**
- [x] ~~Is there a "staff" system?~~ — **No staff system.** Keeping scope tight.
- [x] ~~Reputation visibility?~~ — **Just a meter.** Visible in the HUD at all times, no news ticker. The number speaks for itself.
- [x] ~~Multiplayer / co-op?~~ — **Out of scope.**
- [x] ~~What does graduating look like?~~ — **Confetti pops** around the character sprite, then they **walk out the front door.**
- [x] ~~Name/story per resident?~~ — **Named residents** with a short **event-based arrival reason** (e.g. *"Maria arrived after a house fire"*). No deep backstory.

---

## 12. Day/Night Cycle

### Overview
The shelter runs on a **real-time day/night cycle** that creates a natural rhythm of activity and rest. One full in-game day is divided into two phases:

| Phase | Duration (Real Time) | Description |
|---|---|---|
| **Day** | ~8 minutes | Active phase — all rooms open and operational |
| **Night** | ~4 minutes | Rest phase — most rooms closed, residents sleep |

> Durations are a starting draft and should be tuned during playtesting.

### Day Phase
- **All rooms are fully operational**
- Learning Centers and Vocational Rooms are **open** → LIFE meter fills
- Fundraiser Stations are **active** → residents can be assigned
- Residents pathfind normally to fulfill their needs
- Food is consumed **once per day**, triggered at the **start of the Day phase**

### Night Phase
- Learning Centers and Vocational Rooms **close** → no LIFE meter progress
- Fundraiser Stations **close** → no active fundraising
- Residents automatically path to **Dormitories** to sleep
- Sleeping restores **happiness** passively overnight
- The Common Room may remain open for night owls (optional — to decide)
- Bathrooms remain open at all times

### Visual Treatment
- The game canvas **dims and shifts to a cooler color palette** at night
- Interior room lights glow warmly against the dark
- A simple **sun/moon icon** in the HUD shows the current phase
- Transition is a gradual fade, not an instant cut

### Design Implications
- Players must ensure enough **Dormitory space** before night — overcrowded or missing dorms mean unhappy residents in the morning
- The night phase creates a **natural planning window**: the player can build, review stats, and set up fundraisers while residents sleep
- LIFE meter progress is **gated to daytime**, so shelter quality during the day matters a lot

---

## 13. Resident Types

Every resident is randomly assigned one of three **profiles** on arrival. The profile affects their LIFE meter behavior and daily needs — not their story.

### Profiles

| Profile | LIFE Fill Speed | Happiness Decay | Notes |
|---|---|---|---|
| 🧑 **Young Adult** | Fast | Medium | Eager to learn; adapts quickly; higher fundraiser output |
| 🎖️ **Veteran** | Slow | Low | Resilient; happiness is stable but LIFE progress is a long road |
| 👴 **Elderly** | Medium | High | Needs more comfort; happiness drops faster without a Common Room or good food |

### Profile Details

**🧑 Young Adult**
- LIFE meter fills **fastest** in Vocational Rooms
- Participates in fundraisers most effectively (higher per-person payout contribution)
- Happiness is average — not fragile, but not tough either
- Represents: someone early in their struggle, with energy to bounce back

**🎖️ Veteran**
- LIFE meter fills **slowest** — requires consistent shelter quality over time
- Happiness is the most **stable** — less affected by short-term food cuts or minor issues
- When they do graduate, they contribute a **bonus to the permanent donation multiplier** (their network effect is stronger)
- Represents: someone who has been through the system; rebuilding takes patience

**👴 Elderly**
- LIFE meter fills at a **medium rate** but stalls if happiness is low
- Most sensitive to food portion cuts and lack of a Common Room
- Sleeping properly (Dormitory access at night) is especially important — missing a night rest causes a steeper happiness drop
- Represents: someone who needs dignity and comfort above all else

### Profile Visibility
- The player can **see the profile** of each resident by clicking on them
- Profile icon is shown as a small badge on the resident sprite (subtle, readable)
- Encourages the player to think about **shelter composition**, not just raw numbers

---

## 14. Tone & Feel</oldString>
</command:artifact-edit>

- Warm, hopeful, but grounded — not saccharine
- Difficulty comes from resource pressure, not cruelty
- Player should feel like a hero when residents graduate
- The game should never "punish" the player for trying to do the right thing
- **Reputation as a living system** (à la Stronghold) — the world reacts to how you treat people, not just your numbers
