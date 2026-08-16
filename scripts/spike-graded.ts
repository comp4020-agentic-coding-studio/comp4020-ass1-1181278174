// The graded-deposit sweep: `pnpm spike:graded`. Decision 17, checkpoint 2.
//
// SPIKE ONLY. Nothing here adopts anything, changes a default, or touches a
// threshold. It varies four fixture parameters whose defaults are today's
// behaviour and reports what each combination did, so the director can pick one.
//
// Stage A asks the only question that matters first — does a road form at all,
// with the gap shut. Stage B takes the two best and asks the four behaviours of
// them.
//
// Rates: the bridge's ρ = 0.12 is not a field value and is not swept. A 51-move
// route cannot outlive an evaporation half-life of ~5 steps; on this field the
// half-lives that matter are ~140 steps (ρ = 0.005) and ~35 (ρ = 0.02).

import { mkdirSync, writeFileSync } from "node:fs";
import { FIELD_V3_SPEC } from "../src/fixtures/field-v3.ts";
import { buildField } from "../src/fixtures/grid.ts";
import type { Fixture } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { reading } from "../src/sim/reading.ts";

const ANTS = 400;
const HORIZON = 15_000;
const SAMPLE_EVERY = 500;
const WINDOW = 300;
const MIN_TRIPS = 65;
const SEEDS_A = [1, 2, 3];
const SEEDS_B = [1, 2, 3, 4, 5];
const RHOS_A = [0.005, 0.02];
const RHOS_B = [0, 0.002, 0.005, 0.01, 0.02, 0.05];

/** Provisional, and provisional means provisional: the grid is not extended to chase them. */
const PASS = { firstFood: 500, trips: 300, reading: 1.6 };

const BASE = buildField(FIELD_V3_SPEC);
const BFS_LONG = shortestPathBetween(
  induce(BASE, { openShortcut: false }),
  FIELD_V3_SPEC.nestZone,
  FIELD_V3_SPEC.foodZone,
) as number;
const BFS_SHORT = shortestPathBetween(
  induce(BASE, { openShortcut: true }),
  FIELD_V3_SPEC.nestZone,
  FIELD_V3_SPEC.foodZone,
) as number;

interface Variant {
  readonly T: number;
  readonly W: number;
  readonly w: number;
  readonly D: number;
}

const label = (v: Variant) =>
  `T=${Number.isFinite(v.T) ? v.T : "∞"} W=${v.W} w=${v.w} D=${v.D}`;

function fixtureFor(v: Variant): Fixture {
  return buildField({
    ...FIELD_V3_SPEC,
    params: {
      ...FIELD_V3_SPEC.params,
      gradedOver: v.T,
      whisker: v.W,
      straightBias: v.w,
      depositPerStep: v.D,
    },
  });
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? Number.NaN;
};

