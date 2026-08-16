# Prompts

Curated, not a transcript. A prompt earns a place here when it changed the
direction of the work — and it is only evidence when it is paired with the commit
it produced.

A dump of every message is not evidence of directing. The selection is the
evidence: what was kept says what was judged to matter.

## Format

```markdown
### <date> — <what this prompt was for>

> the prompt, verbatim

**Produced.** Commit or range.

**Why it is here.** What it changed that the diff alone does not show — a
constraint that redirected the work, a decision it forced, an option it closed.
```

## Entries

### 2026-08-16 — the founding prompt: the claim, the four behaviours, the working agreement

The message that set the whole thing. It arrived after a conversation in which the
agent had argued that "explain ant colony optimisation" was a default CS-student
topic with no point of view, and offered phantom traffic jams, the ant mill and
slime mould as alternative vehicles. This is the reply: ants kept, but rebuilt
around a claim about *forgetting* rather than about ants.

**Produced.**
[`6cf7742`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/6cf7742)
— everything the plan is built on.

**Why it is here.** It is the message that turned a topic into an argument, and
four of its moves are invisible in the resulting diff:

- it supplied the **point of view** the agent had said was missing, in one
  sentence, with the double-bridge experiments as its evidence
- it named **four required engine behaviours before any engine existed**, which is
  what made a spike-before-UI order possible
- it **excluded a model on reasoning alone** — a max-update freshness field finds
  paths but cannot lock in, so it cannot carry the claim — and that exclusion
  later became the load-bearing negative control
- it set the **working agreement**, including "stop at the first red check and
  offer choices instead of fixing silently"

