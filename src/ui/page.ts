// The page, wired — everything except the bootstrap.
//
// It lives here rather than in main.ts so the reduced-motion branch can be RUN in
// a test instead of reasoned about (Decision 8: "two code paths where only one is
// exercised means the unexercised one is broken and nobody knows yet"). The
// clock, the frame scheduler and the motion preference are all injected, so
// spec/reduced-motion.test.ts drives the real page against the real markup in
// jsdom, without a browser and without waiting.
//
// Five controls (PLAN.md, Decision 26): the scene, the one verb (drawing walls),
// the forgetting rate, the speed, and run/pause/reset. The page loads PAUSED for
// everyone — nothing moves until the visitor presses Run — so the reduced-motion
// branch and the ordinary one differ only in how often the canvas repaints.

import type { Fixture, NodeId } from "../fixtures/double-bridge.ts";
import { induce } from "../fixtures/graph.ts";
import { shortestPathBetween } from "../oracle/bfs.ts";
import type { Colony } from "../sim/engine.ts";
import * as engine from "../sim/engine.ts";
import type { Reading } from "../sim/reading.ts";
import { READING_WINDOW, reading } from "../sim/reading.ts";
import { FIELD_RHO, SAMPLE } from "../sim/rho.ts";
import { sceneWalls } from "../fixtures/presets.ts";
import type { SceneKind } from "../fixtures/presets.ts";
import { cellsBetween } from "./stroke.ts";
import { createCanvasView } from "./canvas.ts";
import { createLoop } from "./loop.ts";
import type { Loop } from "./loop.ts";
import { motionPlan } from "./motion.ts";
import { LIGHT } from "./palette.ts";
import { createStripView } from "./strip.ts";

/**
 * Simulation steps per wall-clock second (Decision 20, amended by Decision 24).
 * Fixed; the frame rate cannot move it. At 300 the whole of beat 1 — four hundred
 * ants pouring out, spreading, and pulling into a road — was over in about two
 * seconds, and the visitor arrived to a finished road. At 150 the pour-out and the
 * search stay on screen long enough to be seen, and a trip still takes well under
 * a second.
 *
 * Exported so the tests and the screenshot script convert seconds to steps with
 * this number rather than a copy of it.
 */
export const STEPS_PER_SECOND = 150;

/**
 * The pace the visitor can set (Decision 26): a slider from 30 to 300 steps a
 * second, default 150. Only the pace changes: the engine is fixed-step, so the
 * same step count gives the same colony at any of them — slow is for watching an
 * individual ant, fast for watching the road.
 */
export const SPEED = { min: 30, max: 300, step: 10, default: 150 } as const;
/** An aria-live region that fires every frame says nothing. One update a second. */
const ANNOUNCE_MS = 1000;
/** Decision 19. Four hundred, so the visitor sees them pour out of the nest. */
const ANTS = 400;

export type WallTool = "build" | "erase";

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
  /**
   * A wall to draw before `after` runs, as `x:y0-y1` — one vertical bar. The
   * drawing verb is a drag, and a screenshot cannot drag; this is the smallest
   * thing that lets a still show a broken road reconnecting. Every cell it
   * builds is a cell the visitor could build by hand.
   */
  readonly wall?: string;
  readonly rho?: number;
  /** A scene to lay out before anything runs — the same walls the buttons draw. */
  readonly scene?: SceneKind;
  /**
   * Hide the intro screen (Decision 29). A headless screenshot cannot scroll, so
   * this is how a still shows the page as a visitor sees it after the intro has
   * scrolled away — the same view, reached by hand with the wheel.
   */
  readonly nointro?: boolean;
}

