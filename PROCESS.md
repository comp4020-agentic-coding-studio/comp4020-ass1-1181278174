# Process overview

## What I built

An interactive page that explains how an ant colony finds a path. Four hundred
simulated ants leave scent as they walk and prefer to walk where scent is strong;
the scent evaporates at a rate the visitor controls (the "forgetting rate"). No
ant knows where the food is. On a field the visitor can leave empty, fill with
random obstacles, or set as a maze, a trail forms by itself; draw a wall across it
and a new trail forms. A number on the page — the ants' average trip length
divided by the shortest possible route — shows how good the trail really is.

## How I worked

I planned first and directed an AI coding agent turn by turn. `PLAN.md` records
each decision and the words that made it. `CLAUDE.md` is the rule-book the agent
works under: it proposes, I decide; it prepares each change, I commit it; if an
automated check fails it must stop and offer me options rather than fix things
quietly; it may never change the numeric cut-offs the tests use to decide pass or
fail. Every cut-off had to be seen failing once before it was allowed to pass.

## The moments that mattered

**1. I changed the claim rather than the numbers.**
*What happened:* my plan was built on an idea the agent suggested and I liked —
with the right forgetting rate the colony would leave the long trail it had found
for a shorter one. It worked on the tiny 12-node graph I used for unit tests. On
the real 60×40 field it never worked.
*What I did instead:* the obvious move was to keep adjusting parameters until it
looked right. I refused. For each candidate change I wrote a prediction first,
then ran a throw-away experiment that could prove it wrong: less scent per step, a
small random-turn probability, and the exact order in which a visitor would act.
All three predictions failed, and the failures are recorded. Then I read the
original paper (Goss & Deneubourg, 1989): real colonies do not switch to a
shorter branch either. I changed the page's claim to what every experiment
supported, and updated the rule-book in its own commits.
*How I knew:* the recorded numbers, and the paper agreeing with my field rather
than my plan
([`34d03e2...5a391f4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/compare/34d03e2...5a391f4)).

**2. I froze the old behaviour before letting the engine grow.**
*What happened:* the field needed four new engine parameters, and the agent said
their defaults would "behave exactly like today".
*What I did instead:* rather than take that on trust, I had it record a
fingerprint (a hash) of the simulation's final state for 34 seeded runs of the
old engine, made those fingerprints a test the new engine must reproduce bit for
bit, and required proof that the test could fail.
*How I knew:* turning one new parameter on by three parts per million made all 34
fingerprints mismatch; turning it back made them match. Every earlier
measurement still means what it meant
([`f5a8fc8`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/f5a8fc8)).

**3. My rules made a misleading number visible.**
*What happened:* a parameter sweep ranked as best a setting under which only 47
ant trips had completed — a good average over almost no data.
*What I did instead:* my rule-book requires the agent to list everything it fixed
on its own, so this near-miss was reported to me instead of buried. I accepted
the fix — a minimum number of completed trips before a setting may be ranked at
all — as a permanent change to the checks, and had it logged.
*How I knew:* rerunning the sweep with the new rule changed the answer; a check
that never changes anything is decoration
([`34d03e2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/34d03e2),
`docs/harness-log.md`).

**4. I judged the picture by eye and refused the shortcut to it.**
*What happened:* the first field page drew four hundred ants as a string of beads
on one line and the scent as a fog — not the picture I had described.
*What I did instead:* I put a reference image beside the page, listed the
differences one by one, and decided each: scent as small squares per cell, each
ant offset within its cell, ants carrying food in red, small scattered obstacles.
The fastest way to make the ants look lively — a random-turn probability — I
refused, because it would blur the very number the page rests on.
*How I knew:* I had that option measured anyway. It slowed the trail's recovery
after a wall from 250 steps to 4,750, then to never
([`0ad47ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/0ad47ce));
the look was reached without it
([`ff12122`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/ff12122)).

## What was thrown away

A random-turn probability, a "shortcut door" mechanic, two versions of the claim,
four maze layouts, and a rendering rule rejected on the evidence of one
screenshot.
