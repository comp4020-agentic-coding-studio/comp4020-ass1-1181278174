// Stage D: the wander hypothesis, on field v2. SPIKE ONLY (Decision 19).
//
// Advisor-side experiment in a scratch clone; nothing here is adopted.
//
// The hypothesis, stated before the run (Decision 19, director's words):
//   "exploration needs a term that does not go through τ ... at ε ≈ 0.03 the road
//    survives at ρ ≤ 0.01 (a little fuzzier than 1.07×); ρ = 0 stays locked inside
//    the window because the road's head start never decays; ρ in roughly
//    0.005–0.015 switches within the window, faster the larger ρ; ε = 0.10 costs
//    the road."

import { mkdirSync, writeFileSync } from "node:fs";
import { FIELD_V3_SPEC } from "../src/fixtures/field-v3.ts";
import { buildField } from "../src/fixtures/grid.ts";
import type { Fixture } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { reading } from "../src/sim/reading.ts";

const ANTS = 400;
const SETTLE = 12_000;
const AFTER = 12_000;
const SAMPLE_EVERY = 500;
const WINDOW = 300;
const MIN_TRIPS = 65;
const SEEDS = [1, 2, 3];

const T_BASE = 80;
const WHISKER = 3;
const STRAIGHT = 4;
const D = 20;
const CROSS_AT = 1.6;

const ARM1 = { eps: [0], rhos: [0.012, 0.014, 0.016, 0.018] };
const ARM2 = {
  eps: [0.01, 0.03, 0.1],
  rhos: [0, 0.002, 0.005, 0.01, 0.015, 0.02, 0.05, 0.1],
};

const BASE = buildField(FIELD_V3_SPEC);
const K = FIELD_V3_SPEC.params.k;
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
const VIA_GAP = (BFS_LONG + BFS_SHORT) / 2;

// ε IS NOT IN THE ENGINE. It was spiked and rejected (see the record this script
// writes), so `wander` is not a FixtureParams field on `main` and this cast is
// what lets the script stay in the repo as citable evidence without the engine
// carrying a knob nobody adopted. Apply docs/spikes/2026-08-17-wander-epsilon.patch
// to run it; `assertWanderIsWired()` below refuses to produce numbers otherwise.
function fixtureFor(eps: number, T = T_BASE): Fixture {
  return buildField({
    ...FIELD_V3_SPEC,
    params: {
      ...FIELD_V3_SPEC.params,
      gradedOver: T,
      whisker: WHISKER,
      straightBias: STRAIGHT,
      depositPerStep: D,
      wander: eps,
    } as typeof FIELD_V3_SPEC.params,
  });
}

/**
 * Without the patch the engine ignores `wander` entirely, every arm becomes the
 * ε = 0 arm, and the script would print a full set of numbers that all quietly
 * say the same thing. That is worse than a crash: it is a table that looks like
 * evidence. So prove the knob is wired before measuring anything.
 */
