import { Html } from '@react-three/drei';
import { Box, Cn, Cyl, Fx, Glow, Scatter, Trees, scatter, useSmooth } from '../kit';
import type { Item } from '../kit';
import { fbm, flatten, smoothstep } from '../noise';
import { distToPath, makePath, pointAt, roadProfile, smoothPath } from '../path';
import type { Circle, SceneProps, WorldDef } from '../types';

/** SECRET MAP 102: THE WARDED GROVE (mission: Silent Guardian). Wards light up as files are added to .gitignore. */

const PATH_PTS = smoothPath([[0, 26], [7, 19], [-3, 12], [4, 4], [-2, -4], [0, -10]]);
const ROAD = roadProfile(PATH_PTS, 2.0, 22, 8);

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = (fbm(x * 0.06 + 33, z * 0.06 + 4) - 0.45) * 5;
  y += ROAD(x, z);
  y = flatten(y, x, z, 0, 26, 4, 9, 0.5);
  y = flatten(y, x, z, 0, -22, 8, 14, 0.9);
  y += smoothstep(30, 60, r) * 20 * (0.5 + fbm(x * 0.04, z * 0.04));
  return y;
};

const away = (x: number, z: number) => distToPath(PATH_PTS, x, z) < 7 || Math.hypot(x, z + 22) < 12;
const PINES = scatter(121, 70, { rMin: 6, rMax: 38, h: heightAt, sMin: 1, sMax: 1.7, reject: away });

// Hedge walls line both edges of the road, so the winding path reads like a garden maze.
const HEDGES: Item[] = (() => {
  const road = makePath(PATH_PTS);
  const out: Item[] = [];
  for (let s = 2; s < road.total - 2; s += 3.2) {
    const [x, z] = pointAt(road, s);
    const [bx, bz] = pointAt(road, s + 1);
    const [ax, az] = pointAt(road, s - 1);
    const tx = bx - ax, tz = bz - az;
    const len = Math.hypot(tx, tz) || 1;
    const nx = -tz / len, nz = tx / len;
    for (const side of [-1, 1]) out.push({ x: x + nx * 5.6 * side, y: heightAt(x + nx * 5.6 * side, z + nz * 5.6 * side), z: z + nz * 5.6 * side, ry: Math.atan2(tx, tz), s: 1 });
  }
  return out;
})();

const FILES = [{ name: '.env', at: [-5.5, 16] as [number, number] }, { name: 'config.json', at: [6, 8] as [number, number] }, { name: 'debug.log', at: [-5, 0] as [number, number] }];

const obstacles: Circle[] = [
  ...PINES.map((t): Circle => [t.x, t.z, 0.6 * (t.s ?? 1)]),
  ...HEDGES.map((h): Circle => [h.x, h.z, 1.5]),
];

function Ward({ i, lit }: { i: number; lit: boolean }) {
  const lvl = useSmooth(lit ? 1 : 0.06, 1.4);
  const a = (i / 6) * Math.PI * 2;
  const x = Math.cos(a) * 9;
  const z = -22 + Math.sin(a) * 9;
  return (
    <group position={[x, heightAt(x, z), z]} rotation={[0, Math.atan2(-x, -(z + 22)), 0]}>
      <Box a={[1.2, 3.6, 0.8]} p={[0, 1.8, 0]} c="#6b7a74" />
      <Glow level={lvl} min={0.05} max={2.2} color="#34d399" p={[0, 2, 0.43]}><boxGeometry args={[0.5, 1.6, 0.05]} /></Glow>
    </group>
  );
}

function SecretFile({ name, at, hidden }: { name: string; at: [number, number]; hidden: boolean }) {
  const lvl = useSmooth(hidden ? 1 : 0, 1.6);
  const y = heightAt(at[0], at[1]);
  return (
    <group position={[at[0], y, at[1]]}>
      <Box a={[1.2, 1.2, 1.2]} p={[0, 0.8, 0]} c="#3a2f3f" r={[0, 0.5, 0]} />
      <Glow level={lvl} min={0.3} max={1.6} color={hidden ? '#34d399' : '#ff5a5a'} p={[0, 1.6, 0]}><octahedronGeometry args={[0.35, 0]} /></Glow>
      <Html center position={[0, 3, 0]} distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div className={`whitespace-nowrap rounded-full border px-3 py-1 text-sm ${hidden ? 'border-emerald-400 text-emerald-300' : 'border-red-400 text-red-300'} bg-kq-deep/90`}>{name}: {hidden ? 'ignored' : 'exposed'}</div>
      </Html>
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  return (
    <>
      <Trees items={PINES} kind="pine" trunk="#3b2f2a" leaf="#1c5a46" leaf2="#25705a" />
      <Scatter items={HEDGES} lift={1.1} castShadow><boxGeometry args={[3.4, 2.2, 1.3]} /><meshStandardMaterial color="#2a6b4a" flatShading roughness={1} /></Scatter>
      {FILES.map((f, i) => <SecretFile key={f.name} name={f.name} at={f.at} hidden={signals.ignoredCount > i} />)}
      {Array.from({ length: 6 }, (_, i) => <Ward key={i} i={i} lit={i < signals.ignoredCount * 2} />)}
      <group position={[0, heightAt(0, -22), -22]}>
        <Cyl a={[8, 8.6, 0.5, 24]} p={[0, 0.25, 0]} c="#4a5a54" />
        <Cn a={[0.7, 2.6, 6]} p={[0, 1.8, -4]} c="#6b7a74" />
      </group>
      <Fx p={[0, 4, 0]} area={[60, 8, 60]} count={90} color="#c9ffd9" size={5} speed={0.35} reduced={reduced} coarse={coarse} opacity={0.8} />
    </>
  );
}

export const SECRET2: WorldDef = {
  id: 102,
  theme: {
    skyTop: '#060b1a', skyBottom: '#1d3a4a', fog: '#1d3a4a', fogNear: 20, fogFar: 100,
    hemiSky: '#9bd0ff', hemiGround: '#1c3a2a', hemiIntensity: 0.75, sun: '#c9d8ff', sunIntensity: 0.9, sunPosition: [25, 40, 15], stars: 1000,
  },
  terrain: { size: 130, segments: 100, palette: { low: '#1f4a36', mid: '#2a6347', high: '#3d7a5a', cliff: '#2b3a40', lowY: -2, highY: 9, cliffSlope: 0.3 } },
  radius: 30, spawn: PATH_PTS[0], path: PATH_PTS, bossEngage: 18, heightAt, obstacles,
  boss: { position: [0, -20], facing: 0 }, Scene,
};
