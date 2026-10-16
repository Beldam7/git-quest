import { Box, Bridge, Cn, Cyl, Fx, Glow, Rocks, Scatter, Tower, Water, scatter, useSmooth } from '../kit';
import { fbm, flatten, smoothstep } from '../noise';
import type { Circle, SceneProps, WorldDef } from '../types';
import { distToPath, roadProfile, smoothPath } from '../path';

/** WORLD 8: THE DRAGON'S CITADEL. An obsidian fortress above lava; its towers ignite as quests are completed. */

const PATH_PTS = smoothPath([[0, 24], [-9, 20], [9, 18], [0, 14], [0, 10], [0, 6], [0, 2], [0, -2]]);
const ROAD = roadProfile(PATH_PTS, 2.0, 26, 7);
const riverZ = (x: number) => 8 + Math.sin(x * 0.08) * 3;
const onBridgeStrip = (x: number, z: number) => Math.abs(x) < 1.7 && Math.abs(z - riverZ(x)) < 6;

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = (fbm(x * 0.06 + 11, z * 0.06 + 5) - 0.45) * 5;
  y += ROAD(x, z) * smoothstep(6, 11, Math.abs(z - riverZ(x)));
  y -= 3.6 * Math.exp(-((z - riverZ(x)) ** 2) / (2 * 3 * 3));
  y -= 3 * Math.exp(-((x + 22 + Math.sin(z * 0.1) * 4) ** 2) / (2 * 2.4 * 2.4)) * smoothstep(20, 0, z);
  y = flatten(y, x, z, 0, 22, 6, 12, 0.7);
  y = flatten(y, x, z, 0, -10, 12, 20, 0.9);
  y += smoothstep(40, 70, r) * 28 * (0.5 + fbm(x * 0.04, z * 0.04));
  return y;
};

const LAVA_Y = -1.2;
const ROCKS = scatter(81, 40, { rMax: 40, h: heightAt, sMin: 0.7, sMax: 2, reject: (x, z, y) => y < -0.4 || Math.abs(x) < 4 || Math.hypot(x, z + 10) < 14 || z < -22 || distToPath(PATH_PTS, x, z) < 3 });
const SPIKES = scatter(82, 30, { rMin: 14, rMax: 44, h: heightAt, sMin: 1, sMax: 2.6, reject: (x, z, y) => y < -0.4 || Math.hypot(x, z + 10) < 14 || distToPath(PATH_PTS, x, z) < 3 });

const obstacles: Circle[] = [
  [-26, -26, 4.4], [26, -26, 4.4], [-26, -48, 4.4], [26, -48, 4.4], [0, -42, 11], [0, -26.5, 3.4],
  ...Array.from({ length: 12 }, (_, i): Circle => [-22 + i * 4, -26, 2.2]).filter(([x]) => Math.abs(x) > 5),
  ...ROCKS.map((t): Circle => [t.x, t.z, 0.9 * (t.s ?? 1)]),
  ...SPIKES.map((t): Circle => [t.x, t.z, 0.8 * (t.s ?? 1)]),
];

function Orb({ p, on }: { p: [number, number, number]; on: boolean }) {
  const lvl = useSmooth(on ? 1 : 0.08, 1.4);
  return <Glow level={lvl} min={0.1} max={3} color="#ffb347" p={p}><sphereGeometry args={[1.1, 14, 12]} /></Glow>;
}

