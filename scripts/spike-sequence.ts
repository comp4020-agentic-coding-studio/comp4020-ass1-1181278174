// The visitor's own sequence, on field v2 — ADVISOR SCRATCH RUN, SPIKE ONLY.
//
// (A) settle at ρ0 with the door shut → open the door → wait → RAISE ρ → does the
//     long road dissolve and re-form through the door? → LOWER ρ back → does it stay?
// (C) door open from the start: at which ρ does even the short road fail?
//
// D=20 T=80 W=3 w=4 ε=0 — the engine as pushed (f5a8fc8), no fifth knob.

import { mkdirSync, writeFileSync } from "node:fs";
import { FIELD_V3_SPEC } from "../src/fixtures/field-v3.ts";
import { buildField } from "../src/fixtures/grid.ts";
import type { Fixture } from "../src/fixtures/double-bridge.ts";
import { induce } from "../src/fixtures/graph.ts";
import { shortestPathBetween } from "../src/oracle/bfs.ts";
import * as engine from "../src/sim/engine.ts";
import { reading } from "../src/sim/reading.ts";

const ANTS = 400;
const WINDOW = 300;
const MIN_TRIPS = 65;
const SEEDS = [1, 2, 3];
const SAMPLE = 250;

const FIXTURE: Fixture = buildField({
  ...FIELD_V3_SPEC,
  params: { ...FIELD_V3_SPEC.params, gradedOver: 80, whisker: 3, straightBias: 4, depositPerStep: 20 },
});
const BFS_LONG = shortestPathBetween(induce(FIXTURE, { openShortcut: false }), FIELD_V3_SPEC.nestZone, FIELD_V3_SPEC.foodZone) as number;
const BFS_SHORT = shortestPathBetween(induce(FIXTURE, { openShortcut: true }), FIELD_V3_SPEC.nestZone, FIELD_V3_SPEC.foodZone) as number;
const VIA = (BFS_LONG + BFS_SHORT) / 2;

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? Number.NaN;
};
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");
const st = (v: number) => (Number.isFinite(v) ? String(v) : "never");

function setRho(colony: engine.Colony, rho: number): void {
  (colony as { rho: number }).rho = rho;
}
function snapshot(colony: engine.Colony, bfs: number) {
  const trips = engine.completedTripLengths(colony);
  const value = reading(trips, bfs, { window: WINDOW, minTrips: MIN_TRIPS });
  const recent = trips.slice(-WINDOW);
  return {
    ratio: value.status === "ok" ? (value.ratio as number) : Number.NaN,
    via: recent.length === 0 ? Number.NaN : recent.filter((l) => l < VIA).length / recent.length,
    trips: colony.tripsCompleted,
  };
}
function runFor(colony: engine.Colony, steps: number): void {
  for (let s = 0; s < steps; s += 1) engine.step(colony);
}

interface SeqResult {
  rho0: number; rho1: number;
  before: number; afterOpen: number; viaAfterOpen: number;
  toVia50: number; toBelow16: number; peakDuringRaise: number; endRaise: number; viaEndRaise: number;
  endLower: number; viaEndLower: number;
}

function sequence(rho0: number, rho1: number, seed: number): SeqResult {
  const colony = engine.createColony(FIXTURE, { rho: rho0, seed, ants: ANTS, tripHistory: Infinity });
  runFor(colony, 8000);
  const before = snapshot(colony, BFS_LONG).ratio;
  engine.toggleShortcut(colony);
  runFor(colony, 3000);
  const open = snapshot(colony, BFS_SHORT);
  setRho(colony, rho1);
  let toVia50 = Infinity, toBelow16 = Infinity, peak = 0;
  for (let s = SAMPLE; s <= 8000; s += SAMPLE) {
    runFor(colony, SAMPLE);
    const snap = snapshot(colony, BFS_SHORT);
    if (Number.isFinite(snap.ratio)) peak = Math.max(peak, snap.ratio);
    if (toVia50 === Infinity && snap.via >= 0.5) toVia50 = s;
    if (toBelow16 === Infinity && Number.isFinite(snap.ratio) && snap.ratio <= 1.6 && snap.via >= 0.5) toBelow16 = s;
  }
  const endRaise = snapshot(colony, BFS_SHORT);
  setRho(colony, rho0);
  runFor(colony, 4000);
  const endLower = snapshot(colony, BFS_SHORT);
  return {
    rho0, rho1, before, afterOpen: open.ratio, viaAfterOpen: open.via,
    toVia50, toBelow16, peakDuringRaise: peak, endRaise: endRaise.ratio, viaEndRaise: endRaise.via,
    endLower: endLower.ratio, viaEndLower: endLower.via,
  };
}

