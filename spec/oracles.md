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

To record here once it exists: node and edge counts, the two branch lengths,
their ratio, and the BFS answer before and after the shortcut opens.

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

Per Decision 5, **the reading** is: the median trip length over the last
`N_trips` completed food→nest trips, divided by the BFS shortest path.

- The window counts **completed trips**, not steps. Trips on the shortcut complete
  faster, so the window flushes faster after a switch; and under ρ = 0 the long
  trips keep completing, so the median stays legitimately high instead of decaying
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
| max-update freshness field (the excluded model) | behaviour (2) — it always prefers the shorter value once seen, so it cannot lock in. **The key control for the whole claim**: it is the only one that proves the lock-in test can tell "forgetting is the mechanism" from "shorter paths just win" |
| `η` encodes distance to food | the honesty invariant (Decision 1c). It passes the path tests *suspiciously well*, which is exactly why the honesty test must catch it |
| pure random walk, no pheromone | behaviour (1) — nothing emerges at all |

**Parameter pins — one line each:**

| Mutant | Must fail |
|---|---|
| evaporation disabled (`ρ = 0` forced) | behaviours (3) and (4) — nothing is forgotten, so nothing switches and nothing destabilises |
| `ρ` pinned at maximum | behaviours (1) and (3) — no trail survives to be followed |
| one pheromone map instead of two | behaviour (1) — carriers cannot find home, so no round trip completes |

The `η`-encodes-distance mutant is the one to keep an eye on: it is the only wrong
engine that makes the page look **better**. A page can fail honestly by breaking;
it fails dishonestly by working for a reason it denies.

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
