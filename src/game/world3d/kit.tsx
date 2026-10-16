import { useLayoutEffect, useMemo, useRef } from 'react';
import type { MutableRefObject, ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { rng, smoothstep, vnoise } from './noise';
import type { TerrainPalette, WorldTheme } from './types';

export type V3 = [number, number, number];

/* ---------------------------------------------------------------- reactive values */

/** Eases toward `target` every frame. Read `.current` inside useFrame; avoids React re-renders. */
export function useSmooth(target: number, rate = 2): MutableRefObject<number> {
  const v = useRef(0);
  useFrame((_, dt) => {
    v.current += (target - v.current) * Math.min(1, dt * rate);
  });
  return v;
}

/* ---------------------------------------------------------------- primitive helpers */

interface PartProps {
  p?: V3;
  r?: V3;
  s?: V3 | number;
  c?: string;
  e?: string;
  ei?: number;
  rough?: number;
  metal?: number;
  opacity?: number;
  shadow?: boolean;
  smooth?: boolean;
}

function Mat({ c = '#888888', e, ei = 1, rough = 0.85, metal = 0, opacity, smooth }: PartProps) {
  return (
    <meshStandardMaterial
      color={c}
      roughness={rough}
      metalness={metal}
      emissive={e ?? '#000000'}
      emissiveIntensity={e ? ei : 0}
      transparent={opacity !== undefined}
      opacity={opacity ?? 1}
      flatShading={!smooth}
      side={opacity !== undefined ? THREE.DoubleSide : THREE.FrontSide}
    />
  );
}

export function Box({ a = [1, 1, 1], ...m }: PartProps & { a?: V3 }) {
  return (
    <mesh position={m.p} rotation={m.r} scale={m.s} castShadow={m.shadow !== false} receiveShadow>
      <boxGeometry args={a} />
      <Mat {...m} />
    </mesh>
  );
}
export function Cyl({ a = [0.5, 0.5, 1, 10], ...m }: PartProps & { a?: [number, number, number, number] }) {
  return (
    <mesh position={m.p} rotation={m.r} scale={m.s} castShadow={m.shadow !== false} receiveShadow>
      <cylinderGeometry args={a} />
      <Mat {...m} />
    </mesh>
  );
}
export function Cn({ a = [0.5, 1, 8], ...m }: PartProps & { a?: [number, number, number] }) {
  return (
    <mesh position={m.p} rotation={m.r} scale={m.s} castShadow={m.shadow !== false}>
      <coneGeometry args={a} />
      <Mat {...m} />
    </mesh>
  );
}
export function Sph({ a = [0.5, 12, 10], ...m }: PartProps & { a?: [number, number, number] }) {
  return (
    <mesh position={m.p} rotation={m.r} scale={m.s} castShadow={m.shadow !== false}>
      <sphereGeometry args={a} />
      <Mat {...m} />
    </mesh>
  );
}
export function Torus({ a = [1, 0.1, 10, 32], ...m }: PartProps & { a?: [number, number, number, number] }) {
  return (
    <mesh position={m.p} rotation={m.r} scale={m.s}>
      <torusGeometry args={a} />
      <Mat {...m} />
    </mesh>
  );
}

/** A mesh whose emissive intensity follows a smoothed 0..1 level (the way world state lights things up). */
export function Glow({
  level, min = 0.05, max = 2, color, p, r, s, children, opacity,
}: {
  level: MutableRefObject<number>;
  min?: number;
  max?: number;
  color: string;
  p?: V3;
  r?: V3;
  s?: V3 | number;
  opacity?: [number, number];
  children: ReactNode;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    m.emissiveIntensity = min + (max - min) * level.current;
    if (opacity) m.opacity = opacity[0] + (opacity[1] - opacity[0]) * level.current;
  });
  return (
    <mesh position={p} rotation={r} scale={s}>
      {children}
      <meshStandardMaterial
        ref={mat}
        color={color}
        emissive={color}
        emissiveIntensity={min}
        roughness={0.35}
        transparent={!!opacity}
        opacity={opacity ? opacity[0] : 1}
        side={opacity ? THREE.DoubleSide : THREE.FrontSide}
        depthWrite={!opacity}
      />
    </mesh>
  );
}

