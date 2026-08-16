// Stage C: the scale hypothesis, on field v2. `pnpm spike:stagec`.
//
// SPIKE ONLY. Nothing adopted, no default changed, no threshold or RHO touched.
//
// The hypothesis, stated before the run so the record shows whether it survived
// (Decision 18, director's words):
//
//   "fork exploration in P ∝ (k+τ)^2 needs τ_road = O(k). On the bridge, at the
//    switching ρ, τ_road is a small multiple of k. On the field with 400 ants and
//    slow ρ, D = 20 puts τ_road at ~100 k, so choices are deterministic and no ant
//    ever explores the fork — which is why the switching band only appears where
//    the road is already ragged. Prediction: bringing D back toward k's scale
//    (D = 1–5; equivalent to raising k, which stays 20) opens a band where the
//    road still forms (W = 3 and w = 4 carrying the following) AND ρ = 0 locks
//    AND some ρ switches AND high ρ never settles."
//
// So the table below reports τ_road as a multiple of k. That column is the
// hypothesis; the rest is whether it bought the band.

import { mkdirSync, writeFileSync } from "node:fs";
import { FIELD_SPEC } from "../src/fixtures/field.ts";
import { buildField } from "../src/fixtures/grid.ts";
import type { Fixture } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { reading } from "../src/sim/reading.ts";

const ANTS = 400;
/** Settle with the doorway shut, then open it, then run on. Stated up front. */
const SETTLE = 12_000;
const AFTER = 12_000;
const SAMPLE_EVERY = 500;
const WINDOW = 300;
const MIN_TRIPS = 65;
const SEEDS = [1, 2, 3];

const T_BASE = 80;
const WHISKER = 3;
const STRAIGHT = 4;
const DS = [1, 2, 5, 20];
const RHOS = [0, 0.002, 0.005, 0.01, 0.02, 0.04, 0.08];

/** "Falls below" is measured at 1.6x, per Decision 18's definition of found. */
const CROSS_AT = 1.6;

const BASE = buildField(FIELD_SPEC);
const K = FIELD_SPEC.params.k;
const BFS_LONG = shortestPathBetween(
  induce(BASE, { openShortcut: false }),
  FIELD_SPEC.nestZone,
  FIELD_SPEC.foodZone,
) as number;
const BFS_SHORT = shortestPathBetween(
  induce(BASE, { openShortcut: true }),
  FIELD_SPEC.nestZone,
  FIELD_SPEC.foodZone,
) as number;
/** A trip shorter than the midpoint came through the doorway, not over the top. */
const VIA_GAP = (BFS_LONG + BFS_SHORT) / 2;

function fixtureFor(D: number, T = T_BASE): Fixture {
  return buildField({
    ...FIELD_SPEC,
    params: {
      ...FIELD_SPEC.params,
      gradedOver: T,
      whisker: WHISKER,
      straightBias: STRAIGHT,
      depositPerStep: D,
    },
  });
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? Number.NaN;
};
const fmt = (value: number, digits = 2) =>
  Number.isFinite(value) ? value.toFixed(digits) : "—";

/** Mean pheromone on the committed long route, in multiples of k. */
function tauOnRoad(colony: engine.Colony, fixture: Fixture): number {
  const road = new Set(fixture.branches.long);
  let sum = 0;
  let count = 0;
  fixture.edges.forEach((edge, e) => {
    if (!road.has(edge.a) || !road.has(edge.b)) return;
    sum += (colony.home[e] as number) + (colony.foodTrail[e] as number);
    count += 1;
  });
  return count === 0 ? Number.NaN : sum / count / K;
}

interface Cell {
  readonly D: number;
  readonly rho: number;
  readonly before: number;
  readonly after: number;
  readonly crossed: number;
  readonly viaGap: number;
  readonly tau: number;
  readonly spread: number;
  readonly colony: engine.Colony;
  readonly fixture: Fixture;
}

/** Settle only — the doorway is still shut, which is what the road map is of. */
function settleOnly(fixture: Fixture, rho: number, seed: number): engine.Colony {
  const colony = engine.createColony(fixture, {
    rho,
    seed,
    ants: ANTS,
    tripHistory: Infinity,
  });
  for (let step = 1; step <= SETTLE; step += 1) engine.step(colony);
  return colony;
}

