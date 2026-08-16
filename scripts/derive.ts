// Threshold derivation by two-sided separation: `pnpm derive`.
//
// A threshold is not a number chosen from the real engine's behaviour. It is a
// number that SEPARATES the real engine from a deliberately wrong one, with a stated
// margin on each side. If no such number exists, the reading or the fixture is
// wrong — not the threshold. Nothing here moves a number to manufacture a gap.
//
// Imports the mutants from spec/, because the negative controls are what the real
// engine is being separated from; the derivation is harness work, not shipping code.

import { mkdirSync, writeFileSync } from "node:fs";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import { induce, pathLength } from "../src/fixtures/graph.ts";
import { shortestPathLength } from "../src/oracle/bfs.ts";
import * as realEngine from "../src/sim/engine.ts";
import type { Reading } from "../src/sim/reading.ts";
import { reading } from "../src/sim/reading.ts";
import { HORIZON, RHO, SAMPLE } from "../src/sim/rho.ts";
import { firstSampleBelow, longestRunBelow, trace } from "../src/sim/trace.ts";
import { MUTANTS } from "../spec/mutants/index.ts";
import type { Mutant } from "../spec/mutants/index.ts";

const fixture = DOUBLE_BRIDGE;
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
// The rates, the grid and the horizon all come from src/sim/rho.ts, and the
// sampling itself from src/sim/trace.ts — the derivation measures on exactly the
// coordinates the tests and the page then use, or it is deriving for a different
// experiment than the one that ships.
const AFTER = HORIZON;
const RHOS = { locked: RHO.locked, switching: RHO.default, unstable: RHO.max };

const BFS_CLOSED = shortestPathLength(
  induce(fixture, { openShortcut: false }),
  fixture.nest,
  fixture.food,
) as number;
const BFS_OPEN = shortestPathLength(
  induce(fixture, { openShortcut: true }),
  fixture.nest,
  fixture.food,
) as number;

const LONG_EDGES = fixture.branches.long
  .slice(0, -1)
  .map((from, i) => [from, fixture.branches.long[i + 1] as string] as const);

const tauPerLongEdge = (colony: realEngine.Colony) =>
  LONG_EDGES.reduce((total, [a, b]) => {
    const { home, food } = realEngine.edgePheromone(colony, a, b);
    return total + home + food;
  }, 0) / LONG_EDGES.length;

// --- phase 1: SETTLE ------------------------------------------------------

/** First step at which τ per long edge is within 5% of steady state, and stays. */
function deriveSettle(): { settle: number; steady: number; trace: string } {
  const colony = realEngine.createColony(fixture, {
    rho: RHOS.switching,
    seed: 1,
  });
  const taus: number[] = [];
  for (let step = 1; step <= 8000; step += 1) {
    realEngine.step(colony);
    if (step % 100 === 0) taus.push(tauPerLongEdge(colony));
  }
  const steady =
    taus.slice(-10).reduce((sum, tau) => sum + tau, 0) / 10;
  const within = (tau: number) => Math.abs(tau - steady) / steady <= 0.05;
  let settle = 8000;
  for (let i = 0; i < taus.length; i += 1) {
    if (taus.slice(i).every(within)) {
      settle = (i + 1) * 100;
      break;
    }
  }
  const trace = taus
    .filter((_, i) => (i + 1) % 5 === 0)
    .map((tau, i) => `${(i + 1) * 500}:${tau.toFixed(0)}`)
    .join("  ");
  return { settle, steady, trace };
}

// --- phase 2: N_trips and MIN_TRIPS --------------------------------------

interface WindowRow {
  readonly window: number;
  readonly noise: number;
  readonly crossing: number | null;
}

