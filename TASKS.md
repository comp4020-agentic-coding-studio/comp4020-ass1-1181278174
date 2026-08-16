# Tasks

One bounded slice per turn, then stop and report. Slices are ordered so the
engine is proven before any UI exists — if the engine cannot lock in, the page
has no argument, and that is worth finding out before a single pixel.

Each slice names its **done-when**. A slice is not done because it was
implemented; it is done when its done-when is observed.

## Decided — slices below are unblocked

Decisions 1–5 are settled in `PLAN.md`, verbatim with their conditions: Model 1 /
deposit mode 1b with two pheromone maps; one verb (toggle a wall cell) serving the
shortcut, the epilogue and beat 4; one slider plus a thin trace; beat 4 as a
re-skin in the last slice; the reading as a median over the last `N_trips`
completed trips. Decisions 9 and 10 closed without needing a call. The spike can
start.

**Nothing is open.** Decisions 1–8 are settled with their conditions; 9 and 10
dissolved. Two things are deliberately deferred rather than open: the spike's
evidence may reopen Decision 1 under its own condition (a), and beat 4's fixture
source is decided in slice 8.

## Slice 0 — harness first

- [x] Write the working agreement and the facts that bite into `CLAUDE.md`:
      one bounded task per turn; stop at the first red check and offer choices;
      two failed attempts then stop; never change a threshold, `spec/oracles.md`
      or params without asking; stage, don't commit; every turn ends with an
      evidence block. Plus: fixed-step sim decoupled from rAF, canvas as pure
      projection of a fixed logical graph.
      *Done: the starter file is replaced wholesale; the template survives at
      `bc2cd37`. "Facts that bite" opened with a measured entry rather than
      empty — CI runs nothing while the repo is private.*
- [x] Two rules go in as written rules, not as understandings:
      **"a threshold that has never been red is not a test"**, and **η may never
      encode distance to food** (Decision 1c — the invariant that protects the
      claim rather than the code).
      *Done: both are in `CLAUDE.md`, marked verbatim and held by
      `spec/harness-sync.test.ts`, before any engine code exists.*
- [x] **`spec/harness-sync.test.ts`** — every clause `CLAUDE.md` marks in
      guillemets must appear in `PLAN.md` or `spec/oracles.md`,
      whitespace-normalised. `CLAUDE.md` restates ~500 words of them, and two
      copies of one fact drift.
      *Done: 6 clauses held, 8 assertions green in `pnpm check`. Proved capable
      of failing — one word changed in a marked clause goes red, revert goes
      green. Its own first run was red three times and every one was a defect in
      the test, not drift in the docs (see `docs/harness-log.md`).*

## Slice 1 — the spike, headless, no UI

- [x] The double-bridge fixture as committed data: nest, food, long branch,
      short branch closed.
      *Done: 12 nodes, 12 edges, long 8 moves / short 4 moves (ratio 2), BFS 8
      closed → 4 open, all asserted in `spec/fixture.test.ts` and recorded in
      `spec/oracles.md` §2. The oracle earned its keep immediately: it caught a
      hand-arithmetic error of mine (`NEST`→`S2` with the wall up is 10 moves, not
      6), which is now recorded because it is the counter-intuitive number.*
- [x] The graph model the fixture induces, and the BFS oracle over it.
      *Done: `src/fixtures/graph.ts` induces adjacency over open edges only;
      `src/oracle/bfs.ts` lives outside `src/sim/**` so it shares no code with the
      engine — which is the only reason its answer is worth measuring ants
      against. A guard in `spec/engine-honesty.test.ts` fails if the engine ever
      imports it.*
- [x] The test files, red before the engine exists, each red for a stated reason.
      *Done: 14 red, 34 green. 8 reds are "Cannot find module src/sim/engine.ts",
      4 are "Threshold X has not been derived yet", 2 are the src/sim guard
      refusing to pass vacuously. No red is a syntax error. Thresholds are imported
      from one place (`spec/thresholds.ts`) and every one is still `null`.*
- [ ] The chosen engine, headless, no rendering.
      *Done when: conservation invariants and determinism both pass, and the
      determinism test has been seen to fail against a deliberately unseeded
      run.*
- [ ] Behaviour (2) — lock-in at forgetting = 0.
      *Done when: the colony demonstrably does not switch on the fixture, and
      the test goes red against a max-update freshness field. This is the
      discriminating test; if it cannot be made to pass, the model is wrong and
      we return to Decision 1 rather than tuning.*
