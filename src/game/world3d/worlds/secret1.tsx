import { Box, Cn, Cyl, Fx, Glow, Lantern, Rocks, Scatter, Sph, Trees, scatter, useSmooth } from '../kit';
import { fbm, flatten, smoothstep } from '../noise';
import { distToPath, roadProfile, smoothPath } from '../path';
import type { Circle, SceneProps, WorldDef } from '../types';

/** SECRET MAP 101: THE GHOST CRYPT (mission: Ghost Commit). Lost commits drift as spirits; the crypt door opens when the reflog is consulted. */

const PATH_PTS = smoothPath([[0, 26], [-6, 18], [2, 10], [-4, 2], [3, -6], [0, -12]]);
const ROAD = roadProfile(PATH_PTS, 2.2, 24, 8);

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = (fbm(x * 0.06 + 21, z * 0.06 + 9) - 0.45) * 5;
  y += ROAD(x, z);
  y = flatten(y, x, z, 0, 26, 4, 9, 0.4);
  y = flatten(y, x, z, 0, -24, 9, 15, 1.0);
  y += smoothstep(30, 60, r) * 22 * (0.5 + fbm(x * 0.04, z * 0.04));
  return y;
};

const away = (x: number, z: number) => distToPath(PATH_PTS, x, z) < 3.4 || Math.hypot(x, z + 24) < 11 || Math.hypot(x, z - 26) < 4;
const STONES = scatter(111, 46, { rMax: 34, h: heightAt, sMin: 0.8, sMax: 1.3, reject: away });
const DEAD = scatter(112, 22, { rMin: 8, rMax: 40, h: heightAt, sMin: 0.9, sMax: 1.4, reject: away });
const ROCKS = scatter(113, 14, { rMax: 38, h: heightAt, sMin: 0.7, sMax: 1.5, reject: away });

const obstacles: Circle[] = [
  [0, -30, 6],
  ...STONES.map((t): Circle => [t.x, t.z, 0.6 * (t.s ?? 1)]),
  ...DEAD.map((t): Circle => [t.x, t.z, 0.5 * (t.s ?? 1)]),
  ...ROCKS.map((t): Circle => [t.x, t.z, 0.9 * (t.s ?? 1)]),
];

function SpiritOrb({ i, lit }: { i: number; lit: boolean }) {
  const lvl = useSmooth(lit ? 1 : 0.08, 1.4);
  const a = (i / 6) * Math.PI * 2;
  return (
    <group position={[Math.cos(a) * 11, 3 + (i % 3) * 0.9, -6 + Math.sin(a) * 11]}>
      <Glow level={lvl} min={0.15} max={2.4} color="#7df9ff"><sphereGeometry args={[0.55, 12, 10]} /></Glow>
    </group>
  );
}

function Crypt({ open }: { open: boolean }) {
  const door = useSmooth(open ? 1 : 0.08, 1.1);
  return (
    <group position={[0, heightAt(0, -30), -30]}>
      <Box a={[14, 8, 9]} p={[0, 4, 0]} c="#59647a" />
      <Box a={[15, 0.8, 10]} p={[0, 8.4, 0]} c="#47526a" />
      <Cn a={[8.5, 4.5, 4]} p={[0, 11, 0]} r={[0, Math.PI / 4, 0]} c="#3a4560" s={[1.2, 1, 0.8]} />
      {[-5, 5].map((x) => <Cyl key={x} a={[0.6, 0.7, 8, 8]} p={[x, 4, 4.8]} c="#7a869c" />)}
      <Box a={[3.4, 5, 0.4]} p={[0, 2.5, 4.6]} c="#0c1220" />
      <Glow level={door} min={0.1} max={2.2} color="#7df9ff" p={[0, 2.5, 4.85]}><boxGeometry args={[3, 4.6, 0.08]} /></Glow>
      <Box a={[10, 0.5, 3]} p={[0, 0.25, 7]} c="#6a768c" />
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  return (
    <>
      <Scatter items={STONES} lift={0.7} castShadow><boxGeometry args={[0.9, 1.4, 0.3]} /><meshStandardMaterial color="#7d8896" flatShading roughness={1} /></Scatter>
      <Scatter items={STONES} lift={1.5}><sphereGeometry args={[0.45, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#7d8896" flatShading roughness={1} /></Scatter>
      <Trees items={DEAD} kind="dead" trunk="#2d2a33" />
      <Rocks items={ROCKS} color="#5a6477" />
      <Crypt open={signals.reflogCount > 0} />
      {Array.from({ length: 6 }, (_, i) => <SpiritOrb key={i} i={i} lit={i < signals.commitCount} />)}
      {[[-4, 22], [5, 14], [-6, 6], [4, -2]].map(([x, z]) => <Lantern key={`${x}${z}`} p={[x, heightAt(x, z), z]} color="#7df9ff" />)}
      <Sph a={[7, 18, 14]} p={[-50, 60, -90]} c="#eaf3ff" e="#b9d4ff" ei={1.2} shadow={false} />
      <Fx p={[0, 3, 0]} area={[70, 6, 70]} count={110} color="#bcd8ff" size={6} speed={0.15} reduced={reduced} coarse={coarse} opacity={0.45} />
    </>
  );
}

export const SECRET1: WorldDef = {
  id: 101,
  theme: {
    skyTop: '#04070f', skyBottom: '#17314e', fog: '#17314e', fogNear: 18, fogFar: 95,
    hemiSky: '#8fb4ff', hemiGround: '#243044', hemiIntensity: 0.7, sun: '#b9d4ff', sunIntensity: 0.85, sunPosition: [-30, 40, -20], stars: 900,
  },
  terrain: { size: 130, segments: 100, palette: { low: '#2d3a4d', mid: '#3a4a60', high: '#566a82', cliff: '#222c3c', lowY: -2, highY: 9, cliffSlope: 0.3 } },
  radius: 30, spawn: PATH_PTS[0], path: PATH_PTS, bossEngage: 18, heightAt, obstacles,
  boss: { position: [0, -20], facing: 0 }, Scene,
};
