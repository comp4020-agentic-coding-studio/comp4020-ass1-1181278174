// The headless engine sensor: `pnpm spike`.
//
// EXPLORATORY ONLY. It derives no thresholds and records no conclusions beyond what
// the numbers were. Deriving a threshold means two-sided separation against the
// negative controls with a stated margin on each side (spec/oracles.md §3), and none
// of that happens here.
//
// Every run prints h, k and floor, because lock-in sharpness depends on them: at
// h = 1 lock-in is weak BY CONSTRUCTION, so a run that fails to lock in without
// stating h supports no conclusion about deposit mode 1b at all.

import { mkdirSync, writeFileSync } from "node:fs";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import type { Fixture, NodeId } from "../src/fixtures/double-bridge.ts";
import { induce, pathLength } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { reading } from "../src/sim/reading.ts";

const fixture: Fixture = DOUBLE_BRIDGE;

// Placeholders, not derived. Named so nobody reads them as settled.
const SETTLE = 2000;
const AFTER = 3000;
const SAMPLE_EVERY = 500;
const WINDOW = 300;
const MIN_TRIPS = 30;

const closed = induce(fixture, { openShortcut: false });
const open = induce(fixture, { openShortcut: true });
const BFS_CLOSED = shortestPathLength(closed, fixture.nest, fixture.food) as number;
const BFS_OPEN = shortestPathLength(open, fixture.nest, fixture.food) as number;

const interior = (branch: readonly NodeId[]) =>
  new Set(branch.slice(1, -1));
const SHORT = interior(fixture.branches.short);
const LONG = interior(fixture.branches.long);

/** Share of ants standing on the short branch's interior, of those on either. */
function shortShare(colony: engine.Colony): string {
  const nodes = engine.antNodes(colony);
  const onShort = nodes.filter((node) => SHORT.has(node)).length;
  const onLong = nodes.filter((node) => LONG.has(node)).length;
  const both = onShort + onLong;
  return both === 0 ? "  n/a" : `${((onShort / both) * 100).toFixed(0).padStart(4)}%`;
}

/** Edge pheromone as digits 0-9, scaled to the busiest edge in this colony. */
function map(colony: engine.Colony): string[] {
  let peak = 0;
  for (const edge of fixture.edges) {
    const { home, food } = engine.edgePheromone(colony, edge.a, edge.b);
    peak = Math.max(peak, home + food);
  }
  const draw = (label: string, path: readonly NodeId[]) => {
    const parts: string[] = [String(path[0])];
    for (let i = 0; i + 1 < path.length; i += 1) {
      const a = path[i] as NodeId;
      const b = path[i + 1] as NodeId;
      const shut = fixture.edges.some(
        (edge) =>
          ((edge.a === a && edge.b === b) || (edge.a === b && edge.b === a)) &&
          edge.closed === true &&
          !(edge.shortcut && colony.shortcutOpen),
      );
      const { home, food } = engine.edgePheromone(colony, a, b);
      const digit = peak > 0 ? Math.min(9, Math.floor((9 * (home + food)) / peak)) : 0;
      parts.push(shut ? "-#-" : `-${digit}-`, String(b));
    }
    return `    ${label.padEnd(6)}${parts.join("")}`;
  };
  return [draw("short", fixture.branches.short), draw("long", fixture.branches.long)];
}

function show(colony: engine.Colony, against: number, label: string): void {
  const result = reading(engine.completedTripLengths(colony), against, {
    window: WINDOW,
    minTrips: MIN_TRIPS,
  });
  const ratio =
    result.ratio === null ? "no reading yet" : `${result.ratio.toFixed(3)}x`;
  console.log(
    `    ${label.padEnd(14)}${ratio.padStart(14)}   short-branch ants ${shortShare(colony)}   trips ${engine.completedTripLengths(colony).length}`,
  );
}

function header(after: number = AFTER): void {
  console.log(`fixture   ${fixture.name}`);
  console.log(
    `graph     ${fixture.nodes.length} nodes, ${fixture.edges.length} edges; ` +
      `long ${pathLength(fixture.branches.long)} moves, short ${pathLength(fixture.branches.short)} moves`,
  );
  console.log(`bfs       ${BFS_CLOSED} closed  ->  ${BFS_OPEN} open`);
  console.log(
    `params    h=${fixture.params.h}  k=${fixture.params.k}  floor=${fixture.params.floor}   (fixture, authoritative in spec/oracles.md)`,
  );
  console.log(
    `run       SETTLE=${SETTLE} then ${after} after opening; window=${WINDOW} trips, minTrips=${MIN_TRIPS}`,
  );
  console.log(`          ALL PLACEHOLDERS, NOT DERIVED — exploratory only.`);
}