- [ ] Behaviours (1), (3), (4).
      *Done when: each passes, and each has been seen red against the negative
      control paired with it in `spec/oracles.md` §3.*
- [ ] **`scripts/spike.ts`, run by `pnpm spike`** — a named sensor, not a
      scratch file. Prints the reading and an ASCII map of the fixture so the
      engine can be inspected before anything renders.
      *Partly done: the sensor exists and prints the fixture, the map and the
      parameters; it says "no engine — nothing has been measured, so nothing may be
      concluded" instead of a reading. The map has already paid for itself — drawn
      as `NEST--S1==S2--S3--FOOD`, it makes the severed branch and its two reachable
      stubs obvious, which is precisely the thing my `NEST`→`S2` = 6 error missed.
      Not done until it prints a real reading and where the ants are.*
- [x] `α`/`h` and the pheromone floor as **committed fixture parameters**, printed
      by `pnpm spike` and reported with every distribution (`spec/oracles.md`,
      spike watch).
      *Done: `h = 2`, `k = 20` (Deneubourg et al. 1990), `floor = 0` (first value,
      to be probed). Committed in the fixture, authoritative in `spec/oracles.md`
      §2, printed by `pnpm spike` on every run alongside the warning that a failure
      to lock in at `h = 1` is not evidence against 1b.*
- [ ] **`spec/mutants.test.ts`** — all six mutants, three load-bearing and three
      parameter pins, running under `pnpm check` and asserting RED on the fixtures
      (Decision 6 amendment).
      *Done when: each fails the behaviour it is paired with, the
      `η`-encodes-distance mutant is caught by the honesty test rather than a path
      test (it will pass those), and a mutant that stops being red fails the
      roster.*
- [ ] Derive the thresholds by two-sided separation (Decision 6,
      `spec/oracles.md` §3).
      *Done when: both distributions are recorded, every threshold has a stated
      margin on each side, and no threshold was moved to make a gap appear.*
- [ ] Derive the **performance budget**: steps per second at fixture size, a frame
      budget at 390×844, and a bundle-size ceiling.
      *Done when: each number comes from a measurement on real hardware and is
      written into `spec/oracles.md` §2 with the hardware named — a budget nobody
      measured is a wish.*

## Slice 2 — the readout, still no chrome

- [ ] The reading: median trip length over the last `N_trips` **completed
      food→nest trips**, as a ratio to BFS. Not a step window (Decision 5).
      *Done when: the trace matches the distributions recorded in slice 1, and
      below `MIN_TRIPS` it reads "no reading yet" rather than a number.*
- [ ] The trace the history line will plot — the same series, no smoothing.
      *Done when: it is the identical series the test reads, not a copy that
      could drift from it (`spec/oracles.md` §2).*
- [ ] The core-interaction contract as a test in `spec/`.
      *Done when: it passes on the fixture and has been seen red.*

## Slice 3 — render the argument

- [ ] Canvas as a pure projection of the logical graph; edge pheromone as glow.
      *Done when: a mid-interaction resize only redraws — the sim state and the
      ratio trace are unchanged across it.*
- [ ] Beat 2 legible without prose: the shortcut visibly empty while the long
      path glows.
      *Done when: a person who has read no text can say which way the ants are
      going. Verified by looking, at both viewports, and reported as such.*
- [ ] The history trace, plotting the slice-2 reading. One line, a 1.0× baseline,
      a vertical tick where the shortcut opens.
      *Done when: it fits the phone viewport without crowding the canvas, and any
      easing applied is to the drawing only, never to the series.*
- [ ] **Screenshots at 1920×1080 and 390×844, archived under `docs/`.**
      *Done when: both are committed and linked with relative paths, so "verified at
      both viewports" is a thing a marker can see rather than a claim they have to
      take. Repeat for slices 4 and 5 — the screenshot is the evidence, and it does
      not count towards any word budget.*

## Slice 4 — controls

- [ ] Three controls, no more: **toggle a wall cell** (this is what opens the
      shortcut — there is no separate open/close control, Decision 2a), the
      forgetting slider (native range), and **run/pause/reset with run/pause
      visible** (WCAG 2.2.2, every visitor).
      *Done when: every one is operable by keyboard alone, the tab order is sane at
      both viewports, and the wall toggle is the same tool the epilogue and beat 4
      will reuse.*
- [ ] The reduced-motion branch its own test (Decision 8).
      *Done when: with the preference set, there is no autoplay, cadence is ≤ 4 fps
      or the step-200 control is present, decorative motion is absent, and trail
      growth still happens. Verified with the media query forced on — the branch
      that is never exercised is the one that is broken.*
