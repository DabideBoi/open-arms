# CareRoute Benchmark: All Tables

Every table from [PATHFINDING_BENCHMARK.md](PATHFINDING_BENCHMARK.md), collected in one place with section headings and table captions only. Method, caveats and discussion are in that document; raw output is in [PATHFINDING_BENCHMARK_RAW.md](PATHFINDING_BENCHMARK_RAW.md). Reproduce with `npm run bench:path`.


## 1. Summary

| Question | Answer |
|:--|:--|
| Do we need the shelter cost model, or would plain A\*/BFS do? | We need it. Plain A\* and BFS produce routes that cost **29-62% more** in game terms on shelter maps, cross about **6 room tiles per trip** where CareRoute crosses about **0.4**, and with 80 residents present walk through occupied tiles about **1.9 times per trip** where CareRoute does about **0.1**. |
| Is CareRoute slower than textbook A\*? | Yes, 2-11x slower on shelter maps (about 2x at tier 1, 4x at tier 4, 11x with 80 residents), because it works harder to avoid rooms and crowds. In absolute terms a search is 2-22 µs on a shelter grid. |
| How good are its paths under its own costs? | Within 0.4% of the best path on shelter maps (mean overhead 0.30-0.37%); the best path in 79-89% of queries. |
| How much faster is it than the code it replaced? | `findPath`: **2.6x** at tier 4 (22.9 → 8.7 µs), 1.7x with 80 residents, **3.4x** geometric mean over all 13 maps, 61x on a 160x120 map. Paths are the same to within 0.1%. |
| How does it compare with other algorithms? | Among the algorithms whose routes stay within 0.4% of the best, it is the fastest. Faster ones (textbook A\*, greedy, bidirectional BFS, weighted A\*) cross about 4-15x more room tiles or collide about 3-19x more; the one other algorithm with equal route quality (Dijkstra) does 4.8x the work. See section 5.7. |
| What about room choice (CareRoute Match)? | **3.6x faster at tier 4** (131 → 36 µs), 3.2x with 30 residents. Slightly slower at tier 2 (0.87x). It picks the best room as often or more often: 95% vs 94% at tier 4, **93% vs 83%** with 30 residents, 98% vs 89% at tier 2. |


## 2. What was compared

| Label | What it is |
|:--|:--|
| **BFS** | Breadth-first search, unit step cost, no heuristic. |
| **A\* textbook** | A\* with Manhattan heuristic and unit step cost, binary heap. |
| **Previous findPath** | The pre-CareRoute code, preserved as an instrumented copy in the benchmark: same cost model, linear-scan open list, object nodes, `Map`/`Set`. |
| **CareRoute findPath** | The shipped `findPath`: same cost model, binary heap, typed arrays. |
| **Exact turns** | CareRoute plus the arrival direction in the search state, so the turn penalty is exactly optimal. Not adopted (section 5.5). |
| **Dijkstra** | Same shelter costs, no heuristic: expands in order of cost so far. Optimal per tile; the quality reference. |
| **Weighted A\* (w=2)** | Same shelter costs, heuristic doubled: explores less, may return a costlier route (bounded at 2x). |
| **Greedy best-first** | Orders by the heuristic alone and ignores cost so far. Fast, no optimality. |
| **Bidirectional BFS** | Unit cost; floods from start and goal at once and stops when the floods meet. |

| Label | What it is |
|:--|:--|
| **Previous findNearestRoom** | One linear-scan A\* per open room of the type, to a random free tile, scored by steps + 2 x occupancy + jitter 0-4. |
| **BFS flood** | One flood from the start until any candidate room is reached. Nearest by steps; ignores crowds. |
| **CareRoute Match** | The shipped `findNearestRoom`. One multi-goal search chooses the room, then one `findPath` to a free tile inside it. Shown with the game's jitter (0-4) and without. |


### 3.1 Cost model

| Situation | Extra cost | Effect |
|:--|--:|:--|
| Changing direction | +0.3 | Straight runs over zig-zags |
| Tile of a room that is neither the start nor goal room | +2 | Open floor over cutting through rooms |
| Tile held by another resident (not the goal tile) | +4 | Bend around crowds |
| Same, with `hardBlock` | impassable | Re-route after getting stuck |


### 5.1 Speed relative to the previous `findPath` (median, higher is faster)

