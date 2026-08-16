# Plan — Assignment 1

Working document. Records decisions and the open ones. Not part of the deployed
site.

## The claim

> **The colony's intelligence is not in any ant. It is in how fast they forget.**

Draft `h1`. Pending: whether the deployed page carries this sentence verbatim.

## Why more people should understand it

We treat forgetting as a defect — in people, in organisations, in software
memory. In a colony it is the mechanism that keeps the group from locking onto
its first bad answer. Real ants prove the point the hard way: in the
double-bridge experiments (Goss et al. 1989; Deneubourg et al. 1990), when the
long bridge is found first and a shorter one is added later, the colony keeps
marching the long way — real pheromone evaporates too slowly. The one thing
engineers added to make artificial ants (Dorigo's Ant System) beat real ones was
faster forgetting.

The visitor should feel that with their own hands, not read it.

## The arc — four beats, one mechanic

"Two acts" hid a structural fact: beats 1–3 contain the whole argument, and
beat 4 is different in kind from them. Written out honestly:

1. **No ant knows the map.** The fixture loads with **zero pheromone**. Ants
   wander; a trail forms in front of the visitor within seconds. Nothing is asked
   of them yet — the point is that they *watch* a path appear without anyone
   planning it, which a pre-laid trail could only assert.
2. **Lock-in.** A shortcut opens. The colony keeps using the long way. The
   readout shows how much longer. This is the double bridge, and it should be
   *visible* — the shortcut sits empty while the long path glows.
3. **The knob.** The forgetting slider. At zero they never switch; too high and
   the trail never forms; in between they break out within seconds. This is the
   argument, and it is the whole page.
4. **The world** — *decided: re-skin only, scheduled as the **last** slice,*
   after the lock-in/switch beat is legible without prose. Same verb, same
   readout, same three controls, one committed street fixture. Cut criteria are
   absolute and not negotiable at the time: a new verb, a new readout, a new
   control, or more than three sentences of its own, and it goes.

Beats 1–3 are the assignment. Beat 4 is upside, and it is cheap or it is gone.

Beat 1 carries a condition of its own (Decision 2b): it must be **live
emergence**. The fixture loads with zero pheromone and the path grows in front of
the visitor within seconds. Nothing pre-baked — a pre-laid trail would make the
page assert emergence rather than show it.

## Controls — hard cap of three

1. **Toggle a wall cell** — one verb, doing four jobs.
2. **Forgetting rate** — native `<input type=range>`. The page's reason to exist.
3. **Run / pause / reset** — and **run/pause must be visible**, not just
   available. WCAG 2.2.2 requires motion lasting more than five seconds to be
   pausable, and this simulation runs indefinitely (Decision 8).

Decision 2a collapses what looked like three separate affordances into one verb:
opening the shortcut is a toggle on a highlighted segment, the closing
"break it yourself" is the same tool, and beat 4's "close a street" is the same
tool again. **The epilogue adds nothing.**

This closes Decision 9 outright, and more cleanly than the mode-switch I
proposed: a *toggle* has no separate erase, so the draw/erase pair that pushed
the count to five never exists.

## The readout

Not a control, so it does not spend the cap — but it spends phone-viewport space
and it is the second thing the visitor looks at.

- **The ratio**, as a number: the **mean** trip length over the last `N_trips`
  **completed food→nest trips**, over the BFS shortest path (Decision 5 as amended).
  Below a minimum trip count it reads **"no reading yet"**, never a number.
- **A thin history trace** (Decision 3): the same number plotted against steps.
  One line, a 1.0× baseline, a vertical tick where the shortcut opens. A thin
  strip under the canvas at 390.
- **Secondary, never thresholded**: the share of ants currently on the shorter
  branch. It moves *before* the median does, so it gives the visitor the earliest
  visible sign of the switch. No test asserts on it.

**Unit**: trip length and BFS length are in the same unit — moves between the two
arrival zones. Ratios are therefore dimensionless and directly comparable.

**One function computes this reading for both the UI and the tests.** The trace
plots exactly the series the core-interaction test asserts on, not a smoothed
copy of it.

I had specified the window in *steps*; the director's window is *trips*, and it is
the better instrument for two reasons worth keeping written down. Trips on the
shortcut complete faster, so after a switch the window flushes faster and the
ratio responds. And under ρ = 0 the long trips keep completing, so the median
stays legitimately high rather than decaying toward the shortcut by arithmetic.
A step window would have blurred exactly the two moments the page exists to show.

`N_trips` rather than the director's bare `N` only to avoid colliding with `N`,
already in use below for a count of steps.

## The core interaction — contract

The readout is decided (Decision 5 as amended: **mean over the last `N_trips`
completed food→nest trips**); the numbers are derived, not chosen (see
`spec/oracles.md`).

> The visitor opens a shortcut on the committed double-bridge fixture, then sets
> the forgetting rate. The readout shows the mean trip length over the last
> `N_trips` completed food→nest trips, as a ratio of the BFS shortest path.
>
> - at forgetting = 0, the ratio stays at or above `LOCKED` for `N` steps after
>   the shortcut opens — the colony does not switch
> - at the default rate, the ratio falls below `SWITCHED` within `M` steps
> - at the maximum rate, the ratio never holds below `UNSTABLE` for `K`
>   consecutive steps
> - same seed → byte-identical output

`LOCKED`, `SWITCHED`, `UNSTABLE`, `N`, `M`, `K` and the window `N_trips` are
derived from a spike against the fixture and recorded with their derivation. None
of them is guessed, and none changes without the director's sign-off.

## Engine — required behaviours, proven headless before any UI

1. A near-shortest path emerges from local rules only. No ant holds a map.
2. With forgetting = 0 the colony locks onto a first-found longer path and does
   **not** switch when a shortcut opens (the double-bridge lock-in).
3. With moderate forgetting it switches within a bounded number of steps.
4. With forgetting too high the trail never stabilises.

A closeness/freshness field with max-update is **excluded**: it finds paths but
cannot lock in, because it always prefers the shorter value once seen. It
therefore cannot carry the claim. Behaviour (2) is the discriminating test, and
it needs positive feedback on **use**, not on **quality**.

## Engine — candidate models

### Model 1 — pheromone on the edges of a graph (Ant System)

Ants choose the next edge with probability proportional to `τ^α · η^β`.
Pheromone is laid by traffic and evaporates globally at rate `ρ` each tick.
**`ρ` is the slider.**

Behaviour (2) arises as the documented Ant System *stagnation* problem: with no
evaporation, `τ` on the first-found path grows without bound and the probability
of exploring the shortcut goes to zero. The real double bridge and AS stagnation
are the same phenomenon, which is why this model carries the claim literally
rather than by analogy.

Deposit sub-choice, which bears on beat 1:

- **1a (Dorigo)** — the ant retraces its path and deposits `Q/L`. Converges
  hard, finds near-optimal paths. But the ant holds its own route and its
  length, so "no ant holds a map" weakens to "no ant holds the *maze*".
- **1b (Deneubourg)** — fixed deposit per step, both directions, no retrace, no
  `L`. Each ant carries **one bit**: have food, or don't. Shorter paths still
  win through the differential-length effect — which is precisely what the real
  double-bridge experiment shows. Weaker optimiser, stronger claim.

For: `ρ` is ACO's own evaporation parameter under its published name. Thresholds
rest on literature rather than on tuning taste. BFS-shortest on a graph is an
exact small integer, so the readout is crisp. Cheap, deterministic, trivially
headless.

Against: on a large maze, plain AS wanders and may be slow to reach the goal at
all without a heuristic `η`.

### Model 2 — two evaporating scalar fields on a grid

`toHome` and `toFood`. An ant deposits one while steering up the other, sensing
a fan of cells ahead. Both fields evaporate at `ρ`.

For: maximally local — an ant reads only its sensing fan and carries one bit, so
beat 1's sentence is literally true. Visually the strongest: trails glow, thin,
snap across to the shortcut, and at high `ρ` visibly flicker and die, so the
failure modes are *seen* rather than read. Grid-native.

Against: it is **not ACO** — the slider becomes a pheromone half-life in a
bespoke sim and the tie to engineering applications turns analogical. "Near
shortest" goes mushy: grid stigmergy trails are *shortish*, sitting well above
1.0× even when healthy, which puts a tight `SWITCHED` threshold at risk and
blunts the readout. More parameters (deposit, evaporation, diffusion, sensing
angle, sensing distance, turn noise) means more tuning risk and more pull toward
the parameter panel the guardrails forbid.

### Decided — Model 1, deposit mode 1b, on an explicit graph

Model 2 is recorded above rather than deleted: what was rejected, and why, is
part of the record of how this was directed.

It subsumes the grid case: a drawn maze is the grid graph it induces (cells as
nodes, 4-neighbour edges), so one engine serves the double bridge, a drawn maze
and a street graph. Model 2's look is recoverable in the *renderer* — draw edge
pheromone as a glow — without a second engine.

1b over 1a because beat 1 is the setup for beat 3, and "each ant carries one
bit" is the strongest form of it. Keep the `Q/L` retrace bonus behind a flag so
trying 1a is a one-line experiment, not a rewrite.

### How an ant finds its way in 1b — two pheromone maps

Required by Decision 1c, because 1b has no retrace and no remembered route, so
something has to get a carrier home without giving it a map.

- **Seekers** (carrying nothing) lay **"home"** pheromone as they walk, and steer
  by **"food"** pheromone.
- **Carriers** (carrying food) lay **"food"** pheromone, and steer by **"home"**.

Each ant therefore holds exactly one bit — carrying or not — and reads only the
two scalars on the edges at its current node. The trail out is built by the ants
coming back, and vice versa. No ant holds a route, a length, or a map.

Both maps evaporate at the same rate `ρ`. **`ρ` is the slider**, and the fact that
one number governs the forgetting of both maps is why the page has one knob and
not two.

### The honesty invariant on `η`

Decision 1c, and it is the load-bearing constraint of the whole engine:

> the heuristic term `η` is a constant or purely local (momentum only) — it must
> never encode distance to food

If `η` encoded distance to food, every ant would be reading a field that already
knows where the goal is, and beat 1's sentence — *no ant knows the map* — would be
false. The page would be asserting emergence while quietly shipping a gradient.
This is an honesty constraint before it is a technical one, and it is written into
`spec/oracles.md` so a test can hold it rather than a good intention.

**Consequence, flagged not objected to:** with `η` restricted to momentum, nothing
accelerates the initial search. On the double bridge that is fine — the graph is
tiny and the home map builds from the nest outward. On a drawn maze or a street
graph the first food discovery is a random walk and may be slow. If that bites, the
fix must come from the fixture (smaller graph, closer food) or from ant count,
**never** from letting a distance heuristic in through the back door.

## Architecture constraints these requirements imply

Both follow from requirements already stated, and neither is optional:

- **Fixed-step simulation, decoupled from `requestAnimationFrame`.** Byte-identical
  determinism per seed is impossible if the sim advances by wall-clock delta, and
  the headless test would then diverge from the browser.
- **The canvas is a pure projection of a fixed logical graph.** "A mid-interaction
  resize only redraws" and determinism both fail if grid size is derived from
  canvas pixels.

Both belong in `CLAUDE.md` as facts that bite.

## Guardrails

In scope: one engine, one fixture (plus one re-skin at most), three controls, a
readout, at most eight sentences of prose.

Out of scope, explicitly: a parameter panel; a traffic model; TSP; a third
scene; a second engine; live network requests; any comparison-of-algorithms
exhibit.

Artefact requirements: both marking viewports; a keyboard path for every pointer
action; normalised coordinates so a mid-interaction resize only redraws; zero
runtime requests; data committed; `prefers-reduced-motion` respected.

## Decisions — settled

The director records; I propose. The rejected options stay written down earlier in
this file, because what was turned down and why is part of the record.

**Provenance, stated because it differs between decisions and the difference
matters.** Decisions 1–5 arrived as written director text and are quoted verbatim
below, conditions included. Decisions 6–8 were **selections from two-option
questions whose option text the agent drafted** — so the *choice* is the
director's and the *wording of the option* is the agent's, and there is no
director message to quote for the choice itself. Their conditions, added on
review, **are** director text and are quoted verbatim. Nothing here paraphrases a
director message as though it were quoted, and nothing invents one.

### Decision 1 — engine

> **DECISION 1 — engine: Model 1, mode 1b (graph Ant System, per-step deposit, no
> retrace, no L).**
> Conditions:
>   (a) Spike before UI: on the double-bridge fixture (long bridge first, shortcut
>       opened later) the headless spike must show all four required behaviours —
>       near-shortest emergence, ρ = 0 lock-in with no switch, switch within a
>       bounded number of steps at the default ρ, no stable trail at a too-high ρ.
>       If 1b cannot, we reopen Decision 1 toward 1a — we do not tune thresholds
>       to pass.
>   (b) The Q/L retrace flag stays OFF by default and is enabled only on spike
>       evidence; either outcome is logged in docs/harness-log.md and the
>       discarded variant stays in history.
>   (c) Honesty invariant for spec/oracles.md: the heuristic term η is a constant
>       or purely local (momentum only) — it must never encode distance to food,
>       or beat 1's sentence ("no ant knows the map") is false. State in PLAN.md
>       how returners find home in 1b (two pheromone maps: seekers lay "home",
>       carriers lay "food").

Condition (a) is the clause that matters most in this file: **it forbids the
failure mode where a red test gets negotiated into a green one.** If lock-in does
not appear, the model changes, not the threshold.

(c) is discharged above under *How an ant finds its way in 1b* and *The honesty
invariant on `η`*, and lands as a test in `spec/oracles.md`.

### Decision 5 — readout

> **DECISION 5 — readout: windowed median.** Window = the last N completed
> food→nest trips (N fixed and recorded; my prior spike used 300), not the last W
> steps — trips on the shortcut complete faster so the window flushes faster after
> a switch, and under ρ = 0 the long trips keep completing so the median stays
> high. If the spike shows a step window behaves better, propose it with evidence.
> Below a minimum trip count the readout says "no reading yet", never a number.
> One function computes this reading for both the UI and the tests. Secondary,
> non-thresholded readout: the share of ants currently on the shorter branch (it
> moves before the median does). Trip length and BFS length are in the same unit —
> moves between the two arrival zones.

**Amendment — 2026-08-17, director, verbatim.** The reading is the windowed **mean**,
not the median. Same window `N_trips`, same `MIN_TRIPS` rule, same one function for
UI / trace / tests. The reason, as given:

> on a two-valued fixture the median is a step function (2.000× or 1.000×, nothing
> between) and at ρ = 0.3 it reported 2.000× while 48% of trips were short; the mean
> equals 2 − short-trip share to three decimals across every row, is continuous and
> monotone in what the visitor watches, and separates ρ = 0.03 from 0.05 where the
> median cannot.

The median stays available in the spike, for comparison only. Cited:
`docs/spikes/2026-08-17-rho-sweep.md`.

This is the amendment worth remembering. The original decision was *right on its
reasoning* — a median is the robust choice, and robustness is normally what a
readout wants. It was wrong on this fixture, and only measuring both side by side
showed it. Nothing about the argument for the median was refuted; the fixture simply
had two values in it.

**Default `ρ` = 0.12.** Ten seeds of ten switch, at a median of 1000 steps after the
shortcut opens, with zero re-crossings above 1.5×. Cited:
`docs/spikes/2026-08-17-rho-fine.md`.

### Decision 2 — drawing walls

> **DECISION 2 — drawing walls: option 1, the closing "break it yourself".**
> Conditions:
>   (a) One verb — "tap a wall cell to toggle it": opening the shortcut is a
>       toggle on a highlighted segment; the closing free-draw is the same tool;
>       Act 2's "close a street" is the same tool. Controls stay ≤ 3 (toggle wall,
>       forgetting slider, run/reset); the epilogue adds nothing.
>   (b) Beat 1 must be live emergence — the fixture loads with zero pheromone and
>       the path grows in front of the visitor within seconds; nothing pre-baked.
>   (c) The epilogue is covered by invariant tests only (no ant inside a wall, BFS
>       recomputed after a toggle, keyboard toggling works) — no thresholds.

