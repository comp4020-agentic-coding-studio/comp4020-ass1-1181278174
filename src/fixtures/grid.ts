// A grid field as a Fixture: the double bridge in disguise (Decision 16).
//
// Same mechanic, different terrain. The engine, the two pheromone maps, the one
// verb, the reading and the BFS oracle are all unchanged — what changes is that
// "a trail forms from nothing" stops being eight edges lighting up and becomes a
// road growing across a field, which is the thing the visitor was supposed to see
// in the first ten seconds.
//
// The disguise is exact. A wall runs down the field with a closed gap in it: the
// gap is the shortcut segment, and going round the end of the wall is the long
// way. Obstacle blocks stand in the open so the road has to thread between them.
// Nothing here knows about ants, and no term anywhere is a distance to food.
//
// This file is hand-written and tested. The FIELD SPEC it consumes is generated —
// `scripts/build-field.ts` → `src/fixtures/field.ts`, guarded by a diff test —
// because the geometry is data somebody designed, and edges are only its
// mechanical consequence.

import type { Fixture, FixtureEdge, FixtureParams, NodeId } from "./double-bridge.ts";

export type Cell = readonly [number, number];

export interface FieldSpec {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly nest: Cell;
  readonly food: Cell;
  /**
   * The cells the visitor toggles — the fork in the road. Sealed until they do.
   * A run of cells rather than one, so the gap is a doorway an ant can walk
   * through rather than a needle it has to thread.
   */
  readonly gaps: readonly Cell[];
  /** Every impassable cell, "x,y", sorted. The wall and the obstacle blocks. */
  readonly blocked: readonly string[];
  /** Decision 17 (4): the arrival blocks. Arrival is entering any cell of one. */
  readonly nestZone: readonly NodeId[];
  readonly foodZone: readonly NodeId[];
  /** Committed, checked against the edge list rather than trusted. */
  readonly branches: {
    readonly short: readonly NodeId[];
    readonly long: readonly NodeId[];
  };
  readonly params: FixtureParams;
}

export const id = (x: number, y: number): NodeId => `${x},${y}`;

export function buildField(spec: FieldSpec): Fixture {
  const blocked = new Set(spec.blocked);
  const gapIds = new Set(spec.gaps.map(([x, y]) => id(x, y)));

  // The gap is a cell, not an edge: it exists as a node, and its two horizontal
  // neighbours are the shortcut edges. Its vertical neighbours are wall, so when
  // those two edges are shut the cell is sealed off entirely — which is what a
  // gap in a wall IS.
  const open = (x: number, y: number): boolean =>
    x >= 0 &&
    y >= 0 &&
    x < spec.width &&
    y < spec.height &&
    (!blocked.has(id(x, y)) || gapIds.has(id(x, y)));

  const nodes: NodeId[] = [];
  for (let y = 0; y < spec.height; y += 1) {
    for (let x = 0; x < spec.width; x += 1) {
      if (open(x, y)) nodes.push(id(x, y));
    }
  }

  const edges: FixtureEdge[] = [];
  for (let y = 0; y < spec.height; y += 1) {
    for (let x = 0; x < spec.width; x += 1) {
      if (!open(x, y)) continue;
      // Right and down only, so each undirected edge is emitted once.
      for (const [dx, dy] of [
        [1, 0],
        [0, 1],
      ] as const) {
        if (!open(x + dx, y + dy)) continue;
        const a = id(x, y);
        const b = id(x + dx, y + dy);
        const touchesGap = gapIds.has(a) || gapIds.has(b);
        edges.push(
          touchesGap ? { a, b, closed: true, shortcut: true } : { a, b },
        );
      }
    }
  }

  const cells = new Map<NodeId, readonly [number, number]>();
  for (const node of nodes) {
    const [x, y] = node.split(",");
    cells.set(node, [Number(x), Number(y)]);
  }

  return {
    name: spec.name,
    nest: id(spec.nest[0], spec.nest[1]),
    food: id(spec.food[0], spec.food[1]),
    nestZone: spec.nestZone,
    foodZone: spec.foodZone,
    cells,
    nodes,
    edges,
    branches: spec.branches,
    params: spec.params,
  };
}
