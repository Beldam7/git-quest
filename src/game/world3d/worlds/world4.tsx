import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Box, Bridge, Column, Cyl, Fx, Glow, Rocks, Scatter, Trees, Water, line, scatter, useSmooth } from '../kit';
import { fbm, flatten, smoothstep } from '../noise';
import type { Circle, SceneProps, WorldDef, WorldSignals } from '../types';

/** WORLD 4: CONFLICT CANYON. A ravine split by conflicting changes; the bridge is only whole while no merge conflict is unresolved. */

const RAVINE_Z = -5;
const BRIDGE_Y = 0.9;
const inRavine = (z: number) => Math.abs(z - RAVINE_Z) < 5.2;
const bridgeIntact = (s: WorldSignals) => s.unresolvedConflicts === 0 && !s.mergeInProgress;

const heightAt = (x: number, z: number): number => {
  const ax = Math.abs(x);
  let y = (fbm(x * 0.07 + 2, z * 0.07 + 8) - 0.5) * 2.6;
  y = flatten(y, x, z, 0, 14, 10, 18, 0.9);
  y = flatten(y, x, z, 0, -18, 9, 17, 0.9);
  y = flatten(y, x, z, 0, -31, 11, 18, 1.2);
  y += smoothstep(24, 38, ax) * 24 * (0.65 + fbm(x * 0.05, z * 0.05));
  y += smoothstep(40, 56, Math.abs(z + 4)) * 20;
  y -= 17 * smoothstep(7.2, 4.6, Math.abs(z - RAVINE_Z));
  return y;
};

const rough = (x: number, z: number, y: number) => Math.abs(x) < 4 || Math.abs(z - RAVINE_Z) < 7 || Math.hypot(x, z + 31) < 14 || y < -1 || Math.abs(x) > 34;
const SPIRES = scatter(41, 34, { rMin: 16, rMax: 46, h: heightAt, sMin: 1.2, sMax: 3, reject: (x, z, y) => Math.abs(x) < 22 || y < -1 });
const BOULDERS = scatter(42, 40, { rMax: 40, h: heightAt, sMin: 0.7, sMax: 2, reject: rough });
const DEAD = scatter(43, 14, { rMax: 38, h: heightAt, sMin: 0.8, sMax: 1.3, reject: rough });
const SHARDS = scatter(44, 16, { rMax: 18, cz: RAVINE_Z, h: () => 0, sMin: 0.6, sMax: 1.4 }).map((t, i) => ({ ...t, y: 5 + (i % 5) * 1.6 }));
const CRACKS = [
  ...line(-16, 24, -4, 8, 1.6, heightAt, 0.4, 3, 0.05),
  ...line(15, 22, 3, 7, 1.6, heightAt, 0.4, 4, 0.05),
  ...line(-14, -24, 14, -36, 1.6, heightAt, 0.5, 5, 0.06),
  ...line(12, -20, -12, -26, 1.6, heightAt, 0.5, 6, 0.06),
];

const obstacles: Circle[] = [
  ...Array.from({ length: 6 }, (_, i): Circle => [Math.cos((i / 6) * Math.PI * 2) * 11, -31 + Math.sin((i / 6) * Math.PI * 2) * 11, 0.9]),
  ...SPIRES.map((t): Circle => [t.x, t.z, 1.1 * (t.s ?? 1)]),
  ...BOULDERS.map((t): Circle => [t.x, t.z, 0.9 * (t.s ?? 1)]),
  ...DEAD.map((t): Circle => [t.x, t.z, 0.5]),
];

