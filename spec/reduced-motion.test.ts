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
import { FIELD_V4 } from "../src/fixtures/field-v4.ts";
import { prefersReducedMotion } from "../src/ui/motion.ts";
import { createPage } from "../src/ui/page.ts";

/** The built page, so this tests what ships rather than what the source says. */
function mount(reducedMotion: boolean) {
  const dom = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8"), {
    pretendToBeVisual: true,
  });
  const doc = dom.window.document;
  let clock = 0;
  const queue: (() => void)[] = [];
  const page = createPage(doc, {
    fixture: FIELD_V4,
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

  it("offers a way in, and it is the run control rather than a fourth one", () => {
    const page = start(true);
    const grow = page.button("grow");
    expect(grow.hidden).toBe(false);
    expect(grow.textContent?.trim()).toBe("Watch it grow");

    page.click("grow");
    expect(page.page.loop.running).toBe(true);
    // Having started it, the way in is spent: from here the Pause control owns it.
    expect(grow.hidden).toBe(true);
    page.page.destroy();
  });

  it("keeps informative motion — the simulation runs at the same rate", () => {
    const page = start(true);
    page.click("grow");
    page.frames(50, 20);
    // One second of frames at the page's 300 steps/s (Decision 20). 1000/300 does
    // not divide evenly, so the exact-arithmetic assertions live in
    // spec/loop.test.ts and this one allows the step of slack division leaves.
    expect(page.steps()).toBeGreaterThanOrEqual(299);
    expect(page.steps()).toBeLessThanOrEqual(300);
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
    page.click("grow");
    expect(run.textContent?.trim()).toBe("Pause");
    expect(run.hidden).toBe(false);
    page.page.destroy();
  });
});

describe("without the preference", () => {
  it("autoplays, because beat 1 is live emergence from zero", () => {
    const page = mount(false);
    expect(page.page.loop.running).toBe(true);
    page.frames(50, 20);
    expect(page.steps()).toBeGreaterThanOrEqual(299);
    expect(page.steps()).toBeLessThanOrEqual(300);
    page.page.destroy();
  });

  it("has no 'watch it grow' button to find", () => {
    const page = mount(false);
    expect(page.button("grow").hidden).toBe(true);
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

describe("the three controls, and no more", () => {
  it("ships exactly the controls PLAN.md caps at three", () => {
    const page = mount(false);
    const controls = [...page.doc.querySelectorAll("button, input")].map(
      (node) => node.id,
    );
    // rho = the forgetting rate; run/reset = the run control; grow is that same
    // control under a preference, not another one. The verb (drawing walls)
    // lives on the canvas and arrives in turn B, so there is no button for it.
    expect(controls.sort()).toEqual(["grow", "reset", "rho", "run"]);
    page.page.destroy();
  });

  it("gives the slider the FIELD_V4's range, and speaks the number not a regime", () => {
    // Decision 19: regime labels are off on the field until the thresholds are
    // derived — no label rather than a wrong one. The control is still never
    // silent, because aria-valuetext says the number.
    const page = mount(false);
    const rho = page.doc.getElementById("rho") as HTMLInputElement;
    expect(rho.min).toBe("0");
    expect(rho.max).toBe("0.05");
    expect(rho.step).toBe("0.001");
    expect(rho.value).toBe("0.01");
    expect(rho.getAttribute("aria-valuetext")).toBe("0.010");

    page.page.setRho(0);
    expect(rho.getAttribute("aria-valuetext")).toBe("0.000");
    page.page.setRho(0.05);
    expect(rho.getAttribute("aria-valuetext")).toBe("0.050");
    page.page.destroy();
  });

  it("counts the walls the visitor has drawn, which is none of them yet", () => {
    // v4 is open ground: no doorway to toggle, and the drawing verb lands in
    // turn B. The readout exists now so the layout does not jump when it does.
    const page = mount(false);
    expect(page.doc.getElementById("share")?.textContent).toBe("walls drawn: 0");
    page.page.destroy();
  });
});
