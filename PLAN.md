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

### Decision 16 — the visitor's fixture becomes a field

Director text, verbatim:

> Change of fixture, not of mechanic — Decision 16. Beat 1 as built (12 nodes, two arcs) does not
> land: "a trail forms from nothing" is eight edges lighting up. What I want the visitor to SEE in
> the first ten seconds is a field: hundreds of ants pouring out of the nest, threading between a few
> obstacles, a bright road growing on its own. So the visitor's fixture becomes a FIELD that is a
> double bridge in disguise: a grid (≈ 60×40, 4-neighbour induced graph), nest left, food right, one
> wall spanning top-to-bottom with a CLOSED gap in the middle (that gap is the shortcut segment; going
> around the wall is the long way), plus 3–5 fixed obstacle blocks so the road visibly threads between
> things. Same engine (Model 1 / 1b), same two maps, same ρ slider, same one verb (the gap is the
> tappable wall cell), same reading, same controls, same page. The 12-node double-bridge stays as the
> fast unit-test and oracle fixture; thresholds for the page are re-derived on the field with the
> same two-sided harness. Ant count 300–500 (perf is trivial). No distance heuristic, ever — if the
> first food discovery is too slow, the fix is nearer food / more ants / a smaller field.

**Built** — `scripts/build-field.ts` → `src/fixtures/field.ts`, 60×40, 2141 nodes,
4078 edges, 260 blocked cells, five obstacle blocks, gap at `30,11`. **BFS 101
moves round the wall against 51 through the gap — ratio 1.980**, the bridge's 2.0.

**Adoption: PENDING SPIKE.** The fixture exists and is tested; the page still runs
the bridge. Nothing adopts the field until Decision 17's sweep produces a variant
that forms a road (`docs/spikes/2026-08-17-field.md` records why the first attempt
did not).

### Decision 17 — the graded-deposit generalisation, spiked as variants

The field spike found that mode 1b forms no road in 2-D at any size tested. Director
text on what to do about it, verbatim and in full, because every clause of it is a
constraint on the sweep:

> Ruling on the field finding — Decision 17. Thank you for stopping there; the
> diagnosis stands and I accept it: fixed deposit gives no direction in 2-D, and
> the bridge's two corridors were doing the concentrating that the deposit rule
> does not do. I am not taking (a) and not taking (b). I take (c), widened, and I
> want it spiked as variants — nothing adopted until I have seen the numbers.
>
> Why not (a). Retrace makes the home map redundant: a carrier that walks its
> remembered route home needs no second scent, so the two-map contract and beat
> 1's sentence ("each ant only leaves a little scent and follows scent") turn into
> "each ant remembers its own way back" — a different and weaker claim. It also
> does nothing for exploration: forward ants still random-walk 3000 steps to the
> first food, which is PLAN.md's own "against" for AS on a large graph without η.
> The Q/L flag stays off. (a) is the fallback if (c) fails the criteria below.
>
> Why (c), and how it stays inside Decision 1c. The 2-D ant sims that get the look
> I want WITHOUT a distance term all do one thing: an ant's deposit fades with the
> time since it last left its own source. A seeker lays home-scent that gets
> fainter the longer it has been away from the nest; a carrier lays food-scent
> that gets fainter the longer since it left the food. Each ant's scent is its
> own breadcrumb trail; the field made of everyone's breadcrumbs is graded toward
> each source, and steering up the map you seek finally has a direction. Nothing
> in an ant knows where anything is: it carries one bit and a step counter, reads
> only the edges at its node and its own heading. η stays momentum-only; the
> honesty test (move the food; the choice distribution at the nest must not
> change) must still pass on the field.
>
> The generalisation — four fixture params, every default = today's behaviour, so
> the bridge is bit-identical:
>
>   1. Graded deposit. On the edge just crossed: τ += D · exp(−t / T), where t is
>      the number of steps since the ant last stood in its own source zone (nest
>      for a seeker, food for a carrier; reset while inside the zone). T = ∞ is
>      today's fixed deposit. D is the per-step deposit; the bridge keeps today's D.
>   2. Momentum weights. An ant has a heading (its last move). Candidates are the
>      non-U-turn edges, as now; U-turn only when trapped, as now. η_straight :
>      η_turn = w : 1, today w = 1. This is Decision 1c's "purely local (momentum
>      only)" and nothing more.
>   3. Whisker. For each candidate direction, τ_dir is τ summed over up to W edges
>      along the ray from the current node in that direction, stopping at a wall
>      or the field edge. W = 1 is today's engine. This is the video's
>      sense_radius in grid form.
>   4. Arrival zones. Nest and food become small blocks (3×3); arrival = entering
>      any cell of the block; the reading and BFS are measured between the zones,
>      as spec/oracles.md already words it. Record the new BFS numbers; the
>      long-way / through-the-gap ratio must stay ≈ 2, or tell me.
>
> Unchanged: P ∝ η_turn · (k + τ_dir + floor)^h with h, k, floor untouched; two
> maps; global evaporation τ ← (1−ρ)τ; no retrace, no Q/L, no distance term, no
> homing by angle, no max-update. If a Policy hook is the natural place for 1–3,
> use it; if it isn't, say why and where you put it.

