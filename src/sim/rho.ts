// The forgetting rates a threshold can be derived at, or a test exercised at —
// one place, so the two cannot drift apart the way the SWITCHED test's stale
// ρ = 0.05 (predating Decision 11) and the UNSTABLE test's forbidden ρ = 1 did.
//
// Not an engine constant (src/sim/params.ts): the UI slider imports this too,
// so RHO.default is also the control's default position, not just a test
// fixture. Decision 11 fixes the slider's default at 0.12 and rules out ever
// measuring behaviour (4) at ρ = 1, "which is off the control" — scripts/derive.ts
// derived EMERGED/SWITCHED/M at RHO.default and UNSTABLE/K at RHO.max for exactly
// that reason.
export const RHO = { locked: 0, default: 0.12, max: 0.25 } as const;
