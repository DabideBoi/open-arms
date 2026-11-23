# CareRoute: Cost-Aware A\* Pathfinding and Single-Search Room Selection for Crowded Shelter Simulations

**Technical report · Open Arms project · November 2026**

**Keywords:** grid pathfinding, A\*, heuristic search, crowd-aware routing, multi-goal search, simulation games, empirical evaluation

---

## Abstract

Grid pathfinders for games usually minimise path length. In a shelter-management simulation this objective yields routes that cross other residents' rooms and collide with crowds. We describe CareRoute, a 4-connected A\* variant whose step cost penalises direction changes, traversal of rooms that are neither origin nor destination, and tiles held by other agents, together with a multi-goal formulation that selects the best room of a required type in a single search instead of one search per candidate. We evaluate CareRoute against seven alternatives (breadth-first search, bidirectional breadth-first search, textbook A\*, greedy best-first search, Dijkstra's algorithm, weighted A\* and an exact-turn A\* variant) and against the implementation it replaced, on 13 maps comprising real game layouts at four shelter tiers, crowded layouts, and synthetic open, obstacle and maze grids. On a tier-4 shelter, methods that ignore shelter costs produce routes 46–47% costlier than the best found and cross 6.6 room tiles per trip, against 0.45 for CareRoute. CareRoute's routes are within 0.34% of the best found, and it expands 69 nodes against 330 for Dijkstra's algorithm, which attains comparable route quality. Weighted A\* (w = 2) is faster but produces routes 9.4% costlier. Among the eight tested algorithms, CareRoute lies on the empirical speed–quality Pareto front. Single-search room selection is 3.6× faster than the previous per-room search at tier 4 and selects the best room more often under crowding (93% vs 83%), but is slightly slower at tier 2. We discuss limitations: route quality is scored with the system's own cost weights, residents are static in the experiments, and only one weighting of weighted A\* was tested.

---

## 1. Introduction

Shortest-path search on grids is well studied, and A\* [1] with an admissible heuristic is the standard choice when edge costs are uniform or mildly varied. Game pathfinding is commonly benchmarked on large grid maps [5]. The setting studied here differs on both counts. The map is small (40 × 30 tiles), and the cost of a route is not its length. Residents of a shelter simulation sleep, eat and receive care in rooms; a route through another resident's dormitory is socially and visually wrong even if it is shorter. Residents also form crowds at mealtimes, so a route that avoids occupied tiles is preferable to one that ends in a queue.

We make two contributions:

1. **CareRoute**, a cost model for 4-connected A\* with three shelter-specific penalties (§3.1), implemented with a binary heap and typed-array scratch buffers.
2. **Single-search room selection** (§3.2), which treats every open room of a required type as a goal of one A\* search and prices crowding at each room's entry.

Neither is a new search algorithm. The cost model is an instance of A\* with non-uniform step costs, and the room search is multi-goal A\* with goal-specific terminal costs. Our contribution is the combination, its integration in a shipped game, and an empirical comparison under a common scoring rule.

The report answers four questions:

- **RQ1.** Do shelter-specific costs change route quality enough to justify their computational cost?
- **RQ2.** How does CareRoute compare with classical and heuristic alternatives in speed and route quality?
- **RQ3.** Does a single multi-goal search select rooms as well as, and faster than, one search per candidate room?
- **RQ4.** Does the implementation scale if the map grows?

---

## 2. Background and Related Work

**Uninformed search.** Breadth-first search (BFS) [2] finds shortest paths in unweighted graphs; Dijkstra's algorithm [3] generalises this to non-negative edge costs. Bidirectional search runs two frontiers and stops when they meet [4].

**Informed search.** A\* [1] orders expansion by *f = g + h*, where *g* is cost so far and *h* an admissible estimate of the remaining cost, and returns optimal paths. Greedy best-first search [6] orders by *h* alone, trading optimality for speed. Weighted A\* orders by *g + w·h* with *w* > 1 and returns paths at most *w* times costlier than optimal when *h* is admissible, usually with far fewer expansions [4].

**Grid-specific acceleration.** Jump point search [7] prunes symmetric paths on uniform-cost grids; hierarchical methods abstract the map. Both target large maps or uniform costs, and we do not evaluate them (§7).

**Crowds.** Flow-field and continuum methods [8] compute a shared field for many agents with a common goal; steering behaviours [9] resolve local collisions; cooperative pathfinding [10] reserves space-time paths. CareRoute is neither: it plans per agent and encodes crowding as a step-cost term, which is cheap but reactive.