**Where each knob landed.** (1) and (2)+(3) are Policy hooks, as invited:
`deposit()` gained the ant's own `sinceSource` counter, and `weight()` gained a
`Sense` — `{ straight, tau }` — that the engine computes once per candidate. (3)'s
ray is *not* in the policy: it is walked from the graph, so it is precomputed in
`adjacencyOf` next to the adjacency it belongs to, for the same reason that
function is terrain rather than rules. (4) is engine state (`nestCells`,
`foodCells`), because arrival is not a weighing decision. The heading and the step
counter are per-ant arrays; neither is in `digest()`, since both only reach the
world through the deposits and choices that already are.

**Adoption: PENDING SPIKE.** Every default is today's behaviour and the double
bridge is held bit-identical by `spec/engine-regression.test.ts` — 34 frozen
digests, proven red-capable by a 3-parts-per-million deposit change. No default,
threshold or `RHO` value has moved.

### Decision 18 — field v2, and the scale hypothesis

Director text, verbatim. Two causes, both tested in one turn:

> Cause 1 — geometry. The gap is 19 cells from the road, so discovering it needs
> a 19-cell excursion; on the bridge the shortcut is a fork ON the road that
> every ant passes. Fix the disguise: the fork must be at the ants' feet.
>   New field (v2), still 60×40, 4-neighbour, generated by build-field.ts:
>   - wall at x = 22 from y = 6 to y = 39 — it touches the bottom edge, so the
>     only long way is the passage at the top (y 0–5); no perimeter corridor;
>   - nest zone 3×3 centred at (18, 20): two free cells between it and the wall;
>   - the gap: cells (22,19), (22,20), (22,21), closed by default — the toggle;
>   - food zone 3×3 centred at (50, 20);
>   - 3–5 obstacle blocks, all in the right half and the top corridor, placed so
>     the long road visibly threads between at least two of them; keep the
>     straight run gap → food clean;
>   - target BFS zone-to-zone: short ≈ 30, long ≈ 60, ratio 2.0 ± 0.1 — adjust
>     block placement, not the wall, to hit it. Record the numbers; diff test
>     regenerated; the honesty check re-run on v2.

**Built.** BFS zone to zone: **58 moves over the top, 30 through the doorway,
ratio 1.933** — inside 2.0 ± 0.1. 2185 nodes, 4184 edges, doorway of three cells
four steps straight ahead of the nest, wall reaching the bottom edge so the top
passage is the only long way. The settled road threads the top corridor between
the two offset blocks and descends past a third — the perimeter corridor is gone.

The scale hypothesis, stated by the director **before** the run so the record can
show whether it survived, verbatim:

> Cause 2 — scale, stated as a hypothesis before the run so the record can show
> whether it survives: fork exploration in P ∝ (k+τ)^2 needs τ_road = O(k). On
> the bridge, at the switching ρ, τ_road is a small multiple of k. On the field
> with 400 ants and slow ρ, D = 20 puts τ_road at ~100 k, so choices are
> deterministic and no ant ever explores the fork — which is why the switching
> band only appears where the road is already ragged. Prediction: bringing D
> back toward k's scale (D = 1–5; equivalent to raising k, which stays 20)
> opens a band where the road still forms (W = 3 and w = 4 carrying the
> following) AND ρ = 0 locks AND some ρ switches AND high ρ never settles.

**The mechanism is confirmed; the prediction is not.** Stage C measured τ_road in
multiples of k across D × ρ (`docs/spikes/2026-08-17-field-v2-stage-c.md`). The
diagnosis was right — at D = 20, ρ = 0 the road carries **15,516 k**, and
exploration is impossible there. But **no D opened the band**, because τ_road is
governed by D *and* ρ together, roughly as D/ρ: lowering D does not buy
exploration at a fixed road quality, it destroys the road. At D = 1 every ρ > 0
collapses τ_road below 0.6 k and no road forms at all (17–52×).

**The finding, stated as a mechanism rather than a list of failures: road quality
and fork exploration are controlled by the same number.** A road needs
τ_road ≳ k so ants follow it; a fork needs τ_road ≲ O(k) so ants sometimes do
not. One knob cannot separate two requirements on one quantity — which is the
argument for a wander rate that does not go through τ at all.

**Adoption: PENDING.** Nothing adopted, no default changed, no threshold or `RHO`
touched. The honesty invariant passes on v2.

### Decision 19 — the page runs field v2 (provisional)

