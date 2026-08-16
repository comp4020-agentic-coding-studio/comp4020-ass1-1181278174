# ε for the look, on field v4

**Spike only, and for the picture.** ε was rejected for the argument in Decision 21; this asks only whether a few dozen ants wandering is worth having. Nothing is adopted, no default changed, no threshold or `RHO` touched.

## The expectation, as written before the run

> 预期：ε≈0.005 读数 1.2–1.3×、几十只在游荡、愈合不受影响。

400 ants, 3 seeds, 6000 steps at ρ = 0.01. BFS 47 on open ground. "Off the road" is the share of ants standing on ground the colony has not marked — a cell whose scent is under a tenth of the busiest cell's. (Measuring distance from the BFS route instead reported 94-96%% at every ε including zero: true, and useless, because the colony's road is not the BFS route.)

| ε | first food | reading at 1200 (4 s) | at 3000 (10 s) | at 6000 (20 s) | off the road |
|---|---|---|---|---|---|
| 0 (control) | 348 | 2.95× | 1.99× | 1.96× | 0% — 0 of 400 |
| 0.003 | 280 | 2.66× | 1.76× | 1.74× | 13% — 52 of 400 |
| 0.006 | 275 | 4.15× | 2.27× | 2.18× | 11% — 44 of 400 |
| 0.01 | 295 | 2.74× | 2.34× | 2.00× | 17% — 67 of 400 |

## Does ε change how the break heals?

Same bar as the blocking spike (x = 30, y = 15..25), shut at 3000 steps, then 9000 more. Readings over trips completed after the break, ÷ 55. Healed = first sample ≤ 1.6×.

| ε | ρ = 0 | ρ = 0.005 | ρ = 0.02 |
|---|---|---|---|
| 0 (control) | never | 250 | 250 |
| 0.003 | never | 4750 | 250 |
| 0.006 | never | never | never |
| 0.01 | never | never | never |

---

Run time 32 s. **Reported, not adopted.**
