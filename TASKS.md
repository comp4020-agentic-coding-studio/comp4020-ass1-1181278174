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

- [ ] Write the working agreement and the facts that bite into `CLAUDE.md`:
      one bounded task per turn; stop at the first red check and offer choices;
      two failed attempts then stop; never change a threshold, `spec/oracles.md`
      or params without asking; stage, don't commit; every turn ends with an
      evidence block. Plus: fixed-step sim decoupled from rAF, canvas as pure
      projection of a fixed logical graph.
      *Done when: the file states the rules the rest of the work is held to, and
      the boilerplate that is prose rather than instruction is gone.*
- [ ] Two rules go in as written rules, not as understandings:
      **"a threshold that has never been red is not a test"**, and **η may never
      encode distance to food** (Decision 1c — the invariant that protects the
      claim rather than the code).
      *Done when: both are in `CLAUDE.md` verbatim, before any engine code
      exists.*

## Slice 1 — the spike, headless, no UI

- [ ] The double-bridge fixture as committed data: nest, food, long branch,
      short branch closed.
      *Done when: BFS gives the hand-checkable answer before and after the
      shortcut opens, and both are recorded in `spec/oracles.md`.*
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
      *Done when: `pnpm spike` shows where the ants actually are, the ratio, and
      the fixture parameters in use — and the ASCII map made at least one thing
      visible that the numbers alone did not.*
- [ ] `α`/`h` and the pheromone floor as **committed fixture parameters**, printed
      by `pnpm spike` and reported with every distribution (`spec/oracles.md`,
      spike watch).
      *Done when: no conclusion about lock-in is recorded anywhere without them
      stated next to it. At `h = 1` weak lock-in is expected, so a failure at
      `h = 1` is not evidence against 1b.*
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
