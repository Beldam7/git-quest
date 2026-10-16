import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Banner, Box, Cn, Cyl, Fx, Glow, Lantern, Rocks, Sph, Torus, Trees, Water, scatter, useSmooth } from '../kit';
import type { V3 } from '../kit';
import { bump, fbm, flatten, smoothstep } from '../noise';
import type { Circle, SceneProps, WorldDef } from '../types';

/** WORLD 6: THE COLLABORATION GUILD. A courtyard of workshops, a notice board, a review chamber and a forge. */

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = (fbm(x * 0.05 + 6, z * 0.05 + 3) - 0.45) * 5;
  y = flatten(y, x, z, 0, -2, 28, 36, 0.7);
  y += bump(x, z, -52, -20, 26, 8) + bump(x, z, 54, -10, 24, 7);
  y += smoothstep(46, 80, r) * 22 * (0.5 + fbm(x * 0.03, z * 0.03));
  return y;
};

const TREES = scatter(61, 50, { rMin: 38, rMax: 56, h: heightAt, sMin: 0.9, sMax: 1.5 });
const ROCKS = scatter(62, 14, { rMin: 40, rMax: 56, h: heightAt, sMin: 0.8, sMax: 1.6 });

const WORKSHOPS: Array<[number, number]> = [[-24, 6], [-24, -6], [-24, 18], [-24, -18]];
const obstacles: Circle[] = [
  [0, -22, 12], [0, 10, 3.4], [-14, 4, 2], [14, 3, 3], [23, -8, 2.6], [0, -12, 6],
  ...WORKSHOPS.map(([x, z]): Circle => [x, z, 3.4]),
  ...[[-8, 16], [8, 16], [-8, 24], [8, 24]].map(([x, z]): Circle => [x, z, 1.4]),
  ...TREES.map((t): Circle => [t.x, t.z, 0.6 * (t.s ?? 1)]),
  ...ROCKS.map((t): Circle => [t.x, t.z, 0.9 * (t.s ?? 1)]),
];

function Note({ x, y, on }: { x: number; y: number; on: boolean }) {
  const lvl = useSmooth(on ? 1 : 0, 2);
  return <Glow level={lvl} min={0.05} max={1.4} color="#fde68a" p={[x, y, 0.1]}><boxGeometry args={[0.55, 0.7, 0.03]} /></Glow>;
}

function NoticeBoard({ issues }: { issues: number }) {
  return (
    <group position={[-14, heightAt(-14, 4), 4]} rotation={[0, 0.5, 0]}>
      <Cyl a={[0.12, 0.12, 4, 6]} p={[-1.8, 2, 0]} c="#4a2f1a" />
      <Cyl a={[0.12, 0.12, 4, 6]} p={[1.8, 2, 0]} c="#4a2f1a" />
      <Box a={[4.4, 2.6, 0.15]} p={[0, 3, 0]} c="#7a5a35" />
      {Array.from({ length: 8 }, (_, i) => <Note key={i} x={-1.6 + (i % 4) * 1.07} y={3.6 - Math.floor(i / 4) * 1.1} on={i < issues} />)}
      <Html center position={[0, 5, 0]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap rounded-full border border-kq-edge bg-kq-deep/85 px-3 py-1 text-sm text-kq-text">Issues: {issues}</div>
      </Html>
    </group>
  );
}

function Workshop({ p, active, name }: { p: [number, number]; active: boolean; name?: string }) {
  const lvl = useSmooth(active ? 1 : 0.2, 2);
  return (
    <group position={[p[0], heightAt(p[0], p[1]), p[1]]} rotation={[0, Math.PI / 2, 0]}>
      <Box a={[6, 3.4, 4.4]} p={[0, 1.7, 0]} c="#9a6b3f" />
      <Box a={[6.6, 0.4, 5]} p={[0, 3.6, 0]} c="#5a3d27" />
      <Cn a={[4.6, 2.4, 4]} p={[0, 5, 0]} r={[0, Math.PI / 4, 0]} c="#3d6b8c" s={[1.1, 1, 0.9]} />
      <Glow level={lvl} min={0.1} max={1.8} color="#ffcf80" p={[0, 1.8, 2.25]}><boxGeometry args={[1.4, 1.1, 0.06]} /></Glow>
      {name && (
        <Html center position={[0, 7.4, 0]} distanceFactor={14} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-full border border-kq-edge bg-kq-deep/85 px-3 py-1 text-sm" style={{ color: active ? '#fbbf24' : '#9fb0cf' }}>{active ? '▶ ' : ''}{name}</div>
        </Html>
      )}
    </group>
  );
}

function Scroll({ i, on }: { i: number; on: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const lvl = useSmooth(on ? 1 : 0, 2);
  useFrame((st) => {
    if (ref.current) ref.current.position.y = 3 + i * 0.1 + Math.sin(st.clock.elapsedTime * 1.4 + i) * 0.25;
  });
  return (
    <group ref={ref} position={[(i - 1) * 1.6, 3, 0]}>
      <Glow level={lvl} min={0.1} max={1.8} color="#7df9ff" r={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.2, 0.2, 1.2, 10]} /></Glow>
    </group>
  );
}

function ReviewChamber({ approvals }: { approvals: number }) {
  return (
    <group position={[0, heightAt(0, -12), -12]}>
      <Cyl a={[6.5, 7, 0.7, 28]} p={[0, 0.35, 0]} c="#c9b99a" />
      <Torus a={[4.8, 0.1, 6, 40]} p={[0, 0.8, 0]} r={[Math.PI / 2, 0, 0]} c="#f5b942" e="#f5b942" ei={0.6} />
      {[0, 1, 2].map((i) => {
        return <Seal key={i} i={i} on={i < approvals} />;
      })}
    </group>
  );
}

function Seal({ i, on }: { i: number; on: boolean }) {
  const lvl = useSmooth(on ? 1 : 0, 1.6);
  return (
    <Glow level={lvl} min={0.1} max={2.4} color="#34d399" p={[(i - 1) * 3.2, 7.5, 2]} r={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.7, 0.14, 8, 24]} /></Glow>
  );
}

