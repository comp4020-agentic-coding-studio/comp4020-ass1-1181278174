// The one verb: drawing a wall.
//
// `toggleCell` is the only function Decision 22 lets the engine grow, and the
// things that must stay true when the ground moves under a running colony are
// not obvious from reading it: scent survives on every edge the wall did not
// touch, edge indices never shift, the two arrival zones cannot be sealed, and
// no ant is ever left standing inside a wall.
//
// The page half is here too, because "draw a cell and the reading follows" is
// the core interaction now — the contract that used to be about a doorway.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { FIELD_V4, FIELD_V4_SPEC } from "../src/fixtures/field-v4.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { FIELD_RHO } from "../src/sim/rho.ts";
import { createPage } from "../src/ui/page.ts";

const ANTS = 120;
const SEED = 1;

const settled = (steps = 600) => {
  const colony = engine.createColony(FIELD_V4, {
    rho: FIELD_RHO.default,
    seed: SEED,
    ants: ANTS,
  });
  for (let i = 0; i < steps; i += 1) engine.step(colony);
  return colony;
};

describe("toggleCell — the ground moves, the colony does not restart", () => {
  it("keeps every edge index where it was", () => {
    // Everything else in this file depends on it: pheromone lives in arrays
    // indexed by edge, so a renumber would silently rearrange the scent.
    const colony = settled();
    const before = FIELD_V4.edges.map((edge) => `${edge.a}|${edge.b}`);
    engine.toggleCell(colony, "30,20");
    expect(FIELD_V4.edges.map((edge) => `${edge.a}|${edge.b}`)).toEqual(before);
  });

  it("leaves the scent untouched on every edge the wall did not touch", () => {
    const colony = settled();
    const touched = new Set<number>();
    FIELD_V4.edges.forEach((edge, e) => {
      if (edge.a === "30,20" || edge.b === "30,20") touched.add(e);
    });
    const home = Float64Array.from(colony.home);
    const food = Float64Array.from(colony.foodTrail);

    engine.toggleCell(colony, "30,20");

    for (let e = 0; e < FIELD_V4.edges.length; e += 1) {
      if (touched.has(e)) continue;
      expect(colony.home[e], `home scent moved on edge ${e}`).toBe(home[e]);
      expect(colony.foodTrail[e], `food scent moved on edge ${e}`).toBe(food[e]);
    }
    // And the touched ones keep theirs too, so rubbing the wall out restores a
    // road rather than a blank strip. A road you break remembers it was a road.
    for (const e of touched) {
      expect(colony.home[e]).toBe(home[e]);
      expect(colony.foodTrail[e]).toBe(food[e]);
    }
  });

  it("closes exactly the edges that touch the walled cell", () => {
    const colony = settled(0);
    const openAt = (cell: string) =>
      (colony.adjacency[FIELD_V4.nodes.indexOf(cell)] ?? []).length;
    expect(openAt("30,20")).toBeGreaterThan(0);
    engine.toggleCell(colony, "30,20");
    expect(openAt("30,20")).toBe(0);
    // Its neighbours lose one way each, and keep the rest.
    expect(openAt("29,20")).toBe(3);
    engine.toggleCell(colony, "30,20");
    expect(openAt("30,20")).toBe(4);
    expect(openAt("29,20")).toBe(4);
  });

  it("refuses to wall the nest or the food", () => {
    // Sealing either would end the simulation rather than change it.
    const colony = settled(0);
    for (const cell of [...(FIELD_V4.nestZone ?? []), ...(FIELD_V4.foodZone ?? [])]) {
      expect(engine.toggleCell(colony, cell), `${cell} was walled`).toBe(false);
    }
    expect(colony.drawnWalls.size).toBe(0);
  });

  it("never leaves an ant standing inside a wall", () => {
    const colony = settled(900);
    // A block, not a single cell, so some ant is certainly caught by it.
    const block: string[] = [];
    for (let x = 26; x <= 33; x += 1) {
      for (let y = 17; y <= 23; y += 1) block.push(`${x},${y}`);
    }
    for (const cell of block) engine.toggleCell(colony, cell);

    const walls = new Set(colony.drawnWalls);
    for (const node of engine.antNodes(colony)) {
      expect(walls.has(node), `an ant is standing in the wall at ${node}`).toBe(
        false,
      );
      expect(FIELD_V4.nodes).toContain(node);
    }
    // And it keeps stepping afterwards without losing anybody.
    const before = engine.antCount(colony);
    for (let i = 0; i < 200; i += 1) engine.step(colony);
    expect(engine.antCount(colony)).toBe(before);
    for (const node of engine.antNodes(colony)) {
      expect(walls.has(node)).toBe(false);
    }
  });

  it("is deterministic — the same wall on the same colony evicts the same ants", () => {
    const once = settled(900);
    const twice = settled(900);
    for (const colony of [once, twice]) {
      for (let x = 26; x <= 33; x += 1) {
        for (let y = 17; y <= 23; y += 1) engine.toggleCell(colony, `${x},${y}`);
      }
      for (let i = 0; i < 200; i += 1) engine.step(colony);
    }
    expect(engine.digest(once)).toBe(engine.digest(twice));
  });

  it("tells the BFS oracle the same thing it tells the ants", () => {
    // The reading divides by this number. If the oracle did not know about the
    // visitor's walls, the page would measure the colony against a route that
    // no longer exists.
    const colony = settled(0);
    const routeNow = () =>
      shortestPathBetween(
        induce(FIELD_V4, { blocked: colony.drawnWalls }),
        FIELD_V4_SPEC.nestZone,
        FIELD_V4_SPEC.foodZone,
      );
    expect(routeNow()).toBe(45);
    for (let y = 0; y < FIELD_V4_SPEC.height; y += 1) {
      engine.toggleCell(colony, `30,${y}`);
    }
    // A wall from edge to edge: there is no route at all, and the oracle says so
    // rather than returning a number.
    expect(routeNow()).toBe(null);
  });
});

