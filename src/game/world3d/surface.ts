import type { BridgeSpec, WorldDef, WorldSignals } from './types';

/** Vertical motion and walkable surfaces: bridge decks, rails and jumping. Pure functions, no 3D imports. */

export const JUMP_VELOCITY = 9.5;
export const GRAVITY = 28;

type SurfaceDef = Pick<WorldDef, 'heightAt' | 'groundAt' | 'bridges'>;

function along(b: BridgeSpec, x: number, z: number) {
  const dx = b.b[0] - b.a[0];
  const dz = b.b[1] - b.a[1];
  const len2 = dx * dx + dz * dz || 1;
  const t = ((x - b.a[0]) * dx + (z - b.a[1]) * dz) / len2;
  const cx = b.a[0] + dx * t;
  const cz = b.a[1] + dz * t;
  return { t, cx, cz, lat: Math.hypot(x - cx, z - cz) };
}

/** Height of the walkable deck at (x, z), or null when there is no deck there (off the sides, past the ends, or in a gap). */
export function deckAt(b: BridgeSpec, x: number, z: number, s: WorldSignals): number | null {
  const { t, lat } = along(b, x, z);
  if (t < 0 || t > 1 || lat > b.width / 2 + 0.2) return null;
  const gap = b.gap?.(s) ?? 0;
  if (gap > 0 && Math.abs(t - 0.5) < gap / 2) return null;
  return b.y + 0.08;
}

/**
 * The surface the hero stands on. A deck counts only if the hero is at or just below its level (so you can step
 * up onto it, but wade *under* a bridge if you are down in the water).
 */
export function surfaceY(def: SurfaceDef, x: number, z: number, y: number, s: WorldSignals): number {
  let g = def.groundAt ? def.groundAt(x, z, s) : def.heightAt(x, z);
  for (const br of def.bridges ?? []) {
    const d = deckAt(br, x, z, s);
    if (d !== null && y >= d - 0.7) g = Math.max(g, d);
  }
  return g;
}

export function onDeck(def: SurfaceDef, x: number, z: number, y: number, s: WorldSignals): boolean {
  return (def.bridges ?? []).some((br) => {
    const d = deckAt(br, x, z, s);
    return d !== null && y >= d - 0.4 && y <= d + 0.4;
  });
}

/** Side rails: while on a bridge deck the hero cannot step off the sides (the ends stay open). */
export function clampToDeck(bridges: BridgeSpec[] | undefined, x: number, z: number, y: number, _s: WorldSignals): [number, number] {
  let nx = x;
  let nz = z;
  for (const br of bridges ?? []) {
    const { t, cx, cz, lat } = along(br, nx, nz);
    if (t < 0 || t > 1) continue;
    if (y < br.y + 0.08 - 0.3) continue; // below the deck: not on it
    const half = br.width / 2 - 0.15;
    if (lat > half && lat < br.width / 2 + 0.6) {
      const k = half / lat;
      nx = cx + (nx - cx) * k;
      nz = cz + (nz - cz) * k;
    }
  }
  return [nx, nz];
}

export interface VState {
  y: number;
  vy: number;
  air: boolean;
}

/**
 * One step of the hero's vertical motion. Grounded: glue to the surface (or start falling if it drops away).
 * Airborne: gravity until the surface is reached again. Mutates `s`.
 */
export function stepVertical(s: VState, ground: number, dt: number, jump: boolean): { jumped: boolean; landed: boolean } {
  let jumped = false;
  let landed = false;
  if (!s.air) {
    if (jump) {
      s.vy = JUMP_VELOCITY;
      s.air = true;
      jumped = true;
    } else if (ground < s.y - 0.6) {
      s.air = true; // walked off a ledge
      s.vy = 0;
    } else {
      s.y += (ground - s.y) * Math.min(1, dt * 14);
    }
  }
  if (s.air) {
    s.vy -= GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y <= ground && s.vy <= 0) {
      s.y = ground;
      s.vy = 0;
      s.air = false;
      landed = !jumped;
    }
  }
  return { jumped, landed };
}
