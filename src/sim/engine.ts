// Model 1, deposit mode 1b, on the graph the fixture induces.
//
// Host-agnostic: no DOM, no timers, no frame clock. Runs unchanged in Node (the
// spike and the tests), on the main thread, or in a Worker — where it runs in the
// page is a slice-3 decision.
//
// Two pheromone maps on the edges. Seekers lay "home" and steer by "food"; carriers
// lay "food" and steer by "home". Each ant holds exactly ONE BIT — carrying or not —
// plus the edge it just crossed, so it does not U-turn unless it must. That momentum
// is the only η there is: no term anywhere reads the position of the food, because
// "the heuristic term η is a constant or purely local (momentum only) — it must never
// encode distance to food, or beat 1's sentence ("no ant knows the map") is false".

import type { Fixture, NodeId } from "../fixtures/double-bridge.ts";
import { adjacencyOf } from "../fixtures/graph.ts";
import type { Hop } from "../fixtures/graph.ts";
import { ENGINE_PARAMS } from "./params.ts";
import { mulberry32 } from "./prng.ts";

export interface ColonyOptions {
  /** Forgetting rate. 0 = never forgets; the slider's own parameter. */
  readonly rho: number;
  readonly seed: number;
  readonly ants?: number;
}

/** Re-exported so a policy can name what it is weighing. */
export type Step = Hop;

/**
 * The rules, as data. Injected rather than hard-coded so the negative controls can
 * be alternative POLICIES instead of restated step loops — a mutant that copies the
 * loop drifts from the engine and quietly stops being a control.
 *
 * This is dependency injection, not a "be wrong" switch: nothing in shipping code
 * selects a policy, and `DEFAULT_POLICY` is the only one `src/` contains.
 */
export interface Policy {
  readonly name: string;
  /** Which map the ant reads, and which it writes, given its one bit. */
  maps(
    colony: Colony,
    carrying: boolean,
  ): { readonly steer: Float64Array; readonly lay: Float64Array };
  /** Weight of one candidate edge. In DEFAULT_POLICY this may not read the goal. */
  weight(
    colony: Colony,
    steer: Float64Array,
    choice: Step,
    carrying: boolean,
  ): number;
  /** Lay pheromone for the crossing just made. */
  deposit(
    colony: Colony,
    lay: Float64Array,
    edge: number,
    carrying: boolean,
  ): void;
  /** Once per step, after every ant has moved. */
  evaporate(colony: Colony): void;
}

/** Model 1, deposit mode 1b: the rules described at the top of this file. */
export const DEFAULT_POLICY: Policy = {
  name: "1b",

  maps: (colony, carrying) =>
    carrying
      ? { steer: colony.home, lay: colony.foodTrail }
      : { steer: colony.foodTrail, lay: colony.home },

  // P ∝ (k + τ + floor)^h. τ is the only term, and it is local to the edge — no
  // distance, no goal, no map.
  weight: (colony, steer, choice) => {
    const { h, k, floor } = colony.fixture.params;
    return Math.pow(k + (steer[choice.edge] as number) + floor, h);
  },

  deposit: (_colony, lay, edge) => {
    lay[edge] = (lay[edge] as number) + ENGINE_PARAMS.depositPerStep;
  },

  evaporate: (colony) => {
    const keep = 1 - colony.rho;
    for (let e = 0; e < colony.home.length; e += 1) {
      colony.home[e] = (colony.home[e] as number) * keep;
      colony.foodTrail[e] = (colony.foodTrail[e] as number) * keep;
    }
  },
};

export interface Colony {
  readonly fixture: Fixture;
  readonly policy: Policy;
  readonly rho: number;
  readonly nest: number;
  readonly food: number;
  /** Endpoint indices per edge, in fixture.edges order — never re-ordered. */
  readonly ends: readonly (readonly [number, number])[];
  /** Rebuilt on toggle; edge indices stay stable so pheromone survives. */
  adjacency: readonly (readonly Hop[])[];
  shortcutOpen: boolean;
  readonly home: Float64Array;
  readonly foodTrail: Float64Array;
  readonly at: Int32Array;
  readonly carrying: Uint8Array;
  readonly lastEdge: Int32Array;
  readonly tripSteps: Int32Array;
  readonly trips: number[];
  readonly random: () => number;
  steps: number;
}

export function createColony(
  fixture: Fixture,
  options: ColonyOptions,
  policy: Policy = DEFAULT_POLICY,
): Colony {
  const index = new Map(fixture.nodes.map((node, i) => [node, i]));
  const ants = options.ants ?? ENGINE_PARAMS.ants;
  const nest = index.get(fixture.nest) as number;

  return {
    fixture,
    policy,
    rho: options.rho,
    nest,
    food: index.get(fixture.food) as number,
    ends: fixture.edges.map(
      (edge) =>
        [index.get(edge.a) as number, index.get(edge.b) as number] as const,
    ),
    adjacency: adjacencyOf(fixture, index, false),
    shortcutOpen: false,
    home: new Float64Array(fixture.edges.length),
    foodTrail: new Float64Array(fixture.edges.length),
    at: new Int32Array(ants).fill(nest),
    carrying: new Uint8Array(ants),
    lastEdge: new Int32Array(ants).fill(-1),
    tripSteps: new Int32Array(ants),
    trips: [],
    random: mulberry32(options.seed),
    steps: 0,
  };
}

