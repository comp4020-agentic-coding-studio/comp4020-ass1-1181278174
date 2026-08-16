// The Goss/Deneubourg double bridge, as committed data.
//
// Long branch found first, short branch added later — which is the experiment
// that makes the claim: real colonies keep marching the long way, because real
// pheromone evaporates too slowly. The short branch is therefore CLOSED at load
// and opens on the visitor's toggle.
//
// Written out literally rather than generated, because every number recorded in
// spec/oracles.md must be checkable by counting the lines below.

export type NodeId = string;

export interface FixtureEdge {
  readonly a: NodeId;
  readonly b: NodeId;
  /** A wall: no ant crosses it, BFS does not traverse it. */
  readonly closed?: boolean;
  /** The one segment the visitor toggles to open the short branch (Decision 2a). */
  readonly shortcut?: boolean;
}

/**
 * Parameters that belong to the FIXTURE, not to the engine.
 *
 * spec/oracles.md is authoritative for these; they are reported alongside every
 * distribution, and no conclusion about lock-in is recorded without them. Lock-in
 * sharpness depends on `h` and `floor`, so a spike that omits them cannot support
 * a claim about behaviour (2).
 */
export interface FixtureParams {
  /** Choice nonlinearity: P ∝ (k + τ)^h. Deneubourg's double bridge uses h ≈ 2. */
  readonly h: number;
  /** Additive constant in (k + τ)^h — how much exploration survives at τ = 0. */
  readonly k: number;
  /** Minimum pheromone on any edge — bounds how hard lock-in can ever be. */
  readonly floor: number;
}

export interface Fixture {
  readonly name: string;
  readonly nest: NodeId;
  readonly food: NodeId;
  readonly nodes: readonly NodeId[];
  readonly edges: readonly FixtureEdge[];
  /** Node sequences from nest to food inclusive. Redundant with `edges` on purpose: spec/fixture.test.ts checks the two agree rather than trusting them. */
  readonly branches: {
    readonly short: readonly NodeId[];
    readonly long: readonly NodeId[];
  };
  readonly params: FixtureParams;
}

export const DOUBLE_BRIDGE: Fixture = {
  name: "double-bridge",
  nest: "NEST",
  food: "FOOD",

  nodes: [
    "NEST",
    "FOOD",
    // long branch interior
    "L1",
    "L2",
    "L3",
    "L4",
    "L5",
    "L6",
    "L7",
    // short branch interior
    "S1",
    "S2",
    "S3",
  ],

  edges: [
    // Long branch: 8 edges, open from the start. This is the one the colony finds
    // first and locks onto.
    { a: "NEST", b: "L1" },
    { a: "L1", b: "L2" },
    { a: "L2", b: "L3" },
    { a: "L3", b: "L4" },
    { a: "L4", b: "L5" },
    { a: "L5", b: "L6" },
    { a: "L6", b: "L7" },
    { a: "L7", b: "FOOD" },

    // Short branch: 4 edges, severed at S1—S2 until the visitor opens it.
    { a: "NEST", b: "S1" },
    { a: "S1", b: "S2", closed: true, shortcut: true },
    { a: "S2", b: "S3" },
    { a: "S3", b: "FOOD" },
  ],

  branches: {
    short: ["NEST", "S1", "S2", "S3", "FOOD"],
    long: ["NEST", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "FOOD"],
  },

  params: {
    // From Deneubourg et al. (1990), whose double-bridge model chooses with
    // (k + τ)^h. At h = 1 the choice is linear in pheromone and lock-in is weak
    // BY CONSTRUCTION — so a spike run at h = 1 that fails to lock in is not
    // evidence against deposit mode 1b (spec/oracles.md, spike watch).
    h: 2,
    k: 20,
    // First value, not a derived one. The spike probes it; it is here so that
    // every run reports the floor it actually used.
    floor: 0,
  },
};