/** Ambient magical motes. */
export function Fx({
  p = [0, 4, 0], area = [30, 8, 30], count = 60, size = 4, color = '#9ee7ff', speed = 0.3, reduced, coarse, opacity = 0.8,
}: {
  p?: V3; area?: V3; count?: number; size?: number; color?: string; speed?: number; reduced: boolean; coarse: boolean; opacity?: number;
}) {
  return (
    <Sparkles position={p} scale={area} count={coarse ? Math.ceil(count / 2) : count} size={size} speed={reduced ? 0 : speed} color={color} opacity={opacity} />
  );
}

/* ---------------------------------------------------------------- terrain */

export function Terrain({
  heightAt, size, segments, palette,
}: {
  heightAt: (x: number, z: number) => number;
  size: number;
  segments: number;
  palette: TerrainPalette;
}) {
  const geometry = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, segments, segments);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) pos.setY(i, heightAt(pos.getX(i), pos.getZ(i)));
    g.computeVertexNormals();
    const nrm = g.attributes.normal as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const low = new THREE.Color(palette.low);
    const mid = new THREE.Color(palette.mid);
    const high = new THREE.Color(palette.high);
    const cliff = new THREE.Color(palette.cliff);
    const bandA = palette.bands ? new THREE.Color(palette.bands[0]) : null;
    const bandB = palette.bands ? new THREE.Color(palette.bands[1]) : null;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const slope = 1 - nrm.getY(i);
      const t = smoothstep(palette.lowY, palette.highY, y);
      c.copy(low).lerp(mid, Math.min(1, t * 2)).lerp(high, Math.max(0, t * 2 - 1));
      if (slope > palette.cliffSlope) {
        if (bandA && bandB) c.copy(Math.floor(y / (palette.bandSize ?? 1.4)) & 1 ? bandA : bandB);
        else c.copy(cliff);
      }
      c.multiplyScalar(0.88 + 0.24 * vnoise(x * 0.35, z * 0.35));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [heightAt, size, segments, palette]);

  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial vertexColors flatShading roughness={1} />
    </mesh>
  );
}

export function Water({ y, size = 220, color = '#2a7fb8', opacity = 0.75, emissive }: { y: number; size?: number; color?: string; opacity?: number; emissive?: string }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, y, 0]}>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={color} transparent opacity={opacity} roughness={0.12} metalness={0.25} emissive={emissive ?? '#000000'} emissiveIntensity={emissive ? 0.5 : 0} />
    </mesh>
  );
}

/* ---------------------------------------------------------------- scattering */

export interface Item {
  x: number;
  y: number;
  z: number;
  s?: number;
  /** Extra vertical stretch. */
  sy?: number;
  ry?: number;
}

export function scatter(
  seed: number,
  n: number,
  o: {
    rMin?: number; rMax: number; cx?: number; cz?: number;
    h: (x: number, z: number) => number;
    sMin?: number; sMax?: number;
    reject?: (x: number, z: number, y: number) => boolean;
  }
): Item[] {
  const rand = rng(seed);
  const out: Item[] = [];
  const cx = o.cx ?? 0;
  const cz = o.cz ?? 0;
  for (let tries = 0; out.length < n && tries < n * 12; tries++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (o.rMax - (o.rMin ?? 0)) + (o.rMin ?? 0);
    const x = cx + Math.cos(a) * r;
    const z = cz + Math.sin(a) * r;
    const y = o.h(x, z);
    if (o.reject?.(x, z, y)) continue;
    out.push({ x, y, z, s: (o.sMin ?? 0.8) + rand() * ((o.sMax ?? 1.3) - (o.sMin ?? 0.8)), ry: rand() * Math.PI * 2 });
  }
  return out;
}

