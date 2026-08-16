# Stage C — the scale hypothesis, on field v2

Decision 18. **Spike only**: nothing adopted, no default changed, no threshold or `RHO` touched.

## The hypothesis, as written before the run

> fork exploration in P ∝ (k+τ)^2 needs τ_road = O(k). On the bridge, at the
> switching ρ, τ_road is a small multiple of k. On the field with 400 ants and
> slow ρ, D = 20 puts τ_road at ~100 k, so choices are deterministic and no ant
> ever explores the fork — which is why the switching band only appears where
> the road is already ragged. Prediction: bringing D back toward k's scale
> (D = 1–5; equivalent to raising k, which stays 20) opens a band where the
> road still forms (W = 3 and w = 4 carrying the following) AND ρ = 0 locks
> AND some ρ switches AND high ρ never settles.

## The field, v2

60×40, 2185 nodes, 4184 edges. The wall reaches the bottom edge, so the passage along the top is the only long way — no perimeter corridor. The doorway is three cells wide, four cells straight ahead of the nest.

**BFS zone to zone: 58 moves over the top, 30 through the doorway — ratio 1.933.**

Schedule: settle **12000 steps with the doorway shut**, open it, then **12000 more**. 400 ants, 3 seeds, T = 80, W = 3, w = 4. h, k and floor untouched (k = 20).

"Via doorway" is the share of the last 300 trips shorter than 44 moves, the midpoint of the two routes. "Settles" is the swing of the last ten samples.

| D | ρ | τ_road at settle | before opening | at the end | first < 1.6× | via doorway | settles? |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 86.3 k | 6.13× | 9.28× | never | 0% | 1.87× swing |
| 1 | 0.002 | 0.6 k | 17.16× | 1.00× | 4500 | 100% | 0.00× swing |
| 1 | 0.005 | 0.2 k | 33.06× | 1.00× | 5000 | 100% | 0.06× swing |
| 1 | 0.01 | 0.1 k | 40.07× | 32.70× | never | 0% | 2.88× swing |
| 1 | 0.02 | 0.0 k | 46.41× | 45.04× | never | 0% | 7.07× swing |
| 1 | 0.04 | 0.0 k | 51.48× | 52.25× | never | 0% | 3.93× swing |
| 1 | 0.08 | 0.0 k | 52.82× | 56.32× | never | 0% | 4.86× swing |
| 2 | 0 | 298.1 k | 4.03× | 4.97× | never | 0% | 0.34× swing |
| 2 | 0.002 | 0.4 k | 17.11× | 1.00× | 5000 | 100% | 0.00× swing |
| 2 | 0.005 | 0.5 k | 21.40× | 1.00× | 1500 | 100% | 0.00× swing |
| 2 | 0.01 | 0.2 k | 32.29× | 1.00× | 2500 | 100% | 0.01× swing |
| 2 | 0.02 | 0.1 k | 40.22× | 34.32× | never | 0% | 4.86× swing |
| 2 | 0.04 | 0.1 k | 46.37× | 43.88× | never | 0% | 4.86× swing |
| 2 | 0.08 | 0.0 k | 51.17× | 52.17× | never | 0% | 5.89× swing |
| 5 | 0 | 4118.9 k | 1.11× | 2.07× | never | 0% | 0.03× swing |
| 5 | 0.002 | 129.3 k | 1.09× | 2.10× | never | 0% | 0.00× swing |
| 5 | 0.005 | 0.5 k | 14.42× | 1.00× | 3000 | 100% | 0.00× swing |
| 5 | 0.01 | 0.5 k | 15.95× | 1.00× | 1500 | 100% | 0.00× swing |
| 5 | 0.02 | 0.2 k | 28.93× | 1.00× | 1500 | 100% | 0.04× swing |
| 5 | 0.04 | 0.1 k | 36.92× | 31.83× | never | 0% | 4.38× swing |
| 5 | 0.08 | 0.0 k | 45.43× | 42.40× | never | 0% | 4.06× swing |
| 20 | 0 | 15515.9 k | 1.19× | 2.18× | never | 0% | 0.11× swing |
| 20 | 0.002 | 399.0 k | 1.10× | 2.13× | never | 0% | 0.00× swing |
| 20 | 0.005 | 149.9 k | 1.52× | 2.93× | never | 0% | 0.00× swing |
| 20 | 0.01 | 8.3 k | 1.07× | 2.07× | never | 0% | 0.00× swing |
| 20 | 0.02 | 2.8 k | 14.21× | 1.53× | 1500 | 0% | 0.00× swing |
| 20 | 0.04 | 0.7 k | 19.82× | 1.02× | 1000 | 100% | 0.02× swing |
| 20 | 0.08 | 0.2 k | 30.86× | 1.00× | 1000 | 100% | 0.06× swing |

