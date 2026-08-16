// ε for the look, on open ground: `pnpm spike:v4-epsilon`.
//
// SPIKE ONLY, AND FOR THE PICTURE. Decision 22 (6): ε is measured here so the
// director can decide whether a few dozen ants wandering off the road is worth
// having. It buys nothing for the argument — that was settled when ε was
// rejected on the evidence in Decision 21 — so nothing here is adopted.
//
// ε IS NOT IN THE ENGINE. Apply docs/spikes/2026-08-17-wander-epsilon.patch to
// run this, then revert it. `assertWanderIsWired()` refuses to print a table
// otherwise, because without the patch every arm silently becomes ε = 0 and the
// output would be a full set of numbers that all say the same thing.
//
// The director's expectation, written down BEFORE the run so the record shows
// whether it held: at ε ≈ 0.005 the reading sits at 1.2–1.3×, a few dozen ants
// are always off the road, and healing is unaffected.

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
const STEPS = 6_000;
const BLOCK_AFTER = 3_000;
const HEAL_FOR = 9_000;
const SAMPLE_EVERY = 250;
const WINDOW = 300;
const MIN_TRIPS = 65;
const SEEDS = [1, 2, 3];
const EPSILONS = [0, 0.003, 0.006, 0.01];
const HEAL_RHOS = [0, 0.005, 0.02];
const HEALED_AT = 1.6;

const BAR: (readonly [number, number])[] = [];
for (let y = 15; y <= 25; y += 1) BAR.push([30, y] as const);

const PLAIN: Fixture = buildField(FIELD_V4_SPEC);
const BARRED_SPEC = { ...FIELD_V4_SPEC, gaps: BAR };

const BFS_OPEN = shortestPathBetween(
  induce(PLAIN, { openShortcut: false }),
  FIELD_V4_SPEC.nestZone,
  FIELD_V4_SPEC.foodZone,
) as number;
const BFS_BLOCKED = shortestPathBetween(
  induce(buildField(BARRED_SPEC), { openShortcut: false }),
  FIELD_V4_SPEC.nestZone,
  FIELD_V4_SPEC.foodZone,
) as number;

/**
 * "Off the road" = standing on ground the colony has not marked.
 *
 * The first version of this measured distance from the BFS shortest route and
 * reported 94-96% off-road at EVERY ε including zero — which is true and
 * useless: the colony's road is not the BFS route, it is wherever the colony
 * settled. What the eye calls "wandering" is an ant on ground with no scent on
 * it, so that is what this counts: a cell is on the road if its combined τ is at
 * least a tenth of the busiest cell's.
 */
const ON_ROAD_SHARE = 0.1;

function offRoad(colony: engine.Colony, fixture: Fixture): number {
  const heat = new Map<number, number>();
  let peak = 0;
  fixture.edges.forEach((edge, e) => {
    const tau = (colony.home[e] as number) + (colony.foodTrail[e] as number);
    for (const node of [edge.a, edge.b]) {
      const at = fixture.nodes.indexOf(node);
      if (at < 0) continue;
      if (tau > (heat.get(at) ?? 0)) heat.set(at, tau);
    }
    if (tau > peak) peak = tau;
  });
  const floor = peak * ON_ROAD_SHARE;
  let off = 0;
  for (let a = 0; a < colony.at.length; a += 1) {
    if ((heat.get(colony.at[a] as number) ?? 0) < floor) off += 1;
  }
  return off / colony.at.length;
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? Number.NaN;
};
const fmt = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : "—");
const st = (v: number) => (Number.isFinite(v) ? String(v) : "never");

function withEpsilon(spec: typeof FIELD_V4_SPEC, eps: number): Fixture {
  return buildField({
    ...spec,
    // ε is not a FixtureParams field on main — see the header. The cast is what
    // lets this script live in the repo without the engine carrying the knob.
    params: { ...spec.params, wander: eps } as typeof spec.params,
  });
}

function assertWanderIsWired(): void {
  const digestAt = (eps: number): string => {
    const colony = engine.createColony(withEpsilon(FIELD_V4_SPEC, eps), {
      rho: FIELD_RHO.default,
      seed: 1,
      ants: 40,
    });
    for (let s = 0; s < 400; s += 1) engine.step(colony);
    return engine.digest(colony);
  };
  if (digestAt(0) === digestAt(0.5)) {
    throw new Error(
      "ε has no effect: this engine has no wander knob. Apply\n" +
        "  git apply docs/spikes/2026-08-17-wander-epsilon.patch\n" +
        "run this spike, then revert it — ε is NOT adopted.",
    );
  }
}

