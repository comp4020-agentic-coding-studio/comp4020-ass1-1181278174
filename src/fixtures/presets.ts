// Scenes are walls, not fixtures (Decision 26).
//
// The page's field is v5: open ground with nothing on it but the nest and the
// food. Everything the visitor can stand between them is a wall cell — the same
// kind of cell they draw by hand, built with the same `toggleCell`. So a "scene"
// is nothing more than a set of cells to draw before the ants set out:
//
//   · blank  — nothing; the visitor draws their own
//   · random — a scatter of small blocks, seeded, so "Random" again gives another
//   · maze   — a fixed layout with several ways through, never just one
//
// One fixture, one verb, one BFS oracle. Nothing here knows about ants.

import type { NodeId } from "./double-bridge.ts";
import type { Fixture } from "./double-bridge.ts";
import { induce } from "./graph.ts";
import { shortestPathBetween } from "../oracle/bfs.ts";
import { mulberry32 } from "../sim/prng.ts";
import { id } from "./grid.ts";

export type SceneKind = "blank" | "random" | "maze";

/** Field v5's dimensions and zones, restated here so the presets are readable as geometry. */
const WIDTH = 60;
const HEIGHT = 40;
const NEST = { x: 6, y: 20 } as const;
const FOOD = { x: 53, y: 20 } as const;
/** No wall within this many cells of a zone's centre — the ants need room to set out. */
const ZONE_MARGIN = 4;

function nearZone(x: number, y: number): boolean {
  return (
    (Math.abs(x - NEST.x) <= ZONE_MARGIN && Math.abs(y - NEST.y) <= ZONE_MARGIN) ||
    (Math.abs(x - FOOD.x) <= ZONE_MARGIN && Math.abs(y - FOOD.y) <= ZONE_MARGIN)
  );
}

// --- the maze -----------------------------------------------------------------
//
// Three upright barriers from edge to edge. The outer two are pierced in the
// middle, the middle one above and below — so a way through has to bend twice,
// and there are two of them (over the middle barrier or under it). That is what
// "several routes, never just one" means here, and spec/presets.test.ts holds it:
// wall off the shortest route and the food must still be reachable.
//
// It is the fifth layout, and the numbers chose it. Five barriers with three-cell
// doorways and ten cross-walls: no road at all, 25× the shortest after 30,000
// steps on three seeds. Three barriers with five-cell doorways and three
// cross-walls: a road, but only after 15–20,000 steps at the page's forgetting
// rate. Doorways moved nearer the middle: 12–20,000. Wide doorways with the
// middle one on the nest's own row: a road in 3,000 steps but dead straight, no
// maze to look at. This one: 3,000–6,000 steps (20–40 s at 150 steps/s), 1.05×
// to 1.34× on three seeds, and a road that visibly turns. The engine has no
// distance term, so every dead end costs it a minute of wandering; a maze it can
// solve in front of a visitor is a field with walls in it, not a labyrinth. That
// is the honest limit, kept rather than tuned around.

interface Barrier {
  readonly x: number;
  /** [top, bottom] inclusive rows of each doorway. */
  readonly doors: readonly (readonly [number, number])[];
}
interface Stub {
  readonly y: number;
  readonly from: number;
  readonly to: number;
}

const BARRIERS: readonly Barrier[] = [
  { x: 20, doors: [[15, 25]] },
  { x: 32, doors: [[4, 11], [29, 36]] },
  { x: 44, doors: [[15, 25]] },
];

/** No cross-walls: with this engine, every dead end costs a minute of wandering. */
const STUBS: readonly Stub[] = [];

function mazeCells(): readonly NodeId[] {
  const cells = new Set<NodeId>();
  for (const barrier of BARRIERS) {
    for (let y = 0; y < HEIGHT; y += 1) {
      const inDoor = barrier.doors.some(([top, bottom]) => y >= top && y <= bottom);
      if (!inDoor && !nearZone(barrier.x, y)) cells.add(id(barrier.x, y));
    }
  }
  for (const stub of STUBS) {
    for (let x = stub.from; x <= stub.to; x += 1) {
      if (!nearZone(x, stub.y)) cells.add(id(x, stub.y));
    }
  }
  return [...cells].sort();
}

/** The maze, as wall cells. Fixed: the same layout every time. */
export const MAZE: readonly NodeId[] = mazeCells();

// --- random obstacles ---------------------------------------------------------

/** How many blocks a random scene scatters — a few more than v4's twenty. */
export const RANDOM_BLOCKS = 28;
const RANDOM_MIN = 2;
const RANDOM_MAX = 4;

interface Rect {
  readonly x0: number;
  readonly y0: number;
  readonly x1: number;
  readonly y1: number;
}

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return !(
    a.x1 + gap < b.x0 ||
    b.x1 + gap < a.x0 ||
    a.y1 + gap < b.y0 ||
    b.y1 + gap < a.y0
  );
}

function rectsFor(seed: number): Rect[] {
  const random = mulberry32(seed);
  const pick = (lo: number, hi: number) => lo + Math.floor(random() * (hi - lo + 1));
  const rects: Rect[] = [];
  let attempts = 0;
  while (rects.length < RANDOM_BLOCKS && attempts < 4000) {
    attempts += 1;
    const w = pick(RANDOM_MIN, RANDOM_MAX);
    const h = pick(RANDOM_MIN, RANDOM_MAX);
    const x0 = pick(1, WIDTH - 2 - w);
    const y0 = pick(1, HEIGHT - 2 - h);
    const rect: Rect = { x0, y0, x1: x0 + w - 1, y1: y0 + h - 1 };
    let clear = true;
    for (let y = rect.y0; y <= rect.y1 && clear; y += 1) {
      for (let x = rect.x0; x <= rect.x1; x += 1) {
        if (nearZone(x, y)) {
          clear = false;
          break;
        }
      }
    }
    if (!clear) continue;
    // A one-cell gap between blocks, so two blocks never fuse into a wall.
    if (rects.some((other) => overlaps(rect, other, 1))) continue;
    rects.push(rect);
  }
  return rects;
}

function cellsOf(rects: readonly Rect[]): readonly NodeId[] {
  const cells: NodeId[] = [];
  for (const rect of rects) {
    for (let y = rect.y0; y <= rect.y1; y += 1) {
      for (let x = rect.x0; x <= rect.x1; x += 1) cells.push(id(x, y));
    }
  }
  return cells.sort();
}

/** Is the food reachable from the nest with these cells walled? */
export function connected(fixture: Fixture, walls: readonly NodeId[]): boolean {
  return (
    shortestPathBetween(
      induce(fixture, { openShortcut: false, blocked: new Set(walls) }),
      fixture.nestZone ?? [fixture.nest],
      fixture.foodZone ?? [fixture.food],
    ) !== null
  );
}

/**
 * A scatter of small blocks, deterministic per seed. If a seed happens to seal
 * the food off, the next seed is used — so every seed returns a scene the ants
 * can solve, and the same seed always returns the same scene.
 */
export function randomObstacles(fixture: Fixture, seed: number): readonly NodeId[] {
  for (let s = seed; s < seed + 50; s += 1) {
    const cells = cellsOf(rectsFor(s));
    if (connected(fixture, cells)) return cells;
  }
  return [];
}

/** The cells a scene draws before the ants set out. */
export function sceneWalls(
  fixture: Fixture,
  kind: SceneKind,
  seed = 1,
): readonly NodeId[] {
  if (kind === "maze") return MAZE;
  if (kind === "random") return randomObstacles(fixture, seed);
  return [];
}