function run(fixture: Fixture, D: number, rho: number, seed: number) {
  const colony = engine.createColony(fixture, {
    rho,
    seed,
    ants: ANTS,
    tripHistory: Infinity,
  });
  for (let step = 1; step <= SETTLE; step += 1) engine.step(colony);
  const beforeValue = reading(engine.completedTripLengths(colony), BFS_LONG, {
    window: WINDOW,
    minTrips: MIN_TRIPS,
  });
  const tau = tauOnRoad(colony, fixture);

  engine.toggleShortcut(colony);
  const series: number[] = [];
  let crossed = Infinity;
  for (let step = 1; step <= AFTER; step += 1) {
    engine.step(colony);
    if (step % SAMPLE_EVERY !== 0) continue;
    const value = reading(engine.completedTripLengths(colony), BFS_SHORT, {
      window: WINDOW,
      minTrips: MIN_TRIPS,
    });
    if (value.status !== "ok") continue;
    const ratio = value.ratio as number;
    series.push(ratio);
    if (crossed === Infinity && ratio < CROSS_AT) crossed = step;
  }
  const recent = engine.completedTripLengths(colony).slice(-WINDOW);
  const tail = series.slice(-10);
  return {
    D,
    rho,
    before:
      beforeValue.status === "ok" ? (beforeValue.ratio as number) : Number.NaN,
    after: series.at(-1) ?? Number.NaN,
    crossed,
    viaGap:
      recent.length === 0
        ? Number.NaN
        : recent.filter((length) => length < VIA_GAP).length / recent.length,
    tau,
    spread: tail.length < 2 ? Number.NaN : Math.max(...tail) - Math.min(...tail),
    colony,
    fixture,
  } satisfies Cell;
}

/** The field, drawn: digits are pheromone against the busiest cell. Every second row. */
function map(colony: engine.Colony, fixture: Fixture): string {
  const heat = new Map<string, number>();
  fixture.edges.forEach((edge, e) => {
    const tau = (colony.home[e] as number) + (colony.foodTrail[e] as number);
    for (const node of [edge.a, edge.b]) {
      heat.set(node, Math.max(heat.get(node) ?? 0, tau));
    }
  });
  const peak = Math.max(...heat.values(), 1);
  const blocked = new Set(FIELD_SPEC.blocked);
  const nest = new Set(FIELD_SPEC.nestZone);
  const food = new Set(FIELD_SPEC.foodZone);
  const gaps = new Set(FIELD_SPEC.gaps.map(([x, y]) => `${x},${y}`));
  const rows: string[] = [];
  for (let y = 0; y < FIELD_SPEC.height; y += 2) {
    let row = "";
    for (let x = 0; x < FIELD_SPEC.width; x += 1) {
      const node = `${x},${y}`;
      if (nest.has(node)) row += "N";
      else if (food.has(node)) row += "F";
      else if (gaps.has(node)) row += colony.shortcutOpen ? "." : "+";
      else if (blocked.has(node)) row += "#";
      else {
        // LOG scale. Linear was useless here: with D = 20 and slow ρ the busiest
        // edge is four orders of magnitude above the quiet ground, so everything
        // except the peak rounded to 0 and the map showed an empty field.
        const tau = heat.get(node) ?? 0;
        row +=
          tau <= 0
            ? "·"
            : String(
                Math.max(
                  1,
                  Math.round((Math.log1p(tau) / Math.log1p(peak)) * 9),
                ),
              );
      }
    }
    rows.push(row);
  }
  return rows.join("\n");
}

