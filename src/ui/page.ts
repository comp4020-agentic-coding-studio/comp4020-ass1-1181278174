// The page, wired — everything except the bootstrap.
//
// It lives here rather than in main.ts so the reduced-motion branch can be RUN in
// a test instead of reasoned about (Decision 8: "two code paths where only one is
// exercised means the unexercised one is broken and nobody knows yet"). The
// clock, the frame scheduler and the motion preference are all injected, so
// spec/reduced-motion.test.ts drives the real page against the real markup in
// jsdom, without a browser and without waiting.
//
// Three controls, hard cap (PLAN.md): the one verb, the forgetting rate,
// run/pause/reset. "Watch it grow" is not a fourth — it is the run control under
// a preference that forbids autoplay, and it is absent otherwise.

import type { Fixture } from "../fixtures/double-bridge.ts";
import { induce } from "../fixtures/graph.ts";
import { shortestPathLength } from "../oracle/bfs.ts";
import type { Colony } from "../sim/engine.ts";
import * as engine from "../sim/engine.ts";
import type { Reading } from "../sim/reading.ts";
import { READING_WINDOW, reading } from "../sim/reading.ts";
import { RHO, SAMPLE } from "../sim/rho.ts";
import { createCanvasView } from "./canvas.ts";
import { createLoop } from "./loop.ts";
import type { Loop } from "./loop.ts";
import { motionPlan } from "./motion.ts";
import { DARK } from "./palette.ts";
import { regimeText } from "./regime.ts";
import { createStripView } from "./strip.ts";

/** Simulation steps per wall-clock second. Fixed; the frame rate cannot move it. */
const STEPS_PER_SECOND = 90;
/** An aria-live region that fires every frame says nothing. One update a second. */
const ANNOUNCE_MS = 1000;

export interface PageDeps {
  readonly fixture: Fixture;
  readonly reducedMotion: boolean;
  now(): number;
  schedule(callback: () => void): number;
  cancel(handle: number): void;
  /** `?steps=&open&rho=` — screenshot priming only; see `readPrime`. */
  readonly prime?: Prime;
}

export interface Prime {
  readonly steps?: number;
  readonly open?: boolean;
  /** Steps to run AFTER opening, so a still shows the tick and what followed. */
  readonly after?: number;
  readonly rho?: number;
}

export interface Page {
  readonly loop: Loop;
  colony(): Colony;
  readonly rendersPerSecond: number | undefined;
  toggleShortcut(): void;
  setRho(value: number): void;
  destroy(): void;
}

/**
 * Screenshot priming, and nothing else. A still cannot tap, so without this no
 * screenshot could ever evidence the trace tick or the post-toggle jump — the two
 * things the page exists to show. Reads only the URL, changes only the starting
 * state, and every value it accepts is reachable by hand from the controls.
 */
export function readPrime(search: string): Prime | undefined {
  const params = new URLSearchParams(search);
  const num = (key: string): number | undefined => {
    const raw = params.get(key);
    const value = Number(raw);
    return raw === null || Number.isNaN(value) ? undefined : value;
  };
  const prime: Prime = {
    steps: num("steps"),
    open: params.has("open"),
    after: num("after"),
    rho: num("rho"),
  };
  return prime.steps === undefined &&
    !prime.open &&
    prime.after === undefined &&
    prime.rho === undefined
    ? undefined
    : prime;
}

