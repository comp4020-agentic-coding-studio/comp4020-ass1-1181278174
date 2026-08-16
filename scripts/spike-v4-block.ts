// Break the road on open ground: `pnpm spike:v4-block`.
//
// SPIKE ONLY. Nothing adopted, no default changed, no threshold or RHO touched.
//
// This is beat 2 of Decision 22's claim A — "the road heals itself when you break
// it" — measured before anything is built to do it. The visitor will draw the
// wall themselves in turn B; here it is one fixed bar so the number means one
// thing.
//
// The bar is modelled with the fixture's own `gaps` mechanism: those cells start
// OPEN (the colony settles across them, they are part of the road), and shutting
// them is the block. That is the advisor's method on v3, kept so the two are
// comparable.
//
// Readings after the block are over trips completed AFTER it, against the BFS of
// the terrain as it then stands — so "healed" means the colony found a route as
// good as the new best, not that it got back to the old number, which the new
// terrain no longer allows.

import { mkdirSync, writeFileSync } from "node:fs";
import { FIELD_V4_SPEC } from "../src/fixtures/field-v4.ts";
import { buildField } from "../src/fixtures/grid.ts";
import type { Fixture } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { reading } from "../src/sim/reading.ts";
import { FIELD_RHO } from "../src/sim/rho.ts";

const ANTS = 400;
/** The road forms in ~10 s at 300 steps/s; block at 3000, as Decision 22 asks. */
const SETTLE = 3_000;
const AFTER = 12_000;
const SAMPLE_EVERY = 250;
const WINDOW = 300;
const MIN_TRIPS = 65;
const SEEDS = [1, 2, 3];
const HEALED_AT = 1.6;

/**
 * A vertical bar across the middle of the field, 11 cells tall, centred on the
 * nest–food line. Long enough that the road cannot simply shuffle sideways, short
 * enough that the field stays open above and below — the point is a detour, not a
 * maze.
 */
const BAR: (readonly [number, number])[] = [];
for (let y = 15; y <= 25; y += 1) BAR.push([30, y] as const);

const SPEC = { ...FIELD_V4_SPEC, gaps: BAR };
const FIXTURE: Fixture = buildField(SPEC);
const BFS_OPEN = shortestPathBetween(
  induce(FIXTURE, { openShortcut: true }),
  SPEC.nestZone,
  SPEC.foodZone,
) as number;
const BFS_BLOCKED = shortestPathBetween(
  induce(FIXTURE, { openShortcut: false }),
  SPEC.nestZone,
  SPEC.foodZone,
) as number;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? Number.NaN;
};
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");
const st = (v: number) => (Number.isFinite(v) ? String(v) : "never");

function map(colony: engine.Colony): string {
  const heat = new Map<string, number>();
  FIXTURE.edges.forEach((edge, e) => {
    const tau = (colony.home[e] as number) + (colony.foodTrail[e] as number);
    for (const node of [edge.a, edge.b]) {
      heat.set(node, Math.max(heat.get(node) ?? 0, tau));
    }
  });
  const peak = Math.max(...heat.values(), 1);
  const blocked = new Set(FIELD_V4_SPEC.blocked);
  const nest = new Set(SPEC.nestZone);
  const food = new Set(SPEC.foodZone);
  const bar = new Set(BAR.map(([x, y]) => `${x},${y}`));
  const rows: string[] = [];
  for (let y = 0; y < SPEC.height; y += 2) {
    let row = "";
    for (let x = 0; x < SPEC.width; x += 1) {
      const node = `${x},${y}`;
      if (nest.has(node)) row += "N";
      else if (food.has(node)) row += "F";
      else if (bar.has(node)) row += colony.shortcutOpen ? "." : "|";
      else if (blocked.has(node)) row += "#";
      else {
        const tau = heat.get(node) ?? 0;
        row +=
          tau <= 0
            ? "·"
            : String(
                Math.max(1, Math.round((Math.log1p(tau) / Math.log1p(peak)) * 9)),
              );
      }
    }
    rows.push(row);
  }
  return rows.join("\n");
}

interface Result {
  readonly before: number;
  readonly tripsBefore: number;
  readonly trapped: number;
  readonly healed: number;
  readonly at1000: number;
  readonly at3000: number;
  readonly atEnd: number;
  readonly maps: string[];
}

