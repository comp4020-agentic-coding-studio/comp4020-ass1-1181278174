// Generates src/fixtures/field.ts. `pnpm build:field`.
//
// The field is data somebody designed, so it is committed and a diff test guards
// it (spec/field.test.ts re-runs this and compares). Never hand-edit the output.
//
// What is designed here is the geometry — where the wall runs, where its gap is,
// where the obstacle blocks stand. Everything else (nodes, edges, the two branch
// paths) is computed from it, so the picture and the numbers cannot disagree.
//
// The target the geometry is tuned to is the double bridge's: the long way round
// the wall is about TWICE the way through the gap. That ratio is what makes the
// colony's refusal to switch legible — at 1.2× nobody would care.

import { writeFileSync } from "node:fs";
import type { NodeId } from "../src/fixtures/double-bridge.ts";
import { buildField, id } from "../src/fixtures/grid.ts";
import type { Cell, FieldSpec } from "../src/fixtures/grid.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";

const WIDTH = 60;
const HEIGHT = 40;

// Field v2 (Decision 18). v1 put the gap 19 cells off the road, so discovering
// it took a 19-cell excursion and almost no ant ever made one — the disguise was
// wrong. On the double bridge the shortcut is a fork ON the road that every ant
// passes. So: the wall runs from the nest's eye-line all the way to the bottom
// edge, the gap is a three-cell doorway directly between nest and food, and the
// only way round is the passage along the top. No perimeter corridor.

const NEST: Cell = [18, 20];
const FOOD: Cell = [50, 20];

/** Touches the bottom edge on purpose: the top passage is the ONLY long way. */
const WALL_X = 22;
const WALL_TOP = 6;
const WALL_BOTTOM = HEIGHT - 1;

/** The fork, at the ants' feet: three cells of wall, straight ahead of the nest. */
const GAPS: readonly Cell[] = [
  [WALL_X, 19],
  [WALL_X, 20],
  [WALL_X, 21],
];

/**
 * Obstacle blocks, all in the right half and the top corridor. Two of them pinch
 * the top passage from opposite sides so the long road has to weave between
 * them; the rest give the open ground some texture. The straight run from the
 * gap to the food along y = 20 is kept clear — that is the short way, and it
 * should look like one.
 */
const BLOCKS: readonly (readonly [number, number, number, number])[] = [
  [27, 0, 32, 1], // hangs from the top edge
  [37, 4, 42, 5], // and from the wall's shoulder, offset — the weave
  [30, 9, 36, 16], // above the straight run
  [30, 24, 36, 31], // below it
  [44, 26, 49, 33], // lower right, texture
];

/** Decision 17 (4): a 3x3 arrival block. Arrival is entering any of its cells. */
function zoneAround([cx, cy]: Cell): string[] {
  const cells: string[] = [];
  for (let y = cy - 1; y <= cy + 1; y += 1) {
    for (let x = cx - 1; x <= cx + 1; x += 1) cells.push(id(x, y));
  }
  return cells;
}

function blockedCells(): string[] {
  const cells = new Set<string>();
  for (let y = WALL_TOP; y <= WALL_BOTTOM; y += 1) cells.add(id(WALL_X, y));
  for (const [x0, y0, x1, y1] of BLOCKS) {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) cells.add(id(x, y));
    }
  }
  // A zone is never wall, whatever a block overlaps.
  for (const cell of [...zoneAround(NEST), ...zoneAround(FOOD)]) cells.delete(cell);
  return [...cells].sort();
}

/** BFS again, but returning the path — the fixture commits the route, not just its length. */
function path(
  graph: ReturnType<typeof induce>,
  from: readonly NodeId[],
  to: readonly NodeId[],
): NodeId[] | null {
  const target = new Set(to);
  const previous = new Map<NodeId, NodeId>();
  const queue: NodeId[] = [];
  for (const start of from) {
    if (previous.has(start)) continue;
    previous.set(start, start);
    queue.push(start);
  }
  for (let head = 0; head < queue.length; head += 1) {
    const node = queue[head] as NodeId;
    if (target.has(node)) {
      // Walk the parent chain back to whichever zone cell seeded this search.
      const out: NodeId[] = [node];
      for (let at = node; previous.get(at) !== at; ) {
        at = previous.get(at) as NodeId;
        out.push(at);
      }
      return out.reverse();
    }
    for (const next of graph.adjacency.get(node) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, node);
      queue.push(next);
    }
  }
  return null;
}