function trial(rho: number): void {
  console.log("");
  console.log(`rho = ${rho}`);
  const colony = engine.createColony(fixture, { rho, seed: 1 });

  for (let i = 0; i < SETTLE; i += 1) engine.step(colony);
  show(colony, BFS_CLOSED, `settle ${SETTLE}`);
  for (const line of map(colony)) console.log(line);

  engine.toggleShortcut(colony);
  console.log(`    -- shortcut opened, now measured against BFS ${BFS_OPEN} --`);

  for (let done = 0; done < AFTER; done += SAMPLE_EVERY) {
    for (let i = 0; i < SAMPLE_EVERY; i += 1) engine.step(colony);
    show(colony, BFS_OPEN, `+${done + SAMPLE_EVERY}`);
  }
  for (const line of map(colony)) console.log(line);
  console.log(`    digest ${engine.digest(colony)}`);
}


// ---------------------------------------------------------------------------
// Sweeps. Measurement only: no threshold, no engine change, no params change.
// ---------------------------------------------------------------------------

const COARSE_RHOS = [0, 0.001, 0.003, 0.01, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5];
const COARSE_SEEDS = [1, 2, 3, 4, 5];
const FINE_RHOS = [0.06, 0.08, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2];
const FINE_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const SWEEP_SAMPLE = 250;

/**
 * REPORTING MARKS, not thresholds. They exist so "when did it come down" and "did
 * it stay down" have answers in these tables. Nothing derives from them and no test
 * may import them — SWITCHED and the rest are still symbols, derived by two-sided
 * separation against the negative controls, never by reading a sweep.
 */
const CAME_DOWN = 1.25;
const WENT_BACK_UP = 1.5;

const SHORT_TRIP = pathLength(fixture.branches.short);

const LONG_EDGES = fixture.branches.long
  .slice(0, -1)
  .map((from, i) => [from, fixture.branches.long[i + 1] as NodeId] as const);

interface Sample {
  readonly step: number;
  /** Decision 5 as it stands: windowed median ÷ BFS. */
  readonly median: number | null;
  /** The amendment under consideration: windowed mean ÷ BFS. Not yet in reading.ts. */
  readonly mean: number | null;
  /** Share of the window's trips that took the short branch exactly. */
  readonly shortTrips: number | null;
  /** Share of ants standing on the short branch's interior right now. */
  readonly antShare: number | null;
}

interface Run {
  readonly rho: number;
  readonly seed: number;
  readonly tauLong: number;
  readonly explore: number;
  readonly samples: readonly Sample[];
  readonly trips: number;
}

function shareOnShort(colony: engine.Colony): number | null {
  const nodes = engine.antNodes(colony);
  const onShort = nodes.filter((node) => SHORT.has(node)).length;
  const onLong = nodes.filter((node) => LONG.has(node)).length;
  return onShort + onLong === 0 ? null : onShort / (onShort + onLong);
}

/**
 * Both readings over the SAME window, side by side, so the choice between them is
 * made on evidence. reading.ts is untouched: the mean is computed here only.
 */
function bothReadings(colony: engine.Colony) {
  const trips = engine.completedTripLengths(colony);
  const viaMedian = reading(trips, BFS_OPEN, {
    window: WINDOW,
    minTrips: MIN_TRIPS,
  });
  if (viaMedian.status === "no reading yet") {
    return { median: null, mean: null, shortTrips: null };
  }
  const recent = trips.slice(-WINDOW);
  const sum = recent.reduce((total, length) => total + length, 0);
  const short = recent.filter((length) => length === SHORT_TRIP).length;
  return {
    median: viaMedian.ratio,
    mean: sum / recent.length / BFS_OPEN,
    shortTrips: short / recent.length,
  };
}

function runOne(rho: number, seed: number, after: number): Run {
  const colony = engine.createColony(fixture, { rho, seed, ants: 64 });
  for (let i = 0; i < SETTLE; i += 1) engine.step(colony);

  const tauLong =
    LONG_EDGES.reduce((total, [a, b]) => {
      const { home, food } = engine.edgePheromone(colony, a, b);
      return total + home + food;
    }, 0) / LONG_EDGES.length;
  const explore = engine.choiceDistribution(colony, fixture.nest).get("S1") ?? 0;

  engine.toggleShortcut(colony);

  const samples: Sample[] = [];
  for (let done = 0; done < after; done += SWEEP_SAMPLE) {
    for (let i = 0; i < SWEEP_SAMPLE; i += 1) engine.step(colony);
    samples.push({
      step: done + SWEEP_SAMPLE,
      ...bothReadings(colony),
      antShare: shareOnShort(colony),
    });
  }

  return {
    rho,
    seed,
    tauLong,
    explore,
    samples,
    trips: engine.completedTripLengths(colony).length,
  };
}

