// The two field fixtures, and the guard that they stay generated.
//
// v3 is the wall-and-doorway field every spike in docs/spikes/ was measured on.
// It is FROZEN and kept: a record whose fixture no longer exists is not a
// record. v4 is Decision 22's open ground, and it is what the page runs.
//
// Same contract the double bridge has in spec/fixture.test.ts: the branches are
// redundant with the edge list on purpose and are CHECKED against it rather than
// trusted. The diff test is the part that matters for generated files —
// hand-editing one would let the committed geometry drift from the generator
// that documents how it was designed, and nothing else would notice.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { v3Source, v4Source } from "../scripts/build-field.ts";
import { FIELD_V3, FIELD_V3_SPEC } from "../src/fixtures/field-v3.ts";
import { FIELD_V4, FIELD_V4_SPEC } from "../src/fixtures/field-v4.ts";
import type { Fixture } from "../src/fixtures/double-bridge.ts";
import type { FieldSpec } from "../src/fixtures/grid.ts";
import { induce, pathLength } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";

describe("the field fixtures are generated, not hand-edited", () => {
  for (const [file, source] of [
    ["src/fixtures/field-v3.ts", v3Source],
    ["src/fixtures/field-v4.ts", v4Source],
  ] as const) {
    it(`${file} matches what scripts/build-field.ts produces right now`, () => {
      expect(
        readFileSync(resolve(file), "utf8"),
        `${file} has drifted from its generator. Re-run \`pnpm build:field\` — ` +
          `do not hand-edit a fixture.`,
      ).toBe(source());
    });
  }
});

/** Everything true of any field, asserted for both so neither drifts alone. */
function sharedContract(name: string, fixture: Fixture, spec: FieldSpec): void {
  describe(`${name} — the shared field contract`, () => {
    // A doorway cell is listed as blocked AND exists as a node: it is a piece of
    // wall that can become ground, so it needs a coordinate to be drawn either
    // way. v4 has none of them, which is why this only shows up on v3.
    const doorway = new Set(spec.gaps.map(([x, y]) => `${x},${y}`));
    const walls = spec.blocked.filter((cell) => !doorway.has(cell));

    it("is 60x40 with the blocks cut out of it", () => {
      expect(spec.width).toBe(60);
      expect(spec.height).toBe(40);
      expect(new Set(fixture.nodes).size).toBe(fixture.nodes.length);
      expect(fixture.nodes.length).toBe(60 * 40 - walls.length);
    });

    it("gives every walkable cell a coordinate, and nothing else", () => {
      // The renderer infers a block from what is MISSING, so a walled cell that
      // kept its coordinate would be drawn as ground the ants can cross.
      expect(fixture.cells?.size).toBe(fixture.nodes.length);
      for (const cell of walls) {
        expect(fixture.cells?.has(cell), `${cell} is walled but drawable`).toBe(
          false,
        );
      }
      for (const cell of doorway) {
        expect(fixture.cells?.has(cell), `${cell} is a doorway, so drawable`).toBe(
          true,
        );
      }
    });

    it("has 3x3 arrival zones on open ground, with two clear cells around them", () => {
      expect(fixture.nestZone).toHaveLength(9);
      expect(fixture.foodZone).toHaveLength(9);
      const blocked = new Set(spec.blocked);
      for (const [cx, cy] of [spec.nest, spec.food]) {
        for (let y = cy - 3; y <= cy + 3; y += 1) {
          for (let x = cx - 3; x <= cx + 3; x += 1) {
            expect(blocked.has(`${x},${y}`), `${x},${y} crowds a zone`).toBe(
              false,
            );
          }
        }
      }
    });

    it("declares branches that agree with the edge list", () => {
      const undirected = new Set(
        fixture.edges.flatMap(({ a, b }) => [`${a}|${b}`, `${b}|${a}`]),
      );
      for (const route of [fixture.branches.short, fixture.branches.long]) {
        expect(route.length).toBeGreaterThan(1);
        for (let i = 0; i + 1 < route.length; i += 1) {
          expect(undirected.has(`${route[i]}|${route[i + 1]}`)).toBe(true);
        }
        expect(fixture.nestZone).toContain(route[0]);
        expect(fixture.foodZone).toContain(route.at(-1));
      }
    });

    it("carries the bridge's choice parameters and Decision 19's engine ones", () => {
      expect(fixture.params.h).toBe(2);
      expect(fixture.params.k).toBe(20);
      expect(fixture.params.floor).toBe(0);
      // Without these the page runs a FLAT deposit on a field, which forms no
      // road at all — and it looks like a rendering fault, because the glow is
      // there, just smeared over everything.
      expect(fixture.params.gradedOver).toBe(80);
      expect(fixture.params.whisker).toBe(3);
      expect(fixture.params.straightBias).toBe(4);
      expect(fixture.params.depositPerStep).toBe(20);
    });
  });
}

sharedContract("v3 (frozen)", FIELD_V3, FIELD_V3_SPEC);
sharedContract("v4 (the page)", FIELD_V4, FIELD_V4_SPEC);

const bfs = (fixture: Fixture, spec: FieldSpec, openShortcut: boolean) =>
  shortestPathBetween(
    induce(fixture, { openShortcut }),
    spec.nestZone,
    spec.foodZone,
  );

