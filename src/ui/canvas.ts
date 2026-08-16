// The canvas: a pure projection of the field.
//
// It READS the colony and writes pixels. It never steps, never mutates, never
// holds simulation state — so a resize is a redraw and nothing else, which
// spec/canvas.test.ts holds by digesting the engine across one.
//
// What it draws, and nothing else:
//   · the ground, and the wall and obstacle blocks solid over it
//   · the two scents, as a glow — food-scent warm, home-scent fainter and cool
//   · four hundred ants, black, one dot each
//   · the nest and the food, as discs
//   · the doorway, drawn as wall with a ring around it, because it is the one
//     thing on the canvas the visitor may touch
//
// The glow is rendered into a 60×40 offscreen image — one pixel per cell — and
// scaled up with the browser's own smoothing. Drawing 2185 rounded rectangles a
// frame would cost far more and look worse: the smoothing is what makes a row of
// cells read as a road rather than as a row of cells.
//
// Scent is mapped LOGARITHMICALLY. Linear was tried on the ASCII maps and is
// useless here: the busiest edge runs four orders of magnitude above quiet
// ground, so a linear ramp shows one bright cell and a black field.

import type { Fixture, NodeId } from "../fixtures/double-bridge.ts";
import type { Colony } from "../sim/engine.ts";
import type { Palette } from "./palette.ts";

export interface CanvasView {
  /** Redraw from the colony as it stands. Safe to call at any time. */
  draw(colony: Colony): void;
  /** Recompute the backing store from the element's box, then redraw. */
  resize(): void;
  /** CSS pixels, so a test can prove a resize actually happened. */
  size(): { readonly width: number; readonly height: number };
  /** Did this client point land on the doorway? The one verb's target. */
  hitsGap(clientX: number, clientY: number): boolean;
  dispose(): void;
}

/** How close a tap has to be to the doorway, in CSS pixels. Generous: it is small. */
const TAP_SLOP = 28;

interface Grid {
  readonly columns: number;
  readonly rows: number;
  /** Cell index per node index, so the per-step loop never parses a string. */
  readonly cellOf: Int32Array;
  readonly open: Uint8Array;
  readonly gap: Uint8Array;
  readonly nest: Uint8Array;
  readonly food: Uint8Array;
  /** Cell index for each end of every edge, in fixture.edges order. */
  readonly edgeA: Int32Array;
  readonly edgeB: Int32Array;
  readonly gapCentre: { readonly x: number; readonly y: number };
}

function gridOf(fixture: Fixture): Grid {
  const cells = fixture.cells;
  if (!cells) throw new Error(`${fixture.name} has no coordinates to draw`);
  let columns = 0;
  let rows = 0;
  for (const [x, y] of cells.values()) {
    columns = Math.max(columns, x + 1);
    rows = Math.max(rows, y + 1);
  }
  const size = columns * rows;
  const at = (node: NodeId): number => {
    const cell = cells.get(node);
    return cell ? cell[1] * columns + cell[0] : -1;
  };

  const open = new Uint8Array(size);
  const gap = new Uint8Array(size);
  const nest = new Uint8Array(size);
  const food = new Uint8Array(size);
  const cellOf = new Int32Array(fixture.nodes.length).fill(-1);
  fixture.nodes.forEach((node, i) => {
    const cell = at(node);
    cellOf[i] = cell;
    if (cell >= 0) open[cell] = 1;
  });
  for (const node of fixture.gapCells ?? []) {
    const cell = at(node);
    if (cell >= 0) gap[cell] = 1;
  }
  for (const node of fixture.nestZone ?? [fixture.nest]) {
    const cell = at(node);
    if (cell >= 0) nest[cell] = 1;
  }
  for (const node of fixture.foodZone ?? [fixture.food]) {
    const cell = at(node);
    if (cell >= 0) food[cell] = 1;
  }

  const edgeA = new Int32Array(fixture.edges.length);
  const edgeB = new Int32Array(fixture.edges.length);
  fixture.edges.forEach((edge, e) => {
    edgeA[e] = at(edge.a);
    edgeB[e] = at(edge.b);
  });

  let sumX = 0;
  let sumY = 0;
  let count = 0;
  for (const node of fixture.gapCells ?? []) {
    const cell = cells.get(node);
    if (!cell) continue;
    sumX += cell[0] + 0.5;
    sumY += cell[1] + 0.5;
    count += 1;
  }

  return {
    columns,
    rows,
    cellOf,
    open,
    gap,
    nest,
    food,
    edgeA,
    edgeB,
    gapCentre: {
      x: count === 0 ? 0 : sumX / count,
      y: count === 0 ? 0 : sumY / count,
    },
  };
}