const middle = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const half = sorted.length >> 1;
  return sorted.length % 2 === 1
    ? (sorted[half] as number)
    : ((sorted[half - 1] as number) + (sorted[half] as number)) / 2;
};

const fmt = (value: number | null, unit = "×") =>
  value === null ? "—" : `${value.toFixed(3)}${unit}`;

/** First sample whose mean is below CAME_DOWN, or null if it never is. */
const cameDown = (run: Run): number | null =>
  run.samples.find((s) => s.mean !== null && s.mean < CAME_DOWN)?.step ?? null;

/** Samples above WENT_BACK_UP after it first came down. Zero means it stayed. */
function reCrossings(run: Run): number {
  const from = cameDown(run);
  if (from === null) return 0;
  return run.samples.filter(
    (s) => s.step > from && s.mean !== null && s.mean > WENT_BACK_UP,
  ).length;
}

function writeRaw(
  title: string,
  slug: string,
  runs: readonly Run[],
  after: number,
  summary: readonly string[],
): string {
  // Local date, not toISOString(): UTC is a day behind in Canberra all evening, and
  // an evidence file dated yesterday is a small lie.
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  mkdirSync("docs/spikes", { recursive: true });
  const path = `docs/spikes/${stamp}-${slug}.md`;

  const lines = [
    `# ${title} — ${stamp}`,
    "",
    "Measurement only. **No threshold was derived, no engine or parameter changed.**",
    `The ${CAME_DOWN}× and ${WENT_BACK_UP}× columns are reporting marks so "when did`,
    'it come down" and "did it stay down" have answers. `SWITCHED` and the rest are',
    "still symbols, derived by two-sided separation against the negative controls.",
    "",
    "Both readings are over the **same window**. `reading.ts` is untouched — the mean",
    "is computed in the spike only, so Decision 5 can be settled on evidence.",
    "",
    `- fixture \`${fixture.name}\`, h=${fixture.params.h} k=${fixture.params.k} floor=${fixture.params.floor}, 64 ants`,
    `- BFS ${BFS_CLOSED} closed → ${BFS_OPEN} open; short trip = ${SHORT_TRIP} moves`,
    `- SETTLE ${SETTLE}, then ${after} steps after opening, sampled every ${SWEEP_SAMPLE}`,
    `- reading window ${WINDOW} trips, minTrips ${MIN_TRIPS} (placeholders)`,
    "",
    "## Summary",
    "",
    ...summary,
    "",
    "## Every run",
    "",
  ];

  for (const run of runs) {
    lines.push(
      `### ρ = ${run.rho}, seed ${run.seed}`,
      "",
      `τ per long edge at end of SETTLE **${run.tauLong.toFixed(2)}** · ` +
        `P(explore to S1) at NEST **${(run.explore * 100).toFixed(4)}%** · ` +
        `completed trips ${run.trips} · ` +
        `first mean < ${CAME_DOWN}× ${cameDown(run) ?? "never"} · ` +
        `re-crossings > ${WENT_BACK_UP}× ${reCrossings(run)}`,
      "",
      "| step | median | mean | short trips | ants on short |",
      "|---|---|---|---|---|",
      ...run.samples.map(
        (s) =>
          `| ${s.step} | ${fmt(s.median)} | ${fmt(s.mean)} | ` +
          `${s.shortTrips === null ? "—" : `${(s.shortTrips * 100).toFixed(0)}%`} | ` +
          `${s.antShare === null ? "—" : `${(s.antShare * 100).toFixed(0)}%`} |`,
      ),
      "",
    );
  }

  writeFileSync(path, `${lines.join("\n")}\n`);
  return path;
}