describe("v3 — the wall-and-doorway field the spikes cite", () => {
  it("is unchanged: 2185 nodes, 4184 edges, 58 moves round the top, 30 through the doorway", () => {
    // These are the numbers every table in docs/spikes/ was measured against. A
    // red here means those records have stopped describing this repo.
    expect(FIELD_V3.nodes.length).toBe(2185);
    expect(FIELD_V3.edges.length).toBe(4184);
    expect(bfs(FIELD_V3, FIELD_V3_SPEC, false)).toBe(58);
    expect(bfs(FIELD_V3, FIELD_V3_SPEC, true)).toBe(30);
  });

  it("still has its three-cell doorway", () => {
    expect(FIELD_V3.gapCells).toEqual(["22,19", "22,20", "22,21"]);
    expect(FIELD_V3.edges.filter((edge) => edge.shortcut)).toHaveLength(8);
  });
});

describe("v4 — open ground (Decision 22)", () => {
  it("is 2196 nodes, 4165 edges, 45 moves zone to zone", () => {
    expect(FIELD_V4.nodes.length).toBe(2196);
    expect(FIELD_V4.edges.length).toBe(4165);
    // v4.1 clears the corridor between the zones, so the straight line is now
    // walkable and the shortest route is exactly the distance between the zone
    // edges — 52 − 7. It was 47 while two blocks straddled row 20.
    expect(bfs(FIELD_V4, FIELD_V4_SPEC, false)).toBe(45);
    expect(FIELD_V4_SPEC.food[0] - 1 - (FIELD_V4_SPEC.nest[0] + 1)).toBe(45);
  });

  it("keeps the corridor between nest and food completely clear (v4.1)", () => {
    // The road needs blocks to shape itself AROUND, not blocks standing in the
    // doorway. With two of them across row 20 the colony looped the long way
    // round the whole field and the reading sat at 1.96×.
    for (const cell of FIELD_V4_SPEC.blocked) {
      const [x, y] = cell.split(",").map(Number) as [number, number];
      const inCorridor = y >= 18 && y <= 22 && x > FIELD_V4_SPEC.nest[0] + 3 && x < FIELD_V4_SPEC.food[0] - 3;
      expect(inCorridor, `${cell} stands in the corridor`).toBe(false);
    }
  });

  it("keeps every block between 2x2 and 4x4", () => {
    const blocked = new Set(FIELD_V4_SPEC.blocked);
    const seen = new Set<string>();
    for (const cell of blocked) {
      if (seen.has(cell)) continue;
      const queue = [cell];
      seen.add(cell);
      const xs: number[] = [];
      const ys: number[] = [];
      while (queue.length > 0) {
        const at = queue.pop() as string;
        const [x, y] = at.split(",").map(Number) as [number, number];
        xs.push(x);
        ys.push(y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const next = `${x + dx},${y + dy}`;
          if (blocked.has(next) && !seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      const w = Math.max(...xs) - Math.min(...xs) + 1;
      const h = Math.max(...ys) - Math.min(...ys) + 1;
      // Two blocks placed a cell apart merge into one big shape, which is how a
      // 5x7 got in here once.
      expect(w, `block at ${cell} is ${w} wide`).toBeLessThanOrEqual(4);
      expect(h, `block at ${cell} is ${h} tall`).toBeLessThanOrEqual(4);
      expect(Math.min(w, h)).toBeGreaterThanOrEqual(2);
    }
  });

  it("has NO wall and NO doorway — the verb is drawing them", () => {
    expect(FIELD_V4_SPEC.gaps).toHaveLength(0);
    expect(FIELD_V4.gapCells).toHaveLength(0);
    expect(FIELD_V4.edges.filter((edge) => edge.shortcut)).toHaveLength(0);
    // With nothing marked `shortcut`, toggling is a no-op and the two branches
    // are the same route — which is what "open ground" means.
    expect(bfs(FIELD_V4, FIELD_V4_SPEC, true)).toBe(
      bfs(FIELD_V4, FIELD_V4_SPEC, false),
    );
    expect(pathLength(FIELD_V4.branches.short)).toBe(
      pathLength(FIELD_V4.branches.long),
    );
  });

  it("scatters 15-20 blocks over the field, some of them between nest and food", () => {
    // Blocks are what make the road a road rather than a ruled line. Counted by
    // flood-filling the blocked cells into connected components, so the test
    // measures what is THERE rather than re-reading the generator's list.
    const blocked = new Set(FIELD_V4_SPEC.blocked);
    const seen = new Set<string>();
    let components = 0;
    let inTheBand = 0;
    for (const cell of blocked) {
      if (seen.has(cell)) continue;
      components += 1;
      let touchesBand = false;
      const queue = [cell];
      seen.add(cell);
      while (queue.length > 0) {
        const at = queue.pop() as string;
        const [x, y] = at.split(",").map(Number) as [number, number];
        if (y >= 12 && y <= 27 && x > 9 && x < 50) touchesBand = true;
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const next = `${x + dx},${y + dy}`;
          if (blocked.has(next) && !seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      if (touchesBand) inTheBand += 1;
    }
    expect(components).toBeGreaterThanOrEqual(15);
    expect(components).toBeLessThanOrEqual(20);
    // v4.1: they sit BESIDE the corridor, not in it, so this counts the ones
    // near enough to shape the road rather than the ones standing across it.
    expect(inTheBand).toBeGreaterThanOrEqual(3);
  });

  it("keeps nest and food on the same row, 47 cells of field apart", () => {
    expect(FIELD_V4_SPEC.nest[1]).toBe(FIELD_V4_SPEC.food[1]);
    expect(FIELD_V4_SPEC.food[0] - FIELD_V4_SPEC.nest[0]).toBe(47);
  });
});
