// The reading is the number every threshold is stated in, so it is worth more than
// a glance. GREEN: it is pure and needs no engine.

import { describe, expect, it } from "vitest";
import { median, reading } from "../src/sim/reading.ts";

const options = { window: 4, minTrips: 3 };

describe("median", () => {
  it("takes the middle of an odd count", () => {
    expect(median([9, 4, 8])).toBe(8);
  });

  it("averages the two middles of an even count", () => {
    expect(median([4, 4, 8, 8])).toBe(6);
  });

  it("does not mutate its input", () => {
    const values = [3, 1, 2];
    median(values);
    expect(values).toEqual([3, 1, 2]);
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

  it("shrugs off a single outlier inside the window — the point of a median", () => {
    // A mean of [4, 4, 4, 400] would report 103×. The median reports 1×, which is
    // what the colony is actually doing. This is why the reading is a median.
    expect(reading([4, 4, 4, 400], 4, options).ratio).toBe(1);
  });

  it("does move when most of the window is long", () => {
    // Robust is not inert: three long trips out of four shift it.
    expect(reading([4, 8, 8, 8], 4, options).ratio).toBe(2);
  });
});
