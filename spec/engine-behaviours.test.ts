// The four required behaviours. Still RED, and now for one reason only: the
// thresholds are symbols. `derived()` throws with the derivation protocol in the
// message, so the red says "not derived yet" rather than comparing undefined.
//
// Behaviour (2) is the discriminating test. If it cannot be made to pass, the model
// is wrong and Decision 1 reopens toward 1a — we do not tune thresholds to pass.
// And a failure at h = 1 is not evidence against 1b: lock-in sharpness depends on
// the choice nonlinearity, so the fixture parameters are reported with every run.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import type { Colony } from "../src/sim/engine.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";
import { engine, reading } from "./engine-api.ts";
import { derived } from "./thresholds.ts";

const fixture = DOUBLE_BRIDGE;
const SEED = 1;

const bfs = (openShortcut: boolean) =>
  shortestPathLength(
    induce(fixture, { openShortcut }),
    fixture.nest,
    fixture.food,
  ) as number;

/** 8 moves while the shortcut is shut, 4 once it opens. */
const BFS_CLOSED = bfs(false);
const BFS_OPEN = bfs(true);

function take(state: Colony, against: number) {
  return reading.reading(engine.completedTripLengths(state), against, {
    window: derived("N_trips"),
    minTrips: derived("MIN_TRIPS"),
  });
}

/** Let the long trail establish. SETTLE, not M — M is the switch bound only. */
function settled(rho: number) {
  const state = engine.createColony(fixture, { rho, seed: SEED });
  for (let i = 0; i < derived("SETTLE"); i += 1) engine.step(state);
  return state;
}

/** The double bridge as Goss ran it: long branch first, short branch added later. */
function afterShortcut(rho: number, stepsAfter: number) {
  const state = settled(rho);
  engine.toggleShortcut(state);
  for (let i = 0; i < stepsAfter; i += 1) engine.step(state);
  return state;
}

describe("behaviour (1) — a near-shortest path emerges from local rules only", () => {
  it("gets within EMERGED of the only route available, shortcut still shut", () => {
    // Emergence on its own terms, measured against the 8 moves that are actually
    // there — not the switch that behaviour (3) tests. No ant has seen BFS.
    const target = derived("EMERGED");
    const result = take(settled(0.05), BFS_CLOSED);
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeLessThanOrEqual(target);
  });
});

describe("behaviour (2) — lock-in at forgetting = 0 (the discriminating test)", () => {
  it("stays at or above LOCKED for N steps after the shortcut opens", () => {
    const stuck = derived("LOCKED");
    const result = take(afterShortcut(0, derived("N")), BFS_OPEN);
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeGreaterThanOrEqual(stuck);
  });
});

describe("behaviour (3) — moderate forgetting switches within a bound", () => {
  it("falls below SWITCHED within M steps of the shortcut opening", () => {
    const target = derived("SWITCHED");
    const result = take(afterShortcut(0.05, derived("M")), BFS_OPEN);
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeLessThan(target);
  });
});

describe("behaviour (4) — too much forgetting never stabilises", () => {
  // TODO: this is not the real test and must not be mistaken for it. "Never
  // stabilises" is a claim about the reading over K CONSECUTIVE steps, and one end
  // value cannot express it. Rewrite it against the reading trace once slice 2
  // builds the trace — the same series the history line plots. Left provisional and
  // labelled rather than faked green: a guard that asserts the wrong thing is worse
  // than one that is missing.
  it("never holds below UNSTABLE for K consecutive steps", () => {
    const ceiling = derived("UNSTABLE");
    const result = take(afterShortcut(1, derived("K")), BFS_OPEN);
    expect(result.ratio === null || result.ratio > ceiling).toBe(true);
  });
});
