// The field fixture, and the guard that it stays generated.
//
// Same contract the double bridge has in spec/fixture.test.ts: the branches are
// redundant with the edge list on purpose and are CHECKED against it rather than
// trusted, and the BFS numbers are asserted here as well as recorded in the spike.
//
// The diff test is the part that matters for a generated file: hand-editing
// `src/fixtures/field.ts` would let the committed geometry drift from the
// generator that documents how it was designed, and nothing else would notice.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FIELD, FIELD_SPEC } from "../src/fixtures/field.ts";
import { induce, pathLength } from "../src/fixtures/graph.ts";
import { shortestPathBetween, shortestPathLength } from "../src/oracle/bfs.ts";
import { fieldSource } from "../scripts/build-field.ts";

const closed = induce(FIELD, { openShortcut: false });
const open = induce(FIELD, { openShortcut: true });
// Zone to zone (Decision 17 (4)) — "moves between the two arrival zones", which
// is how spec/oracles.md has always worded the unit.
const bfs = (graph: typeof closed) =>
  shortestPathBetween(graph, FIELD_SPEC.nestZone, FIELD_SPEC.foodZone);

describe("the field fixture is generated, not hand-edited", () => {
  it("matches what scripts/build-field.ts produces right now", () => {
    const onDisk = readFileSync(resolve("src/fixtures/field.ts"), "utf8");
    expect(
      onDisk,
      "src/fixtures/field.ts has drifted from its generator. Re-run `pnpm build:field` — " +
        "do not hand-edit the fixture.",
    ).toBe(fieldSource());
  });
});

describe("field fixture", () => {
  it("is a 60x40 grid with the wall and blocks cut out of it", () => {
    expect(FIELD_SPEC.width).toBe(60);
    expect(FIELD_SPEC.height).toBe(40);
    expect(FIELD.nodes.length).toBe(2185);
    expect(FIELD.edges.length).toBe(4184);
    expect(new Set(FIELD.nodes).size).toBe(FIELD.nodes.length);
  });

  it("has a three-cell doorway, sealed at load, straight ahead of the nest", () => {
    // v2 (Decision 18): the fork is AT the ants' feet, not 19 cells off the road.
    // Every edge that touches the doorway is shut, so it is a piece of wall until
    // the visitor opens it — and the cells are on the nest's own eye-line.
    expect(FIELD_SPEC.gaps).toHaveLength(3);
    const gaps = new Set(FIELD_SPEC.gaps.map(([x, y]) => `${x},${y}`));
    const shortcuts = FIELD.edges.filter((edge) => edge.shortcut);
    expect(shortcuts.length).toBe(8);
    for (const edge of shortcuts) {
      expect(edge.closed).toBe(true);
      expect(gaps.has(edge.a) || gaps.has(edge.b)).toBe(true);
    }
    // On the nest's row, and only two open cells away from it.
    const [nestX, nestY] = FIELD_SPEC.nest;
    expect(FIELD_SPEC.gaps.some(([, y]) => y === nestY)).toBe(true);
    expect(Math.min(...FIELD_SPEC.gaps.map(([x]) => x)) - nestX).toBe(4);
  });

  it("declares branches that agree with the edge list", () => {
    const undirected = new Set(
      FIELD.edges.flatMap(({ a, b }) => [`${a}|${b}`, `${b}|${a}`]),
    );
    for (const path of [FIELD.branches.short, FIELD.branches.long]) {
      expect(path.length).toBeGreaterThan(1);
      for (let i = 0; i + 1 < path.length; i += 1) {
        expect(undirected.has(`${path[i]}|${path[i + 1]}`)).toBe(true);
      }
      // Zone to zone, not centre to centre: with arrival blocks the route starts
      // at whichever nest cell is nearest and ends at whichever food cell is.
      expect(FIELD.nestZone).toContain(path[0]);
      expect(FIELD.foodZone).toContain(path.at(-1));
    }
  });

  it("is the double bridge in disguise — the long way is about twice the short", () => {
    // The whole point of the geometry. At 1.2x nobody would care that the colony
    // refuses to switch; at 2x it is the argument.
    expect(pathLength(FIELD.branches.long)).toBe(58);
    expect(pathLength(FIELD.branches.short)).toBe(30);
    const ratio = pathLength(FIELD.branches.long) / pathLength(FIELD.branches.short);
    expect(ratio).toBeGreaterThan(1.9);
    expect(ratio).toBeLessThan(2.1);
  });

  it("carries the same choice parameters as the bridge", () => {
    expect(FIELD.params.h).toBe(2);
    expect(FIELD.params.k).toBe(20);
    expect(FIELD.params.floor).toBe(0);
  });

  it("has 3x3 arrival zones, all of them open ground", () => {
    expect(FIELD.nestZone).toHaveLength(9);
    expect(FIELD.foodZone).toHaveLength(9);
    const blocked = new Set(FIELD_SPEC.blocked);
    const nodes = new Set(FIELD.nodes);
    for (const cell of [...FIELD.nestZone!, ...FIELD.foodZone!]) {
      expect(blocked.has(cell), `${cell} is walled`).toBe(false);
      expect(nodes.has(cell), `${cell} is not on the graph`).toBe(true);
    }
  });

  it("gives every cell a coordinate, and nothing else", () => {
    // The engine reads these for "is this candidate straight ahead" and the
    // whisker ray only. A distance to food from them would break Decision 1c.
    expect(FIELD.cells?.size).toBe(FIELD.nodes.length);
    expect(FIELD.cells?.get("3,11")).toEqual([3, 11]);
  });
});

describe("BFS oracle on the field", () => {
  it("is 58 moves round the top, 30 through the doorway", () => {
    expect(bfs(closed)).toBe(58);
    expect(bfs(open)).toBe(30);
  });

  it("seals the doorway off entirely while the wall is whole", () => {
    const gap = `${FIELD_SPEC.gaps[0]?.[0]},${FIELD_SPEC.gaps[0]?.[1]}`;
    expect(shortestPathLength(closed, FIELD.nest, gap)).toBe(null);
    expect(shortestPathLength(open, FIELD.nest, gap)).toBe(5);
  });

  it("counts eight more open edges once the doorway opens", () => {
    expect(open.openEdges.length - closed.openEdges.length).toBe(8);
  });

  it("has no way round except the passage along the top", () => {
    // The wall touches the bottom edge on purpose. If it did not, there would be
    // a second detour along the floor and the long way would not be one route.
    const bottom = `${FIELD_SPEC.width - 1},${FIELD_SPEC.height - 1}`;
    expect(FIELD.nodes).toContain(bottom);
    const wallFoot = `22,${FIELD_SPEC.height - 1}`;
    expect(new Set(FIELD_SPEC.blocked).has(wallFoot)).toBe(true);
  });
});
