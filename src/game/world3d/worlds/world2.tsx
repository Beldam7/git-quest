import { useMemo } from 'react';
import * as THREE from 'three';
import { Box, Cn, Cyl, Column, Fx, Glow, Bridge, Rocks, Scatter, Torus, Water, Crystals, scatter, useSmooth } from '../kit';
import { bump, fbm, flatten, smoothstep, vnoise } from '../noise';
import type { Circle, SceneProps, WorldDef } from '../types';
import { distToPath, roadProfile, smoothPath } from '../path';

/** WORLD 2: THE CAVE OF LOST COMMITS. A vaulted cavern whose inscriptions and floating fragments light up as commit history appears. */

const PATH_PTS = smoothPath([[0, 30], [-8, 24], [-4, 16], [-6, 8], [-1, 0], [3, -6], [0, -14], [0, -17]]);
const ROAD = roadProfile(PATH_PTS, 1.8, 24, 7);
const POOLS: Array<[number, number, number]> = [[-15, 6, 5.5], [17, -4, 6], [4, 18, 4]];
const inChasm = (x: number, z: number) => x > 12 && x < 33 && Math.abs(z - 16) < 4.2;

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = (fbm(x * 0.08 + 1, z * 0.08 + 4) - 0.5) * 3.2;
  y += ROAD(x, z);
  for (const [px, pz, pr] of POOLS) y -= 2.6 * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / (2 * pr * pr));
  y -= 7 * Math.exp(-((z - 16) ** 2) / (2 * 2 * 2)) * smoothstep(10, 15, x) * smoothstep(36, 31, x);
  y = flatten(y, x, z, 0, -28, 9, 15, 0.8);
  y = flatten(y, x, z, 0, 28, 5, 10, 0.3);
  y += smoothstep(34, 47, r) * 26;
  y += bump(x, z, -26, -12, 9, 3.5) ;
  return y;
};

const dry = (x: number, z: number, y: number) => y < -0.4 || inChasm(x, z) || Math.hypot(x, z - 28) < 4 || Math.hypot(x, z + 28) < 10 || Math.hypot(x, z) > 38 || distToPath(PATH_PTS, x, z) < 3;
const STALAGMITES = scatter(21, 50, { rMax: 40, h: heightAt, sMin: 0.6, sMax: 1.7, reject: dry });
const CRYSTAL_B = scatter(22, 26, { rMin: 14, rMax: 38, h: heightAt, sMin: 0.8, sMax: 2.2, reject: dry });
const CRYSTAL_P = scatter(23, 22, { rMin: 14, rMax: 38, h: heightAt, sMin: 0.8, sMax: 2.0, reject: dry });
const ROCKS = scatter(24, 22, { rMax: 38, h: heightAt, sMin: 0.6, sMax: 1.4, reject: dry });
const STALACTITES = scatter(25, 70, { rMax: 40, h: () => 0, sMin: 0.7, sMax: 2, reject: () => false }).map((t) => ({ ...t, y: 6 + 0.45 * Math.sqrt(Math.max(0, 54 * 54 - (t.x * t.x + t.z * t.z))) - 0.4 * (t.s ?? 1) }));

const obstacles: Circle[] = [
  [0, -28, 4.2],
  ...STALAGMITES.map((t): Circle => [t.x, t.z, 0.7 * (t.s ?? 1)]),
  ...CRYSTAL_B.map((t): Circle => [t.x, t.z, 0.8 * (t.s ?? 1)]),
  ...CRYSTAL_P.map((t): Circle => [t.x, t.z, 0.8 * (t.s ?? 1)]),
  ...ROCKS.map((t): Circle => [t.x, t.z, 0.9 * (t.s ?? 1)]),
];

function Cavern() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(54, 56, 36);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + (vnoise(x * 0.12 + 5, z * 0.12 + y * 0.1) - 0.5) * 0.18;
      p.setXYZ(i, x * k, y * k, z * k);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} position={[0, 6, 0]} scale={[1, 0.45, 1]}>
      <meshStandardMaterial color="#2a2646" emissive="#120e26" emissiveIntensity={0.8} side={THREE.BackSide} roughness={1} flatShading />
    </mesh>
  );
}

function Fragment({ i, lit }: { i: number; lit: boolean }) {
  const lvl = useSmooth(lit ? 1 : 0, 1.4);
  const a = (i / 8) * Math.PI * 2;
  return (
    <group position={[Math.cos(a) * 7, 2.6 + (i % 3) * 0.7, Math.sin(a) * 7 - 4]} rotation={[0.4, a, 0.3]}>
      <Glow level={lvl} min={0.15} max={2.2} color={lit ? '#7df9ff' : '#6d6a92'}><octahedronGeometry args={[0.55, 0]} /></Glow>
    </group>
  );
}

function Glyph({ x, y, on }: { x: number; y: number; on: boolean }) {
  const lvl = useSmooth(on ? 1 : 0, 2);
  return (
    <Glow level={lvl} min={0.05} max={2} color="#a78bfa" p={[x, y, 0.32]}>
      <boxGeometry args={[0.5, 0.18 + ((x * 7 + y * 3) % 3) * 0.1, 0.05]} />
    </Glow>
  );
}

