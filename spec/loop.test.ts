// The fixed-step accumulator (Decision 12 (3)).
//
// The claim it has to earn: the frame clock cannot change how much simulation
// happens. A slow frame costs frames, not steps — otherwise `M` ("switches
// within M steps") would mean something different on a fast machine than on a
// slow one, and every threshold in spec/oracles.md is counted in steps.
//
// Time is injected, so this runs instantly and deterministically.

import { describe, expect, it } from "vitest";
import { createLoop } from "../src/ui/loop.ts";

// 100 steps/s and 20ms frames, so every count below is exact arithmetic rather
// than a float that happens to land. (The page runs 90; 1000/90 does not divide
// evenly, which is a property of the number, not of the loop — the page-level
// assertions in spec/reduced-motion.test.ts allow the one-step slack it causes.)
const RATE = 100;
const FRAME = 20;

function harness(stepsPerSecond = RATE, rendersPerSecond?: number) {
  let clock = 0;
  let steps = 0;
  let renders = 0;
  let queued: (() => void) | null = null;
  const loop = createLoop({
    stepsPerSecond,
    rendersPerSecond,
    step: () => {
      steps += 1;
    },
    render: () => {
      renders += 1;
    },
    now: () => clock,
    schedule: (callback) => {
      queued = callback;
      return 1;
    },
    cancel: () => {
      queued = null;
    },
  });
  return {
    loop,
    steps: () => steps,
    renders: () => renders,
    /**
     * Advance the wall clock and fire whatever the loop scheduled — the browser's
     * job. Driven through the scheduler, not through `tick()`, so `start` and
     * `stop` actually gate it; a harness that called `tick()` by hand would show
     * a stopped loop still running.
     */
    frame(ms: number) {
      clock += ms;
      const next = queued;
      queued = null;
      next?.();
    },
  };
}

describe("the frame clock drives an accumulator, not the simulation", () => {
  it("runs the same number of steps whether frames are fast or slow", () => {
    const smooth = harness();
    const janky = harness();
    smooth.loop.start();
    janky.loop.start();

    // One second of wall time each: fifty even frames against four uneven ones.
    for (let i = 0; i < 50; i += 1) smooth.frame(FRAME);
    janky.frame(120);
    janky.frame(500);
    janky.frame(30);
    janky.frame(350);

    expect(smooth.steps()).toBe(RATE);
    // The claim is this equality. If frame shape could move it, every threshold
    // in spec/oracles.md would mean something different on a slower machine.
    expect(janky.steps()).toBe(smooth.steps());
  });

  it("does not lose the remainder between frames", () => {
    // A loop that dropped its accumulator each frame would run quietly slow, and
    // nothing on screen would say so.
    const run = harness();
    run.loop.start();
    for (let i = 0; i < 250; i += 1) run.frame(FRAME);
    expect(run.steps()).toBe(500);
  });

  it("caps catch-up, so a backgrounded tab does not freeze on return", () => {
    const run = harness();
    run.loop.start();
    run.frame(600_000); // ten minutes away: 60,000 steps owed
    expect(run.steps()).toBe(240);
  });

  it("renders every frame when no cadence is asked for", () => {
    const run = harness();
    run.loop.start();
    for (let i = 0; i < 10; i += 1) run.frame(FRAME);
    expect(run.renders()).toBe(10);
  });

  it("holds the reduced-motion cadence at 4 fps while stepping at full rate", () => {
    // The preference asks for less flicker, not less simulation. This is the
    // assertion behind "informative motion is kept": one second of frames still
    // advances the full step count, but repaints at most four times.
    const run = harness(RATE, 4);
    run.loop.start();
    for (let i = 0; i < 50; i += 1) run.frame(FRAME);
    expect(run.steps()).toBe(RATE);
    expect(run.renders()).toBeLessThanOrEqual(4);
  });

  it("does nothing at all until it is started", () => {
    const run = harness();
    run.frame(1000);
    expect(run.steps()).toBe(0);
    expect(run.loop.running).toBe(false);
  });

  it("stops when stopped, and stays stopped", () => {
    const run = harness();
    run.loop.start();
    run.frame(FRAME);
    const stoppedAt = run.steps();
    run.loop.stop();
    run.frame(10_000);
    expect(run.loop.running).toBe(false);
    expect(run.steps()).toBe(stoppedAt);
  });

  it("changes the pace and nothing else when the speed control moves", () => {
    // The claim the speed control makes: only the pace. Two runs of the same
    // wall-clock time at different rates do DIFFERENT amounts of simulation —
    // that is the point — but the loop must not lose or invent steps doing it.
    const slow = harness();
    slow.loop.start();
    for (let i = 0; i < 25; i += 1) slow.frame(FRAME); // half a second at RATE
    slow.loop.setStepsPerSecond(RATE * 2);
    for (let i = 0; i < 25; i += 1) slow.frame(FRAME); // half a second at 2x

    // 50 steps earned at the first rate, 100 at the second.
    expect(slow.steps()).toBe(RATE / 2 + RATE);
  });

  it("carries the accumulator across a rate change", () => {
    // A fraction of a step already paid for in wall time is not thrown away:
    // clearing the accumulator on every change would let a visitor who nudges
    // the control lose simulation they had waited through.
    const run = harness();
    run.loop.start();
    // 15ms at 10ms a step: one step taken, 5ms banked.
    run.frame(15);
    expect(run.steps()).toBe(1);
    // Double the rate — 5ms a step — and hand it 5ms more. The banked 5 plus the
    // new 5 is two steps at the new rate. Clearing the accumulator would give one.
    run.loop.setStepsPerSecond(RATE * 2);
    run.frame(5);
    expect(run.steps()).toBe(3);
  });
});
