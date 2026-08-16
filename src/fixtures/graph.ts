// The graph a fixture induces: nodes, and adjacency over OPEN edges only.
//
// Shared truth. The engine walks this graph and the BFS oracle measures it, so
// the two agree about the terrain while sharing no path-finding code — that
// independence is what makes BFS worth trusting (spec/oracles.md §2).

import type { Fixture, FixtureEdge, NodeId } from "./double-bridge.ts";

export interface InducedGraph {
  readonly nodes: readonly NodeId[];
  readonly adjacency: ReadonlyMap<NodeId, readonly NodeId[]>;
  /** Edges an ant may cross. Closed edges are excluded. */
  readonly openEdges: readonly FixtureEdge[];
}

export interface InduceOptions {
  /** Open the segment marked `shortcut` — what the visitor's toggle does. */
  readonly openShortcut?: boolean;
}

function isOpen(edge: FixtureEdge, options: InduceOptions): boolean {
  if (edge.shortcut && options.openShortcut) return true;
  return edge.closed !== true;
}

export function induce(
  fixture: Fixture,
  options: InduceOptions = {},
): InducedGraph {
  const openEdges = fixture.edges.filter((edge) => isOpen(edge, options));

  const adjacency = new Map<NodeId, NodeId[]>(
    fixture.nodes.map((node) => [node, []]),
  );
  for (const { a, b } of openEdges) {
    adjacency.get(a)?.push(b);
    adjacency.get(b)?.push(a);
  }

  return { nodes: fixture.nodes, adjacency, openEdges };
}

/** The number of moves along a node sequence — the unit every length is in. */
export function pathLength(path: readonly NodeId[]): number {
  return path.length - 1;
}

/** One hop: which edge, and where it lands. Edge indices are fixture.edges order. */
export interface Hop {
  readonly edge: number;
  readonly to: number;
  /**
   * Which way this hop points, on a fixture that has coordinates: 0 = +x,
   * 1 = +y, 2 = −x, 3 = −y. Undefined on a graph with no geometry, where
   * "straight ahead" has no meaning — the double bridge, so its momentum weight
   * can never apply and its behaviour cannot move.
   */
  readonly dir?: number;
  /**
   * The edges this direction's whisker sums over: this edge, then up to W−1
   * more along the same ray, stopping at a wall or the field edge. Always at
   * least `[edge]`, which is exactly today's single-edge reading.
   */
  readonly ray: readonly number[];
}

const DIRECTIONS: readonly (readonly [number, number])[] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];

function directionOf(
  cells: ReadonlyMap<NodeId, readonly [number, number]>,
  from: NodeId,
  to: NodeId,
): number | undefined {
  const a = cells.get(from);
  const b = cells.get(to);
  if (!a || !b) return undefined;
  const dx = Math.sign(b[0] - a[0]);
  const dy = Math.sign(b[1] - a[1]);
  const found = DIRECTIONS.findIndex(([x, y]) => x === dx && y === dy);
  return found < 0 ? undefined : found;
}

/**
 * Adjacency by node index over open edges only, edge indices stable across a
 * shortcut toggle so pheromone survives it.
 *
 * Lives here rather than in an engine because it is terrain, not rules — which is
 * what lets a second engine (the freshness mutant) walk the identical graph without
 * copying anything that could drift.
 */
export function adjacencyOf(
  fixture: Fixture,
  index: ReadonlyMap<NodeId, number>,
  openShortcut: boolean,
): readonly (readonly Hop[])[] {
  // Via a Map, not `indexOf` per edge. That was O(E²) and invisible at the double
  // bridge's twelve edges; the field has four thousand, where it is 16 million
  // reference comparisons every time a colony is made or the gap is toggled.
  const position = new Map(fixture.edges.map((edge, e) => [edge, e]));
  const open = new Set(
    induce(fixture, { openShortcut }).openEdges.map(
      (edge) => position.get(edge) as number,
    ),
  );
  const { cells } = fixture;
  const bare: { edge: number; to: number; dir?: number }[][] = fixture.nodes.map(
    () => [],
  );
  fixture.edges.forEach((edge, e) => {
    if (!open.has(e)) return;
    const a = index.get(edge.a) as number;
    const b = index.get(edge.b) as number;
    bare[a]?.push({
      edge: e,
      to: b,
      dir: cells ? directionOf(cells, edge.a, edge.b) : undefined,
    });
    bare[b]?.push({
      edge: e,
      to: a,
      dir: cells ? directionOf(cells, edge.b, edge.a) : undefined,
    });
  });

  // The whisker, precomputed: terrain, not rules, and the same reason
  // `adjacencyOf` lives here rather than in an engine. Walking the ray at
  // choice time would be the same answer at several times the cost, every ant
  // every step.
  const reach = Math.max(1, Math.floor(fixture.params.whisker ?? 1));
  const byDirection = bare.map((hops) => {
    const map = new Map<number, { edge: number; to: number }>();
    for (const hop of hops) if (hop.dir !== undefined) map.set(hop.dir, hop);
    return map;
  });

  return bare.map((hops) =>
    hops.map((hop) => {
      const ray: number[] = [hop.edge];
      if (hop.dir !== undefined) {
        let at = hop.to;
        for (let stepped = 1; stepped < reach; stepped += 1) {
          const next = byDirection[at]?.get(hop.dir);
          if (!next) break; // a wall, or the edge of the field
          ray.push(next.edge);
          at = next.to;
        }
      }
      return { ...hop, ray };
    }),
  );
}