- [ ] Screenshots at both viewports, archived under `docs/`.
      *Done when: committed and linked with relative paths.*
- [ ] `prefers-reduced-motion` per Decision 8: decorative motion dropped (glow
      pulsing, easing, jitter), informative motion kept (trail growth, ants
      moving), no autoplay for those who set the preference.
      *Done when: both paths are verified with the media query forced on and off —
      reasoned about is not verified — and beat 1 still shows emergence from zero
      pheromone in the no-autoplay path.*

## Slice 5 — the page

- [ ] `h1`, then eight sentences to the Decision 7 slots: six for the argument,
      one for the citation, one holding all three applications. ODbL, if beat 4
      ships, is a footer credit and not one of the eight.
      *Done when: each slot is filled by exactly one sentence, the applications
      sentence carries all three items, and no ninth sentence has appeared.*
- [ ] A test that counts prose sentences in `dist` and fails above eight, with the
      counting rule from Decision 7 (`h1`, ODbL footer, control labels, readouts and
      ≤ 4-word hints excluded).
      *Done when: it has been seen red against a ninth sentence.*
- [ ] The two fixed endings held by test: the applications sentence ending
      **"— and none of it is how Google Maps routes you"**, and the last argument
      sentence keeping **"a tendency, not a guarantee"**.
      *Done when: both are asserted, so a later edit for flow cannot quietly remove
      the page's two refusals to overclaim.*
- [ ] Replace the starter page; `spec/starter.test.ts` goes red and is deleted.
      *Done when: the invariants still pass against the built site.*
- [ ] Screenshots at both viewports, archived under `docs/`.
      *Done when: committed and linked with relative paths.*

## Slice 6 — the epilogue, "break it yourself"

Only after beats 1–3 land. The first thing cut if anything above is unfinished.
No new control: it is the same wall-toggle verb from slice 4 (Decision 2a).

- [ ] Free toggling on the grid graph induced by the cells.
      *Done when: the epilogue invariants hold — no ant inside a wall, BFS
      recomputed after every toggle, toggling operable from the keyboard alone —
      and no threshold has been added, because a visitor's maze has no correct
      answer (Decision 2c).*

## Slice 7 — the sensors this repo does not have

- [ ] A real-browser check for the viewport line, since jsdom cannot judge
      layout (`spec/oracles.md` §1).
      *Done when: it fails against a deliberately overflowing page.*

## Slice 8 — beat 4, re-skin only, LAST (Decision 4)

Scheduled last on purpose: it may only start once the lock-in/switch beat is
legible without prose.

- [ ] The street fixture. Prefer `scripts/build-map.ts` from an OSM extract, with
      ODbL attribution on the page and a diff test on the generated JSON.
      Fallback: a hand-simplified street grid, **labelled as such** on the page.
      Decide which when we get here, not now.
      *Done when: the generated fixture is committed, the diff test passes, and
      BFS on it gives a sane distance.*
- [ ] The same engine, same reading, same three controls, same verb
      (toggle = close/open a street).
      *Done when: no new verb, no new readout, no new control, and no more than
      three sentences of its own. If any of those is needed, it is cut — no
      negotiation at the time.*

## Evidence — runs alongside, not at the end

- [ ] **Verify the citations against the sources before that sentence ships.** Open
      them; do not trust memory, the director's or mine.
      - Goss, Aron, Deneubourg & Pasteels (1989), "Self-organized shortcuts in the
        Argentine ant", *Naturwissenschaften* 76:579–581
      - Deneubourg, Aron, Goss & Pasteels (1990), "The self-organizing exploratory
        pattern of the Argentine ant", *J. Insect Behavior* 3:159–168
      - the "long branch first → colony stays trapped" variant as summarised in
        Dorigo & Stützle (2004), *Ant Colony Optimization*, ch. 1
      *Done when: each claim the page makes is traceable to a source that was
      actually opened, and anything that turns out not to be supported is cut from
      the page rather than softened.*
- [ ] `docs/harness-log.md` gets an entry each time a correction lands in the
      harness rather than in a retry. Decision 1b requires one either way on the
      `Q/L` flag: whichever variant is discarded stays in history.
- [ ] `docs/prompts.md` gets the prompts worth keeping, paired with commits.
- [ ] `PROCESS.md`: 400–600 words, three or four moments, citations resolving.
      *Done when: `pnpm check:evidence` is green.*
- [ ] `reflections/assignment-1.md`: 150–300 words, the two standing prompts.
      *Done when: `pnpm check:evidence` is green.*

