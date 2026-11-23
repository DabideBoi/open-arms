# Pathfinding benchmark

node v22.23.3 · linux/x64 · full run · gc exposed: true

Rows: **BFS** (unit cost) · **A\* textbook** (unit cost, Manhattan, binary heap) · **Previous findPath** (pre-CareRoute: turn/room/crowd costs, linear-scan open list) · **CareRoute findPath** (shipped: same costs, binary heap, typed arrays) · **exact turns** (direction kept in the search state so the turn penalty is truly optimal; not adopted) · **Dijkstra** (game costs, no heuristic) · **Weighted A\* w=2** (game costs, heuristic doubled: faster, may be suboptimal) · **Greedy best-first** (heuristic only: fast, no optimality) · **Bidirectional BFS** (unit cost, floods from both ends).


### shelter-T1
real game grid, tier 1: 12x12 unlocked in a 40x30 grid, 7 rooms (real placeRoom), no residents

200 queries (<=8: 113, 9-20: 87) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 2.8 | 3.9 | 14.6 | 2.01x | 64 | 76 | 14 |
| A* textbook (unit cost, heap) | 1.1 | 1.6 | 19.2 | 5.37x | 9 | 24 | 16 |
| Previous findPath (linear-scan open list) | 5.7 | 6.5 | 6.0 | 1.00x | 20 | 36 | 18 |
| CareRoute findPath (shipped: heap + typed arrays) | 2.0 | 2.7 | 14.5 | 2.86x | 17 | 33 | 20 |
| CareRoute + exact turns (not adopted) | 3.5 | 4.5 | 9.5 | 1.59x | 24 | 61 | 41 |
| Dijkstra (game costs, no heuristic) | 7.3 | 8.3 | 5.6 | 0.78x | 64 | 80 | 22 |
| Weighted A* w=2 (game costs) | 1.5 | 2.2 | 16.5 | 3.66x | 10 | 25 | 16 |
| Greedy best-first (heuristic only) | 1.4 | 2.0 | 17.5 | 4.18x | 9 | 24 | 16 |
| Bidirectional BFS (unit cost) | 1.6 | 2.5 | 23.2 | 3.47x | 38 | 57 | 18 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 8.1 | 12.52 | 28.63 | 54 | 0.89 | 2.06 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 8.1 | 12.52 | 28.63 | 54 | 0.89 | 2.06 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 8.3 | 9.39 | 0.26 | 90 | 1.38 | 0.32 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 8.3 | 9.39 | 0.30 | 89 | 1.39 | 0.32 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 8.3 | 9.36 | 0.00 | 100 | 1.28 | 0.32 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 8.3 | 9.38 | 0.20 | 93 | 1.35 | 0.32 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 8.2 | 9.76 | 3.11 | 76 | 1.34 | 0.57 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 8.1 | 12.52 | 28.63 | 54 | 0.89 | 2.06 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 8.1 | 12.62 | 29.62 | 40 | 1.16 | 2.06 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=113) | 9-20 (n=87) |
| :-- | --: | --: |
| BFS (unit cost) | 2.0 · 35 | 3.9 · 101 |
| A* textbook (unit cost, heap) | 0.8 · 6 | 1.4 · 13 |
| Previous findPath (linear-scan open list) | 3.4 · 11 | 8.6 · 30 |
| CareRoute findPath (shipped: heap + typed arrays) | 1.2 · 10 | 3.0 · 26 |
| CareRoute + exact turns (not adopted) | 1.9 · 12 | 5.6 · 39 |
| Dijkstra (game costs, no heuristic) | 4.5 · 40 | 10.8 · 96 |
| Weighted A* w=2 (game costs) | 1.0 · 7 | 2.1 · 14 |
| Greedy best-first (heuristic only) | 1.0 · 6 | 1.8 · 13 |
| Bidirectional BFS (unit cost) | 0.9 · 17 | 2.6 · 65 |

### shelter-T2
real game grid, tier 2: 18x18 unlocked in a 40x30 grid, 13 rooms (real placeRoom), no residents

200 queries (<=8: 66, 9-20: 118, 21-50: 16) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 4.9 | 5.5 | 4.4 | 2.08x | 137 | 155 | 20 |
| A* textbook (unit cost, heap) | 1.4 | 2.1 | 15.9 | 7.40x | 12 | 34 | 23 |
| Previous findPath (linear-scan open list) | 10.3 | 10.9 | 3.0 | 1.00x | 34 | 60 | 27 |
| CareRoute findPath (shipped: heap + typed arrays) | 3.7 | 4.6 | 8.8 | 2.81x | 29 | 55 | 30 |
| CareRoute + exact turns (not adopted) | 7.6 | 8.6 | 9.1 | 1.35x | 48 | 110 | 69 |
| Dijkstra (game costs, no heuristic) | 16.2 | 18.7 | 5.4 | 0.63x | 138 | 164 | 35 |
| Weighted A* w=2 (game costs) | 2.3 | 2.9 | 9.3 | 4.38x | 15 | 36 | 24 |
| Greedy best-first (heuristic only) | 1.9 | 2.6 | 15.9 | 5.53x | 12 | 34 | 23 |
| Bidirectional BFS (unit cost) | 3.3 | 4.4 | 11.4 | 3.11x | 85 | 112 | 26 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 11.5 | 18.91 | 35.36 | 38 | 0.89 | 3.59 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 11.5 | 18.91 | 35.36 | 38 | 0.89 | 3.59 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 11.9 | 13.36 | 0.35 | 84 | 1.76 | 0.45 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 11.9 | 13.37 | 0.37 | 82 | 1.78 | 0.45 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 11.9 | 13.31 | 0.00 | 100 | 1.60 | 0.45 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 11.9 | 13.36 | 0.33 | 85 | 1.75 | 0.45 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 11.6 | 14.59 | 7.66 | 61 | 1.70 | 1.24 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 11.5 | 18.91 | 35.36 | 38 | 0.89 | 3.59 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 11.5 | 18.79 | 34.22 | 32 | 1.19 | 3.48 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=66) | 9-20 (n=118) | 21-50 (n=16) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 2.1 · 37 | 5.8 · 173 | 9.8 · 289 |
| A* textbook (unit cost, heap) | 0.8 · 6 | 1.4 · 14 | 3.2 · 25 |
| Previous findPath (linear-scan open list) | 3.6 · 12 | 11.6 · 39 | 26.7 · 86 |
| CareRoute findPath (shipped: heap + typed arrays) | 1.3 · 9 | 4.0 · 33 | 10.2 · 79 |
| CareRoute + exact turns (not adopted) | 2.1 · 12 | 8.7 · 56 | 21.6 · 140 |
| Dijkstra (game costs, no heuristic) | 5.6 · 46 | 19.9 · 171 | 31.7 · 277 |
| Weighted A* w=2 (game costs) | 1.1 · 7 | 2.6 · 17 | 4.8 · 30 |
| Greedy best-first (heuristic only) | 1.0 · 6 | 2.0 · 14 | 4.0 · 25 |
| Bidirectional BFS (unit cost) | 0.9 · 17 | 3.8 · 104 | 8.7 · 229 |

### shelter-T3
real game grid, tier 3: 22x22 unlocked in a 40x30 grid, 23 rooms (real placeRoom), no residents