export interface Page {
  readonly loop: Loop;
  colony(): Colony;
  readonly rendersPerSecond: number | undefined;
  toggleShortcut(): void;
  /** The one verb, for the tests: build or rub out one cell. */
  toggleCell(node: NodeId): boolean;
  /** What a drag does: build walls or rub them out (Decision 27). */
  setTool(tool: WallTool): void;
  tool(): WallTool;
  setSpeed(rate: number): void;
  setRho(value: number): void;
  /** Lay out a scene: a fresh colony on the same field, with that scene's walls. */
  setScene(kind: SceneKind): void;
  scene(): SceneKind;
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
  const wall = params.get("wall") ?? undefined;
  const sceneRaw = params.get("scene");
  const scene: SceneKind | undefined =
    sceneRaw === "maze" || sceneRaw === "random" || sceneRaw === "blank"
      ? sceneRaw
      : undefined;
  const nointro = params.has("nointro");
  const prime: Prime = {
    steps: num("steps"),
    open: params.has("open"),
    after: num("after"),
    wall,
    rho: num("rho"),
    scene,
    nointro,
  };
  return prime.steps === undefined &&
    !prime.open &&
    prime.after === undefined &&
    prime.rho === undefined &&
    wall === undefined &&
    scene === undefined &&
    !nointro
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
  const rhoInput = el<HTMLInputElement>("rho");
  const rhoValue = el("rho-value");
  const share = el("share");
  const runButton = el<HTMLButtonElement>("run");
  const resetButton = el<HTMLButtonElement>("reset");
  const clearButton = el<HTMLButtonElement>("clear");
  const speedInput = el<HTMLInputElement>("speed");
  const speedValue = el("speed-value");
  const sceneButtons: Record<SceneKind, HTMLButtonElement> = {
    blank: el<HTMLButtonElement>("scene-blank"),
    random: el<HTMLButtonElement>("scene-random"),
    maze: el<HTMLButtonElement>("scene-maze"),
  };
  const toolButtons: Record<WallTool, HTMLButtonElement> = {
    build: el<HTMLButtonElement>("tool-draw"),
    erase: el<HTMLButtonElement>("tool-erase"),
  };

  const plan = motionPlan(deps.reducedMotion);
  const { fixture } = deps;

  let rho: number = deps.prime?.rho ?? FIELD_RHO.default;
  let colony = engine.createColony(fixture, { rho, seed: 1, ants: ANTS });
  let series: Reading[] = [];
  let sceneKind: SceneKind = "blank";
  /** Each press of "Random obstacles" is a new scatter — and the same press again is not. */
  let randomSeed = 0;
  let openedAtSample: number | null = null;
  let announcedAt = -Infinity;

  const canvas = createCanvasView(stage, fixture, LIGHT);
  const strip = createStripView(stripCanvas, LIGHT);

  // Both routes, measured once: the reading needs the current one, and the
  // secondary readout needs the midpoint to tell the two apart.
  const bfsFor = (openShortcut: boolean): number | null =>
    shortestPathBetween(
      induce(fixture, { openShortcut, blocked: colony.drawnWalls }),
      fixture.nestZone ?? [fixture.nest],
      fixture.foodZone ?? [fixture.food],
    );
  /**
   * The shortest route over the terrain as it NOW stands — walls the visitor has
   * drawn included. Recomputed on every toggle rather than every frame: a BFS
   * over 2196 cells is cheap, but not 150 times a second, and the terrain only
   * changes when somebody changes it.
   */
  let bfs: number | null = bfsFor(colony.shortcutOpen);
  const bfsNow = (): number | null => bfs;
  const refreshTerrain = (): void => {
    bfs = bfsFor(colony.shortcutOpen);
  };

  const readNow = (): Reading => {
    const against = bfsNow();
    // No route at all is a STATE, not a number — and not a zero, which would
    // divide into something enormous and look like a reading.
    if (against === null) return { status: "no reading yet", ratio: null };
    return reading(engine.completedTripLengths(colony), against, READING_WINDOW);
  };

  function step(): void {
    engine.step(colony);
    // The grid spec/core-interaction.test.ts samples on: one series, not two.
    if (colony.steps % SAMPLE === 0) series.push(readNow());
  }

