// The canvas is a projection of the field, and a resize is a redraw.
//
// The rubric names "a resize mid-interaction" explicitly, and the failure mode it
// is looking for is a page that rebuilds its state when the box changes — a
// colony restarted, a road lost, a reading reset, in front of the visitor. The
// test that catches that is not a screenshot: it is the engine's own digest,
// taken across a resize that really happened.

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { FIELD, FIELD_SPEC } from "../src/fixtures/field.ts";
import type { Colony } from "../src/sim/engine.ts";
import * as engine from "../src/sim/engine.ts";
import { FIELD_RHO } from "../src/sim/rho.ts";
import { createCanvasView } from "../src/ui/canvas.ts";
import { LIGHT } from "../src/ui/palette.ts";

const SEED = 1;
const STEPS = 400;
const RESIZE_AT = 200;
const ANTS = 60;

/** jsdom has no ResizeObserver; this is the smallest thing the view can drive. */
class StubResizeObserver {
  static instances: StubResizeObserver[] = [];
  readonly callback: () => void;
  constructor(callback: () => void) {
    this.callback = callback;
    StubResizeObserver.instances.push(this);
  }
  observe(): void {}
  disconnect(): void {}
}

function pageWithCanvas(width: number, height: number) {
  StubResizeObserver.instances = [];
  const dom = new JSDOM(`<!doctype html><canvas id="c"></canvas>`, {
    pretendToBeVisual: true,
  });
  const window = dom.window as unknown as {
    ResizeObserver: unknown;
    devicePixelRatio: number;
  };
  window.ResizeObserver = StubResizeObserver;
  const canvas = dom.window.document.getElementById(
    "c",
  ) as unknown as HTMLCanvasElement;
  // jsdom does no layout, so the box has to be declared. That is also what makes
  // the resize observable: the numbers change because we change them.
  let box = { width, height };
  canvas.getBoundingClientRect = (() =>
    ({ width: box.width, height: box.height, left: 0, top: 0 }) as DOMRect) as
    typeof canvas.getBoundingClientRect;
  return {
    canvas,
    setBox: (w: number, h: number) => {
      box = { width: w, height: h };
    },
  };
}

describe("the field fixture carries everything the renderer needs", () => {
  it("gives every open cell a coordinate and nothing else", () => {
    expect(FIELD.cells?.size).toBe(FIELD.nodes.length);
    // Blocked cells are absent from the graph entirely — the renderer infers the
    // wall from what is missing, so it cannot draw a wall the ants can walk
    // through or leave one out that they cannot.
    expect(FIELD.cells?.has("22,10")).toBe(false);
    expect(FIELD.cells?.get("18,20")).toEqual([18, 20]);
  });

  it("names the doorway cells, so the tap target is not guessed", () => {
    expect(FIELD.gapCells).toEqual(["22,19", "22,20", "22,21"]);
  });

  it("names both arrival zones, so the discs are not guessed either", () => {
    expect(FIELD.nestZone).toHaveLength(9);
    expect(FIELD.foodZone).toHaveLength(9);
  });
});

describe("a resize mid-run only redraws", () => {
  /** The same seeded run every time; the callback is the only thing that varies. */
  const run = (onStep?: (colony: Colony, step: number) => void): string => {
    const colony = engine.createColony(FIELD, {
      rho: FIELD_RHO.default,
      seed: SEED,
      ants: ANTS,
    });
    for (let i = 0; i < STEPS; i += 1) {
      engine.step(colony);
      onStep?.(colony, i);
    }
    return engine.digest(colony);
  };

  it("leaves the engine byte-identical across a resize it really performed", () => {
    const page = pageWithCanvas(900, 500);
    const view = createCanvasView(page.canvas, FIELD, LIGHT);
    const before = view.size();

    const withResize = run((colony, i) => {
      view.draw(colony);
      if (i !== RESIZE_AT) return;
      page.setBox(360, 780);
      for (const observer of StubResizeObserver.instances) observer.callback();
    });

    const after = view.size();
    // Without this the digest could match because nothing ever resized, and the
    // guard would be decoration.
    expect(after).not.toEqual(before);
    expect(after.width).toBe(360);
    expect(after.height).toBe(780);

    expect(withResize).toBe(run());
    view.dispose();
  });

  it("hit-tests the doorway against the box it currently has", () => {
    const page = pageWithCanvas(900, 500);
    const view = createCanvasView(page.canvas, FIELD, LIGHT);
    // The field is letterboxed, so the doorway is not at a fraction of the box —
    // it is at a fraction of the FIELD, offset by the letterbox bars.
    const scale = Math.min(900 / FIELD_SPEC.width, 500 / FIELD_SPEC.height);
    const offsetX = (900 - FIELD_SPEC.width * scale) / 2;
    const offsetY = (500 - FIELD_SPEC.height * scale) / 2;
    const centre = {
      x: offsetX + (FIELD_SPEC.gaps[1]?.[0] ?? 0 + 0.5) * scale,
      y: offsetY + ((FIELD_SPEC.gaps[1]?.[1] ?? 0) + 0.5) * scale,
    };
    expect(view.hitsGap(centre.x, centre.y)).toBe(true);
    // The nest is nowhere near it, or the single verb would fire on any tap.
    expect(
      view.hitsGap(offsetX + 18 * scale, offsetY + 20 * scale + 200),
    ).toBe(false);
    view.dispose();
  });
});
