import { Box, Cn, Cyl, Fx, Glow, Island, Rocks, Scatter, Tower, Trees, Wall, Water, Banner, Bridge, Crystals, Lantern, line, scatter, useSmooth } from '../kit';
import { bump, fbm, flatten, smoothstep } from '../noise';
import type { Circle, SceneProps, WorldDef } from '../types';
import { distToPath, roadProfile, smoothPath } from '../path';

/** WORLD 1: THE FORGOTTEN REPOSITORY. Mossy castle ruins, rolling hills, a stream, and a dormant shrine that awakens on `git init`. */

const SHRINE: [number, number] = [0, -12];
const WALL_Z = -31;
const PATH_PTS = smoothPath([[0, 26], [-7, 21], [-3, 16], [0, 13], [0, 8], [0, 3], [5, -1], [9, -3], [8, -6]]);
const ROAD = roadProfile(PATH_PTS, 2.6, 30, 9);

const heightAt = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let y = (fbm(x * 0.045 + 3, z * 0.045 + 7) - 0.45) * 9;
  y += ROAD(x, z);
  y += bump(x, z, 0, -40, 28, 6);
  y = flatten(y, x, z, SHRINE[0], SHRINE[1], 8, 15, 1.2);
  y = flatten(y, x, z, 0, 24, 6, 12, 0.6);
  const sx = z - (8 + Math.sin(x * 0.12) * 4);
  y -= 2.4 * Math.exp(-(sx * sx) / (2 * 1.7 * 1.7));
  y += smoothstep(42, 78, r) * 30 * (0.5 + fbm(x * 0.03, z * 0.03));
  return y;
};

const BRIDGE_Y = Math.max(heightAt(0, 13), heightAt(0, 3)) + 0.3;

const notOnPath = (x: number, z: number, y: number) =>
  y < -0.2 || (Math.abs(x) < 3.5 && z > -16 && z < 27) || Math.hypot(x - SHRINE[0], z - SHRINE[1]) < 9 || z < WALL_Z + 3 || Math.hypot(x, z - 24) < 3 || distToPath(PATH_PTS, x, z) < 3.4;

const PINES = scatter(11, 46, { rMin: 24, rMax: 50, h: heightAt, sMin: 0.9, sMax: 1.5, reject: notOnPath });
const OAKS = scatter(12, 40, { rMin: 10, rMax: 40, h: heightAt, sMin: 0.8, sMax: 1.3, reject: notOnPath });
const ROCKS = scatter(13, 24, { rMax: 46, h: heightAt, sMin: 0.6, sMax: 1.5, reject: notOnPath });
const FLOWERS_Y = scatter(14, 90, { rMax: 24, cz: 20, h: heightAt, sMin: 0.7, sMax: 1.2, reject: (x, z, y) => y < 0 || notOnPath(x, z, y) });
const FLOWERS_P = scatter(15, 90, { rMax: 24, cz: 14, h: heightAt, sMin: 0.7, sMax: 1.2, reject: (x, z, y) => y < 0 || notOnPath(x, z, y) });
const CRYSTALS = scatter(16, 12, { rMin: 8, rMax: 14, cx: SHRINE[0], cz: SHRINE[1], h: heightAt, sMin: 0.7, sMax: 1.6, reject: (x, z) => Math.hypot(x, z - SHRINE[1]) < 7 || Math.abs(x) < 3 });
const PATH = line(0, 25, 0, SHRINE[1] + 5, 2.3, heightAt, 0.35, 5, 0.07);

const wallCircles: Circle[] = [];
for (let x = -26; x <= 26; x += 4) wallCircles.push([x, WALL_Z, 2.4]);
const obstacles: Circle[] = [
  [SHRINE[0], SHRINE[1], 3],
  ...[0, 1, 2, 3].map((i): Circle => [Math.cos(Math.PI / 4 + (i * Math.PI) / 2) * 4.6 + SHRINE[0], Math.sin(Math.PI / 4 + (i * Math.PI) / 2) * 4.6 + SHRINE[1], 0.9]),
  ...wallCircles,
  ...PINES.map((t): Circle => [t.x, t.z, 0.6 * (t.s ?? 1)]),
  ...OAKS.map((t): Circle => [t.x, t.z, 0.6 * (t.s ?? 1)]),
  ...ROCKS.map((t): Circle => [t.x, t.z, 0.9 * (t.s ?? 1)]),
];

