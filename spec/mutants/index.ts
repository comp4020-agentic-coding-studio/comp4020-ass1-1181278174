// The six negative controls, and what each one must fail.
//
// Five are alternative policies driven by the real engine; the sixth is a separate
// engine. `mutant()` takes a properly typed `EngineModule<S>` at each call site, so
// `tsc` checks every one against the same surface the real engine satisfies, then
// erases S so the tests can iterate over them uniformly.

import type { Fixture } from "../../src/fixtures/double-bridge.ts";
import type { Colony, ColonyOptions, Policy } from "../../src/sim/engine.ts";
import * as realEngine from "../../src/sim/engine.ts";
import type { EngineModule } from "../engine-api.ts";
import * as freshness from "./freshness.ts";
import type { FreshColony } from "./freshness.ts";
import {
  ETA_KNOWS_THE_FOOD,
  ONE_PHEROMONE_MAP,
  PURE_RANDOM_WALK,
  RHO_IGNORED,
  RHO_PINNED_MAX,
} from "./policies.ts";

/** Which behaviour this control has to break, and which test is allowed to catch it. */
export type Pairing =
  | { readonly behaviour: 1 | 2 | 3 | 4 }
  | { readonly honesty: true };

export interface Mutant {
  readonly name: string;
  readonly pairing: Pairing;
  readonly why: string;
  create(fixture: Fixture, options: ColonyOptions): unknown;
  step(state: unknown): void;
  toggleShortcut(state: unknown): void;
  digest(state: unknown): string;
  antCount(state: unknown): number;
  antNodes(state: unknown): readonly string[];
  completedTripLengths(state: unknown): readonly number[];
  choiceDistribution(state: unknown, node: string): ReadonlyMap<string, number>;
}

function mutant<S>(
  name: string,
  pairing: Pairing,
  why: string,
  module: EngineModule<S>,
): Mutant {
  return {
    name,
    pairing,
    why,
    create: (fixture, options) => module.createColony(fixture, options),
    step: (state) => module.step(state as S),
    toggleShortcut: (state) => module.toggleShortcut(state as S),
    digest: (state) => module.digest(state as S),
    antCount: (state) => module.antCount(state as S),
    antNodes: (state) => module.antNodes(state as S),
    completedTripLengths: (state) => module.completedTripLengths(state as S),
    choiceDistribution: (state, node) =>
      module.choiceDistribution(state as S, node),
  };
}

/** The real engine, with one rule swapped. Every accessor is the real one. */
const withPolicy = (policy: Policy): EngineModule<Colony> => ({
  ...realEngine,
  createColony: (fixture, options) =>
    realEngine.createColony(fixture, options, policy),
});

export const MUTANTS: readonly Mutant[] = [
  mutant(
    "max-update freshness field",
    { behaviour: 2 },
    "always prefers the better value once seen (ε-greedy, ε=0.06, so it can find the shortcut at all), so it switches onto the short branch at ρ = 0 where the real engine stays locked on the long one — the control that separates 'forgetting is the mechanism' from 'shorter paths just win'",
    freshness as EngineModule<FreshColony>,
  ),
  mutant(
    ETA_KNOWS_THE_FOOD.name,
    { honesty: true },
    "reads the oracle, so it passes the path tests handsomely — only the honesty test can catch it",
    withPolicy(ETA_KNOWS_THE_FOOD),
  ),
  mutant(
    PURE_RANDOM_WALK.name,
    { behaviour: 1 },
    "no pheromone term at all, so nothing can emerge from local rules",
    withPolicy(PURE_RANDOM_WALK),
  ),
  mutant(
    RHO_IGNORED.name,
    { behaviour: 3 },
    "nothing is ever forgotten, so the colony never switches whatever the slider says",
    withPolicy(RHO_IGNORED),
  ),
  mutant(
    RHO_PINNED_MAX.name,
    { behaviour: 2 },
    "always forgets at the maximum rate, so it can never lock in even at ρ = 0",
    withPolicy(RHO_PINNED_MAX),
  ),
  mutant(
    ONE_PHEROMONE_MAP.name,
    { behaviour: 3 },
    "seekers and carriers read and write the same map, so the outbound and inbound signals conflate into one undifferentiated trail — it does not reliably switch onto the shortcut at the default rate, even though (surprisingly) it emerges a near-shortest path just fine, which is why it cannot be behaviour (1)'s control",
    withPolicy(ONE_PHEROMONE_MAP),
  ),
];
