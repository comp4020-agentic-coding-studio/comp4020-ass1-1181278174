// A sensor, not the page.
//
// `scripts/` is excluded from the build by vite.config.ts, so nothing here ships
// and the invariant tests never see it. It exists because the engine has been
// proven headless for a whole slice and nobody has LOOKED at it: numbers can be
// green while the thing on screen is nonsense, and slice 3 should design the real
// page against something seen rather than something inferred.
//
// What it deliberately does NOT do, so it cannot quietly become the page: no
// prose, no keyboard map, no reduced-motion branch, no aria contract, no layout
// at either marking viewport. Its controls exceed the page's hard cap of three on
// purpose — "settle 2000" is a debugging verb, not a visitor's one. The layout
// below is likewise dev-only: the canvas is a projection of a fixed logical
// graph, and which projection the page uses is a slice-3 decision.
//
// It shares what must not be duplicated: the engine, the one reading function,
// RHO and SAMPLE. The strip plots the same series spec/core-interaction.test.ts
// asserts on, sampled on the same grid — if the line here and the number there
// ever disagree, one of them is lying.

import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import type { NodeId } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import type { Colony } from "../src/sim/engine.ts";
import type { Reading } from "../src/sim/reading.ts";
import { reading } from "../src/sim/reading.ts";
import { RHO, SAMPLE } from "../src/sim/rho.ts";
import { project } from "../src/ui/projection.ts";
import { derived } from "../spec/thresholds.ts";

const FIXTURE = DOUBLE_BRIDGE;
const WINDOW = {
  window: derived("N_trips"),
  minTrips: derived("MIN_TRIPS"),
};
const STEPS_PER_FRAME = 8;

// --- layout ---------------------------------------------------------------
// The projection is the page's own (src/ui/projection.ts, slice 3). This sensor
// had its own copy while the page had none; keeping it would mean looking at a
// picture the page does not draw.

const LAYOUT = project(FIXTURE).nodes;

const at = (node: NodeId, w: number, h: number): readonly [number, number] => {
  const p = LAYOUT.get(node) ?? { x: 0.5, y: 0.5 };
  return [p.x * w, p.y * h];
};

// --- state ----------------------------------------------------------------

const el = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;

const stage = el<HTMLCanvasElement>("stage");
const strip = el<HTMLCanvasElement>("strip");
const ctx = stage.getContext("2d") as CanvasRenderingContext2D;
const stripCtx = strip.getContext("2d") as CanvasRenderingContext2D;
const rhoInput = el<HTMLInputElement>("rho");

let rho: number = RHO.default;
let colony: Colony = engine.createColony(FIXTURE, { rho, seed: 1 });
let series: Reading[] = [];
let openedAtSample: number | null = null;
let running = true;

const bfsNow = (): number =>
  shortestPathLength(
    induce(FIXTURE, { openShortcut: colony.shortcutOpen }),
    FIXTURE.nest,
    FIXTURE.food,
  ) as number;

const readNow = (): Reading =>
  reading(engine.completedTripLengths(colony), bfsNow(), WINDOW);

function reset(): void {
  colony = engine.createColony(FIXTURE, { rho, seed: 1 });
  series = [];
  openedAtSample = null;
}

/**
 * One step, then a sample if we have landed on the grid.
 *
 * `steps % SAMPLE === 0` is the same grid `trace()` samples on — it runs SAMPLE
 * steps between samples from a state whose step count is already a multiple of
 * SAMPLE — so the strip and the test series are the same series, not two.
 */
function advance(): void {
  engine.step(colony);
  if (colony.steps % SAMPLE === 0) series.push(readNow());
}

// --- drawing ---------------------------------------------------------------

