# Harness log

Every time a correction lands in the **harness** — a rule in `CLAUDE.md`, a
check wired up, a threshold derived, an attempt thrown away — it gets an entry
here.

This file is feedstock for `PROCESS.md`, not a substitute for it. `PROCESS.md`
carries three or four moments; this log carries all of them, so the three or
four can be *chosen* rather than remembered.

Why the distinction is worth the file: re-prompting until something passes is the
routine case. Changing what the work is held against is the skilled one, and it
is the thing the assignment's largest criterion is looking for. Entries here are
the second kind only.

## Format

Each entry answers four questions. Two of them the repo cannot answer on its own,
and those two are where the marks are.

```markdown
### <date> — <one-line title>

**What happened.** The failure, or the thing that went wrong. Concrete.

**What I did instead of the obvious thing.** The obvious thing was usually to
fix the instance. What was changed instead, and why that beat the obvious one.

**How I knew it was right.** The check that went red then green, the viewport
looked at, what was read before the diff was accepted. Not "it worked".

**Citation.** Commit or range, and which file the rule landed in.
```

## Entries

<!-- Newest last. -->

### 2026-08-17 — the mutants moved into the roster, and the spike got a false-negative guard

**What happened.** Three separate problems in one review, all of them in the
harness rather than in any code, because there is no code yet.

The negative controls existed only as a table in `spec/oracles.md` and a step in a
derivation protocol — something to do once, when thresholds were first chosen.
Separately, `PLAN.md` asserted that every decision was quoted verbatim when
Decisions 6–8 had been option selections that the agent then paraphrased as
quotations. And the spike protocol had a trap in it: Decision 1a says a failure to
lock in sends the work from deposit mode 1b to 1a, but lock-in sharpness in 1b
depends on the choice nonlinearity — Deneubourg's `(k+τ)^h`, `h ≈ 2` — and on any
pheromone floor. At `h = 1` lock-in is weak *by construction*.

**What I did instead of the obvious thing.** The obvious fixes were: tick the
controls off during derivation, correct the preamble's wording, and remember to set
`h` properly.

Instead all three became structural:

- the six mutants moved into **`spec/mutants.test.ts` running under `pnpm check`**,
  asserting RED on the fixtures. A mutant that stops being red is now a regression
  the roster catches — "a threshold that has never been red is not a test" stopped
  being a slogan and became a standing check.
- `PLAN.md` now records **provenance per decision** — which arrived as director text
  and which were selections from agent-drafted options. The rule that replaced the
  wording fix: never paraphrase a director message as though quoted, and never
  invent one to satisfy a request for a quotation.
- `α`/`h` and the pheromone floor became **committed fixture parameters, reported
  with every distribution**. Remembering to set `h` would have failed silently the
  first time somebody didn't; requiring them next to any lock-in conclusion means a
  false negative cannot be recorded as a finding.

**How I knew it was right.** The third one is checkable by reasoning about what it
prevents: before it, a spike run at `α = 1` could have produced "1b cannot lock in",
satisfied Decision 1a's reopen clause honestly, and moved the whole engine to 1a for
no reason — a wrong conclusion reached by a correct protocol. After it, that run is
inadmissible without its parameters stated. The first is checkable by the roster
itself once the mutants exist: `pnpm check` will fail if any mutant goes green.

The second is the one with no test. It is a rule about how the record is written,
and only a reader can enforce it — which is why it is written into the document a
reader opens first.

**Citation.**
[`e05b790`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/e05b790)
— `PLAN.md` (Decisions 6–8 and the provenance preamble), `spec/oracles.md` (the
mutants split and the spike watch), `TASKS.md` (slice 1).

### 2026-08-17 — the drift the review caught twice now has a check

**What happened.** The review found two contradictions inside single documents:
beat 1 saying "a trail is already there" while Decision 2b said zero pheromone at
load, and a superseded "5 of the 8" arithmetic sitting three paragraphs from the
Decision 7 that replaced it. Both were the same failure — two copies of one fact,
drifting apart — and a person caught both because no check could. Writing
`CLAUDE.md` then made it worse on purpose: it restates ~500 words of `PLAN.md` and
`spec/oracles.md` verbatim, because the agent reads `CLAUDE.md` every turn and the
others only when told to.

