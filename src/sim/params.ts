// Engine constants only.
//
// The fixture's parameters — h, k and floor — are NOT here and must never be
// redefined here. They belong to the Fixture object and spec/oracles.md is
// authoritative for them, because lock-in sharpness depends on them and a run that
// cannot report which values it used cannot support a conclusion.
//
// Neither this file nor spec/oracles.md is edited without asking.

export const ENGINE_PARAMS = {
  /** Ants in the colony unless a caller overrides it. */
  ants: 64,

  /**
   * Pheromone laid on the edge an ant just crossed, every step. Fixed per step —
   * no Q/L term, which is deposit mode 1b: an ant carries one bit, not a route
   * length. The Q/L retrace flag stays off until spike evidence says otherwise.
   */
  depositPerStep: 1,
} as const;

/**
 * One step = every ant moves across exactly one edge, then both pheromone maps
 * evaporate once. Fixed-step and decoupled from any frame clock, so the headless
 * spike and the page advance the simulation identically.
 */
export const STEP_SEMANTICS =
  "one step: every ant moves one edge, then both maps evaporate once";
