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

/**
 * Fewest moves between two ZONES over open edges, or null if unreachable.
 *
 * Decision 17 (4) makes the nest and the food blocks rather than points, and
 * spec/oracles.md already words the reading as "moves between the two arrival
 * zones" — so this is the general case and `shortestPathLength` is the one-cell
 * special case of it.
 */
export function shortestPathBetween(
  graph: InducedGraph,
  from: readonly NodeId[],
  to: readonly NodeId[],
): number | null {
  const target = new Set(to);
  const distance = new Map<NodeId, number>();
  const queue: NodeId[] = [];
  for (const start of from) {
    if (target.has(start)) return 0;
    if (distance.has(start)) continue;
    distance.set(start, 0);
    queue.push(start);
  }
  for (let head = 0; head < queue.length; head += 1) {
    const node = queue[head] as NodeId;
    const here = distance.get(node) as number;
    for (const next of graph.adjacency.get(node) ?? []) {
      if (distance.has(next)) continue;
      if (target.has(next)) return here + 1;
      distance.set(next, here + 1);
      queue.push(next);
    }
  }
  return null;
}

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