export function createCanvasView(
  canvas: HTMLCanvasElement,
  fixture: Fixture,
  palette: Palette,
): CanvasView {
  const view = canvas.ownerDocument.defaultView;
  const grid = gridOf(fixture);
  const cells = grid.columns * grid.rows;
  const foodScent = new Float64Array(cells);
  const homeScent = new Float64Array(cells);

  let width = 0;
  let height = 0;
  /** The field's box inside the canvas: letterboxed, so cells stay square. */
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let last: Colony | null = null;

  const context = (): CanvasRenderingContext2D | null => {
    try {
      return canvas.getContext("2d");
    } catch {
      // jsdom has no 2D context unless the `canvas` package is installed. The
      // resize test cares that drawing does not touch the engine, a stronger
      // claim when the drawing genuinely runs — but it must not fail to run, or
      // the test would prove only that nothing happened.
      return null;
    }
  };

  /** One pixel per cell, scaled up by the browser. Rebuilt when the box changes. */
  let glow: ImageData | null = null;
  let glowCanvas: HTMLCanvasElement | null = null;

  function ensureGlow(): CanvasRenderingContext2D | null {
    if (!glowCanvas) {
      glowCanvas = canvas.ownerDocument.createElement("canvas");
      glowCanvas.width = grid.columns;
      glowCanvas.height = grid.rows;
    }
    try {
      const ctx = glowCanvas.getContext("2d");
      if (ctx && !glow) glow = ctx.createImageData(grid.columns, grid.rows);
      return ctx;
    } catch {
      return null;
    }
  }

  function measure(): void {
    const box = canvas.getBoundingClientRect();
    width = box.width || canvas.width || 0;
    height = box.height || canvas.height || 0;
    const ratio = view?.devicePixelRatio ?? 1;
    canvas.width = Math.max(1, Math.round(width * ratio));
    canvas.height = Math.max(1, Math.round(height * ratio));
    const ctx = context();
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    // Letterbox rather than stretch: a stretched grid makes square cells into
    // rectangles and the ants into ovals at one viewport and not the other.
    scale = Math.min(width / grid.columns, height / grid.rows);
    offsetX = (width - grid.columns * scale) / 2;
    offsetY = (height - grid.rows * scale) / 2;
  }

  const px = (x: number) => offsetX + x * scale;
  const py = (y: number) => offsetY + y * scale;

  function paintScents(colony: Colony): void {
    foodScent.fill(0);
    homeScent.fill(0);
    let peak = 0;
    for (let e = 0; e < grid.edgeA.length; e += 1) {
      const a = grid.edgeA[e] as number;
      const b = grid.edgeB[e] as number;
      if (a < 0 || b < 0) continue;
      const f = colony.foodTrail[e] as number;
      const h = colony.home[e] as number;
      // An edge's scent belongs to both cells it joins — that is what makes a
      // line of cells read as one continuous road.
      if (f > (foodScent[a] as number)) foodScent[a] = f;
      if (f > (foodScent[b] as number)) foodScent[b] = f;
      if (h > (homeScent[a] as number)) homeScent[a] = h;
      if (h > (homeScent[b] as number)) homeScent[b] = h;
      if (f > peak) peak = f;
      if (h > peak) peak = h;
    }

    const ctx = ensureGlow();
    if (!ctx || !glow) return;
    const data = glow.data;
    const top = Math.log1p(peak) || 1;
    const [fr, fg, fb] = palette.foodScent.split(",").map(Number) as [
      number,
      number,
      number,
    ];
    const [hr, hg, hb] = palette.homeScent.split(",").map(Number) as [
      number,
      number,
      number,
    ];

    for (let cell = 0; cell < cells; cell += 1) {
      const at = cell * 4;
      if (grid.open[cell] !== 1) {
        data[at + 3] = 0;
        continue;
      }
      // Gamma on top of the log. The log alone still leaves the road's own glow
      // dim: with D = 20 the peak is far above everything, so mid-scent cells
      // land near zero and the road reads as a line of ants on bare ground
      // rather than as a road. 0.55 lifts the mid-tones without inventing scent
      // where there is none — zero is still zero.
      const f = Math.pow(Math.log1p(foodScent[cell] as number) / top, 0.55);
      const h = Math.pow(Math.log1p(homeScent[cell] as number) / top, 0.55);
      // The warm one is the road, so it wins where they overlap; the cool one is
      // deliberately fainter, at a third of the alpha for the same strength.
      const alpha = Math.min(1, f + h * 0.34);
      if (alpha <= 0.002) {
        data[at + 3] = 0;
        continue;
      }
      const warm = f / (f + h * 0.34 || 1);
      data[at] = Math.round(fr * warm + hr * (1 - warm));
      data[at + 1] = Math.round(fg * warm + hg * (1 - warm));
      data[at + 2] = Math.round(fb * warm + hb * (1 - warm));
      data[at + 3] = Math.round(alpha * 235);
    }
    ctx.putImageData(glow, 0, 0);
  }

  function draw(colony: Colony): void {
    last = colony;
    const ctx = context();
    if (!ctx || width === 0 || height === 0) return;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, 0, width, height);

    paintScents(colony);
    if (glowCanvas && scale > 0) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        glowCanvas,
        offsetX,
        offsetY,
        grid.columns * scale,
        grid.rows * scale,
      );
    }

    // Walls and blocks, solid, over the glow — nothing seeps through them.
    ctx.fillStyle = palette.blocked;
    for (let y = 0; y < grid.rows; y += 1) {
      let run = 0;
      for (let x = 0; x <= grid.columns; x += 1) {
        const cell = y * grid.columns + x;
        const solid =
          x < grid.columns &&
          (grid.open[cell] !== 1 ||
            (grid.gap[cell] === 1 && !colony.shortcutOpen));
        if (solid) {
          run += 1;
          continue;
        }
        if (run > 0) {
          // Run-length: a 37-cell wall is one rectangle, not 37.
          ctx.fillRect(px(x - run), py(y), run * scale + 0.5, scale + 0.5);
          run = 0;
        }
      }
    }

    const disc = (cellFlags: Uint8Array, colour: string) => {
      let sumX = 0;
      let sumY = 0;
      let count = 0;
      for (let cell = 0; cell < cells; cell += 1) {
        if (cellFlags[cell] !== 1) continue;
        sumX += (cell % grid.columns) + 0.5;
        sumY += Math.floor(cell / grid.columns) + 0.5;
        count += 1;
      }
      if (count === 0) return;
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(px(sumX / count), py(sumY / count), scale * 1.9, 0, Math.PI * 2);
      ctx.fill();
    };
    disc(grid.nest, palette.nest);
    disc(grid.food, palette.food);

    // The ants. A dot each, black, with a deterministic sub-cell offset so four
    // hundred of them in a crowd read as a crowd rather than as one dot.
    ctx.fillStyle = palette.ant;
    const radius = Math.max(1.05, scale * 0.3);
    for (let ant = 0; ant < colony.at.length; ant += 1) {
      const cell = grid.cellOf[colony.at[ant] as number] as number;
      if (cell < 0) continue;
      const jitterX = ((ant * 7) % 5) / 5 - 0.4;
      const jitterY = ((ant * 11) % 5) / 5 - 0.4;
      ctx.beginPath();
      ctx.arc(
        px((cell % grid.columns) + 0.5 + jitterX * 0.6),
        py(Math.floor(cell / grid.columns) + 0.5 + jitterY * 0.6),
        radius,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }

    // The tap target. The one thing on this canvas the visitor may touch, so it
    // is marked whether the doorway is open or shut — the verb toggles both ways.
    ctx.save();
    ctx.strokeStyle = palette.gapRing;
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(
      px(grid.gapCentre.x),
      py(grid.gapCentre.y),
      Math.max(14, scale * 3.4),
      0,
      Math.PI * 2,
    );
    ctx.stroke();
    ctx.restore();

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
    hitsGap(clientX, clientY) {
      const box = canvas.getBoundingClientRect();
      return (
        Math.hypot(
          clientX - box.left - px(grid.gapCentre.x),
          clientY - box.top - py(grid.gapCentre.y),
        ) <= Math.max(TAP_SLOP, scale * 3.4)
      );
    },
    dispose() {
      observer?.disconnect();
      if (!observer) view?.removeEventListener("resize", onWindowResize);
    },
  };
}
