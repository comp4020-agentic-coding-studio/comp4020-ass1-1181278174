// The core interaction on the page's own field (Decision 32).
//
// spec/bridge-interaction.test.ts holds the double bridge — the oracle fixture
// every derived threshold lives on. This file holds what the PAGE promises, on the
// field the visitor actually watches, in the order they meet it: press Run and a
// road forms; draw a wall across it and a new road forms; push forgetting to the
// far end and no road survives. The numbers are PROVISIONAL — measured on this
// field, seed 1, and written into spec/thresholds.ts with the measurement beside
// each — not derived by two-sided separation. Provisional is still better than
// a test that asserts the bridge and calls it the page.

import { describe, expect, it } from "vitest";
import { FIELD_V5 } from "../src/fixtures/field-v5.ts";
import { induce } from "../src/fixtures/graph.ts";
import { sceneWalls } from "../src/fixtures/presets.ts";
import type { SceneKind } from "../src/fixtures/presets.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import type { Colony } from "../src/sim/engine.ts";
import * as engine from "../src/sim/engine.ts";
import { READING_WINDOW, reading } from "../src/sim/reading.ts";
import { FIELD_RHO } from "../src/sim/rho.ts";
import { FIELD_PROVISIONAL as F } from "./thresholds.ts";

const ANTS = 400;
const SEED = 1;

function colonyOn(kind: SceneKind, rho = FIELD_RHO.default, seed = SEED): Colony {
  const colony = engine.createColony(FIELD_V5, {
    rho,
    seed,
    ants: ANTS,
    tripHistory: Infinity,
  });
  for (const cell of sceneWalls(FIELD_V5, kind, 1)) engine.toggleCell(colony, cell);
  return colony;
}

const bfsNow = (colony: Colony): number =>
  shortestPathBetween(
    induce(FIELD_V5, { openShortcut: false, blocked: colony.drawnWalls }),
    FIELD_V5.nestZone!,
    FIELD_V5.foodZone!,
  ) as number;

/** The page's own reading, over the trips completed since `from`. */
const readFrom = (colony: Colony, from: number) =>
  reading(colony.trips.slice(from), bfsNow(colony), READING_WINDOW);

const run = (colony: Colony, steps: number): void => {
  for (let i = 0; i < steps; i += 1) engine.step(colony);
};

describe("press Run — a road forms on every scene", () => {
  it("on the blank field, within SETTLE steps, the reading is under EMERGED", () => {
    const colony = colonyOn("blank");
    run(colony, F.SETTLE);
    const value = readFrom(colony, 0);
    expect(value.status).toBe("ok");
    expect(value.ratio as number).toBeLessThanOrEqual(F.EMERGED);
  });

  it("through the random obstacles too", () => {
    const colony = colonyOn("random");
    run(colony, F.SETTLE);
    const value = readFrom(colony, 0);
    expect(value.status).toBe("ok");
    expect(value.ratio as number).toBeLessThanOrEqual(F.EMERGED);
  });

  it("and through the maze, given twice as long", () => {
    const colony = colonyOn("maze");
    run(colony, 2 * F.SETTLE);
    const value = readFrom(colony, 0);
    expect(value.status).toBe("ok");
    expect(value.ratio as number).toBeLessThanOrEqual(F.EMERGED);
  });
});

describe("draw a wall — the road heals", () => {
  it("a bar across the settled road is routed round within HEAL_WITHIN steps", () => {
    const colony = colonyOn("blank");
    run(colony, F.SETTLE);
    const before = bfsNow(colony);
    for (let y = 15; y <= 25; y += 1) expect(engine.toggleCell(colony, `30,${y}`)).toBe(true);
    expect(bfsNow(colony)).toBeGreaterThan(before); // the wall really is across the road
    const cut = colony.trips.length;
    let healedAt: number | null = null;
    for (let step = 50; step <= F.HEAL_WITHIN; step += 50) {
      run(colony, 50);
      const value = readFrom(colony, cut);
      if (value.status === "ok" && (value.ratio as number) <= F.HEALED) {
        healedAt = step;
        break;
      }
    }
    expect(healedAt).not.toBeNull();
  });
});

describe("try the far end — no road survives", () => {
  it("at the slider's maximum a settled road is lost", () => {
    const colony = colonyOn("blank");
    run(colony, F.SETTLE);
    (colony as { rho: number }).rho = FIELD_RHO.max;
    const cut = colony.trips.length;
    run(colony, F.SETTLE);
    const value = readFrom(colony, cut);
    // Either the reading has blown up, or too few trips complete to read at all.
    const lost = value.status !== "ok" || (value.ratio as number) >= F.LOST_ABOVE;
    expect(lost).toBe(true);
  });
});

describe("the runs are honest about themselves", () => {
  it("the same seed gives the same colony", () => {
    const a = colonyOn("random");
    const b = colonyOn("random");
    run(a, 1000);
    run(b, 1000);
    expect(engine.digest(a)).toBe(engine.digest(b));
  });

  it("a different seed gives a different one — nothing is frozen", () => {
    const a = colonyOn("blank", FIELD_RHO.default, 1);
    const b = colonyOn("blank", FIELD_RHO.default, 2);
    run(a, 1000);
    run(b, 1000);
    expect(engine.digest(a)).not.toBe(engine.digest(b));
  });

  it("the reading refuses to be a number before it has trips to average", () => {
    const colony = colonyOn("blank");
    run(colony, 100);
    expect(readFrom(colony, 0).status).not.toBe("ok");
  });
});