200 queries (<=8: 45, 9-20: 101, 21-50: 54) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 7.6 | 8.8 | 6.9 | 2.34x | 228 | 248 | 24 |
| A* textbook (unit cost, heap) | 1.8 | 2.2 | 12.6 | 9.95x | 16 | 45 | 30 |
| Previous findPath (linear-scan open list) | 17.9 | 19.2 | 3.4 | 1.00x | 58 | 92 | 37 |
| CareRoute findPath (shipped: heap + typed arrays) | 6.6 | 8.1 | 8.6 | 2.72x | 53 | 87 | 46 |
| CareRoute + exact turns (not adopted) | 15.1 | 15.7 | 2.2 | 1.18x | 104 | 208 | 117 |
| Dijkstra (game costs, no heuristic) | 26.9 | 27.9 | 2.4 | 0.66x | 227 | 257 | 44 |
| Weighted A* w=2 (game costs) | 3.2 | 4.2 | 10.8 | 5.53x | 21 | 50 | 32 |
| Greedy best-first (heuristic only) | 2.5 | 3.4 | 12.9 | 7.17x | 16 | 45 | 30 |
| Bidirectional BFS (unit cost) | 5.7 | 6.3 | 8.3 | 3.14x | 149 | 182 | 33 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 15.4 | 25.60 | 36.07 | 28 | 0.91 | 4.96 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 15.4 | 25.60 | 36.07 | 28 | 0.91 | 4.96 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 16.1 | 18.03 | 0.34 | 81 | 2.29 | 0.63 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 16.1 | 18.03 | 0.33 | 82 | 2.28 | 0.60 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 16.1 | 17.97 | 0.00 | 100 | 2.10 | 0.62 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 16.1 | 18.02 | 0.29 | 84 | 2.25 | 0.60 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 15.7 | 19.88 | 8.58 | 48 | 2.21 | 1.77 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 15.4 | 25.60 | 36.07 | 28 | 0.91 | 4.96 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 15.4 | 26.26 | 40.73 | 18 | 1.23 | 5.24 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=45) | 9-20 (n=101) | 21-50 (n=54) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 2.5 · 49 | 7.2 · 214 | 12.6 · 403 |
| A* textbook (unit cost, heap) | 1.0 · 7 | 1.5 · 15 | 2.9 · 27 |
| Previous findPath (linear-scan open list) | 4.0 · 12 | 14.0 · 46 | 36.6 · 119 |
| CareRoute findPath (shipped: heap + typed arrays) | 1.6 · 10 | 4.9 · 41 | 13.8 · 112 |
| CareRoute + exact turns (not adopted) | 2.5 · 13 | 10.9 · 74 | 33.1 · 236 |
| Dijkstra (game costs, no heuristic) | 7.1 · 57 | 25.8 · 217 | 44.4 · 385 |
| Weighted A* w=2 (game costs) | 1.3 · 7 | 2.9 · 19 | 5.3 · 34 |
| Greedy best-first (heuristic only) | 1.3 · 7 | 2.2 · 15 | 3.9 · 27 |
| Bidirectional BFS (unit cost) | 1.2 · 23 | 4.6 · 124 | 10.8 · 300 |

### shelter-T4
real game grid, tier 4: 26x26 unlocked in a 40x30 grid, 39 rooms (real placeRoom), no residents

200 queries (<=8: 37, 9-20: 82, 21-50: 81) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 10.8 | 12.0 | 6.0 | 2.11x | 336 | 359 | 29 |
| A* textbook (unit cost, heap) | 2.1 | 3.1 | 19.3 | 11.07x | 19 | 54 | 36 |
| Previous findPath (linear-scan open list) | 22.9 | 24.2 | 3.3 | 1.00x | 73 | 117 | 47 |
| CareRoute findPath (shipped: heap + typed arrays) | 8.7 | 9.6 | 4.5 | 2.61x | 69 | 113 | 60 |
| CareRoute + exact turns (not adopted) | 19.8 | 20.9 | 2.8 | 1.16x | 134 | 268 | 145 |
| Dijkstra (game costs, no heuristic) | 39.7 | 41.7 | 2.6 | 0.58x | 330 | 367 | 53 |
| Weighted A* w=2 (game costs) | 3.8 | 4.9 | 11.5 | 5.96x | 24 | 58 | 38 |
| Greedy best-first (heuristic only) | 2.9 | 3.8 | 12.5 | 7.90x | 19 | 54 | 36 |
| Bidirectional BFS (unit cost) | 8.0 | 9.3 | 9.6 | 2.84x | 219 | 259 | 39 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 18.2 | 31.65 | 46.50 | 14 | 0.93 | 6.59 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 18.2 | 31.65 | 46.50 | 14 | 0.93 | 6.59 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 19.1 | 21.05 | 0.40 | 79 | 3.38 | 0.44 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 19.1 | 21.04 | 0.34 | 83 | 3.35 | 0.45 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 19.1 | 20.98 | 0.00 | 100 | 3.17 | 0.44 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 19.1 | 21.03 | 0.29 | 84 | 3.33 | 0.44 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 18.4 | 23.24 | 9.37 | 34 | 2.92 | 1.96 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 18.2 | 31.65 | 46.50 | 14 | 0.93 | 6.59 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 18.2 | 31.76 | 47.21 | 12 | 1.27 | 6.60 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=37) | 9-20 (n=82) | 21-50 (n=81) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 2.5 · 45 | 8.6 · 268 | 16.4 · 537 |
| A* textbook (unit cost, heap) | 1.1 · 7 | 1.6 · 16 | 2.9 · 28 |
| Previous findPath (linear-scan open list) | 3.8 · 12 | 14.4 · 47 | 40.0 · 126 |
| CareRoute findPath (shipped: heap + typed arrays) | 1.7 · 10 | 5.3 · 42 | 15.4 · 122 |
| CareRoute + exact turns (not adopted) | 2.7 · 13 | 11.4 · 74 | 36.0 · 251 |
| Dijkstra (game costs, no heuristic) | 7.0 · 53 | 32.3 · 263 | 61.7 · 524 |
| Weighted A* w=2 (game costs) | 1.5 · 7 | 3.0 · 18 | 5.7 · 36 |
| Greedy best-first (heuristic only) | 1.3 · 7 | 2.3 · 16 | 4.1 · 28 |
| Bidirectional BFS (unit cost) | 1.3 · 19 | 5.5 · 149 | 13.6 · 382 |

### shelter-T4-crowd30
tier 4 layout with 30 residents standing on tiles; findPath called with a residentId like the game does