function coarse(): void {
  header();
  console.log(
    `sweep     ${COARSE_RHOS.length} rho x ${COARSE_SEEDS.length} seeds, sampled every ${SWEEP_SAMPLE}`,
  );
  console.log(
    `          both readings over the same window; reading.ts untouched`,
  );

  const runs = COARSE_RHOS.flatMap((rho) =>
    COARSE_SEEDS.map((seed) => runOne(rho, seed, AFTER)),
  );

  const head =
    "    rho      tau/long   P(explore)   final median   final mean   short trips   ants short";
  console.log("");
  console.log("per rho, median over seeds:");
  console.log(head);

  const rows = COARSE_RHOS.map((rho) => {
    const mine = runs.filter((run) => run.rho === rho);
    const last = mine.map((run) => run.samples.at(-1) as Sample);
    const row = {
      rho,
      tau: middle(mine.map((run) => run.tauLong)),
      explore: middle(mine.map((run) => run.explore)),
      median: middle(last.map((s) => s.median ?? Number.NaN)),
      mean: middle(last.map((s) => s.mean ?? Number.NaN)),
      shortTrips: middle(last.map((s) => (s.shortTrips ?? 0) * 100)),
      antShare: middle(last.map((s) => (s.antShare ?? 0) * 100)),
    };
    console.log(
      `    ${String(rho).padEnd(9)}${row.tau.toFixed(1).padStart(10)}` +
        `${(row.explore * 100).toFixed(3).padStart(12)}%` +
        `${row.median.toFixed(3).padStart(15)}x${row.mean.toFixed(3).padStart(13)}x` +
        `${row.shortTrips.toFixed(0).padStart(13)}%${row.antShare.toFixed(0).padStart(12)}%`,
    );
    return row;
  });

  const table = [
    "| ρ | τ/long | P(explore) | final median | final mean | short trips | ants short |",
    "|---|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.rho} | ${r.tau.toFixed(1)} | ${(r.explore * 100).toFixed(3)}% | ` +
        `${r.median.toFixed(3)}× | ${r.mean.toFixed(3)}× | ` +
        `${r.shortTrips.toFixed(0)}% | ${r.antShare.toFixed(0)}% |`,
    ),
  ];
  console.log("");
  console.log(`raw table -> ${writeRaw("ρ sweep, both readings", "rho-sweep", runs, AFTER, table)}`);
  console.log("Measurement only. No threshold derived, no parameter changed.");
}

function fine(): void {
  const after = 6000;
  header(after);
  console.log(
    `fine      ${FINE_RHOS.length} rho x ${FINE_SEEDS.length} seeds, ${after} steps after opening, sampled every ${SWEEP_SAMPLE}`,
  );
  console.log(
    `          "came down" = mean < ${CAME_DOWN}x; "went back up" = a later sample > ${WENT_BACK_UP}x`,
  );

  const runs = FINE_RHOS.flatMap((rho) =>
    FINE_SEEDS.map((seed) => runOne(rho, seed, after)),
  );

  console.log("");
  console.log("per rho, median over seeds unless stated:");
  console.log(
    "    rho     first mean<1.25x   seeds never   final mean   ants short   re-cross>1.5x",
  );

  const rows = FINE_RHOS.map((rho) => {
    const mine = runs.filter((run) => run.rho === rho);
    const downs = mine.map((run) => cameDown(run) ?? Infinity);
    const never = downs.filter((step) => !Number.isFinite(step)).length;
    const first = middle(downs);
    const last = mine.map((run) => run.samples.at(-1) as Sample);
    const row = {
      rho,
      first: Number.isFinite(first) ? `${first}` : "never",
      never,
      mean: middle(last.map((s) => s.mean ?? Number.NaN)),
      antShare: middle(last.map((s) => (s.antShare ?? 0) * 100)),
      recross: middle(mine.map((run) => reCrossings(run))),
    };
    console.log(
      `    ${String(rho).padEnd(8)}${row.first.padStart(17)}` +
        `${String(row.never).padStart(14)}${row.mean.toFixed(3).padStart(13)}x` +
        `${row.antShare.toFixed(0).padStart(13)}%${row.recross.toFixed(1).padStart(16)}`,
    );
    return row;
  });

  const table = [
    `| ρ | first mean < ${CAME_DOWN}× | seeds never | final mean | ants short | re-crossings > ${WENT_BACK_UP}× |`,
    "|---|---|---|---|---|---|",
    ...rows.map(
      (r) =>
        `| ${r.rho} | ${r.first} | ${r.never}/${FINE_SEEDS.length} | ` +
        `${r.mean.toFixed(3)}× | ${r.antShare.toFixed(0)}% | ${r.recross.toFixed(1)} |`,
    ),
  ];
  console.log("");
  console.log(
    `raw table -> ${writeRaw("ρ fine sweep", "rho-fine", runs, after, table)}`,
  );
  console.log("Measurement only. No threshold derived, no parameter changed.");
}

if (process.argv.includes("--fine")) {
  fine();
} else if (process.argv.includes("--sweep")) {
  coarse();
} else {
  header();
  for (const rho of [0, 0.05, 1]) trial(rho);
  console.log("");
  console.log("Nothing above is a derived threshold. What the numbers were, only.");
}
