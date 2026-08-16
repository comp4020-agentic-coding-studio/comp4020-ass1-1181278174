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

<!-- Newest last. The founding prompt — the claim, the arc, the four required
     engine behaviours and the working agreement — is still to be added as the
     entry before the one below. Awaiting the director's word on whether it goes
     in; it is the other obvious candidate. -->

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