200 queries (<=8: 42, 9-20: 86, 21-50: 72) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 9.9 | 11.4 | 5.4 | 3.18x | 310 | 333 | 29 |
| A* textbook (unit cost, heap) | 2.1 | 3.0 | 17.3 | 14.88x | 18 | 50 | 33 |
| Previous findPath (linear-scan open list) | 31.6 | 33.0 | 4.7 | 1.00x | 67 | 109 | 43 |
| CareRoute findPath (shipped: heap + typed arrays) | 18.5 | 20.1 | 3.6 | 1.71x | 63 | 105 | 53 |
| CareRoute + exact turns (not adopted) | 41.6 | 43.9 | 2.6 | 0.76x | 129 | 246 | 127 |
| Dijkstra (game costs, no heuristic) | 74.5 | 77.1 | 1.5 | 0.42x | 303 | 343 | 54 |
| Weighted A* w=2 (game costs) | 7.8 | 9.1 | 7.2 | 4.06x | 23 | 56 | 36 |
| Greedy best-first (heuristic only) | 6.1 | 7.1 | 7.2 | 5.22x | 18 | 50 | 33 |
| Bidirectional BFS (unit cost) | 7.4 | 8.2 | 7.2 | 4.29x | 198 | 237 | 38 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 17.0 | 32.66 | 51.84 | 18 | 0.97 | 6.10 | 0.79 |
| A* textbook (unit cost, heap) | 100 | 17.0 | 32.66 | 51.84 | 18 | 0.97 | 6.10 | 0.79 |
| Previous findPath (linear-scan open list) | 100 | 17.9 | 20.63 | 0.36 | 78 | 3.83 | 0.79 | 0.01 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 17.9 | 20.62 | 0.34 | 79 | 3.81 | 0.79 | 0.01 |
| CareRoute + exact turns (not adopted) | 100 | 17.9 | 20.56 | 0.00 | 100 | 3.60 | 0.78 | 0.01 |
| Dijkstra (game costs, no heuristic) | 100 | 17.9 | 20.62 | 0.30 | 81 | 3.80 | 0.78 | 0.01 |
| Weighted A* w=2 (game costs) | 100 | 17.4 | 22.46 | 7.47 | 45 | 3.66 | 1.85 | 0.07 |
| Greedy best-first (heuristic only) | 100 | 17.0 | 32.66 | 51.84 | 18 | 0.97 | 6.10 | 0.79 |
| Bidirectional BFS (unit cost) | 100 | 17.0 | 33.23 | 53.77 | 13 | 1.31 | 6.16 | 0.88 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=42) | 9-20 (n=86) | 21-50 (n=72) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 2.4 · 44 | 8.4 · 259 | 16.0 · 524 |
| A* textbook (unit cost, heap) | 1.1 · 7 | 1.8 · 16 | 2.9 · 28 |
| Previous findPath (linear-scan open list) | 6.4 · 13 | 23.2 · 50 | 56.1 · 119 |
| CareRoute findPath (shipped: heap + typed arrays) | 3.6 · 10 | 13.3 · 46 | 33.2 · 115 |
| CareRoute + exact turns (not adopted) | 5.7 · 13 | 28.8 · 89 | 77.8 · 245 |
| Dijkstra (game costs, no heuristic) | 14.5 · 54 | 64.8 · 258 | 121.1 · 502 |
| Weighted A* w=2 (game costs) | 2.7 · 7 | 6.5 · 20 | 12.2 · 37 |
| Greedy best-first (heuristic only) | 2.5 · 7 | 5.3 · 16 | 9.1 · 28 |
| Bidirectional BFS (unit cost) | 1.1 · 20 | 5.2 · 143 | 13.3 · 367 |

### shelter-T4-crowd80
tier 4 layout with 80 residents standing on tiles; findPath called with a residentId like the game does

200 queries (<=8: 31, 9-20: 97, 21-50: 72) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 10.0 | 11.2 | 4.9 | 3.90x | 312 | 336 | 28 |
| A* textbook (unit cost, heap) | 2.1 | 2.4 | 6.9 | 19.01x | 19 | 52 | 35 |
| Previous findPath (linear-scan open list) | 39.1 | 40.1 | 2.1 | 1.00x | 82 | 126 | 46 |
| CareRoute findPath (shipped: heap + typed arrays) | 22.7 | 23.1 | 1.4 | 1.72x | 79 | 123 | 55 |
| CareRoute + exact turns (not adopted) | 55.7 | 59.3 | 3.7 | 0.70x | 179 | 309 | 139 |
| Dijkstra (game costs, no heuristic) | 74.3 | 79.5 | 3.6 | 0.53x | 299 | 341 | 55 |
| Weighted A* w=2 (game costs) | 9.3 | 10.3 | 4.5 | 4.19x | 28 | 63 | 39 |
| Greedy best-first (heuristic only) | 6.2 | 7.5 | 7.5 | 6.28x | 19 | 52 | 35 |
| Bidirectional BFS (unit cost) | 7.4 | 8.0 | 4.3 | 5.26x | 203 | 242 | 39 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 17.6 | 37.64 | 61.97 | 10 | 0.92 | 6.07 | 1.91 |
| A* textbook (unit cost, heap) | 100 | 17.6 | 37.64 | 61.97 | 10 | 0.92 | 6.07 | 1.91 |
| Previous findPath (linear-scan open list) | 100 | 18.8 | 22.91 | 0.34 | 79 | 4.26 | 1.21 | 0.10 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 18.8 | 22.90 | 0.33 | 80 | 4.25 | 1.21 | 0.10 |
| CareRoute + exact turns (not adopted) | 100 | 18.8 | 22.84 | 0.00 | 100 | 4.04 | 1.22 | 0.10 |
| Dijkstra (game costs, no heuristic) | 100 | 18.8 | 22.90 | 0.31 | 80 | 4.25 | 1.20 | 0.11 |
| Weighted A* w=2 (game costs) | 100 | 18.2 | 24.84 | 7.29 | 44 | 4.13 | 2.16 | 0.28 |
| Greedy best-first (heuristic only) | 100 | 17.6 | 37.64 | 61.97 | 10 | 0.92 | 6.07 | 1.91 |
| Bidirectional BFS (unit cost) | 100 | 17.6 | 38.24 | 63.25 | 10 | 1.31 | 6.25 | 1.94 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=31) | 9-20 (n=97) | 21-50 (n=72) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 2.8 · 54 | 7.8 · 240 | 15.9 · 521 |
| A* textbook (unit cost, heap) | 1.2 · 7 | 1.6 · 15 | 2.9 · 28 |
| Previous findPath (linear-scan open list) | 6.8 · 13 | 22.8 · 50 | 74.3 · 155 |
| CareRoute findPath (shipped: heap + typed arrays) | 4.1 · 12 | 13.4 · 47 | 42.6 · 151 |
| CareRoute + exact turns (not adopted) | 7.2 · 17 | 30.1 · 94 | 110.6 · 362 |
| Dijkstra (game costs, no heuristic) | 16.3 · 58 | 58.0 · 229 | 120.7 · 496 |
| Weighted A* w=2 (game costs) | 3.0 · 8 | 7.0 · 21 | 15.0 · 46 |
| Greedy best-first (heuristic only) | 2.7 · 7 | 5.0 · 15 | 9.3 · 28 |
| Bidirectional BFS (unit cost) | 1.4 · 24 | 4.8 · 134 | 13.4 · 372 |

### open-40x30
empty 40x30 grid, uniform cost: best case for A*, worst case for flooding