function Hall({ lit }: { lit: boolean }) {
  const lvl = useSmooth(lit ? 1 : 0.3, 1.2);
  const y = heightAt(0, -24);
  return (
    <group position={[0, y, -24]}>
      <Box a={[24, 9, 10]} p={[0, 4.5, 0]} c="#b89b6e" />
      <Box a={[14, 0.7, 12]} p={[-5.6, 10.6, 0]} r={[0, 0, 0.5]} c="#3d6b8c" />
      <Box a={[14, 0.7, 12]} p={[5.6, 10.6, 0]} r={[0, 0, -0.5]} c="#3d6b8c" />
      <Box a={[3.6, 6, 0.4]} p={[0, 3, 5.1]} c="#4d3220" />
      <Box a={[8, 0.5, 3]} p={[0, 0.25, 6.5]} c="#9a9486" />
      {[-9, -5, 5, 9].map((x) => (
        <Glow key={x} level={lvl} min={0.1} max={2} color="#ffcf80" p={[x, 5.5, 5.1]}><boxGeometry args={[1.6, 2.2, 0.08]} /></Glow>
      ))}
      {[-14.5, 14.5].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <Cyl a={[2.2, 2.4, 14, 10]} p={[0, 7, 0]} c="#b89b6e" />
          <Cn a={[3, 4, 10]} p={[0, 16, 0]} c="#3d6b8c" />
        </group>
      ))}
    </group>
  );
}

