// The reading. One function, for the UI, the trace and the tests alike — two
// implementations would eventually disagree and the page would then claim something
// no test checks.
//
// Median trip length over the last `window` COMPLETED food→nest trips, divided by
// the BFS shortest path. Trips, not steps: trips on the shortcut complete faster, so
// the window flushes faster after a switch, and at ρ = 0 the long trips keep
// completing so the median stays legitimately high rather than decaying by
// arithmetic.
//
// Pure. Takes the BFS length as an argument, so the engine never contains a
// shortest-path algorithm.

export interface Reading {
  readonly status: "no reading yet" | "ok";
  readonly ratio: number | null;
}

export interface ReadingOptions {
  /** How many completed trips the median covers. */
  readonly window: number;
  /** Below this many completed trips there is no reading, only a warm-up. */
  readonly minTrips: number;
}

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
  return { status: "ok", ratio: median(recent) / bfsShortest };
}