200 queries (<=8: 22, 9-20: 63, 21-50: 109, >50: 6) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 17.9 | 18.8 | 2.9 | 1.44x | 593 | 624 | 39 |
| A* textbook (unit cost, heap) | 2.8 | 3.8 | 12.4 | 9.23x | 25 | 71 | 48 |
| Previous findPath (linear-scan open list) | 25.7 | 27.2 | 3.1 | 1.00x | 74 | 145 | 73 |
| CareRoute findPath (shipped: heap + typed arrays) | 3.4 | 4.4 | 9.8 | 7.58x | 32 | 92 | 61 |
| CareRoute + exact turns (not adopted) | 5.4 | 6.3 | 9.3 | 4.80x | 32 | 123 | 92 |
| Dijkstra (game costs, no heuristic) | 62.3 | 64.6 | 1.9 | 0.41x | 624 | 658 | 68 |
| Weighted A* w=2 (game costs) | 3.2 | 4.3 | 11.4 | 7.93x | 25 | 71 | 48 |
| Greedy best-first (heuristic only) | 3.0 | 3.5 | 8.8 | 8.47x | 25 | 71 | 48 |
| Bidirectional BFS (unit cost) | 14.0 | 15.2 | 6.1 | 1.84x | 384 | 437 | 52 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 23.6 | 23.93 | 0.00 | 100 | 0.94 | 0.00 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 23.6 | 23.93 | 0.00 | 100 | 0.94 | 0.00 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 23.6 | 23.93 | 0.00 | 100 | 0.94 | 0.00 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 23.6 | 23.93 | 0.00 | 100 | 0.94 | 0.00 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 23.6 | 23.93 | 0.00 | 100 | 0.94 | 0.00 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 23.6 | 23.93 | 0.00 | 100 | 0.94 | 0.00 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 23.6 | 23.93 | 0.00 | 100 | 0.94 | 0.00 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 23.6 | 23.93 | 0.00 | 100 | 0.94 | 0.00 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 23.6 | 24.04 | 0.62 | 63 | 1.30 | 0.00 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=22) | 9-20 (n=63) | 21-50 (n=109) | >50 (n=6) |
| :-- | --: | --: | --: | --: |
| BFS (unit cost) | 3.0 · 54 | 9.7 · 313 | 24.3 · 832 | 36.1 · 1159 |
| A* textbook (unit cost, heap) | 1.5 · 7 | 1.9 · 16 | 3.3 · 32 | 8.0 · 55 |
| Previous findPath (linear-scan open list) | 3.8 · 11 | 11.1 · 37 | 37.0 · 107 | 38.8 · 99 |
| CareRoute findPath (shipped: heap + typed arrays) | 1.3 · 8 | 2.1 · 20 | 4.1 · 41 | 9.3 · 77 |
| CareRoute + exact turns (not adopted) | 3.3 · 8 | 3.6 · 20 | 6.1 · 41 | 16.2 · 77 |
| Dijkstra (game costs, no heuristic) | 7.0 · 75 | 33.8 · 351 | 86.2 · 862 | 114.6 · 1167 |
| Weighted A* w=2 (game costs) | 1.3 · 7 | 2.2 · 16 | 3.8 · 32 | 8.7 · 55 |
| Greedy best-first (heuristic only) | 1.3 · 7 | 2.0 · 16 | 3.6 · 32 | 8.2 · 55 |
| Bidirectional BFS (unit cost) | 1.5 · 23 | 5.9 · 158 | 19.4 · 550 | 37.8 · 1050 |

### open-160x120
empty 160x120 grid (16x the tiles of the game grid)

60 queries (9-20: 1, 21-50: 11, >50: 48) · 9 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 406.7 | 423.3 | 1.8 | 3.05x | 10446 | 10568 | 157 |
| A* textbook (unit cost, heap) | 16.4 | 24.4 | 15.3 | 75.61x | 104 | 306 | 204 |
| Previous findPath (linear-scan open list) | 1239.6 | 1301.3 | 2.8 | 1.00x | 663 | 1209 | 552 |
| CareRoute findPath (shipped: heap + typed arrays) | 20.3 | 26.4 | 9.7 | 61.03x | 138 | 406 | 269 |
| CareRoute + exact turns (not adopted) | 33.0 | 40.9 | 10.0 | 37.55x | 138 | 543 | 407 |
| Dijkstra (game costs, no heuristic) | 1388.9 | 1572.8 | 6.1 | 0.89x | 10556 | 10695 | 298 |
| Weighted A* w=2 (game costs) | 17.9 | 23.6 | 12.5 | 69.21x | 104 | 306 | 204 |
| Greedy best-first (heuristic only) | 18.0 | 25.8 | 17.3 | 68.68x | 104 | 306 | 204 |
| Bidirectional BFS (unit cost) | 298.7 | 314.1 | 3.2 | 4.15x | 7197 | 7414 | 217 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 102.8 | 103.13 | 0.00 | 100 | 0.98 | 0.00 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 102.8 | 103.13 | 0.00 | 100 | 0.98 | 0.00 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 102.8 | 103.13 | 0.00 | 100 | 0.98 | 0.00 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 102.8 | 103.13 | 0.00 | 100 | 0.98 | 0.00 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 102.8 | 103.13 | 0.00 | 100 | 0.98 | 0.00 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 102.8 | 103.13 | 0.00 | 100 | 0.98 | 0.00 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 102.8 | 103.13 | 0.00 | 100 | 0.98 | 0.00 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 102.8 | 103.13 | 0.00 | 100 | 0.98 | 0.00 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 102.8 | 103.24 | 0.17 | 62 | 1.37 | 0.00 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | 9-20 (n=1) | 21-50 (n=11) | >50 (n=48) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 36.5 · 558 | 124.2 · 3010 | 481.9 · 12357 |
| A* textbook (unit cost, heap) | 9.3 · 19 | 8.7 · 42 | 18.3 · 120 |
| Previous findPath (linear-scan open list) | 24.4 · 33 | 49.1 · 132 | 1536.9 · 798 |
| CareRoute findPath (shipped: heap + typed arrays) | 9.3 · 26 | 10.3 · 54 | 22.6 · 159 |
| CareRoute + exact turns (not adopted) | 12.6 · 26 | 15.9 · 54 | 36.8 · 159 |
| Dijkstra (game costs, no heuristic) | 108.6 · 657 | 423.6 · 3112 | 1636.0 · 12469 |
| Weighted A* w=2 (game costs) | 8.2 · 19 | 9.9 · 42 | 20.1 · 120 |
| Greedy best-first (heuristic only) | 7.7 · 19 | 8.9 · 42 | 20.2 · 120 |
| Bidirectional BFS (unit cost) | 20.3 · 274 | 72.2 · 1586 | 355.3 · 8626 |

### scatter25-40x30
25% random obstacles, 40x30

