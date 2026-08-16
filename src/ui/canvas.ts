// The canvas: a pure projection of the field.
//
// It READS the colony and writes pixels. It never steps, never mutates, never
// holds simulation state — so a resize is a redraw and nothing else, which
// spec/canvas.test.ts holds by digesting the engine across one. The only thing
// it remembers between frames is where it last DREW each ant, so a dot can glide
// from one cell to the next instead of hopping; that is display state, derived
// from the colony every frame and never read back into it.
//
// What it draws, and nothing else:
//   · the ground, and the wall and obstacle blocks solid over it
//   · the two scents, as crisp cell tiles — food-scent warm, home-scent cool
//   · four hundred ants, black; the ones carrying food, red (their one bit)
//   · the nest and the food, as discs with their names beneath them
//   · the doorway, drawn as wall with a ring around it, because it is the one
//     thing on the canvas the visitor may touch
//
// Scent is drawn as small squares, one per cell that carries enough of it — a
// trail of marks on the ground rather than a fog over it. Only the cells above
// the floor are drawn, and there are a few hundred of those, not 2208.
//
// Scent is mapped LOGARITHMICALLY from an ABSOLUTE floor — a few passes, in units
// of the fixture's own per-step deposit D — up to whichever is higher: a fixed
// "full road" mark, or the map's current peak. Linear shows one bright cell and a
// blank field: the busiest edge runs four orders of magnitude above quiet ground.
// Log against the peak alone shows the opposite early on — every cell an ant has
// crossed once glows, and the field is a checkerboard. And a fixed ceiling alone
// fails at ρ = 0, where nothing decays and after a minute every cell is "a full
// road". So: nothing below a few passes, a full road at a hundred or so, and when
// the field saturates the strongest line still stands out from the rest.

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
  /** Which cell is under this client point, or null if it is off the field. */
  cellAt(clientX: number, clientY: number): NodeId | null;
  /** Move the keyboard cursor, or hide it. Redraws. */
  setCursor(node: NodeId | null): void;
  cursor(): NodeId | null;
  dispose(): void;
}

/** How close a tap has to be to the doorway, in CSS pixels. Generous: it is small. */
const TAP_SLOP = 28;

/**
 * Scent tiles, in units of the fixture's per-step deposit D. Below `low` passes a
 * cell is not drawn at all; at `high` passes — or at the map's current peak,
 * whichever is higher — it is a full road; `gamma` shapes the ramp between (in log
 * space) and `alpha` caps it. The food-scent is the road, so it is the stronger of
 * the two; the home-scent is fainter and cool, and it shows where the explorers
 * have been.
 */
const FOOD_TILES = { low: 2.5, high: 120, gamma: 1.2, alpha: 0.8 } as const;
const HOME_TILES = { low: 1.5, high: 250, gamma: 1.3, alpha: 0.5 } as const;
/** A tile is this fraction of its cell, centred — marks, with ground between them. */
const TILE = 0.62;
/** Alpha is quantised, so a frame builds a handful of colour strings, not hundreds. */
const ALPHA_STEPS = 12;

/**
 * Where an ant is drawn inside its cell, and how it gets there. Every ant has its
 * own stable offset (so four hundred in a crowd read as a crowd, not as one dot),
 * and its drawn position eases toward the cell it is really in — half the
 * remaining distance each frame — so motion reads as a flow rather than a hop.
 * A jump larger than `SNAP` cells is a reset, not a step, and is not eased.
 */
const JITTER = 0.84;
const EASE = 0.5;
const SNAP = 4;

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
  readonly hasGap: boolean;
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
    hasGap: count > 0,
  };
}

