// Raising ρ on a road that already exists: `pnpm spike:raise`.
//
// SPIKE ONLY. Nothing adopted, no default changed, no threshold or RHO touched.
//
// The advisor's four spikes all set ρ once and left it. The visitor does not:
// they watch a road form at the default rate and THEN move the slider. Two
// questions follow, and B′ needs both answered because the slider is beat 3 and
// beat 4.
//
//   A. Raise ρ hard on a formed road — 0.15, 0.2, 0.3. Does the road disperse,
//      and how long does it take? ("forgets too fast" has to be something the
//      visitor can cause, not only something they can start with.)
//   B. Raise ρ moderately — 0.02, 0.03, 0.05 — and THEN block the road. Does it
//      still heal? The block spike measured a colony that had lived at that ρ
//      all along, and at ρ ≥ 0.02 it had no road to block. This asks the
//      sequence the visitor actually performs.
//
// The bar, the schedule, the healed line and the reading are the advisor's, so
// the two halves are comparable: 12-cell bar at y = 12, x = 10..21, post-block
// readings over trips completed AFTER the block only, healed = first sample
// ≤ 1.6×.

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
const SETTLE_RHO = 0.01;
const HEALED_AT = 1.6;
/** A road is "gone" once the mean trip is this far off the shortest route. */
const LOST_AT = 1.6;

const BAR: (readonly [number, number])[] = [];
for (let x = 10; x <= 21; x += 1) BAR.push([x, 12] as const);

const SPEC = {
  ...FIELD_V3_SPEC,
  gaps: BAR,
  params: {
    ...FIELD_V3_SPEC.params,
    gradedOver: 80,
    whisker: 3,
    straightBias: 4,
    depositPerStep: 20,
  },
};
const FIXTURE: Fixture = buildField(SPEC);
const K = SPEC.params.k;
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

/** Mean pheromone on the committed road, in multiples of k — the road's own life. */
function tauOnRoad(colony: engine.Colony): number {
  const road = new Set(FIXTURE.branches.long);
  let sum = 0;
  let count = 0;
  FIXTURE.edges.forEach((edge, e) => {
    if (!road.has(edge.a) || !road.has(edge.b)) return;
    sum += (colony.home[e] as number) + (colony.foodTrail[e] as number);
    count += 1;
  });
  return count === 0 ? Number.NaN : sum / count / K;
}

/** ρ is read from the colony every step, so the slider moves without a restart. */
const setRho = (colony: engine.Colony, rho: number): void => {
  (colony as { rho: number }).rho = rho;
};

function settled(seed: number): engine.Colony {
  const colony = engine.createColony(FIXTURE, {
    rho: SETTLE_RHO,
    seed,
    ants: ANTS,
    tripHistory: Infinity,
  });
  engine.toggleShortcut(colony); // bar OPEN: the normal field, as the advisor ran it
  for (let s = 1; s <= SETTLE; s += 1) engine.step(colony);
  return colony;
}

