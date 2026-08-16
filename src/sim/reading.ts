// The reading. One function, for the UI, the trace and the tests alike — two
// implementations would eventually disagree and the page would then claim something
// no test checks.
//
// Windowed MEAN of completed food→nest trip lengths ÷ BFS shortest (Decision 5, as
// amended 2026-08-17). It was the median until the sweep showed the median is a step
// function on a two-valued fixture: trips here are 4 moves or 8, so the median reads
// 2.000× or 1.000× and nothing between, and at ρ = 0.3 it reported 2.000× while 48%
// of trips were short. The mean equals 2 − short-trip share to three decimals, is
// continuous and monotone in what the visitor is watching, and separates ρ = 0.03
// from ρ = 0.05 where the median cannot.
//
// Trips, not steps: trips on the shortcut complete faster, so the window flushes
// faster after a switch, and at ρ = 0 the long trips keep completing so the reading
// stays legitimately high rather than decaying by arithmetic.
//
// Pure. Takes the BFS length as an argument, so the engine never contains a
// shortest-path algorithm.

import { MIN_TRIPS, TRIP_HISTORY } from "./rho.ts";

export interface Reading {
  readonly status: "no reading yet" | "ok";
  readonly ratio: number | null;
}

export interface ReadingOptions {
  /** How many completed trips the mean covers. */
  readonly window: number;
  /** Below this many completed trips there is no reading, only a warm-up. */
  readonly minTrips: number;
}

/**
 * The window the page reads over. The harness has its own copy in
 * `spec/thresholds.ts` — that one is authoritative, this one is what ships, and
 * `spec/engine-invariants.test.ts` asserts they are the same numbers. Shipping
 * code cannot import a threshold from `spec/`, and a page that read a different
 * window from the tests would be showing a number nothing checks.
 */
export const READING_WINDOW: ReadingOptions = {
  window: TRIP_HISTORY,
  minTrips: MIN_TRIPS,
};

export function mean(values: readonly number[]): number {
  if (values.length === 0) return Number.NaN;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Kept for the spike's median-vs-mean comparison. The reading does not use it. */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted.length >> 1;
  if (sorted.length === 0) return Number.NaN;
  return sorted.length % 2 === 1
    ? (sorted[middle] as number)
    : ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

export function reading(
  tripLengths: readonly number[],
  bfsShortest: number,
  options: ReadingOptions,
): Reading {
  if (tripLengths.length < options.minTrips) {
    // Never a number here. A warm-up value read as data is worse than no data.
    return { status: "no reading yet", ratio: null };
  }
  const recent = tripLengths.slice(-options.window);
  return { status: "ok", ratio: mean(recent) / bfsShortest };
}