function Beams({ broken }: { broken: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current) g.current.rotation.y += dt * 0.7;
  });
  if (!broken) return null;
  return (
    <group ref={g} position={[0, 4.2, RAVINE_Z]}>
      <Cyl a={[0.1, 0.1, 15, 6]} r={[0, 0, Math.PI / 2 - 0.35]} c="#ff3d3d" e="#ff3d3d" ei={2.4} shadow={false} />
      <Cyl a={[0.1, 0.1, 15, 6]} r={[0, 0, Math.PI / 2 + 0.35]} c="#3dd6f5" e="#3dd6f5" ei={2.4} shadow={false} />
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const broken = !bridgeIntact(signals);
  const crack = useSmooth(broken ? 1 : 0.08, 1.6);
  const restored = useSmooth(signals.conflictsResolved ? 1 : 0, 1.3);
  return (
    <>
      <Water y={-12} color="#ff6a1a" emissive="#ff3d00" opacity={1} />
      <Scatter items={SPIRES} lift={3} castShadow><coneGeometry args={[1.6, 6, 5]} /><meshStandardMaterial color="#8f3a1f" flatShading roughness={1} /></Scatter>
      <Rocks items={BOULDERS} color="#7a3b25" />
      <Trees items={DEAD} kind="dead" trunk="#3a2a22" />
      <Scatter items={SHARDS}><octahedronGeometry args={[0.9, 0]} /><meshStandardMaterial color="#5a2a1f" emissive="#ff4d1a" emissiveIntensity={0.5} flatShading /></Scatter>
      <Scatter items={CRACKS} glow={{ level: crack, min: 0.1, max: 2.6 }}>
        <boxGeometry args={[0.35, 0.05, 1.9]} />
        <meshStandardMaterial color="#ff6a1a" emissive="#ff6a1a" emissiveIntensity={0.1} />
      </Scatter>

      <Bridge a={[0, 5]} b={[0, -15]} y={BRIDGE_Y} width={2.6} gap={broken ? 0.55 : 0} wood="#7a5a35" glow={{ level: restored, color: '#7df9ff' }} />
      <Beams broken={broken} />
      {/* Bridge anchor posts */}
      {[5, -15].map((z) => [-1.6, 1.6].map((x) => <Box key={`${x}${z}`} a={[0.5, 1.8, 0.5]} p={[x, BRIDGE_Y + 0.7, z]} c="#4d3220" />))}

      {/* Arena ruins */}
      <group position={[0, heightAt(0, -31), -31]}>
        <Cyl a={[11.5, 12.2, 0.9, 28]} p={[0, 0.3, 0]} c="#6b3a2a" />
        <Cyl a={[8, 8, 0.1, 28]} p={[0, 0.8, 0]} c="#2a1a1a" e="#ff4d1a" ei={0.15} />
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return <Column key={i} p={[Math.cos(a) * 11, 0.7, Math.sin(a) * 11]} h={7} color="#7b6350" broken={i % 2 === 1} />;
        })}
      </group>
      <Column p={[-5, heightAt(-5, 12), 12]} h={6} color="#7b6350" broken />
      <Column p={[6, heightAt(6, 16), 16]} h={5} color="#7b6350" broken />

      <Fx p={[0, 8, -5]} area={[40, 18, 60]} count={100} color="#ff9a4d" size={5} speed={0.8} reduced={reduced} coarse={coarse} />
      {signals.conflictsResolved && <Fx p={[0, 3, RAVINE_Z]} area={[6, 6, 18]} count={50} color="#ffe08a" size={6} reduced={reduced} coarse={coarse} />}
    </>
  );
}

export const WORLD4: WorldDef = {
  id: 4,
  theme: {
    skyTop: '#3a1a2e', skyBottom: '#f29a52', fog: '#d7835a', fogNear: 30, fogFar: 125,
    hemiSky: '#ffcf9a', hemiGround: '#5a2a1a', hemiIntensity: 0.8, sun: '#ffb36b', sunIntensity: 1.7, sunPosition: [-30, 26, 22],
  },
  terrain: {
    size: 170, segments: 140,
    palette: { low: '#a3502a', mid: '#c2672f', high: '#d88a4a', cliff: '#8a3a22', lowY: -2, highY: 18, cliffSlope: 0.22, bands: ['#b4552a', '#8f3a1f'], bandSize: 1.6 },
  },
  radius: 40, spawn: [0, 28], heightAt, obstacles,
  groundAt: (x, z, s) => (inRavine(z) && Math.abs(x) < 1.3 && bridgeIntact(s) ? BRIDGE_Y : heightAt(x, z)),
  walkable: (x, z, s) => !inRavine(z) || (Math.abs(x) < 1.3 && bridgeIntact(s)),
  boss: { position: [0, -31], facing: 0 }, Scene,
};
