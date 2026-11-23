# CareRoute: movement built for shelters

### Residents get where they need to go without cutting through bedrooms or walking into crowds.

*CareRoute is the working name for the movement engine in Open Arms. It is built into the game code. Every number below comes from a benchmark you can rerun: `npm run bench:path`.*

---

## The headline numbers

| On a tier-4 shelter | Standard pathfinding | **CareRoute** |
|:--|--:|--:|
| Room tiles crossed per trip | 6.59 | **0.45**, about **15x fewer** |
| Collisions per trip, 80 residents | 1.91 | **0.10**, about **19x fewer** |

Planning a trip is also **2.6x faster than our previous version** (22.9 µs → 8.7 µs on a tier-4 shelter).

| Choosing where to go (CareRoute Match), tier 4 | Our previous version | **CareRoute Match** |
|:--|--:|--:|
| Time per decision | 131 µs | **36 µs**, **3.6x faster** |
| Same, with 30 residents present | 207 µs | **64 µs**, **3.2x faster** |
| Picks the best room, with 30 residents present | 83% | **93%** |
| Distance from the best room, with 30 residents present | 0.40 | **0.09**, about **4x closer** |

Planning a trip takes microseconds, so it stays invisible to the player.

## Why standard pathfinding falls short in a shelter

Standard pathfinders answer one question: *what is the shortest way there?* A shelter needs a better question. Dormitories are where people sleep. Clinics have patients in them. Corridors fill up at mealtimes. The shortest route often goes straight through all of that.

We tested breadth-first search and textbook A\* on simulated shelters at every tier. They are fast, and they take the wrong routes: about 6.6 room tiles crossed per trip, and a bump into someone about 1.9 times per trip once the shelter fills up.

## What CareRoute does differently

CareRoute builds on A\*, a proven method, and adds four rules that reflect how a shelter works:

| Rule | What residents do |
|:--|:--|
| **Prefer open floor** | Walk around rooms instead of through them |
| **Prefer straight lines** | Move in natural runs, not zig-zags |
| **Notice other people** | Bend around crowds |
| **Never get stuck** | Re-route when someone blocks the way |

## CareRoute Match: choosing the right room, fast

When a resident needs food, rest or care, the game used to plan a trip to every open room of that type and then pick one. On a tier-4 shelter that is about 39 rooms to consider for one decision.

CareRoute Match makes the choice in a single search that weighs the walk and how busy each room is at the same time. The bigger the shelter, the bigger the saving, and when a shelter is busy it picks better rooms too.

## Why it matters

- **A shelter that feels alive.** Residents move like people sharing a space, not like objects on rails.
- **Room for growth.** Each tier unlocks a bigger shelter and more residents, and the cost of planning stays small.
- **Tuned to Open Arms.** The rules encode how our shelters work: rooms, crowds, and the way residents choose where to go.

---

### Good to know

- CareRoute is built on A\*. The shelter-specific rules and the room-choosing search are our own work.
- Room-choice gains grow with shelter size; in a small tier-2 shelter the speed is about the same as before.
- Results come from simulated shelters with randomly placed rooms. Timings vary by machine; the route counts do not.

*Method and full results: [PATHFINDING_BENCHMARK.md](PATHFINDING_BENCHMARK.md).*
