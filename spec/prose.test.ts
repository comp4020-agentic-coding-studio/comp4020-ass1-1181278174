// The body, held against dist/ (Decision 31). What CLAUDE.md promises about the
// prose is checked here rather than trusted: six argument sentences, a sources
// block of at most four, no jargon in the argument, the one phrase that must
// survive, a nav that points at things which exist, an "Under the hood" that is
// closed until opened, and sources a reader can follow.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";

const html = readFileSync(resolve("dist/index.html"), "utf8");
const doc = new JSDOM(html).window.document;

const text = (selector: string): string =>
  [...doc.querySelectorAll(selector)]
    .map((node) => node.textContent ?? "")
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

/** Sentences: a terminal mark followed by space or end. Abbreviations are avoided in the copy. */
const sentences = (s: string): string[] =>
  s.split(/(?<=[.!?])\s+(?=[A-Z"“(])/).filter((part) => part.trim().length > 0);

const JARGON = [/pheromone/i, /\bACO\b/, /heuristic/i, /ρ/, /stigmergy/i, /τ/, /\bη\b/];

describe("the body — six argument sentences in three beats", () => {
  const argument = text(".prose .argument");

  it("has three beats, each with a hint of at most four words", () => {
    const hints = [...doc.querySelectorAll(".prose .beat .hint")].map(
      (node) => (node.textContent ?? "").trim(),
    );
    expect(hints).toHaveLength(3);
    for (const hint of hints) expect(hint.split(/\s+/).length).toBeLessThanOrEqual(4);
  });

  it("makes its argument in six sentences", () => {
    expect(sentences(argument)).toHaveLength(6);
  });

  it("keeps the jargon out of the argument", () => {
    for (const word of JARGON) expect(argument).not.toMatch(word);
  });

  it("ends the argument on 'a tendency, not a guarantee'", () => {
    const last = sentences(argument).at(-1) ?? "";
    expect(last).toContain("a tendency, not a guarantee");
  });
});

describe("the body — where this comes from", () => {
  it("says it in at most four sentences, and names the paper", () => {
    const from = text(".from-text");
    expect(sentences(from).length).toBeLessThanOrEqual(4);
    expect(from).toContain("Goss");
    expect(from).toContain("Deneubourg");
    expect(from).toContain("Dorigo");
  });

  it("no longer ends on the Google Maps line — the director dropped it", () => {
    expect(text("main")).not.toContain("Google Maps");
  });
});

describe("the body — under the hood, sources, nav", () => {
  it("keeps Under the hood closed until opened", () => {
    const hood = doc.getElementById("hood") as HTMLDetailsElement;
    expect(hood).not.toBeNull();
    expect(hood.open).toBe(false);
    expect(hood.querySelectorAll("li").length).toBeGreaterThanOrEqual(4);
  });

  it("lists at least three sources a reader can follow", () => {
    const links = [...doc.querySelectorAll("#sources a")].map((a) =>
      a.getAttribute("href") ?? "",
    );
    expect(links.length).toBeGreaterThanOrEqual(3);
    for (const href of links) expect(href).toMatch(/^https:\/\//);
  });

  it("has a nav whose every link points at something on the page", () => {
    const links = [...doc.querySelectorAll("nav a")].map((a) =>
      (a.getAttribute("href") ?? "").replace(/^#/, ""),
    );
    expect(links).toEqual(["intro", "stage", "hood", "sources"]);
    for (const id of links) expect(doc.getElementById(id)).not.toBeNull();
  });
});