export function buildSpec(): FieldSpec {
  const draft: FieldSpec = {
    name: "field",
    width: WIDTH,
    height: HEIGHT,
    nest: NEST,
    food: FOOD,
    gaps: GAPS,
    blocked: blockedCells(),
    nestZone: zoneAround(NEST),
    foodZone: zoneAround(FOOD),
    branches: { short: [], long: [] },
    params: { h: 2, k: 20, floor: 0 },
  };

  const fixture = buildField(draft);
  const closed = induce(fixture, { openShortcut: false });
  const open = induce(fixture, { openShortcut: true });
  const long = path(closed, draft.nestZone, draft.foodZone);
  const short = path(open, draft.nestZone, draft.foodZone);
  if (!long || !short) {
    throw new Error(
      "the field is not connected both ways — the wall seals it, or a block does",
    );
  }
  return { ...draft, branches: { short, long } };
}

export function fieldSource(): string {
  const spec = buildSpec();
  const cells = (list: readonly string[]) =>
    list.map((cell) => `    "${cell}",`).join("\n");
  return `// GENERATED by scripts/build-field.ts — do not hand-edit.
//
// Run \`pnpm build:field\` to regenerate; spec/field.test.ts fails if this file
// and that generator disagree. The geometry is designed, the rest is computed:
// see src/fixtures/grid.ts for how these cells become nodes and edges.

import { buildField } from "./grid.ts";
import type { FieldSpec } from "./grid.ts";

export const FIELD_SPEC: FieldSpec = {
  name: ${JSON.stringify(spec.name)},
  width: ${spec.width},
  height: ${spec.height},
  nest: [${spec.nest[0]}, ${spec.nest[1]}],
  food: [${spec.food[0]}, ${spec.food[1]}],
  gaps: [${spec.gaps.map((g) => `[${g[0]}, ${g[1]}]`).join(", ")}],
  blocked: [
${cells(spec.blocked)}
  ],
  nestZone: [
${cells(spec.nestZone)}
  ],
  foodZone: [
${cells(spec.foodZone)}
  ],
  branches: {
    short: [
${cells(spec.branches.short)}
    ],
    long: [
${cells(spec.branches.long)}
    ],
  },
  params: { h: ${spec.params.h}, k: ${spec.params.k}, floor: ${spec.params.floor} },
};

export const FIELD = buildField(FIELD_SPEC);
`;
}

function main(): void {
  const spec = buildSpec();
  const fixture = buildField(spec);
  const closed = induce(fixture, { openShortcut: false });
  const open = induce(fixture, { openShortcut: true });
  const bfsLong = shortestPathBetween(closed, spec.nestZone, spec.foodZone) as number;
  const bfsShort = shortestPathBetween(open, spec.nestZone, spec.foodZone) as number;

  writeFileSync("src/fixtures/field.ts", fieldSource());

  console.log(`field ${spec.width}x${spec.height}`);
  console.log(`  nodes            ${fixture.nodes.length}`);
  console.log(`  edges            ${fixture.edges.length}`);
  console.log(`  blocked cells    ${spec.blocked.length}`);
  console.log(`  gap cells        ${spec.gaps.length}`);
  console.log(`  shortcut edges   ${fixture.edges.filter((e) => e.shortcut).length}`);
  console.log(`  zones            nest ${spec.nestZone.length}, food ${spec.foodZone.length} cells`);
  console.log(`  BFS long (gap shut)   ${bfsLong} moves  (zone to zone)`);
  console.log(`  BFS short (gap open)  ${bfsShort} moves  (zone to zone)`);
  console.log(`  ratio                 ${(bfsLong / bfsShort).toFixed(3)}`);
  console.log(`written -> src/fixtures/field.ts`);
}

if (process.argv[1]?.endsWith("build-field.ts")) main();
