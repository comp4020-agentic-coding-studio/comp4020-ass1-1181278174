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
import { TRIP_HISTORY } from "./rho.ts";

export interface ColonyOptions {
  /** Forgetting rate. 0 = never forgets; the slider's own parameter. */
  readonly rho: number;
  readonly seed: number;
  readonly ants?: number;
  /**
   * Completed trips retained (Decision 12). Defaults to `TRIP_HISTORY`, which is
   * `N_trips` — the reading never looks further back. `Infinity` keeps the whole
   * history, which only the derivation needs: the sweep that chooses `N_trips`
   * cannot run inside a buffer sized by its own answer.
   */
  readonly tripHistory?: number;
}

/** Re-exported so a policy can name what it is weighing. */
export type Step = Hop;

/**
 * What the engine has already worked out about one candidate, so a policy does
 * not recompute it per ant per step.
 *
 * Both fields are LOCAL by construction, which is what keeps Decision 1c intact:
 * `straight` compares the candidate to the ant's own last heading, and `tau` is
 * pheromone read off edges, never a distance to a goal.
 */
export interface Sense {
  /** Does this candidate continue the ant's heading? Always false with no geometry. */
  readonly straight: boolean;
  /** Pheromone the whisker sees this way: `steer` summed over the candidate's ray. */
  readonly tau: number;
}

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
    sense: Sense,
  ): number;
  /**
   * Lay pheromone for the crossing just made. `sinceSource` is how many steps
   * the ant has taken since it last stood in its own source zone — its own step
   * counter, not a distance to anything.
   */
  deposit(
    colony: Colony,
    lay: Float64Array,
    edge: number,
    carrying: boolean,
    sinceSource: number,
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

  // P ∝ η · (k + τ + floor)^h. τ is pheromone read off edges — the whisker's ray
  // when the fixture asks for one, the single next edge otherwise. η is momentum
  // and nothing else. No distance, no goal, no map.
  weight: (colony, _steer, _choice, _carrying, sense) => {
    const { h, k, floor, straightBias } = colony.fixture.params;
    const eta = sense.straight ? (straightBias ?? 1) : 1;
    return eta * Math.pow(k + sense.tau + floor, h);
  },

  // τ += D · exp(−t / T). With no T this is a flat D every step, which is what
  // the bridge has always done and what gives no direction in 2-D.
  deposit: (colony, lay, edge, _carrying, sinceSource) => {
    const { gradedOver, depositPerStep } = colony.fixture.params;
    const amount = depositPerStep ?? ENGINE_PARAMS.depositPerStep;
    lay[edge] =
      (lay[edge] as number) +
      (gradedOver === undefined || !Number.isFinite(gradedOver)
        ? amount
        : amount * Math.exp(-sinceSource / gradedOver));
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
  /** The ant's last heading, or -1. Purely local; only `straightBias` reads it. */
  readonly heading: Int32Array;
  /** Steps since this ant last stood in its own source zone. Its own counter. */
  readonly sinceSource: Int32Array;
  /** Arrival zones as node indices. A single node each unless the fixture says otherwise. */
  readonly nestCells: ReadonlySet<number>;
  readonly foodCells: ReadonlySet<number>;
  readonly tripSteps: Int32Array;
  /**
   * Ring storage for completed trip lengths, capacity `tripHistory`. Not in
   * arrival order once it wraps — read it through `completedTripLengths()`,
   * which unwraps it oldest-first.
   */
  readonly trips: number[];
  readonly tripHistory: number;
  /** Where the next completed trip is written once the ring is full. */
  tripHead: number;
  /** Every trip ever completed, for the readout. Not capped, never read back. */
  tripsCompleted: number;
  readonly random: () => number;
  steps: number;
}

/** A zone as node indices — the listed cells, or just the single node. */
function zone(
  cells: readonly NodeId[] | undefined,
  fallback: NodeId,
  index: ReadonlyMap<NodeId, number>,
): ReadonlySet<number> {
  const ids = cells && cells.length > 0 ? cells : [fallback];
  return new Set(
    ids.map((cell) => index.get(cell)).filter((at): at is number => at !== undefined),
  );
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
    heading: new Int32Array(ants).fill(-1),
    sinceSource: new Int32Array(ants),
    nestCells: zone(fixture.nestZone, fixture.nest, index),
    foodCells: zone(fixture.foodZone, fixture.food, index),
    tripSteps: new Int32Array(ants),
    trips: [],
    tripHistory: options.tripHistory ?? TRIP_HISTORY,
    tripHead: 0,
    tripsCompleted: 0,
    random: mulberry32(options.seed),
    steps: 0,
  };
}

