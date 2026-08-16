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

header();
for (const rho of [0, 0.05, 1]) trial(rho);
console.log("");
console.log("Nothing above is a derived threshold. What the numbers were, only.");
