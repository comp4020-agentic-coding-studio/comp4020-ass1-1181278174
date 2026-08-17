// A quick drag must not leave gaps: the cells between two pointer samples are
// filled in, four-connected, so the wall the visitor meant is the wall they get.

import { describe, expect, it } from "vitest";
import { cellsBetween } from "../src/ui/stroke.ts";

const step = (a: string, b: string): number => {
  const [ax, ay] = a.split(",").map(Number) as [number, number];
  const [bx, by] = b.split(",").map(Number) as [number, number];
  return Math.abs(ax - bx) + Math.abs(ay - by);
};

describe("cellsBetween — the cells a stroke passed over", () => {
  it("is empty for the same cell", () => {
    expect(cellsBetween("5,5", "5,5")).toEqual([]);
  });

  it("fills a straight run, excluding the start and including the end", () => {
    expect(cellsBetween("3,7", "7,7")).toEqual(["4,7", "5,7", "6,7", "7,7"]);
    expect(cellsBetween("7,7", "3,7")).toEqual(["6,7", "5,7", "4,7", "3,7"]);
    expect(cellsBetween("2,2", "2,5")).toEqual(["2,3", "2,4", "2,5"]);
  });

  it("is four-connected on any slope — every step shares an edge with the last", () => {
    const pairs: readonly (readonly [string, string])[] = [
      ["0,0", "9,4"],
      ["9,4", "0,0"],
      ["0,0", "3,10"],
      ["10,3", "0,0"],
      ["1,1", "8,8"],
      ["8,1", "1,8"],
    ];
    for (const [from, to] of pairs) {
      const cells = cellsBetween(from, to);
      expect(cells.at(-1)).toBe(to);
      let previous: string = from;
      for (const cell of cells) {
        expect(step(previous, cell)).toBe(1);
        previous = cell;
      }
    }
  });

  it("covers the whole span of a long jump — the case a fast drag produces", () => {
    const cells = cellsBetween("30,15", "30,25");
    expect(cells).toHaveLength(10);
    expect(new Set(cells).size).toBe(10);
  });
});
