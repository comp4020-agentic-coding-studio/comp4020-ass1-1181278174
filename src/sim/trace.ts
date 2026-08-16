// The trace: the reading, sampled on a fixed grid, as a series.
//
// This is the series the trace strip under the canvas plots AND the series the
// behaviour and core-interaction tests assert on — one sampler, as there is one
// reading function, because "if the line on screen and the number in the test
// ever disagree, one of them is lying" (spec/oracles.md §2).
//
// NO SMOOTHING. Any easing applied for looks happens to the drawing and never to
// the series. A smoothed series would turn "no K consecutive samples below" —
// which is the whole of behaviour (4) — into a claim about a filter.
//
// Pure and host-agnostic: it takes whatever can step and report its completed
// trips, so it runs the real engine, a negative control, or a Worker-side state
// without knowing which.

import type { Reading, ReadingOptions } from "./reading.ts";
import { reading } from "./reading.ts";
import { SAMPLE } from "./rho.ts";

/** The part of an engine a trace needs. Deliberately smaller than EngineModule. */
export interface TraceHost<S> {
  step(state: S): void;
  /** Lengths of completed food→nest trips, oldest first. */
  completedTripLengths(state: S): readonly number[];
}

export interface TraceOptions extends ReadingOptions {
  /** Total steps to run. A whole number of samples; every derived count is. */
  readonly steps: number;
  /** BFS shortest for the terrain as it now stands — recomputed after a toggle. */
  readonly against: number;
  /** Steps between samples. The derivation grid unless a caller says otherwise. */
  readonly sample?: number;
}

/**
 * Advance `state` by `options.steps`, taking the reading every `sample` steps.
 *
 * Mutates the state it is given — the caller owns it — and returns one `Reading`
 * per sample, including the "no reading yet" ones. A warm-up sample is not a
 * number and must not be read as one, so it stays in the series as its own state
 * rather than being dropped or zero-filled.
 */
export function trace<S>(
  host: TraceHost<S>,
  state: S,
  options: TraceOptions,
): readonly Reading[] {
  const sample = options.sample ?? SAMPLE;
  const series: Reading[] = [];
  for (let done = 0; done < options.steps; done += sample) {
    for (let i = 0; i < sample; i += 1) host.step(state);
    series.push(
      reading(host.completedTripLengths(state), options.against, options),
    );
  }
  return series;
}

/**
 * The longest run of consecutive samples reading below `ceiling`.
 *
 * "Never stabilises" is a claim about consecutive samples, and one end value
 * cannot express it: a colony that dips once and climbs back has not settled.
 * A "no reading yet" sample breaks a run rather than continuing it — no reading
 * is not a low reading.
 */
export function longestRunBelow(
  series: readonly Reading[],
  ceiling: number,
): number {
  let longest = 0;
  let run = 0;
  for (const sample of series) {
    if (sample.status === "ok" && (sample.ratio as number) < ceiling) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }
  return longest;
}

/** The first sample index reading below `target`, or -1. Steps = (i + 1) × sample. */
export function firstSampleBelow(
  series: readonly Reading[],
  target: number,
): number {
  return series.findIndex(
    (sample) => sample.status === "ok" && (sample.ratio as number) < target,
  );
}
