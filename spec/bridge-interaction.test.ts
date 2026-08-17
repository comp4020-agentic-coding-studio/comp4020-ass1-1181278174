// The double bridge's three outcomes — the oracle fixture (spec/oracles.md §4).
//
// This USED to be the page's core-interaction contract; the page has since moved
// to field v5 and its own promises are held in spec/core-interaction.test.ts
// against provisional field numbers (Decision 32, oracles.md §6). The bridge
// stays because every derived threshold lives on it: a trail forms, the shortcut
// opens, and what happens next depends on one control and nothing else. Same
// engine, same fixture, same seed for all three rates — so the only thing that
// differs between these three outcomes is ρ. That is the argument. If the three
// runs differed in anything else, the page would be showing an effect and
// crediting it to forgetting.
//
// This is spec/oracles.md §1's reading 2 held mechanically ("the core interaction
// changes the primary content, visibly") — reading 3, that a person arrives at the
// claim without being told, is §5's business and no test's.
//
// It reuses spec/flow.ts rather than restating the schedule, and every number in
// it is a derived symbol: nothing here may be nudged to make the page's story
// come out.

import { describe, expect, it } from "vitest";
import { HORIZON, RHO, SAMPLE } from "../src/sim/rho.ts";
import { firstSampleBelow, longestRunBelow } from "../src/sim/trace.ts";
import {
  BFS_CLOSED,
  FIXTURE,
  REAL,
  SEED,
  settled,
  take,
  traceAfterShortcut,
} from "./flow.ts";
import { derived } from "./thresholds.ts";

const ratios = (series: readonly { ratio: number | null }[]) =>
  series.map((sample) => sample.ratio);

describe("the double bridge — one control, three outcomes, one engine (oracle fixture)", () => {
  it("before the visitor touches anything, a road exists that nobody planned", () => {
    // Beat 1. Zero pheromone at load, nothing pre-baked: the colony is on a
    // near-shortest route through the only terrain there is, and no ant has seen
    // the map. Measured against the 8 moves actually available, not the 4 that
    // are still walled off.
    const result = take(REAL, settled(REAL, RHO.default), BFS_CLOSED);
    expect(result.status).toBe("ok");
    expect(result.ratio).toBeLessThanOrEqual(derived("EMERGED"));
  });

  it("with forgetting off, the shortcut opens and the colony does not care", () => {
    // Beat 3, and the discriminating one. The short branch is now there, in
    // plain sight, half the length — and the reading stays pinned at the long
    // way for the whole horizon. Nothing is wrong with the ants; nothing
    // evaporates, so nothing they learned can be unlearned.
    const series = traceAfterShortcut(REAL, RHO.locked, derived("N"));
    const stuck = derived("LOCKED");
    expect(series).toHaveLength(derived("N") / SAMPLE);
    for (const sample of series) expect(sample.status).toBe("ok");
    expect(Math.min(...(ratios(series) as number[]))).toBeGreaterThanOrEqual(
      stuck,
    );
  });

  it("at the slider's default, the same colony breaks out within M steps", () => {
    // Beat 4. Same seed, same fixture, same opening move — only ρ differs. The
    // reading has to actually cross, not merely trend: `firstSampleBelow` is the
    // step the visitor would see the line come down.
    const series = traceAfterShortcut(REAL, RHO.default, derived("M"));
    const crossed = firstSampleBelow(series, derived("SWITCHED"));
    expect(crossed).toBeGreaterThanOrEqual(0);
    expect((crossed + 1) * SAMPLE).toBeLessThanOrEqual(derived("M"));
  });

  it("at the slider's maximum, it never settles on anything", () => {
    // The far end of the same control, and the reason the slider stops at 0.25
    // rather than at 1: this must be a trail that exists and will not settle, not
    // a wiped graph. No K consecutive samples below UNSTABLE — one dip is noise,
    // two in a row is what K exists to catch.
    const series = traceAfterShortcut(REAL, RHO.max, HORIZON);
    expect(longestRunBelow(series, derived("UNSTABLE"))).toBeLessThan(
      derived("K"),
    );
  });

  it("the same seed gives the same trace, or none of the above means anything", () => {
    // Every claim above is a claim about one seeded run. If the run were not
    // reproducible, each of them would be an anecdote — and the trace the visitor
    // sees would not be the series the tests assert on.
    const once = traceAfterShortcut(REAL, RHO.default, derived("M"), SEED);
    const again = traceAfterShortcut(REAL, RHO.default, derived("M"), SEED);
    expect(ratios(again)).toEqual(ratios(once));
  });

  it("a different seed gives a different trace — the runs are not frozen", () => {
    // Without this, the determinism check above would pass on an engine that
    // ignored its seed, and "same seed, only ρ differs" would be vacuous.
    const one = traceAfterShortcut(REAL, RHO.default, derived("M"), SEED);
    const other = traceAfterShortcut(REAL, RHO.default, derived("M"), SEED + 1);
    expect(ratios(other)).not.toEqual(ratios(one));
  });

  it("the reading refuses to be a number before it has trips to average", () => {
    // The page must be able to say "no reading yet". A warm-up value read as data
    // is worse than no data, so the contract includes the state, not only the
    // ratio.
    const atLoad = REAL.create(FIXTURE, { rho: RHO.default, seed: SEED });
    const cold = take(REAL, atLoad, BFS_CLOSED);
    expect(cold.status).toBe("no reading yet");
    expect(cold.ratio).toBeNull();
  });
});
