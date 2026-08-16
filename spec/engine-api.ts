// The surface the engine must expose for the tests to hold it. It does not exist
// yet: these are red on purpose, and the shape below is the proposal the next turn
// implements or argues with.
//
// The specifier is a variable so `tsc` cannot resolve it. A literal would make
// typecheck fail, and typecheck runs first in `pnpm check` — which would stop the
// roster before vitest ever reported the red count. Red must be reported by the
// test that owns the claim, not by the compiler.

import type { Fixture } from "../src/fixtures/double-bridge.ts";

const ENGINE_MODULE = "../src/sim/engine.ts";
const READING_MODULE = "../src/sim/reading.ts";

const load = (specifier: string): Promise<unknown> => import(specifier);

/** Opaque to the tests: they assert through the accessors, never on the shape. */
export type ColonyState = unknown;

export interface ColonyOptions {
  /** Forgetting rate. 0 = never forgets; the slider's own parameter. */
  readonly rho: number;
  readonly seed: number;
  readonly ants?: number;
}

export interface EngineModule {
  /**
   * Takes the fixture itself, not its name — the honesty test needs to move the
   * food without touching the terrain.
   */
  createColony(fixture: Fixture, options: ColonyOptions): ColonyState;
  step(state: ColonyState): void;
  /** The one verb: opens the shortcut, closes a street, draws in the epilogue. */
  toggleShortcut(state: ColonyState): void;
  /** Byte-identical for a given seed and step count, or determinism is a fiction. */
  digest(state: ColonyState): string;
  antCount(state: ColonyState): number;
  totalPheromone(state: ColonyState): number;
  /** Non-negative on every edge, always. */
  minEdgePheromone(state: ColonyState): number;
  /** Every ant is on a node, never nowhere. */
  antNodes(state: ColonyState): readonly string[];
  /** Lengths of completed food→nest trips, oldest first. */
  completedTripLengths(state: ColonyState): readonly number[];
  /**
   * The chance an ant at `node` steps to each neighbour, given current state. The
   * honesty test reads this: with pheromone at the floor, moving the food must not
   * change it, or η is encoding distance to food.
   */
  choiceDistribution(
    state: ColonyState,
    node: string,
  ): ReadonlyMap<string, number>;
}

export interface ReadingModule {
  /**
   * The one function that computes the reading for the UI, the trace and the
   * tests. Takes the BFS length as an argument, so the engine never contains a
   * shortest-path algorithm.
   */
  reading(
    tripLengths: readonly number[],
    bfsShortest: number,
    options: { readonly window: number; readonly minTrips: number },
  ): { readonly status: "no reading yet" | "ok"; readonly ratio: number | null };
}

export const loadEngine = () => load(ENGINE_MODULE) as Promise<EngineModule>;
export const loadReading = () => load(READING_MODULE) as Promise<ReadingModule>;