function Forge({ on, reduced, coarse }: { on: boolean; reduced: boolean; coarse: boolean }) {
  const lvl = useSmooth(on ? 1 : 0.1, 1.5);
  return (
    <group position={[23, heightAt(23, -8), -8]}>
      <Box a={[3.4, 1.6, 2.4]} p={[0, 0.8, 0]} c="#5a5a64" />
      <Glow level={lvl} min={0.1} max={3} color="#ff7a1a" p={[0, 1.7, 0]}><boxGeometry args={[2.6, 0.3, 1.6]} /></Glow>
      <Box a={[1.2, 0.5, 0.8]} p={[0, 2.1, 0]} c="#2a2a30" metal={0.8} />
      <Box a={[1.6, 4.5, 1.6]} p={[0, 2.3, -1.9]} c="#6a6a74" />
      {on && <Fx p={[0, 3, 0]} area={[3, 4, 3]} count={30} color="#ff9a4d" size={5} speed={0.9} reduced={reduced} coarse={coarse} />}
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const hallLit = signals.approvedReviews > 0 || signals.mergedPullRequests > 0;
  const tables: V3[] = [[-8, 0.6, 16], [8, 0.6, 16], [-8, 0.6, 24], [8, 0.6, 24]];
  return (
    <>
      <Water y={-3} color="#2a7fb8" />
      <Trees items={TREES} kind="round" trunk="#5b3b24" leaf="#4a9a45" leaf2="#5fb257" />
      <Rocks items={ROCKS} color="#8a8f98" moss="#5f8a49" />

      {/* Cobbled courtyard */}
      <Cyl a={[30, 31, 0.3, 48]} p={[0, 0.57, -2]} c="#bdb39d" shadow={false} />
      <Torus a={[16, 0.12, 6, 64]} p={[0, 0.75, -2]} r={[Math.PI / 2, 0, 0]} c="#d8c48a" e="#d8c48a" ei={0.15} />

      <Hall lit={hallLit} />
      <ReviewChamber approvals={signals.approvedReviews} />
      <NoticeBoard issues={signals.issueCount} />
      {WORKSHOPS.map((w, i) => <Workshop key={i} p={w} active={signals.branchNames[i] === signals.currentBranch} name={signals.branchNames[i]} />)}
      <Forge on={signals.mergedPullRequests > 0} reduced={reduced} coarse={coarse} />

      {/* Pull-request dais with floating scrolls (one per open PR) */}
      <group position={[14, heightAt(14, 3), 3]}>
        <Cyl a={[3, 3.2, 0.7, 20]} p={[0, 0.35, 0]} c="#c9b99a" />
        {[0, 1, 2].map((i) => <Scroll key={i} i={i} on={i < signals.openPullRequests} />)}
      </group>

      {/* Work tables with glowing documents, fountain, banners */}
      {tables.map((p, i) => (
        <group key={i} position={[p[0], heightAt(p[0], p[2]) + 0.2, p[2]]}>
          <Box a={[3.4, 0.2, 1.6]} p={[0, 1.1, 0]} c="#7a5a35" />
          {[-1.4, 1.4].map((x) => <Box key={x} a={[0.2, 1.1, 1.2]} p={[x, 0.55, 0]} c="#5a3d27" />)}
          <Box a={[0.9, 0.04, 0.6]} p={[-0.6, 1.24, 0]} c="#f4ecd4" e="#fde68a" ei={0.3} />
          <Box a={[0.9, 0.04, 0.6]} p={[0.7, 1.24, 0.1]} c="#f4ecd4" e="#fde68a" ei={0.3} r={[0, 0.3, 0]} />
        </group>
      ))}
      <group position={[0, heightAt(0, 10), 10]}>
        <Cyl a={[3.4, 3.6, 0.9, 24]} p={[0, 0.45, 0]} c="#bdb39d" />
        <Cyl a={[2.8, 2.8, 0.1, 24]} p={[0, 0.85, 0]} c="#3aa0d8" e="#1d78a8" ei={0.4} />
        <Cyl a={[0.35, 0.5, 2.6, 8]} p={[0, 1.8, 0]} c="#bdb39d" />
        <Sph a={[0.5, 10, 8]} p={[0, 3.3, 0]} c="#7df9ff" e="#7df9ff" ei={0.9} />
      </group>
      {[-12, 12].map((x) => [-4, 8, 20].map((z) => <Banner key={`${x}${z}`} p={[x, heightAt(x, z), z]} color={z === 8 ? '#0f9f6e' : '#c2851e'} h={4} />))}
      {[-4, 4].map((x) => [-6, 12].map((z) => <Lantern key={`${x}${z}`} p={[x, heightAt(x, z), z]} />))}

      <Fx p={[0, 5, 0]} area={[56, 9, 56]} count={50} color="#ffe9a8" size={4} reduced={reduced} coarse={coarse} opacity={0.6} />
    </>
  );
}

export const WORLD6: WorldDef = {
  id: 6,
  theme: {
    skyTop: '#6fb2f0', skyBottom: '#ffe9c8', fog: '#f1e2c0', fogNear: 55, fogFar: 170,
    hemiSky: '#fff4dc', hemiGround: '#5f7a4a', hemiIntensity: 0.95, sun: '#ffd9a0', sunIntensity: 1.6, sunPosition: [-26, 36, 24],
  },
  terrain: { size: 170, segments: 120, palette: { low: '#6f9a52', mid: '#7fae5d', high: '#9ab36a', cliff: '#8d8a80', lowY: -2, highY: 10, cliffSlope: 0.3 } },
  radius: 36, spawn: [0, 30], heightAt, obstacles,
  boss: { position: [0, -8], facing: 0 }, Scene,
};
