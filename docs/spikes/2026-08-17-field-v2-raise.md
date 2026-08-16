# Raising ρ on a road that already exists — field v2

**Spike only**: nothing adopted, no default changed, no threshold or `RHO` touched.

D=20 T=80 W=3 w=4 ε=0, 400 ants, 3 seeds. Every run settles 12000 steps at ρ = 0.01 — the page's default, which forms a road — and only then does the slider move. BFS zone-to-zone: 58 normal, 76 with the bar shut.

This is the sequence the VISITOR performs. The advisor's spikes set ρ once at creation, which answers a different question — at ρ ≥ 0.02 from cold there was never a road to disperse or to block.

## A. Raise ρ on a formed road — does it disperse, and how fast?

"Lost" = the first sample where the reading exceeds 1.6× against the 58-move route it was holding. τ_road is the mean pheromone on the committed route, in multiples of k = 20.

| ρ raised to | before | τ_road before | +1000 | +3000 | +12000 | τ_road at end | lost (>1.6×) at |
|---|---|---|---|---|---|---|---|
| 0.01 (control) | 1.07× | 8.3 k | 1.07× | 1.07× | 1.07× | 7.8 k | never |
| 0.05 | 1.07× | 8.3 k | 1.12× | 1.09× | 1.08× | 0.5 k | never |
| 0.15 | 1.07× | 8.3 k | 1.22× | 1.51× | 1.28× | 0.2 k | never |
| 0.2 | 1.07× | 8.3 k | 1.85× | 8.64× | 41.39× | 0.1 k | 1000 |
| 0.3 | 1.07× | 8.3 k | 2.71× | 14.90× | 48.36× | 0.0 k | 750 |

## B. Raise ρ on a formed road, then block it — does it still heal?

Settle at ρ = 0.01, raise the slider, then shut the bar. Readings are over trips completed AFTER the block only, ÷ 76. "Healed" = first sample ≤ 1.6×, the advisor's line.

| ρ raised to | before (÷58) | +2000 | +6000 | +12000 | healed at | post-block trips |
|---|---|---|---|---|---|---|
| 0 | 1.07× | 1.42× | 1.19× | 1.17× | 250 | 23475 |
| 0.01 (control) | 1.07× | 1.29× | 1.29× | 1.29× | 250 | 24063 |
| 0.02 | 1.07× | 1.13× | 1.13× | 1.13× | 250 | 27311 |
| 0.03 | 1.07× | 1.23× | 1.15× | 1.14× | 250 | 27276 |
| 0.05 | 1.07× | 1.68× | 1.51× | 1.45× | 250 | 20518 |

---

Run time 45 s.
