# Assignment 1 — reflection

**The breakthrough.** My page explains the original ant-colony mechanism: ants
that leave scent and follow it, with only a weak heuristic — a preference for
going straight, never a distance to the food. The earlier crits had taught me to
plan before building, so I did.

While planning with an AI, it suggested giving the ants a "forgetting rate", so
that after finding one road they would go on to find a better one. It sounded
reasonable, and I wrote a very detailed plan around it — beats, thresholds,
tests. On the twelve-node test graph it even worked. On the real field it never
did. I adjusted parameters for a long time before admitting the obvious: I was
tuning towards the conclusion I wanted, not testing whether it held.

So I stopped adjusting prompts and ran experiments. Before each one I wrote down
a prediction — for the deposit scale, for a wander rate, for the order in which a
visitor acts — and then looked. Every prediction was rejected by the data,
clearly. Then I read the paper the idea was supposed to rest on. Goss and
Deneubourg's real colony does not switch either: once it uses the longer branch,
it keeps using it even when a shorter one is offered. The ants had answered in
1989; I had preferred the better story.

What I understood is that an agent's confident plan is a hypothesis — a generated
answer, easily wrong on the concrete details. I changed the claim to the one every
experiment supported: no ant knows the map, the road appears anyway, and when you
break it, it forms again.

Two things I would do earlier: build a small, rough demo before writing a detailed
plan, because what an AI generates is often not quite what I meant; and treat its
suggestions — and my own ideas — as hypotheses to falsify with a test, not
instructions to follow.

**What it changed about who I want to be.** I still want to plan carefully; the
plan is what let me see exactly where the project was wrong. But I want to be a
developer whose plan is written to be checked: predictions before experiments,
tests allowed to go red, and a return to the primary sources when the data and
the idea disagree. And when an honest, less pretty result conflicts with a demo
that only looks better by cheating, I choose the honest one.
