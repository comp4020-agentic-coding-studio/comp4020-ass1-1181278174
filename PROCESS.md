# Process overview

## What I built

An interactive page about how an ant colony finds a path. Four hundred simulated
ants leave scent as they walk and prefer to walk where scent is strong; the scent
evaporates at a rate the visitor sets (the "forgetting rate"). No ant knows where
the food is. On a field the visitor can leave empty, scatter with obstacles or
turn into a maze, a trail forms by itself; draw a wall across it and a new one
forms. A number on the page — average trip length divided by the shortest possible
route — shows how good the trail really is.

## How I worked

I planned first and directed an AI coding agent turn by turn. `PLAN.md` records
each decision; `CLAUDE.md` is the agent's rule-book: it proposes, I decide; it
prepares each change, I commit it; when a check fails it stops and offers me
options instead of fixing quietly; it never changes the numeric cut-offs the
tests pass or fail on. Every cut-off had to be seen failing before it could pass.

## The moments that mattered

**1. I changed the claim rather than the numbers.**
*What happened:* my plan rested on an idea the agent suggested and I liked — with
the right forgetting rate the colony would leave a long trail for a shorter one.
It worked on the tiny 12-node graph used for unit tests; on the real 60×40 field
it never did.
*What I did instead:* the obvious move was to adjust parameters until it looked
right. I refused. Each candidate change got a written prediction and a throw-away
experiment that could prove it wrong — less scent per step, a small random-turn
probability, the order in which a visitor acts. All three predictions failed.
Then I read the original paper (Goss & Deneubourg, 1989): real colonies do not
switch either. I changed the claim to what every experiment supported and
updated the rule-book with it.
*How I knew:* the numbers, and the paper agreeing with the field rather than with
my plan
([`34d03e2...5a391f4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/compare/34d03e2...5a391f4)).

**2. I froze the old behaviour before letting the engine grow.**
*What happened:* the field needed four new engine parameters; the agent said the
defaults would "behave exactly like today".
*What I did instead:* rather than trust that, I had it record a fingerprint (a
hash) of the simulation's final state for 34 seeded runs of the old engine, made
them a test the new engine must reproduce bit for bit, and required proof the test
could fail.
*How I knew:* one new parameter turned on by three parts per million made all 34
mismatch; turned back, they matched
([`f5a8fc8`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/f5a8fc8)).

**3. My rules made a misleading number visible.**
*What happened:* a parameter sweep ranked as best a setting under which only 47
ant trips had completed — a good average over almost no data.
*What I did instead:* my rule-book makes the agent list everything it fixed on
its own, so the near-miss was reported, not buried. I accepted the fix — a minimum
number of completed trips before a setting may be ranked — as a permanent change
to the checks, and had it logged.
*How I knew:* rerunning the sweep with the rule changed the answer
([`34d03e2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/34d03e2),
`docs/harness-log.md`).

**4. I judged the picture by eye and refused the shortcut to it.**
*What happened:* the first field page drew four hundred ants as beads on one line
and the scent as fog — not the picture I had described.
*What I did instead:* I put a reference image beside the page, listed the
differences and decided each — scent as small squares, each ant offset within its
cell, carriers in red, small scattered obstacles. The fastest way to make the ants
look lively, a random-turn probability, I refused: it would blur the number the
page rests on.
*How I knew:* I had it measured anyway; it slowed recovery after a wall from 250
steps to 4,750, then to never
([`0ad47ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/0ad47ce));
the look was reached without it
([`ff12122`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/ff12122)).

## What was thrown away

A random-turn probability, a "shortcut door" mechanic, two versions of the claim,
four maze layouts, and a rendering rule rejected on the evidence of one screenshot.
