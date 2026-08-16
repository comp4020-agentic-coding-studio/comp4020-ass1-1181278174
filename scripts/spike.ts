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

function header(): void {
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
    `run       SETTLE=${SETTLE} then ${AFTER} after opening; window=${WINDOW} trips, minTrips=${MIN_TRIPS}`,
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
// --sweep: measurement only. No threshold, no parameter change, no conclusion.
// ---------------------------------------------------------------------------

const SWEEP_RHOS = [0, 0.001, 0.003, 0.01, 0.03, 0.05, 0.1, 0.2, 0.3, 0.5];
const SWEEP_SEEDS = [1, 2, 3, 4, 5];
const SWEEP_SAMPLE = 250;

/**
 * A REPORTING MARK, not a threshold. It exists so "when did it come down" has an
 * answer in this table. Nothing derives from it and no test may import it —
 * SWITCHED is still a symbol and is derived by two-sided separation, not by
 * eyeballing this column.
 */
const REPORT_MARK = 1.5;

const LONG_EDGES = fixture.branches.long
  .slice(0, -1)
  .map((from, i) => [from, fixture.branches.long[i + 1] as NodeId] as const);

interface Sample {
  readonly step: number;
  readonly ratio: number | null;
  readonly share: number | null;
}

interface Run {
  readonly rho: number;
  readonly seed: number;
  /** Mean (home + food) per long edge at the end of SETTLE. */
  readonly tauLong: number;
  /** P(step to S1) at NEST, from (k + τ + floor)^h over the open edges. */
  readonly explore: number;
  readonly samples: readonly Sample[];
  readonly firstBelowMark: number | null;
  readonly trips: number;
}

function shareOnShort(colony: engine.Colony): number | null {
  const nodes = engine.antNodes(colony);
  const onShort = nodes.filter((node) => SHORT.has(node)).length;
  const onLong = nodes.filter((node) => LONG.has(node)).length;
  return onShort + onLong === 0 ? null : onShort / (onShort + onLong);
}

function measureOne(rho: number, seed: number): Run {
  const colony = engine.createColony(fixture, { rho, seed, ants: 64 });
  for (let i = 0; i < SETTLE; i += 1) engine.step(colony);

  const tauLong =
    LONG_EDGES.reduce((sum, [a, b]) => {
      const { home, food } = engine.edgePheromone(colony, a, b);
      return sum + home + food;
    }, 0) / LONG_EDGES.length;
  const explore = engine.choiceDistribution(colony, fixture.nest).get("S1") ?? 0;

  engine.toggleShortcut(colony);

  const samples: Sample[] = [];
  let firstBelowMark: number | null = null;
  for (let done = 0; done < AFTER; done += SWEEP_SAMPLE) {
    for (let i = 0; i < SWEEP_SAMPLE; i += 1) engine.step(colony);
    const step = done + SWEEP_SAMPLE;
    const { ratio } = reading(engine.completedTripLengths(colony), BFS_OPEN, {
      window: WINDOW,
      minTrips: MIN_TRIPS,
    });
    samples.push({ step, ratio, share: shareOnShort(colony) });
    if (firstBelowMark === null && ratio !== null && ratio < REPORT_MARK) {
      firstBelowMark = step;
    }
  }

  return {
    rho,
    seed,
    tauLong,
    explore,
    samples,
    firstBelowMark,
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

function sweep(): void {
  header();
  console.log(
    `sweep     ${SWEEP_RHOS.length} rho x ${SWEEP_SEEDS.length} seeds, samples every ${SWEEP_SAMPLE} steps`,
  );
  console.log(
    `          ${REPORT_MARK}x below is a REPORTING MARK, not a threshold. Nothing derives from it.`,
  );

  const runs = SWEEP_RHOS.flatMap((rho) =>
    SWEEP_SEEDS.map((seed) => measureOne(rho, seed)),
  );

  console.log("");
  console.log("per rho, median over seeds:");
  console.log(
    "    rho      tau/long-edge   P(explore)   final reading   first <1.5x   final short-branch",
  );
  const summary = SWEEP_RHOS.map((rho) => {
    const mine = runs.filter((run) => run.rho === rho);
    const finals = mine.map(
      (run) => (run.samples.at(-1)?.ratio ?? Number.NaN) as number,
    );
    const firsts = mine.map((run) => run.firstBelowMark ?? Infinity);
    const shares = mine.map((run) => (run.samples.at(-1)?.share ?? 0) * 100);
    const first = middle(firsts);
    const row = {
      rho,
      tau: middle(mine.map((run) => run.tauLong)),
      explore: middle(mine.map((run) => run.explore)),
      final: middle(finals),
      first: Number.isFinite(first) ? `${first}` : "never",
      share: middle(shares),
    };
    console.log(
      `    ${String(rho).padEnd(9)}${row.tau.toFixed(1).padStart(13)}` +
        `${(row.explore * 100).toFixed(3).padStart(12)}%` +
        `${row.final.toFixed(3).padStart(16)}x${row.first.padStart(14)}` +
        `${row.share.toFixed(0).padStart(19)}%`,
    );
    return row;
  });

  const file = writeRaw(runs, summary);
  console.log("");
  console.log(`raw table -> ${file}`);
  console.log("Measurement only. No threshold derived, no parameter changed.");
}

function writeRaw(
  runs: readonly Run[],
  summary: readonly { rho: number; first: string }[],
): string {
  // Local date, not toISOString(): UTC is a day behind in Canberra for most of the
  // working evening, and an evidence file dated yesterday is a small lie.
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const dir = "docs/spikes";
  mkdirSync(dir, { recursive: true });
  const path = `${dir}/${stamp}-rho-sweep.md`;

  const lines = [
    `# ρ sweep — ${stamp}`,
    "",
    "Measurement only. **No threshold was derived and no parameter was changed.**",
    `The 1.5× column is a reporting mark so "when did it come down" has an answer;`,
    "`SWITCHED` is still a symbol and is derived by two-sided separation against the",
    "negative controls, never by reading this table.",
    "",
    `- fixture \`${fixture.name}\`, h=${fixture.params.h} k=${fixture.params.k} floor=${fixture.params.floor}, 64 ants`,
    `- BFS ${BFS_CLOSED} closed → ${BFS_OPEN} open`,
    `- SETTLE ${SETTLE}, then ${AFTER} steps after opening, sampled every ${SWEEP_SAMPLE}`,
    `- reading window ${WINDOW} trips, minTrips ${MIN_TRIPS} (placeholders)`,
    "",
    "## Per ρ, median over seeds",
    "",
    "| ρ | first sample < 1.5× |",
    "|---|---|",
    ...summary.map((row) => `| ${row.rho} | ${row.first} |`),
    "",
    "## Every run",
    "",
  ];

  for (const run of runs) {
    lines.push(
      `### ρ = ${run.rho}, seed ${run.seed}`,
      "",
      `τ per long edge at end of SETTLE: **${run.tauLong.toFixed(2)}** · ` +
        `P(explore to S1) at NEST: **${(run.explore * 100).toFixed(4)}%** · ` +
        `completed trips: ${run.trips} · ` +
        `first sample < 1.5×: ${run.firstBelowMark ?? "never"}`,
      "",
      "| step after opening | reading | ants on short branch |",
      "|---|---|---|",
      ...run.samples.map(
        (sample) =>
          `| ${sample.step} | ${sample.ratio === null ? "no reading yet" : `${sample.ratio.toFixed(3)}×`} | ${sample.share === null ? "n/a" : `${(sample.share * 100).toFixed(0)}%`} |`,
      ),
      "",
    );
  }

  writeFileSync(path, `${lines.join("\n")}\n`);
  return path;
}

if (process.argv.includes("--sweep")) {
  sweep();
} else {
  header();
  for (const rho of [0, 0.05, 1]) trial(rho);
  console.log("");
  console.log("Nothing above is a derived threshold. What the numbers were, only.");
}
