# Process overview

## What I built

An interactive explainer of the original ant-colony mechanism. Four hundred ants
leave scent and follow it. No ant has a map or knows where the food is; the only
"heuristic" is a preference for going straight. On a field the visitor can leave
blank, scatter with obstacles, or set as a maze, a road appears from nothing.
Draw a wall across it and the road forms again. That is the claim in the h1: *no
ant knows the map, the road appears anyway, and it heals when you break it.* A
reading (mean trip ÷ shortest route on the current terrain) keeps the page
honest; a forgetting-rate slider lets the visitor find the failure modes.

## How I worked

I planned before I built. `PLAN.md` holds every decision with the text that made
it, and `CLAUDE.md` holds the rules the agent worked under: it proposes, I decide;
it stages, I commit; it stops at the first red check and offers choices instead of
fixing silently; it never edits a threshold. Every threshold had to be red before
it was allowed to be green.

## The moments that mattered

**1. I changed the claim instead of the numbers.**
*What happened:* the plan rested on an idea I liked — with the right forgetting
rate the colony would leave a long road for a shorter one. It worked on the
twelve-node test graph and never on the real field.
*What I did instead:* the obvious move was to tune parameters until it looked
right. I refused. Every change became a written prediction and an experiment
that could say no: the deposit scale, a wander rate, the visitor's own order of
actions. All three predictions were falsified, in the record. Then I read Goss
and Deneubourg's paper: real colonies do not switch either. I changed the claim
to what every experiment supported, twice, and moved `CLAUDE.md` with it in its
own commits.
*How I knew:* the numbers, and the paper agreeing with the field rather than with
me
([`34d03e2...5a391f4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/compare/34d03e2...5a391f4)).

**2. I froze the old engine before letting it grow.**
*What happened:* the field needed four new engine parameters, and the agent said
their defaults "equal today's behaviour".
*What I did instead:* believing that would have been the obvious thing. I asked
for the old engine's output to be captured as literals — 34 seeded digests of the
double bridge — and for the guard to prove it could fail before I accepted it.
*How I knew:* one knob turned on by three parts per million turned all 34 red;
put back, green
([`f5a8fc8`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/f5a8fc8)).

**3. My rules made a flattering number visible.**
*What happened:* a parameter sweep ranked first a variant that had completed only
47 trips — a good mean over almost no data.
*What I did instead:* my working agreement says the agent must list anything it
fixed on its own, so the near-miss was reported, not buried. I accepted the fix
as a harness change — trip count became a gate on candidacy — and had it logged.
*How I knew:* re-running the sweep changed the answer, which is the only evidence
that a guard does anything
([`34d03e2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/34d03e2),
`docs/harness-log.md`).

**4. I judged the picture by looking, and refused the shortcut to it.**
*What happened:* the first field page showed four hundred ants as forty beads on
a wire and the scent as fog. It was not the picture I had described.
*What I did instead:* I put a reference image beside it, listed the differences
one by one, and ruled on each — per-cell scent marks, per-ant offsets, red for
carriers, small scattered blocks. The one change that would have bought the look
fastest, a wander rate, I refused: "the reading pays for it".
*How I knew:* the wander rate was still measured, and it cost healing — 250 steps
became 4,750, then never
([`0ad47ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/0ad47ce)).
The look landed without it
([`ff12122`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/ff12122)).

## What was thrown away

A wander rate, a shortcut mechanic and its doorway, two claims, four maze
layouts, and a rendering rule rejected on the evidence of one screenshot.