---

## 3. Method

### 3.1 CareRoute cost model

Let *G* be a 4-connected grid of walkable tiles, *s* the start, *g* the goal, and *R(v)* the room occupying tile *v* (or none). For a step from *u* to *v* in direction *d*, with *d′* the direction of the step that reached *u*, the step cost is

> *c(u, v)* = 1 + 0.3 · [*d* ≠ *d′*] + 2 · [*R(v)* ≠ none ∧ *R(v)* ∉ {*R(s)*, *R(g)*}] + 4 · [*v* held by another agent ∧ *v* ≠ *g*]

The terms penalise, respectively, direction changes (preferring straight runs), crossing a room that is neither origin nor destination (preferring open floor), and entering a tile held by another agent (bending around crowds). A `hardBlock` mode treats occupied tiles as impassable, used for re-routing agents that have become blocked.

The heuristic is Manhattan distance. Because every step costs at least 1, the heuristic never overestimates, so it is admissible.

**Optimality caveat.** Search state is the tile alone, not (tile, arrival direction). The turn penalty depends on arrival direction, so the principle of optimality does not hold exactly and returned paths can be marginally suboptimal. We measure this loss in §6.2 and evaluate the exact (tile, direction) alternative as a comparison method.

**Implementation.** The open set is a binary min-heap over typed arrays with lazy deletion, ties broken towards the deeper node. Per-tile state (*g*, parent, direction, visited stamps) lives in preallocated typed arrays shared across searches and invalidated by a stamp counter, so no per-search clearing or object allocation occurs. The previous implementation used object nodes, `Map`/`Set` and a linear scan of the open list; it is retained in the benchmark as a baseline.

### 3.2 Single-search room selection

An agent with a need (sleep, food, care, hygiene, socialising) must choose an open room of the matching type. The previous implementation ran one A\* per candidate room to a random free tile, scored each by path length + 2 · occupancy + jitter *U*(0, 4), and chose the minimum.

Our formulation runs one A\* from the agent's tile toward all candidate rooms, with heuristic *h(v)* equal to the Manhattan distance from *v* to the nearest candidate room's rectangle. The first time the search expands a tile of candidate room *r*, it inserts a terminal entry for *r* with key

> *g(v)* − *refund(v)* + 2 · *occupancy(r)* + *U*(0, 4)

where *refund(v)* returns the +2 and +4 charged for entering *v* (heading to a room is not a detour through it). The first terminal entry removed from the heap identifies the chosen room. A single ordinary A\* search then leads to a free tile inside it.

**Caveat.** The refund can make *h* overestimate by up to 6 on an entry tile, so the choice is not guaranteed optimal. §6.5 measures the effect.

---

## 4. Experimental Design

### 4.1 Maps

Thirteen maps (Table 1). Game layouts are built with the game's own `initializeGrid` and `placeRoom`, which places rooms at random positions until coverage is reached.

**Table 1.** Evaluation maps.

| Group | Maps | Size (tiles) |
|:--|:--|:--|
| Game layouts | Shelter tiers 1–4 | 12² to 26² unlocked in a 40 × 30 grid, 7–39 rooms |
| Crowded layouts | Tier 4 with 30 and 80 static residents | as tier 4 |
| Open | Empty grids | 40 × 30 and 160 × 120 |
| Obstacles | 25% random obstacles | 40 × 30 and 160 × 120 |
| Mazes | Braided mazes (about 8% of walls removed) | 41 × 31 and 121 × 91 |
| Failure case | Goal sealed behind a wall | 40 × 30 |

### 4.2 Queries

Start and goal are drawn uniformly (seeded) from the largest connected region: 200 queries per game-sized map, 60 per 160 × 120 map, 80 per room-selection scenario. Queries do not begin or end on a resident.

### 4.3 Algorithms

**Table 2.** Compared algorithms.

| Algorithm | Step cost | Ordering | Notes |
|:--|:--|:--|:--|
| BFS | unit | FIFO | stops when goal is discovered |
| Bidirectional BFS | unit | FIFO, two frontiers | smaller frontier grown first |
| A\* (textbook) | unit | *g + h* | Manhattan *h*, heap |
| Greedy best-first | not used (ordering ignores *g*) | *h* | routes identical to textbook A\* on shelter maps |
| Weighted A\* | shelter | *g + 2h* | *w* = 2 only |
| Dijkstra | shelter | *g* | no heuristic |
| Exact-turn A\* | shelter | *g + h* | state = (tile, direction) |
| Previous `findPath` | shelter | *g + h* | linear-scan open list, object nodes |
| **CareRoute `findPath`** | shelter | *g + h* | heap, typed arrays |