Order changed: the page first, Stage D after. Director text, verbatim:

> Provisional adoption, recorded as such in PLAN.md ("provisional — pending
> Stage D and derive"): the page's fixture is field v2 with T = 80, W = 3,
> w = 4, D = 20, ε = 0, 400 ants; ρ default 0.01, slider range 0–0.05 (linear,
> step 0.001), RHO.locked = 0. The bridge stays the oracle fixture with its own
> params; nothing about it moves. Regime labels are OFF on the field until
> thresholds are derived — no label rather than a wrong one; aria-valuetext
> says the number. The strip and the reading run as they are (same function,
> BFS on the field). The secondary readout becomes "share of trips through the
> gap" (never thresholded).

**Provisional — pending Stage D and derive.** `ρ = 0.01` is the cell Stage C
measured as the best road on the field (1.07× against BFS 58, τ_road 8.3 k). It
does **not** switch when the doorway opens — that is the open question Stage D
exists to answer, and the page shows what the engine does rather than what the
argument needs.

`RHO` in `src/sim/rho.ts` is untouched and still describes the bridge, where every
derived threshold lives. The field's rates are a separate `FIELD_RHO`, and
`spec/engine-invariants.test.ts` no longer has to choose between them.

**Consequence to settle in the derive turn, not here:** `CLAUDE.md`'s Decision 11
line ("linear 0.00–0.25 step 0.01, default 0.12") now describes the bridge and not
the shipped control. Amending it is scheduled with the threshold derivation, as
the director's own ruling put it.

### Decision 13, amended — the page is light

Director text, verbatim:

> Palette — Decision 13 amended: the page is LIGHT, not dark. One palette, no
> dark variant this turn. White or near-white field; ants as BLACK dots (400 of
> them — the visitor should see them pour out of the nest; a black dot on white
> is the most legible ant there is); wall and obstacle blocks in mid grey;
> nest a blue disc, food a green disc; the food-scent as a warm amber-to-orange
> glow that becomes the road; the home-scent as a fainter light-cyan glow;
> the doorway drawn as a wall segment with the tap ring; the strip and the
> reading recoloured to match. Text and controls dark on light, contrast
> ≥ 4.5:1; the tap ring and the button focus state visible on white.

The dark direction chosen at slice 3 was chosen for a fixture of twelve edges,
where the trail glowing against near-black was the whole picture. On a field of
2185 cells the subject is four hundred ants, and a black dot on white is the most
legible ant there is. `src/ui/palette.ts` holds one palette again.

### Decision 20 — pacing, 300 steps per second

Selected by the director from an agent recommendation, so the choice is the
director's and the number was mine to propose:

> Pacing: 300 steps/s — I take your earlier recommendation, record it as a
> decision.

A food→nest trip on field v2 is 30 moves through the doorway and 58 over the top,
against 8 and 4 on the bridge. At the bridge's 90 steps/s a single trip would take
most of a second and beat 1 would not be "a road forms while you watch". At 300
the first road appears in the first ten seconds, which is the claim beat 1 makes.

The engine stays fixed-step and frame-clock-independent (Decision 12 (3)); this
changes the accumulator's rate, not its nature, and no threshold is counted in
seconds.

### Decision 21 — ε was spiked and is rejected by the evidence

**Provenance: the director ran this outside the repo and I reproduced it here.**
The scripts, the ε patch and the results are the director's work
(`/mnt/c/Agent workspace/ASS1/advisor/13-field-spikes/`); this repo re-ran them
unchanged and got byte-identical tables. Nothing below was measured by the agent
first.

The ruling that scheduled ε. There is no message in the build log titled
"Ruling on Stage C"; the ruling arrived inside the message that opens *"Change
of order — the page first"*, and this is its text, verbatim:

> Stage D (Decision 19, wander ε) comes right after this turn, not before; the
> claim question waits for it, and if it fails I pivot to Claim A — the renderer
> is the same under either claim, so nothing here is wasted.

Its condition was met and **ε failed it.** From
`docs/spikes/2026-08-17-field-v2-stage-d-advisor.md`:

- **ε = 0.01** is too weak and already spoils the road — 1.5× to 4× — and only
  switches where the road is ruined anyway (ρ ≥ 0.02).
- **ε = 0.03** does seed the doorway (69–72% of trips through it at the end) but
  the road runs 3.4–5.5× and the reading never falls below 1.6×.
- **ε = 0.1** is chaos.
- **ε = 0, ρ swept finely over 0.012–0.018**: the road holds at 1.14–1.55× and
  **not one trip ever goes through the doorway.** There is no knife edge to find.

**ε is not adopted.** It exists in this repo only as
`docs/spikes/2026-08-17-wander-epsilon.patch`, applied to run Stage D and
reverted immediately after. `scripts/spike-staged.ts` refuses to print a table
unless the patch is applied, because without it every arm silently collapses to
ε = 0 and the output would look like evidence.

The earlier ruling said the fallback was "Claim A". The pivot actually taken is
B′ below.

### Decision 22 — the claim moves from B to B′

Director text, verbatim (Chinese as written; the English beneath each is a gloss
by the agent, not the director's wording):

> 主张 —— 从 B 改成 B′。
>
> 二、新主张 B′
>   标题候选（英文，slice 5 定稿）：
>     No ant knows the map. The colony still finds its way — as long as it
>     forgets, and not too fast.
>   四拍：① 路从零长出来（不变）；② 堵断它们的路：不遗忘（ρ=0）时它们涌进
>   死胡同、鬼路困住它们十几秒；③ 有一点遗忘就一秒重连、鬼路淡掉；④ 忘太快
>   什么路都留不住。"开近路它们永远不走"不再是正拍——留在记录里，之后再定
>   要不要放进 Under the hood 卡片。
>   控件仍 ≤3：画/堵墙（一个动词）、遗忘滑杆（三段：never forgets / forgets /
>   forgets too fast，标签等 derive）、运行/暂停/重置。读数不变（趟长 ÷ 当前
>   地形的 BFS 最短）。
>   测试的对应关系改成：(1) 涌现；(2′) 堵路后 ρ=0 慢愈合且鬼路存留；(3′) ρ>0
>   在 N 步内愈合；(4′) ρ 过大成不了路/愈合不了。mutants 重新配对（新鲜度场
>   那个会怎么样，跑了才知道——它继续是反面对照）。具体阈值一律等 derive。

**Gloss.** The verb becomes *block the road*, not *open a shortcut*. Beat 2 is a
colony pouring into a dead end and held there by a road that no longer goes
anywhere; beat 3 is that same break healing in about a second once there is a
little forgetting; beat 4 is forgetting so fast that no road survives. "They
never take the shortcut you open" stops being a beat and becomes a footnote.

**Why the old claim had to go.** B said a middle band of forgetting makes the
colony switch to a shortcut. On this field and this engine that sentence is
false, and the evidence is two-sided: from
`docs/spikes/2026-08-17-field-v2-sequence-advisor.md`, an established road holds
at **2.07× with 0% of trips through the doorway at every ρ tried**, and raising
or lowering the slider afterwards changes nothing. Lock-in here is not a tendency
— it is absolute. That is also, precisely, what Goss and Deneubourg found in real
ants, which is why B′ is a stronger claim to have arrived at than B was.

**What the four beats are held against changes with them**: (1) emergence,
(2′) blocked at ρ = 0 heals slowly and the ghost road persists, (3′) ρ > 0 heals
within N steps, (4′) ρ too high forms or heals nothing. Every threshold waits for
the derive turn, and the mutants are re-paired there — what the max-update
freshness field does under (2′) is unknown until it is run.

### Two supplementary spikes, and what they cost B′

**Provenance: these two the agent wrote and ran**, at the director's request, to
test B′ in the order a visitor performs it —
`docs/spikes/2026-08-17-field-v2-raise.md`. Both found something that constrains
the beats as *visitor actions*, and neither is fatal:

- **Beat 2's ghost road needs the colony to have lived at ρ = 0 from the
  start.** The advisor's blocking run settled 12,000 steps at ρ = 0, where τ
  grows without bound, and healing then took 4,500 steps behind a permanent ghost
  road. Settle at the page's default ρ = 0.01 instead — a bounded road at 8.3 k —
  then slide to zero and block, and it heals in **250 steps** like every other
  rate. So beat 2 is only reachable if the visitor sets the slider to zero
  *before* the road forms.
- **Beat 4 is not reachable from the shipped slider at all.** Raising ρ on a
  formed road: 0.05 leaves it at 1.08×, 0.15 at 1.28×; only **0.2 and 0.3**
  destroy it (41× and 48×). The slider's maximum is 0.05. A cold start is
  different — from nothing, ρ ≥ 0.02 never forms a long road — but "turn it up
  and watch the road die" is not currently something the visitor can do.

Both are questions of the slider's range and of the order of the beats, not of
the engine, and both are the director's to settle. They are recorded here rather
than fixed, because fixing either one means changing a control or a beat.

### Decision 23 — the claim simplifies to A, and the field opens up

Director text, verbatim (Chinese as written; the English is a gloss by the agent):

> Decision 22 —— 简化：主张回到 A，遗忘率和速度是给访客玩的旋钮。
>
> 一、主张与拍子
>   h1: No ant knows the map. The road appears anyway — and heals itself when
>   you break it.
>   ① 路从零长出来（不变）；② 你在路上画一道墙截断它——它们堆在墙前、散开、
>   绕出新路，读数回落；③ 玩：遗忘率和速度随你调——调到 0，旧路的鬼影会困住
>   它们一阵；调到很高，什么路都留不住；"a tendency, not a guarantee" 留在
>   最后一句论证句里。B′ 的三段式不再是正拍：上一轮两个补充 spike 说明第二拍
>   依赖路在 ρ=0 下长出来、第四拍依赖滑杆够到 0.2 以上——太依赖操作顺序，
>   不适合当担保的论点。改成访客自己能发现的现象。

The director numbered this 22; PLAN.md already had a 22, so it is recorded here
as **23** and the director's own reference by name is what matters.

**Field v4 — built.** Open ground: no wall, no doorway. 60×40, **2208 nodes,
4193 edges, 192 blocked cells**, twenty blocks of 2×2 to 4×4 scattered over the
field with four in the band between nest and food, nest zone at (6,20) and food
zone at (53,20) with three clear cells around each. **BFS zone to zone: 47
moves.** v3 is kept as `FIELD_V3` and frozen, because every table in
`docs/spikes/` was measured on it.

### What turn A measured, and what it costs the claim

Three findings, none of them fatal, all of them the director's to weigh.

**1. The road forms, but it is loose.** On v4 at the page's ρ = 0.01 the first
trip completes at **step 348 (about a second)**, and the reading settles at
**1.99× at ten seconds and 1.96× at twenty** — against 1.07× on v3. Open ground
has many routes of similar length, so the colony spreads across a band instead of
committing to a line. Beat 1 still reads — a road appears from nothing, fast —
but the *number* beside it is not a tight one, and `EMERGED` will have to be
derived against this rather than against v3's.

**2. Healing works, and the page's default rate is the worst of the rates
tried.** Breaking the road with an 11-cell bar after 3000 steps
(`docs/spikes/2026-08-17-field-v4-block.md`): ρ = 0.002, 0.005 and 0.02 all heal
within **250 steps**; ρ = 0 never does (3.68× before, still 2.05× after 12,000);
and **ρ = 0.01 — the page default — also never reaches ≤ 1.6×**, ending at 1.67×.
That is very likely the loose road of finding 1 rather than anything about the
rate, but it means the default is the one value where beat 2 does not land
cleanly. Worth settling before derive.

**3. ε is worse than expected, and its own expectation is on the record.** The
director wrote, before the run: *"预期：ε≈0.005 读数 1.2–1.3×、几十只在游荡、
愈合不受影响"*. One of the three held.

| ε | reading at 20 s | ants off the road | healing at ρ = 0.005 |
|---|---|---|---|
| 0 | 1.96× | 0 of 400 | 250 steps |
| 0.003 | 1.74× | 52 of 400 | **4750 steps** |
| 0.006 | 2.18× | 44 of 400 | **never** |
| 0.01 | 2.00× | 67 of 400 | **never** |

The wandering appears as hoped — a few dozen ants on unmarked ground — but the
reading never approaches 1.2–1.3×, and **ε actively damages healing**: at 0.003 it
goes from 250 steps to 4750, and at 0.006 and above the break never heals at any
ρ. Since healing is now beat 2, ε costs the claim more than it buys the picture.
**Reported, not adopted.**

*A measurement error worth keeping.* The first version of "off the road" counted
ants more than one cell from the BFS shortest route and reported **94–96% at every
ε including zero** — true, and useless, because the colony's road is not the BFS
route. It now counts ants on ground whose scent is under a tenth of the busiest
cell's, which is what the eye calls wandering.

### Decision 24 — the look, and 150 steps/s

**Provenance.** The drawing below was written by the director's advisor at the
director's instruction, against `e12a557`, verified there at 185/185 with six
screenshots, and **never landed**. This round ports it onto field v4 by hand —
the patch's own field geometry is void, and applying it wholesale would have
conflicted. The design is the advisor's; the porting and everything below the
line is the agent's.

The director's original ruling to the advisor, verbatim, is preserved in
`/mnt/c/Agent workspace/ASS1/advisor/14-look/decision-21-look.patch`. What was
built from it:

- **Ants.** A per-ant hashed offset inside the cell — not the five-value lattice
  the old jitter produced, which drew four hundred ants on twenty-five spots —
  and drawn positions that ease halfway toward the true cell each frame, so
  motion reads as a flow rather than a hop. A jump of more than four cells is a
  reset, not a step, and is not eased. This is display state in `canvas.ts`,
  derived from the colony every frame and **never read back into it**; the
  resize-digest test still holds. Black while searching, **red while carrying** —
  the one bit each ant holds, made visible. Dot size stays the agent's fixed
  pixel value from the previous round (≈5 px at 1920, ≈3.6 px at 390).
- **Scent.** Per-cell squares at 0.62 of a cell, centred — marks on the ground
  rather than fog over it — and only for cells that carry enough to show. The
  mapping is **absolute**, in units of the fixture's own per-step deposit `D`:
  food-scent from 2.5 D to a full road at 120 D, home-scent from 1.5 D to 250 D
  and fainter, log-scaled with the ceiling taken as whichever is higher, the
  fixed mark or the current peak. The advisor's note on why a fraction-of-peak
  floor was tried first and rejected is worth keeping: early on the peak is low,
  so every cell an ant had crossed once passed the fraction and the field was a
  checkerboard; at steady state the same fraction hid the far end of the road.
- **Nest and food** are discs the size of their 3×3 zone with their names beneath.
- **Pacing: 150 steps/s** (Decision 20 amended). At 300 the whole of beat 1 was
  over in about two seconds and the visitor arrived to a finished road.
  `STEPS_PER_SECOND` is now exported, and `spec/reduced-motion.test.ts` reads it
  rather than copying the number.

### Field v4.1, and the default ρ decided by numbers

**v4.1** clears the corridor between the zones — y 18–22 from the nest's right to
the food's left — and moves the four blocks that stood in it to just outside.
**2196 nodes, 4165 edges, 204 blocked cells, 20 blocks all between 2×2 and 4×4.**

**BFS zone to zone is now 45, not 47.** That is arithmetic, not a slip: with the
corridor clear the straight line is walkable, so the shortest route is exactly the
distance between the zone edges, 52 − 7. It was 47 only because two blocks stood
across row 20.

The director's expectation for the ρ sweep, written before the run: *all three
rates 1.1–1.3×, all healing within 250 steps; if so the default becomes 0.005.*

| ρ | 4 s | 10 s | 20 s | healed after the break |
|---|---|---|---|---|
| 0.005 | 2.31× | 4.01× | **1.70×** | 250 steps |
| 0.01 (current default) | 2.69× | 1.13× | **1.13×** | 250 steps |
| 0.02 | no reading | 1.18× | **1.00×** | 250 steps |

**Half of it held, and it is the half that decides the question.** Every rate now
heals in 250 steps — clearing the corridor fixed what the previous round found,
where ρ = 0.01 was the one rate that never healed. But the readings are not all
1.1–1.3×: **0.005 settles at 1.70×**, well outside it, while 0.01 and 0.02 land at
1.13× and 1.00×. The stated condition for defaulting to 0.005 was not met, so the
default is **not** changed here — 0.01 stands, and 0.02 is the better number if
the director wants the tightest road. `FIELD_RHO` is untouched pending that word.

**What the clear corridor cost.** The road is now dead straight. The reading is
excellent — 1.02× at twenty seconds on the page's seed — but the blocks sit
outside the corridor and nothing bends the road, so the "断续微弯的带子" in the
target picture is a ruled line instead. Straightness and the reading are the same
lever here: the blocks that made it wind are the blocks that made it 1.96×.
Reported rather than fixed, because the trade is the director's.

### Turn 2 — the verb: drawing a wall

`ρ` default is now **0.02**, the director's pick from turn 1's numbers (1.00× at
twenty seconds, and a broken road healed within 250 steps).

**The engine grew exactly one function**, as ruled: `toggleCell(colony, node)`.
Everything else in `src/sim` is untouched. What it guarantees, and what
`spec/draw.test.ts` holds:

- **Edge indices never move**, so the pheromone arrays keep meaning what they
  meant. Asserted directly rather than assumed.
- **Scent survives on every edge the wall did not touch** — and on the ones it
  did. Rubbing a wall out restores a road rather than a blank strip: a road you
  break remembers it was a road.
- **The two arrival zones cannot be walled.** Sealing either would end the
  simulation rather than change it.
- **No ant is ever left standing inside a wall.** They are moved to the nearest
  cell by a breadth-first search over the fixture's own adjacency in edge order,
  so the same wall always displaces the same ants to the same cells — proven by
  digesting two identically-walled colonies. Proven red-capable too: disabling
  the eviction turns that test red on its own.
- **The BFS oracle is told the same thing the ants are** (`induce`'s new
  `blocked` option), so the reading is never measured against a route that no
  longer exists. Wall the field edge to edge and the oracle returns null.

**"no route" is a state, not a number.** With the food sealed off the readout
says so; dividing by a route that does not exist would produce something
enormous that looks like a reading.

**Reset keeps the walls and restarts the ants** — the walls are the visitor's,
not the run's.

**How a still shows a drag.** The verb is a pointer gesture and a screenshot
cannot drag, so the page's prime gained `?wall=x:y0-y1`, one vertical bar. Every
cell it builds is a cell the visitor could build by hand, and the screenshots say
which prime made them.

### Decision 26 — the visitor starts paused, picks a scene, and sets the speed on a slider

Director's instruction, verbatim (in Chinese; my gloss follows). The course key had
reached its limit, so the director authorised the advisor to write, commit and push
this change directly — recorded here so the history says who did what:

> 我现在那边apikey到上限了，我现在允许你来写代码，并且git commit和push
> 几个修改要求：默认点进去显示暂停，然后一个空白的没有障碍的，有几个按钮可以切换选项：
> 空白（即自己画障碍），随机生成障碍（可以稍微多一点），迷宫（固定格式，并且最好要有
> 几条可达的路，不能只有一条路）
> 然后蚂蚁速度也变成一个滑动的，不是选择固定的速度

Gloss: the page opens paused; the default field is blank, with no obstacles; buttons
switch between three scenes — blank (draw your own), random obstacles (a few more
than before), and a fixed maze that must have several routes through, never just
one; and the speed becomes a slider rather than three fixed paces.

**What was built.**

- **Field v5** — the blank field: 60×40, nest and food where v4 had them, nothing
  else. 2400 nodes, 4700 edges, BFS zone to zone 45. Generated by
  `scripts/build-field.ts`, diff-tested like v3 and v4. v4 is kept and frozen: the
  A-turn spikes were measured on it.
- **Scenes are walls, not fixtures** (`src/fixtures/presets.ts`). Every obstacle
  the visitor sees — a scene's blocks, the maze, their own walls — is a wall cell
  drawn with the one verb on v5. Choosing a scene creates a fresh colony and draws
  that scene's cells with `toggleCell`; whether the ants are running is left as it
  was. `Random obstacles` scatters 28 blocks of 2×2–4×4 with a one-cell gap between
  them and a four-cell margin round each zone, seeded, and if a seed happens to
  seal the food off the next seed is used — so every press gives a solvable scene
  and the same press count gives the same scene. `Clear walls` empties any scene
  back to blank; `Reset` restarts the ants and keeps the walls.
- **The maze is the fifth layout, chosen by measurement.** Five barriers with
  three-cell doorways and ten cross-walls: no road, 25× after 30,000 steps on three
  seeds. Three barriers with five-cell doorways and three cross-walls: a road only
  after 15–20,000 steps at the page's ρ. Doorways nearer the middle: 12–20,000.
  Wide doorways with the middle one on the nest's row: a road in 3,000 steps but
  dead straight. The shipped one — outer barriers pierced in the middle, the middle
  barrier pierced above and below — forms a road in 3,000–6,000 steps (20–40 s at
  150 steps/s), 1.05×–1.34× on three seeds, and has two ways through.
  `spec/presets.test.ts` walls off the shortest route and checks the food is still
  reachable. The engine has no distance term, so every dead end costs it a minute of
  wandering; a maze it can solve in front of a visitor is a field with walls in it,
  not a labyrinth. That is the honest limit and it is kept.
- **Paused on load, for everyone.** `motionPlan` no longer has an autoplay branch
  and `Watch it grow` is gone; Run is the way in under both preferences. The
  reduced-motion branch differs only in repaint cadence, and the tests say so.
- **Speed is a slider** — 30 to 300 steps per second, step 10, default 150,
  `aria-valuetext` in steps per second. Only the pace changes.
- **The control cap moves to five** — scene, draw, forgetting, speed,
  run/pause/reset — with the reason beside it in `CLAUDE.md`: a scene is terrain
  laid out with the visitor's own verb, not a mechanic. Ant count, pheromone
  strength and ε stay out.

**Measured before the default was left alone.** On v5, seed 1 (the page's), ρ =
0.02: blank forms 1.40× at 20 s and heals a bar across it in 50 steps; random
(first press) 1.09× at 20 s, heals in 50; maze as above. ρ = 0.01 was worse on
every scene it was tried on (the maze never formed a road at 0.01 on three seeds
while it did at 0.005 and 0.02) — the same non-monotonic dip turn A saw. The
default stays 0.02.

**How verified.** `pnpm check` 217/217, oxlint clean. Twelve screenshots at
1920×1080 and 390×844 (blank at 4/10/20 s, random at 20 s, maze at 40 s, a broken
road reconnecting), each width verified before the PNG was trusted.

**Not verified.** No live browser on a real display; the drag gesture is still
covered through `toggleCell` and the keyboard path, not synthesised pointer
events; no screen-reader pass.

### Decision 27 — Draw and Erase buttons for the wall tool

Director, verbatim: 「能不能增加一个画墙和删墙的按钮」— "can we add a draw-wall and an
erase-wall button". Until now the cell you pressed on decided whether a drag built
or rubbed out, which was invisible. Two buttons, `Draw` / `Erase`, now say what a
stroke does; the default is Draw; the buttons are the verb's mode and are not
counted as a sixth control. From the keyboard, Enter still toggles the cell under
the cursor either way, so the keyboard path did not change. Written, committed and
pushed by the advisor at the director's instruction, as for Decision 26.

### Decision 29 — an intro screen that scrolls away

Director, verbatim: 「进入网站后先展示一个全屏介绍页，用户向下滚动后，介绍页过渡/收起，进入
网站主页面 … 我希望开头加一个这个，然后在介绍页简单介绍一下蚁群算法」— on entry, one
full-screen introduction; scrolling collapses it into the main page; it should briefly
introduce the ant-colony algorithm. The advisor advised against a full-screen intro
(it pushes the simulation below the first screen; the automated sweep's load
screenshot will show text, not ants) and the director reaffirmed, so it is built as
asked, with the risks contained: the intro is one screen of at most four plain
sentences and holds the h1; the header with the nav is sticky, so "Try it" is
always one click away; a "See it run" link and the skip link both go to `#stage`;
the hand-over is a scroll-driven fade that only runs where the browser supports it
and never under `prefers-reduced-motion` — otherwise the intro is ordinary text
that scrolls off. Every screenshot in `pnpm shot` is now taken scrolled to the
simulation, and one is taken of the intro. Written, committed and pushed by the
advisor at the director's instruction.

### Decision 30 — the forgetting slider reaches 0.3

The right-hand end of the slider has to be somewhere no road survives, or the
label "forget everything" is a label on nothing — and the prose (slice 5) says
"push forgetting to the far right and no road survives at all". Measured on field
v5, seed 1, a road grown at 0.02 and ρ then raised: blank keeps its road at 0.15
(1.31×) and loses it at 0.2 (18.9× within 3,000 steps); random keeps it even at
0.2 (1.15×) and loses it at 0.3 (23×); the maze loses it from 0.15. The maximum
moves from 0.05 to **0.3**, linear, step 0.001, default unchanged at 0.02. Written,
committed and pushed by the advisor at the director's instruction.

### Decision 31 — the page's body

Director, verbatim, on the applications sentence: 「这个我感觉不好，我希望这样写…这个原始的
蚁群算法往往难以形成最优路径，然后讲解一下原因，然后说一下现实中常用的蚁群算法和我们的区别，
以及蚁群算法在现实中的运用」and, on the "Google Maps" closer: 「删掉这个」. Gloss: replace
the applications sentence with — you may have noticed this original colony often
fails to reach the best route; explain why; say how the ant-colony algorithms used
in practice differ from ours; say where they are used. Drop the Google Maps line.

**Built.** Six argument sentences in three beats under the canvas — Press Run ·
Draw a wall · Try both ends — each beat a thing the visitor does; the last keeps
"a tendency, not a guarantee". Then a sources block of four sentences: the
Goss/Deneubourg citation with the fitted rule (k = 20, n = 2); why this colony
locks onto the first road that succeeded (a trail rewards use, not quality; no ant
can compare routes); what Ant System and its successors add (route memory,
quality-weighted deposit, a local rule of thumb, tuned forgetting); where ACO is
used (vehicle routing, network routing, timetabling). Then a collapsed "Under the
hood" (rule, deposit, forgetting, the number, the shortcut footnote) and four
Sources with DOIs. Nav: Intro · Try it · Under the hood · Sources. The 8-sentence
budget becomes 6 + ≤ 4; the "Google Maps" closer goes. `spec/prose.test.ts` counts
the sentences in `dist/`, keeps the jargon out of the argument, checks the phrase,
the nav targets, the closed details and the sources. Written, committed and pushed
by the advisor at the director's instruction.

### Decision 32 — strokes fill their gaps, the slider gets a curve, the field gets its own tests

Director: 「修1，3，2，5」— from the advisor's list of what was left: (1) a quick drag left
gaps in a wall; (3) `docs/prompts.md` stopped at slice 0; (2) the core-interaction
test still asserted the bridge and its shortcut; (5) the slider's working band sat in
the left sixth of the track. Built: `src/ui/stroke.ts` fills the cells between two
pointer samples (four-connected Bresenham); the slider's track is a position 0–1
with ρ = 0.3 · position² (0.02 at 0.26, 0.05 at 0.41, 0.3 at the end); the page's
promises are held on field v5 by `spec/core-interaction.test.ts` against
`FIELD_PROVISIONAL` — measured numbers, provisional until a derive turn
(`spec/oracles.md` §6) — while the bridge keeps its derived thresholds in
`spec/bridge-interaction.test.ts`; `docs/prompts.md` gains nine entries pairing the
director's words with commits, Decisions 16–31. Written, committed and pushed by the
advisor at the director's instruction.

## Open decisions

**None settled by me.** Decisions 1–32 are recorded (28: the momentum weight tried at 3 and put back), 9 and 10 dissolved (25, the
speed control, is folded into `CLAUDE.md`'s cap entry and superseded by 26). Beat 4's
fixture source is deferred to slice 8 as a condition, not an open question.

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
