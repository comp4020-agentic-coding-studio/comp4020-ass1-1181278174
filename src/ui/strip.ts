// The trace strip: the same series the tests assert on, drawn.
//
// One line, a 1.0× baseline, and a labelled tick where the shortcut opened. No
// smoothing — any easing would be a lie about the series, and the series is the
// evidence (spec/oracles.md §2: "if the line on screen and the number in the test
// ever disagree, one of them is lying").
//
// Decision 12 (2): the denominator is the CURRENT BFS, so the line steps up the
// moment the wall comes down. That discontinuity is the point — nothing about the
// colony changed, and it is suddenly twice as far from possible as it was a
// moment ago. The tick is labelled so the jump reads as an event, not a glitch.

import type { Reading } from "../sim/reading.ts";
import type { Palette } from "./palette.ts";

export interface StripView {
  draw(series: readonly Reading[], openedAtSample: number | null): void;
  resize(): void;
  setPalette(palette: Palette): void;
}

/** The band the line lives in. 1.0 is the shortest route; nothing goes below it. */
const LOW = 1;
const HIGH = 2.1;

export function createStripView(
  canvas: HTMLCanvasElement,
  initial: Palette,
): StripView {
  const view = canvas.ownerDocument.defaultView;
  let palette = initial;
  let width = 0;
  let height = 0;
  let series: readonly Reading[] = [];
  let opened: number | null = null;

  const context = (): CanvasRenderingContext2D | null => {
    try {
      return canvas.getContext("2d");
    } catch {
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
  }

  function draw(
    next: readonly Reading[] = series,
    openedAtSample: number | null = opened,
  ): void {
    series = next;
    opened = openedAtSample;
    const ctx = context();
    if (!ctx || width === 0 || height === 0) return;

    const y = (ratio: number) =>
      height -
      ((Math.min(HIGH, Math.max(LOW, ratio)) - LOW) / (HIGH - LOW)) * height;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = palette.baseline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y(LOW) - 0.5);
    ctx.lineTo(width, y(LOW) - 0.5);
    ctx.stroke();
    ctx.fillStyle = palette.label;
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "left";
    ctx.fillText("1.0× — the shortest route", 2, y(LOW) - 6);

    // The x axis is samples, not steps: the series is what it is, undecorated.
    const span = Math.max(series.length - 1, 1);
    const x = (i: number) => (i / span) * width;

    if (opened !== null) {
      // The toggle happens BETWEEN samples, so `opened` can be one past the last
      // index — which drew the tick, and its label, off the right-hand edge.
      const at = x(Math.min(opened, series.length - 1));
      ctx.save();
      ctx.strokeStyle = palette.tick;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(at, 0);
      ctx.lineTo(at, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = palette.tick;
      const label = "shortcut opened";
      const right = at + 5 + ctx.measureText(label).width > width;
      ctx.textAlign = right ? "right" : "left";
      ctx.fillText(label, at + (right ? -5 : 5), 12);
      ctx.restore();
    }

    ctx.strokeStyle = palette.line;
    ctx.lineWidth = 1.75;
    ctx.lineJoin = "round";
    ctx.beginPath();
    let started = false;
    series.forEach((sample, i) => {
      if (sample.status !== "ok") {
        // "No reading yet" is not a low reading, so the line breaks rather than
        // dropping to the floor and inventing a crossing.
        started = false;
        return;
      }
      const px = x(i);
      const py = y(sample.ratio as number);
      if (started) ctx.lineTo(px, py);
      else ctx.moveTo(px, py);
      started = true;
    });
    ctx.stroke();
  }

  const observer =
    view && "ResizeObserver" in view
      ? new view.ResizeObserver(() => {
          measure();
          draw();
        })
      : null;
  observer?.observe(canvas);

  measure();

  return {
    draw,
    resize: () => {
      measure();
      draw();
    },
    setPalette(next) {
      palette = next;
      draw();
    },
  };
}
