// The fixture and the oracle, before any engine exists. GREEN: this is the ground
// the red tests will be measured against, so it has to be trustworthy first.
//
// Every number asserted here is also recorded in spec/oracles.md §2, and every one
// is checkable by counting the edge literals in src/fixtures/double-bridge.ts.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { induce, pathLength } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";

const fixture = DOUBLE_BRIDGE;
const closed = induce(fixture, { openShortcut: false });
const open = induce(fixture, { openShortcut: true });

const bfs = (graph: Parameters<typeof shortestPathLength>[0]) =>
  shortestPathLength(graph, fixture.nest, fixture.food);

describe("double-bridge fixture", () => {
  it("has 12 nodes and 12 edges", () => {
    expect(fixture.nodes.length).toBe(12);
    expect(fixture.edges.length).toBe(12);
    expect(new Set(fixture.nodes).size).toBe(fixture.nodes.length);
  });

  it("has exactly one shortcut segment, closed at load", () => {
    const shortcuts = fixture.edges.filter((edge) => edge.shortcut);
    expect(shortcuts.length).toBe(1);
    expect(shortcuts[0]?.closed).toBe(true);
  });

  it("declares branches that agree with the edge list", () => {
    // branches is redundant with edges on purpose — checked, not trusted.
    const undirected = new Set(
      fixture.edges.flatMap(({ a, b }) => [`${a}|${b}`, `${b}|${a}`]),
    );
    for (const path of [fixture.branches.short, fixture.branches.long]) {
      for (let i = 0; i + 1 < path.length; i += 1) {
        expect(undirected.has(`${path[i]}|${path[i + 1]}`)).toBe(true);
      }
      expect(path[0]).toBe(fixture.nest);
      expect(path.at(-1)).toBe(fixture.food);
    }
  });

  it("is 8 moves the long way, 4 the short way — a ratio of 2", () => {
    expect(pathLength(fixture.branches.long)).toBe(8);
    expect(pathLength(fixture.branches.short)).toBe(4);
    expect(
      pathLength(fixture.branches.long) / pathLength(fixture.branches.short),
    ).toBe(2);
  });

  it("carries its own parameters, h = 2 per Deneubourg", () => {
    expect(fixture.params.h).toBe(2);
    expect(fixture.params.k).toBe(20);
    expect(fixture.params.floor).toBe(0);
  });
});

describe("BFS oracle on the double bridge", () => {
  it("is 8 moves before the shortcut opens", () => {
    expect(bfs(closed)).toBe(8);
  });

  it("is 4 moves after the shortcut opens", () => {
    expect(bfs(open)).toBe(4);
  });

  it("counts one more open edge once the shortcut opens", () => {
    expect(closed.openEdges.length).toBe(11);
    expect(open.openEdges.length).toBe(12);
  });

  it("severs the short branch while the shortcut is closed", () => {
    // With S1—S2 walled, S2 is only reachable the long way round and back through
    // the food: 8 moves to FOOD, then FOOD—S3—S2. That detour is why the colony
    // finds the 8-move route first and has no reason to look again.
    expect(shortestPathLength(closed, fixture.nest, "S2")).toBe(10);
    expect(shortestPathLength(open, fixture.nest, "S2")).toBe(2);
  });

  it("returns null for a node outside the graph", () => {
    expect(shortestPathLength(open, fixture.nest, "NOWHERE")).toBe(null);
  });
});
