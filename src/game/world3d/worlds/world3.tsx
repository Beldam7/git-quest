import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Box, Cn, Cyl, Fx, Glow, Rocks, Scatter, Trees, Water, Sph, line, scatter, useSmooth } from '../kit';
import { bump, fbm, flatten, smoothstep } from '../noise';
import type { Circle, SceneProps, WorldDef } from '../types';

/** WORLD 3: THE BRANCHING FOREST. Three glowing trails fork and rejoin; the one matching the checked-out branch lights up. */

const FORK: [number, number] = [0, 8];
const JOIN: [number, number] = [0, -26];
/** Control points (x,z) for each route between the fork and the rejoin clearing. */
const ROUTES: Array<Array<[number, number]>> = [
  [[0, 8], [0, -2], [0, -14], [0, -26]],
  [[0, 8], [-9, 2], [-16, -10], [-8, -20], [0, -26]],
  [[0, 8], [9, 2], [17, -8], [9, -21], [0, -26]],
];
const ROUTE_COLORS = ['#fbbf24', '#34d399', '#a78bfa'];

const routeDist = (x: number, z: number): number => {
  let best = 99;
  for (const pts of ROUTES) for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
};

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = (fbm(x * 0.05 + 9, z * 0.05 + 2) - 0.45) * 7;
  y += bump(x, z, -28, -8, 14, 4) + bump(x, z, 30, 6, 12, 3.2);
  y = flatten(y, x, z, JOIN[0], JOIN[1], 7, 13, 0.8);
  y = flatten(y, x, z, 0, 30, 6, 12, 0.5);
  y -= 1.9 * Math.exp(-((x - 26) ** 2) / (2 * 2 * 2)) * smoothstep(-30, -10, z); // stream
  y -= 1.5 * Math.exp(-((x + 24) ** 2) / (2 * 2 * 2)) * smoothstep(34, 14, z);
  y += smoothstep(40, 74, r) * 22 * (0.5 + fbm(x * 0.04, z * 0.04));
  return y;
};

const offRoute = (x: number, z: number, y: number) => y < -0.1 || routeDist(x, z) < 2.6 || Math.hypot(x - JOIN[0], z - JOIN[1]) < 10 || Math.hypot(x, z - 30) < 4;
const PINES = scatter(31, 90, { rMin: 6, rMax: 46, h: heightAt, sMin: 0.9, sMax: 1.7, reject: offRoute });
const OAKS = scatter(32, 80, { rMin: 6, rMax: 44, h: heightAt, sMin: 0.9, sMax: 1.5, reject: offRoute });
const SHROOMS = scatter(33, 40, { rMax: 40, h: heightAt, sMin: 0.5, sMax: 1.1, reject: offRoute });
const ROCKS = scatter(34, 24, { rMax: 44, h: heightAt, sMin: 0.6, sMax: 1.4, reject: offRoute });
const FERNS = scatter(35, 120, { rMax: 40, h: heightAt, sMin: 0.6, sMax: 1.2, reject: offRoute });

const obstacles: Circle[] = [
  [JOIN[0], JOIN[1] - 4, 3.6],
  ...PINES.map((t): Circle => [t.x, t.z, 0.6 * (t.s ?? 1)]),
  ...OAKS.map((t): Circle => [t.x, t.z, 0.7 * (t.s ?? 1)]),
  ...ROCKS.map((t): Circle => [t.x, t.z, 0.9 * (t.s ?? 1)]),
];

function Trail({ index, active, name }: { index: number; active: boolean; name?: string }) {
  const lvl = useSmooth(active ? 1 : 0.12, 2);
  const geo = useMemo(() => {
    const pts = ROUTES[index].map(([x, z]) => new THREE.Vector3(x, heightAt(x, z) + 0.2, z));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const dense = curve.getPoints(60).map((p) => new THREE.Vector3(p.x, heightAt(p.x, p.z) + 0.2, p.z));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(dense), 120, 0.16, 6, false);
  }, [index]);
  const color = ROUTE_COLORS[index];
  const first = ROUTES[index][1];
  return (
    <group>
      <Glow level={lvl} min={0.15} max={2.4} color={color}><primitive object={geo} attach="geometry" /></Glow>
      {name && (
        <Html center position={[first[0] * 0.6, heightAt(first[0], first[1]) + 3.2, first[1] * 0.6 + 4]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-full border px-3 py-1 text-sm" style={{ borderColor: color, background: 'rgba(10,19,39,0.85)', color: active ? color : '#9fb0cf' }}>
            {active ? '▶ ' : ''}{name}
          </div>
        </Html>
      )}
    </group>
  );
}

