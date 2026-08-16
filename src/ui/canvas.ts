// The canvas: a pure projection of a fixed logical graph.
//
// It READS the colony and writes pixels. It never steps, never mutates, never
// holds simulation state — so a resize is a redraw and nothing else, which
// spec/canvas.test.ts holds by digesting the engine across one.
//
// What it draws, and nothing else (beat 2 has to be legible without prose):
//   · terrain — every open edge, dim, so a road with no traffic is still a road
//   · the wall — while the shortcut is shut, a bar across the gap
//   · trails — width and brightness from pheromone, two maps in two hues
//   · ants — a dot each, the one bit they carry as colour
// The shortcut segment is also the tap target for the single verb, so it draws a
// faint ring: an affordance, not decoration.

import type { Fixture } from "../fixtures/double-bridge.ts";
import type { Colony } from "../sim/engine.ts";
import { edgePheromone } from "../sim/engine.ts";
import type { Palette } from "./palette.ts";
import { distanceToSegment, project, shortcutEdge } from "./projection.ts";
import type { Point, Projection } from "./projection.ts";

export interface CanvasView {
  /** Redraw from the colony as it stands. Safe to call at any time. */
  draw(colony: Colony): void;
  /** Recompute the backing store from the element's box, then redraw. */
  resize(): void;
  /** CSS pixels, so a test can prove a resize actually happened. */
  size(): { readonly width: number; readonly height: number };
  /** Did this client point land on the shortcut segment? */
  hitsShortcut(clientX: number, clientY: number): boolean;
  setPalette(palette: Palette): void;
  dispose(): void;
}

/** How close a tap has to be to the wall, in CSS pixels. Generous: it is a line. */
const TAP_SLOP = 26;

