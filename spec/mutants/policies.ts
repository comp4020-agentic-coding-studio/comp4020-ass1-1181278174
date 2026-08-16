// Five negative controls, as alternative POLICIES.
//
// They spread DEFAULT_POLICY and override one hook each, so none of them restates
// the step loop and none can drift from the engine. A mutant that quietly stopped
// matching the real engine would stop being a control while still passing, which is
// the failure this file is shaped to avoid.
//
// These live in spec/ because shipping code contains exactly one policy.

import type { Colony, Policy } from "../../src/sim/engine.ts";
import { DEFAULT_POLICY } from "../../src/sim/engine.ts";
import { induce } from "../../src/fixtures/graph.ts";
import { shortestPathLength } from "../../src/oracle/bfs.ts";

/** Memoised so the cheat is slow to write, not slow to run. Keyed on the goal too, because the honesty test moves it. */
const distances = new Map<string, number>();
function distanceToFood(colony: Colony, node: number): number {
  const key = `${colony.fixture.name}|${colony.fixture.food}|${colony.shortcutOpen}|${node}`;
  const cached = distances.get(key);
  if (cached !== undefined) return cached;
  const graph = induce(colony.fixture, { openShortcut: colony.shortcutOpen });
  const from = colony.fixture.nodes[node] as string;
  const found = shortestPathLength(graph, from, colony.fixture.food) ?? 99;
  distances.set(key, found);
  return found;
}

/**
 * The dishonest one, and the only mutant that makes the page look BETTER. It reads
 * the oracle — the very thing the engine may never touch — so every ant is steered
 * by a field that already knows where the goal is.
 *
 * It will pass the path tests handsomely. That is the point: only the honesty test
 * can catch it, which is why the honesty test has to exist.
 */
export const ETA_KNOWS_THE_FOOD: Policy = {
  ...DEFAULT_POLICY,
  name: "η encodes distance to food",
  weight: (colony, steer, choice, carrying, sense) =>
    DEFAULT_POLICY.weight(colony, steer, choice, carrying, sense) /
    (1 + distanceToFood(colony, choice.to)),
};

/** No pheromone term at all: every open edge equally likely. Nothing can emerge. */
export const PURE_RANDOM_WALK: Policy = {
  ...DEFAULT_POLICY,
  name: "pure random walk",
  weight: () => 1,
};

/** The slider is disconnected: nothing is ever forgotten, whatever ρ says. */
export const RHO_IGNORED: Policy = {
  ...DEFAULT_POLICY,
  name: "ρ ignored",
  evaporate: () => {},
};

/** The slider is stuck at its maximum: everything is forgotten at the fastest rate. */
export const RHO_PINNED_MAX: Policy = {
  ...DEFAULT_POLICY,
  name: "ρ pinned at 0.25",
  evaporate: (colony) => {
    const keep = 1 - 0.25;
    for (let e = 0; e < colony.home.length; e += 1) {
      colony.home[e] = (colony.home[e] as number) * keep;
      colony.foodTrail[e] = (colony.foodTrail[e] as number) * keep;
    }
  },
};

/**
 * One map instead of two: seekers and carriers lay into, and steer by, the same
 * field. There is no "home" trail distinct from the "food" trail, so a carrier has
 * nothing of its own to follow back.
 */
export const ONE_PHEROMONE_MAP: Policy = {
  ...DEFAULT_POLICY,
  name: "one pheromone map",
  maps: (colony) => ({ steer: colony.home, lay: colony.home }),
};

export const POLICY_MUTANTS: readonly Policy[] = [
  ETA_KNOWS_THE_FOOD,
  PURE_RANDOM_WALK,
  RHO_IGNORED,
  RHO_PINNED_MAX,
  ONE_PHEROMONE_MAP,
];
