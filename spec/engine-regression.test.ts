// The bridge, frozen.
//
// Decision 17 generalises the engine with four fixture parameters, each of whose
// DEFAULT is today's behaviour. That claim is either bit-true or it is marketing,
// and the difference is not visible by reading the diff: a generalisation that
// changes the double bridge by one deposit would move every threshold in
// spec/oracles.md and every distribution in the derivation, silently.
//
// So these digests were captured from the engine as it stood BEFORE the
// generalisation, pasted here as literals, and must not move. A red here does not
// mean "the new parameters are wrong" — it means the bridge is no longer the
// fixture the thresholds were derived on, and the derivation is void until it is.
//
// The trip counts are here for the same reason and are the more readable failure:
// a digest tells you something changed, a trip count tells you what.

import { describe, expect, it } from "vitest";
import { DOUBLE_BRIDGE } from "../src/fixtures/double-bridge.ts";
import * as engine from "../src/sim/engine.ts";

interface Frozen {
  readonly rho: number;
  readonly seed: number;
  readonly steps: number;
  readonly opened?: boolean;
  readonly after?: number;
  readonly digest: string;
  readonly trips: number;
}

/** Captured 2026-08-17 from the pre-Decision-17 engine. Never regenerate to fit. */
const FROZEN: readonly Frozen[] = [
  { rho: 0, seed: 1, steps: 400, digest: "35efaf5a", trips: 1558 },
  { rho: 0, seed: 1, steps: 2000, digest: "4119bd4e", trips: 7958 },
  { rho: 0, seed: 2, steps: 400, digest: "82bccbbe", trips: 1554 },
  { rho: 0, seed: 2, steps: 2000, digest: "88c22078", trips: 7954 },
  { rho: 0, seed: 3, steps: 400, digest: "3a7d09e8", trips: 1556 },
  { rho: 0, seed: 3, steps: 2000, digest: "f04d7347", trips: 7956 },
  { rho: 0, seed: 7, steps: 400, digest: "75545d54", trips: 1561 },
  { rho: 0, seed: 7, steps: 2000, digest: "0db97288", trips: 7961 },
  { rho: 0.05, seed: 1, steps: 400, digest: "7585b4ee", trips: 1537 },
  { rho: 0.05, seed: 1, steps: 2000, digest: "dc035c0e", trips: 7866 },
  { rho: 0.05, seed: 2, steps: 400, digest: "ef7eb55b", trips: 1537 },
  { rho: 0.05, seed: 2, steps: 2000, digest: "b6344d58", trips: 7852 },
  { rho: 0.05, seed: 3, steps: 400, digest: "0f25a334", trips: 1535 },
  { rho: 0.05, seed: 3, steps: 2000, digest: "de01a480", trips: 7848 },
  { rho: 0.05, seed: 7, steps: 400, digest: "3796f3a4", trips: 1536 },
  { rho: 0.05, seed: 7, steps: 2000, digest: "6b988f50", trips: 7833 },
  { rho: 0.12, seed: 1, steps: 400, digest: "19431e08", trips: 1499 },
  { rho: 0.12, seed: 1, steps: 2000, digest: "77df1770", trips: 7598 },
  { rho: 0.12, seed: 2, steps: 400, digest: "498c84d4", trips: 1496 },
  { rho: 0.12, seed: 2, steps: 2000, digest: "f17ea8fc", trips: 7589 },
  { rho: 0.12, seed: 3, steps: 400, digest: "159faa64", trips: 1495 },
  { rho: 0.12, seed: 3, steps: 2000, digest: "39b08418", trips: 7592 },
  { rho: 0.12, seed: 7, steps: 400, digest: "a4f7e02c", trips: 1501 },
  { rho: 0.12, seed: 7, steps: 2000, digest: "d1d3e0d3", trips: 7589 },
  { rho: 0.25, seed: 1, steps: 400, digest: "9b1f025e", trips: 1422 },
  { rho: 0.25, seed: 1, steps: 2000, digest: "4b9cea2b", trips: 7249 },
  { rho: 0.25, seed: 2, steps: 400, digest: "dde3bc89", trips: 1439 },
  { rho: 0.25, seed: 2, steps: 2000, digest: "ae817e22", trips: 7237 },
  { rho: 0.25, seed: 3, steps: 400, digest: "497e06c0", trips: 1438 },
  { rho: 0.25, seed: 3, steps: 2000, digest: "88b9e098", trips: 7267 },
  { rho: 0.25, seed: 7, steps: 400, digest: "5c157353", trips: 1441 },
  { rho: 0.25, seed: 7, steps: 2000, digest: "e29b3220", trips: 7270 },
  // The schedule the behaviour tests actually run: settle, open the gap, continue.
  { rho: 0, seed: 1, steps: 2000, opened: true, after: 3000, digest: "e9f8d820", trips: 19968 },
  { rho: 0.12, seed: 1, steps: 2000, opened: true, after: 3000, digest: "9ab4da28", trips: 24614 },
];

describe("the generalisation does not move the double bridge", () => {
  for (const frozen of FROZEN) {
    const name =
      `rho=${frozen.rho} seed=${frozen.seed} ${frozen.steps} steps` +
      (frozen.opened ? ` + open + ${frozen.after}` : "");
    it(name, () => {
      const colony = engine.createColony(DOUBLE_BRIDGE, {
        rho: frozen.rho,
        seed: frozen.seed,
        tripHistory: Infinity,
      });
      for (let i = 0; i < frozen.steps; i += 1) engine.step(colony);
      if (frozen.opened) {
        engine.toggleShortcut(colony);
        for (let i = 0; i < (frozen.after ?? 0); i += 1) engine.step(colony);
      }
      expect(colony.tripsCompleted, "trip count moved").toBe(frozen.trips);
      expect(engine.digest(colony), "the bridge is no longer bit-identical").toBe(
        frozen.digest,
      );
    });
  }
});
