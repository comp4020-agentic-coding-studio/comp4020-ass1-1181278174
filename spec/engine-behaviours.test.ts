// The four required behaviours. RED twice over, on purpose and in order:
//
//   1. now — the thresholds are still symbols, so `derived()` throws and the red
//      reads "not derived yet";
//   2. after the spike derives them — src/sim/engine.ts still does not exist;
//   3. only then can these go green.
//
// Behaviour (2) is the discriminating test. If it cannot be made to pass, the model
// is wrong and Decision 1 reopens toward 1a — we do not tune thresholds to pass.
// And a failure at h = 1 is not evidence against 1b: lock-in sharpness depends on
// the choice nonlinearity, so the fixture parameters are reported with every run.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";
import { loadEngine, loadReading } from "./engine-api.ts";
import { derived } from "./thresholds.ts";

const fixture = DOUBLE_BRIDGE;
const SEED = 1;

/** What the ants are measured against once the shortcut is open: 4 moves. */
const BFS_OPEN = shortestPathLength(
  induce(fixture, { openShortcut: true }),
  fixture.nest,
  fixture.food,
) as number;

/**
 * Run the colony with the shortcut shut, open it, run on, then take the reading —
 * the double bridge as Goss ran it: long branch first, short branch added later.
 */
async function ratioAfterShortcut(rho: number, stepsAfter: number) {
  const engine = await loadEngine();
  const { reading } = await loadReading();
  const window = derived("N_trips");
  const minTrips = derived("MIN_TRIPS");
  const settle = derived("M");

  const state = engine.createColony(fixture, { rho, seed: SEED });
  for (let step = 0; step < settle; step += 1) engine.step(state);
  engine.toggleShortcut(state);
  for (let step = 0; step < stepsAfter; step += 1) engine.step(state);

  return reading(engine.completedTripLengths(state), BFS_OPEN, {
    window,
    minTrips,
  });
}

describe("behaviour (1) — a near-shortest path emerges from local rules only", () => {
  it("gets below SWITCHED without any ant ever seeing BFS", async () => {
    const target = derived("SWITCHED");
    const result = await ratioAfterShortcut(0.05, derived("M"));
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeLessThan(target);
  });
});

describe("behaviour (2) — lock-in at forgetting = 0 (the discriminating test)", () => {
  it("stays at or above LOCKED for N steps after the shortcut opens", async () => {
    const stuck = derived("LOCKED");
    const persist = derived("N");
    const result = await ratioAfterShortcut(0, persist);
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeGreaterThanOrEqual(stuck);
  });
});

describe("behaviour (3) — moderate forgetting switches within a bound", () => {
  it("falls below SWITCHED within M steps of the shortcut opening", async () => {
    const target = derived("SWITCHED");
    const bound = derived("M");
    const result = await ratioAfterShortcut(0.05, bound);
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeLessThan(target);
  });
});

describe("behaviour (4) — too much forgetting never stabilises", () => {
  it("never holds below UNSTABLE for K consecutive steps", async () => {
    const ceiling = derived("UNSTABLE");
    const runFor = derived("K");
    const result = await ratioAfterShortcut(1, runFor);
    expect(result.ratio === null || result.ratio > ceiling).toBe(true);
  });
});
