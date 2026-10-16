import { describe, it, expect, vi } from 'vitest';

// The worlds import 3D helper libraries at load time; their components are not needed to check the maps.
vi.mock('@react-three/fiber', () => ({ useFrame: () => {}, useThree: () => ({}), Canvas: () => null }));
vi.mock('@react-three/drei', () => ({ Html: () => null, Sparkles: () => null, Stars: () => null }));

import { WORLD_DEFS } from '../world3d/worlds';
import { SECRET_MAPS } from '../world3d/secretMaps';
import { WORLDS } from '../data/worlds';
import { ROAD_CORRIDOR, buildGems, buildStations, constrainToRoad, makePath, pointAt, project } from '../world3d/path';
import type { PathInfo } from '../world3d/path';
import { clampToDeck, onDeck, stepVertical, surfaceY } from '../world3d/surface';
import { deriveSignals } from '../world3d/signals';
import type { WorldDef } from '../world3d/types';

const signals = deriveSignals(null, 0, 1);

function challengesFor(id: number) {
  if (id < 100) {
    const w = WORLDS.find((x) => x.id === id);
    return (w?.challenges ?? []).map((c) => ({ id: c.id, isBoss: c.isBoss, bossName: c.bossName }));
  }
  const m = SECRET_MAPS.find((x) => x.id === id);
  return m ? [{ id: m.challengeId, isBoss: true, bossName: m.guardian }] : [];
}

/** Walk the route the way the hero does (same collision, road corridor, barrier, deck and gravity rules). */
function walk(def: WorldDef, path: PathInfo, limitS: number) {
  let x = def.spawn[0];
  let z = def.spawn[1];
  const vs = { y: surfaceY(def, x, z, 99, signals), vy: 0, air: false };
  const goal = Math.min(limitS, path.total);
  let stuck = 0;
  let deckSteps = 0;
  let maxDrop = 0;
  for (let n = 0; n < 6000; n++) {
    const here = project(path, x, z);
    if (here.s >= goal - 0.7) return { reachedS: here.s, stuck: false, deckSteps, maxDrop };
    const [tx, tz] = pointAt(path, Math.min(here.s + 3.5, goal));
    const ex = tx - x;
    const ez = tz - z;
    const len = Math.hypot(ex, ez) || 1;
    const step = 9 / 60;
    const solve = (nx: number, nz: number): [number, number] | null => {
      const r = Math.hypot(nx, nz);
      if (r > def.radius) { nx *= def.radius / r; nz *= def.radius / r; }
      for (const [ox, oz, or] of def.obstacles) {
        const a = nx - ox;
        const b = nz - oz;
        const d = Math.hypot(a, b);
        if (d < or + 0.45 && d > 1e-4) { nx = ox + (a / d) * (or + 0.45); nz = oz + (b / d) * (or + 0.45); }
      }
      const road = constrainToRoad(path, nx, nz, here.s, limitS);
      if (!road.ok) return null;
      const rail = clampToDeck(def.bridges, road.x, road.z, vs.y, signals);
      if (def.walkable && !def.walkable(rail[0], rail[1], signals)) return null;
      return [rail[0], rail[1]];
    };
    const sx = x + (ex / len) * step;
    const sz = z + (ez / len) * step;
    const moved = solve(sx, sz) ?? solve(sx, z) ?? solve(x, sz);
    if (moved) { x = moved[0]; z = moved[1]; stuck = 0; } else stuck++;
    const before = vs.y;
    stepVertical(vs, surfaceY(def, x, z, vs.y, signals), 1 / 60, false);
    maxDrop = Math.max(maxDrop, before - vs.y);
    if ((def.bridges ?? []).length > 0 && onDeck(def, x, z, vs.y, signals)) deckSteps++;
    if (stuck > 90) return { reachedS: here.s, stuck: true, deckSteps, maxDrop };
  }
  return { reachedS: project(path, x, z).s, stuck: true, deckSteps, maxDrop };
}

describe('every map is playable', () => {
  const ids = Object.keys(WORLD_DEFS).map(Number);

  it('there are 8 worlds and 4 secret maps', () => {
    expect(ids.filter((i) => i < 100)).toHaveLength(8);
    expect(ids.filter((i) => i >= 100)).toHaveLength(4);
  });

  for (const id of ids) {
    const def = WORLD_DEFS[id];
    const path = makePath(def.path);
    const stations = buildStations(def, path, challengesFor(id));

    it(`map ${id}: monsters, boss and gems stand on valid ground`, () => {
      const blocked = (x: number, z: number, pad: number) => def.obstacles.some(([ox, oz, or]) => Math.hypot(x - ox, z - oz) < or + pad);
      expect(stations.length).toBeGreaterThan(0);
      expect(stations[stations.length - 1].isBoss).toBe(true);
      for (const s of stations.filter((st) => !st.isBoss)) {
        expect(blocked(s.pos[0], s.pos[1], 0.9)).toBe(false);
        expect(def.walkable ? def.walkable(s.pos[0], s.pos[1], signals) : true).toBe(true);
      }
      const boss = stations[stations.length - 1];
      const end = def.path[def.path.length - 1];
      const d = Math.hypot(boss.pos[0] - end[0], boss.pos[1] - end[1]);
      expect(d).toBeLessThanOrEqual(boss.engage); // the road ends close enough to start the boss fight
      expect(d).toBeGreaterThan(3); // but not inside the boss
      for (const g of buildGems(def, path, stations)) {
        expect(blocked(g.pos[0], g.pos[1], 0.5)).toBe(false);
        expect(def.walkable ? def.walkable(g.pos[0], g.pos[1], signals) : true).toBe(true);
        expect(project(path, g.pos[0], g.pos[1]).dist).toBeLessThanOrEqual(ROAD_CORRIDOR);
      }
    });

    it(`map ${id}: the hero can walk the whole route once the monsters are defeated`, () => {
      const r = walk(def, path, Infinity);
      expect(r.stuck).toBe(false);
      expect(r.reachedS).toBeGreaterThan(path.total - 1);
      expect(r.maxDrop).toBeLessThan(0.9); // no cliff-edge falls along the way
      if ((def.bridges ?? []).length > 0 && id !== 4) expect(r.deckSteps).toBeGreaterThan(0); // actually stands on bridges
    });

    it(`map ${id}: each living monster stops the hero before it`, () => {
      for (const s of stations.filter((st) => !st.isBoss)) {
        const limit = s.s - 2.4;
        const r = walk(def, path, limit);
        expect(r.stuck).toBe(false);
        expect(r.reachedS).toBeLessThanOrEqual(limit + 0.8);
      }
    });
  }
});