| Map | BFS | A\* textbook | Previous | **CareRoute** | Exact turns |
|:--|--:|--:|--:|--:|--:|
| shelter T1 | 2.01x | 5.37x | 1.00x | **2.86x** | 1.59x |
| shelter T2 | 2.08x | 7.40x | 1.00x | **2.81x** | 1.35x |
| shelter T3 | 2.34x | 9.95x | 1.00x | **2.72x** | 1.18x |
| shelter T4 | 2.11x | 11.07x | 1.00x | **2.61x** | 1.16x |
| shelter T4, 30 residents | 3.18x | 14.88x | 1.00x | **1.71x** | 0.76x |
| shelter T4, 80 residents | 3.90x | 19.01x | 1.00x | **1.72x** | 0.70x |
| open 40x30 | 1.44x | 9.23x | 1.00x | **7.58x** | 4.80x |
| open 160x120 | 3.05x | 75.61x | 1.00x | **61.03x** | 37.55x |
| obstacles 40x30 | 1.46x | 3.38x | 1.00x | **2.36x** | 0.98x |
| obstacles 160x120 | 1.71x | 6.68x | 1.00x | **3.44x** | 1.21x |
| maze 41x31 | 2.54x | 2.56x | 1.00x | **2.46x** | 0.91x |
| maze 121x91 | 2.10x | 2.76x | 1.00x | **2.47x** | 0.97x |
| unreachable goal | 8.67x | 3.04x | 1.00x | **2.33x** | 0.58x |
| **geometric mean** | 2.47x | 7.84x | 1.00x | **3.43x** | 1.48x |


### 5.2 Work, independent of hardware

| Map | BFS | A\* textbook | **CareRoute** | Exact turns |
|:--|--:|--:|--:|--:|
| shelter T1 | 3.27 | 0.47 | **0.86** | 1.22 |
| shelter T2 | 4.08 | 0.37 | **0.86** | 1.44 |
| shelter T3 | 3.92 | 0.28 | **0.91** | 1.78 |
| shelter T4 | 4.63 | 0.26 | **0.95** | 1.85 |
| shelter T4, 30 residents | 4.62 | 0.27 | **0.95** | 1.93 |
| shelter T4, 80 residents | 3.82 | 0.23 | **0.97** | 2.19 |
| open 40x30 | 8.00 | 0.33 | **0.43** | 0.43 |
| open 160x120 | 15.75 | 0.16 | **0.21** | 0.21 |
| obstacles 40x30 | 3.78 | 0.64 | **0.98** | 2.02 |
| obstacles 160x120 | 4.77 | 0.52 | **0.99** | 2.64 |
| maze 41x31 | 1.61 | 0.91 | **0.99** | 2.00 |
| maze 121x91 | 1.98 | 0.89 | **1.00** | 2.08 |
| unreachable goal | 1.00 | 1.00 | **1.00** | 3.86 |


### 5.3 Route quality, scored with the game's costs

| Map | BFS | A\* textbook | Previous | **CareRoute** | Exact turns |
|:--|--:|--:|--:|--:|--:|
| shelter T1 | 28.63 | 28.63 | 0.26 | **0.30** | 0.00 |
| shelter T2 | 35.36 | 35.36 | 0.35 | **0.37** | 0.00 |
| shelter T3 | 36.07 | 36.07 | 0.34 | **0.33** | 0.00 |
| shelter T4 | 46.50 | 46.50 | 0.40 | **0.34** | 0.00 |
| shelter T4, 30 residents | 51.84 | 51.84 | 0.36 | **0.34** | 0.00 |
| shelter T4, 80 residents | 61.97 | 61.97 | 0.34 | **0.33** | 0.00 |
| obstacles 40x30 | 3.08 | 3.27 | 0.25 | **0.26** | 0.00 |
| obstacles 160x120 | 3.50 | 3.57 | 0.04 | **0.04** | 0.00 |
| maze 41x31 | 0.25 | 0.33 | 0.02 | **0.03** | 0.00 |
| maze 121x91 | 0.25 | 0.22 | 0.00 | **0.00** | 0.00 |


### 5.4 What the cost model buys (per route)

| | BFS / textbook A\* | **CareRoute** |
|:--|--:|--:|
| Room tiles crossed, tier 4 | 6.59 | **0.45** |
| Room tiles crossed, tier 4, 80 residents | 6.07 | **1.21** |
| Resident collisions, 30 residents | 0.79 | **0.01** |
| Resident collisions, 80 residents | 1.91 | **0.10** |
| Best path under game costs, tier 4 (80 residents) | 14% (10%) | **83% (80%)** |
| Turns, tier 4 | 0.93 | 3.35 |


### 5.7 Comparison with other pathfinding algorithms

| Algorithm | Uses shelter costs | Speed, tier 4 (vs previous) | Speed, mean of 13 maps | Nodes expanded, tier 4 | Route cost over best, tier 4 | Room tiles per trip, tier 4 | Collisions per trip, 80 residents |
|:--|:--|--:|--:|--:|--:|--:|--:|
| BFS | no | 2.11x | 2.47x | 336 | 46.50% | 6.59 | 1.91 |
| Bidirectional BFS | no | 2.84x | 4.57x | 219 | 47.21% | 6.60 | 1.94 |
| A\* textbook | no | 11.07x | 7.84x | 19 | 46.50% | 6.59 | 1.91 |
| Greedy best-first | no | 7.90x | 7.85x | 19 | 46.50% | 6.59 | 1.91 |
| Weighted A\* (w=2) | yes | 5.96x | 6.30x | 24 | 9.37% | 1.96 | 0.28 |
| Dijkstra | yes | 0.58x | 0.77x | 330 | 0.29% | 0.44 | 0.11 |
| **CareRoute** | yes | **2.61x** | **3.43x** | **69** | **0.34%** | **0.45** | **0.10** |
| CareRoute + exact turns | yes | 1.16x | 1.48x | 134 | 0.00% | 0.44 | 0.10 |

