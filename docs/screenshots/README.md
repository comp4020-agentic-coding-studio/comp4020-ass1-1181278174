# Screenshots

Taken with **`pnpm shot`**, which drives a Linux Chromium and verifies the layout
width with `--dump-dom` before it trusts a PNG. Not with `chrome.exe` — that
clamps the viewport to 526 CSS px and crops, which produced a "broken phone
layout" here that was not broken at all. See "Facts about this repo that bite" in
`CLAUDE.md`.

The primed states below are reached with the page's `?steps=&open&after=&rho=`
prime. Every one is a state the controls produce by hand; a still cannot tap, and
without it no screenshot could evidence the trace tick at all.

## Slice 4 — controls, keyboard, reduced motion

### At load — the wall is shut (beats 1–2)

The colony is on the only road there is, the barrier is drawn across the short
route, and the trace is flat because nothing has happened yet (Decision 14).

- [1920×1080](./2026-08-17-page-1920.png) · [390×844](./2026-08-17-page-390.png)

### After the tap, forgetting at the default 0.12 (beat 4)

The tick lands on the strip labelled "shortcut opened", the reading jumps to 2.0×
against the new 4-move shortest, and then comes down as the colony switches — the
short branch is now the bright trail and the long way has faded.

- [1920×1080](./2026-08-17-page-1920-opened.png) · [390×844](./2026-08-17-page-390-opened.png)

### After the tap, forgetting at 0.00 (beat 3 — the discriminating one)

Same tap, slider at "never forget". The jump happens and **nothing comes down**:
2.00×, the shortcut open in plain sight and completely empty. This is the picture
the whole argument rests on.

- [1920×1080](./2026-08-17-page-1920-locked.png) · [390×844](./2026-08-17-page-390-locked.png)

## Slice 3 — the direction that was turned down

Two visual directions were built, identical but for the ink; **dark was chosen**
(Decision 13). The light one stays because what was turned down is part of the
record.

- [light canvas, 1920×1080](./2026-08-17-page-1920-light.png)

## Slice 2 — the dev sensor

Not the page — `scripts/dev-canvas.html`, which never ships.

- [dev canvas](./2026-08-17-dev-canvas.png) — the engine at ρ = 0.12, 3000 steps
  after the shortcut opened.
