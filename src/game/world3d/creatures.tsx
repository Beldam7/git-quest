import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, Cn, Cyl, Sph, Torus } from './kit';
import type { V3 } from './kit';

/**
 * Procedural creature models (stylised, built from primitives). They are NOT final art:
 * see docs/DESIGN.md "Temporary assets". All face +Z and stand with their feet at y = 0.
 * Creatures are scenery/presentation only. No combat is simulated here.
 */

function useIdle(ref: React.RefObject<THREE.Group>, reduced: boolean, amp = 0.1, speed = 1.5) {
  useFrame((st) => {
    if (ref.current && !reduced) ref.current.position.y = Math.sin(st.clock.elapsedTime * speed) * amp;
  });
}

/* ------------------------------------------------------------ regular enemies */

export function Goblin({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useIdle(g, reduced, 0.06, 3);
  return (
    <group ref={g}>
      <Cyl a={[0.1, 0.12, 0.5, 6]} p={[-0.18, 0.28, 0]} c="#3f7a2e" />
      <Cyl a={[0.1, 0.12, 0.5, 6]} p={[0.18, 0.28, 0]} c="#3f7a2e" />
      <Cn a={[0.5, 0.95, 8]} p={[0, 0.95, 0]} c="#4d8f36" />
      <Cyl a={[0.45, 0.5, 0.22, 8]} p={[0, 0.62, 0]} c="#6b4528" />
      <Sph a={[0.34, 12, 10]} p={[0, 1.55, 0.04]} s={[1.1, 1, 1]} c="#5aa63e" />
      <Cn a={[0.1, 0.55, 4]} p={[-0.46, 1.62, 0]} r={[0, 0, 1.9]} c="#5aa63e" />
      <Cn a={[0.1, 0.55, 4]} p={[0.46, 1.62, 0]} r={[0, 0, -1.9]} c="#5aa63e" />
      <Sph a={[0.07, 8, 8]} p={[-0.13, 1.6, 0.3]} c="#ffd34d" e="#ffb300" ei={1.2} shadow={false} />
      <Sph a={[0.07, 8, 8]} p={[0.13, 1.6, 0.3]} c="#ffd34d" e="#ffb300" ei={1.2} shadow={false} />
      <Cn a={[0.07, 0.22, 5]} p={[0, 1.5, 0.38]} r={[1.5, 0, 0]} c="#4d8f36" />
      <Box a={[0.06, 0.55, 0.05]} p={[0.55, 0.9, 0.2]} c="#c8ccd6" metal={0.8} rough={0.3} r={[0.5, 0, 0]} />
      <Cyl a={[0.06, 0.06, 0.55, 6]} p={[-0.42, 1.0, 0.05]} r={[0, 0, 0.5]} c="#3f7a2e" />
    </group>
  );
}

export function Skeleton({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useIdle(g, reduced, 0.04, 2);
  const bone = '#e8e2d0';
  return (
    <group ref={g}>
      {[-0.16, 0.16].map((x) => (
        <group key={x}>
          <Cyl a={[0.06, 0.05, 0.55, 6]} p={[x, 0.3, 0]} c={bone} />
          <Cyl a={[0.06, 0.05, 0.5, 6]} p={[x, 0.82, 0]} c={bone} />
        </group>
      ))}
      <Box a={[0.5, 0.18, 0.25]} p={[0, 1.12, 0]} c={bone} />
      <Cyl a={[0.04, 0.04, 0.5, 6]} p={[0, 1.4, 0]} c={bone} />
      {[0, 1, 2].map((i) => (
        <Torus key={i} a={[0.26 - i * 0.02, 0.025, 5, 12]} p={[0, 1.3 + i * 0.16, 0]} r={[Math.PI / 2, 0, 0]} c={bone} />
      ))}
      {[-0.34, 0.34].map((x) => (
        <Cyl key={x} a={[0.04, 0.04, 0.8, 6]} p={[x, 1.35, 0]} r={[0, 0, x > 0 ? -0.15 : 0.15]} c={bone} />
      ))}
      <Sph a={[0.2, 12, 10]} p={[0, 1.95, 0]} c={bone} />
      <Box a={[0.22, 0.1, 0.18]} p={[0, 1.78, 0.06]} c={bone} />
      <Sph a={[0.05, 8, 8]} p={[-0.08, 1.97, 0.16]} c="#0a0a0a" e="#7df9ff" ei={1.4} shadow={false} />
      <Sph a={[0.05, 8, 8]} p={[0.08, 1.97, 0.16]} c="#0a0a0a" e="#7df9ff" ei={1.4} shadow={false} />
      <Cyl a={[0.3, 0.3, 0.05, 14]} p={[-0.5, 1.25, 0.15]} r={[Math.PI / 2, 0, 0]} c="#6b4528" />
      <Box a={[0.06, 0.8, 0.04]} p={[0.55, 1.2, 0.1]} c="#b8c2d2" metal={0.8} rough={0.3} />
    </group>
  );
}

export function Slime({ reduced = false, color = '#4ade80' }: { reduced?: boolean; color?: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (!g.current || reduced) return;
    const t = st.clock.elapsedTime * 2.2;
    g.current.scale.set(1 + Math.sin(t) * 0.06, 1 - Math.sin(t) * 0.1, 1 + Math.sin(t) * 0.06);
  });
  return (
    <group ref={g}>
      <Sph a={[0.7, 16, 12]} p={[0, 0.55, 0]} s={[1, 0.8, 1]} c={color} opacity={0.72} rough={0.15} smooth />
      <Sph a={[0.25, 10, 8]} p={[0, 0.5, 0]} c="#16a34a" e="#22c55e" ei={0.6} shadow={false} />
      <Sph a={[0.09, 8, 8]} p={[-0.2, 0.75, 0.55]} c="#fff" shadow={false} />
      <Sph a={[0.09, 8, 8]} p={[0.2, 0.75, 0.55]} c="#fff" shadow={false} />
      <Sph a={[0.045, 8, 8]} p={[-0.2, 0.75, 0.63]} c="#102010" shadow={false} />
      <Sph a={[0.045, 8, 8]} p={[0.2, 0.75, 0.63]} c="#102010" shadow={false} />
    </group>
  );
}

export function ShadowWraith({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useIdle(g, reduced, 0.2, 1.2);
  return (
    <group ref={g} position={[0, 0.8, 0]}>
      <Cn a={[0.8, 2.2, 8]} p={[0, 0.9, 0]} r={[Math.PI, 0, 0]} c="#2a1745" opacity={0.85} />
      <Sph a={[0.38, 12, 10]} p={[0, 2.15, 0]} c="#1a0d2e" />
      <Sph a={[0.07, 8, 8]} p={[-0.14, 2.2, 0.3]} c="#e9d5ff" e="#c084fc" ei={2.2} shadow={false} />
      <Sph a={[0.07, 8, 8]} p={[0.14, 2.2, 0.3]} c="#e9d5ff" e="#c084fc" ei={2.2} shadow={false} />
      {[-0.7, 0.7].map((x) => (
        <Cn key={x} a={[0.18, 1.1, 5]} p={[x, 1.4, 0.2]} r={[0.4, 0, x > 0 ? -1.2 : 1.2]} c="#2a1745" opacity={0.7} />
      ))}
    </group>
  );
}

/* ------------------------------------------------------------ bosses */

/** World 1: The Untracked Beast, a hulking brute. */
export function UntrackedBeast({ reduced = false, hide = '#5b6b3a', inner = '#7a8a52' }: { reduced?: boolean; hide?: string; inner?: string }) {
  const g = useRef<THREE.Group>(null);
  useIdle(g, reduced, 0.08, 1.3);
  return (
    <group ref={g}>
      {[-0.7, 0.7].map((x) => (
        <group key={x}>
          <Cyl a={[0.5, 0.6, 1.8, 8]} p={[x, 0.9, 0]} c="#4a5830" />
          <Box a={[0.9, 0.35, 1.2]} p={[x, 0.18, 0.2]} c="#2d2418" />
        </group>
      ))}
      <Sph a={[1.6, 14, 12]} p={[0, 2.8, 0]} s={[1.1, 1.1, 0.95]} c={hide} />
      <Sph a={[1.1, 12, 10]} p={[0, 2.3, 0.7]} c={inner} />
      <Sph a={[0.75, 12, 10]} p={[0, 4.35, 0.5]} s={[1.1, 1, 1]} c={hide} />
      <Box a={[0.9, 0.35, 0.5]} p={[0, 4.0, 1.1]} c="#2d2418" />
      {[-0.35, 0.35].map((x) => (
        <group key={x}>
          <Sph a={[0.11, 8, 8]} p={[x, 4.55, 1.12]} c="#ffd34d" e="#ff8a00" ei={1.6} shadow={false} />
          <Cn a={[0.12, 0.7, 5]} p={[x * 1.4, 3.9, 1.3]} r={[Math.PI, 0, x > 0 ? -0.3 : 0.3]} c="#f1e6c8" />
          <Cn a={[0.2, 1.0, 6]} p={[x * 1.9, 4.9, 0.3]} r={[0, 0, x > 0 ? -0.5 : 0.5]} c="#3d3426" />
          <Cyl a={[0.38, 0.44, 1.7, 8]} p={[x * 2.7, 2.7, 0.2]} r={[0.2, 0, x > 0 ? -0.3 : 0.3]} c={hide} />
        </group>
      ))}
      <Cyl a={[0.18, 0.26, 2.6, 8]} p={[2.4, 3.3, 1.0]} r={[0.3, 0, -0.2]} c="#5b3b24" />
      <Sph a={[0.7, 10, 8]} p={[2.6, 4.7, 1.3]} c="#4a2f1a" />
      {[0, 1, 2, 3].map((i) => (
        <Cn key={i} a={[0.14, 0.4, 5]} p={[-0.5 + i * 0.33, 4.2 - 0, -0.5]} c="#f1e6c8" r={[-0.6, 0, 0]} />
      ))}
    </group>
  );
}

/** Secret: The Ghost Commit, a tall spectral figure circled by lost commits. */
export function GhostCommit({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);
  useFrame((st, dt) => {
    if (reduced) return;
    if (g.current) g.current.position.y = 1.4 + Math.sin(st.clock.elapsedTime * 1.1) * 0.35;
    if (orbit.current) orbit.current.rotation.y += dt * 0.9;
  });
  return (
    <group ref={g} position={[0, 1.4, 0]}>
      <Cn a={[1.6, 5.2, 10]} p={[0, 2.4, 0]} r={[Math.PI, 0, 0]} c="#b9d4ff" e="#6fa8ff" ei={0.5} opacity={0.62} rough={0.2} />
      <Sph a={[0.75, 14, 12]} p={[0, 5.4, 0]} c="#dcebff" e="#9ec5ff" ei={0.7} opacity={0.75} />
      <Sph a={[0.12, 8, 8]} p={[-0.28, 5.5, 0.62]} c="#08142a" shadow={false} />
      <Sph a={[0.12, 8, 8]} p={[0.28, 5.5, 0.62]} c="#08142a" shadow={false} />
      {[-1, 1].map((x) => <Cn key={x} a={[0.3, 2.6, 5]} p={[x * 1.7, 3, 0.4]} r={[0.3, 0, x * -1.1]} c="#b9d4ff" e="#6fa8ff" ei={0.4} opacity={0.5} />)}
      <group ref={orbit} position={[0, 3.6, 0]}>
        {[0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2;
          return <Sph key={i} a={[0.32, 10, 8]} p={[Math.cos(a) * 3, Math.sin(i) * 0.6, Math.sin(a) * 3]} c="#7df9ff" e="#52e0ff" ei={1.8} shadow={false} />;
        })}
      </group>
    </group>
  );
}

/** World 2: The History Eater, a many-eyed devourer of commit history. */
export function HistoryEater({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const tent = useRef<THREE.Group>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (g.current && !reduced) g.current.position.y = Math.sin(t * 1.1) * 0.25;
    if (tent.current && !reduced) tent.current.children.forEach((c, i) => (c.rotation.z = Math.sin(t * 1.4 + i) * 0.25));
  });
  return (
    <group>
      <group ref={g} position={[0, 3, 0]}>
        <Sph a={[2.4, 16, 12]} s={[1, 0.9, 1]} c="#5b2a86" rough={0.5} smooth />
        <Sph a={[1.15, 12, 10]} p={[0, -0.2, 1.7]} s={[1, 0.8, 0.6]} c="#12061f" />
        {Array.from({ length: 10 }, (_, i) => {
          const a = (i / 10) * Math.PI * 2;
          return <Cn key={i} a={[0.1, 0.5, 4]} p={[Math.cos(a) * 0.95, -0.2 + Math.sin(a) * 0.65, 2.05]} r={[Math.PI / 2, 0, 0]} c="#f1e6c8" shadow={false} />;
        })}
        {[[-1.1, 1.2, 1.9], [0.2, 1.7, 1.9], [1.2, 1.0, 1.9], [-0.4, 0.6, 2.2], [1.7, 0.2, 1.7], [-1.8, 0.3, 1.5]].map(([x, y, z], i) => (
          <group key={i}>
            <Sph a={[0.28, 10, 8]} p={[x, y, z]} c="#f4eaff" shadow={false} />
            <Sph a={[0.14, 8, 8]} p={[x, y, z + 0.2]} c="#2a0a40" e="#d946ef" ei={1.5} shadow={false} />
          </group>
        ))}
        <group ref={tent} position={[0, -1.6, 0]}>
          {[-1.8, -0.9, 0, 0.9, 1.8].map((x, i) => (
            <group key={i} position={[x, 0, -0.4 + (i % 2) * 0.8]}>
              <Cn a={[0.28, 2.6, 6]} p={[0, -1.1, 0]} r={[Math.PI, 0, 0]} c="#3f1c60" />
              <Sph a={[0.2, 8, 8]} p={[0, -2.5, 0]} c="#a855f7" e="#a855f7" ei={0.8} shadow={false} />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
}

/** World 3: The Branch Guardian, an ancient living tree. */
export function BranchGuardian({ reduced = false }: { reduced?: boolean }) {
  const arms = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (arms.current && !reduced) arms.current.rotation.x = Math.sin(st.clock.elapsedTime * 0.9) * 0.08;
  });
  const bark = '#5a3d27';
  return (
    <group>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return <Cn key={i} a={[0.5, 2.6, 5]} p={[Math.cos(a) * 1.5, 0.5, Math.sin(a) * 1.5]} r={[Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1]} c={bark} />;
      })}
      <Cyl a={[1.5, 2.1, 5.2, 10]} p={[0, 2.8, 0]} c={bark} />
      <Cyl a={[1.1, 1.5, 2.4, 10]} p={[0, 5.9, 0]} c="#4d3320" />
      <Box a={[0.5, 0.18, 0.2]} p={[-0.55, 5.0, 1.2]} r={[0, 0, 0.25]} c="#1a0f08" />
      <Box a={[0.5, 0.18, 0.2]} p={[0.55, 5.0, 1.2]} r={[0, 0, -0.25]} c="#1a0f08" />
      <Sph a={[0.2, 8, 8]} p={[-0.55, 4.7, 1.35]} c="#baffc9" e="#4ade80" ei={2.4} shadow={false} />
      <Sph a={[0.2, 8, 8]} p={[0.55, 4.7, 1.35]} c="#baffc9" e="#4ade80" ei={2.4} shadow={false} />
      <Box a={[0.9, 0.35, 0.3]} p={[0, 3.9, 1.5]} c="#1a0f08" />
      <group ref={arms}>
        {[-1, 1].map((side) => (
          <group key={side}>
            <Cyl a={[0.4, 0.55, 3.4, 8]} p={[side * 2.6, 5.2, 0.8]} r={[0.5, 0, side * -0.9]} c={bark} />
            <Sph a={[1.0, 8, 6]} p={[side * 3.9, 6.4, 1.8]} c="#2f8a4a" />
            <Sph a={[0.7, 8, 6]} p={[side * 4.4, 6.9, 1.3]} c="#3fae5e" />
          </group>
        ))}
      </group>
      {[[0, 8.6, 0, 2.6], [-1.9, 8.0, 0.4, 1.9], [1.9, 8.1, -0.3, 2.0], [0.2, 9.6, 0.2, 1.7]].map(([x, y, z, r], i) => (
        <Sph key={i} a={[r, 8, 6]} p={[x, y, z]} c={i % 2 ? '#2f8a4a' : '#3fae5e'} />
      ))}
    </group>
  );
}