(a) closes Decision 9 without needing it. (c) is the right call and worth naming:
the epilogue is a sandbox, so there is no correct answer to threshold — only
invariants that must not break.

### Decision 3 — comparison

> **DECISION 3 — one slider + a thin ratio-over-time trace (option 2).** The trace
> is the readout's own history, not a new metric: the same windowed-median/BFS
> number the tests assert, plotted against steps; minimal (one line, a 1.0×
> baseline, a vertical tick when the shortcut opens); a thin strip under the canvas
> at 390. Its job is memory across slider settings and alignment between what the
> tests measure and what the visitor sees. If it competes for attention or budget
> during the UI slice, fall back to one slider alone and log why. No side-by-side
> colonies.

### Decision 4 — beat 4

> **DECISION 4 — Beat 4 (ANU→Civic streets): option 1, reskin only, scheduled as
> the LAST slice** — after the lock-in/switch beat is legible without prose. Same
> verb (toggle = close/open a street), same readout, same three controls, one
> committed fixture. Cut criteria, no negotiation: if it needs a new verb, a new
> readout, a new control, or more than 3 sentences of its own, it goes. Fixture
> source: prefer scripts/build-map.ts from an OSM extract (ODbL attribution on the
> page, diff test on the generated JSON); fallback is a hand-simplified street grid
> labelled as such — decide when we get there. The ≤ 3 application sentences
> (routing tables ageing out stale routes, evaporation as ACO's key
> hyper-parameter, the ant mill) belong to the page regardless of Beat 4.

