import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Banner, Box, Cyl, Fx, Glow, Lantern, Rocks, Scatter, Tower, Wall, scatter, useSmooth } from '../kit';
import { fbm, flatten, smoothstep } from '../noise';
import { makePath, project, roadProfile, smoothPath } from '../path';
import type { Circle, SceneProps, WorldDef } from '../types';

/** SECRET MAP 103: THE SHATTERED GATEHOUSE (Gate Crasher). A gorge road to a portcullis: locked red after a rejected push, raised after a push succeeds. */

const PATH_PTS = smoothPath([[0, 30], [6, 22], [-6, 14], [5, 6], [-2, -2], [0, -8]]);
const PATH = makePath(PATH_PTS);
const ROAD = roadProfile(PATH_PTS, 1.8, 22, 7);

const heightAt = (x: number, z: number): number => {
  const d = project(PATH, x, z).dist;
  let y = (fbm(x * 0.07 + 13, z * 0.07 + 4) - 0.45) * 3;
  y += ROAD(x, z);
  y = flatten(y, x, z, 0, 30, 4, 9, 0.4);
  // gorge walls rise on either side of the road
  y += smoothstep(8, 15, d) * 22 * (0.7 + fbm(x * 0.05, z * 0.05));
  return y;
};

const ROCKS = scatter(131, 30, { rMax: 36, h: heightAt, sMin: 0.8, sMax: 2, reject: (x, z) => project(PATH, x, z).dist < 3.6 });
const CLOUDS = scatter(132, 26, { rMin: 20, rMax: 90, h: () => 0, sMin: 4, sMax: 9 }).map((c, i) => ({ ...c, y: -10 - (i % 5) * 3, sy: 0.4 }));

const obstacles: Circle[] = [[-9, -22, 3.4], [9, -22, 3.4], ...ROCKS.map((t): Circle => [t.x, t.z, 0.9 * (t.s ?? 1)])];

function Portcullis({ open, locked }: { open: boolean; locked: boolean }) {
  const g = useRef<THREE.Group>(null);
  const up = useSmooth(open ? 1 : 0, 1.1);
  const lock = useSmooth(locked && !open ? 1 : 0, 2);
  useFrame(() => {
    if (g.current) g.current.position.y = up.current * 6.5;
  });
  return (
    <group>
      <group ref={g}>
        {[-3.2, -1.6, 0, 1.6, 3.2].map((x) => <Cyl key={x} a={[0.14, 0.14, 8, 6]} p={[x, 4.2, 0]} c="#3a3f4d" metal={0.8} />)}
        {[1.5, 4, 6.5].map((y) => <Box key={y} a={[7, 0.2, 0.2]} p={[0, y, 0]} c="#3a3f4d" metal={0.8} />)}
        <Glow level={lock} min={0} max={2.4} color="#ff4d4d" p={[0, 4.2, 0.2]} opacity={[0, 0.35]}><planeGeometry args={[7, 8]} /></Glow>
      </group>
      <Glow level={up} min={0} max={2.2} color="#ffd24d" p={[0, 4, -0.4]} opacity={[0, 0.5]}><planeGeometry args={[7, 8]} /></Glow>
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const open = signals.pushed;
  const locked = signals.rejectedPush;
  return (
    <>
      <Scatter items={CLOUDS}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#e9f0ff" emissive="#cfdcff" emissiveIntensity={0.4} transparent opacity={0.85} /></Scatter>
      <Rocks items={ROCKS} color="#6b6258" moss="#4f6b3a" />

      {/* Gatehouse across the gorge */}
      <group position={[0, heightAt(0, -24), -24]}>
        <Tower p={[-9, 0, 0]} r={3} h={16} color="#8a8174" roof="#8a3a1f" ruined />
        <Tower p={[9, 0, 0]} r={3} h={20} color="#8a8174" roof="#8a3a1f" />
        <Wall p={[-5.2, 0, 0]} len={4.2} h={11} thick={2.4} color="#8a8174" ruined />
        <Wall p={[5.2, 0, 0]} len={4.2} h={11} thick={2.4} color="#8a8174" />
        <Box a={[8, 3, 2.4]} p={[0, 12.5, 0]} c="#8a8174" />
        <Portcullis open={open} locked={locked} />
        <Banner p={[-3.6, 0, 1.6]} color="#8a1a2a" h={5} />
        <Banner p={[3.6, 0, 1.6]} color="#8a1a2a" h={5} />
      </group>
      {[-4, 4].map((x) => [18, 6].map((z) => <Lantern key={`${x}${z}`} p={[x + (z === 6 ? -2 : 2), heightAt(x, z), z]} color="#ff9a4d" />))}
      <Fx p={[0, 6, -4]} area={[30, 14, 60]} count={60} color="#ffb06b" size={4} speed={0.5} reduced={reduced} coarse={coarse} />
      {open && <Fx p={[0, 4, -24]} area={[8, 8, 4]} count={40} color="#ffe08a" size={6} reduced={reduced} coarse={coarse} />}
    </>
  );
}

export const SECRET103: WorldDef = {
  id: 103,
  theme: {
    skyTop: '#2a2146', skyBottom: '#f0a35e', fog: '#b9805a', fogNear: 30, fogFar: 120,
    hemiSky: '#ffd9a8', hemiGround: '#4a3a3a', hemiIntensity: 0.85, sun: '#ffb877', sunIntensity: 1.5, sunPosition: [30, 24, 20],
  },
  terrain: { size: 150, segments: 120, palette: { low: '#7a6a52', mid: '#8f7d60', high: '#a89a7e', cliff: '#5e544a', lowY: -1, highY: 16, cliffSlope: 0.28, bands: ['#7a6a52', '#665a48'], bandSize: 1.8 } },
  radius: 36, spawn: PATH_PTS[0], path: PATH_PTS, heightAt, obstacles,
  boss: { position: [0, -16], facing: 0 }, Scene,
};
