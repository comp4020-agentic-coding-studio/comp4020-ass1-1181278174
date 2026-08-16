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
  /** Beat 1 is live emergence, so the default is to start. Not under reduce. */
  readonly autoplay: boolean;
  /** Repaints per second; `undefined` means every frame. Steps are unaffected. */
  readonly rendersPerSecond: number | undefined;
  /** The way in, when nothing autoplays: an explicit "watch it grow". */
  readonly needsStartButton: boolean;
}

export function motionPlan(reducedMotion: boolean): MotionPlan {
  return reducedMotion
    ? { autoplay: false, rendersPerSecond: 4, needsStartButton: true }
    : { autoplay: true, rendersPerSecond: undefined, needsStartButton: false };
}

/** Reads the preference, defaulting to "not reduced" where it cannot be asked. */
export function prefersReducedMotion(view: Window | null): boolean {
  return view?.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}
