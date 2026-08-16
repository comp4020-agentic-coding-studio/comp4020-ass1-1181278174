// The canvas is a projection of the field, and a resize is a redraw.
//
// The rubric names "a resize mid-interaction" explicitly, and the failure mode it
// is looking for is a page that rebuilds its state when the box changes — a
// colony restarted, a road lost, a reading reset, in front of the visitor. The
// test that catches that is not a screenshot: it is the engine's own digest,
// taken across a resize that really happened.

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { FIELD_V4 } from "../src/fixtures/field-v4.ts";
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
    expect(FIELD_V4.cells?.size).toBe(FIELD_V4.nodes.length);
    // Blocked cells are absent from the graph entirely — the renderer infers a
    // block from what is missing, so it cannot draw ground the ants cannot walk
    // on, or leave out ground they can.
    expect(FIELD_V4.cells?.has("10,34")).toBe(false);
    expect(FIELD_V4.cells?.get("6,20")).toEqual([6, 20]);
  });

  it("names both arrival zones, so the discs are not guessed", () => {
    expect(FIELD_V4.nestZone).toHaveLength(9);
    expect(FIELD_V4.foodZone).toHaveLength(9);
  });
});

describe("a resize mid-run only redraws", () => {
  /** The same seeded run every time; the callback is the only thing that varies. */
  const run = (onStep?: (colony: Colony, step: number) => void): string => {
    const colony = engine.createColony(FIELD_V4, {
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
    const view = createCanvasView(page.canvas, FIELD_V4, LIGHT);
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

  it("reports no tap target anywhere, because v4 has no doorway", () => {
    // The verb becomes drawing walls (Decision 22, turn B). Until then there is
    // nothing on this canvas to touch, and `hitsGap` must say so everywhere
    // rather than ringing a doorway at the origin.
    const page = pageWithCanvas(900, 500);
    const view = createCanvasView(page.canvas, FIELD_V4, LIGHT);
    for (const [x, y] of [
      [0, 0],
      [450, 250],
      [899, 499],
    ] as const) {
      expect(view.hitsGap(x, y), `${x},${y} should not be a target`).toBe(false);
    }
    view.dispose();
  });
});
