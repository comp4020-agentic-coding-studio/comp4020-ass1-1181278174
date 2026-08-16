// The field sensor: `pnpm spike --fixture=field`.
//
// EXPLORATORY ONLY, exactly like scripts/spike.ts. It derives no thresholds and
// records no conclusions beyond what the numbers were. Deriving means two-sided
// separation against the negative controls with a stated margin on each side
// (spec/oracles.md §3), and none of that happens here.
//
// Decision 16 changed the fixture, not the mechanic, so this asks the same four
// questions the double bridge answered — and one the bridge never had to:
//
//   0. does 1b FIND the food at all, and how fast? On twelve nodes that was free.
//      On 2141 it is the thing most likely to sink the whole idea, and the fix if
//      it is too slow is nearer food / more ants / a smaller field — never a
//      distance heuristic, which would make beat 1's sentence false.
//   1. does a road form, and does it thread between the obstacles?
//   2. ρ = 0: does the colony stay on the long way once the gap opens?
//   3. ρ ≈ 0.12: does it switch?
//   4. ρ = 0.25: does it refuse to settle?
//
// h, k and floor are printed with every run, because lock-in sharpness depends on
// them and a run that cannot report them supports no conclusion at all.

import { FIELD_V3, FIELD_V3_SPEC } from "../src/fixtures/field-v3.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { reading } from "../src/sim/reading.ts";

const fixture = FIELD_V3;
const ANTS = 400;
const SEEDS = [1, 2, 3];

// Placeholders, not derived. Named so nobody reads them as settled.
const SETTLE = 6000;
const AFTER = 12000;
const SAMPLE_EVERY = 1000;
const WINDOW = 300;
const MIN_TRIPS = 65;

const closed = induce(fixture, { openShortcut: false });
const open = induce(fixture, { openShortcut: true });
const BFS_LONG = shortestPathLength(closed, fixture.nest, fixture.food) as number;
const BFS_SHORT = shortestPathLength(open, fixture.nest, fixture.food) as number;

/** Total pheromone per NODE, for the ASCII map: max over the edges that touch it. */
function nodeHeat(colony: engine.Colony): Map<string, number> {
  const heat = new Map<string, number>();
  fixture.edges.forEach((edge, e) => {
    const tau = (colony.home[e] as number) + (colony.foodTrail[e] as number);
    for (const node of [edge.a, edge.b]) {
      heat.set(node, Math.max(heat.get(node) ?? 0, tau));
    }
  });
  return heat;
}

/**
 * The field, drawn. Digits are pheromone relative to the busiest cell, `#` is
 * blocked, `+` is the gap while it is shut. Half height, because 40 rows of
 * terminal is more than anyone reads — every second row.
 */
function map(colony: engine.Colony): string {
  const heat = nodeHeat(colony);
  const peak = Math.max(...heat.values(), 1);
  const blocked = new Set(FIELD_V3_SPEC.blocked);
  const gaps = new Set(FIELD_V3_SPEC.gaps.map(([x, y]) => `${x},${y}`));
  const rows: string[] = [];
  for (let y = 0; y < FIELD_V3_SPEC.height; y += 2) {
    let row = "";
    for (let x = 0; x < FIELD_V3_SPEC.width; x += 1) {
      const node = `${x},${y}`;
      if (node === fixture.nest) row += "N";
      else if (node === fixture.food) row += "F";
      else if (gaps.has(node)) row += colony.shortcutOpen ? "." : "+";
      else if (blocked.has(node)) row += "#";
      else {
        const tau = heat.get(node) ?? 0;
        const level = Math.round((tau / peak) * 9);
        row += tau <= 0 ? "·" : String(level);
      }
    }
    rows.push(`  ${row}`);
  }
  return rows.join("\n");
}

const take = (colony: engine.Colony, against: number) =>
  reading(engine.completedTripLengths(colony), against, {
    window: WINDOW,
    minTrips: MIN_TRIPS,
  });