export function createPage(doc: Document, deps: PageDeps): Page {
  const el = <T extends HTMLElement>(id: string): T =>
    doc.getElementById(id) as T;

  const stage = el<HTMLCanvasElement>("stage");
  const stripCanvas = el<HTMLCanvasElement>("strip");
  const readout = el("readout");
  const note = el("readout-note");
  const wallButton = el<HTMLButtonElement>("wall");
  const rhoInput = el<HTMLInputElement>("rho");
  const rhoValue = el("rho-value");
  const runButton = el<HTMLButtonElement>("run");
  const resetButton = el<HTMLButtonElement>("reset");
  const growButton = el<HTMLButtonElement>("grow");

  const plan = motionPlan(deps.reducedMotion);
  const { fixture } = deps;

  let rho: number = deps.prime?.rho ?? RHO.default;
  let colony = engine.createColony(fixture, { rho, seed: 1 });
  let series: Reading[] = [];
  let openedAtSample: number | null = null;
  let announcedAt = -Infinity;

  const canvas = createCanvasView(stage, fixture, DARK);
  const strip = createStripView(stripCanvas, DARK);

  const bfsNow = (): number =>
    shortestPathLength(
      induce(fixture, { openShortcut: colony.shortcutOpen }),
      fixture.nest,
      fixture.food,
    ) as number;

  const readNow = (): Reading =>
    reading(engine.completedTripLengths(colony), bfsNow(), READING_WINDOW);

  function step(): void {
    engine.step(colony);
    // The grid spec/core-interaction.test.ts samples on: one series, not two.
    if (colony.steps % SAMPLE === 0) series.push(readNow());
  }

  function render(): void {
    canvas.draw(colony);
    strip.draw(series, openedAtSample);

    const now = readNow();
    const text =
      now.status === "ok"
        ? `${(now.ratio as number).toFixed(2)}×`
        : "no reading yet";
    if (readout.textContent !== text) readout.textContent = text;
    note.textContent =
      now.status === "ok"
        ? `mean trip ÷ shortest possible (${bfsNow()} moves)`
        : `warming up — ${colony.tripsCompleted} of ${READING_WINDOW.minTrips} trips`;

    // Throttled: the region is polite, but a number that changes 60 times a
    // second is not information, it is noise with a screen reader attached.
    const time = deps.now();
    if (time - announcedAt >= ANNOUNCE_MS) {
      announcedAt = time;
      readout.setAttribute("aria-label", `${text}. ${note.textContent}`);
    }
  }

  function setRunning(running: boolean): void {
    if (running) loop.start();
    else loop.stop();
    // Visible at all times, both states — WCAG 2.2.2 applies to every visitor,
    // so this is not behind the motion preference.
    runButton.textContent = running ? "Pause" : "Run";
    runButton.setAttribute("aria-pressed", String(!running));
  }

  function toggleShortcut(): void {
    engine.toggleShortcut(colony);
    openedAtSample = colony.shortcutOpen ? series.length : null;
    wallButton.textContent = colony.shortcutOpen
      ? "Close the shortcut"
      : "Open the shortcut";
    wallButton.setAttribute("aria-pressed", String(colony.shortcutOpen));
    render();
  }

  function setRho(value: number): void {
    rho = value;
    // ρ is read from the colony every step, so it takes effect without a restart.
    (colony as { rho: number }).rho = value;
    rhoInput.value = String(value);
    rhoValue.textContent = value.toFixed(2);
    rhoInput.setAttribute("aria-valuetext", regimeText(value));
  }

  function reset(): void {
    colony = engine.createColony(fixture, { rho, seed: 1 });
    series = [];
    openedAtSample = null;
    wallButton.textContent = "Open the shortcut";
    wallButton.setAttribute("aria-pressed", "false");
    render();
  }

  const loop = createLoop({
    stepsPerSecond: STEPS_PER_SECOND,
    rendersPerSecond: plan.rendersPerSecond,
    step,
    render,
    now: deps.now,
    schedule: deps.schedule,
    cancel: deps.cancel,
  });

  // --- controls -------------------------------------------------------------

  const onWallClick = (): void => toggleShortcut();
  const onStagePointer = (event: PointerEvent): void => {
    if (!canvas.hitsShortcut(event.clientX, event.clientY)) return;
    stage.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    toggleShortcut();
  };
  const onRhoInput = (): void => setRho(Number(rhoInput.value));
  const onRunClick = (): void => setRunning(!loop.running);
  const onResetClick = (): void => reset();
  const onGrowClick = (): void => {
    // Under reduced motion nothing autoplays, so this is the way in. It starts
    // the same loop at the same step rate — only the repaint cadence differs.
    setRunning(true);
    growButton.hidden = true;
  };

  wallButton.addEventListener("click", onWallClick);
  stage.addEventListener("pointerdown", onStagePointer as EventListener);
  rhoInput.addEventListener("input", onRhoInput);
  runButton.addEventListener("click", onRunClick);
  resetButton.addEventListener("click", onResetClick);
  growButton.addEventListener("click", onGrowClick);

  rhoInput.min = String(RHO.locked);
  rhoInput.max = String(RHO.max);
  rhoInput.step = "0.01";
  setRho(rho);
  growButton.hidden = !plan.needsStartButton;

  if (deps.prime) {
    for (let i = 0; i < (deps.prime.steps ?? 0); i += 1) step();
    if (deps.prime.open) toggleShortcut();
    for (let i = 0; i < (deps.prime.after ?? 0); i += 1) step();
  }

  render();
  setRunning(plan.autoplay);

  return {
    loop,
    colony: () => colony,
    rendersPerSecond: plan.rendersPerSecond,
    toggleShortcut,
    setRho,
    destroy() {
      loop.stop();
      canvas.dispose();
      wallButton.removeEventListener("click", onWallClick);
      stage.removeEventListener("pointerdown", onStagePointer as EventListener);
      rhoInput.removeEventListener("input", onRhoInput);
      runButton.removeEventListener("click", onRunClick);
      resetButton.removeEventListener("click", onResetClick);
      growButton.removeEventListener("click", onGrowClick);
    },
  };
}