function shortRoadOnly(rho: number, seed: number) {
  const colony = engine.createColony(FIXTURE, { rho, seed, ants: ANTS, tripHistory: Infinity });
  engine.toggleShortcut(colony); // door open from the start
  runFor(colony, 8000);
  const snap = snapshot(colony, BFS_SHORT);
  return { rho, ratio: snap.ratio, via: snap.via, trips: snap.trips };
}

function main(): void {
  const out: string[] = [];
  const say = (l = "") => { console.log(l); out.push(l); };
  const t0 = Date.now();
  say(`# The visitor's sequence, field v2 — ADVISOR SCRATCH RUN`);
  say();
  say(`D=20 T=80 W=3 w=4 ε=0, ${ANTS} ants, ${SEEDS.length} seeds (medians). BFS ${BFS_LONG} / ${BFS_SHORT}; "via" = share of last ${WINDOW} trips < ${VIA} moves.`);
  say();
  say(`## (A) settle 8000 at ρ0 (door shut) → open → 3000 more → raise to ρ1 for 8000 → lower back to ρ0 for 4000`);
  say();
  say(`| ρ0 | ρ1 | before (÷${BFS_LONG}) | 3000 after opening (÷${BFS_SHORT}) | via then | after raise: via ≥ 50% at | ≤1.6× & via≥50% at | peak reading during raise | end of raise | via | after lowering: reading | via |`);
  say(`|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const [rho0, rho1] of [[0.01, 0.015], [0.01, 0.02], [0.01, 0.03], [0.01, 0.05], [0.005, 0.03], [0, 0.03]] as const) {
    const runs = SEEDS.map((seed) => sequence(rho0, rho1, seed));
    const m = (f: (r: SeqResult) => number) => median(runs.map(f));
    say(`| ${rho0} | ${rho1} | ${fmt(m((r) => r.before))}× | ${fmt(m((r) => r.afterOpen))}× | ${fmt(m((r) => r.viaAfterOpen) * 100, 0)}% | ${st(m((r) => r.toVia50))} | ${st(m((r) => r.toBelow16))} | ${fmt(m((r) => r.peakDuringRaise))}× | ${fmt(m((r) => r.endRaise))}× | ${fmt(m((r) => r.viaEndRaise) * 100, 0)}% | ${fmt(m((r) => r.endLower))}× | ${fmt(m((r) => r.viaEndLower) * 100, 0)}% |`);
  }
  say();
  say(`## (C) door open from the start — where does even the short road fail?`);
  say();
  say(`| ρ | reading at 8000 (÷${BFS_SHORT}) | via | trips |`);
  say(`|---|---|---|---|`);
  for (const rho of [0.05, 0.1, 0.15, 0.2, 0.3]) {
    const runs = SEEDS.map((seed) => shortRoadOnly(rho, seed));
    say(`| ${rho} | ${fmt(median(runs.map((r) => r.ratio)))}× | ${fmt(median(runs.map((r) => r.via)) * 100, 0)}% | ${median(runs.map((r) => r.trips))} |`);
  }
  say();
  say(`Run time ${((Date.now() - t0) / 1000).toFixed(0)} s.`);
  mkdirSync("docs/spikes", { recursive: true });
  writeFileSync("docs/spikes/2026-08-17-field-v2-sequence-advisor.md", `${out.join("\n")}\n`);
}
main();