const fmt = (value: number, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

interface Run {
  readonly firstFood: number;
  readonly trips: number;
  readonly settled: number;
  readonly direct: number;
  readonly colony: engine.Colony;
}

/** One seeded run with the gap SHUT: does a road form? */
function runA(fixture: Fixture, rho: number, seed: number): Run {
  const colony = engine.createColony(fixture, {
    rho,
    seed,
    ants: ANTS,
    tripHistory: Infinity,
  });
  let firstFood = Infinity;
  for (let step = 1; step <= HORIZON; step += 1) {
    engine.step(colony);
    if (firstFood === Infinity && colony.tripsCompleted > 0) firstFood = step;
  }
  const trips = engine.completedTripLengths(colony);
  const value = reading(trips, BFS_LONG, { window: WINDOW, minTrips: MIN_TRIPS });
  // "Home within 4x the shortest": the share of completed trips that were not a
  // wander. With the gap shut the shortest available IS the long way round.
  const direct = trips.filter((length) => length <= 4 * BFS_LONG).length;
  return {
    firstFood,
    trips: colony.tripsCompleted,
    settled: value.status === "ok" ? (value.ratio as number) : Number.NaN,
    direct: trips.length === 0 ? Number.NaN : direct / trips.length,
    colony,
  };
}

/** The field, drawn: digits are pheromone against the busiest cell. Every second row. */
function map(colony: engine.Colony, fixture: Fixture): string {
  const heat = new Map<string, number>();
  fixture.edges.forEach((edge, e) => {
    const tau = (colony.home[e] as number) + (colony.foodTrail[e] as number);
    for (const node of [edge.a, edge.b]) {
      heat.set(node, Math.max(heat.get(node) ?? 0, tau));
    }
  });
  const peak = Math.max(...heat.values(), 1);
  const blocked = new Set(FIELD_V3_SPEC.blocked);
  const nest = new Set(FIELD_V3_SPEC.nestZone);
  const food = new Set(FIELD_V3_SPEC.foodZone);
  const gaps = new Set(FIELD_V3_SPEC.gaps.map(([x, y]) => `${x},${y}`));
  const rows: string[] = [];
  for (let y = 0; y < FIELD_V3_SPEC.height; y += 2) {
    let row = "";
    for (let x = 0; x < FIELD_V3_SPEC.width; x += 1) {
      const node = `${x},${y}`;
      if (nest.has(node)) row += "N";
      else if (food.has(node)) row += "F";
      else if (gaps.has(node)) row += colony.shortcutOpen ? "." : "+";
      else if (blocked.has(node)) row += "#";
      else {
        const tau = heat.get(node) ?? 0;
        row += tau <= 0 ? "·" : String(Math.round((tau / peak) * 9));
      }
    }
    rows.push(row);
  }
  return rows.join("\n");
}

interface Scored {
  readonly variant: Variant;
  readonly rho: number;
  readonly firstFood: number;
  readonly trips: number;
  readonly settled: number;
  readonly direct: number;
  readonly passes: boolean;
  readonly sample: Run;
}

function stageA(say: (line?: string) => void): Scored[] {
  const variants: Variant[] = [];
  for (const T of [20, 40, 80, Infinity]) {
    for (const W of [1, 3]) {
      for (const w of [1, 4]) {
        for (const D of [1, 20]) variants.push({ T, W, w, D });
      }
    }
  }

  say(`## Stage A — does a road form? Gap SHUT.`);
  say();
  say(
    `${ANTS} ants, ${HORIZON} steps, ${SEEDS_A.length} seeds, reading vs BFS ${BFS_LONG} ` +
      `(the shortest route there is while the gap is shut).`,
  );
  say();
  say(
    `Provisional pass: first food ≤ ${PASS.firstFood}, ≥ ${PASS.trips} trips, settled reading ≤ ${PASS.reading}×. ` +
      `T = ∞ is the control — today's flat deposit.`,
  );
  say();
  say(`| variant | ρ | first food | trips | settled reading | home ≤ 4× | |`);
  say(`|---|---|---|---|---|---|---|`);

  const scored: Scored[] = [];
  for (const variant of variants) {
    const fixture = fixtureFor(variant);
    for (const rho of RHOS_A) {
      const runs = SEEDS_A.map((seed) => runA(fixture, rho, seed));
      const firstFood = median(runs.map((r) => r.firstFood));
      const trips = median(runs.map((r) => r.trips));
      const settled = median(runs.map((r) => r.settled));
      const direct = median(runs.map((r) => r.direct));
      const passes =
        firstFood <= PASS.firstFood &&
        trips >= PASS.trips &&
        settled <= PASS.reading;
      scored.push({
        variant,
        rho,
        firstFood,
        trips,
        settled,
        direct,
        passes,
        sample: runs[0] as Run,
      });
      say(
        `| ${label(variant)} | ${rho} | ${Number.isFinite(firstFood) ? firstFood : "never"} | ` +
          `${trips} | ${fmt(settled)}× | ${fmt(direct * 100, 0)}% | ${passes ? "**pass**" : ""} |`,
      );
    }
  }
  say();
  return scored;
}

function stageB(say: (line?: string) => void, best: readonly Scored[]): void {
  say(`## Stage B — the four behaviours, on the two best Stage-A variants`);
  say();
  say(
    `${ANTS} ants, ${SEEDS_B.length} seeds. Settle ${HORIZON} steps with the gap shut, ` +
      `open it, then ${HORIZON} more. Before-reading is vs BFS ${BFS_LONG}; ` +
      `after-reading is vs BFS ${BFS_SHORT}.`,
  );
  say();

  for (const candidate of best) {
    const fixture = fixtureFor(candidate.variant);
    say(`### ${label(candidate.variant)}`);
    say();
    say(`| ρ | before opening | after ${HORIZON} | first below 1.4× | settles? |`);
    say(`|---|---|---|---|---|`);

    for (const rho of RHOS_B) {
      const befores: number[] = [];
      const afters: number[] = [];
      const crossings: number[] = [];
      const spreads: number[] = [];
      for (const seed of SEEDS_B) {
        const colony = engine.createColony(fixture, {
          rho,
          seed,
          ants: ANTS,
          tripHistory: Infinity,
        });
        for (let step = 1; step <= HORIZON; step += 1) engine.step(colony);
        const before = reading(engine.completedTripLengths(colony), BFS_LONG, {
          window: WINDOW,
          minTrips: MIN_TRIPS,
        });
        befores.push(before.status === "ok" ? (before.ratio as number) : Number.NaN);

        engine.toggleShortcut(colony);
        const series: number[] = [];
        let crossed = Infinity;
        for (let step = 1; step <= HORIZON; step += 1) {
          engine.step(colony);
          if (step % SAMPLE_EVERY !== 0) continue;
          const value = reading(engine.completedTripLengths(colony), BFS_SHORT, {
            window: WINDOW,
            minTrips: MIN_TRIPS,
          });
          if (value.status !== "ok") continue;
          const ratio = value.ratio as number;
          series.push(ratio);
          if (crossed === Infinity && ratio < 1.4) crossed = step;
        }
        afters.push(series.at(-1) ?? Number.NaN);
        crossings.push(crossed);
        const tail = series.slice(-10);
        spreads.push(
          tail.length < 2 ? Number.NaN : Math.max(...tail) - Math.min(...tail),
        );
      }
      const spread = median(spreads);
      const crossed = median(crossings);
      say(
        `| ${rho} | ${fmt(median(befores))}× | ${fmt(median(afters))}× | ` +
          `${Number.isFinite(crossed) ? crossed : "never"} | ` +
          `${Number.isFinite(spread) ? `${fmt(spread)}× swing` : "—"} |`,
      );
    }
    say();
  }
}

function honesty(say: (line?: string) => void, best: readonly Scored[]): void {
  say(`## The honesty invariant, on the field`);
  say();
  say(
    `Decision 1c: η is momentum only. Move the food block and a seeker's choice at ` +
      `the nest must not change — if it did, some term would be reading the goal.`,
  );
  say();
  say(`| variant | choice at the nest changed? |`);
  say(`|---|---|`);
  for (const candidate of best) {
    const fixture = fixtureFor(candidate.variant);
    const moved: Fixture = {
      ...fixture,
      foodZone: FIELD_V3_SPEC.foodZone.map((cell) => {
        const [x, y] = cell.split(",");
        return `${x},${Number(y) + 19}`;
      }),
    };
    const distributionAt = (which: Fixture) => {
      const colony = engine.createColony(which, { rho: 0, seed: 1, ants: ANTS });
      return engine.choiceDistribution(colony, which.nest);
    };
    const before = distributionAt(fixture);
    const after = distributionAt(moved);
    const changed = [...before].some(
      ([node, probability]) =>
        Math.abs((after.get(node) ?? 0) - probability) > 1e-12,
    );
    say(`| ${label(candidate.variant)} | ${changed ? "**YES — a term reads the goal**" : "no"} |`);
  }
  say();
}

function main(): void {
  const out: string[] = [];
  const say = (line = "") => {
    console.log(line);
    out.push(line);
  };

  say(`# The graded-deposit sweep — 2026-08-17`);
  say();
  say(
    `Decision 17, checkpoint 2. **Spike only**: nothing here is adopted, no default ` +
      `is changed, no threshold is touched.`,
  );
  say();
  say(
    `Field ${FIELD_V3_SPEC.width}×${FIELD_V3_SPEC.height}, ${BASE.nodes.length} nodes, ` +
      `${BASE.edges.length} edges. BFS **${BFS_LONG}** round the wall, **${BFS_SHORT}** ` +
      `through the gap (zone to zone) — ratio ${(BFS_LONG / BFS_SHORT).toFixed(3)}.`,
  );
  say(
    `h = ${FIELD_V3_SPEC.params.h}, k = ${FIELD_V3_SPEC.params.k}, floor = ${FIELD_V3_SPEC.params.floor}, ` +
      `untouched. Window ${WINDOW} trips, minimum ${MIN_TRIPS}.`,
  );
  say();

  const scored = stageA(say);
  const passing = scored.filter((row) => row.passes);

  // Ranking by reading ALONE is wrong and the first run of this sweep proved it:
  // it put a variant with 47 completed trips at the top, whose "reading" is a mean
  // over almost no data. A variant that barely gets anyone home can post a
  // flattering ratio precisely because the few ants that made it went straight.
  // So enough trips to mean something is a gate, not a tie-break.
  const credible = (rows: readonly Scored[]) =>
    rows.filter((row) => row.trips >= PASS.trips && Number.isFinite(row.settled));
  const pool =
    passing.length > 0
      ? passing
      : credible(scored).length > 0
        ? credible(scored)
        : scored;
  const ranked = [...pool].sort((a, b) => a.settled - b.settled);

  // Two distinct variants, not the same one at two rates.
  const best: Scored[] = [];
  for (const row of ranked) {
    if (best.some((chosen) => label(chosen.variant) === label(row.variant))) continue;
    best.push(row);
    if (best.length === 2) break;
  }

  say(
    `**Passing variants: ${passing.length} of ${scored.length}.** ` +
      (passing.length === 0
        ? `Ranking instead among the ${credible(scored).length} variants with at least ` +
          `${PASS.trips} completed trips, so a flattering ratio over a handful of trips ` +
          `cannot win. Best two:`
        : `Best two by settled reading:`),
  );
  say();
  for (const row of best) {
    say(
      `- \`${label(row.variant)}\` at ρ = ${row.rho} — first food ${row.firstFood}, ` +
        `${row.trips} trips, ${fmt(row.settled)}×`,
    );
  }
  say();

  for (const row of best) {
    say(`### ${label(row.variant)} at ρ = ${row.rho}, gap shut`);
    say();
    say("```");
    say(map(row.sample.colony, fixtureFor(row.variant)));
    say("```");
    say();
  }

  const control = scored.find(
    (row) => !Number.isFinite(row.variant.T) && row.variant.W === 1 && row.variant.w === 1 && row.variant.D === 1,
  );
  if (control) {
    say(`### The control — \`${label(control.variant)}\` at ρ = ${control.rho} (today's engine)`);
    say();
    say("```");
    say(map(control.sample.colony, fixtureFor(control.variant)));
    say("```");
    say();
  }

  stageB(say, best);
  honesty(say, best);

  say(`---`);
  say();
  say(
    `No threshold, default or \`RHO\` value was changed to produce any number above. ` +
      `The pass line is provisional and the grid was not extended to chase it.`,
  );

  mkdirSync("docs/spikes", { recursive: true });
  writeFileSync("docs/spikes/2026-08-17-field-graded.md", `${out.join("\n")}\n`);
  console.log("");
  console.log("written -> docs/spikes/2026-08-17-field-graded.md");
}

main();
