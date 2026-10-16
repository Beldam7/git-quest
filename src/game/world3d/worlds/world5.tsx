import { Html } from '@react-three/drei';
import { Box, Bridge, Cn, Cyl, Fx, Glow, Island, Scatter, Tower, Trees, Wall, Banner, Torus, scatter, useSmooth } from '../kit';
import type { V3 } from '../kit';
import { fbm, smoothstep } from '../noise';
import type { Circle, SceneProps, WorldDef } from '../types';

/** WORLD 5: THE REMOTE KINGDOM. A floating home island linked to distant kingdoms by a portal, beacons and bridges. */

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = 2.6 + (fbm(x * 0.07 + 4, z * 0.07 + 1) - 0.5) * 2 + 2.2 * (1 - Math.min(1, (r / 34) ** 2));
  y -= smoothstep(27, 35, r) * 70;
  return y;
};

const HOUSES: Array<[number, number, number]> = [[-17, 9, 0.5], [-20, -2, 0.2], [17, 10, -0.5], [20, 0, -0.2], [-12, 18, 0.8], [13, 19, -0.8]];
const TREES = scatter(51, 26, { rMin: 8, rMax: 25, h: heightAt, sMin: 0.8, sMax: 1.3, reject: (x, z) => Math.hypot(x, z) < 12 || HOUSES.some(([hx, hz]) => Math.hypot(x - hx, z - hz) < 5) || z < -12 });
const CLOUDS = scatter(52, 36, { rMin: 38, rMax: 130, h: () => 0, sMin: 3, sMax: 8 }).map((c, i) => ({ ...c, y: -14 + (i % 9) * 3, sy: 0.45 }));

const obstacles: Circle[] = [
  ...HOUSES.map(([x, z]): Circle => [x, z, 3]),
  [-7, -24, 3], [7, -24, 3], [-16, -8, 1.6], [16, -22, 1.4],
  ...TREES.map((t): Circle => [t.x, t.z, 0.6 * (t.s ?? 1)]),
];

function House({ p, ry }: { p: V3; ry: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Box a={[4, 2.6, 3.4]} p={[0, 1.3, 0]} c="#d9c9a3" />
      <Cn a={[3.2, 1.8, 4]} p={[0, 3.5, 0]} r={[0, Math.PI / 4, 0]} c="#b5532f" s={[1, 1, 0.9]} />
      <Box a={[0.7, 1.2, 0.1]} p={[0, 0.7, 1.72]} c="#4d3220" />
      <Box a={[0.6, 0.6, 0.1]} p={[1.2, 1.5, 1.72]} c="#1b2236" e="#f5b942" ei={0.9} />
    </group>
  );
}

function Beacon({ p, lit, warn, color = '#f5b942' }: { p: V3; lit: boolean; warn?: boolean; color?: string }) {
  const level = useSmooth(lit || warn ? 1 : 0.1, 1.5);
  const c = warn ? '#ff4d4d' : color;
  return (
    <group position={p}>
      <Cyl a={[1.1, 1.6, 8, 8]} p={[0, 4, 0]} c="#9b9484" />
      <Cyl a={[1.8, 1.8, 0.5, 8]} p={[0, 8.2, 0]} c="#6f6a5e" />
      <Glow level={level} min={0.1} max={3} color={c} p={[0, 9.2, 0]}><sphereGeometry args={[0.9, 12, 10]} /></Glow>
      <Glow level={level} min={0} max={1.5} color={c} p={[0, 24, 0]} opacity={[0, 0.28]}><cylinderGeometry args={[0.5, 1.1, 30, 12, 1, true]} /></Glow>
    </group>
  );
}