function main(): void {
  assertWanderIsWired();
  const out: string[] = [];
  const say = (l = "") => {
    console.log(l);
    out.push(l);
  };
  const t0 = Date.now();

  say(`# ε for the look, on field v4`);
  say();
  say(
    `**Spike only, and for the picture.** ε was rejected for the argument in ` +
      `Decision 21; this asks only whether a few dozen ants wandering is worth having. ` +
      `Nothing is adopted, no default changed, no threshold or \`RHO\` touched.`,
  );
  say();
  say(`## The expectation, as written before the run`);
  say();
  say(
    `> 预期：ε≈0.005 读数 1.2–1.3×、几十只在游荡、愈合不受影响。`,
  );
  say();
  say(
    `${ANTS} ants, ${SEEDS.length} seeds, ${STEPS} steps at ρ = ${FIELD_RHO.default}. ` +
      `BFS ${BFS_OPEN} on open ground. "Off the road" is the share of ants standing on ` +
      `ground the colony has not marked — a cell whose scent is under a tenth of the ` +
      `busiest cell's. (Measuring distance from the BFS route instead reported 94-96%% ` +
      `at every ε including zero: true, and useless, because the colony's road is not ` +
      `the BFS route.)`,
  );
  say();
  say(
    `| ε | first food | reading at 1200 (4 s) | at 3000 (10 s) | at ${STEPS} (20 s) | off the road |`,
  );
  say(`|---|---|---|---|---|---|`);

  for (const eps of EPSILONS) {
    const fixture = withEpsilon(FIELD_V4_SPEC, eps);
    const rows = SEEDS.map((seed) => {
      const colony = engine.createColony(fixture, {
        rho: FIELD_RHO.default,
        seed,
        ants: ANTS,
        tripHistory: Infinity,
      });
      let first = Infinity;
      const at = new Map<number, number>();
      const take = () => {
        const value = reading(engine.completedTripLengths(colony), BFS_OPEN, {
          window: WINDOW,
          minTrips: MIN_TRIPS,
        });
        return value.status === "ok" ? (value.ratio as number) : Number.NaN;
      };
      for (let s = 1; s <= STEPS; s += 1) {
        engine.step(colony);
        if (first === Infinity && colony.tripsCompleted > 0) first = s;
        // The three moments the screenshots are taken at, at 300 steps/s.
        if (s === 1200 || s === 3000 || s === STEPS) at.set(s, take());
      }
      return {
        first,
        at4: at.get(1200) ?? Number.NaN,
        at10: at.get(3000) ?? Number.NaN,
        at20: at.get(STEPS) ?? Number.NaN,
        off: offRoad(colony, fixture),
      };
    });
    const m = (f: (r: (typeof rows)[number]) => number) => median(rows.map(f));
    say(
      `| ${eps}${eps === 0 ? " (control)" : ""} | ${st(m((r) => r.first))} | ` +
        `${fmt(m((r) => r.at4))}× | ${fmt(m((r) => r.at10))}× | ${fmt(m((r) => r.at20))}× | ` +
        `${fmt(m((r) => r.off) * 100, 0)}% — ${Math.round(m((r) => r.off) * ANTS)} of ${ANTS} |`,
    );
  }
  say();

  say(`## Does ε change how the break heals?`);
  say();
  say(
    `Same bar as the blocking spike (x = 30, y = 15..25), shut at ${BLOCK_AFTER} steps, ` +
      `then ${HEAL_FOR} more. Readings over trips completed after the break, ÷ ${BFS_BLOCKED}. ` +
      `Healed = first sample ≤ ${HEALED_AT}×.`,
  );
  say();
  say(`| ε | ${HEAL_RHOS.map((r) => `ρ = ${r}`).join(" | ")} |`);
  say(`|---|${HEAL_RHOS.map(() => "---").join("|")}|`);

  for (const eps of EPSILONS) {
    const fixture = withEpsilon(BARRED_SPEC, eps);
    const cells: string[] = [];
    for (const rho of HEAL_RHOS) {
      const healedAt = SEEDS.map((seed) => {
        const colony = engine.createColony(fixture, {
          rho,
          seed,
          ants: ANTS,
          tripHistory: Infinity,
        });
        engine.toggleShortcut(colony); // bar open: plain ground
        for (let s = 1; s <= BLOCK_AFTER; s += 1) engine.step(colony);
        engine.toggleShortcut(colony); // bar shut: the break
        const cut = colony.trips.length;
        let healed = Infinity;
        for (let s = 1; s <= HEAL_FOR; s += 1) {
          engine.step(colony);
          if (s % SAMPLE_EVERY !== 0) continue;
          const value = reading(colony.trips.slice(cut), BFS_BLOCKED, {
            window: WINDOW,
            minTrips: MIN_TRIPS,
          });
          if (
            healed === Infinity &&
            value.status === "ok" &&
            (value.ratio as number) <= HEALED_AT
          ) {
            healed = s;
          }
        }
        return healed;
      });
      cells.push(st(median(healedAt)));
    }
    say(`| ${eps}${eps === 0 ? " (control)" : ""} | ${cells.join(" | ")} |`);
  }
  say();
  say(`---`);
  say();
  say(`Run time ${Math.round((Date.now() - t0) / 1000)} s. **Reported, not adopted.**`);

  mkdirSync("docs/spikes", { recursive: true });
  writeFileSync(
    "docs/spikes/2026-08-17-field-v4-epsilon.md",
    `${out.join("\n")}\n`,
  );
  console.log("");
  console.log("written -> docs/spikes/2026-08-17-field-v4-epsilon.md");
}

main();
