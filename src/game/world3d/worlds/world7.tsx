import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Box, Cn, Cyl, Fx, Glow, Scatter, Sph, Torus, scatter, useSmooth } from '../kit';
import { smoothstep } from '../noise';
import { smoothPath } from '../path';
import type { Circle, SceneProps, WorldDef } from '../types';

/** WORLD 7: THE TIME-REVERSAL TEMPLE. Commits are nodes on a floor timeline; a vault, relic and clocks reflect stash and reflog state. */

const PATH_PTS = smoothPath([[0, 26], [-10, 18], [10, 8], [-6, 0], [0, -2]]);

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = 1.2 - smoothstep(34, 40, r) * 60;
  y += Math.sin(x * 0.4) * Math.cos(z * 0.4) * 0.04;
  return y;
};

const COLUMNS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
  return { x: Math.cos(a) * 27, z: Math.sin(a) * 27, a };
});
const MEMORIES = scatter(71, 26, { rMax: 30, h: () => 0, sMin: 0.4, sMax: 0.9 }).map((m, i) => ({ ...m, y: 3 + (i % 7) * 1.4 }));

const obstacles: Circle[] = [
  ...COLUMNS.map((c): Circle => [c.x, c.z, 1.4]),
  [0, -27, 3.4], [-20, -2, 2.4], [16, -8, 1.6], [-12, -14, 1.8], [12, -14, 1.8],
];

function Node({ i, on, row }: { i: number; on: boolean; row: number }) {
  const lvl = useSmooth(on ? 1 : 0.06, 2);
  return (
    <group position={[-21 + i * 6, 1.6, row]}>
      <Glow level={lvl} min={0.1} max={2.4} color={row === 14 ? '#52e0ff' : '#a78bfa'}><sphereGeometry args={[0.55, 12, 10]} /></Glow>
    </group>
  );
}

function Timeline({ commits, branches }: { commits: number; branches: number }) {
  const main = useSmooth(Math.min(1, commits / 8), 1.4);
  return (
    <group>
      <Glow level={main} min={0.1} max={1.8} color="#52e0ff" p={[0, 1.35, 14]}><boxGeometry args={[42, 0.06, 0.28]} /></Glow>
      {Array.from({ length: 8 }, (_, i) => <Node key={i} i={i} row={14} on={i < commits} />)}
      <Glow level={main} min={0.05} max={1.2} color="#a78bfa" p={[-3, 1.35, 20]}><boxGeometry args={[30, 0.05, 0.22]} /></Glow>
      {Array.from({ length: 6 }, (_, i) => <Node key={i} i={i + 1} row={20} on={i < branches - 1} />)}
    </group>
  );
}

function Armillary({ reduced }: { reduced: boolean }) {
  const a = useRef<THREE.Group>(null);
  const b = useRef<THREE.Group>(null);
  const c = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (reduced) return;
    if (a.current) a.current.rotation.y += dt * 0.4;
    if (b.current) b.current.rotation.x += dt * 0.3;
    if (c.current) c.current.rotation.z += dt * 0.5;
  });
  return (
    <group position={[0, 0, -27]}>
      <Cyl a={[3, 3.6, 1.4, 16]} p={[0, 0.7, 0]} c="#59608a" />
      <group position={[0, 6.5, 0]}>
        <group ref={a}><Torus a={[4.2, 0.12, 8, 56]} c="#c6cde0" metal={0.7} rough={0.3} r={[Math.PI / 2, 0, 0]} /></group>
        <group ref={b}><Torus a={[3.4, 0.1, 8, 56]} c="#52e0ff" e="#52e0ff" ei={1.4} /></group>
        <group ref={c}><Torus a={[2.7, 0.1, 8, 56]} c="#a78bfa" e="#a78bfa" ei={1.2} /></group>
        <Sph a={[0.9, 14, 12]} c="#e0f7ff" e="#52e0ff" ei={1.8} />
      </group>
    </group>
  );
}

function ClockFace({ p, reduced }: { p: [number, number, number]; reduced: boolean }) {
  const hand = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (hand.current && !reduced) hand.current.rotation.z = -st.clock.elapsedTime * 0.6;
  });
  return (
    <group position={p} rotation={[0, p[0] > 0 ? -0.6 : 0.6, 0]}>
      <Cyl a={[3.2, 3.2, 0.4, 32]} r={[Math.PI / 2, 0, 0]} c="#c6cde0" metal={0.6} rough={0.35} />
      <Torus a={[3, 0.12, 6, 40]} c="#52e0ff" e="#52e0ff" ei={1.2} p={[0, 0, 0.22]} />
      <group ref={hand} position={[0, 0, 0.3]}><Box a={[0.14, 2.6, 0.08]} p={[0, 1.3, 0]} c="#1b2236" /></group>
      <Box a={[0.14, 1.8, 0.08]} p={[0.9, 0.5, 0.3]} r={[0, 0, -1]} c="#1b2236" />
    </group>
  );
}

