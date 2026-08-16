// Generates the field fixtures. `pnpm build:field`.
//
// Two of them, both committed data with a diff test (spec/field.test.ts re-runs
// this and compares). Never hand-edit the output.
//
//   v3 — the wall-and-doorway field. KEPT, not deleted: every spike in
//        docs/spikes/ was measured on it, and a record whose fixture no longer
//        exists is not a record. Only those scripts point at it now.
//   v4 — Decision 22's field: no wall, no doorway, open ground with scattered
//        blocks. The verb becomes drawing walls, so the fixture must not ship
//        with the one wall that mattered already in it.
//
// What is designed here is the geometry. Everything else — nodes, edges, the
// two branch paths — is computed from it, so the picture and the numbers cannot
// disagree.

import { writeFileSync } from "node:fs";
import type { NodeId } from "../src/fixtures/double-bridge.ts";
import { buildField, id } from "../src/fixtures/grid.ts";
import type { Cell, FieldSpec } from "../src/fixtures/grid.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";

const WIDTH = 60;
const HEIGHT = 40;

/** The engine parameters both fields carry. Decision 19, still provisional. */
const PARAMS = {
  h: 2,
  k: 20,
  floor: 0,
  gradedOver: 80,
  whisker: 3,
  straightBias: 4,
  depositPerStep: 20,
} as const;

type Rect = readonly [number, number, number, number];

// --- v3: the wall-and-doorway field (frozen; the spikes cite it) ------------

const V3_NEST: Cell = [18, 20];
const V3_FOOD: Cell = [50, 20];
const V3_WALL_X = 22;
const V3_GAPS: readonly Cell[] = [
  [V3_WALL_X, 19],
  [V3_WALL_X, 20],
  [V3_WALL_X, 21],
];
const V3_BLOCKS: readonly Rect[] = [
  [27, 0, 32, 1],
  [37, 4, 42, 5],
  [30, 9, 36, 16],
  [30, 24, 36, 31],
  [44, 26, 49, 33],
];

// --- v4: open ground (Decision 22) ------------------------------------------
//
// Nest and food on the same row with 47 cells of open field between them, and
// twenty blocks scattered over the whole field.
//
// v4.1: the band between them — y 18 to 22, the nest's right edge to the food's
// left — is kept CLEAR. In v4 two blocks straddled row 20 and the colony's road
// looped the long way round the whole field; the reading sat at 1.96×. Blocks
// beside the corridor give the road something to shape itself around; blocks
// across it give the road a reason to go somewhere else entirely.

const V4_NEST: Cell = [6, 20];
const V4_FOOD: Cell = [53, 20];
const V4_BLOCKS: readonly Rect[] = [
  // upper field
  [11, 3, 13, 5],
  [19, 2, 21, 4],
  [28, 5, 31, 8],
  [38, 3, 40, 5],
  [46, 6, 48, 8],
  [14, 9, 16, 11],
  [24, 11, 26, 13],
  [34, 10, 37, 12],
  [44, 12, 45, 13],
  // v4.1: the band between nest and food (y 18-22, from the nest's right to the
  // food's left) is CLEAR. These four moved to sit immediately outside it, so
  // they still shape the road without standing in the doorway of it — the road
  // has something to find its way around, not something to be blocked by.
  [16, 13, 18, 16],
  [25, 23, 27, 26],
  [33, 14, 35, 17],
  [42, 23, 44, 26],
  // lower field
  [12, 27, 14, 29],
  [21, 30, 24, 33],
  [31, 26, 33, 28],
  [40, 29, 42, 31],
  [47, 33, 49, 35],
  [8, 34, 10, 36],
  [53, 26, 55, 28],
];

/** A 3x3 arrival block. Arrival is entering any of its cells. */
function zoneAround([cx, cy]: Cell): string[] {
  const cells: string[] = [];
  for (let y = cy - 1; y <= cy + 1; y += 1) {
    for (let x = cx - 1; x <= cx + 1; x += 1) cells.push(id(x, y));
  }
  return cells;
}

/** The zone plus two clear cells around it, so nothing is walled in at birth. */
function clearance([cx, cy]: Cell): string[] {
  const cells: string[] = [];
  for (let y = cy - 3; y <= cy + 3; y += 1) {
    for (let x = cx - 3; x <= cx + 3; x += 1) cells.push(id(x, y));
  }
  return cells;
}

function blockedCells(options: {
  readonly wallX?: number;
  readonly wallTop?: number;
  readonly wallBottom?: number;
  readonly blocks: readonly Rect[];
  readonly nest: Cell;
  readonly food: Cell;
}): string[] {
  const cells = new Set<string>();
  if (options.wallX !== undefined) {
    for (let y = options.wallTop ?? 0; y <= (options.wallBottom ?? 0); y += 1) {
      cells.add(id(options.wallX, y));
    }
  }
  for (const [x0, y0, x1, y1] of options.blocks) {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) cells.add(id(x, y));
    }
  }
  for (const cell of [...clearance(options.nest), ...clearance(options.food)]) {
    cells.delete(cell);
  }
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

function finish(draft: FieldSpec): FieldSpec {
  const fixture = buildField(draft);
  const long = path(
    induce(fixture, { openShortcut: false }),
    draft.nestZone,
    draft.foodZone,
  );
  const short = path(
    induce(fixture, { openShortcut: true }),
    draft.nestZone,
    draft.foodZone,
  );
  if (!long || !short) {
    throw new Error(`${draft.name}: nest and food are not connected`);
  }
  return { ...draft, branches: { short, long } };
}