function Shrine({ awake }: { awake: boolean }) {
  const level = useSmooth(awake ? 1 : 0, 1.1);
  const [sx, sz] = SHRINE;
  return (
    <group position={[sx, heightAt(sx, sz), sz]}>
      <Cyl a={[3.6, 4, 0.5, 20]} p={[0, 0.25, 0]} c="#8d8a80" />
      <Cyl a={[2.7, 2.7, 0.3, 20]} p={[0, 0.65, 0]} c="#6f6c64" />
      <Glow level={level} min={0.05} max={1.9} color="#3dd6f5" p={[0, 0.82, 0]} r={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 2.4, 48]} />
      </Glow>
      <Cyl a={[0.55, 0.75, 2.2, 8]} p={[0, 1.9, 0]} c="#7d7a70" />
      <Glow level={level} min={0.1} max={2.4} color="#3dd6f5" p={[0, 3.6, 0]}>
        <octahedronGeometry args={[0.75, 0]} />
      </Glow>
      <Glow level={level} min={0} max={1.4} color="#7df9ff" p={[0, 8, 0]} opacity={[0, 0.3]}>
        <cylinderGeometry args={[0.35, 0.9, 10, 12, 1, true]} />
      </Glow>
      {[0, 1, 2, 3].map((i) => {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const x = Math.cos(a) * 4.6;
        const z = Math.sin(a) * 4.6;
        return (
          <group key={i} position={[x, 0, z]} rotation={[0, Math.atan2(-x, -z), 0]}>
            <Box a={[1, 3.4, 0.7]} p={[0, 1.7, 0]} c="#7a776d" />
            <Cn a={[0.55, 0.7, 4]} p={[0, 3.75, 0]} c="#7a776d" r={[0, Math.PI / 4, 0]} />
            <Glow level={level} min={0.05} max={2} color="#3dd6f5" p={[0, 2, 0.37]}>
              <boxGeometry args={[0.3, 1.5, 0.04]} />
            </Glow>
            <Glow level={level} min={0.05} max={2} color="#3dd6f5" p={[0, 1.4, 0.37]}>
              <boxGeometry args={[0.7, 0.18, 0.04]} />
            </Glow>
          </group>
        );
      })}
    </group>
  );
}