"Shelter" step cost is the cost of §3.1. For methods that do not use it, paths are still *scored* with it (§4.4), which is the intent of the comparison. Greedy search is listed as not using it because its ordering depends on *h* alone.

### 4.4 Metrics

**Speed.** Median microseconds per query over 21 timed passes (9 for 160 × 120 maps) after 3 discarded warm-up passes. Algorithms are interleaved within each pass, and a garbage collection is forced before each timed batch. We report the median, 95th percentile and coefficient of variation.

**Work.** Nodes expanded, nodes discovered and peak frontier size, which do not depend on hardware.

**Route cost over best.** Each returned path is scored with the §3.1 cost model. For each query, the lowest score among all algorithms is the reference. The overhead of an algorithm on the query is *(cost / best − 1) × 100*, averaged over queries. Because exact-turn A\* is optimal under the model, the reference is the true optimum on every query we verify (§4.6).

**Behavioural counts.** Room tiles crossed per trip (tiles of rooms that are neither origin nor destination), and collisions per trip (steps onto a tile held by another resident). These do not depend on the cost weights.

**Room selection.** For each candidate room, its *best price* is the minimum over its tiles of exact path cost (exact-turn A\*) plus 2 · occupancy. A method is scored on the room it chose: it picks the *best room* if that room has the lowest best price, and its *regret* is the chosen room's best price minus the lowest. Scoring the room rather than the tile walked to avoids penalising the random choice of tile inside a room.

### 4.5 Environment

Node.js v22.23.3 on linux/x64, single thread, `--expose-gc`. All random choices are seeded, so expansion counts, path costs and quality percentages are deterministic; only timings vary between machines.

### 4.6 Integrity checks

Run on every benchmark execution (any failure makes the process exit non-zero):

1. The shipped `findPath` returns the same path as an instrumented mirror used for counting expansions, on every query of all 13 maps (0 mismatches).
2. Exact-turn A\* achieves the minimum cost among all algorithms on every query of the 12 maps that have paths.
3. Every room-selection result ends on a tile inside the room it names.

---

## 5. Results: Path Search

### 5.1 Route quality (RQ1)

**Table 3.** Mean route cost over best (%). Lower is better; 0 is the best route found.

| Map | BFS | A\* (textbook) | Previous | **CareRoute** | Exact turns |
|:--|--:|--:|--:|--:|--:|
| Shelter T1 | 28.63 | 28.63 | 0.26 | **0.30** | 0.00 |
| Shelter T2 | 35.36 | 35.36 | 0.35 | **0.37** | 0.00 |
| Shelter T3 | 36.07 | 36.07 | 0.34 | **0.33** | 0.00 |
| Shelter T4 | 46.50 | 46.50 | 0.40 | **0.34** | 0.00 |
| Shelter T4, 30 residents | 51.84 | 51.84 | 0.36 | **0.34** | 0.00 |
| Shelter T4, 80 residents | 61.97 | 61.97 | 0.34 | **0.33** | 0.00 |
| Obstacles 40 × 30 | 3.08 | 3.27 | 0.25 | **0.26** | 0.00 |
| Obstacles 160 × 120 | 3.50 | 3.57 | 0.04 | **0.04** | 0.00 |
| Maze 41 × 31 | 0.25 | 0.33 | 0.02 | **0.03** | 0.00 |
| Maze 121 × 91 | 0.25 | 0.22 | 0.00 | **0.00** | 0.00 |

On empty grids all methods tie at 0.00. The three effects are as expected: the penalties matter where rooms or crowds exist (shelters), matter little where only turns exist (obstacles, mazes), and vanish where nothing varies (empty grids).

**Table 4.** Behavioural counts per trip.

| | BFS / textbook A\* | CareRoute |
|:--|--:|--:|
| Room tiles crossed, tier 4 | 6.59 | 0.45 |
| Room tiles crossed, tier 4, 80 residents | 6.07 | 1.21 |
| Collisions, tier 4, 30 residents | 0.79 | 0.01 |
| Collisions, tier 4, 80 residents | 1.91 | 0.10 |

CareRoute crosses about 15× fewer room tiles at tier 4 and incurs about 19× fewer collisions at 80 residents. Its routes contain more turns on shelter maps (3.35 vs 0.93 at tier 4), because avoiding rooms costs corners; the turn penalty reduces turns only where no rooms constrain the route (obstacles 40 × 30: 6.90 vs 10.02).

