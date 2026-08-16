# Screenshots

Taken with **`pnpm shot`**, which drives a Linux Chromium and verifies the layout
width before it trusts a PNG. Not with `chrome.exe` — that clamps the viewport to
526 CSS px and crops, which produced a "broken phone layout" here that was not
broken at all. See "Facts about this repo that bite" in `CLAUDE.md`.

## Slice 3 — the page

Both marking viewports, layout width verified:

- [1920×1080](./2026-08-17-page-1920.png)
- [390×844](./2026-08-17-page-390.png)

The wall is shut in both: the colony is locked on the long way, the short branch
is drawn dim and empty, and the tap target sits on the barrier. That is beat 2
with no prose on the page at all.

### The direction that was turned down

Two visual directions were built, identical but for the ink; **dark was chosen**
(Decision 13). The light one stays here because what was turned down is part of
the record.

- [light canvas, 1920×1080](./2026-08-17-page-1920-light.png)

## Slice 2 — the dev sensor

Not the page — `scripts/dev-canvas.html`, which never ships.

- [dev canvas, primed `?settle=2000&after=3000`](./2026-08-17-dev-canvas.png) —
  the engine at ρ = 0.12, 3000 steps after the shortcut opened: the short branch
  is now the bright trail and the long one has faded.
