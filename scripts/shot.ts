// Screenshots at both marking viewports: `pnpm shot`.
//
// Windows Chrome cannot do this. `chrome.exe --headless --window-size=390,844`
// lays the page out at clientWidth = 526 and crops the PNG to 390 — the file has
// the size you asked for and a layout you did not, which reads as a CSS bug and
// is not one (see CLAUDE.md, "Facts about this repo that bite"). A Linux
// Chromium has no window manager to clamp it and lays out at exactly 390.
//
// The binary is Playwright's cached `chrome-headless-shell`, with three shared
// libraries fetched unprivileged into ~/chromium-libs. Machine-local, so this
// script says so plainly rather than failing with a loader error.
//
// EVERY run verifies the viewport before it trusts a PNG: a probe page prints
// `document.documentElement.clientWidth`, and `--dump-dom` reads it back. A
// screenshot whose layout width is not the width claimed is not evidence, and
// the whole reason this file exists is that one silently was.

import { spawn } from "node:child_process";
import { globSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

const OUT = "docs/screenshots";
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;
const LIBS = join(homedir(), "chromium-libs/root/usr/lib/x86_64-linux-gnu");

const VIEWPORTS = [
  { name: "1920", width: 1920, height: 1080 },
  { name: "390", width: 390, height: 844 },
] as const;

// A still cannot tap, so the page's `?steps=&open&rho=` prime is how a screenshot
// reaches a state the visitor reaches by hand. Every one of these is a state the
// controls produce; nothing here is reachable only from a URL.
const STATES = [
  // Three moments at 300 steps/s. Primed to an exact step count, NOT left to run:
  // headless gives a page only a handful of rAF frames however long the virtual
  // time budget, so an unprimed still shows a fraction of what a real browser
  // runs in the same wall time.
  { suffix: "-4s", query: "?steps=1200" },
  { suffix: "-10s", query: "?steps=3000" },
  { suffix: "-20s", query: "?steps=6000" },
] as const;

function binary(): string {
  const found = globSync(
    join(
      homedir(),
      ".cache/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell",
    ),
  );
  const path = found[0];
  if (path === undefined) {
    throw new Error(
      "No chrome-headless-shell in ~/.cache/ms-playwright. This script needs a " +
        "LINUX Chromium — Windows Chrome clamps the viewport (CLAUDE.md).",
    );
  }
  return path;
}

const CHROME = binary();
const ENV = {
  ...process.env,
  LD_LIBRARY_PATH: `${LIBS}:${process.env.LD_LIBRARY_PATH ?? ""}`,
};

function run(args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(CHROME, args, { env: ENV });
    let out = "";
    let err = "";
    child.stdout.on("data", (chunk) => (out += String(chunk)));
    child.stderr.on("data", (chunk) => (err += String(chunk)));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else if (/lib[^\s]*\.so[^\s]*/.test(err)) {
        const missing = /lib[^\s]*\.so[^\s.]*/.exec(err)?.[0];
        reject(
          new Error(
            `${CHROME} is missing ${missing}. Fetch it unprivileged:\n` +
              `  cd ~/chromium-libs && apt-get download <package providing ${missing}>\n` +
              `  for d in *.deb; do dpkg-deb -x "$d" root/; done\n` +
              `Then re-run. See CLAUDE.md.`,
          ),
        );
      } else reject(new Error(err.trim() || `chrome exited ${code}`));
    });
  });
}

/** Prove the layout viewport really is what was asked for, before shooting it. */
async function verifyViewport(width: number, height: number): Promise<void> {
  const probe = "dist/.viewport-probe.html";
  writeFileSync(
    probe,
    `<!doctype html><html lang="en"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<title>probe</title></head><body><b id="o"></b><script>` +
      `document.getElementById('o').textContent='W='+document.documentElement.clientWidth;` +
      `</script></body></html>`,
  );
  try {
    const dom = await run([
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      `--window-size=${width},${height}`,
      "--virtual-time-budget=2000",
      "--dump-dom",
      `${BASE}/.viewport-probe.html`,
    ]);
    const measured = Number(/W=(\d+)/.exec(dom)?.[1]);
    if (measured !== width) {
      throw new Error(
        `asked for ${width} CSS px, the page laid out at ${measured}. ` +
          `A screenshot from this browser is not evidence of the ${width} viewport.`,
      );
    }
  } finally {
    rmSync(probe, { force: true });
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT, { recursive: true });
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const preview = spawn(
    "node_modules/.bin/vite",
    ["preview", "--port", String(PORT)],
    { stdio: "ignore" },
  );
  try {
    await sleep(2500);
    for (const viewport of VIEWPORTS) {
      await verifyViewport(viewport.width, viewport.height);
      for (const state of STATES) {
        const path = `${OUT}/${stamp}-page-${viewport.name}${state.suffix}.png`;
        await run([
          "--headless",
          "--no-sandbox",
          "--disable-gpu",
          "--hide-scrollbars",
          `--window-size=${viewport.width},${viewport.height}`,
          // Long enough for a trail to form: the page runs 90 steps/s and the
          // reading needs MIN_TRIPS completed trips before it is a number at all.
          "--virtual-time-budget=30000",
          `--screenshot=${path}`,
          `${BASE}/${state.query}`,
        ]);
        console.log(
          `${path}  ${viewport.width}x${viewport.height} CSS px (verified)`,
        );
      }
    }
  } finally {
    preview.kill();
  }
}

await main();
