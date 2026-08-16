// Dev-only: measures the real renderer's cost at 1920 with 400 ants.
// scripts/ is excluded from the build, so this never ships.
import { FIELD_V4 } from "../src/fixtures/field-v4.ts";
import * as engine from "../src/sim/engine.ts";
import { createCanvasView } from "../src/ui/canvas.ts";
import { LIGHT } from "../src/ui/palette.ts";

const canvas = document.getElementById("stage") as HTMLCanvasElement;
const view = createCanvasView(canvas, FIELD_V4, LIGHT);
const colony = engine.createColony(FIELD_V4, { rho: 0.01, seed: 1, ants: 400 });
for (let i = 0; i < 6000; i += 1) engine.step(colony); // a formed road, the worst case
for (let i = 0; i < 20; i += 1) view.draw(colony); // warm

const FRAMES = 200;
const t0 = performance.now();
for (let i = 0; i < FRAMES; i += 1) view.draw(colony);
const drawMs = (performance.now() - t0) / FRAMES;

const s0 = performance.now();
for (let i = 0; i < 1500; i += 1) engine.step(colony);
const stepMs = (performance.now() - s0) / 1500;

const perFrame = drawMs + stepMs * 5;
(document.getElementById("out") as HTMLElement).textContent =
  `draw=${drawMs.toFixed(3)}ms/frame step=${stepMs.toFixed(4)}ms ` +
  `frame(draw+5 steps)=${perFrame.toFixed(3)}ms budget=16.67ms ` +
  `headroom=${(16.67 / perFrame).toFixed(1)}x dpr=${devicePixelRatio}`;
