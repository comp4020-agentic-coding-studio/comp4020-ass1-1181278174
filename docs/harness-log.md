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