**Description of results.** Table 5.7 compares eight path-search algorithms on the tier-4 shelter layout (39 rooms; 200 queries; 80 static residents for the collision column) and reports mean speed over all 13 evaluation maps. Speed is expressed relative to the previous implementation of `findPath`; route cost, room tiles crossed and collisions are measured with the shelter cost model whether or not an algorithm uses it during search.

Algorithms that do not use shelter costs formed a homogeneous group in route quality. Breadth-first search (BFS), bidirectional BFS, textbook A\* and greedy best-first search produced routes 46.50-47.21% costlier than the best route found, crossed 6.59-6.60 room tiles per trip, and incurred 1.91-1.94 collisions per trip at 80 residents. Their speed differed by a factor of five (2.11x to 11.07x at tier 4), so, within the tested maps, route quality was determined by the cost model and not by the search strategy. Greedy best-first search returned routes identical to those of textbook A\* on the shelter maps. Bidirectional BFS expanded about one third fewer nodes than BFS (219 vs 336) without improving route quality.

Among algorithms that use shelter costs, speed and route quality traded off. Weighted A\* (w = 2) was the fastest (5.96x at tier 4; 6.30x mean) and expanded 24 nodes, but its routes were 9.37% costlier than the best, crossed 1.96 room tiles per trip (4.4 times CareRoute's 0.45) and incurred 0.28 collisions per trip (2.8 times CareRoute's 0.10). Dijkstra's algorithm produced routes of comparable cost to CareRoute's (0.29% vs 0.34% over best; 0.44 vs 0.45 room tiles; 0.11 vs 0.10 collisions) but expanded 330 nodes against CareRoute's 69 and was slower than the previous implementation (0.58x), whereas CareRoute was 2.61x faster. The exact-turn variant returned the best route on every query (0.00%) at 134 expansions and 1.16x speed, about twice the work of CareRoute.

CareRoute therefore occupied an intermediate position: 0.34% over the best route found, 0.45 room tiles and 0.10 collisions per trip, at 2.61x speed on tier 4 and 3.43x averaged over the 13 maps. It was not the fastest algorithm (textbook A\*, greedy best-first search and weighted A\* were faster) and not the most accurate (Dijkstra and the exact-turn variant had lower route cost), but of the three algorithms in the table with route cost under 1% (CareRoute, Dijkstra and the exact-turn variant), it was the fastest, with the lowest or equal-lowest collision count (0.10, against 0.11 and 0.10).

These results should be read with three limitations. First, route cost is computed with the same weights that CareRoute optimises (turn 0.3, foreign room 2, occupied tile 4), which favours the algorithms that use them; room tiles and collisions do not depend on those weights. Second, weighted A\* was evaluated at a single weight, so a smaller weight may narrow its quality gap while keeping part of its speed advantage. Third, residents were static and layouts were randomly generated, and timings come from a single machine; expansion counts, route cost and behavioural counts are deterministic given the seeds.


## 6. Room choice results

**Tier 2 (13 rooms)**

| Method | µs | vs previous | Nodes expanded | Best room | Regret |
|:--|--:|--:|--:|--:|--:|
| Previous findNearestRoom | 24.9 | 1.00x | 70 | 89% | 0.15 |
| BFS flood | 4.0 | 6.30x | 52 | 76% | 0.43 |
| **CareRoute Match** (jitter 0-4) | 28.6 | **0.87x** | 57 | **98%** | **0.02** |
| CareRoute Match (no jitter) | 25.8 | 0.97x | 58 | 98% | 0.03 |

**Tier 4 (39 rooms)**

| Method | µs | vs previous | Nodes expanded | Best room | Regret |
|:--|--:|--:|--:|--:|--:|
| Previous findNearestRoom | 130.6 | 1.00x | 428 | 94% | 0.09 |
| BFS flood | 4.4 | 29.61x | 53 | 88% | 0.37 |
| **CareRoute Match** (jitter 0-4) | 36.1 | **3.62x** | 65 | **95%** | **0.05** |
| CareRoute Match (no jitter) | 33.5 | 3.90x | 63 | 95% | 0.08 |

**Tier 4, 30 residents**

| Method | µs | vs previous | Nodes expanded | Best room | Regret |
|:--|--:|--:|--:|--:|--:|
| Previous findNearestRoom | 206.5 | 1.00x | 428 | 83% | 0.40 |
| BFS flood | 5.0 | 40.92x | 55 | 84% | 0.30 |
| **CareRoute Match** (jitter 0-4) | 63.9 | **3.23x** | 70 | **93%** | **0.09** |
| CareRoute Match (no jitter) | 60.0 | 3.44x | 70 | 98% | 0.04 |
