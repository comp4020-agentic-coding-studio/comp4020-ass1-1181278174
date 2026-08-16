// The page. Slice 3 renders the argument; the controls arrive in slice 4 and the
// prose in slice 5, so what is here is the canvas, the reading and the trace.
//
// The engine runs on the main thread behind a fixed-step accumulator (Decision 12
// (3)) — the frame clock never reaches `step()`, so the page advances the
// simulation exactly as the headless tests do.

import { DOUBLE_BRIDGE } from "./src/fixtures/double-bridge.ts";
import { induce } from "./src/fixtures/graph.ts";
import { shortestPathLength } from "./src/oracle/bfs.ts";
import * as engine from "./src/sim/engine.ts";
import type { Colony } from "./src/sim/engine.ts";
import type { Reading } from "./src/sim/reading.ts";
import { READING_WINDOW, reading } from "./src/sim/reading.ts";
import { RHO, SAMPLE } from "./src/sim/rho.ts";
import { createCanvasView } from "./src/ui/canvas.ts";
import { createLoop } from "./src/ui/loop.ts";
import { DARK } from "./src/ui/palette.ts";
import type { Palette } from "./src/ui/palette.ts";
import { createStripView } from "./src/ui/strip.ts";

const FIXTURE = DOUBLE_BRIDGE;
const STEPS_PER_SECOND = 90;
/** The readout is aria-live; announcing every frame would be unusable. */
const ANNOUNCE_MS = 1500;

const el = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const stage = el<HTMLCanvasElement>("stage");
const stripCanvas = el<HTMLCanvasElement>("strip");
const readout = el("readout");
const note = el("readout-note");

const palette: Palette = DARK;

const reduceMotion =
  globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

let colony: Colony = engine.createColony(FIXTURE, {
  rho: RHO.default,
  seed: 1,
});
let series: Reading[] = [];
let openedAtSample: number | null = null;
let announcedAt = 0;

const canvas = createCanvasView(stage, FIXTURE, palette);
const strip = createStripView(stripCanvas, palette);

const bfsNow = (): number =>
  shortestPathLength(
    induce(FIXTURE, { openShortcut: colony.shortcutOpen }),
    FIXTURE.nest,
    FIXTURE.food,
  ) as number;

const readNow = (): Reading =>
  reading(engine.completedTripLengths(colony), bfsNow(), READING_WINDOW);

function step(): void {
  engine.step(colony);
  // The same grid spec/core-interaction.test.ts samples on: one series, not two.
  if (colony.steps % SAMPLE === 0) series.push(readNow());
}

function render(): void {
  canvas.draw(colony);
  strip.draw(series, openedAtSample);

  const now = readNow();
  const text =
    now.status === "ok" ? `${(now.ratio as number).toFixed(2)}×` : "no reading yet";
  if (readout.textContent !== text) readout.textContent = text;

  note.textContent =
    now.status === "ok"
      ? `mean trip ÷ shortest possible (${bfsNow()} moves)`
      : `warming up — ${colony.tripsCompleted} of ${READING_WINDOW.minTrips} trips`;

  // Throttled, because an aria-live region that fires every frame says nothing.
  const time = performance.now();
  if (time - announcedAt > ANNOUNCE_MS) {
    announcedAt = time;
    readout.setAttribute("aria-label", `${text}, ${note.textContent}`);
  }
}

function toggleShortcut(): void {
  engine.toggleShortcut(colony);
  openedAtSample = colony.shortcutOpen ? series.length : null;
  stage.setAttribute("aria-pressed", String(colony.shortcutOpen));
  render();
}

// The one verb. Pointer and keyboard both reach it — the canvas is focusable and
// carries the button role, so the wall is operable without a mouse.
stage.addEventListener("pointerdown", (event) => {
  if (!canvas.hitsShortcut(event.clientX, event.clientY)) return;
  stage.setPointerCapture(event.pointerId);
  event.preventDefault();
  toggleShortcut();
});

stage.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  toggleShortcut();
});

const loop = createLoop({
  stepsPerSecond: STEPS_PER_SECOND,
  // Informative motion is kept — the trail still grows at the same rate. Only the
  // repaint slows, which is the flicker rather than the argument.
  rendersPerSecond: reduceMotion ? 4 : undefined,
  step,
  render,
  now: () => performance.now(),
  schedule: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
});

render();
loop.start();