200 queries (<=8: 14, 9-20: 56, 21-50: 128, >50: 2) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 21.3 | 22.6 | 3.5 | 1.46x | 475 | 497 | 31 |
| A* textbook (unit cost, heap) | 9.2 | 10.3 | 7.8 | 3.38x | 81 | 113 | 40 |
| Previous findPath (linear-scan open list) | 31.0 | 32.9 | 2.8 | 1.00x | 126 | 158 | 37 |
| CareRoute findPath (shipped: heap + typed arrays) | 13.1 | 14.0 | 3.1 | 2.36x | 123 | 156 | 49 |
| CareRoute + exact turns (not adopted) | 31.7 | 33.7 | 2.7 | 0.98x | 254 | 375 | 142 |
| Dijkstra (game costs, no heuristic) | 48.7 | 50.9 | 2.6 | 0.64x | 496 | 518 | 38 |
| Weighted A* w=2 (game costs) | 6.1 | 6.6 | 3.8 | 5.09x | 49 | 83 | 35 |
| Greedy best-first (heuristic only) | 5.5 | 5.9 | 8.0 | 5.62x | 43 | 75 | 33 |
| Bidirectional BFS (unit cost) | 15.7 | 16.9 | 5.6 | 1.98x | 303 | 340 | 38 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 29.7 | 32.72 | 3.08 | 20 | 10.02 | 0.00 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 29.7 | 32.75 | 3.27 | 19 | 10.13 | 0.00 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 29.7 | 31.78 | 0.25 | 80 | 6.89 | 0.00 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 29.7 | 31.78 | 0.26 | 79 | 6.90 | 0.00 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 29.7 | 31.72 | 0.00 | 100 | 6.68 | 0.00 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 29.7 | 31.78 | 0.23 | 81 | 6.89 | 0.00 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 30.9 | 33.59 | 5.12 | 33 | 9.13 | 0.00 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 32.2 | 35.89 | 12.39 | 16 | 12.28 | 0.00 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 29.7 | 32.74 | 3.19 | 17 | 10.10 | 0.00 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=14) | 9-20 (n=56) | 21-50 (n=128) | >50 (n=2) |
| :-- | --: | --: | --: | --: |
| BFS (unit cost) | 4.0 · 46 | 12.0 · 250 | 26.7 · 614 | 45.9 · 858 |
| A* textbook (unit cost, heap) | 2.2 · 12 | 4.6 · 40 | 11.6 · 105 | 24.7 · 179 |
| Previous findPath (linear-scan open list) | 4.8 · 15 | 14.2 · 58 | 40.3 · 165 | 88.4 · 292 |
| CareRoute findPath (shipped: heap + typed arrays) | 2.3 · 14 | 5.9 · 55 | 17.0 · 161 | 37.7 · 287 |
| CareRoute + exact turns (not adopted) | 4.3 · 22 | 14.2 · 111 | 41.4 · 338 | 81.9 · 533 |
| Dijkstra (game costs, no heuristic) | 6.6 · 59 | 27.7 · 277 | 60.8 · 634 | 92.1 · 859 |
| Weighted A* w=2 (game costs) | 2.1 · 11 | 4.0 · 32 | 7.3 · 60 | 12.5 · 72 |
| Greedy best-first (heuristic only) | 2.0 · 11 | 3.7 · 29 | 6.5 · 52 | 12.6 · 69 |
| Bidirectional BFS (unit cost) | 2.5 · 24 | 7.2 · 129 | 20.2 · 405 | 35.1 · 612 |

### scatter25-160x120
25% random obstacles, 160x120

60 queries (9-20: 1, 21-50: 12, >50: 47) · 9 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 417.3 | 434.3 | 1.3 | 1.71x | 7720 | 7808 | 121 |
| A* textbook (unit cost, heap) | 106.7 | 112.0 | 2.5 | 6.68x | 843 | 980 | 264 |
| Previous findPath (linear-scan open list) | 712.2 | 764.7 | 3.2 | 1.00x | 1618 | 1758 | 164 |
| CareRoute findPath (shipped: heap + typed arrays) | 207.1 | 218.4 | 2.2 | 3.44x | 1608 | 1749 | 278 |
| CareRoute + exact turns (not adopted) | 590.7 | 618.8 | 2.7 | 1.21x | 4270 | 4930 | 927 |
| Dijkstra (game costs, no heuristic) | 987.7 | 1043.1 | 2.8 | 0.72x | 7812 | 7905 | 144 |
| Weighted A* w=2 (game costs) | 32.6 | 39.2 | 10.0 | 21.85x | 188 | 314 | 130 |
| Greedy best-first (heuristic only) | 25.2 | 26.1 | 4.8 | 28.30x | 151 | 272 | 122 |
| Bidirectional BFS (unit cost) | 292.8 | 312.7 | 3.0 | 2.43x | 5094 | 5255 | 167 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 107.7 | 118.36 | 3.50 | 5 | 35.60 | 0.00 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 107.7 | 118.40 | 3.57 | 3 | 35.73 | 0.00 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 107.8 | 114.27 | 0.04 | 87 | 21.73 | 0.00 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 107.8 | 114.26 | 0.04 | 88 | 21.70 | 0.00 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 107.8 | 114.23 | 0.00 | 100 | 21.58 | 0.00 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 107.8 | 114.26 | 0.03 | 88 | 21.70 | 0.00 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 116.4 | 126.47 | 10.21 | 8 | 33.52 | 0.00 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 122.5 | 136.79 | 20.15 | 2 | 47.57 | 0.00 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 107.7 | 118.54 | 3.59 | 3 | 36.18 | 0.00 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | 9-20 (n=1) | 21-50 (n=12) | >50 (n=47) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 28.3 · 168 | 97.3 · 1670 | 507.3 · 9425 |
| A* textbook (unit cost, heap) | 8.5 · 13 | 18.0 · 122 | 130.3 · 1045 |
| Previous findPath (linear-scan open list) | 17.4 · 28 | 55.3 · 211 | 894.4 · 2011 |
| CareRoute findPath (shipped: heap + typed arrays) | 8.2 · 28 | 29.9 · 209 | 256.2 · 1999 |
| CareRoute + exact turns (not adopted) | 18.8 · 53 | 76.0 · 465 | 735.6 · 5331 |
| Dijkstra (game costs, no heuristic) | 34.9 · 211 | 230.8 · 1787 | 1198.2 · 9512 |
| Weighted A* w=2 (game costs) | 7.2 · 13 | 16.4 · 79 | 37.3 · 220 |
| Greedy best-first (heuristic only) | 7.6 · 13 | 12.1 · 65 | 28.2 · 176 |
| Bidirectional BFS (unit cost) | 13.3 · 90 | 58.6 · 857 | 358.1 · 6282 |

### maze-41x31
braided maze 41x31: the Manhattan heuristic is misleading, A* degrades toward BFS