function assertWanderIsWired(): void {
  const digestAt = (eps: number): string => {
    const colony = engine.createColony(fixtureFor(eps), {
      rho: 0.01,
      seed: 1,
      ants: 40,
    });
    for (let s = 0; s < 400; s += 1) engine.step(colony);
    return engine.digest(colony);
  };
  if (digestAt(0) === digestAt(0.5)) {
    throw new Error(
      "ε has no effect: this engine has no wander knob. Apply\n" +
        "  git apply docs/spikes/2026-08-17-wander-epsilon.patch\n" +
        "run this spike, then revert it — ε was spiked and NOT adopted.",
    );
  }
}
const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? Number.NaN;
};
const fmt = (value: number, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";
const steps = (value: number) => (Number.isFinite(value) ? String(value) : "never");

function tauOnRoad(colony: engine.Colony, fixture: Fixture): number {
  const road = new Set(fixture.branches.long);
  let sum = 0;
  let count = 0;
  fixture.edges.forEach((edge, e) => {
    if (!road.has(edge.a) || !road.has(edge.b)) return;
    sum += (colony.home[e] as number) + (colony.foodTrail[e] as number);
    count += 1;
  });
  return count === 0 ? Number.NaN : sum / count / K;
}

interface Cell {
  eps: number;
  rho: number;
  tripsBefore: number;
  before: number;
  after: number;
  crossed: number;
  firstVia: number;
  half: number;
  viaGap: number;
  tau: number;
  spread: number;
  colony: engine.Colony;
  fixture: Fixture;
}

function run(fixture: Fixture, eps: number, rho: number, seed: number): Cell {
  const colony = engine.createColony(fixture, {
    rho,
    seed,
    ants: ANTS,
    tripHistory: Infinity,
  });
  for (let step = 1; step <= SETTLE; step += 1) engine.step(colony);
  const tripsBefore = colony.tripsCompleted;
  const beforeValue = reading(engine.completedTripLengths(colony), BFS_LONG, {
    window: WINDOW,
    minTrips: MIN_TRIPS,
  });
  const tau = tauOnRoad(colony, fixture);

  engine.toggleShortcut(colony);
  const series: number[] = [];
  let crossed = Infinity;
  let firstVia = Infinity;
  let half = Infinity;
  let seen = colony.trips.length;
  for (let step = 1; step <= AFTER; step += 1) {
    engine.step(colony);
    // trips is append-only when tripHistory = Infinity
    if (firstVia === Infinity) {
      for (let i = seen; i < colony.trips.length; i += 1) {
        if ((colony.trips[i] as number) < VIA_GAP) {
          firstVia = step;
          break;
        }
      }
    }
    seen = colony.trips.length;
    if (step % SAMPLE_EVERY !== 0) continue;
    const value = reading(engine.completedTripLengths(colony), BFS_SHORT, {
      window: WINDOW,
      minTrips: MIN_TRIPS,
    });
    const recent = engine.completedTripLengths(colony).slice(-WINDOW);
    const share =
      recent.length === 0
        ? 0
        : recent.filter((l) => l < VIA_GAP).length / recent.length;
    if (half === Infinity && recent.length >= MIN_TRIPS && share >= 0.5) half = step;
    if (value.status !== "ok") continue;
    const ratio = value.ratio as number;
    series.push(ratio);
    if (crossed === Infinity && ratio < CROSS_AT) crossed = step;
  }
  const recent = engine.completedTripLengths(colony).slice(-WINDOW);
  const tail = series.slice(-10);
  return {
    eps,
    rho,
    tripsBefore,
    before: beforeValue.status === "ok" ? (beforeValue.ratio as number) : Number.NaN,
    after: series.at(-1) ?? Number.NaN,
    crossed,
    firstVia,
    half,
    viaGap:
      recent.length === 0
        ? Number.NaN
        : recent.filter((l) => l < VIA_GAP).length / recent.length,
    tau,
    spread: tail.length < 2 ? Number.NaN : Math.max(...tail) - Math.min(...tail),
    colony,
    fixture,
  };
}

function map(colony: engine.Colony): string {
  const heat = new Map<string, number>();
  colony.fixture.edges.forEach((edge, e) => {
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
        row +=
          tau <= 0
            ? "·"
            : String(
                Math.max(1, Math.round((Math.log1p(tau) / Math.log1p(peak)) * 9)),
              );
      }
    }
    rows.push(row);
  }
  return rows.join("\n");
}

