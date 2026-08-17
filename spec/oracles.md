# Oracles

What tells us the engine is right, independently of the engine. Scaffold: the
headings and the derivation protocol are here; **the numbers are not, because
they are derived from a spike and not chosen.**

Nothing in this file changes without the director's sign-off.

## 1. How we read each published spec line

The published spec for this deliverable, line by line, with the readings it
admits and the one we hold ourselves to. This is what keeps a threshold from
being arbitrary.

### "deployed and live at its public GitHub Pages URL by the deadline"

1. The URL returns 200.
2. The URL returns 200 **and** serves this page rather than a stale or default one.
3. As (2), **and** every asset it references also resolves on the deployed origin.

**We hold reading 3.** Reading 1 passes for a Pages 404 page. Reading 3 is the
one that catches the failure mode that looks fine locally: a root-absolute asset
URL that 404s under `…github.io/<repo>/`. Testable locally against `dist/`.

### "static and client-side throughout, and the starter's invariant checks pass"

1. No server code in the repo.
2. As (1), and the built site makes no request to any origin at runtime.
3. As (2), and all data the page needs is committed to the repo rather than fetched.

**We hold reading 3.** It is the strictest, it is what "static throughout" plainly
means, and it makes the page work on a slow or absent connection — which the HD
band for the artefact asks about directly.

### "it works at both marking viewports (desktop and phone)"

1. Nothing overflows horizontally at 1920×1080 and 390×844.
2. As (1), and every control is reachable and usable at both.
3. As (2), and a resize *mid-interaction* does not break or reset the running
   simulation.

**We hold reading 3**, because the HD band names "a resize mid-interaction"
explicitly. jsdom cannot judge layout, so readings 1–3 need a real browser;
until that sensor exists this line is verified by hand at both viewports and
that fact is reported, not assumed.

### "the visitor does something that changes what they see"

1. Any DOM change in response to any input.
2. The **core** interaction changes the **primary** content, visibly.
3. As (2), and the interaction carries the argument: a person using it for a
   minute arrives at the claim without being told.

**We hold reading 3** for design, and test reading 2 mechanically. Reading 1 is
satisfiable by a fake. Reading 3's design consequence is binding: the lock-in
must be legible without prose — the shortcut visibly empty while the long path
glows — with the ratio as corroboration, not as the message.

### "one strong idea with a point of view, and nothing else"

1. The page is about one topic.
2. Every element on the page serves the claim.
3. As (2), and the claim is *arguable* — a reader could disagree with it.

**We hold reading 3.** No test can hold any of them; see §5.

### "evidence of process is in the repo"

1. The named files exist.
2. As (1), and `PROCESS.md`'s citations resolve to real commits.
3. As (2), and the commit history shows the work growing rather than one dump.

**We hold reading 3.** `pnpm check:evidence` covers 1–2. Reading 3 is what a
person reads, and the only thing that produces it is committing as we go.

## 2. Oracles

### BFS shortest path

An independent shortest-path length on the same graph the ants walk, computed by
breadth-first search. The ants never see it. Every ratio in the core-interaction
test is measured against it.

Why it is trustworthy: no shared code with the engine, and on the fixture the
answer is a small integer that can be checked by hand.

### The double-bridge fixture

A committed graph reproducing Goss/Deneubourg: nest, food, a long branch and a
short branch, with the short branch initially closed. Long found first, shortcut
opened later.

This fixture is the discriminating test for engine behaviour (2). It is data, not
code, and it is committed so the test and the page use the same one.

**As built** — `src/fixtures/double-bridge.ts`. Every number below is checkable by
counting the edge literals in that file, and each is asserted in
`spec/fixture.test.ts`:

| | |
|---|---|
| nodes | 12 (`NEST`, `FOOD`, `L1`–`L7`, `S1`–`S3`) |
| edges | 12 — 11 open at load |
| long branch | `NEST L1 L2 L3 L4 L5 L6 L7 FOOD` = **8 moves** |
| short branch | `NEST S1 S2 S3 FOOD` = **4 moves** |
| branch ratio | **2.0** |
| shortcut segment | `S1—S2`, exactly one, `closed: true` at load |
| **BFS nest→food, shortcut closed** | **8 moves** |
| **BFS nest→food, shortcut open** | **4 moves** |

