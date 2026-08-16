// Conservation and determinism. RED: src/sim/engine.ts does not exist.
//
// These run before any behaviour test (spec/oracles.md §4) because they catch the
// failures a ratio never will. A colony that quietly loses ants can still produce
// a beautiful ratio.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { loadEngine } from "./engine-api.ts";

const SEED = 1;
const STEPS = 200;

describe("conservation invariants", () => {
  it("conserves ant count across steps", async () => {
    const engine = await loadEngine();
    const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0.05, seed: SEED });
    const before = engine.antCount(state);
    for (let i = 0; i < STEPS; i += 1) engine.step(state);
    expect(engine.antCount(state)).toBe(before);
  });

  it("keeps every ant on a node, never nowhere", async () => {
    const engine = await loadEngine();
    const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0.05, seed: SEED });
    for (let i = 0; i < STEPS; i += 1) engine.step(state);
    const nodes = engine.antNodes(state);
    expect(nodes.length).toBe(engine.antCount(state));
    expect(nodes.every((node) => typeof node === "string" && node.length > 0)).toBe(
      true,
    );
  });

  it("never lets pheromone go negative", async () => {
    const engine = await loadEngine();
    const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0.9, seed: SEED });
    for (let i = 0; i < STEPS; i += 1) {
      engine.step(state);
      expect(engine.minEdgePheromone(state)).toBeGreaterThanOrEqual(0);
    }
  });

  it("never decreases total pheromone when nothing evaporates", async () => {
    const engine = await loadEngine();
    const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0, seed: SEED });
    let previous = engine.totalPheromone(state);
    for (let i = 0; i < STEPS; i += 1) {
      engine.step(state);
      const now = engine.totalPheromone(state);
      expect(now).toBeGreaterThanOrEqual(previous);
      previous = now;
    }
  });
});

describe("determinism", () => {
  it("gives a byte-identical digest for the same seed", async () => {
    const engine = await loadEngine();
    const run = () => {
      const state = engine.createColony(DOUBLE_BRIDGE, {
        rho: 0.05,
        seed: SEED,
      });
      for (let i = 0; i < STEPS; i += 1) engine.step(state);
      return engine.digest(state);
    };
    expect(run()).toBe(run());
  });

  it("gives a different digest for a different seed", async () => {
    // Otherwise the digest is a constant and the test above proves nothing.
    const engine = await loadEngine();
    const run = (seed: number) => {
      const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0.05, seed });
      for (let i = 0; i < STEPS; i += 1) engine.step(state);
      return engine.digest(state);
    };
    expect(run(1)).not.toBe(run(2));
  });
});