function main(): void {
  assertWanderIsWired();
  const out: string[] = [];
  const say = (line = "") => {
    console.log(line);
    out.push(line);
  };
  const t0 = Date.now();

  say(`# Stage D — the wander hypothesis (ε), on field v2 — ADVISOR SCRATCH RUN`);
  say();
  say(
    `Decision 19. Spike only. D = ${D}, T = ${T_BASE}, W = ${WHISKER}, w = ${STRAIGHT}, ${ANTS} ants, ${SEEDS.length} seeds; ` +
      `settle ${SETTLE} shut, open, ${AFTER} on. BFS ${BFS_LONG} / ${BFS_SHORT}. "via" = trips < ${VIA_GAP} moves.`,
  );
  say();
  const header = `| ε | ρ | trips before | τ_road | before | at end | first < ${CROSS_AT}× | first trip via door | 50% via door | via at end | settles? |`;
  const sep = `|---|---|---|---|---|---|---|---|---|---|---|`;
  const emit = (cell: Cell) =>
    say(
      `| ${cell.eps} | ${cell.rho} | ${cell.tripsBefore} | ${fmt(cell.tau, 1)} k | ${fmt(cell.before)}× | ${fmt(cell.after)}× | ` +
        `${steps(cell.crossed)} | ${steps(cell.firstVia)} | ${steps(cell.half)} | ${fmt(cell.viaGap * 100, 0)}% | ` +
        `${Number.isFinite(cell.spread) ? `${fmt(cell.spread)}× swing` : "—"} |`,
    );
  const aggregate = (runs: Cell[]): Cell => ({
    eps: runs[0]!.eps,
    rho: runs[0]!.rho,
    tripsBefore: median(runs.map((r) => r.tripsBefore)),
    before: median(runs.map((r) => r.before)),
    after: median(runs.map((r) => r.after)),
    crossed: median(runs.map((r) => r.crossed)),
    firstVia: median(runs.map((r) => r.firstVia)),
    half: median(runs.map((r) => r.half)),
    viaGap: median(runs.map((r) => r.viaGap)),
    tau: median(runs.map((r) => r.tau)),
    spread: median(runs.map((r) => r.spread)),
    colony: runs[0]!.colony,
    fixture: runs[0]!.fixture,
  });

  say(`## Arm 1 — the knife edge, ε = 0`);
  say();
  say(header);
  say(sep);
  for (const eps of ARM1.eps) {
    const fixture = fixtureFor(eps);
    for (const rho of ARM1.rhos) {
      const cell = aggregate(SEEDS.map((seed) => run(fixture, eps, rho, seed)));
      emit(cell);
    }
  }
  say();
  say(`## Arm 2 — ε × ρ`);
  say();
  say(header);
  say(sep);
  const keep: Cell[] = [];
  for (const eps of ARM2.eps) {
    const fixture = fixtureFor(eps);
    for (const rho of ARM2.rhos) {
      const cell = aggregate(SEEDS.map((seed) => run(fixture, eps, rho, seed)));
      keep.push(cell);
      emit(cell);
    }
  }
  say();
  say(`## Does any ε give the band?`);
  say();
  say(
    `Found = pre-opening ≤ 1.8×, ρ = 0 not crossing within the window, ≥ 2 ρ values crossing WITH a road (before ≤ 1.8×), top ρ unsettled or roadless.`,
  );
  say();
  say(`| ε | road (≤1.8× before) at ρ | ρ=0 locked? | switches with a road at ρ | top ρ (0.1) | band |`);
  say(`|---|---|---|---|---|---|`);
  for (const eps of ARM2.eps) {
    const mine = keep.filter((c) => c.eps === eps);
    const forms = mine.filter((c) => c.before <= 1.8);
    const zero = mine.find((c) => c.rho === 0);
    const locked = zero !== undefined && !Number.isFinite(zero.crossed);
    const switching = mine.filter((c) => Number.isFinite(c.crossed) && c.before <= 1.8);
    const top = mine.find((c) => c.rho === 0.1);
    const topDesc = top
      ? `before ${fmt(top.before)}×, end ${fmt(top.after)}×, swing ${fmt(top.spread)}`
      : "—";
    const band = forms.length > 0 && locked && switching.length >= 2;
    say(
      `| ${eps} | ${forms.length ? forms.map((c) => c.rho).join(", ") : "none"} | ${locked ? "yes" : "NO"} | ` +
        `${switching.length ? switching.map((c) => c.rho).join(", ") : "none"} | ${topDesc} | ${band ? "**FOUND**" : "—"} |`,
    );
  }
  say();
  for (const [eps, rho] of [
    [0.03, 0.01],
    [0.03, 0.005],
    [0.01, 0.01],
  ] as const) {
    const cell = keep.find((c) => c.eps === eps && c.rho === rho);
    if (!cell) continue;
    say(`## Map — ε = ${eps}, ρ = ${rho}, seed 1, at the END (door open)`);
    say();
    say("```");
    say(map(cell.colony));
    say("```");
    say();
  }
  say(`Run time ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
  mkdirSync("docs/spikes", { recursive: true });
  writeFileSync("docs/spikes/2026-08-17-field-v2-stage-d-advisor.md", `${out.join("\n")}\n`);
  console.log("written -> docs/spikes/2026-08-17-field-v2-stage-d-advisor.md");
}
main();
