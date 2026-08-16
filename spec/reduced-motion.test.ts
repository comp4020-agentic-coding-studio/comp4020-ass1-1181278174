// The reduced-motion branch has its own test (Decision 8).
//
// "Two code paths where only one is exercised means the unexercised one is broken
// and nobody knows yet." So this does not check that `motionPlan` returns the
// right object — that would be a test of a lookup table. It builds the REAL page
// against the SHIPPED markup in `dist/index.html`, both ways, and asserts what a
// visitor would find: whether anything moved before they asked, and whether there
// was a way to start it.
//
// It also holds the line the preference must NOT cross. Informative motion stays:
// the simulation advances at the same steps-per-second either way, because the
// trail growing IS the argument and a page that says "watch how it changes" and
// does not change is worse than one that never claimed it.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { FIELD_V5 } from "../src/fixtures/field-v5.ts";
import { prefersReducedMotion } from "../src/ui/motion.ts";
import { STEPS_PER_SECOND, createPage } from "../src/ui/page.ts";

/** The built page, so this tests what ships rather than what the source says. */
function mount(reducedMotion: boolean) {
  const dom = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8"), {
    pretendToBeVisual: true,
  });
  const doc = dom.window.document;
  let clock = 0;
  const queue: (() => void)[] = [];
  const page = createPage(doc, {
    fixture: FIELD_V5,
    reducedMotion,
    now: () => clock,
    schedule: (callback) => queue.push(callback),
    cancel: () => {},
  });
  return {
    page,
    doc,
    button: (id: string) => doc.getElementById(id) as HTMLButtonElement,
    click: (id: string) =>
      (doc.getElementById(id) as HTMLButtonElement).dispatchEvent(
        new dom.window.Event("click"),
      ),
    /** Fire the frames the loop has queued, advancing the injected clock. */
    frames(count: number, ms = 1000 / 60) {
      for (let i = 0; i < count; i += 1) {
        const next = queue.shift();
        if (!next) return;
        clock += ms;
        next();
      }
    },
    steps: () => page.colony().steps,
  };
}

describe("prefers-reduced-motion: reduce", () => {
  const start = (reduced: boolean) => mount(reduced);

  it("does not autoplay — nothing moves before the visitor asks", () => {
    const page = start(true);
    expect(page.page.loop.running).toBe(false);
    page.frames(30);
    expect(page.steps()).toBe(0);
    page.page.destroy();
  });

  it("offers a way in, and it is the run control itself", () => {
    const page = start(true);
    const run = page.button("run");
    expect(run.hidden).toBe(false);
    expect(run.textContent?.trim()).toBe("Run");
    page.click("run");
    expect(page.page.loop.running).toBe(true);
    expect(run.textContent?.trim()).toBe("Pause");
    page.page.destroy();
  });

  it("keeps informative motion — the simulation runs at the same rate", () => {
    const page = start(true);
    page.click("run");
    page.frames(50, 20);
    // One second of frames at whatever the page's rate IS — read from the page,
    // not copied, so changing the pacing cannot leave this test asserting the old
    // number. The rate rarely divides 1000 evenly, hence the step of slack; the
    // exact-arithmetic assertions live in spec/loop.test.ts.
    expect(page.steps()).toBeGreaterThanOrEqual(STEPS_PER_SECOND - 1);
    expect(page.steps()).toBeLessThanOrEqual(STEPS_PER_SECOND);
    page.page.destroy();
  });

  it("slows the repaint cadence to 4 fps", () => {
    const page = start(true);
    expect(page.page.rendersPerSecond).toBe(4);
    page.page.destroy();
  });

  it("still shows a pause control at all times — WCAG 2.2.2 is not a preference", () => {
    const page = start(true);
    const run = page.button("run");
    expect(run.hidden).toBe(false);
    expect(run.textContent?.trim()).toBe("Run");
    page.click("run");
    expect(run.textContent?.trim()).toBe("Pause");
    expect(run.hidden).toBe(false);
    page.page.destroy();
  });
});

describe("without the preference", () => {
  it("loads PAUSED too — Decision 26: nothing moves until the visitor presses Run", () => {
    const page = mount(false);
    expect(page.page.loop.running).toBe(false);
    page.frames(30);
    expect(page.steps()).toBe(0);
    page.click("run");
    page.frames(50, 20);
    expect(page.steps()).toBeGreaterThanOrEqual(STEPS_PER_SECOND - 1);
    expect(page.steps()).toBeLessThanOrEqual(STEPS_PER_SECOND);
    page.page.destroy();
  });

  it("repaints every frame — only the reduced branch slows the cadence", () => {
    const page = mount(false);
    expect(page.page.rendersPerSecond).toBeUndefined();
    page.page.destroy();
  });
});