function Citadel({ progress, victory }: { progress: number; victory: boolean }) {
  const gate = useSmooth(victory ? 1 : 0.35, 1.2);
  const banner = useSmooth(victory ? 1 : 0, 1.2);
  const gy = heightAt(0, -26);
  return (
    <group position={[0, gy, -26]}>
      {/* Curtain wall with a central gate */}
      {[-14, 14].map((x) => <Box key={x} a={[18, 9, 3]} p={[x, 4.5, 0]} c="#2a2433" />)}
      {[-14, 14].map((x) => <Box key={`m${x}`} a={[18, 0.9, 3.4]} p={[x, 9.4, 0]} c="#1c1726" />)}
      <Box a={[10, 3, 3]} p={[0, 10.5, 0]} c="#2a2433" />
      <Box a={[8, 9, 0.8]} p={[0, 4.5, 0.1]} c="#120d18" />
      <Glow level={gate} min={0.2} max={2.2} color="#ff6a1a" p={[0, 4.5, 0.55]}><boxGeometry args={[6.6, 8, 0.1]} /></Glow>
      {[-26, 26].map((x, i) => (
        <group key={x} position={[x, 0, 0]}>
          <Tower p={[0, 0, 0]} r={4} h={22} color="#2a2433" roof="#4a1a3a" window="#ff6a1a" />
          <Orb p={[0, 27, 0]} on={progress >= (i === 0 ? 0.25 : 0.5)} />
        </group>
      ))}
      {/* Inner keep */}
      <group position={[0, 0, -22]}>
        <Box a={[30, 12, 16]} p={[0, 6, 0]} c="#241d2e" />
        <Tower p={[-12, 0, 0]} r={3.4} h={26} color="#2a2433" roof="#4a1a3a" window="#ff6a1a" />
        <Tower p={[12, 0, 0]} r={3.4} h={26} color="#2a2433" roof="#4a1a3a" window="#ff6a1a" />
        <Orb p={[-12, 31, 0]} on={progress >= 0.75} />
        <Orb p={[12, 31, 0]} on={progress >= 0.9 || victory} />
        <Cn a={[5, 16, 6]} p={[0, 20, 0]} c="#3a1a4a" r={[0, Math.PI / 6, 0]} />
        <Glow level={gate} min={0.2} max={2.4} color={victory ? '#ffd24d' : '#ff4d1a'} p={[0, 30, 0]}><octahedronGeometry args={[1.6, 0]} /></Glow>
      </group>
      {[-8, 8].map((x) => (
        <group key={`b${x}`} position={[x, 7.2, 1.8]}>
          <Box a={[0.12, 5, 0.12]} p={[0, 0, 0]} c="#1c1726" />
          <Box a={[2, 5, 0.08]} p={[0, -0.6, 0.1]} c="#8a1a2a" />
          <Glow level={banner} min={0} max={1.2} color="#f5b942" p={[0, -0.6, 0.16]}><boxGeometry args={[1.5, 4.6, 0.04]} /></Glow>
        </group>
      ))}
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const victory = signals.worldProgress >= 1;
  const lavaGlow = useSmooth(0.7, 1);
  const by = 0.7;
  return (
    <>
      <Water y={LAVA_Y} color="#ff5a14" emissive="#ff3d00" opacity={1} />
      <Rocks items={ROCKS} color="#2c2630" />
      <Scatter items={SPIKES} lift={2.2} castShadow><coneGeometry args={[0.9, 4.4, 5]} /><meshStandardMaterial color="#1c1726" flatShading roughness={0.9} /></Scatter>
      <Bridge a={[0, 16]} b={[0, 0]} y={by} width={3} wood="#3a3340" rail="#1c1726" />

      <Citadel progress={signals.worldProgress} victory={victory} />

      {/* Arena ring */}
      <group position={[0, heightAt(0, -10), -10]}>
        <Cyl a={[12, 12.6, 0.7, 36]} p={[0, 0.3, 0]} c="#2a2433" />
        <Glow level={lavaGlow} min={0.3} max={1.6} color="#ff6a1a" p={[0, 0.7, 0]} r={[-Math.PI / 2, 0, 0]}><ringGeometry args={[8.4, 9, 48]} /></Glow>
      </group>

      {/* Distant volcano */}
      <group position={[-55, -4, -80]}>
        <Cn a={[34, 44, 9]} p={[0, 22, 0]} c="#241d2e" />
        <Glow level={lavaGlow} min={0.8} max={2.4} color="#ff6a1a" p={[0, 44, 0]}><sphereGeometry args={[6, 10, 8]} /></Glow>
      </group>

      <pointLight position={[0, 2, 8]} color="#ff5a14" intensity={150} distance={34} />
      <pointLight position={[0, 2, -10]} color="#ff7a2a" intensity={120} distance={30} />
      <Fx p={[0, 10, -10]} area={[80, 28, 90]} count={150} color="#ff9a4d" size={6} speed={1.1} reduced={reduced} coarse={coarse} />
      {victory && <Fx p={[0, 18, -30]} area={[40, 30, 20]} count={120} color="#ffe08a" size={8} speed={0.9} reduced={reduced} coarse={coarse} />}
    </>
  );
}

export const WORLD8: WorldDef = {
  id: 8,
  theme: {
    skyTop: '#15081c', skyBottom: '#8a2e1c', fog: '#4a1a1c', fogNear: 28, fogFar: 135,
    hemiSky: '#ff9a6a', hemiGround: '#2a0f10', hemiIntensity: 0.7, sun: '#ff8a4a', sunIntensity: 1.1, sunPosition: [-24, 22, 30],
  },
  terrain: { size: 170, segments: 130, palette: { low: '#1f1a25', mid: '#2c2630', high: '#463d52', cliff: '#150f1a', lowY: -3, highY: 14, cliffSlope: 0.26 } },
  radius: 38, spawn: PATH_PTS[0], path: PATH_PTS, heightAt, obstacles,
  bridges: [{ a: [0, 16], b: [0, 0], y: 0.7, width: 3 }],
  groundAt: (x, z) => (onBridgeStrip(x, z) ? 0.7 : heightAt(x, z)),
  walkable: (x, z) => heightAt(x, z) > -0.8 || onBridgeStrip(x, z),
  boss: { position: [0, -14], facing: 0 }, Scene,
};