### 5.2 Comparison with alternative algorithms (RQ2)

**Table 5.** All algorithms on the tier-4 shelter, except the "mean" column, which is the geometric mean over all 13 maps. Speed is relative to the previous `findPath` (higher is faster).

| Algorithm | Shelter costs | Speed, T4 | Speed, mean | Nodes, T4 | Cost over best, T4 | Room tiles / trip | Collisions / trip (80 res.) |
|:--|:--|--:|--:|--:|--:|--:|--:|
| BFS | no | 2.11× | 2.47× | 336 | 46.50% | 6.59 | 1.91 |
| Bidirectional BFS | no | 2.84× | 4.57× | 219 | 47.21% | 6.60 | 1.94 |
| A\* (textbook) | no | 11.07× | 7.84× | 19 | 46.50% | 6.59 | 1.91 |
| Greedy best-first | no | 7.90× | 7.85× | 19 | 46.50% | 6.59 | 1.91 |
| Weighted A\* (*w* = 2) | yes | 5.96× | 6.30× | 24 | 9.37% | 1.96 | 0.28 |
| Dijkstra | yes | 0.58× | 0.77× | 330 | 0.29% | 0.44 | 0.11 |
| **CareRoute** | yes | **2.61×** | **3.43×** | **69** | **0.34%** | **0.45** | **0.10** |
| CareRoute + exact turns | yes | 1.16× | 1.48× | 134 | 0.00% | 0.44 | 0.10 |

Observations:

1. **Methods without shelter costs are fastest and worst in quality.** BFS, bidirectional BFS, textbook A\* and greedy search produce routes 46–47% costlier than the best found. Greedy search returns the same routes as textbook A\* on these maps. Bidirectional BFS reduces BFS's expansions by about a third (219 vs 336) without changing its route quality.
2. **Dijkstra is a quality reference, and it quantifies the value of the heuristic.** Its route cost (0.29%) matches CareRoute's (0.34%) but it expands about 4.8× as many nodes (330 vs 69). On mazes, where the Manhattan heuristic is a poor guide, the gap narrows (maze 121 × 91: 1.20× vs 2.47×).
3. **Weighted A\* is faster than CareRoute and worse in the measures a shelter cares about.** At tier 4 it is 5.96× vs 2.61× and expands 24 nodes vs 69, but its routes are 9.4% costlier, cross 4.4× as many room tiles (1.96 vs 0.45) and collide 2.8× as often (0.28 vs 0.10). A smaller weight was not tested (§7).
4. **Greedy search is fastest on mazes and worst there.** On the 121 × 91 maze it is about 10× faster than the previous implementation but its routes are 34% costlier than the best.
5. **Exact turns attain optimal routes at about twice the work** (134 vs 69 nodes at tier 4) and are slower than the previous search on six of 13 maps.

**Pareto analysis.** Consider the two axes of speed (Table 5, tier 4) and route cost over best. An algorithm is *dominated* if another is at least as fast and at least as good on route cost, and strictly better on one. Textbook A\* dominates BFS, bidirectional BFS and greedy search; exact-turn A\* dominates Dijkstra (1.16× vs 0.58×, 0.00% vs 0.29%); CareRoute dominates the previous implementation (2.61× vs 1.00×, 0.34% vs 0.40%). The non-dominated set is {textbook A\*, weighted A\*, CareRoute, exact-turn A\*}: four points that trade speed (11.07×, 5.96×, 2.61×, 1.16×) against route cost (46.50%, 9.37%, 0.34%, 0.00%). CareRoute is on this front. This is an observation about eight algorithms on one map's means, not a claim of general optimality.

### 5.3 Speed against the previous implementation

**Table 6.** Speed of CareRoute relative to the previous `findPath` (higher is faster).

| Map | Previous (µs) | CareRoute (µs) | Speed-up |
|:--|--:|--:|--:|
| Shelter T1 | 5.7 | 2.0 | 2.86× |
| Shelter T4 | 22.9 | 8.7 | 2.61× |
| Shelter T4, 80 residents | 39.1 | 22.7 | 1.72× |
| Maze 121 × 91 | 308.8 | 124.9 | 2.47× |
| Open 160 × 120 | 1239.6 | 20.3 | 61.03× |
| Unreachable goal | 296.2 | 127.0 | 2.33× |
| Geometric mean, 13 maps | | | 3.43× |