200 queries (<=8: 22, 9-20: 69, 21-50: 106, >50: 3) · 21 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 13.5 | 14.5 | 4.8 | 2.54x | 309 | 317 | 13 |
| A* textbook (unit cost, heap) | 13.4 | 14.5 | 4.1 | 2.56x | 175 | 184 | 13 |
| Previous findPath (linear-scan open list) | 34.2 | 35.5 | 2.6 | 1.00x | 192 | 201 | 12 |
| CareRoute findPath (shipped: heap + typed arrays) | 13.9 | 14.8 | 2.8 | 2.46x | 191 | 200 | 13 |
| CareRoute + exact turns (not adopted) | 37.7 | 39.2 | 2.0 | 0.91x | 385 | 414 | 47 |
| Dijkstra (game costs, no heuristic) | 23.7 | 25.2 | 3.4 | 1.44x | 317 | 325 | 14 |
| Weighted A* w=2 (game costs) | 11.2 | 12.1 | 4.9 | 3.05x | 136 | 146 | 12 |
| Greedy best-first (heuristic only) | 7.7 | 9.0 | 6.9 | 4.44x | 95 | 107 | 13 |
| Bidirectional BFS (unit cost) | 10.9 | 11.6 | 3.7 | 3.15x | 206 | 221 | 16 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 48.4 | 52.79 | 0.25 | 81 | 14.49 | 0.00 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 48.4 | 52.85 | 0.33 | 76 | 14.69 | 0.00 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 48.4 | 52.68 | 0.02 | 98 | 14.13 | 0.00 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 48.4 | 52.68 | 0.03 | 97 | 14.13 | 0.00 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 48.4 | 52.67 | 0.00 | 100 | 14.10 | 0.00 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 48.4 | 52.68 | 0.01 | 99 | 14.12 | 0.00 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 49.3 | 53.82 | 2.00 | 67 | 14.98 | 0.00 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 57.2 | 62.74 | 16.57 | 36 | 18.32 | 0.00 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 48.4 | 52.85 | 0.31 | 75 | 14.69 | 0.00 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=22) | 9-20 (n=69) | 21-50 (n=106) | >50 (n=3) |
| :-- | --: | --: | --: | --: |
| BFS (unit cost) | 4.6 · 77 | 10.5 · 236 | 16.4 · 397 | 27.8 · 555 |
| A* textbook (unit cost, heap) | 4.0 · 40 | 9.3 · 120 | 17.3 · 232 | 31.6 · 388 |
| Previous findPath (linear-scan open list) | 9.1 · 45 | 24.1 · 135 | 44.7 · 254 | 76.5 · 404 |
| CareRoute findPath (shipped: heap + typed arrays) | 4.2 · 45 | 9.9 · 134 | 18.1 · 253 | 31.3 · 403 |
| CareRoute + exact turns (not adopted) | 10.2 · 86 | 26.4 · 266 | 49.1 · 513 | 87.6 · 832 |
| Dijkstra (game costs, no heuristic) | 6.9 · 85 | 18.4 · 246 | 29.6 · 405 | 43.2 · 557 |
| Weighted A* w=2 (game costs) | 3.6 · 36 | 7.4 · 93 | 14.3 · 179 | 28.8 · 322 |
| Greedy best-first (heuristic only) | 2.9 · 30 | 6.0 · 75 | 9.6 · 121 | 13.4 · 130 |
| Bidirectional BFS (unit cost) | 3.3 · 50 | 8.1 · 148 | 13.7 · 271 | 24.5 · 404 |

### maze-121x91
braided maze 121x91

60 queries (9-20: 2, 21-50: 18, >50: 40) · 9 timed passes · parity shipped findPath vs mirror: ok · exact-turn A* optimal on every query: yes

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 147.2 | 149.5 | 1.7 | 2.10x | 2627 | 2659 | 44 |
| A* textbook (unit cost, heap) | 111.8 | 120.2 | 2.8 | 2.76x | 1176 | 1208 | 43 |
| Previous findPath (linear-scan open list) | 308.8 | 322.0 | 2.0 | 1.00x | 1328 | 1360 | 41 |
| CareRoute findPath (shipped: heap + typed arrays) | 124.9 | 128.2 | 2.0 | 2.47x | 1326 | 1359 | 44 |
| CareRoute + exact turns (not adopted) | 320.0 | 331.1 | 1.5 | 0.97x | 2768 | 2849 | 138 |
| Dijkstra (game costs, no heuristic) | 257.4 | 266.1 | 1.5 | 1.20x | 2662 | 2693 | 46 |
| Weighted A* w=2 (game costs) | 51.7 | 58.4 | 4.6 | 5.98x | 518 | 547 | 32 |
| Greedy best-first (heuristic only) | 30.5 | 32.8 | 6.1 | 10.14x | 293 | 323 | 32 |
| Bidirectional BFS (unit cost) | 88.0 | 91.4 | 1.8 | 3.51x | 1458 | 1506 | 51 |

**Path quality** (all paths scored with the game cost model: turn +0.3, foreign room tile +2, occupied tile +4)

| Algorithm | valid % | steps | game cost | cost overhead vs best % | optimal % | turns | room tiles crossed | crowd collisions |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 100 | 124.3 | 135.92 | 0.25 | 62 | 38.72 | 0.00 | 0.00 |
| A* textbook (unit cost, heap) | 100 | 124.3 | 135.86 | 0.22 | 60 | 38.53 | 0.00 | 0.00 |
| Previous findPath (linear-scan open list) | 100 | 124.3 | 135.53 | 0.00 | 100 | 37.43 | 0.00 | 0.00 |
| CareRoute findPath (shipped: heap + typed arrays) | 100 | 124.3 | 135.53 | 0.00 | 100 | 37.43 | 0.00 | 0.00 |
| CareRoute + exact turns (not adopted) | 100 | 124.3 | 135.53 | 0.00 | 100 | 37.43 | 0.00 | 0.00 |
| Dijkstra (game costs, no heuristic) | 100 | 124.3 | 135.53 | 0.00 | 100 | 37.43 | 0.00 | 0.00 |
| Weighted A* w=2 (game costs) | 100 | 128.0 | 139.86 | 2.93 | 40 | 39.65 | 0.00 | 0.00 |
| Greedy best-first (heuristic only) | 100 | 168.7 | 185.24 | 34.05 | 7 | 55.03 | 0.00 | 0.00 |
| Bidirectional BFS (unit cost) | 100 | 124.3 | 135.87 | 0.22 | 72 | 38.57 | 0.00 | 0.00 |

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | 9-20 (n=2) | 21-50 (n=18) | >50 (n=40) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 97.5 · 1438 | 72.7 · 1304 | 177.9 · 3281 |
| A* textbook (unit cost, heap) | 72.7 · 554 | 43.8 · 428 | 143.2 · 1544 |
| Previous findPath (linear-scan open list) | 148.6 · 613 | 96.8 · 491 | 409.8 · 1741 |
| CareRoute findPath (shipped: heap + typed arrays) | 83.8 · 610 | 51.0 · 490 | 160.2 · 1739 |
| CareRoute + exact turns (not adopted) | 194.8 · 1271 | 120.9 · 1004 | 414.7 · 3637 |
| Dijkstra (game costs, no heuristic) | 173.7 · 1458 | 132.5 · 1349 | 317.0 · 3313 |
| Weighted A* w=2 (game costs) | 43.2 · 355 | 25.8 · 249 | 63.9 · 647 |
| Greedy best-first (heuristic only) | 26.6 · 208 | 18.2 · 176 | 33.7 · 350 |
| Bidirectional BFS (unit cost) | 38.6 · 472 | 37.4 · 560 | 111.2 · 1911 |

### unreachable-goal
goal sealed behind a wall ring (no path exists): cost of reporting failure

200 queries (<=8: 22, 9-20: 89, 21-50: 89) · 21 timed passes · parity shipped findPath vs mirror: ok

**Speed and work** (per query)

| Algorithm | median µs | p95 µs | ±σ % | speedup vs previous | nodes expanded | nodes discovered | peak frontier |
| :-- | --: | --: | --: | --: | --: | --: | --: |
| BFS (unit cost) | 34.2 | 37.5 | 3.5 | 8.67x | 1175 | 1175 | 40 |
| A* textbook (unit cost, heap) | 97.4 | 100.9 | 1.7 | 3.04x | 1175 | 1175 | 116 |
| Previous findPath (linear-scan open list) | 296.2 | 301.5 | 1.4 | 1.00x | 1175 | 1175 | 80 |
| CareRoute findPath (shipped: heap + typed arrays) | 127.0 | 130.5 | 3.1 | 2.33x | 1175 | 1175 | 132 |
| CareRoute + exact turns (not adopted) | 511.8 | 519.9 | 0.9 | 0.58x | 4541 | 4541 | 401 |
| Dijkstra (game costs, no heuristic) | 116.9 | 119.1 | 1.2 | 2.53x | 1175 | 1175 | 71 |
| Weighted A* w=2 (game costs) | 119.6 | 123.9 | 1.6 | 2.48x | 1175 | 1175 | 88 |
| Greedy best-first (heuristic only) | 123.6 | 127.9 | 2.7 | 2.40x | 1175 | 1175 | 116 |
| Bidirectional BFS (unit cost) | 0.7 | 0.9 | 16.3 | 429.76x | 14 | 21 | 11 |

