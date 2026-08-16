// The visitor's flow, as every test runs it.
//
// Settle, open the shortcut, watch. Three test files were each carrying their own
// copy of that sequence, and a fourth was about to — which is how the rho drift
// happened: a copy is a place a constant can be wrong on its own. One copy here,
// parameterised by the engine under test, so the behaviour tests, the negative
// controls and the core-interaction contract all run the identical schedule.
//
// Host-agnostic on purpose: the negative controls are engines too, and a control
// that ran a different schedule from the real engine would not be a control.

import type { Fixture } from "../src/fixtures/double-bridge.ts";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";
import type { Colony, ColonyOptions } from "../src/sim/engine.ts";
import * as engine from "../src/sim/engine.ts";
import type { Reading } from "../src/sim/reading.ts";
import { reading } from "../src/sim/reading.ts";
import { SAMPLE } from "../src/sim/rho.ts";
import { trace } from "../src/sim/trace.ts";
import { derived } from "./thresholds.ts";

/** What the flow needs of an engine. `Mutant` and the real module both fit. */
export interface FlowHost<S> {
  create(fixture: Fixture, options: ColonyOptions): S;
  step(state: S): void;
  toggleShortcut(state: S): void;
  completedTripLengths(state: S): readonly number[];
}

export const REAL: FlowHost<Colony> = {
  create: (fixture, options) => engine.createColony(fixture, options),
  step: (state) => engine.step(state),
  toggleShortcut: (state) => engine.toggleShortcut(state),
  completedTripLengths: (state) => engine.completedTripLengths(state),
};

export const FIXTURE = DOUBLE_BRIDGE;

/** One committed seed, so a red is reproducible rather than a coin toss. */
export const SEED = 1;

const bfs = (openShortcut: boolean) =>
  shortestPathLength(
    induce(FIXTURE, { openShortcut }),
    FIXTURE.nest,
    FIXTURE.food,
  ) as number;

/** 8 moves while the shortcut is shut, 4 once it opens. */
export const BFS_CLOSED = bfs(false);
export const BFS_OPEN = bfs(true);

/** The window every reading is taken over — derived, never invented per test. */
export const WINDOW = {
  window: derived("N_trips"),
  minTrips: derived("MIN_TRIPS"),
};

/** The reading, through the one function the page will use. */
export function take<S>(
  host: FlowHost<S>,
  state: S,
  against: number,
): Reading {
  return reading(host.completedTripLengths(state), against, WINDOW);
}

/** Let the long trail establish. SETTLE, not M — M is the switch bound only. */
export function settled<S>(host: FlowHost<S>, rho: number, seed = SEED): S {
  const state = host.create(FIXTURE, { rho, seed });
  for (let i = 0; i < derived("SETTLE"); i += 1) host.step(state);
  return state;
}

/** The double bridge as Goss ran it: long branch first, short branch added later. */
export function afterShortcut<S>(
  host: FlowHost<S>,
  rho: number,
  stepsAfter: number,
  seed = SEED,
): S {
  const state = settled(host, rho, seed);
  host.toggleShortcut(state);
  for (let i = 0; i < stepsAfter; i += 1) host.step(state);
  return state;
}

/**
 * Settle, open the shortcut, then sample the reading every SAMPLE steps for
 * `steps` — the series the trace strip plots and the tests assert on.
 *
 * SETTLE is a multiple of SAMPLE, so these sample points sit on the same grid the
 * page's own running trace lands on.
 */
export function traceAfterShortcut<S>(
  host: FlowHost<S>,
  rho: number,
  steps: number,
  seed = SEED,
): readonly Reading[] {
  const state = settled(host, rho, seed);
  host.toggleShortcut(state);
  return trace(host, state, {
    steps,
    against: BFS_OPEN,
    sample: SAMPLE,
    ...WINDOW,
  });
}
