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

Rule: smallest window with tail noise < 0.02× whose slowest crossing is no
later than the largest window's — it must not lag the switch it detects.
N_trips = 500 · MIN_TRIPS = 65

## EMERGED — shortcut closed, vs BFS 8

| engine | best | worst |
|---|---|---|
| REAL ρ=0.12 | 1.058 | **1.072** |
| pure random walk | **1.234** | 1.259 |
| one pheromone map | **1.034** | 1.056 |

## LOCKED — ρ = 0, after the shortcut opens

| engine | worst (lowest) | best (highest) |
|---|---|---|
| REAL ρ=0 | **2.000** | 2.000 |
| max-update freshness field | 2.000 | **2.000** |
| ρ pinned at 0.25 | 1.440 | **1.546** |

## SWITCHED — ρ = 0.12, after the shortcut opens

| engine | best (lowest) | worst (highest) |
|---|---|---|
| REAL ρ=0.12 | 1.112 | **1.354** |
| ρ ignored | **2.000** | 2.000 |

## M — steps for ρ = 0.12 to cross, per seed

(reported at several candidate SWITCHED values, so M and SWITCHED are chosen together)
| SWITCHED | slowest seed | seeds that never cross |
|---|---|---|
| 1.2× | 2750 | 0/10 |
| 1.3× | 2750 | 0/10 |
| 1.4× | 2750 | 0/10 |
| 1.5× | 2500 | 0/10 |

## UNSTABLE and K — ρ = 0.25

| candidate UNSTABLE | REAL longest run below (max over seeds) | freshness longest run below (min over seeds) |
|---|---|---|
| 1.1× | **0** samples | **0** samples |
| 1.2× | **0** samples | **0** samples |
| 1.3× | **0** samples | **0** samples |
| 1.4× | **1** samples | **0** samples |

REAL ρ=0.25 final reading: 1.440 – 1.546

## N — how long ρ = 0 holds above a candidate LOCKED

| candidate LOCKED | last sample where every REAL seed is still above |
|---|---|
| 1.6× | 6000 |
| 1.7× | 6000 |
| 1.8× | 6000 |
| 1.9× | 6000 |

## Every engine, final reading per ρ (median over seeds)

| engine | ρ=0 | ρ=0.12 | ρ=0.25 |
|---|---|---|---|
| REAL (1b) | 2.000 | 1.206 | 1.512 |
| max-update freshness field | 2.000 | 2.000 | 2.000 |
| η encodes distance to food | 2.000 | 1.112 | 1.410 |
| pure random walk | 1.502 | 1.502 | 1.502 |
| ρ ignored | 2.000 | 2.000 | 2.000 |
| ρ pinned at 0.25 | 1.512 | 1.512 | 1.512 |
| one pheromone map | 2.000 | 1.898 | 1.540 |