**Correctness**: BFS (unit cost): null on all (correct) · A* textbook (unit cost, heap): null on all (correct) · Previous findPath (linear-scan open list): null on all (correct) · CareRoute findPath (shipped: heap + typed arrays): null on all (correct) · CareRoute + exact turns (not adopted): null on all (correct) · Dijkstra (game costs, no heuristic): null on all (correct) · Weighted A* w=2 (game costs): null on all (correct) · Greedy best-first (heuristic only): null on all (correct) · Bidirectional BFS (unit cost): null on all (correct)

**By path distance** (Manhattan distance start→goal): median µs/query · nodes expanded

| Algorithm | <=8 (n=22) | 9-20 (n=89) | 21-50 (n=89) |
| :-- | --: | --: | --: |
| BFS (unit cost) | 34.7 · 1175 | 33.7 · 1175 | 33.5 · 1175 |
| A* textbook (unit cost, heap) | 94.9 · 1175 | 94.9 · 1175 | 99.3 · 1175 |
| Previous findPath (linear-scan open list) | 304.6 · 1175 | 297.2 · 1175 | 291.5 · 1175 |
| CareRoute findPath (shipped: heap + typed arrays) | 131.8 · 1175 | 125.6 · 1175 | 127.5 · 1175 |
| CareRoute + exact turns (not adopted) | 502.5 · 4541 | 509.3 · 4541 | 514.9 · 4541 |
| Dijkstra (game costs, no heuristic) | 125.3 · 1175 | 117.8 · 1175 | 112.3 · 1175 |
| Weighted A* w=2 (game costs) | 125.9 · 1175 | 118.9 · 1175 | 118.3 · 1175 |
| Greedy best-first (heuristic only) | 123.0 · 1175 | 122.4 · 1175 | 124.7 · 1175 |
| Bidirectional BFS (unit cost) | 0.9 · 14 | 0.7 · 14 | 0.6 · 14 |

## Summary: speedup vs previous findPath (median, >1 is faster)

| Scenario | BFS (unit cost) | A* textbook (unit cost, heap) | Previous findPath (linear-scan open list) | CareRoute findPath (shipped: heap + typed arrays) | CareRoute + exact turns (not adopted) | Dijkstra (game costs, no heuristic) | Weighted A* w=2 (game costs) | Greedy best-first (heuristic only) | Bidirectional BFS (unit cost) |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| shelter-T1 | 2.01x | 5.37x | 1.00x | 2.86x | 1.59x | 0.78x | 3.66x | 4.18x | 3.47x |
| shelter-T2 | 2.08x | 7.40x | 1.00x | 2.81x | 1.35x | 0.63x | 4.38x | 5.53x | 3.11x |
| shelter-T3 | 2.34x | 9.95x | 1.00x | 2.72x | 1.18x | 0.66x | 5.53x | 7.17x | 3.14x |
| shelter-T4 | 2.11x | 11.07x | 1.00x | 2.61x | 1.16x | 0.58x | 5.96x | 7.90x | 2.84x |
| shelter-T4-crowd30 | 3.18x | 14.88x | 1.00x | 1.71x | 0.76x | 0.42x | 4.06x | 5.22x | 4.29x |
| shelter-T4-crowd80 | 3.90x | 19.01x | 1.00x | 1.72x | 0.70x | 0.53x | 4.19x | 6.28x | 5.26x |
| open-40x30 | 1.44x | 9.23x | 1.00x | 7.58x | 4.80x | 0.41x | 7.93x | 8.47x | 1.84x |
| open-160x120 | 3.05x | 75.61x | 1.00x | 61.03x | 37.55x | 0.89x | 69.21x | 68.68x | 4.15x |
| scatter25-40x30 | 1.46x | 3.38x | 1.00x | 2.36x | 0.98x | 0.64x | 5.09x | 5.62x | 1.98x |
| scatter25-160x120 | 1.71x | 6.68x | 1.00x | 3.44x | 1.21x | 0.72x | 21.85x | 28.30x | 2.43x |
| maze-41x31 | 2.54x | 2.56x | 1.00x | 2.46x | 0.91x | 1.44x | 3.05x | 4.44x | 3.15x |
| maze-121x91 | 2.10x | 2.76x | 1.00x | 2.47x | 0.97x | 1.20x | 5.98x | 10.14x | 3.51x |
| unreachable-goal | 8.67x | 3.04x | 1.00x | 2.33x | 0.58x | 2.53x | 2.48x | 2.40x | 429.76x |
| **geometric mean** | **2.47x** | **7.84x** | **1.00x** | **3.43x** | **1.48x** | **0.77x** | **6.30x** | **7.85x** | **4.57x** |

## Summary: nodes expanded relative to previous (lower = less work)

| Scenario | BFS (unit cost) | A* textbook (unit cost, heap) | Previous findPath (linear-scan open list) | CareRoute findPath (shipped: heap + typed arrays) | CareRoute + exact turns (not adopted) | Dijkstra (game costs, no heuristic) | Weighted A* w=2 (game costs) | Greedy best-first (heuristic only) | Bidirectional BFS (unit cost) |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| shelter-T1 | 3.27 | 0.47 | 1.00 | 0.86 | 1.22 | 3.30 | 0.53 | 0.47 | 1.96 |
| shelter-T2 | 4.08 | 0.37 | 1.00 | 0.86 | 1.44 | 4.11 | 0.44 | 0.37 | 2.53 |
| shelter-T3 | 3.92 | 0.28 | 1.00 | 0.91 | 1.78 | 3.89 | 0.35 | 0.28 | 2.56 |
| shelter-T4 | 4.63 | 0.26 | 1.00 | 0.95 | 1.85 | 4.55 | 0.33 | 0.26 | 3.02 |
| shelter-T4-crowd30 | 4.62 | 0.27 | 1.00 | 0.95 | 1.93 | 4.52 | 0.35 | 0.27 | 2.95 |
| shelter-T4-crowd80 | 3.82 | 0.23 | 1.00 | 0.97 | 2.19 | 3.65 | 0.35 | 0.23 | 2.48 |
| open-40x30 | 8.00 | 0.33 | 1.00 | 0.43 | 0.43 | 8.42 | 0.33 | 0.33 | 5.18 |
| open-160x120 | 15.75 | 0.16 | 1.00 | 0.21 | 0.21 | 15.92 | 0.16 | 0.16 | 10.85 |
| scatter25-40x30 | 3.78 | 0.64 | 1.00 | 0.98 | 2.02 | 3.95 | 0.39 | 0.34 | 2.41 |
| scatter25-160x120 | 4.77 | 0.52 | 1.00 | 0.99 | 2.64 | 4.83 | 0.12 | 0.09 | 3.15 |
| maze-41x31 | 1.61 | 0.91 | 1.00 | 0.99 | 2.00 | 1.65 | 0.71 | 0.50 | 1.07 |
| maze-121x91 | 1.98 | 0.89 | 1.00 | 1.00 | 2.08 | 2.00 | 0.39 | 0.22 | 1.10 |
| unreachable-goal | 1.00 | 1.00 | 1.00 | 1.00 | 3.86 | 1.00 | 1.00 | 1.00 | 0.01 |

