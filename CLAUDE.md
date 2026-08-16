# COMP4020 Assignment 1 — the colony's intelligence is in how fast it forgets

Static site, plain HTML/CSS/TypeScript on Vite, on GitHub Pages. **The deployed URL is what
gets marked**, live in Chrome at 1920×1080 and 390×844 — both in full. The course site's spec
(assessments/assignment-1) is the fixed contract. `PLAN.md` holds my decisions (director
records, agent proposes), `spec/oracles.md` every threshold's derivation, `TASKS.md` the
slices, `docs/harness-log.md` and `docs/prompts.md` the evidence.

**This next section holds what the site *is* and what I decided; the "must have bitten" rule
governs every other section.** Clauses wrapped in guillemet marks below are verbatim from
`PLAN.md` or `spec/oracles.md`; `spec/harness-sync.test.ts` goes red if one drifts.

## This prototype

- **The claim (h1 draft):** *The colony's intelligence is not in any ant. It is in how fast
  they forget.* Four beats, one mechanic — a trail forms from nothing, a shortcut opens, the
  colony stays locked to the long way, the forgetting slider breaks it out; see `PLAN.md`.
  Beats 1–3 are the assignment. Beat 4 (a Canberra street fixture) is a re-skin, scheduled
  last, cut without negotiation if it needs **«a new verb, a new readout, a new control, or
  more than 3 sentences of its own»**. A second mechanic (parameter panel, traffic model, TSP,
  graph routing, a third scene, algorithm comparison) is out — say so instead of building it.
- **Beat 1 is live emergence.** Zero pheromone at load, nothing pre-baked. The opening, not a
  tutorial: after ≤ 2 of the six argument sentences a visitor with no background can say "each
  ant only leaves a little scent and follows scent" and "nobody planned that road". Verified
  by a cold read (two people with no background) — no test can hold it.
- **Three controls, hard cap:** toggle a wall cell (one verb: opens the shortcut, closes a
  street, free-draws in the epilogue) · forgetting rate — native `<input type=range>`, linear
  **0.00–0.25 step 0.01, default 0.12**, "never forget" to "forget everything"; behaviour (4)
  is measured at the maximum 0.25, never at ρ = 1, which is off the control (Decision 11) ·
  run / pause / reset — pause **visible**, because WCAG 2.2.2 applies and the sim runs forever.
  The epilogue is invariant tests only, no thresholds (the list is in `PLAN.md`), because a
  visitor's own maze has no correct answer.
- **Prose ≤ 8 sentences:** 6 argument + 1 citation + 1 carrying all three applications (ends
  "«— and none of it is how Google Maps routes you»"). h1, ODbL footer, control labels,
  readouts and ≤ 4-word hints do not count; *a test may count prose sentences in dist and fail
  above 8*. The last argument sentence keeps "«a tendency, not a guarantee»". **Jargon rule** —
  `pheromone`, `ACO`, `heuristic`, `ρ`, `stigmergy`, formulas and pseudocode appear only in
  the citation and applications sentences: my implementation of Decision 7 for a visitor with
  no background, not a rule that has bitten.
- **Stack:** plain Vite + TypeScript as shipped — one page, one canvas. An SSG's page layer
  would add config and base-path risk without serving the brief. `base: "./"` already handles
  the Pages path; do not change it.
- **Engine (Model 1, mode 1b, explicit graph):** two pheromone maps on the edges — seekers lay
  "home" and steer by "food", carriers lay "food" and steer by "home". Each ant holds one bit
  (carrying or not) and reads only the edges at its node. Fixed deposit per step, no retrace.
  *The Q/L retrace flag stays OFF by default and is enabled only on spike evidence; either
  outcome is logged in `docs/harness-log.md` and the discarded variant stays in history.* Both
  maps evaporate at `ρ`; **`ρ` is the slider.** `src/sim/**` is pure TypeScript: no DOM
  imports, seeded PRNG only, fixed-step and decoupled from `requestAnimationFrame`, `step()`
  never renders. The canvas is a pure projection of a fixed logical graph — a resize only
  redraws. **The engine is host-agnostic** — runs unchanged in Node (spike/tests), on the main
  thread, or in a Worker; where it runs in the page is a slice-3 decision, two options with
  trade-offs, mine to make.
