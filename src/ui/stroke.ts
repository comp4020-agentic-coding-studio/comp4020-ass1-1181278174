// A stroke is the cells the pointer passed over, not the cells it happened to be
// sampled on. `pointermove` fires perhaps sixty times a second; a quick drag
// covers several cells between two events, and a wall with gaps in it is not a
// wall — the ants walk through the gap and "the road is blocked" is false.
//
// So the page fills in the line between the last cell it saw and the one it sees
// now, on the grid, with Bresenham's walk. Four-connected on purpose: the ants
// move four ways, so a wall that only touches at corners would still leak.

import type { NodeId } from "../fixtures/double-bridge.ts";

const parse = (node: NodeId): readonly [number, number] => {
  const [x, y] = node.split(",").map(Number);
  return [x ?? 0, y ?? 0];
};

/**
 * Every grid cell on the way from `from` to `to`, excluding `from` and including
 * `to`, as a 4-connected path (each step moves one cell horizontally OR
 * vertically). Empty when the two are the same cell.
 */
export function cellsBetween(from: NodeId, to: NodeId): NodeId[] {
  const [x0, y0] = parse(from);
  const [x1, y1] = parse(to);
  const out: NodeId[] = [];
  let x = x0;
  let y = y0;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  while (x !== x1 || y !== y1) {
    // Bresenham, but stepping one axis at a time so consecutive cells share an
    // edge: where the classic walk would step diagonally, take the horizontal
    // step first and the vertical one next.
    const e2 = 2 * err;
    if (e2 > -dy && x !== x1) {
      err -= dy;
      x += sx;
      out.push(`${x},${y}`);
      if (e2 < dx && y !== y1) {
        err += dx;
        y += sy;
        out.push(`${x},${y}`);
      }
    } else if (y !== y1) {
      err += dx;
      y += sy;
      out.push(`${x},${y}`);
    } else {
      break;
    }
  }
  return out;
}
