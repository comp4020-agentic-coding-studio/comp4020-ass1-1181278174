// The negative controls have to be real engines first.
//
// A mutant that goes red because it crashes, loses ants or wanders
// non-deterministically proves nothing: the behaviour test would fail against it
// whatever the behaviour was. These assertions are what make a later red mean "it
// failed the behaviour it was built to fail" rather than "it was broken".
//
// The paired-failure assertions — each mutant against the behaviour in its pairing —
// needed the thresholds, and the thresholds are derived by separating the real engine
// FROM these mutants (spec/oracles.md §3, docs/spikes/2026-08-17-derivation.md). They
// arrive here, now that the derivation is done.
//
// Every rho below is the one the derivation actually measured that threshold at
// (RHO.locked for LOCKED, RHO.default for EMERGED/SWITCHED, RHO.max for
// UNSTABLE/K — src/sim/rho.ts). spec/engine-behaviours.test.ts imports the same
// constants now, so the rate a threshold was derived at and the rate a test
// exercises it at cannot diverge again the way they did once already.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";
import { reading } from "../src/sim/reading.ts";
import { derived } from "./thresholds.ts";
import { MUTANTS } from "./mutants/index.ts";
import type { Mutant } from "./mutants/index.ts";

const STEPS = 400;

const run = (
  mutant: (typeof MUTANTS)[number],
  seed: number,
  rho = 0.12,
  steps = STEPS,
) => {
  const state = mutant.create(DOUBLE_BRIDGE, { rho, seed });
  for (let i = 0; i < steps; i += 1) mutant.step(state);
  return state;
};

describe("every mutant is a real engine", () => {
  it("has all six, each paired with what it must fail", () => {
    expect(MUTANTS.length).toBe(6);
    const paired = MUTANTS.filter(
      (m) => "honesty" in m.pairing || "behaviour" in m.pairing,
    );
    expect(paired.length).toBe(6);
    // Exactly one is allowed to be caught by the honesty test rather than a path
    // test — the one that reads the goal and would otherwise look excellent.
    expect(MUTANTS.filter((m) => "honesty" in m.pairing).length).toBe(1);
  });

  for (const mutant of MUTANTS) {
    describe(mutant.name, () => {
      it("conserves ant count", () => {
        const state = mutant.create(DOUBLE_BRIDGE, { rho: 0.12, seed: 1 });
        const before = mutant.antCount(state);
        for (let i = 0; i < STEPS; i += 1) mutant.step(state);
        expect(mutant.antCount(state)).toBe(before);
        expect(before).toBeGreaterThan(0);
      });

      it("keeps every ant on a node of the fixture", () => {
        const nodes = mutant.antNodes(run(mutant, 1));
        expect(nodes.length).toBeGreaterThan(0);
        expect(nodes.every((node) => DOUBLE_BRIDGE.nodes.includes(node))).toBe(
          true,
        );
      });

      it("is deterministic for a given seed", () => {
        expect(mutant.digest(run(mutant, 7))).toBe(mutant.digest(run(mutant, 7)));
      });

      it("is not merely constant — a different seed differs", () => {
        // Without this, the determinism check above would pass on a frozen engine.
        expect(mutant.digest(run(mutant, 1))).not.toBe(
          mutant.digest(run(mutant, 2)),
        );
      });

      it("completes round trips no shorter than the shortest route", () => {
        // A trip under 4 moves would mean it is crossing walls, which would make
        // any later red meaningless.
        const trips = mutant.completedTripLengths(run(mutant, 1, 0.12, 3000));
        if (trips.length > 0) expect(Math.min(...trips)).toBeGreaterThanOrEqual(4);
      });

      it("survives the shortcut opening", () => {
        const state = run(mutant, 1);
        mutant.toggleShortcut(state);
        const before = mutant.antCount(state);
        for (let i = 0; i < STEPS; i += 1) mutant.step(state);
        expect(mutant.antCount(state)).toBe(before);
      });
    });
  }
});

// --- (e) the paired-failure assertions ------------------------------------
//
// Each mutant, run the way the derivation actually measured it, must fail the
// behaviour it is paired against. A mutant that quietly started passing would be
// a regression in the harness itself: "a threshold that has never been red is not
// a test" only holds if these stay red for cause.