function drawGraph(): void {
  const { width: w, height: h } = stage;
  ctx.clearRect(0, 0, w, h);

  let peak = 0;
  for (const edge of FIXTURE.edges) {
    const { home, food } = engine.edgePheromone(colony, edge.a, edge.b);
    peak = Math.max(peak, home, food);
  }
  const scale = peak > 0 ? 1 / peak : 0;

  for (const edge of FIXTURE.edges) {
    const [ax, ay] = at(edge.a, w, h);
    const [bx, by] = at(edge.b, w, h);
    const shut = edge.closed === true && !colony.shortcutOpen;

    if (shut) {
      ctx.save();
      ctx.setLineDash([5, 7]);
      ctx.strokeStyle = "#4a5160";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    // The terrain itself, so an empty edge is still visibly there — the shortcut
    // sitting open and unused is the whole point of beat 3.
    ctx.strokeStyle = "#333a45";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();

    // Two maps, two hues, drawn on either side of the edge so neither hides the
    // other: seekers lay "home", carriers lay "food".
    const { home, food } = engine.edgePheromone(colony, edge.a, edge.b);
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * 3.5;
    const ny = (dx / len) * 3.5;

    for (const [tau, hue, side] of [
      [home, "111, 211, 199", 1],
      [food, "242, 166, 90", -1],
    ] as const) {
      const t = Math.min(1, tau * scale);
      if (t <= 0.001) continue;
      ctx.strokeStyle = `rgba(${hue}, ${(0.15 + 0.85 * t).toFixed(3)})`;
      ctx.lineWidth = 1 + 7 * t;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(ax + nx * side, ay + ny * side);
      ctx.lineTo(bx + nx * side, by + ny * side);
      ctx.stroke();
    }
  }

  for (const node of FIXTURE.nodes) {
    const [x, y] = at(node, w, h);
    const terminal = node === FIXTURE.nest || node === FIXTURE.food;
    ctx.fillStyle = terminal ? "#e8e6e1" : "#525a68";
    ctx.beginPath();
    ctx.arc(x, y, terminal ? 7 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    if (terminal) {
      ctx.fillStyle = "#8a867e";
      ctx.font = "12px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText(node, x, y - 14);
    }
  }

  // Ants. Jittered off the node by index, or 64 dots stack into one.
  for (let ant = 0; ant < colony.at.length; ant += 1) {
    const node = FIXTURE.nodes[colony.at[ant] as number] as NodeId;
    const [x, y] = at(node, w, h);
    const angle = (ant / colony.at.length) * Math.PI * 2;
    const radius = 5 + (ant % 4) * 3;
    ctx.fillStyle =
      colony.carrying[ant] === 1 ? "#f2a65a" : "rgba(207, 211, 218, 0.85)";
    ctx.beginPath();
    ctx.arc(
      x + Math.cos(angle) * radius,
      y + Math.sin(angle) * radius,
      2.2,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function drawStrip(): void {
  const { width: w, height: h } = strip;
  const LOW = 1;
  const HIGH = 2.1;
  const y = (ratio: number) =>
    h - ((Math.min(HIGH, Math.max(LOW, ratio)) - LOW) / (HIGH - LOW)) * h;

  stripCtx.clearRect(0, 0, w, h);
  stripCtx.fillStyle = "#171a20";
  stripCtx.fillRect(0, 0, w, h);

  // 1.0× baseline: the shortest route itself. Nothing can go below it.
  stripCtx.strokeStyle = "#3a414d";
  stripCtx.beginPath();
  stripCtx.moveTo(0, y(1));
  stripCtx.lineTo(w, y(1));
  stripCtx.stroke();

  const span = Math.max(series.length - 1, 1);
  const x = (i: number) => (i / span) * w;

  if (openedAtSample !== null) {
    stripCtx.strokeStyle = "#6fd3c7";
    stripCtx.setLineDash([3, 3]);
    stripCtx.beginPath();
    stripCtx.moveTo(x(openedAtSample), 0);
    stripCtx.lineTo(x(openedAtSample), h);
    stripCtx.stroke();
    stripCtx.setLineDash([]);
  }

  stripCtx.strokeStyle = "#f2a65a";
  stripCtx.lineWidth = 1.5;
  stripCtx.beginPath();
  let started = false;
  series.forEach((sample, i) => {
    if (sample.status !== "ok") {
      started = false;
      return;
    }
    const point: [number, number] = [x(i), y(sample.ratio as number)];
    if (started) stripCtx.lineTo(...point);
    else stripCtx.moveTo(...point);
    started = true;
  });
  stripCtx.stroke();
}

function shareOnShort(): string {
  const short = new Set<string>(FIXTURE.branches.short.slice(1, -1));
  let on = 0;
  for (const node of engine.antNodes(colony)) if (short.has(node)) on += 1;
  return `${Math.round((on / colony.at.length) * 100)}%`;
}

function drawHud(): void {
  const now = readNow();
  el("reading").textContent =
    now.status === "ok" ? `${(now.ratio as number).toFixed(3)}×` : "—";
  el("reading-note").textContent =
    now.status === "ok"
      ? `mean of last ${WINDOW.window} trips ÷ BFS ${bfsNow()}`
      : `no reading yet — ${colony.trips.length}/${WINDOW.minTrips} trips`;
  el("steps").textContent = String(colony.steps);
  el("trips").textContent = String(colony.trips.length);
  el("shortcut").textContent = colony.shortcutOpen ? "OPEN" : "shut";
  el("bfs").textContent = String(bfsNow());
  el("share").textContent = shareOnShort();
}

function paint(): void {
  drawGraph();
  drawStrip();
  drawHud();
}

function frame(): void {
  if (running) for (let i = 0; i < STEPS_PER_FRAME; i += 1) advance();
  paint();
  requestAnimationFrame(frame);
}

// --- controls --------------------------------------------------------------

rhoInput.min = String(RHO.locked);
rhoInput.max = String(RHO.max);
rhoInput.value = String(RHO.default);

rhoInput.addEventListener("input", () => {
  rho = Number(rhoInput.value);
  el("rho-value").textContent = rho.toFixed(2);
  // ρ is read from the colony every step, so it takes effect without a restart —
  // which is the whole interaction, and worth seeing live.
  (colony as { rho: number }).rho = rho;
});

el<HTMLButtonElement>("run").addEventListener("click", (event) => {
  running = !running;
  (event.currentTarget as HTMLButtonElement).textContent = running
    ? "pause"
    : "run";
});

el<HTMLButtonElement>("reset").addEventListener("click", () => {
  reset();
  paint();
});

el<HTMLButtonElement>("settle").addEventListener("click", () => {
  for (let i = 0; i < derived("SETTLE"); i += 1) advance();
  paint();
});

el<HTMLButtonElement>("toggle").addEventListener("click", (event) => {
  engine.toggleShortcut(colony);
  openedAtSample = series.length;
  (event.currentTarget as HTMLButtonElement).textContent = colony.shortcutOpen
    ? "close shortcut"
    : "open shortcut";
  paint();
});

// --- dev-only priming ------------------------------------------------------
// `?settle=2000&after=3000&rho=0.12&run=0` runs the whole flow before the first
// paint, so a state worth looking at can be linked to — and so a headless
// screenshot can capture one, which is the only way a still can evidence the
// trace strip at all. A sensor you can only reach by clicking for a minute is a
// sensor nobody uses.

{
  const params = new URLSearchParams(globalThis.location.search);
  const num = (key: string): number | null => {
    const raw = params.get(key);
    return raw === null || Number.isNaN(Number(raw)) ? null : Number(raw);
  };

  const startRho = num("rho");
  if (startRho !== null) {
    rho = startRho;
    rhoInput.value = String(rho);
    el("rho-value").textContent = rho.toFixed(2);
    reset();
  }

  const settle = num("settle");
  if (settle !== null) for (let i = 0; i < settle; i += 1) advance();

  const after = num("after");
  if (after !== null || params.has("open")) {
    engine.toggleShortcut(colony);
    openedAtSample = series.length;
    el("toggle").textContent = "close shortcut";
    for (let i = 0; i < (after ?? 0); i += 1) advance();
  }

  if (params.get("run") === "0") {
    running = false;
    el("run").textContent = "run";
  }
}

paint();
requestAnimationFrame(frame);
