// The max-update freshness field — the model the director excluded on reasoning
// alone, now built so the reasoning can be checked.
//
// A separate engine rather than a policy, because max-update is not a different
// weight or a different evaporation: it needs per-ant state the real Colony does not
// carry (steps since the ant left its origin), and it has no evaporation at all. It
// implements the same EngineModule surface on the same fixture and the same graph,
// so the same behaviour tests can be pointed at it — `tsc` enforces the surface.
//
// Why it matters: it finds short paths beautifully and CANNOT lock in, because a
// max-update field always prefers the better value once it has seen it. It is the
// only control that separates "forgetting is the mechanism" from "shorter paths just
// win", which is the whole claim.

import type { Fixture, NodeId } from "../../src/fixtures/double-bridge.ts";
import { adjacencyOf } from "../../src/fixtures/graph.ts";
import type { Hop } from "../../src/fixtures/graph.ts";
import type { ColonyOptions } from "../../src/sim/engine.ts";
import { ENGINE_PARAMS } from "../../src/sim/params.ts";
import { mulberry32 } from "../../src/sim/prng.ts";

/** Freshness counts down from here, so a shorter route leaves a higher value. */
const HORIZON = 1000;

export interface FreshColony {
  readonly fixture: Fixture;
  readonly rho: number;
  readonly nest: number;
  readonly food: number;
  adjacency: readonly (readonly Hop[])[];
  shortcutOpen: boolean;
  readonly home: Float64Array;
  readonly foodTrail: Float64Array;
  readonly at: Int32Array;
  readonly carrying: Uint8Array;
  readonly lastEdge: Int32Array;
  readonly sinceOrigin: Int32Array;
  readonly tripSteps: Int32Array;
  readonly trips: number[];
  readonly random: () => number;
  steps: number;
}

export function createColony(
  fixture: Fixture,
  options: ColonyOptions,
): FreshColony {
  const index = new Map(fixture.nodes.map((node, i) => [node, i]));
  const ants = options.ants ?? ENGINE_PARAMS.ants;
  const nest = index.get(fixture.nest) as number;
  return {
    fixture,
    rho: options.rho,
    nest,
    food: index.get(fixture.food) as number,
    adjacency: adjacencyOf(fixture, index, false),
    shortcutOpen: false,
    home: new Float64Array(fixture.edges.length),
    foodTrail: new Float64Array(fixture.edges.length),
    at: new Int32Array(ants).fill(nest),
    carrying: new Uint8Array(ants),
    lastEdge: new Int32Array(ants).fill(-1),
    sinceOrigin: new Int32Array(ants),
    tripSteps: new Int32Array(ants),
    trips: [],
    random: mulberry32(options.seed),
    steps: 0,
  };
}

export function step(colony: FreshColony): void {
  for (let ant = 0; ant < colony.at.length; ant += 1) {
    const carrying = colony.carrying[ant] === 1;
    const steer = carrying ? colony.home : colony.foodTrail;
    const lay = carrying ? colony.foodTrail : colony.home;
    const here = colony.at[ant] as number;
    const all = colony.adjacency[here] ?? [];
    const back = colony.lastEdge[ant];
    const open = all.filter((choice) => choice.edge !== back);
    const choices = open.length > 0 ? open : all;
    if (choices.length === 0) continue;

    // Follow the freshest edge, ties broken by the seeded PRNG. No accumulation,
    // no evaporation: whichever route was seen most recently and most directly
    // wins, and it keeps winning.
    let best = 0;
    let bestValue = -Infinity;
    for (let i = 0; i < choices.length; i += 1) {
      const value = steer[(choices[i] as Hop).edge] as number;
      if (value > bestValue) {
        bestValue = value;
        best = i;
      }
    }
    const taken = (
      bestValue <= 0
        ? choices[Math.floor(colony.random() * choices.length)]
        : choices[best]
    ) as Hop;

    colony.sinceOrigin[ant] = (colony.sinceOrigin[ant] as number) + 1;
    const freshness = HORIZON - (colony.sinceOrigin[ant] as number);
    lay[taken.edge] = Math.max(lay[taken.edge] as number, freshness);

    colony.at[ant] = taken.to;
    colony.lastEdge[ant] = taken.edge;
    if (carrying) colony.tripSteps[ant] = (colony.tripSteps[ant] as number) + 1;

    if (taken.to === colony.food && !carrying) {
      colony.carrying[ant] = 1;
      colony.tripSteps[ant] = 0;
      colony.sinceOrigin[ant] = 0;
      colony.lastEdge[ant] = -1;
    } else if (taken.to === colony.nest && carrying) {
      colony.carrying[ant] = 0;
      colony.trips.push(colony.tripSteps[ant] as number);
      colony.tripSteps[ant] = 0;
      colony.sinceOrigin[ant] = 0;
      colony.lastEdge[ant] = -1;
    }
  }
  colony.steps += 1;
}

export function toggleShortcut(colony: FreshColony): void {
  const index = new Map(colony.fixture.nodes.map((node, i) => [node, i]));
  colony.shortcutOpen = !colony.shortcutOpen;
  colony.adjacency = adjacencyOf(colony.fixture, index, colony.shortcutOpen);
}

export const antCount = (colony: FreshColony) => colony.at.length;

export const antNodes = (colony: FreshColony): readonly string[] =>
  [...colony.at].map((node) => colony.fixture.nodes[node] as string);

export function totalPheromone(colony: FreshColony): number {
  let sum = 0;
  for (let e = 0; e < colony.home.length; e += 1) {
    sum += (colony.home[e] as number) + (colony.foodTrail[e] as number);
  }
  return sum;
}

export function minEdgePheromone(colony: FreshColony): number {
  let least = Infinity;
  for (let e = 0; e < colony.home.length; e += 1) {
    least = Math.min(
      least,
      colony.home[e] as number,
      colony.foodTrail[e] as number,
    );
  }
  return least;
}

export const completedTripLengths = (colony: FreshColony): readonly number[] =>
  colony.trips;

export function choiceDistribution(
  colony: FreshColony,
  node: NodeId,
): ReadonlyMap<string, number> {
  const here = colony.fixture.nodes.indexOf(node);
  const choices = colony.adjacency[here] ?? [];
  const values = choices.map((choice) =>
    Math.max(0, colony.foodTrail[choice.edge] as number),
  );
  const total = values.reduce((sum, value) => sum + value, 0);
  const out = new Map<string, number>();
  choices.forEach((choice, i) => {
    const to = colony.fixture.nodes[choice.to] as string;
    out.set(to, total > 0 ? (values[i] as number) / total : 1 / choices.length);
  });
  return out;
}

export function digest(colony: FreshColony): string {
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
