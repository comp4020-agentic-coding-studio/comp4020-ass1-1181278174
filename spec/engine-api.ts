// The surface the engine must expose, and a compile-time check that it does.
//
// Static imports now that src/sim exists: the assignments at the bottom make `tsc`
// verify the real modules against these interfaces, so a renamed export or a changed
// signature is a typecheck failure rather than a runtime surprise in one test.
//
// The dynamic loader that lived here is gone. It existed only to keep `tsc` from
// failing on a module that did not exist yet, and nothing left needs a
// red-for-the-right-reason import failure — the remaining reds come from thresholds
// that are still symbols, which `derived()` reports in its own words.

import type { ColonyOptions } from "../src/sim/engine.ts";
import type { Colony } from "../src/sim/engine.ts";
import type { Fixture, NodeId } from "../src/fixtures/double-bridge.ts";
import type { Reading, ReadingOptions } from "../src/sim/reading.ts";
import * as engineModule from "../src/sim/engine.ts";
import * as readingModule from "../src/sim/reading.ts";

export interface EngineModule<S> {
  /**
   * Takes the fixture itself, not its name — the honesty test needs to move the
   * food without touching the terrain.
   */
  createColony(fixture: Fixture, options: ColonyOptions): S;
  step(state: S): void;
  /** The one verb: opens the shortcut, closes a street, draws in the epilogue. */
  toggleShortcut(state: S): void;
  /** Byte-identical for a given seed and step count, or determinism is a fiction. */
  digest(state: S): string;
  antCount(state: S): number;
  totalPheromone(state: S): number;
  /** Non-negative on every edge, always. */
  minEdgePheromone(state: S): number;
  /** Every ant is on a node, never nowhere. */
  antNodes(state: S): readonly string[];
  /** Lengths of completed food→nest trips, oldest first. */
  completedTripLengths(state: S): readonly number[];
  /**
   * The chance a seeker with no momentum steps to each neighbour. The honesty test
   * reads this: with pheromone at the floor, moving the food must not change it, or
   * η is encoding distance to food.
   */
  choiceDistribution(state: S, node: NodeId): ReadonlyMap<string, number>;
}

export interface ReadingModule {
  reading(
    tripLengths: readonly number[],
    bfsShortest: number,
    options: ReadingOptions,
  ): Reading;
}

export const engine: EngineModule<Colony> = engineModule;
export const reading: ReadingModule = readingModule;