**What I did instead of the obvious thing.** The obvious thing was to be careful,
and to reread all three files after every edit. That is what had just failed
twice.

Instead the duplication became *declared and checked*: clauses in `CLAUDE.md` that
claim to be verbatim are wrapped in guillemet marks, and
`spec/harness-sync.test.ts` asserts each one still appears in `PLAN.md` or
`spec/oracles.md`, whitespace-normalised, under `pnpm check`. The duplication is
still there — it is the right call for a file read every turn — but it can no
longer rot silently. Six clauses are held, including both load-bearing rules and
Decision 1a's reopen clause.

**How I knew it was right.** It was red before it was green, three times, and
every red was informative:

1. it matched its own documentation line, which typed a literal marker pair — the
   convention was self-referential, so the doc line was reworded to describe the
   marks instead of using them;
2. it could not match anything inside a `>` blockquote, which is exactly how
   `PLAN.md` stores every quoted director decision — whitespace was normalised but
   blockquote prefixes were not, so a wrapped quote line injected a stray `>` mid
   clause (`PLAN.md:285`);
3. same cause as (2) for beat 4's cut criteria.

All three were defects in the test, not drift in the documents — which is the
outcome that matters: had the normaliser shipped green by luck, it would have been
a guard that could not fail, and there are now two of those found this session.

Then the deliberate break: one word inside a marked clause changed
(`a tendency, not a guarantee` → `not a promise`), red on that clause alone with
the other seven still passing; reverted, green at 8/8. A guard that cannot fail is
decoration.

**Citation.** This commit — `spec/harness-sync.test.ts` (new), `CLAUDE.md` (the
marker convention and six marked clauses), `TASKS.md` (slice 0, last item).

### 2026-08-17 — the freshness mutant needed a reason to switch, not just a reason to forget

**What happened.** Checkpoint C's derivation surfaced four separations that
were either vacuous or mispaired. The freshness-field mutant argmaxed with zero
exploration, so on a fixture where every choice value starts at zero it could
never discover the shortcut existed — LOCKED and UNSTABLE/K "separated" only
because something that cannot look for the short path also cannot be shown
failing to hold the long one under duress. The one-pheromone-map mutant was
paired against behaviour (1) despite emerging a near-shortest path just fine,
which made it a false negative left where it was. And N_trips's derivation rule
was written before it was run, stating a criterion (smallest window, low tail
noise, no crossing lag) that turned out not to discriminate across 50–500 trips
on this fixture at all.

