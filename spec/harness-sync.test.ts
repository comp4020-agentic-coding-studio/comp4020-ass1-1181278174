import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md restates contracts that PLAN.md and spec/oracles.md decide, because
// the agent reads CLAUDE.md every turn and the others only when told to. Two
// copies of one fact drift: the review that caught beat 1 contradicting Decision
// 2b, and the superseded "5 of the 8" sitting beside its replacement, were both
// that failure. No check could see either.
//
// Clauses CLAUDE.md wraps in «guillemets» claim to be verbatim from a source of
// truth. This test holds the claim. Whitespace is normalised because both files
// are hard-wrapped, and a clause that spans a line break is still the same
// clause — line wrapping has already produced two false negatives by hand.

const SOURCES = ["PLAN.md", "spec/oracles.md"];
const MARKED = /«([^»]+)»/g;

// Blockquote markers are stripped before comparing: PLAN.md keeps director text
// in `>` quote blocks, so without this a clause spanning a wrapped quote line
// picks up a stray `>` and never matches. That was this test's first red.
const normalise = (text: string) =>
  text
    .replace(/^[ \t]*(?:>[ \t]?)+/gm, "")
    .replace(/\s+/g, " ")
    .trim();

const harness = readFileSync(resolve("CLAUDE.md"), "utf8");
const sources = SOURCES.map((path) => ({
  path,
  text: normalise(readFileSync(resolve(path), "utf8")),
}));

const clauses = [...harness.matchAll(MARKED)].map((match) =>
  normalise(match[1] ?? ""),
);

const label = (clause: string) =>
  clause.length > 64 ? `${clause.slice(0, 64)}…` : clause;

describe("harness sync: every marked clause is still verbatim", () => {
  it("finds clauses to check", () => {
    expect(
      clauses.length,
      "CLAUDE.md marks nothing with «guillemets». Either the markers were " +
        "stripped or the convention was abandoned — if the latter, delete this " +
        "test rather than leaving it passing vacuously.",
    ).toBeGreaterThan(0);
  });

  it("marks no empty clause", () => {
    expect(clauses.filter((clause) => clause === "")).toEqual([]);
  });

  for (const clause of clauses) {
    it(`«${label(clause)}»`, () => {
      const holders = sources.filter((source) => source.text.includes(clause));
      expect(
        holders.length,
        `CLAUDE.md marks this clause as verbatim, but no source of truth has it:\n` +
          `  ${clause}\n` +
          `Searched: ${SOURCES.join(", ")}\n` +
          `Either the copy in CLAUDE.md drifted, or the source was reworded. ` +
          `Fix whichever is wrong — do not delete the marker to make this pass.`,
      ).toBeGreaterThan(0);
    });
  }
});
