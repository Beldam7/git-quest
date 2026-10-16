import { describe, it, expect } from 'vitest';
import { makePath, pointAt, project, buildStations, buildGems, gemCount, smoothPath, roadProfile, constrainToRoad } from '../world3d/path';
import type { WorldDef } from '../world3d/types';
import { deriveSignals } from '../world3d/signals';
import { createInitialRepoState, executeCommand } from '../simulator/GitSimulator';
import { SECRET_MAPS, secretMapForChallenge } from '../world3d/secretMaps';
import { secretMissions } from '../data/worlds';

const fakeDef = { id: 3, boss: { position: [20, 30] as [number, number], facing: 0 } } as unknown as WorldDef;

describe('path math', () => {
  const path = makePath([[0, 0], [0, 10], [10, 10]]);
  it('measures total length and finds points by arc length', () => {
    expect(path.total).toBe(20);
    expect(pointAt(path, 5)).toEqual([0, 5]);
    expect(pointAt(path, 15)).toEqual([5, 10]);
    expect(pointAt(path, 999)).toEqual([10, 10]);
  });
  it('projects a point onto the nearest part of the path', () => {
    const p = project(path, 3, 5);
    expect(p.s).toBeCloseTo(5);
    expect(p.dist).toBeCloseTo(3);
  });
});

describe('encounters', () => {
  const path = makePath([[0, 0], [0, 40]]);
  const challenges = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'boss', isBoss: true, bossName: 'The Dragon' }];

  it('places one monster per question in order, with the boss waiting at the end', () => {
    const st = buildStations(fakeDef, path, challenges);
    expect(st).toHaveLength(4);
    expect(st.map((s) => s.isBoss)).toEqual([false, false, false, true]);
    expect(st[0].s).toBeLessThan(st[1].s);
    expect(st[1].s).toBeLessThan(st[2].s);
    expect(st[3].pos).toEqual([20, 30]);
    expect(st[3].name).toBe('The Dragon');
    expect(new Set(st.map((s) => s.challengeId)).size).toBe(4);
  });

  it('puts gems along the route, uniquely named, matching the HUD count', () => {
    const st = buildStations(fakeDef, path, challenges);
    const gems = buildGems(fakeDef, path, st);
    expect(gems).toHaveLength(gemCount(3));
    expect(new Set(gems.map((g) => g.id)).size).toBe(gems.length);
  });
});

describe('world signals come only from real simulator state', () => {
  it('git init changes the signals; a failed command does not', () => {
    const fresh = deriveSignals(createInitialRepoState(), 0, 5);
    expect(fresh.initialized).toBe(false);

    const failed = executeCommand(createInitialRepoState(), 'git add .'); // not a repo yet
    expect(failed.result.success).toBe(false);
    expect(deriveSignals(failed.newState, 0, 5)).toEqual(fresh);

    const init = executeCommand(createInitialRepoState(), 'git init');
    expect(deriveSignals(init.newState, 0, 5).initialized).toBe(true);
  });

  it('reports quest progress as a fraction', () => {
    expect(deriveSignals(null, 2, 4).worldProgress).toBe(0.5);
    expect(deriveSignals(null, 9, 4).worldProgress).toBe(1);
  });
});


describe('winding routes and hills', () => {
  const ctrl: Array<[number, number]> = [[0, 0], [10, 10], [-5, 20], [0, 35]];

  it('smoothPath passes through every control point and is not a straight line', () => {
    const pts = smoothPath(ctrl, 12);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[pts.length - 1]).toEqual([0, 35]);
    for (const c of ctrl) {
      const near = Math.min(...pts.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1])));
      expect(near).toBeLessThan(0.01);
    }
    expect(pts.length).toBeGreaterThan(ctrl.length * 5);
    // a straight line from start to end would have length 35; the winding route is clearly longer
    expect(makePath(pts).total).toBeGreaterThan(40);
  });

  it('roadProfile gives non-negative rolling hills that fade away from the road', () => {
    const pts = smoothPath([[0, 0], [0, 60]], 20);
    const hills = roadProfile(pts, 2, 20, 8);
    const onRoad = Array.from({ length: 61 }, (_, z) => hills(0, z));
    expect(Math.min(...onRoad)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...onRoad)).toBeGreaterThan(1.5);
    expect(Math.max(...onRoad)).toBeLessThanOrEqual(2.0001);
    expect(Math.max(...onRoad) - Math.min(...onRoad)).toBeGreaterThan(1); // it really rises and falls
    expect(hills(20, 30)).toBe(0); // far from the road
  });
});

describe('road corridor and monster barrier', () => {
  const road = makePath([[0, 0], [0, 40]]);

  it('lets the hero move along the road before the barrier', () => {
    const r = constrainToRoad(road, 1, 10, 9, 30);
    expect(r.ok).toBe(true);
    expect(r.reason).toBeNull();
  });

  it('pulls the hero back when they try to leave the road corridor', () => {
    const r = constrainToRoad(road, 20, 10, 10, 30, 6);
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('edge');
    expect(r.x).toBeCloseTo(6);
  });

  it('refuses to let the hero walk past a living monster', () => {
    const r = constrainToRoad(road, 0, 31, 29, 30);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('monster');
  });

  it('cannot go around the monster by sidestepping off the road', () => {
    const r = constrainToRoad(road, 25, 33, 29, 30, 6);
    expect(r.ok).toBe(false); // clamped back onto the road, which is still past the barrier
  });

  it('still allows moving backward or sideways at the barrier', () => {
    expect(constrainToRoad(road, 0, 28, 29, 30).ok).toBe(true);
    expect(constrainToRoad(road, 3, 29.5, 29.5, 30).ok).toBe(true);
  });

  it('has no barrier once every monster is defeated', () => {
    expect(constrainToRoad(road, 0, 39, 30, Infinity).ok).toBe(true);
  });
});


describe('secret maps', () => {
  it('each secret mission has exactly one map with a unique id', () => {
    expect(SECRET_MAPS).toHaveLength(4);
    expect(new Set(SECRET_MAPS.map((m) => m.id)).size).toBe(4);
    for (const m of SECRET_MAPS) {
      expect(secretMissions.some((c) => c.id === m.challengeId)).toBe(true);
      expect(secretMapForChallenge(m.challengeId)?.id).toBe(m.id);
    }
    expect(secretMapForChallenge('w1_boss')).toBeUndefined();
  });

  it('.gitignore rules are exposed as a world signal', () => {
    const s = deriveSignals(createInitialRepoState(), 0, 1);
    expect(s.ignoreRules).toBe(0);
  });
});