const show = (colony: engine.Colony, against: number) => {
  const value = take(colony, against);
  return value.status === "ok"
    ? `${(value.ratio as number).toFixed(3)}×`
    : "  no reading";
};

/** Steps until the first ant reaches the food. The question the bridge never asked. */
function firstFood(seed: number): { at: number | null; colony: engine.Colony } {
  const colony = engine.createColony(fixture, {
    rho: 0.12,
    seed,
    ants: ANTS,
    tripHistory: Infinity,
  });
  for (let step = 1; step <= SETTLE; step += 1) {
    engine.step(colony);
    if (colony.tripsCompleted > 0) return { at: step, colony };
  }
  return { at: null, colony };
}

function main(): void {
  console.log(`# Field spike — exploratory, derives nothing`);
  console.log();
  console.log(`fixture   ${fixture.name}  ${FIELD_V3_SPEC.width}x${FIELD_V3_SPEC.height}`);
  console.log(
    `graph     ${fixture.nodes.length} nodes, ${fixture.edges.length} edges, ` +
      `${FIELD_V3_SPEC.blocked.length} blocked cells`,
  );
  console.log(
    `routes    long ${BFS_LONG} moves (round the wall), short ${BFS_SHORT} through the gap` +
      ` — ratio ${(BFS_LONG / BFS_SHORT).toFixed(3)}`,
  );
  console.log(
    `params    h=${fixture.params.h}  k=${fixture.params.k}  floor=${fixture.params.floor}   ants=${ANTS}`,
  );
  console.log(
    `schedule  settle ${SETTLE}, open the gap, then ${AFTER} more; window ${WINDOW} trips, min ${MIN_TRIPS}`,
  );
  console.log();

  // --- 0. does it find the food at all? -----------------------------------
  console.log(`## 0. first food`);
  console.log();
  const found: (number | null)[] = [];
  for (const seed of SEEDS) {
    const { at } = firstFood(seed);
    found.push(at);
    console.log(
      `seed ${seed}: first trip completed at step ${at ?? `NEVER within ${SETTLE}`}`,
    );
  }
  console.log();

  // --- 1. does a road form? ------------------------------------------------
  console.log(`## 1. a road, gap still shut (vs BFS ${BFS_LONG})`);
  console.log();
  const settled = engine.createColony(fixture, {
    rho: 0.12,
    seed: 1,
    ants: ANTS,
  });
  for (let step = 1; step <= SETTLE; step += 1) {
    engine.step(settled);
    if (step % SAMPLE_EVERY === 0) {
      console.log(
        `  step ${String(step).padStart(6)}  ${show(settled, BFS_LONG)}  ` +
          `trips ${settled.tripsCompleted}`,
      );
    }
  }
  console.log();
  console.log(map(settled));
  console.log();

  // --- 2-4. the three rates, each from its own settled colony ---------------
  for (const [label, rho] of [
    ["2. lock-in", 0],
    ["3. switching", 0.12],
    ["4. too much", 0.25],
  ] as const) {
    console.log(`## ${label} — ρ = ${rho}, gap opens at step ${SETTLE} (vs BFS ${BFS_SHORT})`);
    console.log();
    const colony = engine.createColony(fixture, { rho, seed: 1, ants: ANTS });
    for (let step = 1; step <= SETTLE; step += 1) engine.step(colony);
    console.log(`  at the gap opening: ${show(colony, BFS_LONG)} vs the long way`);
    engine.toggleShortcut(colony);
    for (let step = 1; step <= AFTER; step += 1) {
      engine.step(colony);
      if (step % SAMPLE_EVERY === 0) {
        console.log(
          `  +${String(step).padStart(6)}  ${show(colony, BFS_SHORT)}  ` +
            `trips ${colony.tripsCompleted}`,
        );
      }
    }
    console.log();
    console.log(map(colony));
    console.log();
  }
}

main();
