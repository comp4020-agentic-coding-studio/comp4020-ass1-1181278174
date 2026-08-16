// The canvas is a projection, and a resize is a redraw.
//
// The rubric names "a resize mid-interaction" explicitly, and the failure mode it
// is looking for is a page that rebuilds its state when the box changes — a
// colony restarted, a trail lost, a reading reset, in front of the visitor. The
// test that catches that is not a screenshot: it is the engine's own digest,
// taken across a resize that really happened.

import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import type { Colony } from "../src/sim/engine.ts";
import * as engine from "../src/sim/engine.ts";
import { RHO } from "../src/sim/rho.ts";
import { createCanvasView } from "../src/ui/canvas.ts";
import { DARK } from "../src/ui/palette.ts";
import {
  distanceToSegment,
  project,
  shortcutEdge,
} from "../src/ui/projection.ts";

const SEED = 1;
const STEPS = 600;
const RESIZE_AT = 300;

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
  const dom = new JSDOM(`<!doctype html><canvas id="c"></canvas>`, {
    pretendToBeVisual: true,
  });
  StubResizeObserver.instances = [];
  const window = dom.window as unknown as {
    ResizeObserver: unknown;
    devicePixelRatio: number;
  };
  window.ResizeObserver = StubResizeObserver;
  const canvas = dom.window.document.getElementById(
    "c",
  ) as unknown as HTMLCanvasElement;
  // jsdom does no layout, so the box has to be declared. This is also what makes
  // the resize below observable: the numbers change because we change them.
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

describe("the canvas is a projection of a fixed logical graph", () => {
  const projection = project(DOUBLE_BRIDGE);

  it("places every node inside the unit square", () => {
    expect(projection.nodes.size).toBe(DOUBLE_BRIDGE.nodes.length);
    for (const [node, point] of projection.nodes) {
      expect(point.x, `${node}.x`).toBeGreaterThanOrEqual(0);
      expect(point.x, `${node}.x`).toBeLessThanOrEqual(1);
      expect(point.y, `${node}.y`).toBeGreaterThanOrEqual(0);
      expect(point.y, `${node}.y`).toBeLessThanOrEqual(1);
    }
  });

  it("draws the long way longer than the short way", () => {
    // Beat 2 has to be legible without prose, and both branches join the same two
    // points — so if the drawn lengths were equal the picture would contradict
    // the claim while every number stayed green.
    const drawn = (branch: readonly string[]) =>
      branch.slice(1).reduce((total, node, i) => {
        const a = projection.nodes.get(branch[i] as string);
        const b = projection.nodes.get(node);
        return total + Math.hypot((b?.x ?? 0) - (a?.x ?? 0), (b?.y ?? 0) - (a?.y ?? 0));
      }, 0);
    expect(drawn(DOUBLE_BRIDGE.branches.long)).toBeGreaterThan(
      drawn(DOUBLE_BRIDGE.branches.short) * 1.4,
    );
  });

  it("puts the tap target on the one segment the visitor may toggle", () => {
    const target = shortcutEdge(projection);
    expect(target.edge.shortcut).toBe(true);
    expect(target.edge.closed).toBe(true);
    const middle = {
      x: (target.a.x + target.b.x) / 2,
      y: (target.a.y + target.b.y) / 2,
    };
    // Nearer to the shortcut than to anything else, or the verb is ambiguous.
    const others = projection.edges
      .filter((candidate) => candidate.index !== target.index)
      .map((candidate) => distanceToSegment(middle, candidate.a, candidate.b));
    expect(distanceToSegment(middle, target.a, target.b)).toBeLessThan(
      Math.min(...others),
    );
  });
});

describe("a resize mid-run only redraws", () => {
  /** The same seeded run every time; the callback is the only thing that varies. */
  const run = (onStep?: (colony: Colony, step: number) => void): string => {
    const colony = engine.createColony(DOUBLE_BRIDGE, {
      rho: RHO.default,
      seed: SEED,
    });
    for (let i = 0; i < STEPS; i += 1) {
      engine.step(colony);
      onStep?.(colony, i);
    }
    return engine.digest(colony);
  };

  it("leaves the engine byte-identical across a resize it really performed", () => {
    const page = pageWithCanvas(900, 500);
    const view = createCanvasView(page.canvas, DOUBLE_BRIDGE, DARK);
    const before = view.size();

    const withResize = run((colony, i) => {
      // Drawn every step, exactly as the page draws it.
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

    // No drawing at all, no resize at all — the run the engine would have had.
    expect(withResize).toBe(run());

    view.dispose();
  });

  it("hit-tests the wall against the box it currently has", () => {
    const page = pageWithCanvas(900, 500);
    const view = createCanvasView(page.canvas, DOUBLE_BRIDGE, DARK);
    const target = shortcutEdge(project(DOUBLE_BRIDGE));
    const centre = {
      x: ((target.a.x + target.b.x) / 2) * 900,
      y: ((target.a.y + target.b.y) / 2) * 500,
    };
    expect(view.hitsShortcut(centre.x, centre.y)).toBe(true);
    // The nest is nowhere near it, or the single verb would fire on any tap.
    expect(view.hitsShortcut(0.08 * 900, 0.62 * 500)).toBe(false);
    view.dispose();
  });
});
