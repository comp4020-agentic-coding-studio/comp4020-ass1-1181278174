// Scenes are walls on the blank field (Decision 26). What has to be true of them:
//
//   · every scene leaves the food reachable — a scene the ants cannot solve is a
//     bug, not a challenge;
//   · the maze has MORE THAN ONE way through: wall off its shortest route and the
//     food must still be reachable;
//   · a random scene is the same scene for the same seed, and a different one for
//     a different seed;
//   · no scene ever walls a cell the visitor could not wall by hand — the zones,
//     and the ground the ants need to set out on.

import { describe, expect, it } from "vitest";
import { FIELD_V5 } from "../src/fixtures/field-v5.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import {
  MAZE,
  RANDOM_BLOCKS,
  connected,
  randomObstacles,
  sceneWalls,
} from "../src/fixtures/presets.ts";
import * as engine from "../src/sim/engine.ts";

const ZONES = new Set([...FIELD_V5.nestZone!, ...FIELD_V5.foodZone!]);

/** The BFS route as cells, so a test can wall it off. */
function shortestRoute(walls: readonly string[]): string[] {
  const graph = induce(FIELD_V5, { openShortcut: false, blocked: new Set(walls) });
  const targets = new Set(FIELD_V5.foodZone!);
  const previous = new Map<string, string>();
  const queue: string[] = [];
  for (const start of FIELD_V5.nestZone!) {
    previous.set(start, start);
    queue.push(start);
  }
  for (let head = 0; head < queue.length; head += 1) {
    const node = queue[head]!;
    if (targets.has(node)) {
      const out = [node];
      for (let at = node; previous.get(at) !== at; ) {
        at = previous.get(at)!;
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
  return [];
}

describe("the blank field", () => {
  it("has nothing on it but the two zones, and a 45-move straight line between them", () => {
    expect(FIELD_V5.nodes.length).toBe(60 * 40);
    expect(
      shortestPathBetween(
        induce(FIELD_V5, { openShortcut: false }),
        FIELD_V5.nestZone!,
        FIELD_V5.foodZone!,
      ),
    ).toBe(45);
  });
});

describe("the maze", () => {
  it("is fixed, walls no zone cell, and leaves the food reachable", () => {
    expect(MAZE.length).toBeGreaterThan(60);
    expect(MAZE.some((cell) => ZONES.has(cell))).toBe(false);
    expect(connected(FIELD_V5, MAZE)).toBe(true);
  });

  it("has more than one way through — wall off the shortest route and the food is still reachable", () => {
    const route = shortestRoute(MAZE).filter((cell) => !ZONES.has(cell));
    expect(route.length).toBeGreaterThan(45); // longer than the straight line: it IS a maze
    const sealed = [...MAZE, ...route];
    expect(connected(FIELD_V5, sealed)).toBe(true);
  });

  it("is drawable cell by cell with the one verb, exactly as the visitor would", () => {
    const colony = engine.createColony(FIELD_V5, { rho: 0.02, seed: 1, ants: 40 });
    for (const cell of MAZE) expect(engine.toggleCell(colony, cell)).toBe(true);
    expect(colony.drawnWalls.size).toBe(MAZE.length);
  });
});

describe("random obstacles", () => {
  it("are the same scene for the same seed and a different one for another", () => {
    const a = randomObstacles(FIELD_V5, 7);
    const b = randomObstacles(FIELD_V5, 7);
    const c = randomObstacles(FIELD_V5, 8);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });

  it("scatter about the promised number of blocks and never seal the food off", () => {
    for (let seed = 1; seed <= 25; seed += 1) {
      const cells = randomObstacles(FIELD_V5, seed);
      // 28 blocks of 2x2..4x4 is at least 112 cells; the placer may fall a few short.
      expect(cells.length).toBeGreaterThanOrEqual((RANDOM_BLOCKS - 4) * 4);
      expect(cells.some((cell) => ZONES.has(cell))).toBe(false);
      expect(connected(FIELD_V5, cells)).toBe(true);
    }
  });
});

describe("sceneWalls", () => {
  it("returns nothing for blank, the maze for maze, and the seeded scatter for random", () => {
    expect(sceneWalls(FIELD_V5, "blank")).toEqual([]);
    expect(sceneWalls(FIELD_V5, "maze")).toBe(MAZE);
    expect(sceneWalls(FIELD_V5, "random", 3)).toEqual(randomObstacles(FIELD_V5, 3));
  });
});