function run(rho: number, seed: number, wantMaps: boolean): Result {
  const colony = engine.createColony(FIXTURE, {
    rho,
    seed,
    ants: ANTS,
    tripHistory: Infinity,
  });
  engine.toggleShortcut(colony); // bar OPEN: plain open ground
  for (let s = 1; s <= SETTLE; s += 1) engine.step(colony);
  const beforeValue = reading(engine.completedTripLengths(colony), BFS_OPEN, {
    window: WINDOW,
    minTrips: MIN_TRIPS,
  });
  const before =
    beforeValue.status === "ok" ? (beforeValue.ratio as number) : Number.NaN;
  const tripsBefore = colony.tripsCompleted;

  engine.toggleShortcut(colony); // bar SHUT: the road is cut
  const barCells = new Set(
    BAR.map(([x, y]) => FIXTURE.nodes.indexOf(`${x},${y}`)),
  );
  let trapped = 0;
  for (let a = 0; a < colony.at.length; a += 1) {
    if (barCells.has(colony.at[a] as number)) trapped += 1;
  }

  const cut = colony.trips.length;
  const maps: string[] = [];
  let healed = Infinity;
  let at1000 = Number.NaN;
  let at3000 = Number.NaN;
  let atEnd = Number.NaN;
  for (let s = 1; s <= AFTER; s += 1) {
    engine.step(colony);
    if (wantMaps && (s === 500 || s === 3000)) {
      maps.push(`+${s} steps after the break:\n${map(colony)}`);
    }
    if (s % SAMPLE_EVERY !== 0) continue;
    const post = colony.trips.slice(cut);
    const value = reading(post, BFS_BLOCKED, {
      window: WINDOW,
      minTrips: MIN_TRIPS,
    });
    const ratio = value.status === "ok" ? (value.ratio as number) : Number.NaN;
    if (healed === Infinity && Number.isFinite(ratio) && ratio <= HEALED_AT) {
      healed = s;
    }
    if (s === 1000) at1000 = ratio;
    if (s === 3000) at3000 = ratio;
    if (s === AFTER) atEnd = ratio;
  }
  return { before, tripsBefore, trapped, healed, at1000, at3000, atEnd, maps };
}

function main(): void {
  const out: string[] = [];
  const say = (l = "") => {
    console.log(l);
    out.push(l);
  };
  const t0 = Date.now();

  say(`# Breaking the road on open ground — field v4`);
  say();
  say(
    `**Spike only**: nothing adopted, no default changed, no threshold or \`RHO\` touched.`,
  );
  say();
  say(
    `Beat 2 of Decision 22's claim A, measured before anything is built to do it. ` +
      `${ANTS} ants, ${SEEDS.length} seeds, D=20 T=80 W=3 w=4 ε=0. Settle **${SETTLE} steps** ` +
      `— about ten seconds at 300 steps/s — then an 11-cell bar (x = 30, y = 15..25) shuts ` +
      `across the road, then ${AFTER} more.`,
  );
  say();
  say(
    `BFS zone to zone: **${BFS_OPEN} moves** on open ground, **${BFS_BLOCKED}** with the bar ` +
      `shut. Readings after the break are over trips completed AFTER it, ÷ ${BFS_BLOCKED} — ` +
      `so "healed" means the colony found a route as good as the new best, not that it got ` +
      `back to a number the new terrain no longer allows. Healed = first sample ≤ ${HEALED_AT}×.`,
  );
  say();
  say(
    `| ρ | before (÷${BFS_OPEN}) | trips before | trapped on the bar | +1000 | +3000 | +${AFTER} | healed at |`,
  );
  say(`|---|---|---|---|---|---|---|---|`);

  const keep: { rho: number; maps: string[] }[] = [];
  for (const rho of [0, 0.002, 0.005, FIELD_RHO.default, 0.02, 0.05]) {
    const runs = SEEDS.map((seed, i) =>
      run(rho, seed, i === 0 && (rho === 0 || rho === FIELD_RHO.default)),
    );
    const m = (f: (r: Result) => number) => median(runs.map(f));
    if ((runs[0] as Result).maps.length > 0) {
      keep.push({ rho, maps: (runs[0] as Result).maps });
    }
    say(
      `| ${rho}${rho === FIELD_RHO.default ? " (page default)" : ""} | ${fmt(m((r) => r.before))}× | ` +
        `${m((r) => r.tripsBefore)} | ${m((r) => r.trapped)} | ${fmt(m((r) => r.at1000))}× | ` +
        `${fmt(m((r) => r.at3000))}× | ${fmt(m((r) => r.atEnd))}× | ${st(m((r) => r.healed))} |`,
    );
  }
  say();

  for (const { rho, maps } of keep) {
    say(`## ρ = ${rho}`);
    say();
    for (const drawing of maps) {
      say("```");
      say(drawing);
      say("```");
      say();
    }
  }

  say(`---`);
  say();
  say(`Run time ${Math.round((Date.now() - t0) / 1000)} s.`);

  mkdirSync("docs/spikes", { recursive: true });
  writeFileSync("docs/spikes/2026-08-17-field-v4-block.md", `${out.join("\n")}\n`);
  console.log("");
  console.log("written -> docs/spikes/2026-08-17-field-v4-block.md");
}

main();