function RemoteIsland({ p, s, lit }: { p: V3; s: number; lit: boolean }) {
  return (
    <Island p={p} s={s} grass="#5fbf7a" reduced={false}>
      <Tower p={[0, 0, 0]} r={1.8} h={8} color="#c9bda0" roof="#2b5cc4" />
      <Wall p={[-3.5, 0, 1]} len={4} h={3} thick={0.8} color="#c9bda0" />
      <Beacon p={[3, 0, -1]} lit={lit} />
    </Island>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const portal = useSmooth(signals.hasRemote ? 1 : 0.12, 1.2);
  const incoming = signals.fetched || signals.pushed;
  return (
    <>
      <Scatter items={CLOUDS}><sphereGeometry args={[1, 10, 8]} /><meshStandardMaterial color="#ffffff" emissive="#dfefff" emissiveIntensity={0.5} transparent opacity={0.85} flatShading={false} /></Scatter>
      <Trees items={TREES} kind="round" trunk="#6b4528" leaf="#4fae6a" leaf2="#6cc784" />

      {/* Plaza */}
      <Cyl a={[11, 11.5, 0.5, 32]} p={[0, heightAt(0, 0) + 0.15, 0]} c="#c9bda0" />
      <Torus a={[8, 0.1, 6, 40]} p={[0, heightAt(0, 0) + 0.45, 0]} r={[Math.PI / 2, 0, 0]} c="#f5b942" e="#f5b942" ei={0.5} />
      {HOUSES.map(([x, z, ry], i) => <House key={i} p={[x, heightAt(x, z), z]} ry={ry} />)}
      <Banner p={[-5, heightAt(-5, 8), 8]} color="#2b5cc4" />
      <Banner p={[5, heightAt(5, 8), 8]} color="#2b5cc4" />

      {/* The remote portal: awakens once a remote exists */}
      <group position={[0, heightAt(0, -12), -12]}>
        <Box a={[1.2, 6.5, 1.2]} p={[-3.4, 3.2, 0]} c="#9b9484" />
        <Box a={[1.2, 6.5, 1.2]} p={[3.4, 3.2, 0]} c="#9b9484" />
        <Glow level={portal} min={0.1} max={2.6} color="#52e0ff" p={[0, 4, 0]}><torusGeometry args={[3.1, 0.28, 14, 48]} /></Glow>
        <Glow level={portal} min={0} max={1.2} color="#52e0ff" p={[0, 4, 0]} opacity={[0.04, 0.5]}><circleGeometry args={[2.9, 40]} /></Glow>
      </group>

      {/* Gatekeeper's fortified gate */}
      <group position={[0, heightAt(0, -24), -24]}>
        <Tower p={[-7, 0, 0]} r={2.6} h={14} color="#c9bda0" roof="#2b5cc4" />
        <Tower p={[7, 0, 0]} r={2.6} h={14} color="#c9bda0" roof="#2b5cc4" />
        <Box a={[12, 3, 2.4]} p={[0, 9.5, 0]} c="#c9bda0" />
        <Box a={[3, 8, 2.4]} p={[-4.5, 4, 0]} c="#c9bda0" />
        <Box a={[3, 8, 2.4]} p={[4.5, 4, 0]} c="#c9bda0" />
        <Box a={[6, 8, 0.5]} p={[0, 4, -0.2]} c="#3a3f55" />
      </group>

      {/* Beacons: one local (lit once something is pushed), a warning beacon for rejected pushes */}
      <Beacon p={[-16, heightAt(-16, -8), -8]} lit={signals.pushed} />
      <Beacon p={[16, heightAt(16, -22), -22]} lit={false} warn={signals.rejectedPush} />
      {signals.rejectedPush && (
        <Html center position={[16, heightAt(16, -22) + 13, -22]} distanceFactor={18} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-lg border border-red-400 bg-kq-deep/90 px-3 py-1.5 text-sm text-red-200">Push rejected: the remote has changes you don&apos;t. Pull first.</div>
        </Html>
      )}

      {/* Docks and a moored airship */}
      <group position={[24, heightAt(24, 8) + 0.2, 8]}>
        <Box a={[10, 0.4, 3]} p={[4, 0, 0]} c="#7a5a35" />
        {[0, 3, 6, 9].map((x) => [-1.4, 1.4].map((z) => <Cyl key={`${x}${z}`} a={[0.2, 0.2, 5, 6]} p={[x, -2, z]} c="#4d3220" />))}
      </group>
      <group position={[36, 1.2, 6]} rotation={[0, 0.4, 0]}>
        <Box a={[8, 1.6, 3]} p={[0, 0, 0]} c="#7a5a35" />
        <Cn a={[1.5, 3, 4]} p={[4.6, 0.2, 0]} r={[0, 0, -Math.PI / 2]} c="#7a5a35" />
        <Cyl a={[0.1, 0.1, 7, 6]} p={[0, 4, 0]} c="#4d3220" />
        <Box a={[4, 5, 0.1]} p={[0.2, 4.2, 0.2]} c="#f4ecd4" />
      </group>

      {/* Distant kingdoms and the bridges toward them */}
      <RemoteIsland p={[-66, 2, -8]} s={1.7} lit={incoming} />
      <RemoteIsland p={[62, 3, -34]} s={1.5} lit={incoming} />
      <RemoteIsland p={[8, 4, -96]} s={2.2} lit={signals.pushed} />
      <Bridge a={[-30, -3]} b={[-54, -7]} y={2.9} width={2.2} gap={incoming ? 0 : 0.3} />

      <Fx p={[0, 6, 0]} area={[60, 12, 60]} count={50} color="#fff6d0" size={4} reduced={reduced} coarse={coarse} opacity={0.6} />
      {signals.pushed && <Fx p={[-16, 14, -8]} area={[3, 20, 3]} count={40} color="#f5b942" size={6} speed={1.2} reduced={reduced} coarse={coarse} />}
    </>
  );
}

export const WORLD5: WorldDef = {
  id: 5,
  theme: {
    skyTop: '#3f95f0', skyBottom: '#d6ecff', fog: '#d6ecff', fogNear: 55, fogFar: 190,
    hemiSky: '#e8f4ff', hemiGround: '#5a7a58', hemiIntensity: 1.0, sun: '#fff4d6', sunIntensity: 1.6, sunPosition: [26, 44, 20],
  },
  terrain: { size: 170, segments: 130, palette: { low: '#8b7e66', mid: '#5fbf7a', high: '#8fd18a', cliff: '#9a8d74', lowY: -4, highY: 4.5, cliffSlope: 0.28 } },
  radius: 27, spawn: [0, 22], heightAt, obstacles,
  boss: { position: [0, -17], facing: 0 }, Scene,
};
