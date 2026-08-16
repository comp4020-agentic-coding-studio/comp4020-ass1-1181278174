# Threshold derivation — two-sided separation

fixture double-bridge · h=2 k=20 floor=0 · 64 ants
BFS 8 closed → 4 open · long 8 / short 4 moves
10 seeds · ρ ∈ {0, 0.12, 0.25} · 6000 steps after opening, sampled every 250

## SETTLE

τ per long edge at ρ=0.12 reaches steady state 56.1; within 5% from step 100.
trace (step:τ)  500:56  1000:56  1500:56  2000:56  2500:56  3000:56  3500:56  4000:56  4500:55  5000:56  5500:56  6000:56  6500:56  7000:56  7500:56  8000:56
SETTLE = 2000 (2000 holds, kept)

## N_trips and MIN_TRIPS

| window | tail noise (mean \|Δ\|) | slowest crossing < 1.25× |
|---|---|---|
| 50 | 0.098 | 2750 |
| 100 | 0.086 | 2750 |
| 200 | 0.081 | 2750 |
| 300 | 0.077 | 2750 |
| 500 | 0.075 | 2750 |

Primary rule: smallest window with tail noise < 0.02× whose slowest crossing
is no later than the largest window's. Did not discriminate on this fixture:
no window's noise drops below 0.02× and every window crosses at the same step.
Secondary rule, applied because the primary returned no answer: display
stability for the visitor's readout — the window every prior spike already
used, not a new one chosen on no fixture evidence to prefer it.
N_trips = 300 · MIN_TRIPS = 65

## EMERGED — shortcut closed, vs BFS 8

| engine | best | worst |
|---|---|---|
| REAL ρ=0.12 | 1.048 | **1.072** |
| pure random walk | **1.235** | 1.270 |
| one pheromone map | **1.037** | 1.055 |

## LOCKED — ρ = 0, after the shortcut opens

| engine | worst (lowest) | best (highest) |
|---|---|---|
| REAL ρ=0 | **2.000** | 2.000 |
| max-update freshness field | 1.013 | **1.047** |
| ρ pinned at 0.25 | 1.443 | **1.570** |

## SWITCHED — ρ = 0.12, after the shortcut opens

| engine | best (lowest) | worst (highest) |
|---|---|---|
| REAL ρ=0.12 | 1.117 | **1.353** |
| ρ ignored | **2.000** | 2.000 |

## M — steps for ρ = 0.12 to cross, per seed

(reported at several candidate SWITCHED values, so M and SWITCHED are chosen together)
| SWITCHED | slowest seed | seeds that never cross |
|---|---|---|
| 1.2× | 2750 | 0/10 |
| 1.3× | 2750 | 0/10 |
| 1.4× | 2500 | 0/10 |
| 1.5× | 2500 | 0/10 |

## UNSTABLE and K — ρ = 0.25

| candidate UNSTABLE | REAL longest run below (max over seeds) | freshness longest run below (min over seeds) |
|---|---|---|
| 1.1× | **0** samples | **24** samples |
| 1.2× | **0** samples | **24** samples |
| 1.3× | **0** samples | **24** samples |
| 1.4× | **1** samples | **24** samples |

REAL ρ=0.25 final reading: 1.443 – 1.570

## N — how long ρ = 0 holds above a candidate LOCKED

| candidate LOCKED | last sample where every REAL seed is still above |
|---|---|
| 1.6× | 6000 |
| 1.7× | 6000 |
| 1.8× | 6000 |
| 1.9× | 6000 |

## Chosen thresholds — placement and margins

EMERGED = 1.15
  margin above real worst (1.072, real must clear it from below): 0.078
  margin below pure-random-walk best (1.235, mutant must stay above it): 0.085
  (one pheromone map excluded from this control: its best, 1.037, is already below EMERGED — it is behaviour (3)'s control, not (1)'s)

LOCKED = 1.85
  margin below real worst (2.000): 0.150
  margin above the closer mutant's best (1.570): 0.280

SWITCHED = 1.45
  margin above real worst (1.353): 0.097
  margin below the mutant's worst case (2.000): 0.550

M = 3250
  slowest seed to cross SWITCHED=1.45: 2500 steps; M = that + 25% margin, rounded up to the sample grid

N = 6000
  every REAL ρ=0 seed holds at or above LOCKED=1.85 for the full 6000-step run sampled; N is that observed floor, not a guess

UNSTABLE and K:
  candidate 1.1×: REAL longest run below (worst case) 0 samples · freshness longest run below (best case, i.e. least stable) 24 samples
  candidate 1.2×: REAL longest run below (worst case) 0 samples · freshness longest run below (best case, i.e. least stable) 24 samples
  candidate 1.3×: REAL longest run below (worst case) 0 samples · freshness longest run below (best case, i.e. least stable) 24 samples
  candidate 1.4×: REAL longest run below (worst case) 1 samples · freshness longest run below (best case, i.e. least stable) 24 samples

## Every engine, final reading per ρ (median over seeds)

| engine | ρ=0 | ρ=0.12 | ρ=0.25 |
|---|---|---|---|
| REAL (1b) | 2.000 | 1.220 | 1.510 |
| max-update freshness field | 1.027 | 1.027 | 1.027 |
| η encodes distance to food | 2.000 | 1.110 | 1.413 |
| pure random walk | 1.507 | 1.507 | 1.507 |
| ρ ignored | 2.000 | 2.000 | 2.000 |
| ρ pinned at 0.25 | 1.510 | 1.510 | 1.510 |
| one pheromone map | 2.000 | 1.910 | 1.523 |
