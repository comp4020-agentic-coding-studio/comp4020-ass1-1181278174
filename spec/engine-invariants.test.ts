// Conservation and determinism. These run before any behaviour test
// (spec/oracles.md §4) because they catch the failures a ratio never will: a colony
// that quietly loses ants can still produce a beautiful ratio.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { engine } from "./engine-api.ts";

const SEED = 1;
const STEPS = 200;

const run = (rho: number, seed = SEED, steps = STEPS) => {
  const state = engine.createColony(DOUBLE_BRIDGE, { rho, seed });
  for (let i = 0; i < steps; i += 1) engine.step(state);
  return state;
};

describe("conservation invariants", () => {
  it("conserves ant count across steps", () => {
    const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0.05, seed: SEED });
    const before = engine.antCount(state);
    for (let i = 0; i < STEPS; i += 1) engine.step(state);
    expect(engine.antCount(state)).toBe(before);
  });

  it("keeps every ant on a node, never nowhere", () => {
    const state = run(0.05);
    const nodes = engine.antNodes(state);
    expect(nodes.length).toBe(engine.antCount(state));
    expect(
      nodes.every((node) => DOUBLE_BRIDGE.nodes.includes(node)),
    ).toBe(true);
  });

  it("never lets pheromone go negative", () => {
    const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0.9, seed: SEED });
    for (let i = 0; i < STEPS; i += 1) {
      engine.step(state);
      expect(engine.minEdgePheromone(state)).toBeGreaterThanOrEqual(0);
    }
  });

  it("never decreases total pheromone when nothing evaporates", () => {
    const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0, seed: SEED });
    let previous = engine.totalPheromone(state);
    for (let i = 0; i < STEPS; i += 1) {
      engine.step(state);
      const now = engine.totalPheromone(state);
      expect(now).toBeGreaterThanOrEqual(previous);
      previous = now;
    }
  });

  it("records only trips at least as long as the shortest route", () => {
    // A trip shorter than BFS would mean the ants are crossing walls.
    const trips = engine.completedTripLengths(run(0.05, SEED, 2000));
    expect(trips.length).toBeGreaterThan(0);
    expect(Math.min(...trips)).toBeGreaterThanOrEqual(8);
  });
});

describe("determinism", () => {
  it("gives a byte-identical digest for the same seed", () => {
    expect(engine.digest(run(0.05))).toBe(engine.digest(run(0.05)));
  });

  it("gives a different digest for a different seed", () => {
    // Otherwise the digest is a constant and the test above proves nothing.
    expect(engine.digest(run(0.05, 1))).not.toBe(engine.digest(run(0.05, 2)));
  });

  it("gives a different digest after more steps", () => {
    expect(engine.digest(run(0.05, SEED, 100))).not.toBe(
      engine.digest(run(0.05, SEED, 200)),
    );
  });
});