One number is worth recording because it is counter-intuitive and it caught a
hand-arithmetic error during this fixture's own test: with `S1—S2` walled,
**`NEST`→`S2` is 10 moves**, not 6 — the only route is the long way to `FOOD` and
back through `S3`. `S1` and `S3` are reachable stubs hanging off either end of a
severed branch. That detour is exactly why the colony finds the 8-move route first
and has no reason to look again.

**Fixture parameters** — this file is authoritative for them; `src/sim/params.ts`
holds engine constants only, and neither is edited without asking.

| | | |
|---|---|---|
| `h` | **2** | choice nonlinearity in `(k + τ)^h`, from Deneubourg et al. (1990). **At `h = 1` lock-in is weak by construction**, so a spike that fails to lock in at `h = 1` is not evidence against deposit mode 1b |
| `k` | **20** | additive constant — how much exploration survives at `τ = 0` |
| `floor` | **0** | first value, not a derived one. The spike probes it; it is recorded so every run reports the floor it actually used |

`pnpm spike` prints all three on every run, which is what makes "no conclusion
about lock-in without them" enforceable rather than aspirational.

### Conservation invariants

Properties that must hold every tick regardless of parameters. To be enumerated
against the chosen model; candidates:

- ant count is conserved — no ant is created or lost
- every ant is on a node or on an edge, never nowhere
- pheromone is non-negative on every edge
- with deposition disabled, total pheromone is non-increasing
- with evaporation at zero, total pheromone is non-decreasing

These catch the failures a ratio never will.

### Determinism

Same seed, same fixture, same parameter schedule → **byte-identical** output.

Requires: a bundled seeded PRNG, a fixed simulation timestep decoupled from
`requestAnimationFrame`, and no dependence on unordered iteration. Verified
headless by running twice and comparing a digest of the state trace.

Open: whether we also assert the browser reproduces the headless digest.

### The reading — one definition, one function

Per Decision 5 **as amended 2026-08-17**, **the reading** is: the **mean** trip
length over the last `N_trips` completed food→nest trips, divided by the BFS
shortest path.

- It was the median. The sweep showed the median is a **step function** on a
  two-valued fixture — trips here are 4 moves or 8, so it reads 2.000× or 1.000× and
  nothing between, and at ρ = 0.3 it reported 2.000× while 48% of trips were short.
  The mean equals `2 − short-trip share` to three decimals across every row, is
  continuous and monotone in what the visitor watches, and separates ρ = 0.03 from
  ρ = 0.05 where the median cannot. Cited:
  `docs/spikes/2026-08-17-rho-sweep.md`. The median stays in the spike for
  comparison only.
- The cost, accepted: a mean is not robust to an outlier where a median is. On this
  fixture trips cannot be wild, so it is a fair price — and `spec/reading.test.ts`
  asserts the trade in both directions rather than only the flattering one.
- The window counts **completed trips**, not steps. Trips on the shortcut complete
  faster, so the window flushes faster after a switch; and under ρ = 0 the long
  trips keep completing, so the reading stays legitimately high instead of decaying
  by arithmetic. A step window would blur both moments the page exists to show.
- **Unit**: trip length and BFS length are both counted in moves between the two
  arrival zones, so the ratio is dimensionless.
- Below a minimum completed-trip count the reading is **"no reading yet"**, never
  a number. Tests must assert this state exists rather than treating a warm-up
  value as data.
- **One function computes the reading for both the UI and the tests.** Two
  implementations would eventually disagree, and the page would then claim
  something no test checks.

If the spike shows a step window behaves better, that is proposed with evidence
and decided by the director — not swapped in.

### The visitor and the test read the same number

Per Decision 3, the trace under the canvas plots **that same reading**, against
steps, with a 1.0× baseline and a vertical tick where the shortcut opens.

This is an oracle in its own right: if the line on screen and the number in the
test ever disagree, one of them is lying. Any smoothing or easing applied for
looks happens to the *drawing* and never to the series.

The **secondary readout** — the share of ants currently on the shorter branch — is
deliberately **not thresholded** by any test. It exists because it moves before
the median does, giving the visitor the earliest visible sign of a switch. Nothing
asserts on it, so nothing constrains how it is presented.

### The honesty invariant on `η`

Decision 1c. The heuristic term `η` is a constant or purely local — momentum only.
**It must never encode distance to food.**

If it did, every ant would be reading a field that already knows where the goal
is, and beat 1's claim — *no ant knows the map* — would be false while the page
went on asserting it. This is the one invariant here that protects the argument
rather than the code, which is exactly why it must be a test and not an intention.