/** A stable pseudo-random offset in (−0.5, 0.5) per ant and axis. Not the PRNG: rendering only. */
function jitter(ant: number, axis: 0 | 1): number {
  let h = Math.imul(ant + 1, 0x9e3779b1) ^ (axis === 0 ? 0x85ebca6b : 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  h ^= h >>> 15;
  return ((h >>> 0) / 4294967296 - 0.5) * JITTER;
}

function rgb(triple: string): readonly [number, number, number] {
  const [r, g, b] = triple.split(",").map(Number);
  return [r ?? 0, g ?? 0, b ?? 0];
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
  /** One ant, one step, fresh from its source: the unit the tiles are scaled in. */
  const D = fixture.params.depositPerStep ?? 1;
  const swatch = (colour: readonly [number, number, number]): readonly string[] =>
    Array.from(
      { length: ALPHA_STEPS + 1 },
      (_, i) =>
        `rgba(${colour[0]}, ${colour[1]}, ${colour[2]}, ${(i / ALPHA_STEPS).toFixed(3)})`,
    );
  const foodSwatch = swatch(rgb(palette.foodScent));
  const homeSwatch = swatch(rgb(palette.homeScent));

  let width = 0;
  let height = 0;
  /** The field's box inside the canvas: letterboxed, so cells stay square. */
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;
  let last: Colony | null = null;
  let cursorAt: NodeId | null = null;

  /** Where each ant was last drawn, in cell units. Display state only. */
  let drawnFor: Colony | null = null;
  let drawnX = new Float32Array(0);
  let drawnY = new Float32Array(0);

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

  /** Draw one map as tiles: log-scaled between `low` and `high` passes, quantised. */
  function paintTiles(
    ctx: CanvasRenderingContext2D,
    scent: Float64Array,
    peak: number,
    colours: readonly string[],
    tiles: {
      readonly low: number;
      readonly high: number;
      readonly gamma: number;
      readonly alpha: number;
    },
  ): void {
    const low = tiles.low * D;
    const from = Math.log1p(low);
    const span = Math.log1p(Math.max(tiles.high * D, peak)) - from || 1;
    const size = scale * TILE;
    const pad = (scale - size) / 2;
    let current = -1;
    for (let cell = 0; cell < cells; cell += 1) {
      if (grid.open[cell] !== 1) continue;
      const value = scent[cell] as number;
      if (value <= low) continue;
      const lifted = Math.pow(
        Math.min(1, (Math.log1p(value) - from) / span),
        tiles.gamma,
      );
      const step = Math.round(Math.min(1, lifted) * tiles.alpha * ALPHA_STEPS);
      if (step <= 0) continue;
      if (step !== current) {
        current = step;
        ctx.fillStyle = colours[step] as string;
      }
      ctx.fillRect(
        px(cell % grid.columns) + pad,
        py(Math.floor(cell / grid.columns)) + pad,
        size,
        size,
      );
    }
  }

  function paintScents(ctx: CanvasRenderingContext2D, colony: Colony): void {
    foodScent.fill(0);
    homeScent.fill(0);
    let foodPeak = 0;
    let homePeak = 0;
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
      if (f > foodPeak) foodPeak = f;
      if (h > homePeak) homePeak = h;
    }
    // Cool under warm: where both are strong the road wins.
    paintTiles(ctx, homeScent, homePeak, homeSwatch, HOME_TILES);
    paintTiles(ctx, foodScent, foodPeak, foodSwatch, FOOD_TILES);
  }

  /** Ease every ant's drawn position toward the cell it is really in. */
  function settleAnts(colony: Colony): void {
    const count = colony.at.length;
    const fresh = drawnFor !== colony || drawnX.length !== count;
    if (fresh) {
      drawnX = new Float32Array(count);
      drawnY = new Float32Array(count);
      drawnFor = colony;
    }
    for (let ant = 0; ant < count; ant += 1) {
      const cell = grid.cellOf[colony.at[ant] as number] as number;
      if (cell < 0) continue;
      const tx = (cell % grid.columns) + 0.5 + jitter(ant, 0);
      const ty = Math.floor(cell / grid.columns) + 0.5 + jitter(ant, 1);
      const dx = tx - (drawnX[ant] as number);
      const dy = ty - (drawnY[ant] as number);
      if (fresh || Math.abs(dx) > SNAP || Math.abs(dy) > SNAP) {
        drawnX[ant] = tx;
        drawnY[ant] = ty;
      } else {
        drawnX[ant] = (drawnX[ant] as number) + dx * EASE;
        drawnY[ant] = (drawnY[ant] as number) + dy * EASE;
      }
    }
  }

  function draw(colony: Colony): void {
    last = colony;
    settleAnts(colony);
    const ctx = context();
    if (!ctx || width === 0 || height === 0) return;

    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = palette.ground;
    ctx.fillRect(0, 0, width, height);

    paintScents(ctx, colony);

    // Walls and blocks, solid, over the scent — nothing seeps through them.
    ctx.fillStyle = palette.blocked;
    for (let y = 0; y < grid.rows; y += 1) {
      let run = 0;
      for (let x = 0; x <= grid.columns; x += 1) {
        const cell = y * grid.columns + x;
        const solid =
          x < grid.columns &&
          (grid.open[cell] !== 1 ||
            (grid.gap[cell] === 1 && !colony.shortcutOpen) ||
            colony.drawnWalls.has(`${x},${y}`));
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

    // Faint cell lines inside the blocks, so a block reads as made of the same
    // cells the ants walk on rather than as a shape pasted over them. Skipped
    // below ~4px a cell, where the lines would be most of the block.
    if (scale >= 4) {
      ctx.save();
      ctx.strokeStyle = palette.ground;
      ctx.globalAlpha = 0.16;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = 0; y < grid.rows; y += 1) {
        for (let x = 0; x < grid.columns; x += 1) {
          const cell = y * grid.columns + x;
          const solid =
            grid.open[cell] !== 1 ||
            (grid.gap[cell] === 1 && !colony.shortcutOpen) ||
            colony.drawnWalls.has(`${x},${y}`);
          if (!solid) continue;
          ctx.moveTo(px(x), py(y));
          ctx.lineTo(px(x + 1), py(y));
          ctx.moveTo(px(x), py(y));
          ctx.lineTo(px(x), py(y + 1));
        }
      }
      ctx.stroke();
      ctx.restore();
    }

    // The nest and the food: a disc the size of its 3×3 zone, named beneath it.
    const disc = (cellFlags: Uint8Array, colour: string, name: string) => {
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
      const cx = px(sumX / count);
      const cy = py(sumY / count);
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.arc(cx, cy, scale * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = palette.ink;
      ctx.font = `${Math.max(10, Math.round(scale * 0.75))}px system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(name, cx, cy + scale * 1.8);
    };
    disc(grid.nest, palette.nest, "nest");
    disc(grid.food, palette.food, "food");

    // The ants. A small dot each; black while searching, red while carrying food
    // — the one bit they hold, made visible. Two passes, so the fill style
    // changes twice a frame rather than four hundred times.
    //
    // Decision 22 (7): 4-5 px across at 1920, never under 2 px at 390. Fixed in
    // PIXELS, not in cells — proportional sizing gave 12 px blobs at 1920 and
    // the ants stopped reading as ants.
    const radius = Math.max(1.05, Math.min(2.5, scale * 0.3));
    for (const [carrying, colour] of [
      [0, palette.ant],
      [1, palette.carrier],
    ] as const) {
      ctx.fillStyle = colour;
      ctx.beginPath();
      for (let ant = 0; ant < colony.at.length; ant += 1) {
        if ((colony.carrying[ant] as number) !== carrying) continue;
        if ((grid.cellOf[colony.at[ant] as number] as number) < 0) continue;
        const x = px(drawnX[ant] as number);
        const y = py(drawnY[ant] as number);
        ctx.moveTo(x + radius, y);
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // The tap target, on a fixture that has one. v4 has no doorway — the verb
    // becomes drawing walls — so there is nothing here to ring.
    if (grid.hasGap) {
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
    }

    // The keyboard cursor, drawn last so nothing covers it. Only visible while
    // the visitor is using the keyboard — a pointer user never sees it.
    if (cursorAt) {
      const spot = fixture.cells?.get(cursorAt);
      if (spot) {
        ctx.save();
        ctx.strokeStyle = palette.gapRing;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          px(spot[0]) + 1,
          py(spot[1]) + 1,
          Math.max(3, scale - 2),
          Math.max(3, scale - 2),
        );
        ctx.restore();
      }
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
    cellAt(clientX, clientY) {
      if (scale <= 0) return null;
      const box = canvas.getBoundingClientRect();
      const x = Math.floor((clientX - box.left - offsetX) / scale);
      const y = Math.floor((clientY - box.top - offsetY) / scale);
      if (x < 0 || y < 0 || x >= grid.columns || y >= grid.rows) return null;
      return `${x},${y}`;
    },
    setCursor(node) {
      cursorAt = node;
      if (last) draw(last);
    },
    cursor: () => cursorAt,
    hitsGap(clientX, clientY) {
      if (!grid.hasGap) return false;
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