This closes Decision 10, against my reading: all three application sentences stay,
and they belong to the page rather than to beat 4.

> ~~Consequence for Decision 7 — 3 application sentences + 1 citation + 1 ODbL
> line (if beat 4 ships) is **5 of the 8**, leaving 3 for the claim itself.~~

**Superseded by Decision 7.** The three applications are compressed into one
sentence and the ODbL line is a footer credit, so the committed total is 2 of the
8, not 5, and the argument gets 6.

### Decision 6 — threshold derivation

*Chosen from two agent-drafted options (two-sided separation vs worst-seed plus
stated slack). The choice is the director's; the option wording below the
amendment is the agent's.*

**Two-sided separation.** A threshold is not chosen from the real engine's
behaviour; it is a number that separates the real engine from a deliberately wrong
one, with stated margin on both sides. If no such number exists, the readout or
the fixture is wrong — never the threshold.

**Amendment — 2026-08-17, director, verbatim:**

> Decision 6: I said at most THREE deliberately-wrong engines. I amend to: keep
> your six, but mark three as load-bearing (max-update field, η encodes distance,
> pure random walk) and the other three as one-line parameter pins; all six live
> in spec/mutants.test.ts and run under pnpm check, asserting RED on the fixtures.
> Record this as my amendment, dated.