To be held by: a test over the engine's sensing inputs showing no term derived
from goal position or goal distance reaches an ant's choice.

### Epilogue invariants — no thresholds

Decision 2c. The epilogue is a sandbox: the visitor's maze has no correct answer,
so there is nothing legitimate to threshold. It is covered by invariants only.

- no ant is ever inside a wall
- BFS is recomputed after every wall toggle
- toggling works from the keyboard alone

The same verb serves the shortcut, the epilogue and beat 4's streets (Decision
2a), so these invariants cover all three.

### Performance budget

To be set. Needs a number for steps per second at the fixture size, a frame
budget on the phone viewport, and a bundle-size ceiling. Recorded here once
measured on real hardware rather than assumed.

## 3. Thresholds — to derive

Symbols used by the core-interaction test. **No value is written here until it is
derived**, and each lands with its derivation, not just its number.

| Symbol | Means | Derived how |
|---|---|---|
| `N_trips` | window, in **completed food→nest trips**, for the trip-length median | Decision 5 settled; the director's prior spike used 300, to be confirmed or moved on this fixture's evidence. Derive the smallest window whose trace is stable enough to threshold without lagging a real switch |
| `MIN_TRIPS` | completed trips below which the readout says "no reading yet" | from how many trips the median needs before it stops jumping on this fixture |
| `LOCKED` | ratio at or above which the colony counts as not having switched | from the fixture's branch-length ratio, with margin below it |
| `SWITCHED` | ratio below which the colony counts as having switched | from the achievable ratio at the default rate, with margin above it |
| `UNSTABLE` | ratio the trail must not hold below, at maximum forgetting | from the ratio distribution at maximum forgetting |
| `N` | steps the lock-in must persist after the shortcut opens | long enough to exclude a slow switch; from the observed switch time at the default rate |
| `M` | steps within which the default rate must switch | from the observed switch-time distribution, with margin above the slowest seed |
| `K` | consecutive steps that would count as "stabilised" at maximum forgetting | from the trail's autocorrelation at maximum forgetting |

### Derived values (2026-08-17)

`pnpm derive` — 10 seeds, ρ ∈ {0, 0.12, 0.25}, 6000 steps sampled every 250, real
engine and all six mutants on one schedule. Full tables:
`docs/spikes/2026-08-17-derivation.md`.

**Placement rule**: a threshold clears both sides by a stated margin, but sits
where its meaning holds rather than at the midpoint of the gap — near the real
engine's own distribution where the visitor's reading is the thing being judged
(`LOCKED`, `SWITCHED`, `UNSTABLE`), at the point the gap forces where only one
control remains eligible (`EMERGED`), or as the observed floor/margin of an
already-decided ratio (`N`, `M`, `K`).

| Symbol | Value | Margin toward real | Margin toward the control |
|---|---|---|---|
| `SETTLE` | **2000** | τ per long edge is within 5% of steady state (56.1) from step 100; 2000 was the standing assumption and holds | — (not a separation, a stability check) |
| `N_trips` | **300** | — | primary rule (smallest window, tail noise < 0.02×, no crossing lag) did not discriminate: noise ran 0.098→0.075 across windows 50–500, never under 0.02×, and every window crossed at the same step. Secondary rule applied instead: display stability for the visitor's readout, keeping the window every prior spike already used rather than picking a new one on no evidence. Noise at 300 is 0.077× against 0.098× at the smallest window (50), for an identical crossing step |
| `MIN_TRIPS` | **65** | trip-length reading stops jumping (\|Δ\| < 0.05×) from the 65th completed trip onward | accepted as derived, no separation needed — this is a warm-up floor, not a two-sided threshold |
| `EMERGED` | **1.15** | clears real's worst reading (1.072) by **0.078** | cleared by pure-random-walk's best (1.235) by **0.085**. One pheromone map is excluded from this control: its best EMERGED reading (1.037) is already *below* the real engine's worst, so it cannot fail behaviour (1) — its pairing moved to behaviour (3) |
| `LOCKED` | **1.85** | clears real's worst reading (2.000, every seed) by **0.150** | cleared by the closer mutant's best — ρ-pinned-at-0.25 (1.570) — by **0.280**. Max-update freshness (best 1.047, once ε-greedy lets it find the shortcut) clears by far more; it is the sharper control but ρ-pinned-at-0.25 is the binding one |
| `SWITCHED` | **1.45** | clears real's worst reading (1.353) by **0.097** | cleared by ρ-ignored's worst case (2.000, constant) by **0.550** |
| `M` | **3250** steps | — | slowest real seed to cross `SWITCHED` = 1.45 is 2500 steps; `M` = that + 25% margin, rounded up to the 250-step sample grid |
| `N` | **6000** steps | every real ρ=0 seed holds at or above `LOCKED` for the entire 6000-step window sampled | this is the observed floor across the whole run tested, not a guess at a shorter bound — no decay was seen to measure |
| `UNSTABLE` | **1.4** (ratio) | real's longest run below 1.4× is **1** sample (worst case over seeds) — it dips, once, never twice | max-update freshness's *least* stable seed still holds a run of **24** samples below 1.4× (the entire window) once ε-greedy lets it lock onto the short path — the same control used for `LOCKED`, now on the other side of the claim: it shows what real stabilisation looks like |
| `K` | **2** samples | 2 exceeds real's worst-case run of 1 by a single sample — deliberately tight, because "never stabilises" is "a tendency, not a guarantee": one dip is noise, two in a row is what `K` exists to catch | cleared by the freshness control's 24-sample run by a wide margin |

