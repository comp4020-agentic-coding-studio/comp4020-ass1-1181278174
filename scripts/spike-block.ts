// Block-the-road spike, on field v2 — ADVISOR SCRATCH RUN, SPIKE ONLY.
//
// Question: if the visitor BLOCKS the settled road (instead of opening a
// shortcut), does the colony re-route, and does the forgetting rate ρ set how
// fast? This is the "heals itself" mechanic (Claim A) with ρ as healing speed.
//
// Mechanism used: the field's `gaps` are re-pointed at a bar of cells across the
// left corridor (the road climbs there). Gap edges are CLOSED by default, so the
// colony is created with the bar shut, toggled OPEN at once (normal field), then
// toggled SHUT at settle = the road is blocked. The doorway stays sealed for good.

import { mkdirSync, writeFileSync } from "node:fs";
import { FIELD_V3_SPEC } from "../src/fixtures/field-v3.ts";
import { buildField } from "../src/fixtures/grid.ts";
import type { Fixture } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { reading } from "../src/sim/reading.ts";

const ANTS = 400;
const SETTLE = 12_000;
const AFTER = 12_000;
const SAMPLE_EVERY = 250;
const WINDOW = 300;
const MIN_TRIPS = 65;
const SEEDS = [1, 2, 3];
const RHOS = [0, 0.002, 0.005, 0.01, 0.02, 0.05];
const HEALED_AT = 1.6;

// The bar: y = 12, x = 10..21 — the corridor's right 12 cells, leaving x 0..9 open.
const BAR: (readonly [number, number])[] = [];
for (let x = 10; x <= 21; x += 1) BAR.push([x, 12] as const);

const SPEC = { ...FIELD_V3_SPEC, gaps: BAR, params: { ...FIELD_V3_SPEC.params, gradedOver: 80, whisker: 3, straightBias: 4, depositPerStep: 20 } };
const FIXTURE: Fixture = buildField(SPEC);
const BFS_OPEN = shortestPathBetween(induce(FIXTURE, { openShortcut: true }), SPEC.nestZone, SPEC.foodZone) as number; // bar open = normal
const BFS_BLOCKED = shortestPathBetween(induce(FIXTURE, { openShortcut: false }), SPEC.nestZone, SPEC.foodZone) as number; // bar shut

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? Number.NaN;
};
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");
const st = (v: number) => (Number.isFinite(v) ? String(v) : "never");

function map(colony: engine.Colony): string {
  const heat = new Map<string, number>();
  colony.fixture.edges.forEach((edge, e) => {
    const tau = (colony.home[e] as number) + (colony.foodTrail[e] as number);
    for (const node of [edge.a, edge.b]) heat.set(node, Math.max(heat.get(node) ?? 0, tau));
  });
  const peak = Math.max(...heat.values(), 1);
  const blocked = new Set(SPEC.blocked);
  const nest = new Set(SPEC.nestZone);
  const food = new Set(SPEC.foodZone);
  const bar = new Set(BAR.map(([x, y]) => `${x},${y}`));
  const rows: string[] = [];
  for (let y = 0; y < SPEC.height; y += 1) {
    if (y % 2 === 1 && y !== 13 && y !== 11) continue; // every second row, plus the rows around the bar
    let row = "";
    for (let x = 0; x < SPEC.width; x += 1) {
      const node = `${x},${y}`;
      if (nest.has(node)) row += "N";
      else if (food.has(node)) row += "F";
      else if (bar.has(node)) row += colony.shortcutOpen ? "=" : "X";
      else if (blocked.has(node)) row += "#";
      else {
        const tau = heat.get(node) ?? 0;
        row += tau <= 0 ? "·" : String(Math.max(1, Math.round((Math.log1p(tau) / Math.log1p(peak)) * 9)));
      }
    }
    rows.push(`${String(y).padStart(2, " ")} ${row}`);
  }
  return rows.join("\n");
}

interface Result {
  rho: number; before: number; tripsBefore: number; trapped: number;
  first65: number; healed: number; at2000: number; at6000: number; atEnd: number; postTrips: number;
  maps: string[];
}

