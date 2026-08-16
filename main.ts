// Bootstrap. Everything the page does is in src/ui/page.ts, so the branches can
// be tested rather than trusted — this file is only what a browser supplies.

import { FIELD_V5 } from "./src/fixtures/field-v5.ts";
import { prefersReducedMotion } from "./src/ui/motion.ts";
import { createPage, readPrime } from "./src/ui/page.ts";

createPage(document, {
  fixture: FIELD_V5,
  reducedMotion: prefersReducedMotion(globalThis.window),
  prime: readPrime(globalThis.location.search),
  now: () => performance.now(),
  schedule: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => cancelAnimationFrame(handle),
});
