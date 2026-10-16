import type { WorldDef } from './types';
import { smoothstep } from './noise';

/** A polyline route through a world with cumulative arc lengths. */
export interface PathInfo {
  pts: Array<[number, number]>;
  cum: number[];
  total: number;
}

export function makePath(pts: Array<[number, number]>): PathInfo {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, total: cum[cum.length - 1] };
}

/** Point at arc length s along the path (clamped). */
export function pointAt(p: PathInfo, s: number): [number, number] {
  const t = Math.max(0, Math.min(p.total, s));
  for (let i = 1; i < p.pts.length; i++) {
    if (t <= p.cum[i]) {
      const seg = p.cum[i] - p.cum[i - 1] || 1;
      const k = (t - p.cum[i - 1]) / seg;
      return [p.pts[i - 1][0] + (p.pts[i][0] - p.pts[i - 1][0]) * k, p.pts[i - 1][1] + (p.pts[i][1] - p.pts[i - 1][1]) * k];
    }
  }
  return p.pts[p.pts.length - 1];
}

/** Nearest point on the path to (x, z): its arc length and distance. */
export function project(p: PathInfo, x: number, z: number): { s: number; dist: number } {
  let best = { s: 0, dist: Infinity };
  for (let i = 1; i < p.pts.length; i++) {
    const [ax, az] = p.pts[i - 1];
    const [bx, bz] = p.pts[i];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d < best.dist) best = { s: p.cum[i - 1] + Math.sqrt(len2) * t, dist: d };
  }
  return best;
}

/** Plain distance from a point to a polyline (used by scenery placement to keep the route clear). */
export function distToPath(pts: Array<[number, number]>, x: number, z: number): number {
  return project(makePath(pts), x, z).dist;
}

export type MonsterKind = 'goblin' | 'slime' | 'skeleton' | 'shadow' | 'boss';

export interface Station {
  index: number;
  challengeId: string;
  isBoss: boolean;
  name: string;
  kind: MonsterKind;
  pos: [number, number];
  /** Arc length of the station along the path (boss stations sit past the end). */
  s: number;
  facing: number;
  /** How close the hero must be for the fight to start. */
  engage: number;
}

const NORMAL_KINDS: Array<{ kind: Exclude<MonsterKind, 'boss'>; name: string }> = [
  { kind: 'goblin', name: 'Goblin Scout' },
  { kind: 'slime', name: 'Bug Slime' },
  { kind: 'skeleton', name: 'Skeleton Guard' },
  { kind: 'shadow', name: 'Shadow Wraith' },
];

export interface ChallengeLite {
  id: string;
  isBoss?: boolean;
  bossName?: string;
}

/** One station per question: monsters spaced evenly along the route; the boss waits at the end. */
export function buildStations(def: WorldDef, path: PathInfo, challenges: ChallengeLite[], worldBossName?: string): Station[] {
  const normalCount = challenges.filter((c) => !c.isBoss).length;
  // Crowded worlds get smaller battle zones so neighbouring monsters do not overlap.
  const normalEngage = Math.min(11, Math.max(5, ((def.stationSpan ?? path.total) / (normalCount + 1)) * 0.7));
  let n = 0;
  return challenges.map((c, index) => {
    if (c.isBoss) {
      return {
        index, challengeId: c.id, isBoss: true, name: c.bossName ?? worldBossName ?? 'Boss', kind: 'boss' as const,
        pos: def.boss.position, s: path.total + 4, facing: def.boss.facing, engage: def.bossEngage ?? 16,
      };
    }
    const s = ((def.stationSpan ?? path.total) * (n + 1)) / (normalCount + 1);
    const pos = pointAt(path, s);
    const back = pointAt(path, s - 4);
    const spec = NORMAL_KINDS[(index + def.id) % NORMAL_KINDS.length];
    n++;
    return {
      index, challengeId: c.id, isBoss: false, name: spec.name, kind: spec.kind,
      pos, s, facing: Math.atan2(back[0] - pos[0], back[1] - pos[1]), engage: normalEngage,
    };
  });
}

