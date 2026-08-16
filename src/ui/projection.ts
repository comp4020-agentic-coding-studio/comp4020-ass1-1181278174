// Where the logical graph sits on screen — normalised, pure, and DOM-free.
//
// The fixture carries no coordinates on purpose: it is a graph, not a picture.
// This module is the one place that decides what it looks like, in a 0–1 square,
// so the canvas can be any size and a resize is only ever a redraw. Nothing here
// touches a document, a context or a device pixel — which is why the resize test
// can hold "the engine is untouched by drawing" without a browser.
//
// The two branches join the same two points, so screen distance cannot show "half
// as long" by itself. Arc height is the only lever: the long way bulges over the
// top, the short way runs nearly straight underneath. That difference is beat 2's
// whole argument made visible before a word of prose.

import type { Fixture, FixtureEdge, NodeId } from "../fixtures/double-bridge.ts";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface ProjectedEdge {
  /** Index into `fixture.edges` — the engine's edge identity, never re-ordered. */
  readonly index: number;
  readonly edge: FixtureEdge;
  readonly a: Point;
  readonly b: Point;
}

export interface Projection {
  readonly nodes: ReadonlyMap<NodeId, Point>;
  readonly edges: readonly ProjectedEdge[];
}

// Where the nest and food sit, and how far the long way bulges off that line.
//
// These are not free. Both branches join the same two points, so the short way
// can never be drawn shorter than the straight line between them — which makes
// the straight line the short way, and the long way's arc the only place a
// length difference can come from. A first attempt hung both branches as arcs
// and drew the long way only 1.33× the short one; the fixture's ratio is 2, and
// spec/canvas.test.ts went red for exactly that reason.
//
// A true 2× is geometrically impossible here (a semicircle on this span is only
// ~1.6× its diameter, and anything taller leaves the unit square), so the
// picture makes up the rest by counting: seven waypoints along the top against
// three underneath. The test holds the part that IS achievable — the long way
// drawn at least 40% longer — rather than a ratio the drawing cannot honour.
const BASE_Y = 0.76;
const LONG_LIFT = 0.58;
const SHORT_LIFT = 0;
const LEFT = 0.08;
const RIGHT = 0.92;

function arc(
  into: Map<NodeId, Point>,
  branch: readonly NodeId[],
  lift: number,
): void {
  const spans = branch.length - 1;
  branch.forEach((node, i) => {
    const t = i / spans;
    into.set(node, {
      x: LEFT + t * (RIGHT - LEFT),
      y: BASE_Y - lift * Math.sin(Math.PI * t),
    });
  });
}

export function project(fixture: Fixture): Projection {
  const nodes = new Map<NodeId, Point>();
  // Both branches write NEST and FOOD; sin(0) = sin(π) = 0, so both agree on the
  // baseline and the second write is the same point as the first.
  arc(nodes, fixture.branches.long, LONG_LIFT);
  arc(nodes, fixture.branches.short, SHORT_LIFT);

  const origin: Point = { x: LEFT, y: BASE_Y };
  const edges = fixture.edges.map((edge, index) => ({
    index,
    edge,
    a: nodes.get(edge.a) ?? origin,
    b: nodes.get(edge.b) ?? origin,
  }));

  return { nodes, edges };
}

/** Distance from `p` to segment `a`–`b`. Used for "did they tap the wall?". */
export function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared === 0
      ? 0
      : Math.max(
          0,
          Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared),
        );
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** The one segment the visitor toggles — the single verb's target. */
export function shortcutEdge(projection: Projection): ProjectedEdge {
  return projection.edges.find(
    (candidate) => candidate.edge.shortcut === true,
  ) as ProjectedEdge;
}