- **Required behaviours, proven headless before any UI:** the four behaviours, `PLAN.md`.
  **«If 1b cannot, we reopen Decision 1 toward 1a — we do not tune thresholds to pass.»**
- **The reading:** **mean** trip length over the last `N_trips` completed food→nest trips,
  divided by BFS shortest — same unit, moves between the two arrival zones. Mean, not
  median: on a two-valued fixture the median is a step function, and at ρ = 0.3 it read
  2.000× while 48% of trips were short (Decision 5, amended). Below `MIN_TRIPS`
  it says "no reading yet", never a number. **One function** computes it for the UI, the trace
  and the tests. The secondary readout (share of ants on the shorter branch) is never
  thresholded.
- **Verification contract:** thresholds (`LOCKED`, `SWITCHED`, `UNSTABLE`, `N`, `M`, `K`,
  `N_trips`, `MIN_TRIPS`) are symbols until the spike derives them by two-sided separation
  against the negative controls; distributions and margins go in `spec/oracles.md`. Six
  mutants live in `spec/mutants.test.ts` and run under `pnpm check`, asserting RED — three
  load-bearing, three pins, named in `spec/oracles.md`. `pnpm spike` (`scripts/spike.ts`)
  prints the reading, an ASCII map and the fixture parameters (`α`/`h`, pheromone floor); no
  lock-in conclusion is recorded without them.
- **Who owns which number:** `spec/oracles.md` owns fixture parameters (`α`/`h`, floor,
  `N_trips`, thresholds); `src/sim/params.ts` owns engine constants (deposit, step, ant-count).
  Neither is edited without asking.
- **Two load-bearing rules, verbatim:**
  - *«a threshold that has never been red is not a test».*
  - *«the heuristic term η is a constant or purely local (momentum only) — it must never encode distance to food, or beat 1's sentence ("no ant knows the map") is false»*
- **Data contract (beat 4 only):** the street fixture is generated by `scripts/build-map.ts`,
  never hand-edited; a diff test guards it; ODbL attribution stays on the page.
- **Artefact contracts, from the rubric** (keyboard, both viewports, resize mid-use): canvas
  has `touch-action: none` and pointer capture; every pointer action has a keyboard path — the
  map is in `PLAN.md`; coordinates normalised; `aria-pressed` on toggles, a throttled
  `aria-live` readout; `prefers-reduced-motion` keeps informative motion, drops decorative
  motion, does not autoplay, and slows the cadence to *≤ 4 fps or a "step 200" button* — with
  *a dedicated test for the reduced-motion branch*, because the branch nobody exercises is the
  broken one.

## How to work in here

- Keep `pnpm dev` running; run `pnpm check` before pushing (typecheck → build → oxlint →
  stylelint → vitest). **While the repo is private, CI runs nothing** — see Facts that bite,
  which is why the evidence files must be green before the flip, not during it. Reproduce the
  links check with CI's own command from `.github/workflows/checks.yml`, not from memory.
- Sensor roster = `package.json`'s `check`, `.github/workflows/checks.yml`, and the spike and
  mutants above.
- **"Never commit a red state" means never commit a regression.** Oracle tests start red by
  design and the commits that flip them green are process evidence. Committing with an oracle
  still red is fine **when the message names which one and why**. Making a test green by
  weakening it never is.
- Read a red check's output before changing anything — the failure message is the instruction,
  and the page is wrong until it is green.
- **Stuck: stop and ask, do not loop.** Two failed attempts on one theory is the signal.
  Report what you tried, what you observed, what you now think, then wait.
- **Can't verify: say so and route it — but check whether it's the tool first.** "Can't be
  checked here" needs evidence like any other claim.

## Working with me — stopping points and evidence obligations

The marked thing is *my* directing. A fix I never saw is not evidence; a run I could not steer
is not directing.

- **One bounded task per turn**, then stop and report. The next thing you noticed goes under
  "next".
- **Stop at the first red check**, never fix it silently. Paste the failure, say what you think
  went wrong, offer: (a) fix the code, (b) add a rule here, (c) add or tighten a check, (d)
  throw the attempt away. Wait for my pick.
- **Two attempts, then stop.** A third on the same theory is never what is needed.
- **Design decisions are mine.** More than one reasonable answer → at most two options with
  trade-offs and a recommendation, then wait. Decisions go to `PLAN.md`, quoted, with
  provenance.