export function v3Spec(): FieldSpec {
  return finish({
    name: "field",
    width: WIDTH,
    height: HEIGHT,
    nest: V3_NEST,
    food: V3_FOOD,
    gaps: V3_GAPS,
    blocked: blockedCells({
      wallX: V3_WALL_X,
      wallTop: 6,
      wallBottom: HEIGHT - 1,
      blocks: V3_BLOCKS,
      nest: V3_NEST,
      food: V3_FOOD,
    }),
    nestZone: zoneAround(V3_NEST),
    foodZone: zoneAround(V3_FOOD),
    branches: { short: [], long: [] },
    params: PARAMS,
  });
}

export function v4Spec(): FieldSpec {
  return finish({
    name: "field-v4",
    width: WIDTH,
    height: HEIGHT,
    nest: V4_NEST,
    food: V4_FOOD,
    // No doorway: v4 has no wall to put one in. `toggleShortcut` is a no-op on
    // this fixture, and the verb becomes drawing walls (Decision 22, turn B).
    gaps: [],
    blocked: blockedCells({
      blocks: V4_BLOCKS,
      nest: V4_NEST,
      food: V4_FOOD,
    }),
    nestZone: zoneAround(V4_NEST),
    foodZone: zoneAround(V4_FOOD),
    branches: { short: [], long: [] },
    params: PARAMS,
  });
}

/**
 * v5 (Decision 26): the blank field the page ships. Nothing on it but the two
 * zones. Every obstacle the visitor sees — a scene's blocks, a maze, their own
 * walls — is a wall cell drawn with the one verb on this ground.
 */
export function v5Spec(): FieldSpec {
  return finish({
    name: "field-v5",
    width: WIDTH,
    height: HEIGHT,
    nest: V4_NEST,
    food: V4_FOOD,
    gaps: [],
    blocked: [],
    nestZone: zoneAround(V4_NEST),
    foodZone: zoneAround(V4_FOOD),
    branches: { short: [], long: [] },
    params: PARAMS,
  });
}

function source(spec: FieldSpec, prefix: string, note: string): string {
  const cells = (list: readonly string[]) =>
    list.map((cell) => `    "${cell}",`).join("\n");
  return `// GENERATED by scripts/build-field.ts — do not hand-edit.
//
// ${note}
//
// Run \`pnpm build:field\` to regenerate; spec/field.test.ts fails if this file
// and that generator disagree. The geometry is designed, the rest is computed:
// see src/fixtures/grid.ts for how these cells become nodes and edges.

import { buildField } from "./grid.ts";
import type { FieldSpec } from "./grid.ts";

export const ${prefix}_SPEC: FieldSpec = {
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
  params: {
    h: ${spec.params.h},
    k: ${spec.params.k},
    floor: ${spec.params.floor},
    gradedOver: ${spec.params.gradedOver},
    whisker: ${spec.params.whisker},
    straightBias: ${spec.params.straightBias},
    depositPerStep: ${spec.params.depositPerStep},
  },
};

export const ${prefix} = buildField(${prefix}_SPEC);
`;
}

export const v3Source = (): string =>
  source(
    v3Spec(),
    "FIELD_V3",
    "v3 — the wall-and-doorway field. FROZEN: every spike in docs/spikes/ was\n" +
      "// measured on it, and a record whose fixture no longer exists is not a\n" +
      "// record. The page does not use it; only those scripts do.",
  );

export const v4Source = (): string =>
  source(
    v4Spec(),
    "FIELD_V4",
    "v4 (Decision 22) — open ground: no wall, no doorway, twenty scattered blocks.",
  );

export const v5Source = (): string =>
  source(
    v5Spec(),
    "FIELD_V5",
    "v5 (Decision 26) — the blank field: open ground, nothing on it but the zones.\n" +
      "// Scenes (src/fixtures/presets.ts) are walls drawn on this ground.",
  );

function report(spec: FieldSpec, label: string): void {
  const fixture = buildField(spec);
  const bfs = shortestPathBetween(
    induce(fixture, { openShortcut: false }),
    spec.nestZone,
    spec.foodZone,
  );
  const bfsOpen = shortestPathBetween(
    induce(fixture, { openShortcut: true }),
    spec.nestZone,
    spec.foodZone,
  );
  console.log(`${label} — ${spec.width}x${spec.height}`);
  console.log(
    `  nodes / edges     ${fixture.nodes.length} / ${fixture.edges.length}`,
  );
  console.log(`  blocked cells     ${spec.blocked.length}`);
  console.log(`  gap cells         ${spec.gaps.length}`);
  console.log(
    `  BFS zone to zone  ${bfs} moves` +
      (spec.gaps.length > 0 ? `  (${bfsOpen} with the doorway open)` : ""),
  );
}

function main(): void {
  writeFileSync("src/fixtures/field-v3.ts", v3Source());
  writeFileSync("src/fixtures/field-v4.ts", v4Source());
  writeFileSync("src/fixtures/field-v5.ts", v5Source());
  report(v3Spec(), "v3 (frozen)");
  console.log("");
  report(v4Spec(), "v4 (frozen — the spikes)");
  console.log("");
  report(v5Spec(), "v5 (the page, blank)");
  console.log("");
  console.log(
    "written -> src/fixtures/field-v3.ts, src/fixtures/field-v4.ts, src/fixtures/field-v5.ts",
  );
}

if (process.argv[1]?.endsWith("build-field.ts")) main();
