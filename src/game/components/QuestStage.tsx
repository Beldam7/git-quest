import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Player } from './WorldScene';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';
import { usePrefersReducedMotion, useCoarsePointer } from '../hooks/usePrefersReducedMotion';

interface QuestStageProps {
  /** The current world's accent color; tints sky, light and runes. */
  accent: string;
  isBoss: boolean;
  bossName?: string;
  /** From the appearance adapter: this is what makes platform styling show up on the 3D hero. */
  appearance: CharacterAppearance;
}

export function Crystal({ position, color, speed, reduced }: { position: [number, number, number]; color: string; speed: number; reduced: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, delta) => {
    if (!ref.current || reduced) return;
    ref.current.rotation.y += delta * speed;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed + position[0]) * 0.15;
  });
  return (
    <mesh ref={ref} position={position}>
      <octahedronGeometry args={[0.35, 0]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} roughness={0.2} />
    </mesh>
  );
}

function FloatingIsland({ position, scale, reduced }: { position: [number, number, number]; scale: number; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current || reduced) return;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.25;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      <mesh position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[2, 2.2, 7]} />
        <meshStandardMaterial color="#1c2f52" roughness={1} flatShading />
      </mesh>
      <mesh>
        <cylinderGeometry args={[2.1, 2, 0.35, 7]} />
        <meshStandardMaterial color="#2f7d5c" roughness={0.9} flatShading />
      </mesh>
      <mesh position={[0.3, 0.9, 0]}>
        <coneGeometry args={[0.6, 1.5, 6]} />
        <meshStandardMaterial color="#1d5a3f" roughness={0.9} flatShading />
      </mesh>
    </group>
  );
}

/**
 * PLACEHOLDER boss built from primitives (see docs/DESIGN.md, "Temporary assets").
 * Final Conflict Dragon / Merge Dragon / History Eater need real modelled assets.
 */
function BossPlaceholder({ color, reduced }: { color: string; reduced: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!ref.current || reduced) return;
    ref.current.position.y = 3.4 + Math.sin(state.clock.elapsedTime * 0.9) * 0.25;
  });
  return (
    <group ref={ref} position={[0, 3.4, -8]}>
      <mesh>
        <icosahedronGeometry args={[2, 1]} />
        <meshStandardMaterial color={color} roughness={0.55} flatShading />
      </mesh>
      <mesh position={[0, 0.9, 1.9]}>
        <icosahedronGeometry args={[1, 1]} />
        <meshStandardMaterial color={color} roughness={0.55} flatShading />
      </mesh>
      {[-0.55, 0.55].map((x) => (
        <group key={x}>
          <mesh position={[x, 2.05, 1.7]} rotation={[-0.3, 0, x * 0.6]}>
            <coneGeometry args={[0.22, 1.1, 5]} />
            <meshStandardMaterial color="#f1e3c0" roughness={0.6} />
          </mesh>
          <mesh position={[x * 0.9, 1.15, 2.75]}>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshStandardMaterial color="#ffe08a" emissive="#ffcf4d" emissiveIntensity={2} />
          </mesh>
        </group>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 3.1, 0.7, -0.3]} rotation={[0, 0, side * -1.05]}>
          <coneGeometry args={[1.7, 4.4, 3]} />
          <meshStandardMaterial color={color} roughness={0.7} flatShading side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

function StageScene({ accent, isBoss, appearance, reduced, coarse }: QuestStageProps & { reduced: boolean; coarse: boolean }) {
  const sky = useMemo(() => {
    const c = new THREE.Color(accent).multiplyScalar(0.16).lerp(new THREE.Color('#060b17'), 0.55);
    return `#${c.getHexString()}`;
  }, [accent]);
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ring.current && !reduced) ring.current.rotation.z += delta * 0.25;
  });
  const bossColor = isBoss ? '#8a3df0' : accent;

  return (
    <>
      <color attach="background" args={[sky]} />
      <fog attach="fog" args={[sky, 16, 42]} />
      <hemisphereLight args={['#9ec5ff', '#1b2a1f', 0.9]} />
      <directionalLight position={[6, 10, 6]} intensity={1.3} color="#ffd9a0" />
      <pointLight position={[0, 2.2, 2]} color={accent} intensity={22} distance={14} />
      <Stars radius={60} depth={30} count={coarse ? 250 : 700} factor={3} fade speed={reduced ? 0 : 0.4} />

      {/* Platform */}
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[3.6, 3.2, 0.5, 40]} />
        <meshStandardMaterial color="#26385c" roughness={0.85} />
      </mesh>
      <mesh ref={ring} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.7, 0.07, 10, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} />
      </mesh>

      {/* Hero, angled toward the threat (boss) or three-quarters to the camera */}
      <group position={[0, 0.02, 1]} rotation={[0, isBoss ? Math.PI * 0.88 : -0.45, 0]}>
        <Player appearance={appearance} position={[0, 0, 0]} spin={false} />
      </group>

      {isBoss && <BossPlaceholder color={bossColor} reduced={reduced} />}

      <FloatingIsland position={[-8, 3, -6]} scale={1.1} reduced={reduced} />
      <FloatingIsland position={[9, 5, -10]} scale={0.8} reduced={reduced} />
      <FloatingIsland position={[-12, 7, -15]} scale={1.4} reduced={reduced} />

      {[[-3.4, 1.6, 0.5], [3.4, 2.1, -0.5], [-2.2, 2.6, -2.2], [2.6, 1.3, 2.2]].map(([x, y, z], i) => (
        <Crystal key={i} position={[x, y, z]} color={i % 2 ? '#34d399' : '#3dd6f5'} speed={0.8 + i * 0.15} reduced={reduced} />
      ))}
    </>
  );
}

export function QuestStage(props: QuestStageProps) {
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  return (
    <div className="absolute inset-0" role="img" aria-label={props.isBoss ? `Boss encounter${props.bossName ? `: ${props.bossName}` : ''}` : 'Your hero on the quest platform'}>
      <Canvas
        dpr={coarse ? 1 : [1, 1.5]}
        camera={{ position: [0, 2.9, 8.5], fov: 45 }}
        gl={{ antialias: !coarse }}
        onCreated={({ camera }) => camera.lookAt(0, 2, 0)}
      >
        <StageScene {...props} reduced={reduced} coarse={coarse} />
      </Canvas>
    </div>
  );
}