describe("the page asks the right question", () => {
  // Without this, every assertion above could pass while the page never consulted
  // the preference at all.
  const windowWith = (matches: boolean) =>
    ({
      matchMedia: (query: string) => ({
        matches: query.includes("prefers-reduced-motion") && matches,
      }),
    }) as unknown as Window;

  it("reads prefers-reduced-motion", () => {
    expect(prefersReducedMotion(windowWith(true))).toBe(true);
    expect(prefersReducedMotion(windowWith(false))).toBe(false);
  });

  it("defaults to not-reduced where it cannot ask", () => {
    expect(prefersReducedMotion(null)).toBe(false);
  });
});

describe("the five controls, and no more", () => {
  it("ships exactly the five controls PLAN.md caps at", () => {
    const page = mount(false);
    const controls = [...page.doc.querySelectorAll("button, input")].map(
      (node) => node.id,
    );
    // Five controls (Decision 26): the scene (three buttons, one group), the verb
    // (drawing walls, on the canvas — its Draw / Erase buttons are the verb's
    // mode, Decision 27), the forgetting rate, the speed, and run/pause/reset.
    // `clear` is an undo for the verb, not a sixth.
    expect(controls.sort()).toEqual([
      "clear",
      "reset",
      "rho",
      "run",
      "scene-blank",
      "scene-maze",
      "scene-random",
      "speed",
      "tool-draw",
      "tool-erase",
    ]);
    page.page.destroy();
  });

  it("starts with the Draw tool, and Erase is a button away", () => {
    const page = mount(false);
    expect(page.page.tool()).toBe("build");
    const draw = page.doc.getElementById("tool-draw") as HTMLButtonElement;
    const erase = page.doc.getElementById("tool-erase") as HTMLButtonElement;
    expect(draw.getAttribute("aria-pressed")).toBe("true");
    page.click("tool-erase");
    expect(page.page.tool()).toBe("erase");
    expect(erase.getAttribute("aria-pressed")).toBe("true");
    expect(draw.getAttribute("aria-pressed")).toBe("false");
    page.page.destroy();
  });

  it("starts on the blank scene, and a scene lays out its walls on a fresh colony", () => {
    const page = mount(false);
    expect(page.page.scene()).toBe("blank");
    expect(page.page.colony().drawnWalls.size).toBe(0);
    page.click("scene-maze");
    expect(page.page.scene()).toBe("maze");
    expect(page.page.colony().drawnWalls.size).toBeGreaterThan(60);
    expect(page.page.colony().steps).toBe(0);
    const maze = page.doc.getElementById("scene-maze") as HTMLButtonElement;
    expect(maze.getAttribute("aria-pressed")).toBe("true");
    page.click("scene-random");
    const first = [...page.page.colony().drawnWalls].sort();
    page.click("scene-random");
    const second = [...page.page.colony().drawnWalls].sort();
    expect(first).not.toEqual(second); // another press, another scatter
    page.click("scene-blank");
    expect(page.page.colony().drawnWalls.size).toBe(0);
    page.page.destroy();
  });

  it("has a speed slider, not a set of paces, and speaks it in steps per second", () => {
    const page = mount(false);
    const speed = page.doc.getElementById("speed") as HTMLInputElement;
    expect(speed.type).toBe("range");
    expect(speed.min).toBe("30");
    expect(speed.max).toBe("300");
    expect(speed.value).toBe("150");
    expect(speed.getAttribute("aria-valuetext")).toBe("150 steps per second");
    page.page.setSpeed(60);
    expect(speed.value).toBe("60");
    expect(speed.getAttribute("aria-valuetext")).toBe("60 steps per second");
    page.page.destroy();
  });

  it("gives the slider the field.s range, and speaks the number not a regime", () => {
    // Decision 19: regime labels are off on the field until the thresholds are
    // derived — no label rather than a wrong one. The control is still never
    // silent, because aria-valuetext says the number.
    const page = mount(false);
    const rho = page.doc.getElementById("rho") as HTMLInputElement;
    expect(rho.min).toBe("0");
    expect(rho.max).toBe("0.05");
    expect(rho.step).toBe("0.001");
    expect(rho.value).toBe("0.02");
    expect(rho.getAttribute("aria-valuetext")).toBe("0.020");

    page.page.setRho(0);
    expect(rho.getAttribute("aria-valuetext")).toBe("0.000");
    page.page.setRho(0.05);
    expect(rho.getAttribute("aria-valuetext")).toBe("0.050");
    page.page.destroy();
  });

  it("counts the walls the visitor has drawn, and hides Clear until there are some", () => {
    const page = mount(false);
    expect(page.doc.getElementById("share")?.textContent).toBe("walls: 0");
    expect(page.button("clear").hidden).toBe(true);
    page.page.toggleCell("30,20");
    expect(page.doc.getElementById("share")?.textContent).toBe("walls: 1");
    expect(page.button("clear").hidden).toBe(false);
    page.page.destroy();
  });
});
