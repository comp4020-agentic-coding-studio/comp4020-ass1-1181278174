// mulberry32, committed rather than depended on.
//
// Determinism is a contract here: same seed, same fixture, same parameter schedule
// gives a byte-identical digest. Math.random() would make the spike unrepeatable
// and every recorded distribution unfalsifiable.

/** Returns a generator of floats in [0, 1). Deterministic for a given seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