- **Never edit `spec/oracles.md`, any threshold, or `src/sim/params.ts` without asking.** A
  threshold that does not hold is a finding to report, not a number to change.
- **You stage, I commit, I push.** Propose the message (what / why / how verified / not
  verified / harness change). Small commits, one idea each. Never push.
- **List what you fixed on your own** under "fixed silently", so I can decide whether it earns
  a rule or a check.
- **Cap the run.** After ~10 tool calls without a checkpoint, or ~15 minutes, report progress
  even if unfinished. On interrupt, summarise state and wait.
- **The evidence block ends every turn** — commands + output, diff shape, what you observed at
  both viewports (or "no UI yet"), what you did not verify, fixed silently, next.
- **Never paraphrase a director message as though quoted, and never invent one.** If there is
  no message to quote, say so.
- **Adding to this file:** the trigger is you corrected the agent on the same thing twice, or a
  check caught you unexpectedly — nothing else earns a place.
- **One commit per rule, when it happens** — this file's growth is process evidence and
  `PROCESS.md` cites those commits.

## The working loop

1. **Explore** — read the relevant source *and the checks* first.
2. **Plan** — the change, its boundary, and **how it will be verified, before writing code**.
   One-sentence diffs may skip this; unfamiliar, multi-file or open-ended ones may not.
3. **Implement** — one bounded change; a second worth doing gets its own commit.
4. **Verify** — all three: `git diff --numstat` then read it; `pnpm check` (+ `pnpm spike` when
   the engine changed); the rendered page at both viewports. **A failed verify sends you to
   step 1, not to a patch.**

**"Done" is a claim.** End every loop — and every commit message — with what you ran, what it
printed, the diff, what you observed in the artefact, and **what you did not verify**.

**A new test has to be proved capable of failing.** Break what it guards on purpose, watch it
go red, put it back. A guard that cannot fail is decoration.

**Corrections land in the harness, not in a retry.** Twice wrong → pick one: a rule here (with
its reason and the failing commit), a check (test / lint / spike assertion), or `git revert`
with the reason in the message. Log it in `docs/harness-log.md`.

## Facts about this repo that bite

An entry earns its place only after it has cost time in *this* repo and is not guessable from
the code. Shape: what happened, what is actually true, how it was measured. Delete it when it
stops being true. Nothing is carried here unverified.

### CI is skipped while the repo is private — not merely "CI-only"

**What happened.** A push showed a run in progress, and the agent reported that Actions minutes
were available and every push would now give real CI signal.

**What is actually true.** Both jobs skip while the repo is private; nothing runs. The first
real run of `check:evidence` is at ship time, and it gates `deploy` — so the evidence files must
be green *before* the flip, not discovered during it.

**How it was measured.** Run `31954015672` on `main`: `check` skipped, `deploy` skipped
(`gh run view 31954015672 --json jobs`).

### `tsconfig.json` only typechecked the root and `spec/`

**What happened.** `pnpm typecheck` was green while `src/` and `scripts/` were not being
looked at. The engine was about to land in `src/sim` entirely unchecked, and the check
that would have said so was reporting success.

**What is actually true.** `include` was `["*.ts", "spec"]` — a whitelist, not a
default. It is now `["*.ts", "spec", "src", "scripts"]`. A green typecheck means
nothing until you know what is in scope.

**How it was measured.** Widening `include` immediately surfaced five pre-existing type
errors in the starter's own `scripts/check-evidence.ts` (`toSorted` against an ES2022
`lib`), fixed by moving `lib` to ES2023 — which the code already relied on at runtime.
Five errors in a file that had shipped, under a check that had always been green.

## Before you commit the page

`lang` on `<html>` · non-empty `<title>` · viewport meta · exactly one `<h1>` · `alt` on every
`<img>` · **a real `<nav>` of in-page anchors (Claim / Try it / Sources) plus a skip link** —
the single page still owes the invariant a navigation landmark (`spec/invariants.test.ts`
enforces all six against `dist/`) · `aria-label` on the canvas · `aria-pressed` on toggles · a
throttled `aria-live` readout · a visible pause · `prefers-reduced-motion` honoured ·
`spec/starter.test.ts` deleted with the starter page (its failure is not a regression; re-adding
`data-testid="intro"` is the wrong fix).