function main(): void {
  const out: string[] = [];
  const say = (line = "") => {
    console.log(line);
    out.push(line);
  };

  say(`# Stage C — the scale hypothesis, on field v2`);
  say();
  say(`Decision 18. **Spike only**: nothing adopted, no default changed, no threshold or \`RHO\` touched.`);
  say();
  say(`## The hypothesis, as written before the run`);
  say();
  say(`> fork exploration in P ∝ (k+τ)^2 needs τ_road = O(k). On the bridge, at the`);
  say(`> switching ρ, τ_road is a small multiple of k. On the field with 400 ants and`);
  say(`> slow ρ, D = 20 puts τ_road at ~100 k, so choices are deterministic and no ant`);
  say(`> ever explores the fork — which is why the switching band only appears where`);
  say(`> the road is already ragged. Prediction: bringing D back toward k's scale`);
  say(`> (D = 1–5; equivalent to raising k, which stays 20) opens a band where the`);
  say(`> road still forms (W = 3 and w = 4 carrying the following) AND ρ = 0 locks`);
  say(`> AND some ρ switches AND high ρ never settles.`);
  say();
  say(`## The field, v2`);
  say();
  say(
    `${FIELD_SPEC.width}×${FIELD_SPEC.height}, ${BASE.nodes.length} nodes, ${BASE.edges.length} edges. ` +
      `The wall reaches the bottom edge, so the passage along the top is the only long way — ` +
      `no perimeter corridor. The doorway is three cells wide, four cells straight ahead of the nest.`,
  );
  say();
  say(
    `**BFS zone to zone: ${BFS_LONG} moves over the top, ${BFS_SHORT} through the doorway — ratio ${(BFS_LONG / BFS_SHORT).toFixed(3)}.**`,
  );
  say();
  say(
    `Schedule: settle **${SETTLE} steps with the doorway shut**, open it, then **${AFTER} more**. ` +
      `${ANTS} ants, ${SEEDS.length} seeds, T = ${T_BASE}, W = ${WHISKER}, w = ${STRAIGHT}. ` +
      `h, k and floor untouched (k = ${K}).`,
  );
  say();
  say(
    `"Via doorway" is the share of the last ${WINDOW} trips shorter than ${VIA_GAP} moves, ` +
      `the midpoint of the two routes. "Settles" is the swing of the last ten samples.`,
  );
  say();

  const cells: Cell[] = [];
  say(`| D | ρ | τ_road at settle | before opening | at the end | first < ${CROSS_AT}× | via doorway | settles? |`);
  say(`|---|---|---|---|---|---|---|---|`);
  for (const D of DS) {
    const fixture = fixtureFor(D);
    for (const rho of RHOS) {
      const runs = SEEDS.map((seed) => run(fixture, D, rho, seed));
      const cell: Cell = {
        D,
        rho,
        before: median(runs.map((r) => r.before)),
        after: median(runs.map((r) => r.after)),
        crossed: median(runs.map((r) => r.crossed)),
        viaGap: median(runs.map((r) => r.viaGap)),
        tau: median(runs.map((r) => r.tau)),
        spread: median(runs.map((r) => r.spread)),
        colony: (runs[0] as Cell).colony,
        fixture,
      };
      cells.push(cell);
      say(
        `| ${D} | ${rho} | ${fmt(cell.tau, 1)} k | ${fmt(cell.before)}× | ${fmt(cell.after)}× | ` +
          `${Number.isFinite(cell.crossed) ? cell.crossed : "never"} | ${fmt(cell.viaGap * 100, 0)}% | ` +
          `${Number.isFinite(cell.spread) ? `${fmt(cell.spread)}× swing` : "—"} |`,
      );
    }
  }
  say();

  // --- what "found" means, tested per D ------------------------------------
  say(`## Does any D give the band?`);
  say();
  say(
    `Decision 18's definition: a pre-opening reading ≤ ~1.8×, ρ = 0 stays locked, ` +
      `some ρ falls below ${CROSS_AT}× within the window, and the highest ρ never settles.`,
  );
  say();
  say(`| D | road forms (≤1.8× before)? | ρ=0 locked? | some ρ switches? | top ρ unsettled? | band |`);
  say(`|---|---|---|---|---|---|`);
  const verdicts = new Map<number, boolean>();
  for (const D of DS) {
    const mine = cells.filter((cell) => cell.D === D);
    const forms = mine.filter((cell) => cell.before <= 1.8);
    const zero = mine.find((cell) => cell.rho === 0);
    const locked = zero !== undefined && !Number.isFinite(zero.crossed);
    const switching = mine.filter(
      (cell) => Number.isFinite(cell.crossed) && cell.before <= 1.8,
    );
    const top = mine.find((cell) => cell.rho === RHOS.at(-1));
    const unsettled =
      top !== undefined && (!Number.isFinite(top.spread) || top.spread > 0.5);
    const band = forms.length > 0 && locked && switching.length > 0 && unsettled;
    verdicts.set(D, band);
    say(
      `| ${D} | ${forms.length > 0 ? `yes (ρ ≤ ${Math.max(...forms.map((c) => c.rho))})` : "no"} | ` +
        `${locked ? "yes" : "no"} | ` +
        `${switching.length > 0 ? `yes (ρ = ${switching.map((c) => c.rho).join(", ")})` : "no"} | ` +
        `${unsettled ? "yes" : "no"} | ${band ? "**FOUND**" : "—"} |`,
    );
  }
  say();

  // --- the best cell, and T = 160 on it only --------------------------------
  // No cell does both, so there is no single "best" — and saying so is the
  // result. These are the two ends of the gap: the cell with the best road, and
  // the cell that switches most cleanly. They are never the same cell.
  const bestRoad = [...cells].sort((a, b) => a.before - b.before)[0];
  const bestSwitch = cells
    .filter((cell) => Number.isFinite(cell.crossed))
    .sort((a, b) => a.after - b.after || a.crossed - b.crossed)[0];
  const best = bestSwitch;

  for (const [title, cell] of [
    ["The best ROAD — and it never switches", bestRoad],
    ["The cleanest SWITCH — and its road was already ragged", bestSwitch],
  ] as const) {
    if (!cell) continue;
    say(`## ${title}`);
    say();
    say(
      `\`D = ${cell.D}, ρ = ${cell.rho}\` — τ_road ${fmt(cell.tau, 1)} k, ` +
        `${fmt(cell.before)}× before the doorway opened, ${fmt(cell.after)}× after, ` +
        `crossing ${CROSS_AT}× at step ${Number.isFinite(cell.crossed) ? cell.crossed : "never"}.`,
    );
    say();
    say(`At settle, doorway still shut — does the long road thread between the blocks?`);
    say();
    say("```");
    const fixture = fixtureFor(cell.D);
    say(map(settleOnly(fixture, cell.rho, 1), fixture));
    say("```");
    say();
  }

  if (best) {

    say(`### T = 160 on the same cell`);
    say();
    say(`| T | before opening | at the end | first < ${CROSS_AT}× | via doorway | settles? |`);
    say(`|---|---|---|---|---|---|`);
    for (const T of [T_BASE, 160]) {
      const fixture = fixtureFor(best.D, T);
      const runs = SEEDS.map((seed) => run(fixture, best.D, best.rho, seed));
      const crossed = median(runs.map((r) => r.crossed));
      const spread = median(runs.map((r) => r.spread));
      say(
        `| ${T} | ${fmt(median(runs.map((r) => r.before)))}× | ${fmt(median(runs.map((r) => r.after)))}× | ` +
          `${Number.isFinite(crossed) ? crossed : "never"} | ${fmt(median(runs.map((r) => r.viaGap)) * 100, 0)}% | ` +
          `${Number.isFinite(spread) ? `${fmt(spread)}× swing` : "—"} |`,
      );
    }
    say();
  }

  say(`## For the record — Stage A's D = today's row, on field v1`);
  say();
  say(`Different geometry, so not comparable cell for cell; kept because Decision 18 asked for it.`);
  say();
  say(`| variant | ρ | first food | trips | settled reading | home ≤ 4× |`);
  say(`|---|---|---|---|---|---|`);
  say(`| T=80 W=3 w=4 D=1 | 0.005 | 971 | 952 | 26.35× | 4% |`);
  say(`| T=80 W=3 w=4 D=1 | 0.02 | 1364 | 717 | 32.51× | 2% |`);
  say();

  say(`---`);
  say();
  say(
    `No threshold, default or \`RHO\` value was changed to produce any number above. ` +
      `The pass line is Decision 18's and the grid was not extended.`,
  );

  mkdirSync("docs/spikes", { recursive: true });
  writeFileSync("docs/spikes/2026-08-17-field-v2-stage-c.md", `${out.join("\n")}\n`);
  console.log("");
  console.log("written -> docs/spikes/2026-08-17-field-v2-stage-c.md");
}

main();