/* ---- Dragons (World 4: Conflict Dragon, World 8: Merge Dragon) ---- */

let wingGeometry: THREE.BufferGeometry | null = null;
const WING_PTS: V3[] = [[0, 0, 0], [1.7, 1.5, 0], [3.6, 0.9, -0.2], [3.0, -0.7, 0], [2.0, -1.2, 0], [1.0, -1.0, 0]];
function getWingGeometry(): THREE.BufferGeometry {
  if (wingGeometry) return wingGeometry;
  const tris = [[0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5]];
  const pos: number[] = [];
  tris.forEach((t) => t.forEach((i) => pos.push(WING_PTS[i][0], WING_PTS[i][1], WING_PTS[i][2])));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  wingGeometry = g;
  return g;
}

function Strut({ a, b, c }: { a: V3; b: V3; c: string }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return <Box a={[len, 0.14, 0.14]} p={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]} r={[0, 0, Math.atan2(b[1] - a[1], b[0] - a[0])]} c={c} />;
}

function Wing({ side, membrane, bone }: { side: 1 | -1; membrane: string; bone: string }) {
  const g = useMemo(() => getWingGeometry(), []);
  return (
    <group scale={[side, 1, 1]}>
      <mesh geometry={g} castShadow>
        <meshStandardMaterial color={membrane} roughness={0.7} side={THREE.DoubleSide} flatShading />
      </mesh>
      <Strut a={WING_PTS[0]} b={WING_PTS[1]} c={bone} />
      <Strut a={WING_PTS[1]} b={WING_PTS[2]} c={bone} />
      <Strut a={WING_PTS[1]} b={WING_PTS[3]} c={bone} />
      <Strut a={WING_PTS[1]} b={WING_PTS[4]} c={bone} />
      <Cn a={[0.12, 0.45, 5]} p={[3.75, 0.95, -0.2]} r={[0, 0, -1.2]} c="#e8dcc0" />
    </group>
  );
}