On shelter maps CareRoute expands 86–97% of the previous implementation's nodes but runs in 35–58% of its time. **The speed-up comes from data structures (heap, typed arrays, no per-node allocation), not from searching less.** The two changes are bundled in this comparison and were not separated. On empty grids CareRoute expands 21–43% of the nodes; we conjecture tie-breaking toward deeper nodes but did not isolate it.

### 5.4 Scaling (RQ4)

Going from a 40 × 30 to a 160 × 120 empty grid (16× the tiles), the previous implementation's time rises 48× (25.7 → 1240 µs) whereas CareRoute's rises 6× (3.4 → 20.3 µs). At the game's size the difference is microseconds and is not a bottleneck; the heap removes a scaling risk should maps grow.

---

## 6. Results: Room Selection and Turn Handling

### 6.1 Room selection (RQ3)

**Table 7.** Room selection, 80 queries per scenario. "Previous" is one search per candidate room. Jitter is *U*(0, 4) as in the game.

| Scenario | Method | µs | Speed-up | Nodes | Best room | Regret |
|:--|:--|--:|--:|--:|--:|--:|
| Tier 2 (13 rooms) | Previous | 24.9 | 1.00× | 70 | 89% | 0.15 |
| | BFS flood | 4.0 | 6.2× | 52 | 76% | 0.43 |
| | **CareRoute Match** | 28.6 | 0.87× | 57 | **98%** | **0.02** |
| Tier 4 (39 rooms) | Previous | 130.6 | 1.00× | 428 | 94% | 0.09 |
| | BFS flood | 4.4 | 29.6× | 53 | 88% | 0.37 |
| | **CareRoute Match** | 36.1 | 3.62× | 65 | **95%** | **0.05** |
| Tier 4, 30 residents | Previous | 206.5 | 1.00× | 428 | 83% | 0.40 |
| | BFS flood | 5.0 | 40.9× | 55 | 84% | 0.30 |
| | **CareRoute Match** | 63.9 | 3.23× | 70 | **93%** | **0.09** |

Observations:

1. **Savings grow with the number of candidates.** The previous method's cost is proportional to the number of rooms of the type. At tier 2 it is cheap and CareRoute Match is slightly slower (0.87×); at tier 4 it is 3.6× faster.
2. **Under crowding, selection quality improves.** With 30 residents the previous method picks the best room 83% of the time (regret 0.40) against 93% (regret 0.09) for CareRoute Match, because the latter prices crowding on the way to each room while the former scored path length only. With no residents both are accurate (95% vs 94%).
3. **BFS flooding is far faster and less accurate under crowding.** It ignores everything except step count.
4. **The speed-up is smaller than the node count suggests** (65 vs 428), because CareRoute Match performs a second search to a tile inside the chosen room, and callers re-plan to a seat for dormitories and cafeterias.

The jitter is deliberate, to spread agents across rooms, so a method with jitter is expected to choose off-optimum sometimes. Without jitter, CareRoute Match reaches 98% at tier 4 with 30 residents.

### 6.2 Exact turn handling

Tracking arrival direction in the search state makes paths optimal under the cost model (verified on every query, §4.6) but multiplies work: 1.2–2.2× the previous node count on shelter maps and 3.9× on the unreachable-goal map. The mean route-cost gain is 0.30–0.37% on shelter maps, which we regard as too small to justify the cost; CareRoute therefore does not use it. This also gives the measured size of the optimality caveat in §3.1.

### 6.3 Failure case

When the goal is unreachable every method must exhaust the reachable region (1175 expansions on our map). CareRoute is 2.33× faster than the previous search here. Bidirectional BFS terminates after 14 expansions (a 430× speed-up) because the goal lies in a small sealed pocket, an artefact of the map that would not hold if the start were in the pocket.

---

## 7. Threats to Validity and Limitations

**Construct validity: self-scored quality.** Route cost is computed with the cost weights (0.3, 2, 4) that CareRoute optimises, so CareRoute and Dijkstra are advantaged by construction. We reduce this by reporting room tiles and collisions, which do not depend on the weights, but we did not vary the weights (for example by sensitivity analysis) nor validate them against any human judgement of route plausibility.

**Static residents.** Residents do not move in our experiments, so crowd penalties act on fixed positions. Real crowds change between queries, and we make no claim about dynamic behaviour (queueing, deadlock, oscillation).

**Map realism.** Shelter layouts are random room placements, not player-built shelters. Synthetic maps characterise behaviour, not play.