  function render(): void {
    canvas.draw(colony);
    strip.draw(series, openedAtSample);

    const now = readNow();
    const routeless = bfsNow() === null;
    const text = routeless
      ? "no route"
      : now.status === "ok"
        ? `${(now.ratio as number).toFixed(2)}×`
        : "no reading yet";
    if (readout.textContent !== text) readout.textContent = text;
    note.textContent = routeless
      ? "your walls have sealed the food off"
      : now.status === "ok"
        ? `mean trip ÷ shortest possible (${bfsNow()} moves)`
        : `warming up — ${colony.tripsCompleted} of ${READING_WINDOW.minTrips} trips`;

    // Secondary readout, never thresholded. On open ground the thing worth
    // counting is what the VISITOR has added, not which of two routes was taken
    // — there is only one kind of route now. Turn B makes this number move.
    share.textContent = `walls: ${colony.drawnWalls.size}`;
    clearButton.hidden = colony.drawnWalls.size === 0;

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
    // While paused, Run is the one thing to press next, and it looks it.
    runButton.classList.toggle("primary", !running);
  }

  /**
   * v4 has no doorway, so this is a no-op on the shipped fixture — it stays
   * because `?open` still drives the older fields in the spike scripts, and
   * because turn B replaces it with the real verb, drawing walls.
   */
  function toggleShortcut(): void {
    engine.toggleShortcut(colony);
    openedAtSample = colony.shortcutOpen ? series.length : null;
    render();
  }

  /**
   * The slider's track is a POSITION 0–1, mapped to ρ by a curve (Decision 32):
   * ρ = max · position^curve. Linear put the whole working band — 0.002 to 0.05 —
   * in the left sixth of the track; with the curve it fills the left half, and
   * the far end still reaches the rate at which no road survives.
   */
  const positionOf = (value: number): number =>
    Math.pow(Math.max(0, value) / FIELD_RHO.max, 1 / FIELD_RHO.curve);
  const rhoOf = (position: number): number => {
    const raw = FIELD_RHO.max * Math.pow(Math.max(0, position), FIELD_RHO.curve);
    // Snap to the rate's own resolution so the label never shows a phantom digit.
    return Math.round(raw / FIELD_RHO.step) * FIELD_RHO.step;
  };

  function setRho(value: number): void {
    rho = value;
    // ρ is read from the colony every step, so it takes effect without a restart.
    (colony as { rho: number }).rho = value;
    rhoInput.value = positionOf(value).toFixed(3);
    rhoValue.textContent = value.toFixed(3);
    // Regime labels are OFF on the field until the thresholds are derived
    // (Decision 19): no label rather than a wrong one. The number is still
    // spoken, so the control is never silent.
    rhoInput.setAttribute("aria-valuetext", value.toFixed(3));
  }

  /** Restart the colony. The walls stay: they are the visitor's, not the run's. */
  function reset(): void {
    const walls = [...colony.drawnWalls];
    colony = engine.createColony(fixture, { rho, seed: 1, ants: ANTS });
    for (const cell of walls) engine.toggleCell(colony, cell);
    series = [];
    openedAtSample = null;
    refreshTerrain();
    render();
  }

  /** Build or rub out one cell, and tell the reading the ground moved. */
  function toggleCell(node: NodeId): boolean {
    if (!engine.toggleCell(colony, node)) return false;
    refreshTerrain();
    render();
    return true;
  }

