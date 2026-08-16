# Block-the-road spike, field v2 — ADVISOR SCRATCH RUN

D=20 T=80 W=3 w=4 ε=0, 400 ants, 3 seeds. Settle 12000 with the corridor open, then a 12-cell bar (y=12, x=10..21) shuts across the road, then 12000 more. Doorway sealed throughout.
BFS zone-to-zone: 58 normal, 76 with the bar shut (detour via x ≤ 9). Post-block readings are over trips completed AFTER the block only, ÷ 76. "healed" = first sample ≤ 1.6×.

| ρ | before (÷58) | trips before | trapped on bar | 65 post-block trips by | reading +1000 | +3000 | +12000 | healed (≤1.6×) at | post-block trips |
|---|---|---|---|---|---|---|---|---|---|
| 0 | 1.19× | 27395 | 0 | 350 | 6.23× | 2.36× | 1.39× | 4100 | 19533 |
| 0.0002 | 2.19× | 14584 | 0 | 250 | 2.33× | 2.23× | 2.24× | never | 13194 |
| 0.0005 | 3.16× | 10701 | 0 | 100 | 2.41× | 2.41× | 2.41× | never | 13116 |
| 0.001 | 1.07× | 32625 | 0 | 100 | 1.17× | 1.09× | 1.09× | 100 | 28601 |
| 0.002 | 1.10× | 30679 | 0 | 100 | 1.21× | 1.21× | 1.21× | 100 | 25937 |
| 0.005 | 1.52× | 24702 | 0 | 100 | 1.37× | 1.13× | 1.13× | 100 | 27832 |
| 0.01 | 1.07× | 32802 | 0 | 100 | 1.47× | 1.29× | 1.29× | 100 | 24063 |

Run time 30 s.