function Hourglass({ p }: { p: [number, number, number] }) {
  return (
    <group position={p}>
      <Cyl a={[1.6, 1.8, 0.6, 12]} p={[0, 0.3, 0]} c="#59608a" />
      <Cyl a={[1.6, 1.6, 0.6, 12]} p={[0, 9.4, 0]} c="#59608a" />
      <Cn a={[1.2, 4, 12]} p={[0, 2.8, 0]} r={[Math.PI, 0, 0]} c="#c6e8ff" opacity={0.45} rough={0.1} />
      <Cn a={[1.2, 4, 12]} p={[0, 7.0, 0]} c="#c6e8ff" opacity={0.45} rough={0.1} />
      <Cn a={[0.8, 1.6, 8]} p={[0, 1.4, 0]} c="#f5b942" e="#f5b942" ei={0.8} />
      {[-1.4, 1.4].map((x) => <Cyl key={x} a={[0.12, 0.12, 9, 6]} p={[x, 4.8, 0]} c="#59608a" />)}
    </group>
  );
}

function Vault({ stash }: { stash: number }) {
  const lvl = useSmooth(stash > 0 ? 1 : 0.1, 1.6);
  return (
    <group position={[-20, 1.2, -2]}>
      <Box a={[4, 3.2, 3]} p={[0, 1.6, 0]} c="#4a5278" />
      <Glow level={lvl} min={0.1} max={2.2} color="#a78bfa" p={[0, 1.7, 1.55]}><boxGeometry args={[2.2, 2.2, 0.08]} /></Glow>
      <Html center position={[0, 4.6, 0]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap rounded-full border border-kq-edge bg-kq-deep/85 px-3 py-1 text-sm text-kq-text">Stash vault: {stash}</div>
      </Html>
    </group>
  );
}

function Relic({ on }: { on: boolean }) {
  const lvl = useSmooth(on ? 1 : 0.05, 1.2);
  return (
    <group position={[16, 1.2, -8]}>
      <Cyl a={[1.3, 1.6, 1.3, 8]} p={[0, 0.65, 0]} c="#59608a" />
      <Glow level={lvl} min={0.05} max={2.6} color="#f5b942" p={[0, 2.5, 0]}><torusKnotGeometry args={[0.55, 0.17, 56, 8]} /></Glow>
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const ring = useSmooth(0.25 + signals.worldProgress * 0.75, 1);
  return (
    <>
      {/* Floor: inlaid temporal rings */}
      <Cyl a={[34, 35, 0.8, 64]} p={[0, 0.82, 0]} c="#3b4268" shadow={false} />
      {[8, 14, 21, 30].map((r) => (
        <Glow key={r} level={ring} min={0.1} max={1.2} color="#7c5cff" p={[0, 1.26, 0]} r={[-Math.PI / 2, 0, 0]}><ringGeometry args={[r, r + 0.35, 64]} /></Glow>
      ))}

      {/* Colonnade with linking lintels */}
      {COLUMNS.map((c, i) => (
        <group key={i} position={[c.x, 1, c.z]}>
          <Box a={[3.4, 0.8, 3.4]} p={[0, 0.4, 0]} c="#59608a" />
          <Cyl a={[1.05, 1.2, 11, 12]} p={[0, 6.3, 0]} c="#6a7298" />
          <Box a={[3, 0.8, 3]} p={[0, 12.2, 0]} c="#59608a" />
        </group>
      ))}
      {COLUMNS.map((c, i) => {
        const n = COLUMNS[(i + 1) % COLUMNS.length];
        const mx = (c.x + n.x) / 2, mz = (c.z + n.z) / 2;
        const len = Math.hypot(n.x - c.x, n.z - c.z);
        return <Box key={`l${i}`} a={[len, 1.1, 1.8]} p={[mx, 13.2, mz]} r={[0, Math.atan2(n.x - c.x, n.z - c.z) + Math.PI / 2, 0]} c="#59608a" />;
      })}

      <Timeline commits={signals.commitCount} branches={signals.branchNames.length} />
      <Armillary reduced={reduced} />
      <ClockFace p={[-16, 12, -22]} reduced={reduced} />
      <ClockFace p={[16, 12, -22]} reduced={reduced} />
      <Hourglass p={[-12, 1.2, -14]} />
      <Hourglass p={[12, 1.2, -14]} />
      <Vault stash={signals.stashCount} />
      <Relic on={signals.reflogCount >= 2} />

      <Scatter items={MEMORIES}><octahedronGeometry args={[0.6, 0]} /><meshStandardMaterial color="#8fe3ff" emissive="#52e0ff" emissiveIntensity={0.9} flatShading transparent opacity={0.85} /></Scatter>
      <Fx p={[0, 8, 0]} area={[60, 18, 60]} count={80} color="#a5d8ff" size={4} speed={0.2} reduced={reduced} coarse={coarse} opacity={0.7} />
    </>
  );
}

export const WORLD7: WorldDef = {
  id: 7,
  theme: {
    skyTop: '#04061a', skyBottom: '#1c2150', fog: '#141a44', fogNear: 45, fogFar: 150,
    hemiSky: '#8a9bff', hemiGround: '#2a2f5c', hemiIntensity: 0.75, sun: '#b9c7ff', sunIntensity: 0.9, sunPosition: [-20, 40, 26], stars: 1200,
  },
  terrain: { size: 170, segments: 100, palette: { low: '#232850', mid: '#3b4268', high: '#59608a', cliff: '#1c2040', lowY: -10, highY: 2, cliffSlope: 0.4 } },
  radius: 30, spawn: PATH_PTS[0], path: PATH_PTS, heightAt, obstacles,
  boss: { position: [0, -8], facing: 0 }, Scene,
};