export function Dragon({
  body, belly, membrane, glow, reduced = false,
}: {
  body: string; belly: string; membrane: string; glow: string; reduced?: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  const wL = useRef<THREE.Group>(null);
  const wR = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  useFrame((st) => {
    if (reduced) return;
    const t = st.clock.elapsedTime;
    if (g.current) g.current.position.y = Math.sin(t * 1.4) * 0.12;
    if (wL.current) wL.current.rotation.z = 0.3 + Math.sin(t * 1.6) * 0.32;
    if (wR.current) wR.current.rotation.z = -0.3 - Math.sin(t * 1.6) * 0.32;
    if (tail.current) tail.current.rotation.y = Math.sin(t * 0.9) * 0.18;
    if (mouth.current) mouth.current.scale.setScalar(1 + Math.sin(t * 3) * 0.2);
  });
  const horn = '#eadfc4';
  return (
    <group ref={g}>
      {/* Torso */}
      <Sph a={[1, 18, 14]} p={[0, 2.6, 0]} s={[1.5, 1.4, 2.6]} c={body} rough={0.6} />
      <Sph a={[1, 14, 10]} p={[0, 2.15, 0.15]} s={[1.2, 0.95, 2.3]} c={belly} rough={0.7} />
      {/* Neck and head */}
      {[0, 1, 2, 3].map((i) => (
        <Sph key={i} a={[0.78 - i * 0.07, 10, 8]} p={[0, 3.2 + i * 0.42, 2.0 + i * 0.55]} c={body} />
      ))}
      <Sph a={[1, 14, 10]} p={[0, 4.75, 4.2]} s={[0.85, 0.72, 1.25]} c={body} />
      <Box a={[0.6, 0.42, 1.05]} p={[0, 4.62, 5.15]} c={body} />
      <Box a={[0.55, 0.16, 0.95]} p={[0, 4.3, 5.0]} c={belly} r={[0.12, 0, 0]} />
      {[-0.22, 0.22].map((x) => (
        <group key={x}>
          <Sph a={[0.16, 8, 8]} p={[x * 1.6, 5.02, 4.7]} c="#fff6d6" e={glow} ei={1.8} shadow={false} />
          <Sph a={[0.07, 8, 8]} p={[x * 1.6, 5.02, 4.82]} c="#220c00" shadow={false} />
          <Cn a={[0.18, 1.3, 6]} p={[x * 2, 5.4, 3.7]} r={[-0.9, 0, x > 0 ? -0.2 : 0.2]} c={horn} />
          <Cn a={[0.1, 0.3, 4]} p={[x * 1.2, 4.38, 5.55]} r={[Math.PI, 0, 0]} c={horn} />
          <Sph a={[0.06, 6, 6]} p={[x * 0.9, 4.72, 5.65]} c={glow} e={glow} ei={2} shadow={false} />
        </group>
      ))}
      <mesh ref={mouth} position={[0, 4.45, 5.5]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={2.2} transparent opacity={0.85} />
      </mesh>
      {/* Spine spikes */}
      {Array.from({ length: 8 }, (_, i) => (
        <Cn key={i} a={[0.22, 0.8 - i * 0.04, 5]} p={[0, 3.85 - i * 0.06, 1.6 - i * 0.62]} c={horn} />
      ))}
      {/* Wings */}
      <group ref={wL} position={[1.15, 3.7, 0.3]} rotation={[0, 0.15, 0.3]}><Wing side={1} membrane={membrane} bone={body} /></group>
      <group ref={wR} position={[-1.15, 3.7, 0.3]} rotation={[0, -0.15, -0.3]}><Wing side={-1} membrane={membrane} bone={body} /></group>
      {/* Legs and claws */}
      {[[-1.15, 1.25], [1.15, 1.25], [-1.3, -1.5], [1.3, -1.5]].map(([x, z], i) => (
        <group key={i}>
          <Cyl a={[0.38, 0.5, 1.9, 8]} p={[x, 1.0, z]} c={body} />
          <Box a={[0.6, 0.22, 0.9]} p={[x, 0.11, z + 0.25]} c={body} />
          {[-0.2, 0, 0.2].map((cx) => (
            <Cn key={cx} a={[0.08, 0.34, 4]} p={[x + cx, 0.14, z + 0.8]} r={[Math.PI / 2, 0, 0]} c={horn} />
          ))}
        </group>
      ))}
      {/* Tail */}
      <group ref={tail}>
        {Array.from({ length: 8 }, (_, i) => (
          <group key={i}>
            <Sph a={[0.85 * (1 - i / 10), 10, 8]} p={[Math.sin(i * 0.7) * 0.35, 2.3 - i * 0.12, -2.6 - i * 0.95]} c={body} />
            <Cn a={[0.16, 0.5 * (1 - i / 10) + 0.15, 4]} p={[Math.sin(i * 0.7) * 0.35, 2.9 - i * 0.12, -2.6 - i * 0.95]} c={horn} />
          </group>
        ))}
        <Cn a={[0.35, 0.9, 4]} p={[Math.sin(8 * 0.7) * 0.35, 1.3, -10.4]} r={[-Math.PI / 2, 0, 0]} c={horn} />
      </group>
    </group>
  );
}

export const ConflictDragon = (p: { reduced?: boolean }) => <Dragon body="#b8262b" belly="#f2a65a" membrane="#8a1a1f" glow="#ff7a1a" {...p} />;
export const MergeDragon = (p: { reduced?: boolean }) => <Dragon body="#2f6fd6" belly="#9fd0ff" membrane="#1e478f" glow="#52e0ff" {...p} />;

/** World 5: The Gatekeeper, a stone-and-steel sentinel. */
export function Gatekeeper({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useIdle(g, reduced, 0.05, 1);
  const stone = '#8a8f9c';
  const steel = '#b8c2d2';
  return (
    <group ref={g}>
      {[-0.8, 0.8].map((x) => (
        <group key={x}>
          <Box a={[0.9, 2.2, 1]} p={[x, 1.1, 0]} c={stone} />
          <Box a={[1.1, 0.4, 1.5]} p={[x, 0.2, 0.2]} c="#5b6070" />
        </group>
      ))}
      <Box a={[2.8, 2.2, 1.6]} p={[0, 3.3, 0]} c={stone} />
      <Box a={[2.6, 0.4, 1.4]} p={[0, 2.35, 0.05]} c="#5b6070" />
      <Box a={[0.9, 0.9, 0.5]} p={[0, 3.4, 0.9]} c="#3dd6f5" e="#3dd6f5" ei={0.8} />
      {[-1.9, 1.9].map((x) => (
        <group key={x}>
          <Sph a={[0.85, 10, 8]} p={[x, 4.2, 0]} c={steel} metal={0.7} rough={0.35} />
          <Cn a={[0.25, 0.8, 6]} p={[x * 1.05, 4.9, 0]} c={steel} metal={0.7} rough={0.35} />
          <Box a={[0.8, 1.9, 0.8]} p={[x * 1.05, 2.9, 0]} c={stone} />
        </group>
      ))}
      <Box a={[1.5, 1.4, 1.3]} p={[0, 5.2, 0]} c={steel} metal={0.7} rough={0.35} />
      <Cn a={[0.8, 0.9, 4]} p={[0, 6.3, 0]} c={steel} metal={0.7} rough={0.35} r={[0, Math.PI / 4, 0]} />
      <Box a={[1.1, 0.14, 0.2]} p={[0, 5.3, 0.66]} c="#0a0a0a" e="#3dd6f5" ei={2} />
      <Box a={[0.3, 2.4, 1.6]} p={[-2.6, 3.0, 0.5]} c="#2b5cc4" metal={0.3} />
      <Box a={[0.18, 1.8, 1.1]} p={[-2.78, 3.0, 0.5]} c="#f5b942" metal={0.6} />
      <Cyl a={[0.1, 0.1, 6.5, 6]} p={[2.7, 3.2, 0.6]} c="#4a2f1a" />
      <Box a={[0.12, 1.5, 0.9]} p={[2.7, 6.6, 0.6]} c={steel} metal={0.8} rough={0.25} />
    </group>
  );
}

/** World 6: The Code Review Council, three robed reviewers. */
export function ReviewCouncil({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useIdle(g, reduced, 0.1, 1.1);
  const robes = ['#2b5cc4', '#0f9f6e', '#c2851e'];
  return (
    <group ref={g}>
      {[-2.4, 0, 2.4].map((x, i) => (
        <group key={x} position={[x, 0, i === 1 ? -0.7 : 0]} rotation={[0, i === 0 ? 0.35 : i === 2 ? -0.35 : 0, 0]}>
          <Cn a={[1.1, 3.4, 10]} p={[0, 1.7, 0]} c={robes[i]} rough={0.8} />
          <Sph a={[0.5, 12, 10]} p={[0, 3.6, 0]} c="#1b2236" />
          <Cn a={[0.55, 0.9, 8]} p={[0, 4.05, -0.05]} c={robes[i]} />
          <Sph a={[0.07, 8, 8]} p={[-0.17, 3.65, 0.42]} c="#fff6d6" e="#f5b942" ei={2} shadow={false} />
          <Sph a={[0.07, 8, 8]} p={[0.17, 3.65, 0.42]} c="#fff6d6" e="#f5b942" ei={2} shadow={false} />
          <Box a={[0.9, 0.04, 0.65]} p={[0, 2.4, 0.9]} r={[-0.5, 0, 0]} c="#f4ecd4" e="#f5b942" ei={0.4} />
          <Torus a={[0.5, 0.05, 6, 14]} p={[0, 3.0, 0]} r={[Math.PI / 2, 0, 0]} c="#f5b942" metal={0.7} />
        </group>
      ))}
    </group>
  );
}

/** World 7: The Timeline Keeper, a floating keeper wreathed in temporal rings. */
export function TimelineKeeper({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  const r1 = useRef<THREE.Group>(null);
  const r2 = useRef<THREE.Group>(null);
  const r3 = useRef<THREE.Group>(null);
  useFrame((st, dt) => {
    if (reduced) return;
    if (g.current) g.current.position.y = 1.2 + Math.sin(st.clock.elapsedTime * 1.2) * 0.3;
    if (r1.current) r1.current.rotation.z += dt * 0.5;
    if (r2.current) r2.current.rotation.x += dt * 0.35;
    if (r3.current) r3.current.rotation.y += dt * 0.7;
  });
  return (
    <group ref={g} position={[0, 1.2, 0]}>
      <Cn a={[1.2, 3.6, 10]} p={[0, 1.8, 0]} r={[Math.PI, 0, 0]} c="#c6cde0" metal={0.3} rough={0.5} />
      <Cn a={[0.9, 1.4, 10]} p={[0, 4.3, -0.05]} c="#8d97b5" />
      <Sph a={[0.42, 12, 10]} p={[0, 3.75, 0.05]} c="#0a0f20" />
      <Sph a={[0.07, 8, 8]} p={[-0.15, 3.8, 0.4]} c="#e0f7ff" e="#52e0ff" ei={2.4} shadow={false} />
      <Sph a={[0.07, 8, 8]} p={[0.15, 3.8, 0.4]} c="#e0f7ff" e="#52e0ff" ei={2.4} shadow={false} />
      {/* Hourglass held out front */}
      <group position={[1.4, 2.2, 0.8]}>
        <Cn a={[0.35, 0.6, 8]} p={[0, 0.3, 0]} r={[Math.PI, 0, 0]} c="#f5b942" e="#f5b942" ei={0.5} />
        <Cn a={[0.35, 0.6, 8]} p={[0, -0.3, 0]} c="#f5b942" e="#f5b942" ei={0.5} />
        <Cyl a={[0.45, 0.45, 0.08, 10]} p={[0, 0.62, 0]} c="#c6cde0" metal={0.6} />
        <Cyl a={[0.45, 0.45, 0.08, 10]} p={[0, -0.62, 0]} c="#c6cde0" metal={0.6} />
      </group>
      <group ref={r1} position={[0, 3.2, 0]}><Torus a={[2.6, 0.08, 8, 48]} c="#52e0ff" e="#52e0ff" ei={1.4} /></group>
      <group ref={r2} position={[0, 3.2, 0]}><Torus a={[3.1, 0.07, 8, 48]} c="#a78bfa" e="#a78bfa" ei={1.2} /></group>
      <group ref={r3} position={[0, 3.2, 0]} rotation={[1.1, 0, 0]}><Torus a={[3.6, 0.06, 8, 48]} c="#e0f7ff" e="#e0f7ff" ei={1.0} /></group>
    </group>
  );
}

/** Secret map 1: the Ghost of Lost Commits, a pale spirit carrying a lantern. */
export function Phantom({ reduced = false }: { reduced?: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((st) => {
    if (!g.current || reduced) return;
    const t = st.clock.elapsedTime;
    g.current.position.y = 1.2 + Math.sin(t * 1.1) * 0.4;
    g.current.rotation.y = Math.sin(t * 0.5) * 0.18;
  });
  return (
    <group ref={g} position={[0, 1.2, 0]}>
      <Cn a={[1.7, 5, 14]} p={[0, 2.5, 0]} c="#d4ecff" e="#7ccfff" ei={0.35} opacity={0.55} />
      {Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return <Cn key={i} a={[0.35, 1.2, 4]} p={[Math.cos(a) * 1.35, -0.1, Math.sin(a) * 1.35]} r={[Math.PI, 0, 0]} c="#d4ecff" opacity={0.5} shadow={false} />;
      })}
      <Sph a={[0.7, 14, 12]} p={[0, 5.3, 0]} c="#0b1626" />
      <Cn a={[0.85, 1.3, 10]} p={[0, 6.0, -0.1]} c="#cfe6fb" opacity={0.7} />
      <Sph a={[0.12, 8, 8]} p={[-0.25, 5.35, 0.62]} c="#e0fbff" e="#52e0ff" ei={3} shadow={false} />
      <Sph a={[0.12, 8, 8]} p={[0.25, 5.35, 0.62]} c="#e0fbff" e="#52e0ff" ei={3} shadow={false} />
      {[-1, 1].map((s) => <Cn key={s} a={[0.28, 2.6, 5]} p={[s * 1.4, 3.6, 1]} r={[1.2, 0, s * -0.5]} c="#d4ecff" opacity={0.6} shadow={false} />)}
      <Sph a={[0.38, 10, 8]} p={[1.9, 3.0, 2.0]} c="#baf3ff" e="#52e0ff" ei={3} shadow={false} />
      <Torus a={[1.6, 0.07, 6, 28]} p={[0, 3.2, 0]} r={[Math.PI / 2, 0.2, 0]} c="#9aa7b8" metal={0.7} shadow={false} />
      <Torus a={[2.1, 0.07, 6, 28]} p={[0, 2.2, 0]} r={[Math.PI / 2, -0.15, 0]} c="#9aa7b8" metal={0.7} shadow={false} />
    </group>
  );
}

/** Pick the boss model for a world's boss name (substring match so renamed variants still resolve). */
export function Boss({ name, reduced = false }: { name?: string; reduced?: boolean }) {
  const n = (name ?? '').toLowerCase();
  if (n.includes('ghost')) return <GhostCommit reduced={reduced} />;
  if (n.includes('silent')) return <Gatekeeper reduced={reduced} />;
  if (n.includes('crasher')) return <UntrackedBeast reduced={reduced} hide="#7a3b3b" inner="#a35a4a" />;
  if (n.includes('ghost')) return <Phantom reduced={reduced} />;
  if (n.includes('sentinel')) return <Gatekeeper reduced={reduced} />;
  if (n.includes('ogre')) return <UntrackedBeast reduced={reduced} />;
  if (n.includes('chrono')) return <TimelineKeeper reduced={reduced} />;
  if (n.includes('untracked')) return <UntrackedBeast reduced={reduced} />;
  if (n.includes('history')) return <HistoryEater reduced={reduced} />;
  if (n.includes('guardian')) return <BranchGuardian reduced={reduced} />;
  if (n.includes('conflict')) return <ConflictDragon reduced={reduced} />;
  if (n.includes('gatekeeper')) return <Gatekeeper reduced={reduced} />;
  if (n.includes('council')) return <ReviewCouncil reduced={reduced} />;
  if (n.includes('timeline')) return <TimelineKeeper reduced={reduced} />;
  if (n.includes('merge')) return <MergeDragon reduced={reduced} />;
  return <UntrackedBeast reduced={reduced} />;
}
