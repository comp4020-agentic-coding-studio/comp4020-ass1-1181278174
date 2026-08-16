// The honesty invariant, verbatim from Decision 1c: "the heuristic term η is a
// constant or purely local (momentum only) — it must never encode distance to food,
// or beat 1's sentence ("no ant knows the map") is false".
//
// RED: src/sim does not exist yet.
//
// This is the invariant that protects the ARGUMENT rather than the code, and it is
// the only negative control that would make the page look *better* if it broke: an
// engine reading a distance-to-food field finds short paths beautifully, passes
// every behaviour test, and quietly falsifies the claim on the h1. A page can fail
// honestly by breaking; it fails dishonestly by working for a reason it denies.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import type { Fixture } from "../src/fixtures/double-bridge.ts";
import { FIELD_V4, FIELD_V4_SPEC } from "../src/fixtures/field-v4.ts";
import { engine } from "./engine-api.ts";

const SIM_DIR = resolve("src/sim");

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("η is blind to where the food is", () => {
  it("gives the same choice distribution when the food moves", () => {
    // Identical terrain, different goal. With pheromone at the floor, nothing an
    // ant can legitimately read has changed, so nothing about its choice may.
    const asBuilt: Fixture = DOUBLE_BRIDGE;
    const foodMoved: Fixture = { ...DOUBLE_BRIDGE, food: "L4" };

    const distribution = (fixture: Fixture) => {
      const state = engine.createColony(fixture, { rho: 0, seed: 1 });
      return engine.choiceDistribution(state, fixture.nest);
    };

    const before = distribution(asBuilt);
    const after = distribution(foodMoved);

    expect([...after.keys()].sort()).toEqual([...before.keys()].sort());
    for (const [neighbour, probability] of before) {
      expect(
        after.get(neighbour),
        `Moving the food changed the chance of stepping to ${neighbour} on an ` +
          `unpheromoned graph. η is reading the goal, so "no ant knows the map" ` +
          `is false while the page asserts it.`,
      ).toBeCloseTo(probability, 12);
    }
  });

  it("splits an unpheromoned choice without preferring the shorter way", () => {
    // At the floor the two branches are indistinguishable to an ant: one leads 8
    // moves to food, the other into a wall. A distance heuristic would tell them
    // apart; a constant or momentum-only η cannot.
    const state = engine.createColony(DOUBLE_BRIDGE, { rho: 0, seed: 1 });
    const split = engine.choiceDistribution(state, DOUBLE_BRIDGE.nest);
    const weights = [...split.values()];
    expect(weights.length).toBeGreaterThan(1);
    for (const weight of weights) {
      expect(weight).toBeCloseTo(weights[0] as number, 12);
    }
  });
});

describe("η is blind to where the food is — on the field the page runs", () => {
  // Decision 22 makes this the FIRST sentence of the h1: "No ant knows the map."
  // The bridge's version above proves it on twelve nodes; this proves it on the
  // 2208 the visitor actually watches, where the engine also has a whisker and a
  // momentum weight, and either could have been a way to smuggle the goal in.
  it("gives the same choice distribution when the food block moves", () => {
    const moved: Fixture = {
      ...FIELD_V4,
      // Straight down the field, well clear of the nest — a relocation any
      // distance-reading term would have to notice.
      foodZone: (FIELD_V4.foodZone ?? []).map((cell) => {
        const [x, y] = cell.split(",");
        return `${x},${Number(y) + 12}`;
      }),
    };
    const distributionAt = (fixture: Fixture) => {
      const colony = engine.createColony(fixture, { rho: 0, seed: 1, ants: 400 });
      return engine.choiceDistribution(colony, fixture.nest);
    };
    const before = distributionAt(FIELD_V4);
    const after = distributionAt(moved);

    expect([...before.keys()].sort()).toEqual([...after.keys()].sort());
    for (const [node, probability] of before) {
      expect(
        Math.abs((after.get(node) ?? 0) - probability),
        `moving the food changed the chance of stepping to ${node}: some term is ` +
          `reading the goal, and "no ant knows the map" is false`,
      ).toBeLessThan(1e-12);
    }
  });

  it("splits the nest's four ways evenly before any scent exists", () => {
    // Open ground, zero pheromone: nothing distinguishes the direction of the
    // food from the direction of empty field, so nothing may.
    const colony = engine.createColony(FIELD_V4, { rho: 0, seed: 1, ants: 400 });
    const split = engine.choiceDistribution(colony, FIELD_V4.nest);
    expect(split.size).toBe(4);
    for (const [, probability] of split) {
      expect(Math.abs(probability - 0.25)).toBeLessThan(1e-12);
    }
    // And the food really is off to one side, so the test is not vacuous.
    expect(FIELD_V4_SPEC.food[0]).toBeGreaterThan(FIELD_V4_SPEC.nest[0] + 40);
  });
});

describe("the engine cannot reach the oracle", () => {
  it("has a src/sim to check", () => {
    expect(
      existsSync(SIM_DIR),
      "src/sim does not exist yet, so this guard cannot fail — which is exactly " +
        "what a decorative test looks like. It is red until there is an engine.",
    ).toBe(true);
  });

  it("imports nothing from src/oracle", () => {
    expect(
      existsSync(SIM_DIR),
      "src/sim does not exist yet — nothing to scan. Red until there is an engine.",
    ).toBe(true);
    for (const file of filesUnder(SIM_DIR)) {
      const source = readFileSync(file, "utf8");
      expect(
        /from\s+["'][^"']*oracle/.test(source),
        `${file} imports the oracle. BFS is trustworthy because it shares no ` +
          `code with the engine; an engine that can read it can also cheat.`,
      ).toBe(false);
    }
  });
});
