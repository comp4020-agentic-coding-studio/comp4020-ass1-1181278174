// Fixed-step accumulator, decoupled from the frame clock (Decision 12 (3)).
//
// The engine runs on the MAIN THREAD. A Worker buys nothing at 12 edges × 64 ants
// and would put a message boundary between the tests and the page — the thing
// that makes the trace on screen and the series in the test the same series.
//
// The frame clock drives an accumulator; the accumulator drives whole steps. A
// slow frame therefore costs frames, never simulation time, and `step()` still
// never renders. Everything time-related is injected, so this is testable without
// a browser and without waiting.

export interface LoopOptions {
  /** Simulation steps per wall-clock second. Fixed; frames do not change it. */
  readonly stepsPerSecond: number;
  step(): void;
  render(): void;
  /** Milliseconds. Injected so a test can drive time by hand. */
  now(): number;
  /** Returns a handle; the loop never assumes requestAnimationFrame exists. */
  schedule(callback: () => void): number;
  cancel(handle: number): void;
  /**
   * Renders per second. Under `prefers-reduced-motion` the page drops to 4 — the
   * simulation still advances at the same rate, so nothing informative is lost;
   * only the flicker is. Absent means "every frame".
   */
  readonly rendersPerSecond?: number;
}

export interface Loop {
  start(): void;
  stop(): void;
  readonly running: boolean;
  /**
   * Change the pace. Only the pace: the engine is fixed-step, so a given step
   * count produces the same colony at 75 as at 300 — what changes is how much
   * wall-clock time passes while those steps happen.
   */
  setStepsPerSecond(rate: number): void;
  /** Advance by hand — the reduced-motion "step" path, and the test's lever. */
  tick(): void;
}

/**
 * Never advance more than this many steps for one frame. A backgrounded tab
 * returns with a huge delta, and without a cap the page would freeze catching up
 * on simulation nobody watched.
 */
const MAX_STEPS_PER_FRAME = 240;

export function createLoop(options: LoopOptions): Loop {
  let stepMs = 1000 / options.stepsPerSecond;
  const renderMs =
    options.rendersPerSecond === undefined
      ? 0
      : 1000 / options.rendersPerSecond;

  let handle: number | null = null;
  let previous = 0;
  let accumulator = 0;
  let lastRender = 0;

  function tick(): void {
    const time = options.now();
    const delta = Math.max(0, time - previous);
    previous = time;
    accumulator += delta;

    let stepped = 0;
    while (accumulator >= stepMs && stepped < MAX_STEPS_PER_FRAME) {
      options.step();
      accumulator -= stepMs;
      stepped += 1;
    }
    if (stepped >= MAX_STEPS_PER_FRAME) accumulator = 0;

    if (renderMs === 0 || time - lastRender >= renderMs) {
      lastRender = time;
      options.render();
    }
  }

  function frame(): void {
    if (handle === null) return;
    tick();
    handle = options.schedule(frame);
  }

  return {
    start() {
      if (handle !== null) return;
      previous = options.now();
      accumulator = 0;
      handle = options.schedule(frame);
    },
    stop() {
      if (handle !== null) options.cancel(handle);
      handle = null;
    },
    get running() {
      return handle !== null;
    },
    setStepsPerSecond(rate) {
      // The accumulator is carried over rather than cleared: it holds a fraction
      // of a step that has been paid for in wall time, and dropping it would
      // lose simulation the visitor already waited through.
      stepMs = 1000 / rate;
    },
    tick,
  };
}
