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
// UNSTABLE/K — src/sim/rho.ts), and the schedule is spec/flow.ts, the same one
// spec/engine-behaviours.test.ts runs. A control that ran its own copy of either
// would not be a control.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { HORIZON, RHO } from "../src/sim/rho.ts";
import { longestRunBelow } from "../src/sim/trace.ts";
import {
  BFS_CLOSED,
  BFS_OPEN,
  afterShortcut,
  settled,
  take,
  traceAfterShortcut,
} from "./flow.ts";
import type { FlowHost } from "./flow.ts";
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

  /** A mutant IS an engine; this only renames `create` to what the flow calls it. */
  const host = (mutant: Mutant): FlowHost<unknown> => ({
    create: (fx, options) => mutant.create(fx, options),
    step: (state) => mutant.step(state),
    toggleShortcut: (state) => mutant.toggleShortcut(state),
    completedTripLengths: (state) => mutant.completedTripLengths(state),
  });

  const named = (name: string) =>
    host(MUTANTS.find((m) => m.name === name) as Mutant);

  describe("each mutant fails the behaviour it is paired against", () => {
    it("behaviour (1) — pure random walk never gets within EMERGED of the only route", () => {
      const m = named("pure random walk");
      const target = derived("EMERGED");
      const result = take(m, settled(m, RHO.default), BFS_CLOSED);
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeGreaterThan(target);
    });

    it("behaviour (2) — max-update freshness field does not stay LOCKED at ρ = 0", () => {
      const m = named("max-update freshness field");
      const stuck = derived("LOCKED");
      const result = take(
        m,
        afterShortcut(m, RHO.locked, derived("N")),
        BFS_OPEN,
      );
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeLessThan(stuck);
    });

    it("behaviour (2) — ρ pinned at 0.25 does not stay LOCKED even at ρ = 0", () => {
      const m = named("ρ pinned at 0.25");
      const stuck = derived("LOCKED");
      const result = take(
        m,
        afterShortcut(m, RHO.locked, derived("N")),
        BFS_OPEN,
      );
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeLessThan(stuck);
    });

    it("behaviour (3) — ρ ignored never falls below SWITCHED", () => {
      const m = named("ρ ignored");
      const target = derived("SWITCHED");
      const result = take(
        m,
        afterShortcut(m, RHO.default, derived("M")),
        BFS_OPEN,
      );
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeGreaterThanOrEqual(target);
    });

    it("behaviour (3) — one pheromone map never falls below SWITCHED", () => {
      const m = named("one pheromone map");
      const target = derived("SWITCHED");
      const result = take(
        m,
        afterShortcut(m, RHO.default, derived("M")),
        BFS_OPEN,
      );
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeGreaterThanOrEqual(target);
    });

    // The freshness field is dual-role, as spec/oracles.md §3 records: it is
    // behaviour (2)'s key control AND behaviour (4)'s, on the other side of the
    // same claim. This assertion is what makes behaviour (4)'s test red-capable —
    // it runs the identical schedule and the identical helper, and shows the
    // predicate that must never hold for the real engine holding for 24 samples
    // here. Without it, "never stabilises" would be a guard nobody had watched
    // fail.
    it("behaviour (4) — max-update freshness field DOES stabilise below UNSTABLE", () => {
      const m = named("max-update freshness field");
      const series = traceAfterShortcut(m, RHO.max, HORIZON);
      expect(longestRunBelow(series, derived("UNSTABLE"))).toBeGreaterThanOrEqual(
        derived("K"),
      );
    });
  });

  describe("the η mutant is the one only the honesty test may catch", () => {
    const mutant = MUTANTS.find(
      (m) => m.name === "η encodes distance to food",
    ) as Mutant;
    const m = host(mutant);

    it("passes behaviour (2) — it locks in at ρ = 0 just like the real engine", () => {
      const stuck = derived("LOCKED");
      const result = take(
        m,
        afterShortcut(m, RHO.locked, derived("N")),
        BFS_OPEN,
      );
      expect(result.status).toBe("ok");
      expect(result.ratio as number).toBeGreaterThanOrEqual(stuck);
    });

    it("fails the honesty invariant — its choice at the nest changes when the food moves", () => {
      // Mirrors spec/engine-honesty.test.ts's check on the real engine, but expects
      // the OPPOSITE outcome: this policy reads distanceToFood(), so relocating the
      // goal must change an unpheromoned choice that a momentum-only η could not.
      const foodMoved = { ...fixture, food: "L4" };
      const distributionAt = (fx: typeof fixture) => {
        const state = mutant.create(fx, { rho: RHO.locked, seed: 1 });
        return mutant.choiceDistribution(state, fx.nest);
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