function CastleGate({ awake }: { awake: boolean }) {
  const sealed = useSmooth(awake ? 0 : 1, 1.1);
  const y = heightAt(0, WALL_Z);
  return (
    <group position={[0, y, WALL_Z]}>
      <Box a={[2, 9, 2.4]} p={[-5, 4.5, 0]} c="#8d8a80" />
      <Box a={[2, 9, 2.4]} p={[5, 4.5, 0]} c="#8d8a80" />
      <Box a={[12, 2, 2.4]} p={[0, 9.9, 0]} c="#8d8a80" />
      <Cn a={[1.6, 2.4, 4]} p={[-5, 10.2, 0]} c="#2b5cc4" r={[0, Math.PI / 4, 0]} />
      <Cn a={[1.6, 2.4, 4]} p={[5, 10.2, 0]} c="#2b5cc4" r={[0, Math.PI / 4, 0]} />
      <Box a={[8, 8, 0.5]} p={[0, 4, 0]} c="#2a2433" />
      <Glow level={sealed} min={0} max={1.6} color="#8b5cf6" p={[0, 4, 0.3]} opacity={[0, 0.55]}>
        <planeGeometry args={[8, 8]} />
      </Glow>
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const awake = signals.initialized;
  const lanterns = useSmooth(awake ? 1 : 0.15, 1);
  return (
    <>
      <Water y={-0.45} color="#2f8fb8" />
      <Trees items={PINES} kind="pine" trunk="#4d3321" leaf="#2a6b3a" leaf2="#347a42" />
      <Trees items={OAKS} kind="round" trunk="#5b3b24" leaf="#4a9a45" leaf2="#5fb257" />
      <Rocks items={ROCKS} color="#7b7f88" moss="#4f7a3f" />
      <Scatter items={FLOWERS_Y} lift={0.15}><sphereGeometry args={[0.16, 6, 5]} /><meshStandardMaterial color="#f8d34a" emissive="#f8d34a" emissiveIntensity={0.25} /></Scatter>
      <Scatter items={FLOWERS_P} lift={0.15}><sphereGeometry args={[0.16, 6, 5]} /><meshStandardMaterial color="#f48fb1" emissive="#f48fb1" emissiveIntensity={0.2} /></Scatter>
      <Scatter items={PATH}><boxGeometry args={[1.7, 0.14, 1.3]} /><meshStandardMaterial color="#9b978c" flatShading /></Scatter>
      <Bridge a={[0, 14]} b={[0, 2]} y={BRIDGE_Y} />

      {/* Castle ruins */}
      {[-24, -17, -10, 10, 17, 24].map((x, i) => (
        <Wall key={x} p={[x, heightAt(x, WALL_Z), WALL_Z]} len={7} h={i % 2 ? 6 : 8} thick={2.2} color="#8d8a80" moss="#5f8a49" ruined={i % 2 === 1} />
      ))}
      <Tower p={[-27, heightAt(-27, WALL_Z), WALL_Z]} r={2.6} h={13} color="#8d8a80" ruined />
      <Tower p={[27, heightAt(27, WALL_Z), WALL_Z]} r={2.6} h={15} color="#8d8a80" />
      <Tower p={[-13, heightAt(-13, WALL_Z - 6), WALL_Z - 6]} r={2.3} h={17} color="#8d8a80" />
      <Tower p={[13, heightAt(13, WALL_Z - 6), WALL_Z - 6]} r={2.3} h={12} color="#8d8a80" ruined />
      <CastleGate awake={awake} />
      <Banner p={[-8, heightAt(-8, WALL_Z + 2), WALL_Z + 2]} h={4} />
      <Banner p={[8, heightAt(8, WALL_Z + 2), WALL_Z + 2]} h={4} color="#1f8a63" />

      <Shrine awake={awake} />
      <Crystals items={CRYSTALS} color="#3dd6f5" level={lanterns} min={0.2} max={1.8} />
      {[-4, 4].map((x) => [18, 8, -4].map((z) => <Lantern key={`${x}${z}`} p={[x, heightAt(x, z), z]} level={lanterns} />))}

      <Island p={[-44, 22, -34]} s={1.2} reduced={reduced}><Tower p={[0, 0, 0]} r={1.3} h={5} /></Island>
      <Island p={[48, 28, -50]} s={1.6} reduced={reduced} />
      <Island p={[-58, 34, 10]} s={1} reduced={reduced}><Trees items={[{ x: 0, y: 0, z: 0, s: 1.2 }, { x: 2, y: 0, z: 1, s: 1 }]} kind="round" /></Island>

      <Fx p={[0, 5, SHRINE[1]]} area={[26, 9, 26]} count={awake ? 70 : 12} color="#7df9ff" size={5} reduced={reduced} coarse={coarse} />
      <Fx p={[0, 3, 22]} area={[30, 5, 20]} count={36} color="#fff2b0" size={3} reduced={reduced} coarse={coarse} />
    </>
  );
}

export const WORLD1: WorldDef = {
  id: 1,
  theme: {
    skyTop: '#2d63b8', skyBottom: '#bcd8f0', fog: '#bcd8f0', fogNear: 40, fogFar: 150,
    hemiSky: '#cfe6ff', hemiGround: '#4a6b3a', hemiIntensity: 0.9, sun: '#fff1d0', sunIntensity: 1.7, sunPosition: [30, 40, 18],
  },
  terrain: { size: 170, segments: 130, palette: { low: '#5a8f48', mid: '#6fae55', high: '#8a9a6a', cliff: '#7a7f88', lowY: -1, highY: 14, cliffSlope: 0.3 } },
  radius: 44, spawn: PATH_PTS[0], path: PATH_PTS, heightAt, obstacles,
  bridges: [{ a: [0, 14], b: [0, 2], y: BRIDGE_Y, width: 2.4 }], boss: { position: [13, -9], facing: -0.6 }, Scene,
};
