// What `prefers-reduced-motion` changes, as data rather than as scattered ifs.
//
// Decision 8: the branch nobody exercises is the broken one, so this is one
// function with one return value and `spec/reduced-motion.test.ts` runs the page
// through it both ways.
//
// The distinction the preference actually asks for is between motion that CARRIES
// information and motion that decorates. The trail growing, the ants moving and
// the trace line advancing are the argument — dropping them would leave a page
// that says "watch how it changes" and does not change. What goes is the
// autoplay (nothing starts moving before the visitor asks) and the frame rate
// (four repaints a second is legible without flicker). There is no glow pulse or
// easing to drop, because none was ever added — `styles.css` also kills any
// transition or animation under the same query, so that stays true by force.

export interface MotionPlan {
  /**
   * Nobody autoplays any more (Decision 26): the page loads paused for every
   * visitor and Run is the way in. Kept as a field so the tests can assert it.
   */
  readonly autoplay: false;
  /** Repaints per second; `undefined` means every frame. Steps are unaffected. */
  readonly rendersPerSecond: number | undefined;
}

export function motionPlan(reducedMotion: boolean): MotionPlan {
  return reducedMotion
    ? { autoplay: false, rendersPerSecond: 4 }
    : { autoplay: false, rendersPerSecond: undefined };
}

/** Reads the preference, defaulting to "not reduced" where it cannot be asked. */
export function prefersReducedMotion(view: Window | null): boolean {
  return view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