> Here is my sentence, and it is B.
>
> WHY MORE PEOPLE SHOULD UNDERSTAND THIS: we treat forgetting as a defect — in people, in
> organisations, in software memory — but in a colony it is the mechanism that keeps the group from
> locking onto its first bad answer. Real ants prove the point the hard way: in the double-bridge
> experiments (Goss/Deneubourg 1989–90), when the long bridge is found first and a shorter one is
> added later, the colony keeps marching the long way — real pheromone evaporates too slowly. The
> one thing engineers added to make artificial ants (ACO) beat real ones was faster forgetting. That
> is the claim I want a visitor to feel with their own hands, not read.
>
> CLAIM (h1 draft): "The colony's intelligence is not in any ant. It is in how fast they forget."
> Opening ten seconds = your A (no ant knows the map, the path appears anyway); the argument = B
> (open a shortcut, then turn the forgetting knob: at zero they never take it; too high, they learn
> nothing; in between, they switch in seconds). A is the setup, B is the idea — one arc, one
> mechanic (pheromone + evaporation), one extra control (the forgetting slider).
>
> TWO ACTS, SAME ENGINE:
>   Act 1 — you are the planner: draw walls to make a maze; the path grows; the readout shows the
>   ants' actual trip length vs the true shortest path (BFS). Then open a shortcut. Then the slider:
>   "how fast they forget". Optionally three colonies side by side at three forgetting rates on the
>   same maze — you propose whether that beats one slider.
>   Act 2 — the same colony on Canberra's ANU→Civic street grid (OSM, attributed): close a street,
>   reopen it, watch which forgetting rate copes. Applications named honestly, ≤ 3 sentences:
>   routing tables that age out stale routes (AntNet-style, ad-hoc networks), evaporation as the
>   key hyper-parameter in ACO logistics schedulers, and the ant mill as what no-forgetting looks
>   like in nature. Not "Google Maps does this".
>
> ON THE OTHER VEHICLES YOU RAISED: phantom traffic jams — the interactive space is saturated
> (Treiber's traffic-simulation.de is the canonical one) and my claim is not about traffic; ant
> mill — one sentence in Act 2, not a scene; slime mould — a different mechanism and someone else's
> story (Tero 2010). Staying with ants.
>
> ENGINE — REQUIRED BEHAVIOURS, TO BE PROVEN HEADLESS BEFORE ANY UI:
>   (1) a near-shortest path emerges from local rules only (ants read only their cell and a few
>       cells ahead; no ant holds a map);
>   (2) with forgetting = 0 the colony locks onto a first-found longer path and does NOT switch when
>       a shortcut opens (the double-bridge lock-in);
>   (3) with moderate forgetting it switches within a bounded number of steps;
>   (4) with forgetting too high the trail never stabilises.
>   Note: a pure "closeness/freshness field with max-update" model finds paths beautifully but does
>   not lock in (it always prefers the shorter value once seen), so it cannot carry claim B on its
>   own. Give me ≤ 2 candidate models that can exhibit all four behaviours (e.g. accumulate-and-
>   evaporate pheromone with sensing ahead; a hybrid), with trade-offs, and I will choose. Oracles:
>   BFS shortest path, the double-bridge fixture (long bridge first, shortcut later), conservation
>   invariants, byte-identical determinism per seed, a perf budget.
>
> TESTABLE CORE INTERACTION (draft, you sharpen it): "The visitor draws walls and opens a shortcut,
> then sets the forgetting rate; the readout shows the ants' median trip length / BFS shortest.
> Test: on the committed double-bridge fixture, at forgetting = 0 the ratio stays ≥ 1.8× after the
> shortcut opens for N steps; at the default rate it falls below 1.1× within M steps; at the
> maximum rate it never stays below 1.3× for K consecutive steps. Same seed → identical output."
>
> ARTEFACT: both viewports; keyboard path for every pointer action (arrow-key cursor + Enter to
> draw, shortcuts, the slider is a native range); coordinates normalised so a mid-interaction
> resize only redraws; zero runtime requests; data committed; prefers-reduced-motion respected.
> Guardrails: ≤ 3 controls (draw/erase, forgetting slider, run/reset), ≤ 8 sentences of prose, no
> parameter panel, no traffic model, no TSP, no third scene.
>
> HOW WE WORK (I will codify this in CLAUDE.md once the plan is agreed): one bounded task per turn,
> then stop and report; stop at the first red check and offer choices (fix / rule / check / discard)
> instead of fixing silently; two failed attempts → stop; decisions with more than one reasonable
> answer → ≤ 2 options + recommendation, then wait, I record them in PLAN.md; never change a test
> threshold, spec/oracles.md or params without asking; you stage, I commit; every turn ends with an
> evidence block (commands + output, diff shape, what you observed at both viewports, what you did
> not verify, anything fixed silently, next).
>
> YOUR TASK NOW — NO CODE:
>   1. Argue with this: ambiguities, assumptions, three readings of each spec line, where it risks a
>      second idea, and the biggest threat to "one idea, carried all the way". Interview me on
>      what you need decided.
>   2. Write PLAN.md: claim, arc, two acts, controls, testable core interaction, the four required
>      engine behaviours, oracle list, guardrails, open decisions for me (model choice, one slider
>      vs three colonies, Act 2 map).
>   3. Scaffold evidence files only: spec/oracles.md (headings + thresholds to derive), TASKS.md
>      with the first slices (spike before UI), docs/harness-log.md, docs/prompts.md.
>   Stop and report with the evidence block. I will review and commit myself.

### 2026-08-17 — the decisions, with their conditions

Stored verbatim at the director's instruction. This is the message that turned five
open decisions into a contract, and its conditions are the reason the record can
show *directing* rather than agreeing.

**Produced.**
[`6cf7742`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/6cf7742)
— `PLAN.md`, `spec/oracles.md`, `TASKS.md`, and the two evidence scaffolds.

**Why it is here.** Three of its clauses closed off retreats that would otherwise
have been available later, and none of them is visible in the resulting diff:

- *"If 1b cannot, we reopen Decision 1 toward 1a — we do not tune thresholds to
  pass"* — forbids negotiating a red test into a green one.
- the `η` honesty invariant — makes "no ant knows the map" a testable property
  rather than a sentence on a page.
- *"Open the sources, do not trust memory — mine or yours"* — applied to citations
  I had already asserted with confidence.

It also unified three affordances into one verb, which dissolved a control-budget
problem I had proposed a mode-switch to solve.

> Decisions recorded. Please write each one, with its conditions, into PLAN.md under the matching
> decision (I record, you propose — so quote these verbatim), then show me the remaining decisions
> (6, 7, 8) one at a time. No code yet.
>
> DECISION 1 — engine: Model 1, mode 1b (graph Ant System, per-step deposit, no retrace, no L).
> Conditions:
>   (a) Spike before UI: on the double-bridge fixture (long bridge first, shortcut opened later) the
>       headless spike must show all four required behaviours — near-shortest emergence, ρ = 0
>       lock-in with no switch, switch within a bounded number of steps at the default ρ, no stable
>       trail at a too-high ρ. If 1b cannot, we reopen Decision 1 toward 1a — we do not tune
>       thresholds to pass.
>   (b) The Q/L retrace flag stays OFF by default and is enabled only on spike evidence; either
>       outcome is logged in docs/harness-log.md and the discarded variant stays in history.
>   (c) Honesty invariant for spec/oracles.md: the heuristic term η is a constant or purely local
>       (momentum only) — it must never encode distance to food, or beat 1's sentence ("no ant
>       knows the map") is false. State in PLAN.md how returners find home in 1b (two pheromone
>       maps: seekers lay "home", carriers lay "food").
>
> DECISION 5 — readout: windowed median. Window = the last N completed food→nest trips (N fixed
> and recorded; my prior spike used 300), not the last W steps — trips on the shortcut complete
> faster so the window flushes faster after a switch, and under ρ = 0 the long trips keep completing
> so the median stays high. If the spike shows a step window behaves better, propose it with evidence.
> Below a minimum trip count the readout says "no reading yet", never a number. One function computes
> this reading for both the UI and the tests. Secondary, non-thresholded readout: the share of ants
> currently on the shorter branch (it moves before the median does). Trip length and BFS length are
> in the same unit — moves between the two arrival zones.
>
> DECISION 2 — drawing walls: option 1, the closing "break it yourself". Conditions:
>   (a) One verb — "tap a wall cell to toggle it": opening the shortcut is a toggle on a highlighted
>       segment; the closing free-draw is the same tool; Act 2's "close a street" is the same tool.
>       Controls stay ≤ 3 (toggle wall, forgetting slider, run/reset); the epilogue adds nothing.
>   (b) Beat 1 must be live emergence — the fixture loads with zero pheromone and the path grows in
>       front of the visitor within seconds; nothing pre-baked.
>   (c) The epilogue is covered by invariant tests only (no ant inside a wall, BFS recomputed after
>       a toggle, keyboard toggling works) — no thresholds.
>
> DECISION 3 — one slider + a thin ratio-over-time trace (option 2). The trace is the readout's own
> history, not a new metric: the same windowed-median/BFS number the tests assert, plotted against
> steps; minimal (one line, a 1.0× baseline, a vertical tick when the shortcut opens); a thin strip
> under the canvas at 390. Its job is memory across slider settings and alignment between what the
> tests measure and what the visitor sees. If it competes for attention or budget during the UI
> slice, fall back to one slider alone and log why. No side-by-side colonies.
>
> DECISION 4 — Beat 4 (ANU→Civic streets): option 1, reskin only, scheduled as the LAST slice —
> after the lock-in/switch beat is legible without prose. Same verb (toggle = close/open a street),
> same readout, same three controls, one committed fixture. Cut criteria, no negotiation: if it
> needs a new verb, a new readout, a new control, or more than 3 sentences of its own, it goes.
> Fixture source: prefer scripts/build-map.ts from an OSM extract (ODbL attribution on the page,
> diff test on the generated JSON); fallback is a hand-simplified street grid labelled as such —
> decide when we get there. The ≤ 3 application sentences (routing tables ageing out stale routes,
> evaporation as ACO's key hyper-parameter, the ant mill) belong to the page regardless of Beat 4.
>
> CITATIONS TO VERIFY BEFORE THAT SENTENCE SHIPS (put a task in TASKS.md, not now): Goss, Aron,
> Deneubourg & Pasteels (1989) "Self-organized shortcuts in the Argentine ant", Naturwissenschaften
> 76:579–581; Deneubourg, Aron, Goss & Pasteels (1990) "The self-organizing exploratory pattern of
> the Argentine ant", J. Insect Behavior 3:159–168; the "long branch first → colony stays trapped"
> variant as summarised in Dorigo & Stützle (2004), Ant Colony Optimization, ch. 1. Open the sources,
> do not trust memory — mine or yours.
>
> WORKING AGREEMENT — confirmed: TASKS.md slice 0 puts these rules into CLAUDE.md before the spike,
> and "a threshold that has never been red is not a test" goes in as a written rule. After decisions
> 6–8 I will read PLAN.md, spec/oracles.md and TASKS.md myself and make the commit; store this
> message verbatim in docs/prompts.md next to that commit's hash.

### 2026-08-17 — the review: six corrections and the Decision 6/7/8 conditions

The director read `PLAN.md`, `spec/oracles.md`, `TASKS.md` and `docs/` and returned
six numbered corrections. This message carries the conditions for Decisions 6, 7 and
8, which the earlier round had settled as bare choices with no conditions attached.

**Produced.**
[`e05b790`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/e05b790)
— the six corrections, and the conditions for Decisions 6–8.

**Why it is here.** It caught things no check could:

- **`PLAN.md` claimed all decisions were quoted verbatim, and 6–8 were not.** They
  were selections from two-option questions the agent had drafted, paraphrased
  afterwards as though quoted. The preamble now states the provenance difference.
- **A contradiction between beat 1 and Decision 2b** — "a trail is already there"
  against "zero pheromone at load" — sitting in the same document, unnoticed by the
  agent that wrote both.
- **A superseded arithmetic left standing**: the "5 of the 8" note under Decision 4,
  which Decision 7 had already replaced with 2 of the 8.
- **A false-negative trap in the spike protocol.** Lock-in sharpness in 1b depends
  on the choice nonlinearity — Deneubourg's `(k+τ)^h` with `h ≈ 2` — and on any
  pheromone floor. At `h = 1` lock-in is weak *by construction*, so a spike run at
  `α = 1` could have "disproved" 1b and sent the work to 1a for no reason. Decision
  1a's reopen clause was unsafe until this was written down.

**A request that could not be carried out as written.** The message asks for the
Decision 6/7/8 "messages" verbatim. No such messages exist — those decisions were
option selections, so quoting them would have meant the agent inventing director
text and filing it as evidence. What was done instead: this message's conditions
quoted verbatim, and the provenance recorded honestly under each decision. Noted
here because a record that quietly complied would have been worth less than one
that says why it didn't.

> Reviewed PLAN.md, spec/oracles.md, TASKS.md, docs/*. Good work; the record is honest and the
> protocol is right. Fix these before anything else — no engine code yet:
>
> 1. PLAN.md says decisions are quoted verbatim, but 6, 7 and 8 are paraphrased and drop conditions.
>    Add my three messages verbatim under Decisions 6, 7, 8 and align spec/oracles.md and TASKS.md:
>    - Decision 6: I said at most THREE deliberately-wrong engines. I amend to: keep your six, but
>      mark three as load-bearing (max-update field, η encodes distance, pure random walk) and the
>      other three as one-line parameter pins; all six live in spec/mutants.test.ts and run under
>      pnpm check, asserting RED on the fixtures. Record this as my amendment, dated.
>    - Decision 7: add the counting rule (h1, ODbL footer, control labels, readouts, ≤ 4-word hints
>      do not count) and the honesty clause (applications sentence ends "— and none of it is how
>      Google Maps routes you"; last argument sentence keeps "a tendency, not a guarantee"); a test
>      may count prose sentences in dist and fail above 8.
>    - Decision 8: add the slowed cadence (≤ 4 fps or a "step 200" button), run/pause as a visible
>      control (WCAG pausable motion), and a dedicated test for the reduced-motion branch.
> 2. docs/prompts.md: add the founding prompt (claim, four behaviours, working agreement) and my
>    Decision 6/7/8 messages verbatim, each paired with 6cf7742 (or the fix commit).
> 3. TASKS.md: slice 2 says "over W steps" — it is N_trips completed trips; Decision 8 is not open;
>    slice 4's control is "toggle wall" (which opens the shortcut), not a separate open/close.
> 4. PLAN.md beat 1: "a trail is already there" contradicts Decision 2b — rewrite as zero pheromone at
>    load, path forms in front of the visitor. Mark the Decision 4 paragraph "5 of the 8" as
>    superseded by Decision 7.
> 5. TASKS.md additions: scripts/spike.ts + `pnpm spike` as a named sensor (prints ratio and an ASCII
>    map) in slice 1; a performance-budget derivation item; screenshots at both viewports archived
>    under docs/ as evidence in slices 3–5; spec/mutants.test.ts running under pnpm check.
> 6. Spike watch item for oracles.md: lock-in sharpness in 1b depends on the choice nonlinearity
>    (Deneubourg's (k+τ)^h with h≈2) and any pheromone floor; record α/h and the floor as fixture
>    parameters and report them with the distributions — do not conclude "1b cannot lock in" from
>    α = 1 alone.
> Stage the changes and propose the commit message; I will commit. Then slice 0 (CLAUDE.md).
