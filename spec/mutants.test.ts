// The negative controls have to be real engines first.
//
// A mutant that goes red because it crashes, loses ants or wanders
// non-deterministically proves nothing: the behaviour test would fail against it
// whatever the behaviour was. These assertions are what make a later red mean "it
// failed the behaviour it was built to fail" rather than "it was broken".
//
// The paired-failure assertions — each mutant against the behaviour in its pairing —
// need the thresholds, and the thresholds are derived by separating the real engine
// FROM these mutants. So they arrive with the derivation, not before it.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { MUTANTS } from "./mutants/index.ts";

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