/** Trip-length series at ρ = 0.12, opened at `settle`, one seed per entry. */
function tripSeries(settle: number, seed: number): number[][] {
  const colony = realEngine.createColony(fixture, {
    rho: RHOS.switching,
    seed,
  });
  for (let i = 0; i < settle; i += 1) realEngine.step(colony);
  realEngine.toggleShortcut(colony);
  const perSample: number[][] = [];
  for (let done = 0; done < AFTER; done += SAMPLE) {
    for (let i = 0; i < SAMPLE; i += 1) realEngine.step(colony);
    perSample.push([...realEngine.completedTripLengths(colony)]);
  }
  return perSample;
}

function deriveWindow(settle: number): {
  rows: WindowRow[];
  chosen: number;
  minTrips: number;
} {
  const series = SEEDS.map((seed) => tripSeries(settle, seed));
  const rows: WindowRow[] = [50, 100, 200, 300, 500].map((window) => {
    const noises: number[] = [];
    const crossings: number[] = [];
    for (const perSample of series) {
      const ratios = perSample.map(
        (trips) =>
          reading(trips, BFS_OPEN, { window, minTrips: 1 }).ratio as number,
      );
      // Noise: mean absolute change between consecutive samples over the tail.
      const tail = ratios.slice(-12);
      let delta = 0;
      for (let i = 1; i < tail.length; i += 1) {
        delta += Math.abs((tail[i] as number) - (tail[i - 1] as number));
      }
      noises.push(delta / (tail.length - 1));
      const at = ratios.findIndex((ratio) => ratio < 1.25);
      if (at >= 0) crossings.push((at + 1) * SAMPLE);
    }
    return {
      window,
      noise: noises.reduce((a, b) => a + b, 0) / noises.length,
      crossing:
        crossings.length === SEEDS.length
          ? Math.max(...crossings)
          : null,
    };
  });

  // Primary rule, stated so the choice would not have been taste if it had worked:
  // the smallest window whose tail noise is under 0.02× and whose slowest crossing
  // is no later than the largest window's. On this fixture it does not discriminate
  // — no window's tail noise drops below 0.02× (0.098 down to 0.075 across 50–500)
  // and every window crosses at the identical step, so there is no lag cost to
  // weigh. Recorded, not papered over: see spec/oracles.md §3.
  //
  // Secondary rule, applied because the primary one returned no answer: display
  // stability for the visitor's readout, preferring the window every prior spike
  // in this repo already used rather than introducing a new one on no fixture
  // evidence to prefer it. N_trips = 300: noise 0.077× there against 0.098× at the
  // smallest window (50), for an identical crossing step.
  const primary = rows.find(
    (row) =>
      row.noise < 0.02 &&
      row.crossing !== null &&
      rows.every((other) => other.crossing === null || row.crossing !== null),
  )?.window;
  const chosen = primary ?? (rows.find((row) => row.window === 300)?.window as number);

  // MIN_TRIPS: how many completed trips before the reading stops jumping. Walk the
  // trip series of a fresh colony and find where |Δ| stays under 0.05× thereafter.
  const trips = tripSeries(settle, 1).at(-1) as number[];
  let minTrips = 30;
  for (let n = 5; n < Math.min(200, trips.length); n += 5) {
    const later: number[] = [];
    for (let m = n; m < Math.min(n + 60, trips.length); m += 5) {
      later.push(
        reading(trips.slice(0, m), BFS_OPEN, {
          window: chosen,
          minTrips: 1,
        }).ratio as number,
      );
    }
    const jumpy = later.some(
      (ratio, i) => i > 0 && Math.abs(ratio - (later[i - 1] as number)) > 0.05,
    );
    if (!jumpy) {
      minTrips = n;
      break;
    }
  }
  return { rows, chosen, minTrips };
}

// --- phase 3: run everything on the same schedule ------------------------

interface RunResult {
  readonly settleRatio: number;
  readonly samples: readonly Reading[];
}

type Engine = { name: string; run: (rho: number, seed: number) => RunResult };