  /**
   * A scene is a fresh colony on the same field with a set of walls drawn before
   * the ants set out — the same cells, drawn by the same verb, that the visitor
   * could draw by hand. Choosing one restarts the ants; whether they are running
   * is left as it was.
   */
  function setScene(kind: SceneKind): void {
    if (kind === "random") randomSeed += 1;
    sceneKind = kind;
    colony = engine.createColony(fixture, { rho, seed: 1, ants: ANTS });
    for (const cell of sceneWalls(fixture, kind, randomSeed)) {
      engine.toggleCell(colony, cell);
    }
    series = [];
    openedAtSample = null;
    for (const [name, button] of Object.entries(sceneButtons)) {
      button.setAttribute("aria-pressed", String(name === kind));
    }
    refreshTerrain();
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

  /**
   * Drawing. The wall TOOL — Draw or Erase, two buttons (Decision 27) — decides
   * what a whole stroke does, so a stroke never does both and dragging along a
   * wall you just drew, with Erase chosen, rubs it out cell by cell without
   * flickering. (It used to be decided by the cell you pressed on, which was
   * invisible; the director asked for buttons.) From the keyboard, Enter still
   * toggles the cell under the cursor either way.
   */
  let tool: WallTool = "build";
  let stroke: WallTool | null = null;
  let strokeLast: NodeId | null = null;

  function setTool(next: WallTool): void {
    tool = next;
    for (const [name, button] of Object.entries(toolButtons)) {
      button.setAttribute("aria-pressed", String(name === next));
    }
  }
  const onToolClick = (event: Event): void => {
    const target = event.currentTarget as HTMLButtonElement;
    setTool(target.id === "tool-erase" ? "erase" : "build");
  };

  const applyOne = (node: NodeId): void => {
    const isWall = colony.drawnWalls.has(node);
    if (stroke === "build" ? isWall : !isWall) return;
    toggleCell(node);
  };

  /**
   * Apply the stroke to `node` — and to every cell between the last cell this
   * stroke touched and `node`, because a quick drag skips cells between two
   * pointer samples and a wall with gaps in it is not a wall.
   */
  const applyStroke = (node: NodeId | null): void => {
    if (!node || node === strokeLast || stroke === null) return;
    const path = strokeLast === null ? [node] : cellsBetween(strokeLast, node);
    strokeLast = node;
    for (const cell of path) applyOne(cell);
  };

  const onStagePointerDown = (event: PointerEvent): void => {
    const node = canvas.cellAt(event.clientX, event.clientY);
    if (!node) return;
    event.preventDefault();
    stage.setPointerCapture?.(event.pointerId);
    stroke = tool;
    strokeLast = null;
    applyStroke(node);
  };
  const onStagePointerMove = (event: PointerEvent): void => {
    if (stroke === null) return;
    applyStroke(canvas.cellAt(event.clientX, event.clientY));
  };
  const onStagePointerUp = (): void => {
    stroke = null;
    strokeLast = null;
  };

  /** Arrow keys move a visible cursor, Enter toggles, Escape puts it away. */
  const onStageKeyDown = (event: KeyboardEvent): void => {
    const steps: Record<string, readonly [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const move = steps[event.key];
    if (move) {
      event.preventDefault();
      const here = canvas.cursor() ?? fixture.nest;
      const [x, y] = here.split(",").map(Number) as [number, number];
      const next = `${x + move[0]},${y + move[1]}`;
      if (fixture.cells?.has(next) || colony.drawnWalls.has(next)) {
        canvas.setCursor(next);
      }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const here = canvas.cursor();
      if (here) toggleCell(here);
      else canvas.setCursor(fixture.nest);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      canvas.setCursor(null);
    }
  };

  const onClearClick = (): void => {
    // A copy: toggleCell mutates the set being walked.
    for (const cell of Array.from(colony.drawnWalls)) engine.toggleCell(colony, cell);
    // With every wall gone the scene IS blank, whatever it was called before.
    sceneKind = "blank";
    for (const [name, button] of Object.entries(sceneButtons)) {
      button.setAttribute("aria-pressed", String(name === "blank"));
    }
    refreshTerrain();
    render();
  };

  function setSpeed(rate: number): void {
    const clamped = Math.min(SPEED.max, Math.max(SPEED.min, rate));
    loop.setStepsPerSecond(clamped);
    speedInput.value = String(clamped);
    speedValue.textContent = String(clamped);
    speedInput.setAttribute("aria-valuetext", `${clamped} steps per second`);
  }
  const onSpeedInput = (): void => setSpeed(Number(speedInput.value));
  const onSceneClick = (event: Event): void => {
    const target = event.currentTarget as HTMLButtonElement;
    const kind = target.id.replace("scene-", "") as SceneKind;
    setScene(kind);
  };

  const onRhoInput = (): void => setRho(rhoOf(Number(rhoInput.value)));
  const onRunClick = (): void => setRunning(!loop.running);
  const onResetClick = (): void => reset();

  stage.addEventListener("pointerdown", onStagePointerDown as EventListener);
  stage.addEventListener("pointermove", onStagePointerMove as EventListener);
  stage.addEventListener("pointerup", onStagePointerUp);
  stage.addEventListener("pointercancel", onStagePointerUp);
  stage.addEventListener("keydown", onStageKeyDown as EventListener);
  clearButton.addEventListener("click", onClearClick);
  speedInput.addEventListener("input", onSpeedInput);
  for (const button of Object.values(sceneButtons)) {
    button.addEventListener("click", onSceneClick);
  }
  for (const button of Object.values(toolButtons)) {
    button.addEventListener("click", onToolClick);
  }
  rhoInput.addEventListener("input", onRhoInput);
  runButton.addEventListener("click", onRunClick);
  resetButton.addEventListener("click", onResetClick);

  // Position, not rate: see positionOf / rhoOf above.
  rhoInput.min = "0";
  rhoInput.max = "1";
  rhoInput.step = String(FIELD_RHO.track);
  setRho(rho);
  speedInput.min = String(SPEED.min);
  speedInput.max = String(SPEED.max);
  speedInput.step = String(SPEED.step);
  setSpeed(STEPS_PER_SECOND);
  sceneButtons.blank.setAttribute("aria-pressed", "true");
  setTool("build");

  if (deps.prime) {
    if (deps.prime.nointro) {
      const intro = doc.getElementById("intro");
      if (intro) intro.hidden = true;
    }
    if (deps.prime.scene) setScene(deps.prime.scene);
    for (let i = 0; i < (deps.prime.steps ?? 0); i += 1) step();
    if (deps.prime.open) toggleShortcut();
    const bar = /^(\d+):(\d+)-(\d+)$/.exec(deps.prime.wall ?? "");
    if (bar) {
      const x = Number(bar[1]);
      for (let y = Number(bar[2]); y <= Number(bar[3]); y += 1) {
        toggleCell(`${x},${y}`);
      }
    }
    for (let i = 0; i < (deps.prime.after ?? 0); i += 1) step();
  }

  render();
  // Paused, for everyone (Decision 26). Beat 1 is still live emergence from zero
  // — it just waits for the visitor to press Run, so they can pick a scene or
  // draw first, and so nothing moves on a page that was only being read.
  setRunning(false);

  return {
    loop,
    colony: () => colony,
    rendersPerSecond: plan.rendersPerSecond,
    toggleShortcut,
    toggleCell,
    setSpeed,
    setRho,
    setScene,
    scene: () => sceneKind,
    setTool,
    tool: () => tool,
    destroy() {
      loop.stop();
      canvas.dispose();
      stage.removeEventListener("pointerdown", onStagePointerDown as EventListener);
      stage.removeEventListener("pointermove", onStagePointerMove as EventListener);
      stage.removeEventListener("pointerup", onStagePointerUp);
      stage.removeEventListener("pointercancel", onStagePointerUp);
      stage.removeEventListener("keydown", onStageKeyDown as EventListener);
      clearButton.removeEventListener("click", onClearClick);
      speedInput.removeEventListener("input", onSpeedInput);
      for (const button of Object.values(sceneButtons)) {
        button.removeEventListener("click", onSceneClick);
      }
      for (const button of Object.values(toolButtons)) {
        button.removeEventListener("click", onToolClick);
      }
      rhoInput.removeEventListener("input", onRhoInput);
      runButton.removeEventListener("click", onRunClick);
      resetButton.removeEventListener("click", onResetClick);
    },
  };
}
