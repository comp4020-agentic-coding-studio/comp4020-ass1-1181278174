// The headless engine sensor: `pnpm spike`.
//
// A named sensor, not a scratch file. It prints the reading, an ASCII map and the
// fixture parameters — and no conclusion about lock-in is recorded anywhere without
// the parameters it prints, because lock-in sharpness depends on the choice
// nonlinearity and the pheromone floor, not on the deposit rule alone.
//
// There is no engine yet, so it says so and prints the fixture instead. That is the
// point: the sensor exists before the thing it measures.

import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import type { Fixture, NodeId } from "../src/fixtures/double-bridge.ts";
import { induce, pathLength } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";

const ENGINE_MODULE = "../src/sim/engine.ts";
const STEPS = Number(process.env.SPIKE_STEPS ?? 2000);

const fixture: Fixture = DOUBLE_BRIDGE;
const closed = induce(fixture, { openShortcut: false });
const open = induce(fixture, { openShortcut: true });

const wallBetween = (a: NodeId, b: NodeId): boolean =>
  !open.openEdges.some(
    (edge) =>
      ((edge.a === a && edge.b === b) || (edge.a === b && edge.b === a)) &&
      edge.closed !== true,
  ) ||
  fixture.edges.some(
    (edge) =>
      ((edge.a === a && edge.b === b) || (edge.a === b && edge.b === a)) &&
      edge.closed === true,
  );

/** `--` open, `==` a wall. The map has to show which segment is shut. */
function drawBranch(label: string, path: readonly NodeId[]): string {
  const parts: string[] = [String(path[0])];
  for (let i = 0; i + 1 < path.length; i += 1) {
    const a = path[i] as NodeId;
    const b = path[i + 1] as NodeId;
    parts.push(wallBetween(a, b) ? "==" : "--", String(b));
  }
  return `  ${label.padEnd(6)}${parts.join("")}`;
}

function report(): void {
  const bfsClosed = shortestPathLength(closed, fixture.nest, fixture.food);
  const bfsOpen = shortestPathLength(open, fixture.nest, fixture.food);

  console.log(`fixture   ${fixture.name}`);
  console.log(
    `graph     ${fixture.nodes.length} nodes, ${fixture.edges.length} edges ` +
      `(${closed.openEdges.length} open at load)`,
  );
  console.log("");
  console.log(drawBranch("short", fixture.branches.short));
  console.log(drawBranch("long", fixture.branches.long));
  console.log("            == is a wall: the shortcut, shut until the visitor opens it");
  console.log("");
  console.log(
    `branches  long ${pathLength(fixture.branches.long)} moves, ` +
      `short ${pathLength(fixture.branches.short)} moves, ` +
      `ratio ${pathLength(fixture.branches.long) / pathLength(fixture.branches.short)}`,
  );
  console.log(`bfs       ${bfsClosed} moves closed  ->  ${bfsOpen} moves open`);
  console.log("");
  console.log(
    `params    h=${fixture.params.h}  k=${fixture.params.k}  ` +
      `floor=${fixture.params.floor}`,
  );
  console.log(
    "          h is the choice nonlinearity (k+t)^h. At h=1 lock-in is weak BY",
  );
  console.log(
    "          CONSTRUCTION, so a failure to lock in at h=1 is not evidence",
  );
  console.log("          against deposit mode 1b.");
  console.log("");
}

async function main(): Promise<void> {
  report();

  try {
    await import(ENGINE_MODULE);
  } catch {
    console.log(`reading   no engine — ${ENGINE_MODULE} does not exist yet.`);
    console.log(
      `          Nothing has been measured, so nothing may be concluded.`,
    );
    return;
  }

  console.log(
    `reading   an engine exists but this sensor has not been wired to it yet.`,
  );
  console.log(
    `          Wire it before reading anything into ${STEPS} steps of output.`,
  );
}

await main();
