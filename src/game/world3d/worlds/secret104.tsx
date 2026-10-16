import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, Cyl, Fx, Glow, Island, Scatter, Torus, scatter, useSmooth } from '../kit';
import { fbm, flatten, smoothstep } from '../noise';
import { makePath, project, roadProfile, smoothPath } from '../path';
import type { Circle, SceneProps, WorldDef } from '../types';

/** SECRET MAP 104: THE TANGLED SPIRE (Clean Timeline). A floating causeway; knotted ribbons of time straighten once history is linear. */

const PATH_PTS = smoothPath([[0, 30], [-8, 22], [8, 14], [-6, 6], [4, -2], [0, -8]]);
const PATH = makePath(PATH_PTS);
const ROAD = roadProfile(PATH_PTS, 1.6, 22, 7);

const heightAt = (x: number, z: number): number => {
  const d = project(PATH, x, z).dist;
  let y = (fbm(x * 0.08 + 2, z * 0.08 + 17) - 0.5) * 1.2 + ROAD(x, z);
  y = flatten(y, x, z, 0, 30, 5, 10, 0.4);
  y = flatten(y, x, z, 0, -18, 8, 14, 0.6);
  // the road is a floating causeway: the ground falls away into the sky
  y -= smoothstep(7.4, 10.4, d) * 80;
  return y;
};

const CLOUDS = scatter(141, 40, { rMin: 15, rMax: 110, h: () => 0, sMin: 4, sMax: 10 }).map((c, i) => ({ ...c, y: -22 - (i % 6) * 3, sy: 0.4 }));
const obstacles: Circle[] = [];

/** Ribbons of time. `amp` is how knotted they are; each ribbon is a tube along a wavy curve. */
function ribbons(amp: number): THREE.TubeGeometry[] {
  return [-8, -4, 0, 4, 8].map((x0, k) => {
    const pts = Array.from({ length: 48 }, (_, i) => new THREE.Vector3(
      x0 + Math.sin(i * 0.55 + k * 1.7) * amp,
      9 + k * 0.9 + Math.cos(i * 0.7 + k) * amp * 0.7,
      -8 - i * 1.3
    ));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 160, 0.17, 6, false);
  });
}

function Gear({ p, r, speed, reduced }: { p: [number, number, number]; r: number; speed: number; reduced: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (g.current && !reduced) g.current.rotation.z += dt * speed;
  });
  return (
    <group position={p}>
      <group ref={g}>
        <Torus a={[r, r * 0.06, 8, 48]} c="#8fa6e8" e="#52e0ff" ei={0.6} />
        {Array.from({ length: 12 }, (_, i) => (
          <Box key={i} a={[r * 0.14, r * 0.16, r * 0.1]} p={[Math.cos((i / 12) * Math.PI * 2) * r * 1.04, Math.sin((i / 12) * Math.PI * 2) * r * 1.04, 0]} r={[0, 0, (i / 12) * Math.PI * 2]} c="#8fa6e8" />
        ))}
        {[0, 1, 2].map((i) => <Box key={`s${i}`} a={[r * 2, r * 0.05, r * 0.05]} r={[0, 0, (i / 3) * Math.PI]} c="#5d7ac0" />)}
      </group>
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  // Heuristic: extra branches or an unfinished merge mean the history is still tangled.
  const tangled = signals.branchNames.length > 1 || signals.mergeInProgress;
  const knots = useSmooth(tangled ? 1 : 0, 1.2);
  const clean = useSmooth(tangled ? 0 : 1, 1.2);
  const messy = useMemo(() => ribbons(4), []);
  const straight = useMemo(() => ribbons(0.35), []);
  return (
    <>
      <Scatter items={CLOUDS}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#eaf0ff" emissive="#cddcff" emissiveIntensity={0.5} transparent opacity={0.8} /></Scatter>
      {messy.map((g, i) => (
        <Glow key={`m${i}`} level={knots} min={0} max={1.8} color="#ff7ad9" opacity={[0, 0.9]}><primitive object={g} attach="geometry" /></Glow>
      ))}
      {straight.map((g, i) => (
        <Glow key={`s${i}`} level={clean} min={0} max={2} color="#7df9ff" opacity={[0, 0.95]}><primitive object={g} attach="geometry" /></Glow>
      ))}

      <Gear p={[-30, 22, -50]} r={14} speed={0.15} reduced={reduced} />
      <Gear p={[24, 30, -62]} r={20} speed={-0.1} reduced={reduced} />
      <Island p={[-46, 4, 8]} s={1.4} grass="#5d7ac0" rock="#3d4a7a" reduced={reduced} />
      <Island p={[48, 10, -10]} s={1.1} grass="#7d8fd8" rock="#3d4a7a" reduced={reduced} />

      <group position={[0, heightAt(0, -18), -18]}>
        <Cyl a={[8, 8.6, 0.8, 28]} p={[0, 0.2, 0]} c="#4d5f9a" />
        <Glow level={clean} min={0.2} max={1.6} color="#7df9ff" p={[0, 0.65, 0]} r={[-Math.PI / 2, 0, 0]}><ringGeometry args={[5.4, 6, 48]} /></Glow>
      </group>
      <Fx p={[0, 8, -10]} area={[60, 24, 90]} count={100} color="#a5d8ff" size={5} speed={0.3} reduced={reduced} coarse={coarse} />
    </>
  );
}

export const SECRET104: WorldDef = {
  id: 104,
  theme: {
    skyTop: '#0a1240', skyBottom: '#6f8fe0', fog: '#5a74c0', fogNear: 40, fogFar: 170,
    hemiSky: '#cfe0ff', hemiGround: '#3a4a8a', hemiIntensity: 1.0, sun: '#ffffff', sunIntensity: 1.4, sunPosition: [20, 50, 20],
  },
  terrain: { size: 170, segments: 130, palette: { low: '#3d5593', mid: '#5d7ac0', high: '#8fa6e8', cliff: '#2a3566', lowY: -6, highY: 4, cliffSlope: 0.3 } },
  radius: 36, spawn: PATH_PTS[0], path: PATH_PTS, heightAt, obstacles,
  boss: { position: [0, -18], facing: 0 }, Scene,
};