function InscriptionWall({ history }: { history: number }) {
  const lit = Math.min(24, history * 3);
  return (
    <group position={[-30, 0, -6]} rotation={[0, Math.PI / 2.4, 0]}>
      <Box a={[11, 9, 0.6]} p={[0, 4.5, 0]} c="#3a3558" />
      {Array.from({ length: 24 }, (_, k) => {
        const col = k % 3;
        const row = Math.floor(k / 3);
        return <Glyph key={k} x={-3.2 + col * 3.2} y={1.2 + row * 1.0} on={k < lit} />;
      })}
    </group>
  );
}

function Relic({ restored }: { restored: boolean }) {
  const lvl = useSmooth(restored ? 1 : 0, 1.2);
  return (
    <group position={[14, 0, -22]}>
      <Cyl a={[1.2, 1.5, 1.2, 8]} p={[0, 0.6, 0]} c="#4b4670" />
      <Glow level={lvl} min={0.1} max={2.4} color="#f5b942" p={[0, 2.2, 0]}><torusKnotGeometry args={[0.5, 0.16, 48, 8]} /></Glow>
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const crystal = useSmooth(0.35 + Math.min(1, signals.commitCount / 5) * 0.65, 1);
  const history = signals.commitCount + signals.reflogCount;
  return (
    <>
      <Cavern />
      <Water y={-1.0} color="#1d6fa5" emissive="#0e7490" opacity={0.78} />
      <Scatter items={STALAGMITES} lift={1.6} castShadow><coneGeometry args={[0.8, 3.2, 6]} /><meshStandardMaterial color="#4b4670" flatShading roughness={1} /></Scatter>
      <Scatter items={STALACTITES} flip><coneGeometry args={[0.7, 4.4, 6]} /><meshStandardMaterial color="#3d3860" flatShading roughness={1} /></Scatter>
      <Crystals items={CRYSTAL_B} color="#4d8dff" level={crystal} min={0.7} max={2.0} />
      <Crystals items={CRYSTAL_P} color="#b066ff" level={crystal} min={0.7} max={2.0} />
      <Rocks items={ROCKS} color="#55507a" />

      {Array.from({ length: 8 }, (_, i) => <Fragment key={i} i={i} lit={i < signals.commitCount} />)}
      <InscriptionWall history={history} />
      <Relic restored={signals.reflogCount >= 2} />
      <Bridge a={[10, 16]} b={[35, 16]} y={0.5} gap={0.5} wood="#5a4a3a" rail="#3a2f26" />

      {/* Boss chamber: a dais ringed by broken columns */}
      <group position={[0, heightAt(0, -28), -28]}>
        <Cyl a={[8, 8.6, 0.8, 24]} p={[0, 0.4, 0]} c="#4b4670" />
        <Glow level={crystal} min={0.3} max={1.6} color="#a78bfa" p={[0, 0.85, 0]} r={[-Math.PI / 2, 0, 0]}><ringGeometry args={[5.2, 5.8, 48]} /></Glow>
        <Torus a={[3.2, 0.08, 6, 32]} p={[0, 0.9, 0]} r={[Math.PI / 2, 0, 0]} c="#7c5cff" e="#7c5cff" ei={1.2} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return <Column key={i} p={[Math.cos(a) * 9.5, 0, Math.sin(a) * 9.5]} h={6} color="#5a5580" broken={i % 2 === 0} />;
        })}
        <Cn a={[0.8, 2.4, 5]} p={[0, 1.8, 7.5]} c="#3d3860" />
      </group>

      <pointLight position={[-20, 6, 10]} color="#4d8dff" intensity={160} distance={38} />
      <pointLight position={[22, 6, -14]} color="#b066ff" intensity={160} distance={38} />
      <pointLight position={[0, 8, -28]} color="#8b5cf6" intensity={120} distance={30} />
      <pointLight position={[0, 5, 26]} color="#7df9ff" intensity={70} distance={26} />
      <Fx p={[0, 7, 0]} area={[60, 14, 60]} count={90} color="#9ee7ff" size={4} reduced={reduced} coarse={coarse} opacity={0.7} />
    </>
  );
}

export const WORLD2: WorldDef = {
  id: 2,
  theme: {
    skyTop: '#05060f', skyBottom: '#0b0d22', fog: '#0b0d22', fogNear: 18, fogFar: 85,
    hemiSky: '#6a7bd8', hemiGround: '#241b45', hemiIntensity: 0.65, sun: '#8aa0ff', sunIntensity: 0.25, sunPosition: [10, 30, 10], enclosed: true,
  },
  terrain: { size: 110, segments: 120, palette: { low: '#2c2a4a', mid: '#3a3760', high: '#4b4670', cliff: '#2a2646', lowY: -2, highY: 18, cliffSlope: 0.32 } },
  radius: 36, spawn: PATH_PTS[0], path: PATH_PTS, heightAt, obstacles,
  walkable: (x, z) => heightAt(x, z) > -1.7 && !inChasm(x, z),
  boss: { position: [0, -22], facing: 0 }, Scene,
};
