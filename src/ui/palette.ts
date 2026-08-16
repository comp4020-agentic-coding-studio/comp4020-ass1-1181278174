// The ink. One palette — dark, chosen from two directions offered at slice 3
// (Decision 13); the light one and the `?scheme=` switch that let them be
// compared are gone, and the screenshots of both stay in docs/screenshots as the
// record of what the choice was between.
//
// It is data rather than CSS custom properties because the canvas would otherwise
// need a getComputedStyle call per frame. `styles.css` mirrors these values for
// the page chrome around the canvas.
//
// Passed in rather than imported by the views, so a view can be drawn in a test
// without the page's choices reaching into it.

export interface Palette {
  /** Behind the graph. */
  readonly ground: string;
  /** Terrain that exists but carries nothing — the road with no traffic. */
  readonly terrain: string;
  /** The barrier across the shortcut while it is shut. */
  readonly wall: string;
  /** Seekers lay this one: the way home. RGB triple, alpha applied per edge. */
  readonly home: string;
  /** Carriers lay this one: the way to food. */
  readonly food: string;
  /** An ant with nothing, and an ant carrying. */
  readonly seeking: string;
  readonly carrying: string;
  /** Nest and food themselves, and their labels. */
  readonly terminal: string;
  readonly label: string;
  /** The trace strip's baseline, its "shortcut opened" tick, and the line. */
  readonly baseline: string;
  readonly tick: string;
  readonly line: string;
}

export const DARK: Palette = {
  ground: "#0f1216",
  terrain: "#2b323d",
  wall: "#8d97a8",
  home: "111, 211, 199",
  food: "242, 166, 90",
  seeking: "rgba(214, 220, 230, 0.9)",
  carrying: "#ffb765",
  terminal: "#eceae5",
  label: "#8a93a3",
  baseline: "#39414e",
  tick: "#6fd3c7",
  line: "#ffb765",
};