{
  const fixture = DOUBLE_BRIDGE;
  const SEED = 1;
  const bfs = (openShortcut: boolean) =>
    shortestPathLength(
      induce(fixture, { openShortcut }),
      fixture.nest,
      fixture.food,
    ) as number;
  const BFS_CLOSED = bfs(false);
  const BFS_OPEN = bfs(true);

  const take = (mutant: Mutant, state: unknown, against: number) =>
    reading(mutant.completedTripLengths(state), against, {
      window: derived("N_trips"),
      minTrips: derived("MIN_TRIPS"),
    });

  const settled = (mutant: Mutant, rho: number) => {
    const state = mutant.create(fixture, { rho, seed: SEED });
    for (let i = 0; i < derived("SETTLE"); i += 1) mutant.step(state);
    return state;
  };

  const afterShortcut = (mutant: Mutant, rho: number, stepsAfter: number) => {
    const state = settled(mutant, rho);
    mutant.toggleShortcut(state);
    for (let i = 0; i < stepsAfter; i += 1) mutant.step(state);
    return state;
  };

  const named = (name: string) =>
    MUTANTS.find((m) => m.name === name) as Mutant;

  describe("each mutant fails the behaviour it is paired against", () => {
    it("behaviour (1) — pure random walk never gets within EMERGED of the only route", () => {
      const m = named("pure random walk");
      const target = derived("EMERGED");
      const result = take(m, settled(m, 0.12), BFS_CLOSED);
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeGreaterThan(target);
    });

    it("behaviour (2) — max-update freshness field does not stay LOCKED at ρ = 0", () => {
      const m = named("max-update freshness field");
      const stuck = derived("LOCKED");
      const result = take(m, afterShortcut(m, 0, derived("N")), BFS_OPEN);
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeLessThan(stuck);
    });

    it("behaviour (2) — ρ pinned at 0.25 does not stay LOCKED even at ρ = 0", () => {
      const m = named("ρ pinned at 0.25");
      const stuck = derived("LOCKED");
      const result = take(m, afterShortcut(m, 0, derived("N")), BFS_OPEN);
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeLessThan(stuck);
    });

    it("behaviour (3) — ρ ignored never falls below SWITCHED", () => {
      const m = named("ρ ignored");
      const target = derived("SWITCHED");
      const result = take(m, afterShortcut(m, 0.12, derived("M")), BFS_OPEN);
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeGreaterThanOrEqual(target);
    });

    it("behaviour (3) — one pheromone map never falls below SWITCHED", () => {
      const m = named("one pheromone map");
      const target = derived("SWITCHED");
      const result = take(m, afterShortcut(m, 0.12, derived("M")), BFS_OPEN);
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeGreaterThanOrEqual(target);
    });
  });

  describe("the η mutant is the one only the honesty test may catch", () => {
    const m = named("η encodes distance to food");

    it("passes behaviour (2) — it locks in at ρ = 0 just like the real engine", () => {
      const stuck = derived("LOCKED");
      const result = take(m, afterShortcut(m, 0, derived("N")), BFS_OPEN);
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeGreaterThanOrEqual(stuck);
    });

    it("fails the honesty invariant — its choice at the nest changes when the food moves", () => {
      // Mirrors spec/engine-honesty.test.ts's check on the real engine, but expects
      // the OPPOSITE outcome: this policy reads distanceToFood(), so relocating the
      // goal must change an unpheromoned choice that a momentum-only η could not.
      const foodMoved = { ...fixture, food: "L4" };
      const distributionAt = (fx: typeof fixture) => {
        const state = m.create(fx, { rho: 0, seed: 1 });
        return m.choiceDistribution(state, fx.nest);
      };
      const before = distributionAt(fixture);
      const after = distributionAt(foodMoved);
      const changed = [...before].some(
        ([neighbour, probability]) =>
          Math.abs((after.get(neighbour) ?? 0) - probability) > 1e-9,
      );
      expect(
        changed,
        "the η mutant's choice at the nest did not change when the food moved — " +
          "it should have, because it reads distance to food, which is exactly " +
          "what the honesty invariant forbids the real engine from doing",
      ).toBe(true);
    });
  });
}
