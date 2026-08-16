// The shortest-path oracle.
//
// Deliberately NOT in src/sim/**: it shares no code with the engine, which is
// the whole reason its answer is worth measuring the ants against. The ants never
// see it. Every ratio in the core-interaction test is trip length over this.
//
// Unit: moves between the two arrival zones — the same unit the engine counts
// trips in, so the ratio is dimensionless.

import type { InducedGraph } from "../fixtures/graph.ts";
import type { NodeId } from "../fixtures/double-bridge.ts";

/** Fewest moves from `from` to `to` over open edges, or null if unreachable. */
export function shortestPathLength(
  graph: InducedGraph,
  from: NodeId,
  to: NodeId,
): number | null {
  if (from === to) return 0;

  const distance = new Map<NodeId, number>([[from, 0]]);
  const queue: NodeId[] = [from];

  for (let head = 0; head < queue.length; head += 1) {
    const node = queue[head] as NodeId;
    const here = distance.get(node) as number;

    for (const next of graph.adjacency.get(node) ?? []) {
      if (distance.has(next)) continue;
      if (next === to) return here + 1;
      distance.set(next, here + 1);
      queue.push(next);
    }
  }

  return null;
}