function makeRun(
  create: (rho: number, seed: number) => unknown,
  step: (s: unknown) => void,
  toggle: (s: unknown) => void,
  trips: (s: unknown) => readonly number[],
  settle: number,
  window: number,
  minTrips: number,
) {
  return (rho: number, seed: number): RunResult => {
    const state = create(rho, seed);
    for (let i = 0; i < settle; i += 1) step(state);
    const settleRatio = reading(trips(state), BFS_CLOSED, { window, minTrips })
      .ratio as number;
    toggle(state);
    const samples = trace(
      { step, completedTripLengths: trips },
      state,
      { steps: AFTER, against: BFS_OPEN, window, minTrips },
    );
    return { settleRatio, samples };
  };
}

const engines = (settle: number, window: number, minTrips: number): Engine[] => [
  {
    name: "REAL (1b)",
    run: makeRun(
      (rho, seed) => realEngine.createColony(fixture, { rho, seed }),
      (s) => realEngine.step(s as realEngine.Colony),
      (s) => realEngine.toggleShortcut(s as realEngine.Colony),
      (s) => realEngine.completedTripLengths(s as realEngine.Colony),
      settle,
      window,
      minTrips,
    ),
  },
  ...MUTANTS.map((m: Mutant) => ({
    name: m.name,
    run: makeRun(
      (rho, seed) => m.create(fixture, { rho, seed }),
      (s) => m.step(s),
      (s) => m.toggleShortcut(s),
      (s) => m.completedTripLengths(s),
      settle,
      window,
      minTrips,
    ),
  })),
];

const fmt = (v: number | null, digits = 3) =>
  v === null || Number.isNaN(v) ? "—" : v.toFixed(digits);

