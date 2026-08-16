// Every threshold, in one place, so no test invents its own.
//
// All null: nothing has been derived yet. Values arrive only from the spike, by
// two-sided separation against the negative controls, with both margins recorded
// in spec/oracles.md §3 — and never by adjusting a number until a test passes.
//
// `derived()` throws while a threshold is still a symbol, so a behaviour test's
// red says "not derived yet" rather than "expected undefined to be less than
// undefined". That distinction is the difference between a test that reports and
// a test that merely fails.

export type ThresholdName =
  /**
   * Steps the colony runs BEFORE the shortcut opens, for the long trail to
   * establish. Not a bound on anything — `M` is the switch bound only.
   */
  | "SETTLE"
  /**
   * Ratio at or below which a near-shortest path counts as having emerged.
   * Behaviour (1) measures emergence on its own terms — how close to the only
   * route available the ants actually get — which is a different claim from
   * `SWITCHED`, the ratio that means they left the long way behind.
   */
  | "EMERGED"
  /** Ratio at or above which the colony counts as NOT having switched. */
  | "LOCKED"
  /** Ratio below which the colony counts as having switched. */
  | "SWITCHED"
  /** Ratio the trail must not hold below at maximum forgetting. */
  | "UNSTABLE"
  /** Steps the lock-in must persist after the shortcut opens. */
  | "N"
  /** Steps within which the default rate must switch. */
  | "M"
  /** Consecutive steps that would count as stabilised at maximum forgetting. */
  | "K"
  /** Window, in completed food→nest trips, for the trip-length median. */
  | "N_trips"
  /** Completed trips below which the readout says "no reading yet". */
  | "MIN_TRIPS";

export const THRESHOLDS: Record<ThresholdName, number | null> = {
  SETTLE: null,
  EMERGED: null,
  LOCKED: null,
  SWITCHED: null,
  UNSTABLE: null,
  N: null,
  M: null,
  K: null,
  N_trips: null,
  MIN_TRIPS: null,
};

export function isDerived(name: ThresholdName): boolean {
  return THRESHOLDS[name] !== null;
}

export function derived(name: ThresholdName): number {
  const value = THRESHOLDS[name];
  if (value === null) {
    throw new Error(
      `Threshold ${name} has not been derived yet. It is a symbol until the ` +
        `spike separates the real engine from the negative controls with a ` +
        `stated margin on both sides — see spec/oracles.md §3. Do not pick a ` +
        `number here to make a test pass.`,
    );
  }
  return value;
}