export function createCanvasView(
  canvas: HTMLCanvasElement,
  fixture: Fixture,
  initial: Palette,
): CanvasView {
  const view = canvas.ownerDocument.defaultView;
  const projection: Projection = project(fixture);
  const shortcut = shortcutEdge(projection);
  let palette = initial;
  let width = 0;
  let height = 0;
  let last: Colony | null = null;

  const context = (): CanvasRenderingContext2D | null => {
    try {
      return canvas.getContext("2d");
    } catch {
      // jsdom has no 2D context unless the `canvas` package is installed. The
      // resize test cares that drawing does not touch the engine, which is a
      // stronger claim when the drawing genuinely runs — but it must not fail to
      // run here, or the test would be proving that nothing happened.
      return null;
    }
  };

  const toPixels = (point: Point): Point => ({
    x: point.x * width,
    y: point.y * height,
  });

  function measure(): void {
    const box = canvas.getBoundingClientRect();
    // jsdom reports a zero box; fall back to the attributes so the geometry is
    // still exercised rather than collapsing to a point.
    width = box.width || canvas.width || 0;
    height = box.height || canvas.height || 0;
    const ratio = view?.devicePixelRatio ?? 1;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const ctx = context();
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function draw(colony: Colony): void {
    last = colony;
    const ctx = context();
    if (!ctx || width === 0 || height === 0) return;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, 0, width, height);

    let peak = 0;
    for (const { edge } of projection.edges) {
      const { home, food } = edgePheromone(colony, edge.a, edge.b);
      peak = Math.max(peak, home, food);
    }
    const scale = peak > 0 ? 1 / peak : 0;

    for (const projected of projection.edges) {
      const a = toPixels(projected.a);
      const b = toPixels(projected.b);
      const shut = projected.edge.closed === true && !colony.shortcutOpen;

      if (shut) {
        drawWall(ctx, a, b, palette);
        continue;
      }

      ctx.strokeStyle = palette.terrain;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      const { home, food } = edgePheromone(colony, projected.edge.a, projected.edge.b);
      const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const nx = (-(b.y - a.y) / length) * 3.5;
      const ny = ((b.x - a.x) / length) * 3.5;

      for (const [tau, hue, side] of [
        [home, palette.home, 1],
        [food, palette.food, -1],
      ] as const) {
        const t = Math.min(1, tau * scale);
        if (t <= 0.004) continue;
        ctx.strokeStyle = `rgba(${hue}, ${(0.12 + 0.88 * t).toFixed(3)})`;
        ctx.lineWidth = 1 + 7 * t;
        ctx.beginPath();
        ctx.moveTo(a.x + nx * side, a.y + ny * side);
        ctx.lineTo(b.x + nx * side, b.y + ny * side);
        ctx.stroke();
      }
    }

    // The tap target, marked once the wall is gone too — the verb toggles both ways.
    const sa = toPixels(shortcut.a);
    const sb = toPixels(shortcut.b);
    ctx.save();
    ctx.strokeStyle = palette.label;
    ctx.globalAlpha = 0.45;
    ctx.setLineDash([2, 5]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Sized to the tap slop, not to the edge: the segment is a quarter of the
    // canvas wide, and a ring that big reads as a diagram, not as a target.
    ctx.arc(
      (sa.x + sb.x) / 2,
      (sa.y + sb.y) / 2,
      TAP_SLOP,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();

    for (const [node, point] of projection.nodes) {
      const p = toPixels(point);
      const terminal = node === fixture.nest || node === fixture.food;
      ctx.fillStyle = terminal ? palette.terminal : palette.terrain;
      ctx.beginPath();
      ctx.arc(p.x, p.y, terminal ? 7 : 3, 0, Math.PI * 2);
      ctx.fill();
      if (terminal) {
        ctx.fillStyle = palette.label;
        ctx.font =
          "500 12px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.fillText(node === fixture.nest ? "nest" : "food", p.x, p.y + 22);
      }
    }

    for (let ant = 0; ant < colony.at.length; ant += 1) {
      const node = fixture.nodes[colony.at[ant] as number];
      const point = projection.nodes.get(node as string);
      if (!point) continue;
      const p = toPixels(point);
      const angle = (ant / colony.at.length) * Math.PI * 2;
      const radius = 6 + (ant % 4) * 3;
      ctx.fillStyle =
        colony.carrying[ant] === 1 ? palette.carrying : palette.seeking;
      ctx.beginPath();
      ctx.arc(
        p.x + Math.cos(angle) * radius,
        p.y + Math.sin(angle) * radius,
        2.2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    ctx.restore();
  }

  const observer =
    view && "ResizeObserver" in view
      ? new view.ResizeObserver(() => {
          measure();
          if (last) draw(last);
        })
      : null;
  observer?.observe(canvas);

  const onWindowResize = (): void => {
    measure();
    if (last) draw(last);
  };
  if (!observer) view?.addEventListener("resize", onWindowResize);

  measure();

  return {
    draw,
    resize: onWindowResize,
    size: () => ({ width, height }),
    hitsShortcut(clientX, clientY) {
      const box = canvas.getBoundingClientRect();
      const here: Point = { x: clientX - box.left, y: clientY - box.top };
      return (
        distanceToSegment(here, toPixels(shortcut.a), toPixels(shortcut.b)) <=
        TAP_SLOP
      );
    },
    setPalette(next) {
      palette = next;
      if (last) draw(last);
    },
    dispose() {
      observer?.disconnect();
      if (!observer) view?.removeEventListener("resize", onWindowResize);
    },
  };
}

/** A gap with a bar across it. No prose says "closed"; this does. */
function drawWall(
  ctx: CanvasRenderingContext2D,
  a: Point,
  b: Point,
  palette: Palette,
): void {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const ux = (b.x - a.x) / length;
  const uy = (b.y - a.y) / length;
  const gap = Math.min(length * 0.42, 26);

  ctx.save();
  ctx.strokeStyle = palette.terrain;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 6]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(mx - ux * gap, my - uy * gap);
  ctx.moveTo(mx + ux * gap, my + uy * gap);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.strokeStyle = palette.wall;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(mx - uy * 13, my + ux * 13);
  ctx.lineTo(mx + uy * 13, my - ux * 13);
  ctx.stroke();
  ctx.restore();
}
