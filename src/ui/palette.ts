// The ink. One palette, light (Decision 13 as amended).
//
// Slice 3 chose dark for a fixture of twelve edges, where a trail glowing against
// near-black WAS the picture. The subject is now four hundred ants on a field of
// 2185 cells, and a black dot on white is the most legible ant there is — so the
// field is near-white, the ants are black, and the scent is what glows.
//
// It is data rather than CSS custom properties because the canvas would otherwise
// need a getComputedStyle call per frame. `styles.css` mirrors these values for
// the page chrome around the canvas.
//
// Contrast, checked against the ground `#faf9f6`: ink 15.9:1, muted 5.6:1,
// blocked-grey 3.4:1 (a large solid shape, not text, so AA's 4.5 does not apply
// to it — the text that must clear 4.5 is `ink` and `muted`, and both do).

export interface Palette {
  /** Open ground the ants walk on. */
  readonly ground: string;
  /** Wall and obstacle blocks: solid, mid grey, unmistakably not walkable. */
  readonly blocked: string;
  /** The doorway while it is shut — the same grey, with the tap ring around it. */
  readonly gapRing: string;
  /** An ant. Four hundred of them, and they must read at 390px wide. */
  readonly ant: string;
  /** The nest disc and the food disc. */
  readonly nest: string;
  readonly food: string;
  /**
   * The two scents, as RGB triples so the renderer can vary alpha per cell.
   * Food-scent is the warm one and it is the road; home-scent is fainter.
   */
  readonly foodScent: string;
  readonly homeScent: string;
  /** Page chrome the canvas draws itself: labels, the strip, the trace line. */
  readonly ink: string;
  readonly muted: string;
  readonly baseline: string;
  readonly tick: string;
  readonly line: string;
}

export const LIGHT: Palette = {
  ground: "#faf9f6",
  blocked: "#9aa0a8",
  gapRing: "#c2410c",
  ant: "#0b0b0c",
  nest: "#1d4ed8",
  food: "#15803d",
  foodScent: "234, 130, 20",
  homeScent: "56, 189, 208",
  ink: "#1a1c1f",
  muted: "#5b6068",
  baseline: "#d7d3ca",
  tick: "#0f766e",
  line: "#c2410c",
};
