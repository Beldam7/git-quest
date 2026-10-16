/** Deterministic noise and math helpers used to shape terrain and scatter scenery. */

export function hash2(ix: number, iz: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

export function vnoise(x: number, z: number): number {
  const ix = Math.floor(x);
  const iz = Math.floor(z);
  const fx = x - ix;
  const fz = z - iz;
  const u = fx * fx * (3 - 2 * fx);
  const v = fz * fz * (3 - 2 * fz);
  const a = hash2(ix, iz);
  const b = hash2(ix + 1, iz);
  const c = hash2(ix, iz + 1);
  const d = hash2(ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

export function fbm(x: number, z: number, octaves = 4): number {
  let sum = 0;
  let amp = 0.5;
  let f = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * vnoise(x * f, z * f);
    f *= 2;
    amp *= 0.5;
  }
  return sum;
}

/** 0 below a, 1 above b (a may be greater than b for a reversed ramp). */
export function smoothstep(a: number, b: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth round hill: height `hgt` at the center, 0 at distance `r`. */
export function bump(x: number, z: number, cx: number, cz: number, r: number, hgt: number): number {
  const d2 = ((x - cx) ** 2 + (z - cz) ** 2) / (r * r);
  return d2 >= 1 ? 0 : hgt * (1 - d2) ** 2;
}

/** Blend height y toward `level` inside radius r0, leaving it untouched beyond r1. */
export function flatten(y: number, x: number, z: number, cx: number, cz: number, r0: number, r1: number, level: number): number {
  const d = Math.hypot(x - cx, z - cz);
  return lerp(y, level, smoothstep(r1, r0, d));
}

/** Small seeded random generator. */
export function rng(seed: number): () => number {
  let s = (seed >>> 0) || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
