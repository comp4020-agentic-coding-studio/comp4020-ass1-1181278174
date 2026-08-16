# The visitor's sequence, field v2 — ADVISOR SCRATCH RUN

D=20 T=80 W=3 w=4 ε=0, 400 ants, 3 seeds (medians). BFS 58 / 30; "via" = share of last 300 trips < 44 moves.

## (A) settle 8000 at ρ0 (door shut) → open → 3000 more → raise to ρ1 for 8000 → lower back to ρ0 for 4000

| ρ0 | ρ1 | before (÷58) | 3000 after opening (÷30) | via then | after raise: via ≥ 50% at | ≤1.6× & via≥50% at | peak reading during raise | end of raise | via | after lowering: reading | via |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0.01 | 0.015 | 1.07× | 2.07× | 0% | never | never | 2.14× | 2.07× | 0% | 2.07× | 0% |
| 0.01 | 0.02 | 1.07× | 2.07× | 0% | never | never | 2.14× | 2.07× | 0% | 2.07× | 0% |
| 0.01 | 0.03 | 1.07× | 2.07× | 0% | never | never | 2.14× | 2.07× | 0% | 2.07× | 0% |
| 0.01 | 0.05 | 1.07× | 2.07× | 0% | never | never | 2.39× | 2.07× | 0% | 2.07× | 0% |
| 0.005 | 0.03 | 1.52× | 2.93× | 0% | never | never | 3.07× | 2.96× | 0% | 2.93× | 0% |
| 0 | 0.03 | 1.37× | 2.37× | 0% | never | never | 2.36× | 2.00× | 0% | 2.00× | 0% |

## (C) door open from the start — where does even the short road fail?

| ρ | reading at 8000 (÷30) | via | trips |
|---|---|---|---|
| 0.05 | 1.00× | 100% | 46301 |
| 0.1 | 1.00× | 100% | 43668 |
| 0.15 | 32.66× | 0% | 1185 |
| 0.2 | 38.92× | 0% | 1061 |
| 0.3 | 44.42× | 0% | 891 |

Run time 32 s.