/** Items evenly spaced along a line (paths, rows of columns, plank trails). */
export function line(ax: number, az: number, bx: number, bz: number, step: number, h: (x: number, z: number) => number, jitter = 0, seed = 1, lift = 0): Item[] {
  const rand = rng(seed);
  const len = Math.hypot(bx - ax, bz - az);
  const n = Math.max(1, Math.floor(len / step));
  const ang = Math.atan2(bx - ax, bz - az);
  const out: Item[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = ax + (bx - ax) * t + (rand() - 0.5) * jitter;
    const z = az + (bz - az) * t + (rand() - 0.5) * jitter;
    out.push({ x, y: h(x, z) + lift, z, ry: ang + (rand() - 0.5) * 0.2, s: 0.9 + rand() * 0.2 });
  }
  return out;
}

/** GPU-instanced copies of the child geometry/material. `lift` raises each copy by lift * scale. */
export function Scatter({
  items, children, lift = 0, glow, castShadow = false, flip = false,
}: {
  items: Item[];
  children: ReactNode;
  lift?: number;
  glow?: { level: MutableRefObject<number>; min: number; max: number };
  castShadow?: boolean;
  /** Turn each instance upside down (stalactites). */
  flip?: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      const s = it.s ?? 1;
      o.position.set(it.x, it.y + lift * s * (it.sy ?? 1), it.z);
      o.rotation.set(flip ? Math.PI : 0, it.ry ?? 0, 0);
      o.scale.set(s, s * (it.sy ?? 1), s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [items, lift, flip]);
  useFrame(() => {
    if (!glow || !ref.current) return;
    const mat = ref.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = glow.min + (glow.max - glow.min) * glow.level.current;
  });
  if (items.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]} castShadow={castShadow} frustumCulled={false}>
      {children}
    </instancedMesh>
  );
}

export type TreeKind = 'pine' | 'round' | 'dead' | 'mushroom' | 'crystal';