**Derivation protocol — two-sided separation** (Decision 6, settled):

A threshold is not a number chosen from the real engine's behaviour. It is a
number that **separates the real engine from a deliberately wrong one**, with
stated margin on both sides.

1. Fix the reading and `N_trips` (Decision 5).
2. Run the spike headless across a committed set of seeds at each of the three
   rates — the real engine **and** each wrong engine below. No UI.
3. Record both distributions here, not just the chosen numbers.
4. Place each threshold so that it clears the real engine's distribution by a
   stated margin **and** is cleared by the wrong engine's distribution by a stated
   margin. Write both margins down.
5. **If no such threshold exists, the readout or the fixture is wrong — not the
   threshold.** Widening the gap by moving the number is the one move this protocol
   exists to forbid.

This makes "a threshold that has never been red is not a test" part of the
derivation rather than a check bolted on afterwards: every threshold is born
red against something.

### The wrong engines — negative controls

Six mutants, all living in **`spec/mutants.test.ts`** and **running under
`pnpm check`, asserting RED on the fixtures** (Decision 6 amendment, 2026-08-17).

Running them in the roster rather than once at derivation is what makes the rule
enforceable: a mutant that stops being red is a regression, and the roster catches
it. A negative control that isn't kept around stops being one.

**Load-bearing — real alternative engines, worth their weight:**

| Mutant | Must fail |
|---|---|
| max-update freshness field (the excluded model), ε-greedy ε=0.06 | behaviour (2) — it switches onto the short branch at ρ = 0 once exploration lets it find the shortcut, where the real engine stays locked on the long one. **The key control for the whole claim**: it is the only one that proves the lock-in test can tell "forgetting is the mechanism" from "shorter paths just win". (Also the control for behaviour (4)/`UNSTABLE`/`K`, on the other side of the same claim: once it locks onto the short path it holds a run of 24/24 samples below `UNSTABLE`, showing what real stabilisation looks like against the real engine's worst-case run of 1) |
| `η` encodes distance to food | the honesty invariant (Decision 1c). It passes the path tests *suspiciously well*, which is exactly why the honesty test must catch it |
| pure random walk, no pheromone | behaviour (1) — nothing emerges at all |

**Parameter pins — one line each:**

| Mutant | Must fail |
|---|---|
| evaporation disabled (`ρ = 0` forced) | behaviour (3) — nothing is forgotten, so nothing switches whatever the slider says |
| `ρ` pinned at maximum (0.25) | behaviour (2) — always forgets at the maximum rate, so no trail survives long enough to lock in even at ρ = 0 |
| one pheromone map instead of two | behaviour (3), re-paired from an earlier (wrong) pairing to behaviour (1): its best `EMERGED` reading (1.037) is *better* than the real engine's own worst (1.072), so it cannot fail emergence — seekers and carriers reading and writing the same map conflate the outbound and inbound signal instead, so it fails to reliably switch onto the shortcut at the default rate (SWITCHED reading 1.910 against real's worst 1.353) |

The `η`-encodes-distance mutant is the one to keep an eye on: it is the only wrong
engine that makes the page look **better**. A page can fail honestly by breaking;
it fails dishonestly by working for a reason it denies.

### The slider's range, and where behaviour (4) is measured