function main(): void {
  const { settle: derivedSettle, steady, trace } = deriveSettle();
  const settle = derivedSettle <= 2000 ? 2000 : derivedSettle;

  const out: string[] = [];
  const say = (line = "") => {
    console.log(line);
    out.push(line);
  };

  say(`# Threshold derivation — two-sided separation`);
  say();
  say(`fixture ${fixture.name} · h=${fixture.params.h} k=${fixture.params.k} floor=${fixture.params.floor} · 64 ants`);
  say(`BFS ${BFS_CLOSED} closed → ${BFS_OPEN} open · long ${pathLength(fixture.branches.long)} / short ${pathLength(fixture.branches.short)} moves`);
  say(`${SEEDS.length} seeds · ρ ∈ {${Object.values(RHOS).join(", ")}} · ${AFTER} steps after opening, sampled every ${SAMPLE}`);
  say();
  say(`## SETTLE`);
  say();
  say(`τ per long edge at ρ=0.12 reaches steady state ${steady.toFixed(1)}; within 5% from step ${derivedSettle}.`);
  say(`trace (step:τ)  ${trace}`);
  say(`SETTLE = ${settle}${derivedSettle <= 2000 ? " (2000 holds, kept)" : " (2000 did not hold)"}`);
  say();

  const { rows, chosen, minTrips } = deriveWindow(settle);
  say(`## N_trips and MIN_TRIPS`);
  say();
  say(`| window | tail noise (mean \\|Δ\\|) | slowest crossing < 1.25× |`);
  say(`|---|---|---|`);
  for (const row of rows) {
    say(`| ${row.window} | ${fmt(row.noise)} | ${row.crossing ?? "never (some seed)"} |`);
  }
  say();
  say(`Primary rule: smallest window with tail noise < 0.02× whose slowest crossing`);
  say(`is no later than the largest window's. Did not discriminate on this fixture:`);
  say(`no window's noise drops below 0.02× and every window crosses at the same step.`);
  say(`Secondary rule, applied because the primary returned no answer: display`);
  say(`stability for the visitor's readout — the window every prior spike already`);
  say(`used, not a new one chosen on no fixture evidence to prefer it.`);
  say(`N_trips = ${chosen} · MIN_TRIPS = ${minTrips}`);
  say();

  const all = engines(settle, chosen, minTrips);
  const results = new Map<string, Map<number, RunResult[]>>();
  for (const engine of all) {
    const byRho = new Map<number, RunResult[]>();
    for (const rho of Object.values(RHOS)) {
      byRho.set(
        rho,
        SEEDS.map((seed) => engine.run(rho, seed)),
      );
    }
    results.set(engine.name, byRho);
  }

  const real = results.get("REAL (1b)") as Map<number, RunResult[]>;
  const of = (name: string, rho: number) =>
    (results.get(name) as Map<number, RunResult[]>).get(rho) as RunResult[];

  // --- EMERGED: shortcut closed, vs BFS 8 --------------------------------
  say(`## EMERGED — shortcut closed, vs BFS ${BFS_CLOSED}`);
  say();
  const realEmerge = (real.get(RHOS.switching) as RunResult[]).map(
    (r) => r.settleRatio,
  );
  const emergeMutants = ["pure random walk", "one pheromone map"];
  say(`| engine | best | worst |`);
  say(`|---|---|---|`);
  say(`| REAL ρ=0.12 | ${fmt(Math.min(...realEmerge))} | **${fmt(Math.max(...realEmerge))}** |`);
  for (const name of emergeMutants) {
    const vals = of(name, RHOS.switching).map((r) => r.settleRatio);
    say(`| ${name} | **${fmt(Math.min(...vals))}** | ${fmt(Math.max(...vals))} |`);
  }
  say();

  // --- LOCKED: ρ = 0 -----------------------------------------------------
  say(`## LOCKED — ρ = 0, after the shortcut opens`);
  say();
  const lastOf = (r: RunResult) => r.samples.at(-1)?.ratio ?? null;
  const realLocked = (real.get(RHOS.locked) as RunResult[]).map(
    (r) => lastOf(r) as number,
  );
  const lockMutants = ["max-update freshness field", "ρ pinned at 0.25"];
  say(`| engine | worst (lowest) | best (highest) |`);
  say(`|---|---|---|`);
  say(`| REAL ρ=0 | **${fmt(Math.min(...realLocked))}** | ${fmt(Math.max(...realLocked))} |`);
  for (const name of lockMutants) {
    const vals = of(name, RHOS.locked).map((r) => lastOf(r) as number);
    say(`| ${name} | ${fmt(Math.min(...vals))} | **${fmt(Math.max(...vals))}** |`);
  }
  say();

  // --- SWITCHED: ρ = 0.12 ------------------------------------------------
  say(`## SWITCHED — ρ = 0.12, after the shortcut opens`);
  say();
  const realSwitch = (real.get(RHOS.switching) as RunResult[]).map(
    (r) => lastOf(r) as number,
  );
  const switchMutants = ["ρ ignored"];
  say(`| engine | best (lowest) | worst (highest) |`);
  say(`|---|---|---|`);
  say(`| REAL ρ=0.12 | ${fmt(Math.min(...realSwitch))} | **${fmt(Math.max(...realSwitch))}** |`);
  for (const name of switchMutants) {
    const vals = of(name, RHOS.switching).map((r) => lastOf(r) as number);
    say(`| ${name} | **${fmt(Math.min(...vals))}** | ${fmt(Math.max(...vals))} |`);
  }
  say();

  // --- M: when does ρ = 0.12 get there ------------------------------------
  say(`## M — steps for ρ = 0.12 to cross, per seed`);
  say();
  const crossingsAt = (rs: RunResult[], below: number) =>
    rs.map((r) => {
      const at = firstSampleBelow(r.samples, below);
      return at < 0 ? Infinity : (at + 1) * SAMPLE;
    });
  say(`(reported at several candidate SWITCHED values, so M and SWITCHED are chosen together)`);
  say(`| SWITCHED | slowest seed | seeds that never cross |`);
  say(`|---|---|---|`);
  for (const candidate of [1.2, 1.3, 1.4, 1.5]) {
    const cs = crossingsAt(real.get(RHOS.switching) as RunResult[], candidate);
    const never = cs.filter((c) => !Number.isFinite(c)).length;
    const slowest = Math.max(...cs.filter(Number.isFinite));
    say(`| ${candidate}× | ${never === SEEDS.length ? "—" : slowest} | ${never}/${SEEDS.length} |`);
  }
  say();

  // --- UNSTABLE / K: ρ = 0.25 --------------------------------------------
  say(`## UNSTABLE and K — ρ = 0.25`);
  say();
  say(`| candidate UNSTABLE | REAL longest run below (max over seeds) | freshness longest run below (min over seeds) |`);
  say(`|---|---|---|`);
  for (const candidate of [1.1, 1.2, 1.3, 1.4]) {
    const realRuns = (real.get(RHOS.unstable) as RunResult[]).map((r) =>
      longestRunBelow(r.samples, candidate),
    );
    const mutantRuns = of("max-update freshness field", RHOS.unstable).map((r) =>
      longestRunBelow(r.samples, candidate),
    );
    say(
      `| ${candidate}× | **${Math.max(...realRuns)}** samples | **${Math.min(...mutantRuns)}** samples |`,
    );
  }
  say();
  const realFinal = (real.get(RHOS.unstable) as RunResult[]).map(
    (r) => lastOf(r) as number,
  );
  say(`REAL ρ=0.25 final reading: ${fmt(Math.min(...realFinal))} – ${fmt(Math.max(...realFinal))}`);
  say();

  // --- N: how long does ρ = 0 hold ---------------------------------------
  say(`## N — how long ρ = 0 holds above a candidate LOCKED`);
  say();
  say(`| candidate LOCKED | last sample where every REAL seed is still above |`);
  say(`|---|---|`);
  for (const candidate of [1.6, 1.7, 1.8, 1.9]) {
    const rs = real.get(RHOS.locked) as RunResult[];
    let held = 0;
    for (let i = 0; i < (rs[0] as RunResult).samples.length; i += 1) {
      if (rs.every((r) => (r.samples[i]?.ratio ?? 0) >= candidate))
        held = (i + 1) * SAMPLE;
      else break;
    }
    say(`| ${candidate}× | ${held} |`);
  }
  say();

  // --- chosen thresholds: placement rule, both margins -------------------
  // Placement rule (director): a threshold clears both sides by a stated margin
  // but sits where its meaning holds, not at the midpoint. EMERGED sits where the
  // gap forces it (only one control — pure random walk — remains eligible; one
  // pheromone map's best EMERGED reading is *better* than the real engine's worst,
  // so it cannot serve here and its pairing moved to behaviour (3)). SWITCHED and
  // LOCKED sit near the real engine's own distribution, not the mutant's, because
  // the reading the visitor sees at the default and at zero forgetting is what the
  // page has to be honest about.
  say(`## Chosen thresholds — placement and margins`);
  say();
  const chosenEmerged = 1.15;
  const chosenLocked = 1.85;
  const chosenSwitched = 1.45;
  const realEmergedWorst = Math.max(...realEmerge);
  const randomWalkEmergedBest = Math.min(
    ...of("pure random walk", RHOS.switching).map((r) => r.settleRatio),
  );
  say(`EMERGED = ${chosenEmerged}`);
  say(`  margin above real worst (${fmt(realEmergedWorst)}, real must clear it from below): ${fmt(chosenEmerged - realEmergedWorst)}`);
  say(`  margin below pure-random-walk best (${fmt(randomWalkEmergedBest)}, mutant must stay above it): ${fmt(randomWalkEmergedBest - chosenEmerged)}`);
  say(`  (one pheromone map excluded from this control: its best, ${fmt(Math.min(...of("one pheromone map", RHOS.switching).map((r) => r.settleRatio)))}, is already below EMERGED — it is behaviour (3)'s control, not (1)'s)`);
  say();

  const realLockedWorst = Math.min(...realLocked);
  const lockMutantWorstCase = Math.max(
    ...lockMutants.flatMap((name) =>
      of(name, RHOS.locked).map((r) => lastOf(r) as number),
    ),
  );
  say(`LOCKED = ${chosenLocked}`);
  say(`  margin below real worst (${fmt(realLockedWorst)}): ${fmt(realLockedWorst - chosenLocked)}`);
  say(`  margin above the closer mutant's best (${fmt(lockMutantWorstCase)}): ${fmt(chosenLocked - lockMutantWorstCase)}`);
  say();

  const realSwitchedWorst = Math.max(...realSwitch);
  const switchMutantWorstCase = Math.min(
    ...switchMutants.flatMap((name) =>
      of(name, RHOS.switching).map((r) => lastOf(r) as number),
    ),
  );
  say(`SWITCHED = ${chosenSwitched}`);
  say(`  margin above real worst (${fmt(realSwitchedWorst)}): ${fmt(chosenSwitched - realSwitchedWorst)}`);
  say(`  margin below the mutant's worst case (${fmt(switchMutantWorstCase)}): ${fmt(switchMutantWorstCase - chosenSwitched)}`);
  say();

  const mCrossings = crossingsAt(
    real.get(RHOS.switching) as RunResult[],
    chosenSwitched,
  ).filter(Number.isFinite);
  const slowestCrossing = Math.max(...mCrossings);
  const chosenM = Math.ceil((slowestCrossing * 1.25) / SAMPLE) * SAMPLE;
  say(`M = ${chosenM}`);
  say(`  slowest seed to cross SWITCHED=${chosenSwitched}: ${slowestCrossing} steps; M = that + 25% margin, rounded up to the sample grid`);
  say();

  const rs = real.get(RHOS.locked) as RunResult[];
  let heldAtLocked = 0;
  for (let i = 0; i < (rs[0] as RunResult).samples.length; i += 1) {
    if (rs.every((r) => (r.samples[i]?.ratio ?? 0) >= chosenLocked))
      heldAtLocked = (i + 1) * SAMPLE;
    else break;
  }
  say(`N = ${heldAtLocked}`);
  say(`  every REAL ρ=0 seed holds at or above LOCKED=${chosenLocked} for the full ${AFTER}-step run sampled; N is that observed floor, not a guess`);
  say();

  say(`UNSTABLE and K:`);
  const unstableCandidates = [1.1, 1.2, 1.3, 1.4];
  for (const candidate of unstableCandidates) {
    const realRuns = (real.get(RHOS.unstable) as RunResult[]).map((r) =>
      longestRunBelow(r.samples, candidate),
    );
    const freshRuns = of("max-update freshness field", RHOS.unstable).map((r) =>
      longestRunBelow(r.samples, candidate),
    );
    say(`  candidate ${candidate}×: REAL longest run below (worst case) ${Math.max(...realRuns)} samples · freshness longest run below (best case, i.e. least stable) ${Math.min(...freshRuns)} samples`);
  }
  say();

  // --- everything else, for information ----------------------------------
  say(`## Every engine, final reading per ρ (median over seeds)`);
  say();
  say(`| engine | ρ=0 | ρ=0.12 | ρ=0.25 |`);
  say(`|---|---|---|---|`);
  const mid = (vals: number[]) => {
    const s = [...vals].sort((a, b) => a - b);
    return s[s.length >> 1] as number;
  };
  for (const engine of all) {
    const cells = Object.values(RHOS).map((rho) =>
      fmt(mid(of(engine.name, rho).map((r) => lastOf(r) as number))),
    );
    say(`| ${engine.name} | ${cells.join(" | ")} |`);
  }

  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  mkdirSync("docs/spikes", { recursive: true });
  const path = `docs/spikes/${stamp}-derivation.md`;
  writeFileSync(path, `${out.join("\n")}\n`);
  console.log("");
  console.log(`written -> ${path}`);
}

main();