function Guardian() {
  const [x, z] = JOIN;
  return (
    <group position={[x, heightAt(x, z), z - 4]}>
      {/* Arena ring of standing stones around the ancient tree */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <Box key={i} a={[0.9, 2.2 + (i % 3) * 0.5, 0.7]} p={[Math.cos(a) * 9, 1.1, Math.sin(a) * 9]} r={[0, -a, 0]} c="#7a776d" />;
      })}
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const branchIdx = Math.max(0, signals.branchNames.indexOf(signals.currentBranch)) % 3;
  const bridgeY = heightAt(26, -12) + 0.7;
  return (
    <>
      <Water y={-0.55} color="#2a8f8a" opacity={0.7} />
      <Trees items={PINES} kind="pine" trunk="#4a3220" leaf="#1f6b3a" leaf2="#2b8548" />
      <Trees items={OAKS} kind="round" trunk="#5b3b24" leaf="#3f9a4a" leaf2="#58b35e" />
      <Trees items={SHROOMS} kind="mushroom" leaf="#14b8a6" glowColor="#2dd4bf" />
      <Rocks items={ROCKS} color="#78808a" moss="#4a7a3a" />
      <Scatter items={FERNS} lift={0.35}><coneGeometry args={[0.5, 0.8, 5]} /><meshStandardMaterial color="#2e8b4d" flatShading /></Scatter>
      <Scatter items={line(0, 28, 0, 9, 2.2, heightAt, 0.3, 7, 0.06)}><boxGeometry args={[1.5, 0.12, 1.2]} /><meshStandardMaterial color="#8d8a80" flatShading /></Scatter>

      {ROUTES.map((_, i) => <Trail key={i} index={i} active={i === branchIdx} name={signals.branchNames[i]} />)}
      {/* Fork signpost */}
      <group position={[FORK[0], heightAt(FORK[0], FORK[1]), FORK[1] + 3]}>
        <Cyl a={[0.1, 0.12, 2.8, 6]} p={[0, 1.4, 0]} c="#4a2f1a" />
        <Box a={[1.4, 0.35, 0.08]} p={[0.5, 2.5, 0]} c="#7a5a35" r={[0, 0, 0.1]} />
        <Box a={[1.4, 0.35, 0.08]} p={[-0.5, 2.0, 0]} c="#7a5a35" r={[0, 0, -0.1]} />
      </group>

      {/* Natural bridge: a fallen log over the stream */}
      <Cyl a={[0.55, 0.65, 9, 8]} p={[26, bridgeY, -12]} r={[0, 0, Math.PI / 2]} c="#5b3b24" />

      {/* Ancient tree clearing */}
      <Guardian />
      <Cyl a={[1.8, 2.4, 7, 10]} p={[JOIN[0] + 11, heightAt(JOIN[0] + 11, JOIN[1]) + 3.5, JOIN[1] + 2]} c="#5a3d27" />
      <Sph a={[4, 10, 8]} p={[JOIN[0] + 11, heightAt(JOIN[0] + 11, JOIN[1]) + 9, JOIN[1] + 2]} c="#2f8a4a" />
      <Cn a={[1, 2, 6]} p={[-30, heightAt(-30, -8) + 1, -8]} c="#6b4528" />

      <Fx p={[0, 3, -6]} area={[70, 7, 70]} count={80} color="#ffe28a" size={4} reduced={reduced} coarse={coarse} />
      <Fx p={[0, 5, 0]} area={[60, 10, 60]} count={30} color="#7df9d0" size={3} reduced={reduced} coarse={coarse} opacity={0.5} />
    </>
  );
}

export const WORLD3: WorldDef = {
  id: 3,
  theme: {
    skyTop: '#2a7a6a', skyBottom: '#d9efc6', fog: '#bfe2b4', fogNear: 25, fogFar: 105,
    hemiSky: '#e8ffd6', hemiGround: '#2d5a34', hemiIntensity: 0.85, sun: '#ffe9a8', sunIntensity: 1.5, sunPosition: [24, 38, 10],
  },
  terrain: { size: 170, segments: 130, palette: { low: '#2f7a3f', mid: '#3e9a4c', high: '#5f8f58', cliff: '#6b6f66', lowY: -1, highY: 12, cliffSlope: 0.3 } },
  radius: 44, spawn: [0, 32], heightAt, obstacles,
  boss: { position: [0, -30], facing: 0 }, Scene,
};