function mount() {
  const dom = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8"), {
    pretendToBeVisual: true,
  });
  const doc = dom.window.document;
  let clock = 0;
  const page = createPage(doc, {
    fixture: FIELD_V4,
    reducedMotion: true, // no autoplay: the assertions are about the ground, not the clock
    now: () => clock,
    schedule: () => 0,
    cancel: () => {},
  });
  return {
    page,
    doc,
    text: (id: string) => doc.getElementById(id)?.textContent?.trim(),
    key: (key: string) => {
      const event = new dom.window.KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      doc.getElementById("stage")?.dispatchEvent(event);
    },
    destroy: () => page.destroy(),
  };
}

describe("the core interaction — draw a wall, and the reading follows", () => {
  it("shows 'no route' when the walls seal the food off, and recovers", () => {
    const page = mount();
    expect(page.text("readout")).not.toBe("no route");

    for (let y = 0; y < FIELD_V4_SPEC.height; y += 1) {
      page.page.toggleCell(`30,${y}`);
    }
    // A state, not a number: dividing by a route that does not exist would give
    // something enormous and look like a reading.
    expect(page.text("readout")).toBe("no route");
    expect(page.text("readout-note")).toBe("your walls have sealed the food off");

    page.page.toggleCell("30,20");
    expect(page.text("readout")).not.toBe("no route");
    page.destroy();
  });

  it("counts the walls and offers to clear them", () => {
    const page = mount();
    expect(page.text("share")).toBe("walls drawn: 0");
    page.page.toggleCell("30,20");
    page.page.toggleCell("30,21");
    expect(page.text("share")).toBe("walls drawn: 2");
    (page.doc.getElementById("clear") as HTMLButtonElement).click();
    expect(page.text("share")).toBe("walls drawn: 0");
    page.destroy();
  });

  it("keeps the walls when the colony is reset", () => {
    // The walls are the visitor's, not the run's — Reset restarts the ants.
    const page = mount();
    page.page.toggleCell("30,20");
    (page.doc.getElementById("reset") as HTMLButtonElement).click();
    expect(page.text("share")).toBe("walls drawn: 1");
    expect(page.page.colony().drawnWalls.has("30,20")).toBe(true);
    expect(page.page.colony().steps).toBe(0);
    page.destroy();
  });
});

describe("the keyboard reaches the verb", () => {
  it("moves a cursor, builds with Enter, and puts the cursor away with Escape", () => {
    const page = mount();
    // No cursor until the keyboard asks for one — a pointer user never sees it.
    page.key("Enter");
    expect(page.text("share")).toBe("walls drawn: 0");

    page.key("ArrowRight");
    page.key("ArrowRight");
    page.key("Enter");
    expect(page.text("share")).toBe("walls drawn: 1");

    page.key("Enter"); // the same cell again rubs it out
    expect(page.text("share")).toBe("walls drawn: 0");

    page.key("Escape");
    page.key("Enter"); // with the cursor away, Enter only brings it back
    expect(page.text("share")).toBe("walls drawn: 0");
    page.destroy();
  });

  it("will not walk the cursor off the field", () => {
    const page = mount();
    page.key("Enter"); // cursor appears at the nest
    for (let i = 0; i < 200; i += 1) page.key("ArrowUp");
    for (let i = 0; i < 200; i += 1) page.key("ArrowLeft");
    page.key("Enter");
    // Whatever it walled, it is a real cell of the field.
    for (const cell of page.page.colony().drawnWalls) {
      expect(FIELD_V4.nodes).toContain(cell);
    }
    page.destroy();
  });
});