function main(): void {
  const out: string[] = [];
  const say = (l = "") => {
    console.log(l);
    out.push(l);
  };
  const t0 = Date.now();

  say(`# Raising ρ on a road that already exists — field v2`);
  say();
  say(
    `**Spike only**: nothing adopted, no default changed, no threshold or \`RHO\` touched.`,
  );
  say();
  say(
    `D=20 T=80 W=3 w=4 ε=0, ${ANTS} ants, ${SEEDS.length} seeds. Every run settles ` +
      `${SETTLE} steps at ρ = ${SETTLE_RHO} — the page's default, which forms a road — ` +
      `and only then does the slider move. BFS zone-to-zone: ${BFS_OPEN} normal, ` +
      `${BFS_BLOCKED} with the bar shut.`,
  );
  say();
  say(
    `This is the sequence the VISITOR performs. The advisor's spikes set ρ once at ` +
      `creation, which answers a different question — at ρ ≥ 0.02 from cold there was ` +
      `never a road to disperse or to block.`,
  );
  say();

  // --- A. does a formed road disperse when ρ is raised? --------------------
  say(`## A. Raise ρ on a formed road — does it disperse, and how fast?`);
  say();
  say(
    `"Lost" = the first sample where the reading exceeds ${LOST_AT}× against the ` +
      `${BFS_OPEN}-move route it was holding. τ_road is the mean pheromone on the ` +
      `committed route, in multiples of k = ${K}.`,
  );
  say();
  say(
    `| ρ raised to | before | τ_road before | +1000 | +3000 | +${AFTER} | τ_road at end | lost (>${LOST_AT}×) at |`,
  );
  say(`|---|---|---|---|---|---|---|---|`);

  for (const rho of [SETTLE_RHO, 0.05, 0.15, 0.2, 0.3]) {
    const rows = SEEDS.map((seed) => {
      const colony = settled(seed);
      const beforeValue = reading(
        engine.completedTripLengths(colony),
        BFS_OPEN,
        { window: WINDOW, minTrips: MIN_TRIPS },
      );
      const before =
        beforeValue.status === "ok" ? (beforeValue.ratio as number) : Number.NaN;
      const tauBefore = tauOnRoad(colony);
      setRho(colony, rho);

      const cut = colony.trips.length;
      let lost = Infinity;
      let at1000 = Number.NaN;
      let at3000 = Number.NaN;
      let atEnd = Number.NaN;
      for (let s = 1; s <= AFTER; s += 1) {
        engine.step(colony);
        if (s % SAMPLE_EVERY !== 0) continue;
        const post = colony.trips.slice(cut);
        const value = reading(post, BFS_OPEN, {
          window: WINDOW,
          minTrips: MIN_TRIPS,
        });
        // "No reading" after the block means too few trips are completing at
        // all, which is losing the road the hard way — it counts as lost.
        const ratio =
          value.status === "ok" ? (value.ratio as number) : Number.POSITIVE_INFINITY;
        if (lost === Infinity && ratio > LOST_AT) lost = s;
        if (s === 1000) at1000 = ratio;
        if (s === 3000) at3000 = ratio;
        if (s === AFTER) atEnd = ratio;
      }
      return { before, tauBefore, at1000, at3000, atEnd, lost, tauEnd: tauOnRoad(colony) };
    });
    const m = (f: (r: (typeof rows)[number]) => number) => median(rows.map(f));
    say(
      `| ${rho}${rho === SETTLE_RHO ? " (control)" : ""} | ${fmt(m((r) => r.before))}× | ` +
        `${fmt(m((r) => r.tauBefore), 1)} k | ${fmt(m((r) => r.at1000))}× | ` +
        `${fmt(m((r) => r.at3000))}× | ${fmt(m((r) => r.atEnd))}× | ` +
        `${fmt(m((r) => r.tauEnd), 1)} k | ${st(m((r) => r.lost))} |`,
    );
  }
  say();

  // --- B. raise ρ, THEN block the road -------------------------------------
  say(`## B. Raise ρ on a formed road, then block it — does it still heal?`);
  say();
  say(
    `Settle at ρ = ${SETTLE_RHO}, raise the slider, then shut the bar. Readings are ` +
      `over trips completed AFTER the block only, ÷ ${BFS_BLOCKED}. ` +
      `"Healed" = first sample ≤ ${HEALED_AT}×, the advisor's line.`,
  );
  say();
  say(
    `| ρ raised to | before (÷${BFS_OPEN}) | +2000 | +6000 | +${AFTER} | healed at | post-block trips |`,
  );
  say(`|---|---|---|---|---|---|---|`);

  for (const rho of [0, SETTLE_RHO, 0.02, 0.03, 0.05]) {
    const rows = SEEDS.map((seed) => {
      const colony = settled(seed);
      const beforeValue = reading(
        engine.completedTripLengths(colony),
        BFS_OPEN,
        { window: WINDOW, minTrips: MIN_TRIPS },
      );
      const before =
        beforeValue.status === "ok" ? (beforeValue.ratio as number) : Number.NaN;
      setRho(colony, rho);
      engine.toggleShortcut(colony); // bar SHUT: the road is blocked

      const cut = colony.trips.length;
      let healed = Infinity;
      let at2000 = Number.NaN;
      let at6000 = Number.NaN;
      let atEnd = Number.NaN;
      for (let s = 1; s <= AFTER; s += 1) {
        engine.step(colony);
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
        if (s === 2000) at2000 = ratio;
        if (s === 6000) at6000 = ratio;
        if (s === AFTER) atEnd = ratio;
      }
      return {
        before,
        at2000,
        at6000,
        atEnd,
        healed,
        post: colony.trips.length - cut,
      };
    });
    const m = (f: (r: (typeof rows)[number]) => number) => median(rows.map(f));
    say(
      `| ${rho}${rho === SETTLE_RHO ? " (control)" : ""} | ${fmt(m((r) => r.before))}× | ` +
        `${fmt(m((r) => r.at2000))}× | ${fmt(m((r) => r.at6000))}× | ` +
        `${fmt(m((r) => r.atEnd))}× | ${st(m((r) => r.healed))} | ${m((r) => r.post)} |`,
    );
  }
  say();
  say(`---`);
  say();
  say(`Run time ${Math.round((Date.now() - t0) / 1000)} s.`);

  mkdirSync("docs/spikes", { recursive: true });
  writeFileSync("docs/spikes/2026-08-17-field-v2-raise.md", `${out.join("\n")}\n`);
  console.log("");
  console.log("written -> docs/spikes/2026-08-17-field-v2-raise.md");
}

main();
