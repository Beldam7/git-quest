import { Box, Cn, Cyl, Fx, Glow, Scatter, Sph, scatter, useSmooth } from '../kit';
import type { Item } from '../kit';
import { bump, fbm, flatten } from '../noise';
import { ROAD_CORRIDOR, distToPath, makePath, pointAt, roadProfile, smoothPath } from '../path';
import type { Circle, SceneProps, WorldDef } from '../types';

/** SECRET MAP 102: THE MOONLIT SANCTUM (Silent Guardian). A hedge avenue leads to ward stones that wake as .gitignore rules are added. */

const PATH_PTS = smoothPath([[0, 30], [8, 24], [-6, 16], [6, 8], [-3, 0], [0, -8]]);
const PATH = makePath(PATH_PTS);
const ROAD = roadProfile(PATH_PTS, 1.8, 22, 8);

const heightAt = (x: number, z: number): number => {
  let y = (fbm(x * 0.07 + 5, z * 0.07 + 31) - 0.45) * 3;
  y += ROAD(x, z);
  y += bump(x, z, 0, -30, 14, 1.5);
  y = flatten(y, x, z, 0, 30, 4, 9, 0.4);
  y += Math.max(0, Math.hypot(x, z) - 38) * 0.8;
  return y;
};

// Hedge avenue: dense green walls just outside the walkable corridor, so the boundary is visible
const HEDGES: Item[] = [];
for (let s = 1; s < PATH.total; s += 2.4) {
  const [x, z] = pointAt(PATH, s);
  const [bx, bz] = pointAt(PATH, s + 1);
  const [ax, az] = pointAt(PATH, s - 1);
  const len = Math.hypot(bx - ax, bz - az) || 1;
  const nx = -(bz - az) / len;
  const nz = (bx - ax) / len;
  const ry = Math.atan2(bx - ax, bz - az);
  for (const side of [-1, 1]) {
    const hx = x + nx * side * (ROAD_CORRIDOR + 0.9);
    const hz = z + nz * side * (ROAD_CORRIDOR + 0.9);
    HEDGES.push({ x: hx, y: heightAt(hx, hz), z: hz, ry, s: 1 });
  }
}
const FLOWERS = scatter(121, 80, { rMax: 38, h: heightAt, sMin: 0.7, sMax: 1.2, reject: (x, z) => distToPath(PATH_PTS, x, z) < 2.5 || Math.hypot(x, z + 30) < 10 });

const obstacles: Circle[] = [[-7, -10, 1.2], [7, -10, 1.2], [0, -30, 8]];

function WardStone({ x, z, on }: { x: number; z: number; on: boolean }) {
  const lvl = useSmooth(on ? 1 : 0.05, 1.5);
  return (
    <group position={[x, heightAt(x, z), z]}>
      <Box a={[1.6, 4, 1.2]} p={[0, 2, 0]} c="#6b6a86" />
      <Cn a={[1.1, 1.2, 4]} p={[0, 4.6, 0]} r={[0, Math.PI / 4, 0]} c="#6b6a86" />
      <Glow level={lvl} min={0.05} max={2.6} color="#c4b5fd" p={[0, 2.2, 0.62]}><boxGeometry args={[0.7, 1.8, 0.05]} /></Glow>
      <Glow level={lvl} min={0.05} max={2.6} color="#c4b5fd" p={[0, 2.2, 0.62]} r={[0, 0, Math.PI / 2]}><boxGeometry args={[0.3, 1.2, 0.05]} /></Glow>
    </group>
  );
}

function Scene({ signals, reduced, coarse }: SceneProps) {
  const rules = signals.ignoreRules;
  const ring = useSmooth(Math.min(1, rules / 3), 1.2);
  return (
    <>
      <Scatter items={HEDGES} lift={1.4} castShadow><boxGeometry args={[2.8, 2.8, 1.8]} /><meshStandardMaterial color="#1c4a3a" flatShading roughness={1} /></Scatter>
      <Scatter items={FLOWERS} lift={0.25}><sphereGeometry args={[0.22, 6, 5]} /><meshStandardMaterial color="#c4b5fd" emissive="#a78bfa" emissiveIntensity={0.9} /></Scatter>

      {/* Ward stones: one wakes for each rule you add to .gitignore */}
      <WardStone x={-7} z={-10} on={rules >= 1} />
      <WardStone x={7} z={-10} on={rules >= 2} />
      <WardStone x={0} z={-24} on={rules >= 3} />
      <Glow level={ring} min={0.1} max={1.8} color="#c4b5fd" p={[0, heightAt(0, -16) + 0.15, -16]} r={[-Math.PI / 2, 0, 0]}><ringGeometry args={[5.4, 6, 48]} /></Glow>

      {/* Sanctum gate */}
      <group position={[0, heightAt(0, -34), -34]}>
        {[-5, 5].map((x) => <Cyl key={x} a={[1, 1.2, 12, 10]} p={[x, 6, 0]} c="#7d7ca0" />)}
        <Box a={[13, 1.6, 2]} p={[0, 12.6, 0]} c="#7d7ca0" />
        <Cn a={[3, 3, 4]} p={[0, 14.8, 0]} r={[0, Math.PI / 4, 0]} c="#5e5d8a" />
        <Glow level={ring} min={0.15} max={2.2} color="#c4b5fd" p={[0, 6, 0]} opacity={[0.05, 0.4]}><planeGeometry args={[8, 11]} /></Glow>
      </group>

      {/* The moon */}
      <Sph a={[7, 20, 16]} p={[-46, 44, -70]} c="#f3efff" e="#e4dcff" ei={1.4} shadow={false} />
      <Fx p={[0, 3, 0]} area={[60, 6, 70]} count={90} color="#c4b5fd" size={5} speed={0.25} reduced={reduced} coarse={coarse} />
    </>
  );
}

export const SECRET102: WorldDef = {
  id: 102,
  theme: {
    skyTop: '#0b0820', skyBottom: '#3a2f6b', fog: '#2a2352', fogNear: 28, fogFar: 110,
    hemiSky: '#b6a8ff', hemiGround: '#1c1a3a', hemiIntensity: 0.8, sun: '#d8d0ff', sunIntensity: 1.0, sunPosition: [-26, 40, 20], stars: 1100,
  },
  terrain: { size: 150, segments: 110, palette: { low: '#2d4a3d', mid: '#3d6b52', high: '#6b8f6e', cliff: '#3d3a63', lowY: -1, highY: 6, cliffSlope: 0.3 } },
  radius: 36, spawn: PATH_PTS[0], path: PATH_PTS, heightAt, obstacles,
  boss: { position: [0, -18], facing: 0 }, Scene,
};