So the six split by cost, not by importance:

| Load-bearing — real alternative engines | Parameter pins — one line each |
|---|---|
| max-update freshness field | evaporation disabled (`ρ = 0` forced) |
| `η` encodes distance to food | `ρ` pinned at maximum |
| pure random walk, no pheromone | one pheromone map instead of two |

All six live in `spec/mutants.test.ts` and **run under `pnpm check`, asserting RED
on the fixtures**. That is the part that makes the rule enforceable rather than
remembered: a mutant that stops being red is a regression the roster catches, so
"a threshold that has never been red is not a test" becomes a standing check
instead of a one-time ritual at derivation.

The max-update field matters most: it is the model the director excluded, and the
only control that proves the lock-in test can tell "forgetting is the mechanism"
from "shorter paths just win". The `η`-encodes-distance control is the one to
watch, because it is the only wrong engine that makes the page look **better**. A
page can fail honestly by breaking; it fails dishonestly by working for a reason
it denies.

### Decision 7 — the prose budget

*Chosen from two agent-drafted options (applications compressed to one sentence vs
one sentence each). The choice is the director's; the conditions below are quoted.*

**Conditions — 2026-08-17, director, verbatim:**

> Decision 7: add the counting rule (h1, ODbL footer, control labels, readouts, ≤
> 4-word hints do not count) and the honesty clause (applications sentence ends "—
> and none of it is how Google Maps routes you"; last argument sentence keeps "a
> tendency, not a guarantee"); a test may count prose sentences in dist and fail
> above 8.

**The counting rule.** These do not count against the eight:

- the `h1`
- the ODbL footer credit
- control labels
- readouts (the ratio, "no reading yet", the trace's axis marks)
- hints of **four words or fewer**

Everything else that is a sentence of prose counts. A test counts prose sentences
in `dist` and fails above eight, so the budget is enforced by the roster rather
than by discipline.

**The honesty clause.** Two sentences carry fixed endings, and they are not
stylistic:

- the applications sentence ends **"— and none of it is how Google Maps routes
  you"**. It pre-empts the misreading the applications invite, in the same breath
  that makes them.
- the last argument sentence keeps **"a tendency, not a guarantee"**. The engine
  produces near-shortest paths probabilistically; a page that implies determinism
  would be overclaiming what the visitor just watched.

Both are the page refusing a stronger claim than the simulation supports. They
are quoted here so a later edit cannot smooth them away without it showing.

Eight sentences, allocated as named slots rather than spent as they occur to us.

| Slot | Sentences |
|---|---|
| the argument — beats 1–3 | **6** |
| the Goss/Deneubourg citation | 1 |
| all three applications, in **one** sentence | 1 |
| **total** | **8** |

Two rulings inside this decision:

- **The `h1` does not count.** It is the title, not body prose, and it is two
  sentences by any counter — charging it to the budget would spend a quarter of
  the page's words on the headline.
- **ODbL attribution is a footer credit, not a sentence.** The licence is
  satisfied by a visible credit line; it does not need to consume an argument
  sentence. Applies only if beat 4 ships.

The applications are **compressed, not cut** — all three items named in Decision 4
survive (routing tables ageing out stale routes, evaporation as ACO's key
hyper-parameter, the ant mill as what no forgetting looks like in nature), in one
sentence.

That compression is the point rather than a saving. Three separate sentences would
read as an *applications section*, and a section is where a second idea starts. One
sentence keeps them as a footnote to the claim, and hands the argument six
sentences instead of four.

### Decision 8 — `prefers-reduced-motion`

*Chosen from two agent-drafted options (no autoplay for those who set the
preference vs no autoplay for anyone). The choice is the director's; the conditions
below are quoted.*

**Conditions — 2026-08-17, director, verbatim:**

> Decision 8: add the slowed cadence (≤ 4 fps or a "step 200" button), run/pause as
> a visible control (WCAG pausable motion), and a dedicated test for the
> reduced-motion branch.

**Slowed cadence.** For visitors who set the preference, informative motion is
kept but slowed: **≤ 4 fps**, or a **"step 200"** button that advances the
simulation in discrete jumps instead of animating it. Either satisfies the
preference without deleting the content — the trail still forms in front of them,
just not at animation frame rates.

The step-200 form is worth noting as the *better* option rather than the fallback:
it turns continuous motion into a deliberate act, which is exactly what the
preference asks for, and it makes beat 1 reproducible in a screenshot.

**Run/pause is a visible control, not an available one.** WCAG 2.2.2 (Pause, Stop,
Hide) requires motion lasting more than five seconds to be pausable, and this
simulation runs indefinitely. This is a conformance requirement for *every*
visitor, not a reduced-motion accommodation, so it lives in the control list
(control 3) rather than in this decision's branch.

**A dedicated test for the reduced-motion branch.** Not a note in a checklist: the
branch has its own test, because two code paths where only one is exercised means
the unexercised one is broken and nobody knows yet.

The distinction that governs it is **decorative** versus **informative** motion:

- **Decorative — dropped for everyone who asks:** glow pulsing, easing, sprite
  jitter, any transition that exists to look alive.
- **Informative — kept:** trail growth and ants moving. This *is* the content;
  removing it would leave nothing to explain.

**Autoplay:** visitors who set the preference get no autoplay and an explicit
"watch it grow" affordance. Everyone else autoplays as normal.

This does not weaken Decision 2b. Beat 1 still shows emergence from zero pheromone
in front of the visitor; the preference only moves the starting gun from page load
to a press. And a simulation the visitor deliberately runs is different in kind
from a page that animates at them unbidden — which is what the preference is
actually about.

**Cost, accepted:** two code paths. Slice 4 is not done until the behaviour has
been verified with the media query forced on, not merely reasoned about.

**Unaffected either way:** `M` counts sim steps, not wall time, because the
simulation is fixed-step. No threshold moves.

## Closed without needing a call

- **Decision 9** (the afterword's control budget) — dissolved by Decision 2a. A
  toggle has no separate erase, so the fourth and fifth controls never exist.
- **Decision 10** (which application sentences survive) — answered by Decision 4:
  all three, independent of beat 4.

### Decision 11 — the slider

**Linear 0.00–0.25, step 0.01, default 0.12.** Left label *"never forget"*, right
label *"forget everything"*.

`ρ = 1` is out of range and stays out: it sets `keep = 0`, wiping pheromone every
step — total amnesia, a pure random walk, every edge reading zero. That is a
degenerate end-stop, not forgetting too fast.

Regimes on this fixture, measured (`docs/spikes/2026-08-17-rho-fine.md`):

| ρ | what the visitor sees |
|---|---|
| ≤ 0.08 | locked on the old road — 10/10 seeds never come down |
| 0.10–0.12 | switches within seconds — 0.12 in 10/10, median 1000 steps, no re-crossings |
| ≥ 0.16 | no dominant path — plateau ≈ 1.5×, about a quarter of ants on the short branch |

Two consequences, and they are the point of having measured it:

- **Behaviour (4) is measured at the slider maximum, 0.25** — not at `ρ = 1`, which
  is off the control entirely. "Never stabilises" has to mean a trail that exists
  and will not settle, not a graph where no trail forms.
- **Beat 3's wording follows the data.** The high end is *"too fast, and they never
  settle on either"* — **not** "nothing forms". At ρ ≥ 0.16 something is very much
  happening; it just never picks a side. Writing "nothing forms" would have been a
  sentence the simulation contradicts.

### Decision 12 — trip history, the trace's denominator, and where the engine runs

Three rulings at the close of slice 2, all director text, quoted verbatim:

> (1) colony.trips → ring buffer of capacity N_trips (300) plus a total counter
> for display; completedTripLengths returns the buffered window; the reading and
> all tests unchanged in meaning — prove with byte-identical derivation output.
> (2) The trace keeps the current BFS as denominator; the discontinuity at the
> toggle is the point (the colony is suddenly 2× worse than possible) — label the
> tick "shortcut opened".
> (3) Where the engine runs: MAIN THREAD, fixed-step accumulator decoupled from
> rAF; a Worker buys nothing at 12 edges × 64 ants and puts a message boundary
> between the tests and the page.

(1) came from a reading of the dev canvas rather than from a check: 24,614 trips
retained after 5,000 steps, on a page that runs forever. **The capacity cannot be
sized by `N_trips` during the derivation that chooses `N_trips`** — that sweep
compares windows from 50 to 500, so `scripts/derive.ts` opts out via
`tripHistory: Infinity` and studies the whole history. Everywhere else the
capacity *is* `N_trips`, and `spec/engine-invariants.test.ts` asserts the two
numbers are equal so they cannot drift apart.

(3) settles the slice-3 question `CLAUDE.md` left open ("where it runs in the page
is a slice-3 decision, two options with trade-offs, mine to make"). The engine
stays `requestAnimationFrame`-free: the frame clock drives an accumulator, the
accumulator drives whole fixed steps, and `step()` still never renders.

### Decision 13 — the visual direction

Two directions were built and screenshotted at both widths, identical in every
respect but the ink. Director text, verbatim:

> Visual direction: DARK. Drop the light palette and the ?scheme= param.

`src/ui/palette.ts` now holds one palette. Both screenshots stay in
`docs/screenshots/` — the rejected one is part of the record, as the rejected
engine models are earlier in this file.

### Decision 14 — layout, and the strip before the tap

Director text, verbatim:

> leave the strip flat until the tap; desktop layout = canvas left 2/3, right
> column top-down: reading → strip → controls; the eight sentences go under the
> canvas in a ≤ 65ch column (slice 5); at 390 that is the natural stack canvas →
> reading → strip → controls → prose.

The flat line is not a bug to design around: before the shortcut opens the colony
is on the only road there is, the reading sits at ≈ 1.07× against a band that
runs to 2.1×, and **a line pinned to the baseline is a true statement that
nothing is happening yet.** The tap is what makes the strip worth looking at, and
it should be.

### Decision 15 — the keyboard path for the one verb

Two options were built as mock-ups and the director picked. Director's selection,
from agent-drafted options (so the *choice* is the director's and the option
wording is the agent's):

> Visible button

A native `<button aria-pressed>` labelled *"Open the shortcut" / "Close the
shortcut"* sits in the controls and calls the same `toggleShortcut` the canvas tap
does. The rejected option — `tabindex="0"` + `role="button"` + Enter/Space on the
canvas itself, which is what slice 3 shipped — was dropped because `role="button"`
on a canvas containing a whole graph is a lie to a screen reader, `aria-pressed`
belongs on a real button, and there is no way to move focus to a *segment*. The
canvas keeps `role="img"` and its `aria-label`; it is a picture, and the verb has
a control.

Accepted cost: the button telegraphs the interaction, so there is less of a
discovery moment. Discoverability was judged the larger risk — a visitor with no
background has to find the verb for beats 2 and 3 to happen at all.

### The keyboard map

Every pointer action has a keyboard path, and no path exists that the pointer
cannot also reach. Tab order is DOM order at both viewports, which is the reading
order at both (Decision 14).

| Target | Key | What it does |
|---|---|---|
| skip link | `Tab` (first), `Enter` | jumps to the simulation |
| nav links | `Tab`, `Enter` | in-page anchors |
| *(canvas)* | — | `role="img"`, not focusable: it is a picture, not a control |
| **Open / close the shortcut** | `Tab`, `Enter` / `Space` | the one verb — same `toggleShortcut` as tapping the wall |
| **forgetting rate** | `Tab`, `←` `→` `Home` `End` | native `<input type=range>`, step 0.01 over 0.00–0.25 |
| **Pause / Run** | `Tab`, `Enter` / `Space` | visible at all times (WCAG 2.2.2) |
| **Reset** | `Tab`, `Enter` / `Space` | back to zero pheromone, wall shut |
| **Watch it grow** | `Tab`, `Enter` / `Space` | only under `prefers-reduced-motion`, where nothing autoplays |

Focus is visible on every one of them (`:focus-visible`, 2px outline, offset).

## Open decisions

**None.** Decisions 1–15 are settled, 9 and 10 dissolved. Beat 4's fixture source is
deferred to slice 8 as a condition, not an open question.

New decisions will appear — the spike's evidence may reopen Decision 1 under its
own condition (a), and beat 4's fixture source is explicitly deferred to slice 8.
Both are recorded as conditions rather than as open questions, which is the
difference between a decision that anticipated being wrong and one that was
guessed.

## How each part earns its marks

| Spec / criterion | What answers it |
|---|---|
| deployed and live | CI `deploy`; relative asset URLs already in the Vite config |
| static, client-side, invariants pass | zero runtime requests, data committed as a module |
| both viewports | one canvas, three controls, normalised coordinates |
| visitor changes what they see | the forgetting slider changes the ants' behaviour, visibly |
| one strong idea, nothing else | the guardrails above, and Decisions 2–4 |
| evidence of process | `PROCESS.md`, `CLAUDE.md`, `reflections/assignment-1.md`, `docs/harness-log.md` |