/** Record one completed food→nest trip, evicting the oldest once the ring is full. */
function recordTrip(colony: Colony, moves: number): void {
  if (colony.trips.length < colony.tripHistory) colony.trips.push(moves);
  else {
    colony.trips[colony.tripHead] = moves;
    colony.tripHead = (colony.tripHead + 1) % colony.tripHistory;
  }
  colony.tripsCompleted += 1;
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

    const heading = colony.heading[ant] as number;
    const since = colony.sinceSource[ant] as number;
    const weights = choices.map((choice) => {
      let tau = 0;
      for (const e of choice.ray) tau += steer[e] as number;
      return policy.weight(colony, steer, choice, carrying, {
        straight: choice.dir !== undefined && choice.dir === heading,
        tau,
      });
    });
    const taken = choices[choose(colony, weights)] as Step;
    policy.deposit(colony, lay, taken.edge, carrying, since);
    colony.at[ant] = taken.to;
    colony.lastEdge[ant] = taken.edge;
    colony.heading[ant] = taken.dir ?? -1;
    if (carrying) colony.tripSteps[ant] = (colony.tripSteps[ant] as number) + 1;

    if (colony.foodCells.has(taken.to) && !carrying) {
      colony.carrying[ant] = 1;
      colony.tripSteps[ant] = 0;
      colony.lastEdge[ant] = -1;
      colony.heading[ant] = -1;
      colony.sinceSource[ant] = 0;
    } else if (colony.nestCells.has(taken.to) && carrying) {
      colony.carrying[ant] = 0;
      recordTrip(colony, colony.tripSteps[ant] as number);
      colony.tripSteps[ant] = 0;
      colony.lastEdge[ant] = -1;
      colony.heading[ant] = -1;
      colony.sinceSource[ant] = 0;
    } else {
      // Its own source zone, not the other one: a seeker resets at the nest, a
      // carrier at the food. That is what makes each map graded toward its own
      // source rather than smeared over the field.
      const own = carrying ? colony.foodCells : colony.nestCells;
      colony.sinceSource[ant] = own.has(taken.to) ? 0 : since + 1;
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

/**
 * The retained trips, oldest first — the order `reading()`'s `slice(-window)`
 * depends on. Before the ring wraps this is the array itself; after, it is
 * unwrapped into a fresh one, so no caller can see storage order.
 */
export function completedTripLengths(colony: Colony): readonly number[] {
  if (colony.trips.length < colony.tripHistory) return colony.trips;
  return [
    ...colony.trips.slice(colony.tripHead),
    ...colony.trips.slice(0, colony.tripHead),
  ];
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
  // No heading: this asks what a seeker with no momentum would do, which is the
  // question the honesty test needs — move the food and this must not budge.
  const weights = choices.map((choice) => {
    let tau = 0;
    for (const e of choice.ray) tau += steer[e] as number;
    return colony.policy.weight(colony, steer, choice, false, {
      straight: false,
      tau,
    });
  });
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
  // The total, not `trips.length` — that saturates at the ring's capacity and
  // would stop contributing to the digest the moment the buffer filled.
  eat(colony.tripsCompleted & 0xff);
  return hash.toString(16).padStart(8, "0");
}
