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
