// The four required behaviours, all four now measured rather than asserted.
//
// Behaviour (2) is the discriminating test. If it cannot be made to pass, the model
// is wrong and Decision 1 reopens toward 1a — we do not tune thresholds to pass.
// And a failure at h = 1 is not evidence against 1b: lock-in sharpness depends on
// the choice nonlinearity, so the fixture parameters are reported with every run.
//
// Every rate comes from RHO (src/sim/rho.ts), which is the rate its threshold was
// derived at. The schedule comes from spec/flow.ts, which is the schedule the
// negative controls run too.

import { describe, expect, it } from "vitest";
import { HORIZON, RHO, SAMPLE } from "../src/sim/rho.ts";
import { longestRunBelow } from "../src/sim/trace.ts";
import {
  BFS_CLOSED,
  BFS_OPEN,
  REAL,
  afterShortcut,
  settled,
  take,
  traceAfterShortcut,
} from "./flow.ts";
import { derived } from "./thresholds.ts";

describe("behaviour (1) — a near-shortest path emerges from local rules only", () => {
  it("gets within EMERGED of the only route available, shortcut still shut", () => {
    // Emergence on its own terms, measured against the 8 moves that are actually
    // there — not the switch that behaviour (3) tests. No ant has seen BFS.
    const target = derived("EMERGED");
    const result = take(REAL, settled(REAL, RHO.default), BFS_CLOSED);
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeLessThanOrEqual(target);
  });
});

describe("behaviour (2) — lock-in at forgetting = 0 (the discriminating test)", () => {
  it("stays at or above LOCKED for N steps after the shortcut opens", () => {
    const stuck = derived("LOCKED");
    const result = take(
      REAL,
      afterShortcut(REAL, RHO.locked, derived("N")),
      BFS_OPEN,
    );
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeGreaterThanOrEqual(stuck);
  });
});

describe("behaviour (3) — moderate forgetting switches within a bound", () => {
  it("falls below SWITCHED within M steps of the shortcut opening", () => {
    const target = derived("SWITCHED");
    const result = take(
      REAL,
      afterShortcut(REAL, RHO.default, derived("M")),
      BFS_OPEN,
    );
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeLessThan(target);
  });
});

describe("behaviour (4) — too much forgetting never stabilises", () => {
  // No longer provisional. "Never stabilises" is a claim about the reading over K
  // CONSECUTIVE samples and one end value could not express it, so this now runs
  // against the trace — the same series the strip under the canvas plots.
  //
  // RHO.max, not ρ = 1: Decision 11 puts ρ = 1 off the control, and at ρ = 1
  // pheromone is wiped every step, so a test there asserts against a degenerate
  // graph rather than against forgetting.
  //
  // Red-capable, and it is the roster that proves it rather than a claim here: the
  // max-update freshness control holds a run of 24 samples below UNSTABLE on this
  // identical schedule, asserted in spec/mutants.test.ts. Same helper, same rate,
  // opposite expectation.
  it("never holds below UNSTABLE for K consecutive samples", () => {
    const ceiling = derived("UNSTABLE");
    const series = traceAfterShortcut(REAL, RHO.max, HORIZON);
    expect(series.length).toBe(HORIZON / SAMPLE);
    expect(longestRunBelow(series, ceiling)).toBeLessThan(derived("K"));
  });
});
