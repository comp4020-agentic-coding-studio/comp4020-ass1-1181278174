# Process overview

## What I built

An interactive explainer of the original ant-colony mechanism: four hundred ants
that leave scent and follow it, with no map and no distance to the food — only a
preference for going straight. On a field the visitor can leave blank, scatter
with obstacles, or set as a maze, a road appears from nothing; draw a wall
across it and the road forms again. The claim is the h1: *no ant knows the map,
the road appears anyway, and it heals when you break it.* A reading (mean trip ÷
the shortest route over the terrain as it stands) keeps the page honest, and a
forgetting-rate slider lets the visitor find the corners — never forgetting, or
forgetting too fast. I directed a coding agent (Claude Code) turn by turn, with
a second model as an advisor and reviewer; the advisor's experiments were re-run
inside this repo before they counted
([`e0d7cc8`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/e0d7cc8)).

## The moments that mattered

**1. The claim was thrown away, not tuned.** The plan was built on a suggestion I
liked: with the right forgetting rate the colony would leave a long road for a
shorter one. It held on the twelve-node test graph and failed on the field. The
obvious move was to keep turning parameters until it looked right. Instead each
change became a written prediction and a spike that could say no: the deposit
scale (predicted to open a switching band — it did not, the road and the
exploration are governed by the same number), a wander rate (predicted to seed
the switch — it destroyed the road first), the visitor's own order of actions
(the road held at every rate, 0% through the shortcut). I read Goss and
Deneubourg's paper: real colonies do not switch either. So the claim moved, twice,
each time to what the numbers held, and `CLAUDE.md` moved with it in its own
commits
([`34d03e2...5a391f4`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/compare/34d03e2...5a391f4)).
I knew it was right because three predictions written before the runs were all
falsified, in the record, and the paper agreed with the field rather than with me.

**2. The bridge frozen bit-true before the engine grew.** The field needed four
new engine parameters. The agent proposed defaults "equal to today's behaviour";
the obvious thing was to believe it. I asked instead for the old engine's output
to be frozen as literals — 34 seeded digests of the double bridge — and for the
guard to be proven red-capable: switching one knob on by three parts per million
turns all 34 red, restored turns them green
([`f5a8fc8`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/f5a8fc8)).
Every threshold in `spec/oracles.md` still means what it meant.

**3. A ranking that flattered a variant with 47 trips.** The parameter sweep put a
variant top on a mean over almost no data. Rather than eyeball the table and pick
the right one, the failure went into the selector: trip count became a gate on
candidacy, not a tie-break, with the reason written beside it. Re-running changed
the answer, which is the only evidence a guard does anything
([`34d03e2`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/34d03e2),
`docs/harness-log.md`). The same turn's "ants off the road" measure was caught
reporting 95% at every setting — true and useless — and rewritten before it was
cited
([`0ad47ce`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/0ad47ce)).

**4. A screenshot that lied.** The 390-px screenshot showed a broken layout that
was not broken: Windows Chrome lays out at 526 CSS px and crops. Instead of fixing
CSS that was not wrong, `pnpm shot` moved to a Linux Chromium and now verifies
the layout width with `--dump-dom` before it trusts any PNG; the fact went into
`CLAUDE.md` under "Facts about this repo that bite"
([`68d2320`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/68d2320)).
Every screenshot since carries its verified width.

## What was thrown away

A wander rate ε (spiked, rejected, patch reverted), the shortcut mechanic and its
doorway, two claims, four maze layouts, and a rendering floor tried on a
fraction of the peak and rejected on the evidence of one screenshot
([`ff12122`](https://github.com/comp4020-agentic-coding-studio/comp4020-ass1-1181278174/commit/ff12122)).