function run(rho: number, seed: number, wantMaps: boolean): Result {
  const colony = engine.createColony(FIXTURE, { rho, seed, ants: ANTS, tripHistory: Infinity });
  engine.toggleShortcut(colony); // bar OPEN: the normal field
  for (let s = 1; s <= SETTLE; s += 1) engine.step(colony);
  const tripsBefore = colony.tripsCompleted;
  const beforeValue = reading(engine.completedTripLengths(colony), BFS_OPEN, { window: WINDOW, minTrips: MIN_TRIPS });
  const before = beforeValue.status === "ok" ? (beforeValue.ratio as number) : Number.NaN;

  engine.toggleShortcut(colony); // bar SHUT: the road is blocked
  const barCells = new Set(BAR.map(([x, y]) => colony.fixture.nodes.indexOf(`${x},${y}`)));
  let trapped = 0;
  for (let a = 0; a < colony.at.length; a += 1) if (barCells.has(colony.at[a] as number)) trapped += 1;

  const cut = colony.trips.length; // trips completed before the block
  const maps: string[] = [];
  let first65 = Infinity, healed = Infinity, at2000 = Number.NaN, at6000 = Number.NaN, atEnd = Number.NaN;
  for (let s = 1; s <= AFTER; s += 1) {
    engine.step(colony);
    if (wantMaps && (s === 500 || s === 3000 || s === AFTER)) maps.push(`+${s} steps after the block:\n${map(colony)}`);
    if (s % SAMPLE_EVERY !== 0) continue;
    const post = colony.trips.slice(cut); // only trips completed AFTER the block
    if (first65 === Infinity && post.length >= MIN_TRIPS) first65 = s;
    const value = reading(post, BFS_BLOCKED, { window: WINDOW, minTrips: MIN_TRIPS });
    const ratio = value.status === "ok" ? (value.ratio as number) : Number.NaN;
    if (healed === Infinity && Number.isFinite(ratio) && ratio <= HEALED_AT) healed = s;
    if (s === 2000) at2000 = ratio;
    if (s === 6000) at6000 = ratio;
    if (s === AFTER) atEnd = ratio;
  }
  return { rho, before, tripsBefore, trapped, first65, healed, at2000, at6000, atEnd, postTrips: colony.trips.length - cut, maps };
}

function main(): void {
  const out: string[] = [];
  const say = (l = "") => { console.log(l); out.push(l); };
  const t0 = Date.now();
  say(`# Block-the-road spike, field v2 — ADVISOR SCRATCH RUN`);
  say();
  say(`D=20 T=80 W=3 w=4 ε=0, ${ANTS} ants, ${SEEDS.length} seeds. Settle ${SETTLE} with the corridor open, then a 12-cell bar (y=12, x=10..21) shuts across the road, then ${AFTER} more. Doorway sealed throughout.`);
  say(`BFS zone-to-zone: ${BFS_OPEN} normal, ${BFS_BLOCKED} with the bar shut (detour via x ≤ 9). Post-block readings are over trips completed AFTER the block only, ÷ ${BFS_BLOCKED}. "healed" = first sample ≤ ${HEALED_AT}×.`);
  say();
  say(`| ρ | before (÷${BFS_OPEN}) | trips before | trapped on bar | 65 post-block trips by | reading +2000 | +6000 | +${AFTER} | healed (≤${HEALED_AT}×) at | post-block trips |`);
  say(`|---|---|---|---|---|---|---|---|---|---|`);
  const keepMaps: { rho: number; maps: string[] }[] = [];
  for (const rho of RHOS) {
    const runs = SEEDS.map((seed, i) => run(rho, seed, i === 0 && (rho === 0 || rho === 0.01)));
    const m = (f: (r: Result) => number) => median(runs.map(f));
    say(`| ${rho} | ${fmt(m((r) => r.before))}× | ${m((r) => r.tripsBefore)} | ${m((r) => r.trapped)} | ${st(m((r) => r.first65))} | ${fmt(m((r) => r.at2000))}× | ${fmt(m((r) => r.at6000))}× | ${fmt(m((r) => r.atEnd))}× | ${st(m((r) => r.healed))} | ${m((r) => r.postTrips)} |`);
    const withMaps = runs.find((r) => r.maps.length > 0);
    if (withMaps) keepMaps.push({ rho, maps: withMaps.maps });
  }
  say();
  for (const { rho, maps } of keepMaps) {
    say(`## Maps — ρ = ${rho}, seed 1 (X = the bar; log scale of τ)`); say();
    for (const m of maps) { say("```"); say(m); say("```"); say(); }
  }
  say(`Run time ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
  mkdirSync("docs/spikes", { recursive: true });
  writeFileSync("docs/spikes/2026-08-17-field-v2-block-advisor.md", `${out.join("\n")}\n`);
}
main();