/** Gems per world: three per leg of the route (legs = normal monsters + 1). Kept here so the HUD can count without loading 3D code. */
export const gemCount = (normalMonsters: number) => 3 * (normalMonsters + 1);

export interface Gem {
  id: string;
  pos: [number, number];
}

/** Gems scattered along the route (three per leg, alternating sides) to reward walking the whole path. */
export function buildGems(def: WorldDef, path: PathInfo, stations: Station[]): Gem[] {
  const anchors = [0, ...stations.filter((s) => !s.isBoss).map((s) => s.s), path.total];
  const out: Gem[] = [];
  let n = 0;
  for (let i = 1; i < anchors.length; i++) {
    for (let k = 1; k <= 3; k++) {
      const s = anchors[i - 1] + ((anchors[i] - anchors[i - 1]) * k) / 4;
      const [x, z] = pointAt(path, s);
      const [bx, bz] = pointAt(path, s + 1);
      const [ax, az] = pointAt(path, s - 1);
      const tx = bx - ax;
      const tz = bz - az;
      const len = Math.hypot(tx, tz) || 1;
      const side = (n % 2 === 0 ? 1 : -1) * 1.5;
      out.push({ id: `g${def.id}-${n}`, pos: [x + (-tz / len) * side, z + (tx / len) * side] });
      n++;
    }
  }
  return out;
}


/**
 * Turn a few control points into a smooth, winding route (uniform Catmull-Rom, passes through every control point).
 * `perSeg` is how many samples are generated between neighbouring control points.
 */
export function smoothPath(ctrl: Array<[number, number]>, perSeg = 12): Array<[number, number]> {
  if (ctrl.length < 3) return ctrl;
  const out: Array<[number, number]> = [];
  const at = (i: number) => ctrl[Math.max(0, Math.min(ctrl.length - 1, i))];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg;
      const t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1]);
  return out;
}

/**
 * Rolling hills that follow the route: a height offset (always >= 0, at most `amp`) that rises and falls
 * every `wavelength` units along the road and fades out `width` units to either side. Add it to a world's
 * terrain so the journey climbs and descends instead of crossing flat ground.
 */
export function roadProfile(pts: Array<[number, number]>, amp: number, wavelength: number, width: number, phase = 0) {
  const path = makePath(pts);
  return (x: number, z: number): number => {
    const p = project(path, x, z);
    if (p.dist >= width) return 0;
    return amp * (0.5 + 0.5 * Math.sin((p.s / wavelength) * Math.PI * 2 + phase)) * smoothstep(width, 0, p.dist);
  };
}

/** Half-width of the walkable road corridor. The hero cannot wander farther than this from the route. */
export const ROAD_CORRIDOR = 6;

export type BlockReason = 'edge' | 'monster' | null;

/**
 * Keep the hero on the road and behind the first living monster.
 * - Farther than `corridor` from the route: pulled back to the corridor edge.
 * - Would end up past `limitS` (arc length of the barrier) while moving forward (s > fromS): rejected.
 */
export function constrainToRoad(
  path: PathInfo, x: number, z: number, fromS: number, limitS: number, corridor = ROAD_CORRIDOR
): { ok: boolean; x: number; z: number; reason: BlockReason } {
  let nx = x;
  let nz = z;
  let edge = false;
  const pr = project(path, nx, nz);
  if (pr.dist > corridor) {
    const [cx, cz] = pointAt(path, pr.s);
    const k = corridor / pr.dist;
    nx = cx + (nx - cx) * k;
    nz = cz + (nz - cz) * k;
    edge = true;
  }
  const s = edge ? project(path, nx, nz).s : pr.s;
  if (s > limitS && s > fromS) return { ok: false, x, z, reason: 'monster' };
  return { ok: true, x: nx, z: nz, reason: edge ? 'edge' : null };
}