**What I did instead of the obvious thing.** The obvious fix for the freshness
mutant would have been to lower LOCKED and UNSTABLE until the vacuous
separation looked like a real one. Instead ε-greedy exploration (ε = 0.06, the
value the director's own prior spike used) was added to the mutant itself, so
it is a genuine max-update model rather than a model that happens never to
update — argmax with probability 0.94, uniform over open edges with
probability 0.06. One-pheromone-map moved to behaviour (3)'s pairing, where its
actual failure mode (seeker and carrier signal conflated into one trail,
unreliable switching) actually lives. N_trips's rule was rewritten to say what
happened — the primary criterion returned no answer on this fixture, so the
secondary criterion (display stability, the window every prior spike already
used) decided it — rather than leave a rule on record that the run itself
contradicted.

**How I knew it was right.** Rerunning `pnpm derive` after the ε-greedy fix
showed LOCKED and UNSTABLE/K separating on real behaviour: the freshness field
now finds and holds the shortcut at ρ = 0, where the real engine stays locked
(worst 2.000 vs. freshness best 1.047), and destabilises under forgetting where
the real engine's longest run below any UNSTABLE candidate stays at 0–1 samples
against the freshness field's 24. The re-pairing is checkable against the
EMERGED table directly: one-pheromone-map's best settle ratio (1.037) is
already below EMERGED (1.15), so it was never a legitimate control for
behaviour (1) — it belongs to (3), where its worst switched-reading is what
actually fails to clear SWITCHED.

**Citation.** This commit — `spec/mutants/freshness.ts`, `spec/mutants/index.ts`,
`scripts/derive.ts`, `spec/oracles.md` §3, `spec/thresholds.ts`,
`docs/spikes/2026-08-17-derivation.md`.

### 2026-08-17 — the SWITCHED test read the real engine at the wrong rate, and threshold-vs-test drift got a shared source

**What happened.** `pnpm check` went red on behaviour (3) once the thresholds
above were derived: `spec/engine-behaviours.test.ts` hardcoded ρ = 0.05 for
behaviours (1) and (3), left over from before Decision 11 fixed the slider's
default at 0.12. `scripts/derive.ts` correctly derived EMERGED, SWITCHED and M
at 0.12 — the actual default — so the test was asserting SWITCHED (1.45)
against a rate that the fine sweep already on record in `spec/oracles.md`
shows locks in (ρ ≤ 0.08), not switches. The reading of 1.953× is what a locked
colony gives; the engine was never wrong, the test was asking it the wrong
question. Behaviour (4) carried the same class of bug already, hardcoding
ρ = 1, which Decision 11 explicitly rules out ("never at ρ = 1, which is off
the control") — it stayed green only because its assertion is loose enough
for a degenerate run to pass by accident.

**What I did instead of the obvious thing.** The obvious fix was to change
0.05 to 0.12 and 1 to 0.25 in place, in the one file that was red. Instead both
rates moved into a new `src/sim/rho.ts` — `RHO = { locked, default, max }`,
with the Decision 11 citation in the comment — and `scripts/derive.ts` and
`spec/engine-behaviours.test.ts` both import it rather than each holding their
own copy. This is the same drift class `spec/harness-sync.test.ts` exists for,
except numeric rather than textual: two copies of one fact — the rate a
threshold means something at — drifting apart, except a hardcoded number can
drift silently where a prose clause at least fails a string match. Placed in
`src/sim/` rather than `src/sim/params.ts` because it is not an engine
constant: the UI's forgetting slider will import the same `RHO.default`, so the
control's own default position cannot drift from the rate its readings were
actually derived at either.

**How I knew it was right.** `pnpm check` after the fix: behaviours (1), (2)
and (3) green, behaviour (4) unchanged in its own labelled-provisional state
(now measured at `RHO.max` rather than the forbidden ρ = 1), all six mutants
still red for cause, `harness-sync` green — full output in the evidence block
for this commit.

**Citation.** This commit — `src/sim/rho.ts` (new), `scripts/derive.ts`,
`spec/engine-behaviours.test.ts`, `spec/mutants.test.ts` (header comment).

### 2026-08-17 — the sweep ranked a variant with 47 trips first

**What happened.** The graded-deposit sweep scored 64 parameter combinations and,
when none passed the provisional line, fell back to ranking them by settled
reading alone. It put `T=∞ W=3 w=4 D=20` on top at 1.39× — a variant that had
completed **47 trips in 15,000 steps**. The real winner, at 1.42× with **18,885
trips**, came second. I nearly reported the wrong variant as best.

**What I did instead of the obvious thing.** The obvious fix was to eyeball the
table and pick the right one. That leaves the next run free to make the same
mistake with nobody watching.

Instead the failure mode became part of the selection: **trip count is a gate on
candidacy, not a tie-break.** A variant that barely gets anyone home can post a
flattering ratio *precisely because* the few ants that made it went straight — so
"enough trips for the mean to mean anything" has to be true before the mean is
compared at all. The threshold reuses the pass line's own trip criterion rather
than inventing a second number, and the reason is written where the code is, so a
reader meets the trap and its fix together.

**How I knew it was right.** Re-running with the gate moved
`T=80 W=3 w=4 D=20` to the top — the variant whose ASCII map plainly shows a road
and whose 99% of trips are home within 4× the shortest, against the 47-trip
variant's 79%. The gate changed the answer, which is the only evidence that a
guard was doing anything.

**Citation.** This commit — `scripts/spike-graded.ts` (the `credible()` gate and
its comment), `docs/spikes/2026-08-17-field-graded.md`.