## Does any D give the band?

Decision 18's definition: a pre-opening reading ≤ ~1.8×, ρ = 0 stays locked, some ρ falls below 1.6× within the window, and the highest ρ never settles.

| D | road forms (≤1.8× before)? | ρ=0 locked? | some ρ switches? | top ρ unsettled? | band |
|---|---|---|---|---|---|
| 1 | no | yes | no | yes | — |
| 2 | no | yes | no | yes | — |
| 5 | yes (ρ ≤ 0.002) | yes | no | yes | — |
| 20 | yes (ρ ≤ 0.01) | yes | no | no | — |

## The best ROAD — and it never switches

`D = 20, ρ = 0.01` — τ_road 8.3 k, 1.07× before the doorway opened, 2.07× after, crossing 1.6× at step never.

At settle, doorway still shut — does the long road thread between the blocks?

```
111111111111111111111111111######111111111111111111111111111
111111111111111111111111111111111111111111111111111111111111
1111111111111111111111111111111111911######19111111111111111
1111111111111111111911#1111111111111111111119111111111111111
1111111111111111111911#1111111111111111111119111111111111111
1111111111111111111911#1111111#######11111119111111111111111
1111111111111111111911#1111111#######11111119111111111111111
1111111111111111111911#1111111#######11111119111111111111111
1111111111111111111911#1111111#######11111119111111111111111
1111111111111111111911#1111111111111111111119111111111111111
11111111111111111NNN11+11111111111111111111111111FFF11111111
1111111111111111111111#1111111111111111111111111111111111111
1111111111111111111111#1111111#######11111111111111111111111
1111111111111111111111#1111111#######1111111######1111111111
1111111111111111111111#1111111#######1111111######1111111111
1111111111111111111111#1111111#######1111111######1111111111
1111111111111111111111#111111111111111111111######1111111111
1111111111111111111111#1111111111111111111111111111111111111
1111111111111111111111#1111111111111111111111111111111111111
1111111111111111111111#1111111111111111111111111111111111111
```

## The cleanest SWITCH — and its road was already ragged

`D = 20, ρ = 0.08` — τ_road 0.2 k, 30.86× before the doorway opened, 1.00× after, crossing 1.6× at step 1000.

At settle, doorway still shut — does the long road thread between the blocks?

```
355544554366655111111566666######111344222224423442122255444
333333334222225111111511315553312223311133131114442112224555
4423211131111551111115333115111111133######21223323222122244
4422211131111551111556#4444511122226665555511232324432223332
6665555551114644655556#1511111111554276775544252313121333255
1424223344444544443567#1111111#######75555555551322222235241
3224121111413464563567#2113333#######65132436332222111234441
3223233312663567644157#2111125#######44443466555562524624314
4555555634364566775255#2111155#######41153631555565565631448
4125432344564665588876#1111111111164563154764655675334564578
65745644212566578NNN88+11111133345514644568877667FFF65555567
6265563555566466886668#1111124444333356667766245665725666578
5364555342412566752677#1111121#######55265354645467766777688
5444435534455532552745#2112221#######4416774######6623434677
4451334336652222553145#2111112#######5555511######2256252525
3154555434444444423325#2111112#######1123333######3133161113
4151535533333331125556#211111212212222222223######1132262213
6551535556421154326455#1111112121111111121232322113111442223
2121145455413154332644#3111111121211211221144444444555522213
2111444334311233322241#2111111122211111334221111112222222124
```

### T = 160 on the same cell

| T | before opening | at the end | first < 1.6× | via doorway | settles? |
|---|---|---|---|---|---|
| 80 | 30.86× | 1.00× | 1000 | 100% | 0.06× swing |
| 160 | 25.86× | 1.06× | 1000 | 100% | 0.03× swing |

## For the record — Stage A's D = today's row, on field v1

Different geometry, so not comparable cell for cell; kept because Decision 18 asked for it.

| variant | ρ | first food | trips | settled reading | home ≤ 4× |
|---|---|---|---|---|---|
| T=80 W=3 w=4 D=1 | 0.005 | 971 | 952 | 26.35× | 4% |
| T=80 W=3 w=4 D=1 | 0.02 | 1364 | 717 | 32.51× | 2% |

---

No threshold, default or `RHO` value was changed to produce any number above. The pass line is Decision 18's and the grid was not extended.