## Ship

- [ ] `pnpm check` green, `pnpm check:evidence` green.
- [ ] Repo public, Pages enabled, deploy finished, live URL serves at both
      viewports. CI needs time to finish — green *later* is not green.

## Slice 1b — the field, and the graded-deposit sweep (Decisions 16, 17)

The page's fixture moves from the 12-node double bridge to a 60×40 field. The
bridge stays as the fast unit-test and oracle fixture. **Nothing is adopted until
the sweep produces a variant that forms a road.**

- [x] `scripts/build-field.ts` → `src/fixtures/field.ts`, committed data, diff test
      (`spec/field.test.ts`). BFS **101 round the wall / 51 through the gap, ratio
      1.980**, zone to zone.
- [x] `pnpm spike --fixture=field` — the first answer was **no road at any size**;
      recorded in `docs/spikes/2026-08-17-field.md`. Fixed deposit gives no
      direction in 2-D.
- [x] **Checkpoint 1** — the four-parameter generalisation (graded deposit,
      momentum weight, whisker, arrival zones), every default today's behaviour,
      with `spec/engine-regression.test.ts` freezing 34 bridge digests.
- [x] **Checkpoint 2** — the variant sweep, Stage A (does a road form?) and Stage B
      (the four behaviours), into `docs/spikes/2026-08-17-field-graded.md`.
      Spike only: no adoption, no default changed, no threshold touched.
- [ ] The derive turn, *after the director picks a variant*: thresholds per
      fixture, ρ band per fixture, mutants two-sided on the field, `CLAUDE.md`
      engine-contract lines amended through `harness-sync`.
- [ ] If no variant forms a road: stop, do not add a fifth knob — the next ruling
      is the Q/L retrace fallback.
- [x] **Field v2 + Stage C** (Decision 18) — the fork moved to the ants' feet
      (BFS **58 / 30, ratio 1.933**), and the scale hypothesis tested across
      D x rho. Geometry cause fixed; scale cause **not** fixed. Recorded in
      `docs/spikes/2026-08-17-field-v2-stage-c.md`.
- [ ] The director's ruling on a fifth knob (a per-step wander rate). Not assumed.

## Slice 1c — ε rejected, the claim becomes B′ (Decisions 21, 22)

The claim changed, so the slices after it change with it. "A middle band of
forgetting makes them switch" is false on this field: **lock-in is absolute**.
The verb becomes *block the road*, and forgetting is what heals it.

- [x] The advisor's four spikes reproduced in-repo, byte-identical apart from the
      run-time stamp: `spike-staged` (ε), `spike-sequence`, `spike-block`,
      `spike-block-fine`. Records in `docs/spikes/*-advisor.md`.
- [x] ε applied from `docs/spikes/2026-08-17-wander-epsilon.patch` to run Stage D,
      then **reverted** — not adopted. `scripts/spike-staged.ts` refuses to print
      a table without it.
- [x] Two supplementary spikes in the visitor's own order
      (`docs/spikes/2026-08-17-field-v2-raise.md`): raising ρ on a formed road,
      and blocking after raising it.
- [x] `PLAN.md` Decisions 21 and 22; `CLAUDE.md` claim and beats; harness log.

### What is left, in order

- [ ] **The blocking control and its tests.** The verb becomes draw/block a wall
      cell; the doorway toggle becomes the epilogue footnote. Behaviour tests
      re-pointed to (2′) slow heal + ghost road at ρ = 0, (3′) heal within N at
      ρ > 0, (4′) no road or no heal at high ρ. Mutants re-paired.
- [ ] **Derive on the field.** Thresholds per fixture, ρ band per fixture, both
      margins, mutants two-sided. Regime labels come back on when this lands, and
      `CLAUDE.md`'s Decision 11 slider line is amended with them.
- [ ] **The eight sentences** (slice 5), the h1 from B′'s title candidate.
- [ ] **The epilogue** — free wall drawing, and the "it never takes the shortcut
      you open" footnote, if it earns its place.

### Two open questions the supplementary spikes raised

Neither is a defect; both are the director's to settle, and both change a control
or a beat rather than the engine.

- [ ] Beat 2's ghost road needs ρ = 0 **before** the road forms. Does the beat
      instruct that order, or does the slider's zero need to mean something else?
- [ ] Beat 4 is unreachable from the shipped slider: destroying a formed road
      needs ρ ≥ 0.2 and the maximum is 0.05. Widen the range, or make beat 4 a
      cold-start beat?
