// PARKED (Decision 19). The page ran the double bridge when this was written;
// it now runs the field, where no threshold has been derived and so no regime
// has been measured. Labelling the field's slider from the bridge's bands would
// be a wrong label, and the ruling was: no label rather than a wrong one. The
// page speaks the number instead.
//
// It stays because the bands below ARE measured — on the bridge — and the derive
// turn will need exactly this shape for the field. Nothing imports it today.
//
// What the slider's position means, in words a visitor can act on.
//
// The slider's `aria-valuetext` says "0.12 — switching", not "0.12". A bare
// number is the one thing a screen-reader user cannot see the consequence of:
// sighted visitors watch the trail move and infer the regime, and this is the
// same information by another route.
//
// The three bands are MEASURED, not chosen for a nice story —
// `docs/spikes/2026-08-17-rho-fine.md`, recorded in spec/oracles.md §3 and
// PLAN.md Decision 11:
//
//   ρ ≤ 0.08   locked on the old road — 10/10 seeds never come down
//   0.10–0.12  switches — 0.12 in 10/10, median 1000 steps, no re-crossings
//   ρ ≥ 0.16   no dominant path — plateau ≈ 1.5×, ~¼ of ants on the short branch
//
// The gaps (0.09, and 0.13–0.15) were not measured, so the boundaries here sit
// at the edges of what was: below 0.09 is known-locked, 0.16 and above is
// known-unsettled, and everything between is called switching. Naming an
// unmeasured point precisely would be inventing evidence.

export type Regime = "locked" | "switching" | "never settles";

export function regimeOf(rho: number): Regime {
  if (rho < 0.09) return "locked";
  if (rho < 0.16) return "switching";
  return "never settles";
}

/** What `aria-valuetext` announces: the number, then what it does. */
export function regimeText(rho: number): string {
  return `${rho.toFixed(2)} — ${regimeOf(rho)}`;
}