export function Trees({
  items, kind, trunk = '#5b3b24', leaf = '#2f7d3a', leaf2, glowColor,
}: {
  items: Item[]; kind: TreeKind; trunk?: string; leaf?: string; leaf2?: string; glowColor?: string;
}) {
  const stuff = () => {
    switch (kind) {
      case 'pine':
        return (
          <>
            <Scatter items={items} lift={1}><cylinderGeometry args={[0.18, 0.28, 2, 6]} /><meshStandardMaterial color={trunk} flatShading /></Scatter>
            <Scatter items={items} lift={2.9} castShadow><coneGeometry args={[1.5, 2.8, 7]} /><meshStandardMaterial color={leaf} flatShading /></Scatter>
            <Scatter items={items} lift={4.4}><coneGeometry args={[1.1, 2.3, 7]} /><meshStandardMaterial color={leaf2 ?? leaf} flatShading /></Scatter>
            <Scatter items={items} lift={5.7}><coneGeometry args={[0.65, 1.7, 7]} /><meshStandardMaterial color={leaf} flatShading /></Scatter>
          </>
        );
      case 'round':
        return (
          <>
            <Scatter items={items} lift={1.3}><cylinderGeometry args={[0.22, 0.34, 2.6, 6]} /><meshStandardMaterial color={trunk} flatShading /></Scatter>
            <Scatter items={items} lift={3.5} castShadow><icosahedronGeometry args={[1.7, 0]} /><meshStandardMaterial color={leaf} flatShading /></Scatter>
            <Scatter items={items} lift={4.6}><icosahedronGeometry args={[1.1, 0]} /><meshStandardMaterial color={leaf2 ?? leaf} flatShading /></Scatter>
          </>
        );
      case 'dead':
        return (
          <>
            <Scatter items={items} lift={1.8}><cylinderGeometry args={[0.1, 0.3, 3.6, 5]} /><meshStandardMaterial color={trunk} flatShading /></Scatter>
            <Scatter items={items} lift={3.4}><coneGeometry args={[0.5, 1.4, 4]} /><meshStandardMaterial color={trunk} flatShading /></Scatter>
          </>
        );
      case 'mushroom':
        return (
          <>
            <Scatter items={items} lift={0.9}><cylinderGeometry args={[0.28, 0.4, 1.8, 8]} /><meshStandardMaterial color="#e6dcc4" flatShading /></Scatter>
            <Scatter items={items} lift={2}><sphereGeometry args={[1.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={leaf} emissive={glowColor ?? leaf} emissiveIntensity={0.5} flatShading /></Scatter>
          </>
        );
      default:
        return (
          <>
            <Scatter items={items} lift={1.6}><octahedronGeometry args={[0.8, 0]} /><meshStandardMaterial color={leaf} emissive={glowColor ?? leaf} emissiveIntensity={0.7} flatShading /></Scatter>
          </>
        );
    }
  };
  return <>{stuff()}</>;
}

export function Rocks({ items, color = '#6b6f7a', moss }: { items: Item[]; color?: string; moss?: string }) {
  return (
    <>
      <Scatter items={items} lift={0.45} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color={color} flatShading roughness={1} /></Scatter>
      {moss && <Scatter items={items} lift={0.95}><sphereGeometry args={[0.7, 7, 5, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color={moss} flatShading roughness={1} /></Scatter>}
    </>
  );
}

export function Crystals({
  items, color = '#3dd6f5', level, min = 0.8, max = 1.6,
}: {
  items: Item[]; color?: string; level?: MutableRefObject<number>; min?: number; max?: number;
}) {
  return (
    <Scatter items={items} lift={1} glow={level ? { level, min, max } : undefined}>
      <octahedronGeometry args={[0.6, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={min} roughness={0.2} flatShading />
    </Scatter>
  );
}

/* ---------------------------------------------------------------- structures */

export function Column({ p, h = 5, r = 0.45, color = '#9a9486', broken = false }: { p: V3; h?: number; r?: number; color?: string; broken?: boolean }) {
  const hh = broken ? h * 0.55 : h;
  return (
    <group position={p}>
      <Box a={[r * 2.8, 0.35, r * 2.8]} p={[0, 0.17, 0]} c={color} />
      <Cyl a={[r, r * 1.1, hh, 10]} p={[0, 0.35 + hh / 2, 0]} c={color} />
      {!broken && <Box a={[r * 3, 0.4, r * 3]} p={[0, 0.35 + hh + 0.2, 0]} c={color} />}
      {broken && <Cn a={[r * 0.9, 0.7, 5]} p={[0.1, 0.35 + hh + 0.3, 0]} c={color} r={[0.2, 0, 0.3]} />}
    </group>
  );
}

export function Wall({
  p, ry = 0, len = 8, h = 4, thick = 1.2, color = '#8d8a80', moss, ruined = false, crenels = true,
}: {
  p: V3; ry?: number; len?: number; h?: number; thick?: number; color?: string; moss?: string; ruined?: boolean; crenels?: boolean;
}) {
  const merlons = useMemo(() => {
    const n = Math.max(2, Math.floor(len / 1.4));
    return Array.from({ length: n }, (_, i) => ({ x: -len / 2 + (i + 0.5) * (len / n), y: h + 0.3, z: 0, s: 1, ry: 0 }));
  }, [len, h]);
  const hh = ruined ? h * 0.7 : h;
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Box a={[len, hh, thick]} p={[0, hh / 2, 0]} c={color} />
      {crenels && !ruined && (
        <Scatter items={merlons}><boxGeometry args={[0.8, 0.6, thick + 0.15]} /><meshStandardMaterial color={color} flatShading /></Scatter>
      )}
      {ruined && (
        <>
          <Box a={[len * 0.3, h * 0.35, thick]} p={[len * 0.32, hh + h * 0.15, 0]} c={color} r={[0, 0, 0.05]} />
          <Box a={[0.9, 0.7, 0.9]} p={[-len * 0.2, 0.35, thick]} c={color} r={[0.2, 0.5, 0.1]} />
          <Box a={[0.7, 0.5, 0.7]} p={[len * 0.1, 0.25, -thick]} c={color} r={[0.1, 0.9, 0.2]} />
        </>
      )}
      {moss && <Box a={[len * 0.98, 0.35, thick + 0.1]} p={[0, hh, 0]} c={moss} />}
    </group>
  );
}

export function Tower({
  p, r = 2, h = 9, color = '#8d8a80', roof = '#2b5cc4', ruined = false, window: win = '#f5b942',
}: {
  p: V3; r?: number; h?: number; color?: string; roof?: string; ruined?: boolean; window?: string;
}) {
  const hh = ruined ? h * 0.65 : h;
  return (
    <group position={p}>
      <Cyl a={[r, r * 1.12, hh, 12]} p={[0, hh / 2, 0]} c={color} />
      <Torus a={[r * 1.02, 0.18, 6, 16]} p={[0, hh, 0]} r={[Math.PI / 2, 0, 0]} c={color} />
      {!ruined ? <Cn a={[r * 1.35, r * 1.9, 12]} p={[0, hh + r * 0.95, 0]} c={roof} rough={0.6} /> : <Box a={[r * 0.8, 1.2, r * 0.7]} p={[r * 0.4, hh + 0.4, 0]} c={color} r={[0.1, 0.4, 0.2]} />}
      <Box a={[0.35, 0.8, 0.12]} p={[0, hh * 0.65, r * 1.02]} c="#1b2236" e={win} ei={0.9} />
      <Box a={[0.35, 0.8, 0.12]} p={[0, hh * 0.35, -r * 1.02]} c="#1b2236" e={win} ei={0.9} />
    </group>
  );
}

export function Banner({ p, ry = 0, color = '#2b5cc4', trim = '#f5b942', h = 3.2 }: { p: V3; ry?: number; color?: string; trim?: string; h?: number }) {
  return (
    <group position={p} rotation={[0, ry, 0]}>
      <Cyl a={[0.07, 0.07, h + 0.8, 6]} p={[0, (h + 0.8) / 2, 0]} c="#4a2f1a" />
      <Box a={[1.1, 0.07, 0.07]} p={[0, h + 0.7, 0]} c={trim} metal={0.6} />
      <Box a={[0.95, h * 0.8, 0.05]} p={[0, h * 0.5 + 0.2, 0.06]} c={color} />
      <Box a={[0.95, 0.12, 0.06]} p={[0, h * 0.1 + 0.15, 0.065]} c={trim} />
    </group>
  );
}

export function Lantern({ p, color = '#ffcf80', level }: { p: V3; color?: string; level?: MutableRefObject<number> }) {
  return (
    <group position={p}>
      <Cyl a={[0.05, 0.05, 1.6, 6]} p={[0, 0.8, 0]} c="#2b2118" />
      {level ? (
        <Glow level={level} min={0.15} max={2.4} color={color} p={[0, 1.7, 0]}><sphereGeometry args={[0.2, 8, 8]} /></Glow>
      ) : (
        <Sph a={[0.2, 8, 8]} p={[0, 1.7, 0]} c={color} e={color} ei={1.8} shadow={false} />
      )}
    </group>
  );
}

/**
 * Plank bridge from (ax,az) to (bx,bz) at height y. `gap` (0..0.8) removes that fraction from the middle,
 * leaving broken ends: used to show a world that is "broken" until the player fixes it.
 */
export function Bridge({
  a, b, y, width = 2.4, gap = 0, wood = '#7a5a35', rail = '#4d3220', glow,
}: {
  a: [number, number]; b: [number, number]; y: number; width?: number; gap?: number; wood?: string; rail?: string;
  glow?: { level: MutableRefObject<number>; color: string };
}) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const ang = Math.atan2(b[0] - a[0], b[1] - a[1]);
  const planks = useMemo(() => {
    const n = Math.floor(len / 0.62);
    const out: Item[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (gap > 0 && t > 0.5 - gap / 2 && t < 0.5 + gap / 2) continue;
      out.push({ x: a[0] + (b[0] - a[0]) * t, y, z: a[1] + (b[1] - a[1]) * t, ry: ang, s: 1 });
    }
    return out;
  }, [a, b, y, len, gap, ang]);
  const segs: Array<[number, number]> = gap > 0 ? [[0, 0.5 - gap / 2], [0.5 + gap / 2, 1]] : [[0, 1]];
  return (
    <group>
      <Scatter items={planks} castShadow><boxGeometry args={[width, 0.14, 0.5]} /><meshStandardMaterial color={wood} flatShading /></Scatter>
      {segs.map(([t0, t1], i) => {
        const mid = (t0 + t1) / 2;
        const l = len * (t1 - t0);
        return (
          <group key={i} position={[a[0] + (b[0] - a[0]) * mid, y, a[1] + (b[1] - a[1]) * mid]} rotation={[0, ang, 0]}>
            {[-1, 1].map((side) => (
              <group key={side}>
                <Box a={[0.09, 0.09, l]} p={[side * (width / 2), 0.95, 0]} c={rail} />
                <Box a={[0.12, 0.5, l]} p={[side * (width / 2), 0.35, 0]} c={rail} />
              </group>
            ))}
          </group>
        );
      })}
      {glow && (
        <Glow level={glow.level} min={0} max={2.2} color={glow.color} p={[(a[0] + b[0]) / 2, y + 0.12, (a[1] + b[1]) / 2]} r={[0, ang, 0]} opacity={[0, 0.55]}>
          <boxGeometry args={[width * 0.8, 0.03, len]} />
        </Glow>
      )}
    </group>
  );
}

/** A floating island with a grassy top and hanging rock; children are placed on its surface. */
export function Island({
  p, s = 1, grass = '#49b383', rock = '#4a5f8f', reduced, children,
}: {
  p: V3; s?: number; grass?: string; rock?: string; reduced: boolean; children?: ReactNode;
}) {
  const g = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (g.current && !reduced) g.current.position.y = p[1] + Math.sin(st.clock.elapsedTime * 0.5 + p[0]) * 0.35;
  });
  return (
    <group ref={g} position={p} scale={s}>
      <mesh position={[0, -2.2, 0]} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[6, 5, 8]} />
        <meshStandardMaterial color={rock} emissive="#1a2a4f" emissiveIntensity={0.6} roughness={1} flatShading />
      </mesh>
      <mesh receiveShadow>
        <cylinderGeometry args={[6.2, 6, 0.8, 8]} />
        <meshStandardMaterial color={grass} roughness={0.9} flatShading />
      </mesh>
      <group position={[0, 0.4, 0]}>{children}</group>
    </group>
  );
}

/* ---------------------------------------------------------------- lighting */

export function WorldLighting({ theme, coarse }: { theme: WorldTheme; coarse: boolean }) {
  return (
    <>
      <fog attach="fog" args={[theme.fog, theme.fogNear, theme.fogFar]} />
      <hemisphereLight args={[theme.hemiSky, theme.hemiGround, theme.hemiIntensity]} />
      <directionalLight
        position={theme.sunPosition}
        intensity={theme.sunIntensity}
        color={theme.sun}
        castShadow={!coarse}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-46}
        shadow-camera-right={46}
        shadow-camera-top={46}
        shadow-camera-bottom={-46}
        shadow-camera-far={140}
        shadow-bias={-0.0004}
      />
    </>
  );
}
