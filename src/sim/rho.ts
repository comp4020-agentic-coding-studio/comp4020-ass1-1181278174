// The coordinates every measurement is taken on — the forgetting rates, the
// sampling grid, and the observation horizon — in one place, so a threshold
// cannot be derived on one set of coordinates and exercised on another. That
// already happened once: the SWITCHED test ran the real engine at ρ = 0.05
// (stale, pre-Decision-11) against a threshold derived at 0.12, and behaviour
// (4)'s test ran at the ρ = 1 Decision 11 rules out.
//
// Not engine constants (src/sim/params.ts): the UI imports these too. RHO.default
// is the slider's default position, RHO.max its maximum, and SAMPLE is the grid
// the trace strip under the canvas plots on — the same grid the derivation
// sampled, so the line on screen and the number in the test cannot disagree.
//
// The file is named for RHO because that is what it held first; it is the
// measurement grid that grew into it, not the other way round.

/**
 * Decision 11: the slider is linear 0.00–0.25, step 0.01, default 0.12, and
 * ρ = 1 is off the control entirely — at ρ = 1 pheromone is wiped every step and
 * no trail forms at all, so a test there asserts against a degenerate graph
 * rather than against forgetting.
 *
 * `scripts/derive.ts` derived EMERGED/SWITCHED/M at `default`, LOCKED/N at
 * `locked`, and UNSTABLE/K at `max`, for exactly that reason.
 */
export const RHO = { locked: 0, default: 0.12, max: 0.25 } as const;

/**
 * The field's rates (Decision 19, provisional). A 30-move route cannot outlive
 * the bridge's ρ = 0.12 — a half-life of about five steps — so the field runs two
 * orders of magnitude slower and its slider is a different instrument.
 *
 * Kept separate from `RHO` rather than replacing it, because every derived
 * threshold in spec/oracles.md was measured on the bridge at those rates. One
 * constant serving two fixtures would be the same drift this file exists to stop.
 *
 * `default` is measured on the field the page runs, not chosen: see the note on
 * the value itself.
 */
export const FIELD_RHO = {
  locked: 0,
  /**
   * Decided by measurement, not taste (Decision 24). On field v4.1 at 20 s:
   * 0.005 settles at 1.70×, 0.01 at 1.13×, 0.02 at **1.00×** — the shortest
   * route there is — and all three heal a broken road within 250 steps.
   */
  default: 0.02,
  /**
   * Decision 30: the right-hand end has to be somewhere no road survives, or
   * "forget everything" is a label on nothing. Measured on field v5 with a road
   * grown at 0.02 and ρ then raised: blank keeps its road at 0.15 and loses it at
   * 0.2 (18.9× within 3,000 steps); random keeps it even at 0.2 (1.15×) and loses
   * it at 0.3 (23×); the maze loses it from 0.15. So 0.3 — every scene's road is
   * gone within about twenty seconds there. Linear, step 0.001: the working band
   * (0.002–0.05) is the left sixth of the track, which is coarse but usable.
   */
  max: 0.3,
  step: 0.001,
  /**
   * Decision 32: the slider's track is a position 0–1 and ρ = max · position^curve.
   * With curve 2 the working band 0.002–0.05 fills the left ~40% of the track
   * (0.02 sits at 0.26, 0.05 at 0.41, 0.1 at 0.58) instead of the left sixth, and
   * the right-hand end is still 0.3. `track` is the position's step.
   */
  curve: 2,
  track: 0.002,
} as const;

/**
 * Steps between trace samples. 250 is the grid every distribution in
 * spec/oracles.md §3 was measured on, which is why `M` was rounded up to a
 * multiple of it — every derived step count is a whole number of samples.
 */
export const SAMPLE = 250;

/**
 * How many completed trips a colony keeps (Decision 12). The reading never looks
 * further back than `N_trips`, and the page runs forever — 24,614 trips were
 * being retained after 5,000 steps before this existed.
 *
 * It must equal `N_trips`; `spec/engine-invariants.test.ts` asserts that, because
 * the engine cannot import a harness threshold and a second copy of a number is a
 * place for it to be wrong. `scripts/derive.ts` opts out with `Infinity`, since
 * the sweep that *chooses* `N_trips` compares windows up to 500 and cannot be run
 * inside a buffer sized by its own answer.
 */
export const TRIP_HISTORY = 300;

/**
 * Completed trips below which the page says "no reading yet" rather than a
 * number. Same arrangement as `TRIP_HISTORY`: it must equal the derived
 * `MIN_TRIPS`, and `spec/engine-invariants.test.ts` asserts it does.
 */
export const MIN_TRIPS = 65;

/**
 * Steps a run is observed for after the shortcut opens. `N` (6000) equals this
 * because `N` was derived as "the whole window held, no decay seen to measure",
 * not because they mean the same thing: `N` is behaviour (2)'s bound, this is
 * how long anything was watched at all.
 */
export const HORIZON = 6000;