**One weighting of weighted A\*.** Only *w* = 2 was tested. A smaller weight (for example 1.2) may retain much of the speed with better route quality, and could dominate CareRoute on the speed–quality plane; our Pareto observation does not exclude this.

**Algorithms not evaluated.** Jump point search assumes uniform costs, which the shelter penalties break; hierarchical A\*, flow fields and any-angle methods address larger maps, shared goals or free movement; none was implemented. No third-party pathfinding library was tested, so "best" here means best among eight implementations written for this study.

**Implementation confounds.** The speed comparison against the previous implementation bundles a heap and typed arrays with the absence of per-node allocation. Unit-cost methods and the shelter-cost methods share infrastructure where possible, but a JIT effect once distorted comparators: in an early run, adding methods that shared one search function slowed it through varying object shapes, which made timings of its other users appear worse. We fixed this by giving the options a single fixed shape and re-running everything; all timings reported here come from the corrected run. Expansion counts and route-quality figures were unaffected.

**Metric limits.** The room-selection "best room" criterion uses CareRoute's own objective (path cost + 2 × occupancy); it shows that the method tracks that objective, not that the game plays better, which would need a playtest. Timings come from one machine and one runtime; we report medians and spread but did not perform significance tests.

**Previous evaluation.** An earlier internal evaluation of a prototype scored room choice on the path to a randomly chosen tile, which inflated the apparent benefit. We report only the corrected, room-level scoring here.

---

## 8. Discussion and Conclusion

On small, cost-structured grids the choice of step cost matters far more than the choice of search strategy. The four methods that ignore shelter costs differ by a factor of five in speed and not at all in what they get wrong: every one crosses about 6.6 room tiles per trip. By contrast, among methods that use shelter costs, the strategy decides a speed–quality trade-off: weighted A\* is fastest and 9.4% off, Dijkstra's algorithm and exact-turn A\* are near-optimal but slower, and CareRoute sits between them with route cost 0.34% over best.

At the game's scale, every search costs microseconds, so the practical difference between the competitive methods is small and the dominant argument for CareRoute is route quality. The speed-up over the previous implementation (2.6× at tier 4) is an engineering result. The larger algorithmic effect is in room selection, where one multi-goal search replaces many; it scales with the number of candidate rooms and improves choices under crowding.

**Future work.** (i) Evaluate with moving residents in the full simulation. (ii) Sweep the weighted-A\* weight and the cost weights. (iii) Compare with third-party libraries and with flow fields for shared goals. (iv) Separate the heap from the data-layout gain. (v) Playtest-based evaluation of room selection.

---

## Data and Code Availability

All numbers in this report are produced by `scripts/pathfinding-bench.ts` and reproduce with `npm run bench:path` (about 25 seconds). The raw output of the run reported here is in [PATHFINDING_BENCHMARK_RAW.md](PATHFINDING_BENCHMARK_RAW.md), the extended discussion in [PATHFINDING_BENCHMARK.md](PATHFINDING_BENCHMARK.md), and the implementation in [PathfindingSystem.ts](../src/game/systems/PathfindingSystem.ts).

---

## References

[1] P. E. Hart, N. J. Nilsson and B. Raphael, "A formal basis for the heuristic determination of minimum cost paths," *IEEE Transactions on Systems Science and Cybernetics*, 4(2), 1968.

[2] E. F. Moore, "The shortest path through a maze," *Proceedings of an International Symposium on the Theory of Switching*, 1959.

[3] E. W. Dijkstra, "A note on two problems in connexion with graphs," *Numerische Mathematik*, 1, 1959.

[4] I. Pohl, "Bi-directional search," *Machine Intelligence*, 6, 1971; and I. Pohl, "Heuristic search viewed as path finding in a graph," *Artificial Intelligence*, 1(3–4), 1970.

[5] N. R. Sturtevant, "Benchmarks for grid-based pathfinding," *IEEE Transactions on Computational Intelligence and AI in Games*, 4(2), 2012.

[6] J. Doran and D. Michie, "Experiments with the Graph Traverser program," *Proceedings of the Royal Society A*, 294, 1966.

[7] D. Harabor and A. Grastien, "Online graph pruning for pathfinding on grid maps," *Proceedings of AAAI*, 2011.

[8] A. Treuille, S. Cooper and Z. Popović, "Continuum crowds," *ACM Transactions on Graphics*, 25(3), 2006.

[9] C. W. Reynolds, "Steering behaviors for autonomous characters," *Game Developers Conference*, 1999.

[10] D. Silver, "Cooperative pathfinding," *Proceedings of AIIDE*, 2005.