Decision 11. The slider is **linear 0.00–0.25, step 0.01, default 0.12**, and `ρ = 1`
is off the control entirely.

| ρ | regime, measured |
|---|---|
| ≤ 0.08 | locked on the old road (10/10 seeds never come down) |
| 0.10–0.12 | switches (0.12 in 10/10, median 1000 steps, zero re-crossings) |
| ≥ 0.16 | no dominant path — plateau ≈ 1.5×, ~¼ of ants on the short branch |

Cited: `docs/spikes/2026-08-17-rho-fine.md`.

**Behaviour (4) is therefore measured at ρ = 0.25, the slider maximum — never at
ρ = 1.** At ρ = 1 pheromone is wiped every step and no trail forms at all, so a test
there would assert against a degenerate graph rather than against forgetting. "Never
stabilises" must mean a trail that exists and will not settle.

### Spike watch — what could produce a false negative

Decision 1a says that if 1b cannot show all four behaviours we reopen toward 1a.
That clause is only safe if a *failure to lock in* actually means the model cannot
lock in, rather than that it was run with the wrong constants.

Lock-in sharpness in 1b depends on **the choice nonlinearity** and **any pheromone
floor**, not on the deposit rule alone:

- Deneubourg's double-bridge model chooses with `(k + τ)^h / Σ(k + τ)^h`, where
  **`h ≈ 2`**. At `h = 1` the choice is linear in pheromone and lock-in is weak
  by construction — the colony keeps sampling the alternative, so a shortcut gets
  found and taken. **Concluding "1b cannot lock in" from `α = 1` or `h = 1` alone
  would be a false negative**, and would send us to 1a for no reason.
- A pheromone **floor** (a minimum `τ` on every edge, or a `k` that never decays)
  sets how much exploration survives at equilibrium, so it bounds how hard lock-in
  can ever be.

Therefore: **`α` / `h` and the floor are fixture parameters**, committed with the
fixture and **reported alongside the distributions**, not buried as engine
constants. Any spike conclusion about behaviour (2) is meaningless without them
stated.

### The prose budget is a test

Decision 7. A test counts prose sentences in `dist` and **fails above eight**.
Not counted: the `h1`, the ODbL footer credit, control labels, readouts, and hints
of four words or fewer.

Two sentences carry fixed endings and a test should hold them, because they are the
page declining to overclaim and an edit for flow would quietly remove them:

- the applications sentence ends **"— and none of it is how Google Maps routes
  you"**
- the last argument sentence keeps **"a tendency, not a guarantee"**

### The reduced-motion branch has its own test

Decision 8. Two code paths where only one is exercised means the unexercised one
is broken and nobody knows yet. The branch is tested directly: preference set →
no autoplay, cadence at or below 4 fps (or the step-200 control present), and
decorative motion absent while trail growth still occurs.

Run/pause being **visible** is not part of this branch — WCAG 2.2.2 applies to
every visitor, so it is asserted unconditionally.

## 4. Test order

The engine is proven headless before any UI exists. In order:

1. conservation invariants
2. determinism
3. behaviour (1) — a near-shortest path emerges
4. behaviour (2) — lock-in at forgetting = 0 *(the discriminating test)*
5. behaviour (3) — switches at a moderate rate
6. behaviour (4) — never stabilises at a high rate
7. the core-interaction contract, once thresholds are derived

## 5. What no test holds

Named so nobody mistakes a green suite for a mark. These are judged by a person
at the crit:

- whether the claim is strong, and whether it is *arguable*
- whether the interaction carries the argument, or the prose does
- whether the page is one idea or two
- whether the scope shows judgement
- whether the process reads as directed rather than retried

## 6. The page's field — provisional numbers (Decision 32)

Every value in §3 was derived on the double bridge, and the bridge stays the
oracle fixture: `spec/bridge-interaction.test.ts` and `spec/engine-behaviours.test.ts`
hold it. The page runs field v5, and `spec/core-interaction.test.ts` holds what the
page promises there — a road forms on every scene, a wall across it is routed
round, the far end of the slider loses the road — against `FIELD_PROVISIONAL` in
`spec/thresholds.ts`. Those are **measured, not derived**: seed 1, the page's
default rate, the measurement written beside each constant. They are provisional
until a derive turn separates them two-sided against the negative controls on this
field; until then a test that asserts a measured number about the page beats one
that asserts a derived number about a fixture the page no longer shows.
