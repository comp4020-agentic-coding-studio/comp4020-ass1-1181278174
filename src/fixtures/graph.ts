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
  const open = new Set(
    induce(fixture, { openShortcut }).openEdges.map((edge) =>
      fixture.edges.indexOf(edge),
    ),
  );
  const lists: Hop[][] = fixture.nodes.map(() => []);
  fixture.edges.forEach((edge, e) => {
    if (!open.has(e)) return;
    const a = index.get(edge.a) as number;
    const b = index.get(edge.b) as number;
    lists[a]?.push({ edge: e, to: b });
    lists[b]?.push({ edge: e, to: a });
  });
  return lists;
}
