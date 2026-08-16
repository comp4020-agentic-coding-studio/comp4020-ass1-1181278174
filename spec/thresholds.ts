// Every threshold, in one place, so no test invents its own.
//
// Derived 2026-08-17 by `pnpm derive`: two-sided separation against the negative
// controls in spec/mutants/, 10 seeds × ρ ∈ {0, 0.12, 0.25}, both margins recorded
// in spec/oracles.md §3 ("Derived values"). SETTLE, N_trips and MIN_TRIPS are
// stability floors rather than two-sided separations; each says so at its entry
// in that table. Nothing here was adjusted to make a test pass — a threshold that
// would not separate stayed null and was reported, not moved.
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
  SETTLE: 2000,
  EMERGED: 1.15,
  LOCKED: 1.85,
  SWITCHED: 1.45,
  UNSTABLE: 1.4,
  N: 6000,
  M: 3250,
  K: 2,
  N_trips: 300,
  MIN_TRIPS: 65,
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
