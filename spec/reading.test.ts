// The reading is the number every threshold is stated in, so it is worth more than
// a glance. GREEN: it is pure and needs no engine.

import { describe, expect, it } from "vitest";
import { mean, median, reading } from "../src/sim/reading.ts";

const options = { window: 4, minTrips: 3 };

describe("mean", () => {
  it("averages", () => {
    expect(mean([4, 8])).toBe(6);
  });

  it("is NaN on nothing, rather than 0", () => {
    // 0 would read as "every trip was instant", which is a lie about no data.
    expect(Number.isNaN(mean([]))).toBe(true);
  });
});

describe("reading", () => {
  it("says 'no reading yet' below minTrips, and never a number", () => {
    const result = reading([8, 8], 8, options);
    expect(result.status).toBe("no reading yet");
    expect(result.ratio).toBe(null);
  });

  it("reads 1.0x when every trip is the shortest path", () => {
    expect(reading([4, 4, 4], 4, options)).toEqual({ status: "ok", ratio: 1 });
  });

  it("reads 2.0x when the colony is walking the long way", () => {
    // The double bridge exactly: 8 moves taken, 4 available.
    expect(reading([8, 8, 8], 4, options).ratio).toBe(2);
  });

  it("only looks at the last `window` trips", () => {
    // Five trips, window of four: the leading 40 is outside it and must not count.
    expect(reading([40, 4, 4, 4, 4], 4, options).ratio).toBe(1);
  });

  it("equals 2 minus the short-trip share on a two-valued fixture", () => {
    // The identity the sweep measured to three decimals, and the reason the mean
    // replaced the median: it is continuous in the thing the visitor is watching.
    const share = (short: number, long: number) => short / (short + long);
    const trips = [4, 4, 8, 8];
    expect(reading(trips, 4, options).ratio).toBeCloseTo(2 - share(2, 2), 12);
    const lopsided = [4, 4, 4, 8];
    expect(reading(lopsided, 4, options).ratio).toBeCloseTo(2 - share(3, 1), 12);
  });

  it("moves where the median would not", () => {
    // 2 of 4 short vs 3 of 4 short: the median reports 6 and 4 — a whole branch
    // length apart on one trip — while the mean walks 1.5x to 1.25x.
    expect(reading([4, 4, 8, 8], 4, options).ratio).toBe(1.5);
    expect(reading([4, 4, 4, 8], 4, options).ratio).toBe(1.25);
    expect(median([4, 4, 8, 8])).toBe(6);
    expect(median([4, 4, 4, 8])).toBe(4);
  });

  it("is swayed by an outlier, which the median would hide", () => {
    // The trade the amendment accepts: continuity costs robustness. On this fixture
    // trips cannot be wild, so it is a fair price.
    // mean 103 moves, ÷ BFS 4 = 25.75×. The median would report 1×.
    expect(reading([4, 4, 4, 400], 4, options).ratio).toBe(25.75);
    expect(median([4, 4, 4, 400]) / 4).toBe(1);
  });
});