## Summary: mean game-cost overhead vs best path, % (0 = optimal; BFS/textbook ignore the cost model)

| Scenario | BFS (unit cost) | A* textbook (unit cost, heap) | Previous findPath (linear-scan open list) | CareRoute findPath (shipped: heap + typed arrays) | CareRoute + exact turns (not adopted) | Dijkstra (game costs, no heuristic) | Weighted A* w=2 (game costs) | Greedy best-first (heuristic only) | Bidirectional BFS (unit cost) |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| shelter-T1 | 28.63 | 28.63 | 0.26 | 0.30 | 0.00 | 0.20 | 3.11 | 28.63 | 29.62 |
| shelter-T2 | 35.36 | 35.36 | 0.35 | 0.37 | 0.00 | 0.33 | 7.66 | 35.36 | 34.22 |
| shelter-T3 | 36.07 | 36.07 | 0.34 | 0.33 | 0.00 | 0.29 | 8.58 | 36.07 | 40.73 |
| shelter-T4 | 46.50 | 46.50 | 0.40 | 0.34 | 0.00 | 0.29 | 9.37 | 46.50 | 47.21 |
| shelter-T4-crowd30 | 51.84 | 51.84 | 0.36 | 0.34 | 0.00 | 0.30 | 7.47 | 51.84 | 53.77 |
| shelter-T4-crowd80 | 61.97 | 61.97 | 0.34 | 0.33 | 0.00 | 0.31 | 7.29 | 61.97 | 63.25 |
| open-40x30 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.62 |
| open-160x120 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 0.17 |
| scatter25-40x30 | 3.08 | 3.27 | 0.25 | 0.26 | 0.00 | 0.23 | 5.12 | 12.39 | 3.19 |
| scatter25-160x120 | 3.50 | 3.57 | 0.04 | 0.04 | 0.00 | 0.03 | 10.21 | 20.15 | 3.59 |
| maze-41x31 | 0.25 | 0.33 | 0.02 | 0.03 | 0.00 | 0.01 | 2.00 | 16.57 | 0.31 |
| maze-121x91 | 0.25 | 0.22 | 0.00 | 0.00 | 0.00 | 0.00 | 2.93 | 34.05 | 0.22 |

### Room selection · shelter-T2

80 queries (random start tile × random need) · 13 rooms · 0 residents · 15 timed passes

| Algorithm | median µs | p95 µs | speedup vs previous | nodes expanded | peak frontier | finds a room % | picks the best room % | mean regret (cost units) | mean path steps |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| Previous findNearestRoom (one linear A* per room) | 24.9 | 29.3 | 1.00x | 70 | - | 100 | 89 | 0.15 | 8.8 |
| BFS flood to nearest room (steps only) | 4.0 | 5.6 | 6.30x | 52 | 14 | 100 | 76 | 0.43 | 6.3 |
| CareRoute Match (shipped, jitter 0-4 as in game) | 28.6 | 34.4 | 0.87x | 57 | 29 | 100 | 98 | 0.02 | 8.9 |
| CareRoute Match (shipped, no jitter) | 25.8 | 29.6 | 0.97x | 58 | 29 | 100 | 98 | 0.03 | 9.0 |

Path ends inside the chosen room: yes, for every result of every method

### Room selection · shelter-T4

80 queries (random start tile × random need) · 39 rooms · 0 residents · 15 timed passes

| Algorithm | median µs | p95 µs | speedup vs previous | nodes expanded | peak frontier | finds a room % | picks the best room % | mean regret (cost units) | mean path steps |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| Previous findNearestRoom (one linear A* per room) | 130.6 | 135.2 | 1.00x | 428 | - | 100 | 94 | 0.09 | 7.7 |
| BFS flood to nearest room (steps only) | 4.4 | 6.2 | 29.61x | 53 | 13 | 100 | 88 | 0.37 | 5.4 |
| CareRoute Match (shipped, jitter 0-4 as in game) | 36.1 | 37.0 | 3.62x | 65 | 32 | 100 | 95 | 0.05 | 7.9 |
| CareRoute Match (shipped, no jitter) | 33.5 | 38.0 | 3.90x | 63 | 32 | 100 | 95 | 0.08 | 7.7 |

Path ends inside the chosen room: yes, for every result of every method

### Room selection · shelter-T4-crowd30

80 queries (random start tile × random need) · 39 rooms · 30 residents · 15 timed passes

| Algorithm | median µs | p95 µs | speedup vs previous | nodes expanded | peak frontier | finds a room % | picks the best room % | mean regret (cost units) | mean path steps |
| :-- | --: | --: | --: | --: | --: | --: | --: | --: | --: |
| Previous findNearestRoom (one linear A* per room) | 206.5 | 239.1 | 1.00x | 428 | - | 100 | 83 | 0.40 | 8.1 |
| BFS flood to nearest room (steps only) | 5.0 | 6.9 | 40.92x | 55 | 14 | 100 | 84 | 0.30 | 5.5 |
| CareRoute Match (shipped, jitter 0-4 as in game) | 63.9 | 77.0 | 3.23x | 70 | 33 | 100 | 93 | 0.09 | 7.9 |
| CareRoute Match (shipped, no jitter) | 60.0 | 69.9 | 3.44x | 70 | 33 | 100 | 98 | 0.04 | 7.8 |

Path ends inside the chosen room: yes, for every result of every method

## Method and caveats

- **Timing**: each pass times a whole batch of queries with `performance.now()`, then divides by query count. Algorithms are interleaved per pass, `gc()` runs before each batch (when `--expose-gc`), and warm-up passes are discarded. The reported figure is the median across passes; p95 and ±σ show the noise.
- **Work counters are implementation-independent.** "Nodes expanded" is the honest measure of algorithmic work. Microsecond figures also include data-structure effects: the repo version uses object nodes, `Map`/`Set` and a linear-scan open list, while the rewrites use typed arrays and a heap. So "+ heap" shows what a rewrite buys in total, not the heap alone.
- **Peak frontier** is the largest open set/queue. For heap rows it includes stale duplicates (lazy deletion), so it slightly overstates the live frontier.
- **Fairness of BFS/textbook A\***: they ignore the cost model, so they are fastest but pay in game cost (extra turns, rooms crossed, crowd collisions). Every path from every algorithm is re-scored with the game cost model, which is what the "cost overhead" columns report.
- **Residents** are static in these runs. Real residents move, so crowd costs change between calls; here they isolate the algorithm cost, not the dynamics.
- **Room selection**: each candidate room has a best price = min over its tiles of (exact game path cost + 2×occupancy); "regret" = chosen room's price minus the best room's price, so the random tile a method walks to inside a room does not count. Rows with jitter (0-4 random per room, the game's setting) pick off-optimum on purpose to spread residents. "Expanded" for shipped rows = the multi-goal room search (instrumented mirror; exact for the no-jitter row) plus the search to the returned tile.
- Parity: the instrumented copy of `findPath` is compared to the real one on every query; any mismatch is printed in bold above.
