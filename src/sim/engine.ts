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
import { induce } from "../fixtures/graph.ts";
import { ENGINE_PARAMS } from "./params.ts";
import { mulberry32 } from "./prng.ts";

export interface ColonyOptions {
  /** Forgetting rate. 0 = never forgets; the slider's own parameter. */
  readonly rho: number;
  readonly seed: number;
  readonly ants?: number;
}

interface Step {
  readonly edge: number;
  readonly to: number;
}

export interface Colony {
  readonly fixture: Fixture;
  readonly rho: number;
  readonly nest: number;
  readonly food: number;
  /** Endpoint indices per edge, in fixture.edges order — never re-ordered. */
  readonly ends: readonly (readonly [number, number])[];
  /** Rebuilt on toggle; edge indices stay stable so pheromone survives. */
  adjacency: readonly (readonly Step[])[];
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

function buildAdjacency(
  fixture: Fixture,
  index: ReadonlyMap<NodeId, number>,
  openShortcut: boolean,
): readonly (readonly Step[])[] {
  const open = new Set(
    induce(fixture, { openShortcut }).openEdges.map((edge) =>
      fixture.edges.indexOf(edge),
    ),
  );
  const lists: Step[][] = fixture.nodes.map(() => []);
  fixture.edges.forEach((edge, e) => {
    if (!open.has(e)) return;
    const a = index.get(edge.a) as number;
    const b = index.get(edge.b) as number;
    lists[a]?.push({ edge: e, to: b });
    lists[b]?.push({ edge: e, to: a });
  });
  return lists;
}

export function createColony(fixture: Fixture, options: ColonyOptions): Colony {
  const index = new Map(fixture.nodes.map((node, i) => [node, i]));
  const ants = options.ants ?? ENGINE_PARAMS.ants;
  const nest = index.get(fixture.nest) as number;

  return {
    fixture,
    rho: options.rho,
    nest,
    food: index.get(fixture.food) as number,
    ends: fixture.edges.map(
      (edge) =>
        [index.get(edge.a) as number, index.get(edge.b) as number] as const,
    ),
    adjacency: buildAdjacency(fixture, index, false),
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

/** P ∝ (k + τ + floor)^h over the open edges, τ from the map the ant steers by. */
function weigh(colony: Colony, steer: Float64Array, choices: readonly Step[]) {
  const { h, k, floor } = colony.fixture.params;
  return choices.map((choice) =>
    Math.pow(k + (steer[choice.edge] as number) + floor, h),
  );
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
  for (let ant = 0; ant < colony.at.length; ant += 1) {
    const carrying = colony.carrying[ant] === 1;
    const steer = carrying ? colony.home : colony.foodTrail;
    const lay = carrying ? colony.foodTrail : colony.home;
    const here = colony.at[ant] as number;
    const all = colony.adjacency[here] ?? [];

    // Momentum: no U-turn unless the way back is the only way out.
    const back = colony.lastEdge[ant];
    const open = all.filter((choice) => choice.edge !== back);
    const choices = open.length > 0 ? open : all;
    if (choices.length === 0) continue;

    const taken = choices[choose(colony, weigh(colony, steer, choices))] as Step;
    lay[taken.edge] = (lay[taken.edge] as number) + ENGINE_PARAMS.depositPerStep;
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

  const keep = 1 - colony.rho;
  for (let e = 0; e < colony.home.length; e += 1) {
    colony.home[e] = (colony.home[e] as number) * keep;
    colony.foodTrail[e] = (colony.foodTrail[e] as number) * keep;
  }
  colony.steps += 1;
}

export function toggleShortcut(colony: Colony): void {
  const index = new Map(colony.fixture.nodes.map((node, i) => [node, i]));
  colony.shortcutOpen = !colony.shortcutOpen;
  colony.adjacency = buildAdjacency(
    colony.fixture,
    index,
    colony.shortcutOpen,
  );
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
  const weights = weigh(colony, colony.foodTrail, choices);
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
