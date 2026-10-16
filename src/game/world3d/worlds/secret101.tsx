import { Box, Cn, Cyl, Fx, Glow, Scatter, Trees, scatter, useSmooth } from '../kit';
import { bump, fbm, flatten, smoothstep } from '../noise';
import { distToPath, roadProfile, smoothPath } from '../path';
import type { Circle, SceneProps, WorldDef } from '../types';

/** SECRET MAP 101: THE WHISPERING CRYPT (Ghost Commit). Lost-commit orbs drift in the mist; the crypt door opens to what the reflog recovers. */

const PATH_PTS = smoothPath([[0, 30], [-8, 24], [6, 16], [-5, 8], [3, 0], [0, -6]]);
const ROAD = roadProfile(PATH_PTS, 2.0, 24, 8);

const heightAt = (x: number, z: number): number => {
  let y = (fbm(x * 0.06 + 21, z * 0.06 + 9) - 0.45) * 4;
  y += ROAD(x, z);
  y += bump(x, z, 0, -28, 16, 2);
  y = flatten(y, x, z, 0, 30, 4, 9, 0.4);
  y += smoothstep(34, 70, Math.hypot(x, z)) * 18;
  return y;
};

const blocked = (x: number, z: number) => distToPath(PATH_PTS, x, z) < 3.4 || Math.hypot(x, z + 28) < 13;
const STONES = scatter(111, 60, { rMax: 38, h: heightAt, sMin: 0.7, sMax: 1.3, reject: blocked });
const TREES = scatter(112, 22, { rMin: 8, rMax: 40, h: heightAt, sMin: 0.9, sMax: 1.5, reject: blocked });

const obstacles: Circle[] = [
  [0, -28, 9.5],
  ...STONES.map((t): Circle => [t.x, t.z, 0.7 * (t.s ?? 1)]),
  ...TREES.map((t): Circle => [t.x, t.z, 0.5 * (t.s ?? 1)]),
];

function Orb({ i, lit }: { i: number; lit: boolean }) {
  const lvl = useSmooth(lit ? 1 : 0.08, 1.4);
  const a = (i / 8) * Math.PI * 2;
  return (
    <group position={[Math.cos(a) * 9, 3 + (i % 3) * 0.9, -14 + Math.sin(a) * 6]}>
      <Glow level={lvl} min={0.1} max={3} color="#9fe8ff"><sphereGeometry args={[0.55, 12, 10]} /></Glow>
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const door = useSmooth(signals.reflogCount > 0 || signals.commitCount > 1 ? 1 : 0.15, 1.2);
  const recovered = signals.commitCount + signals.reflogCount;
  return (
    <>
      <Scatter items={STONES} lift={0.7} castShadow><boxGeometry args={[0.9, 1.4, 0.25]} /><meshStandardMaterial color="#6f8b88" flatShading roughness={1} /></Scatter>
      <Scatter items={STONES} lift={1.5}><sphereGeometry args={[0.45, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#6f8b88" flatShading roughness={1} /></Scatter>
      <Trees items={TREES} kind="dead" trunk="#2b3a3d" />

      {/* The crypt */}
      <group position={[0, heightAt(0, -28), -28]}>
        <Box a={[18, 7, 12]} p={[0, 3.5, 0]} c="#5a6b6c" />
        <Box a={[20, 0.8, 14]} p={[0, 7.4, 0]} c="#46585a" />
        <Cn a={[11, 4, 4]} p={[0, 9.8, 0]} r={[0, Math.PI / 4, 0]} c="#3a4a4d" s={[1.1, 1, 0.8]} />
        {[-7, -2.4, 2.4, 7].map((x) => <Cyl key={x} a={[0.7, 0.8, 7, 10]} p={[x, 3.5, 6.6]} c="#7d8f90" />)}
        <Box a={[4.2, 5, 0.6]} p={[0, 2.5, 6.1]} c="#10181c" />
        <Glow level={door} min={0.1} max={2.4} color="#7ccfff" p={[0, 2.5, 6.45]}><boxGeometry args={[3.4, 4.4, 0.1]} /></Glow>
        <Glow level={door} min={0.1} max={2} color="#7ccfff" p={[0, 6.2, 6.5]} r={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.2, 0.12, 8, 24]} /></Glow>
      </group>

      {/* Lost-commit orbs: lit as commits and reflog entries appear */}
      {Array.from({ length: 8 }, (_, i) => <Orb key={i} i={i} lit={i < recovered} />)}

      <Fx p={[0, 3, 0]} area={[70, 5, 80]} count={90} color="#cfeaff" size={14} speed={0.15} reduced={reduced} coarse={coarse} opacity={0.22} />
      <Fx p={[0, 4, -10]} area={[30, 8, 40]} count={40} color="#7ccfff" size={5} speed={0.3} reduced={reduced} coarse={coarse} />
    </>
  );
}

export const SECRET101: WorldDef = {
  id: 101,
  theme: {
    skyTop: '#050a18', skyBottom: '#1d3b4a', fog: '#16323f', fogNear: 14, fogFar: 78,
    hemiSky: '#7fb7d6', hemiGround: '#10222c', hemiIntensity: 0.75, sun: '#9fd8ff', sunIntensity: 0.7, sunPosition: [-20, 30, 10], stars: 700,
  },
  terrain: { size: 150, segments: 120, palette: { low: '#1f3433', mid: '#2f4d4a', high: '#4a6a68', cliff: '#1a2a2e', lowY: -1, highY: 8, cliffSlope: 0.3 } },
  radius: 36, spawn: PATH_PTS[0], path: PATH_PTS, heightAt, obstacles,
  boss: { position: [0, -14], facing: 0 }, Scene,
};