function choose(colony: Colony, weights: readonly number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return 0;
  let target = colony.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    target -= weights[i] as number;
    if (target <= 0) return i;
  }
  return weights.length - 1;
}

export function step(colony: Colony): void {
  const { policy } = colony;
  for (let ant = 0; ant < colony.at.length; ant += 1) {
    const carrying = colony.carrying[ant] === 1;
    const { steer, lay } = policy.maps(colony, carrying);
    const here = colony.at[ant] as number;
    const all = colony.adjacency[here] ?? [];

    // Momentum: no U-turn unless the way back is the only way out.
    const back = colony.lastEdge[ant];
    const open = all.filter((choice) => choice.edge !== back);
    const choices = open.length > 0 ? open : all;
    if (choices.length === 0) continue;

    const weights = choices.map((choice) =>
      policy.weight(colony, steer, choice, carrying),
    );
    const taken = choices[choose(colony, weights)] as Step;
    policy.deposit(colony, lay, taken.edge, carrying);
    colony.at[ant] = taken.to;
    colony.lastEdge[ant] = taken.edge;
    if (carrying) colony.tripSteps[ant] = (colony.tripSteps[ant] as number) + 1;

    if (taken.to === colony.food && !carrying) {
      colony.carrying[ant] = 1;
      colony.tripSteps[ant] = 0;
      colony.lastEdge[ant] = -1;
    } else if (taken.to === colony.nest && carrying) {
      colony.carrying[ant] = 0;
      colony.trips.push(colony.tripSteps[ant] as number);
      colony.tripSteps[ant] = 0;
      colony.lastEdge[ant] = -1;
    }
  }

  policy.evaporate(colony);
  colony.steps += 1;
}

export function toggleShortcut(colony: Colony): void {
  const index = new Map(colony.fixture.nodes.map((node, i) => [node, i]));
  colony.shortcutOpen = !colony.shortcutOpen;
  colony.adjacency = adjacencyOf(colony.fixture, index, colony.shortcutOpen);
}

export function antCount(colony: Colony): number {
  return colony.at.length;
}

export function antNodes(colony: Colony): readonly string[] {
  return [...colony.at].map((node) => colony.fixture.nodes[node] as string);
}

export function totalPheromone(colony: Colony): number {
  let sum = 0;
  for (let e = 0; e < colony.home.length; e += 1) {
    sum += (colony.home[e] as number) + (colony.foodTrail[e] as number);
  }
  return sum;
}

export function minEdgePheromone(colony: Colony): number {
  let least = Infinity;
  for (let e = 0; e < colony.home.length; e += 1) {
    least = Math.min(least, colony.home[e] as number, colony.foodTrail[e] as number);
  }
  return least;
}

export function completedTripLengths(colony: Colony): readonly number[] {
  return colony.trips;
}

export function edgePheromone(
  colony: Colony,
  a: NodeId,
  b: NodeId,
): { readonly home: number; readonly food: number } {
  const e = colony.fixture.edges.findIndex(
    (edge) =>
      (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a),
  );
  if (e < 0) return { home: 0, food: 0 };
  return { home: colony.home[e] as number, food: colony.foodTrail[e] as number };
}

/**
 * What a seeker with no momentum would do at `node` — a pure function of the
 * pheromone state and the terrain. The honesty test reads this: move the food and
 * it must not budge.
 */
export function choiceDistribution(
  colony: Colony,
  node: NodeId,
): ReadonlyMap<string, number> {
  const here = colony.fixture.nodes.indexOf(node);
  const choices = colony.adjacency[here] ?? [];
  // Through the policy, so a policy that cheats is visible to the honesty test.
  const { steer } = colony.policy.maps(colony, false);
  const weights = choices.map((choice) =>
    colony.policy.weight(colony, steer, choice, false),
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const out = new Map<string, number>();
  choices.forEach((choice, i) => {
    const to = colony.fixture.nodes[choice.to] as string;
    out.set(to, total > 0 ? (weights[i] as number) / total : 0);
  });
  return out;
}

/** FNV-1a over the raw float bytes and the ant list. Order is array order, never Map order. */
export function digest(colony: Colony): string {
  let hash = 0x811c9dc5;
  const eat = (byte: number) => {
    hash = ((hash ^ byte) * 0x01000193) >>> 0;
  };
  for (const bytes of [
    new Uint8Array(colony.home.buffer, 0, colony.home.byteLength),
    new Uint8Array(colony.foodTrail.buffer, 0, colony.foodTrail.byteLength),
    new Uint8Array(colony.at.buffer, 0, colony.at.byteLength),
    colony.carrying,
  ]) {
    for (const byte of bytes) eat(byte);
  }
  eat(colony.trips.length & 0xff);
  return hash.toString(16).padStart(8, "0");
}
