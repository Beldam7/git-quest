import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';

/**
 * The Git Quest hero: a stylized fantasy adventurer built from layered primitives with a real
 * joint hierarchy (hips > legs > knees, torso > head/arms/cloak), so it walks instead of sliding.
 *
 * Appearance mapping (LOCAL placeholder until Start.ng's styling contract is verified):
 *   primaryColor   -> cloak            secondaryColor -> tunic and sleeves
 *   accentColor    -> trim, buckles, pauldron rings, accessories
 *   materialVariant, accessory -> applied to cloak/tunic and head/body accessories
 * Skin, hair, leather, boots, trousers and sword are fixed so the hero is always recognisably the same character.
 *
 * Facing: the model looks toward +Z. Origin is at the feet. Height is about 2.6 units.
 */
const SKIN = '#b97a56';
const HAIR = '#24160e';
const LEATHER = '#6b4528';
const LEATHER_DARK = '#432a17';
const PANTS = '#4b3a2c';
const STEEL = '#b8c2d2';

export function HeroModel({
  appearance, speedRef, spin = false,
}: {
  appearance: CharacterAppearance;
  /** 0 = standing still, 1 = full run. Drives the walk cycle. */
  speedRef?: MutableRefObject<number>;
  /** Turntable rotation, for previews. */
  spin?: boolean;
}) {
  const root = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legL = useRef<THREE.Group>(null);
  const legR = useRef<THREE.Group>(null);
  const kneeL = useRef<THREE.Group>(null);
  const kneeR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const elbowL = useRef<THREE.Group>(null);
  const elbowR = useRef<THREE.Group>(null);
  const cloak = useRef<THREE.Group>(null);
  const phase = useRef(0);

  useFrame((state, delta) => {
    const s = Math.min(1, Math.max(0, speedRef?.current ?? 0));
    const t = state.clock.elapsedTime;
    if (s > 0.05) phase.current += delta * (7 + 5 * s);
    const p = phase.current;
    const sw = Math.sin(p) * 0.85 * s;

    if (root.current) {
      root.current.position.y = Math.abs(Math.sin(p)) * 0.07 * s + Math.sin(t * 2) * 0.012 * (1 - s);
      if (spin) root.current.rotation.y += delta * 0.6;
    }
    if (legL.current) legL.current.rotation.x = sw;
    if (legR.current) legR.current.rotation.x = -sw;
    if (kneeL.current) kneeL.current.rotation.x = Math.max(0, -Math.cos(p)) * 1.0 * s;
    if (kneeR.current) kneeR.current.rotation.x = Math.max(0, Math.cos(p)) * 1.0 * s;
    if (armL.current) armL.current.rotation.x = -sw * 0.8 + Math.sin(t * 1.6) * 0.02 * (1 - s);
    if (armR.current) armR.current.rotation.x = sw * 0.8 - Math.sin(t * 1.6) * 0.02 * (1 - s);
    if (elbowL.current) elbowL.current.rotation.x = -0.25 - 0.5 * s;
    if (elbowR.current) elbowR.current.rotation.x = -0.25 - 0.5 * s;
    if (torso.current) {
      torso.current.rotation.x = 0.12 * s;
      torso.current.rotation.y = Math.sin(p) * 0.09 * s;
      torso.current.scale.y = 1 + Math.sin(t * 2) * 0.012;
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.7) * 0.16 * (1 - s);
      head.current.rotation.x = -0.05 * s;
    }
    if (cloak.current) cloak.current.rotation.x = 0.08 + 0.5 * s + Math.sin(t * 1.5) * 0.03;
  });

  const variant = useMemo(() => {
    const v: { roughness: number; metalness: number; transparent?: boolean; opacity?: number; emissive?: string; emissiveIntensity?: number } = { roughness: 0.75, metalness: 0 };
    if (appearance.materialVariant === 'metallic') {
      v.metalness = 0.85;
      v.roughness = 0.3;
    } else if (appearance.materialVariant === 'crystal') {
      v.transparent = true;
      v.opacity = 0.78;
      v.roughness = 0.2;
    } else if (appearance.materialVariant === 'phoenix') {
      v.emissive = appearance.accentColor;
      v.emissiveIntensity = 0.35;
    }
    return v;
  }, [appearance.materialVariant, appearance.accentColor]);

  const longCape = appearance.accessory === 'cape';
  const capeH = longCape ? 1.9 : 1.35;
  const gold = appearance.accentColor;

  return (
    <group ref={root}>
      {/* Hips */}
      <group position={[0, 1.1, 0]}>
        <mesh castShadow position={[0, 0.02, 0]}>
          <boxGeometry args={[0.64, 0.3, 0.4]} />
          <meshStandardMaterial color={PANTS} roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.68, 0.11, 0.44]} />
          <meshStandardMaterial color={LEATHER_DARK} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.2, 0.235]}>
          <boxGeometry args={[0.13, 0.11, 0.03]} />
          <meshStandardMaterial color={gold} metalness={0.8} roughness={0.3} />
        </mesh>
        {/* Sword on the left hip */}
        <group position={[-0.4, 0.12, -0.08]} rotation={[0, 0, 0.16]}>
          <mesh position={[0, -0.5, 0]}><boxGeometry args={[0.08, 0.95, 0.1]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.7} /></mesh>
          <mesh position={[0, -1.0, 0]}><boxGeometry args={[0.1, 0.1, 0.12]} /><meshStandardMaterial color={gold} metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.32, 0.06, 0.08]} /><meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.035, 0.035, 0.3, 6]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
          <mesh position={[0, 0.48, 0]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color={gold} metalness={0.8} roughness={0.3} /></mesh>
        </group>

        {/* Legs */}
        {([[-0.19, legL, kneeL], [0.19, legR, kneeR]] as const).map(([x, ref, kneeRef]) => (
          <group key={x} ref={ref} position={[x, -0.02, 0]}>
            <mesh castShadow position={[0, -0.27, 0]}><cylinderGeometry args={[0.15, 0.13, 0.56, 8]} /><meshStandardMaterial color={PANTS} roughness={0.9} /></mesh>
            <group ref={kneeRef} position={[0, -0.55, 0]}>
              <mesh castShadow position={[0, -0.25, 0]}><cylinderGeometry args={[0.125, 0.105, 0.5, 8]} /><meshStandardMaterial color={PANTS} roughness={0.9} /></mesh>
              <mesh castShadow position={[0, -0.3, 0]}><cylinderGeometry args={[0.15, 0.16, 0.34, 8]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
              <mesh position={[0, -0.14, 0]}><cylinderGeometry args={[0.17, 0.15, 0.1, 8]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
              <mesh castShadow position={[0, -0.46, 0.08]}><boxGeometry args={[0.22, 0.13, 0.4]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
            </group>
          </group>
        ))}

        {/* Torso */}
        <group ref={torso} position={[0, 0.17, 0]}>
          <mesh castShadow position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.37, 0.3, 0.82, 10]} />
            <meshStandardMaterial color={appearance.secondaryColor} {...variant} />
          </mesh>
          {/* Leather chest harness */}
          <mesh castShadow position={[0, 0.5, 0.22]}><boxGeometry args={[0.5, 0.5, 0.14]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
          <mesh position={[-0.2, 0.62, 0.3]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.06, 0.7, 0.04]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
          <mesh position={[0.2, 0.62, 0.3]} rotation={[0, 0, -0.2]}><boxGeometry args={[0.06, 0.7, 0.04]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
          <mesh position={[0, 0.52, 0.31]} scale={[0.7, 1, 0.45]}>
            <octahedronGeometry args={[0.13, 0]} />
            <meshStandardMaterial color="#3dd6f5" emissive="#3dd6f5" emissiveIntensity={0.9} />
          </mesh>
          {/* Neck and head */}
          <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.1, 0.11, 0.16, 8]} /><meshStandardMaterial color={SKIN} roughness={0.85} /></mesh>
          <group ref={head} position={[0, 1.18, 0]}>
            <mesh castShadow scale={[1, 1.08, 1]}><sphereGeometry args={[0.3, 16, 14]} /><meshStandardMaterial color={SKIN} roughness={0.85} /></mesh>
            <mesh position={[0, -0.02, 0.29]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color={SKIN} roughness={0.85} /></mesh>
            {[-0.11, 0.11].map((x) => (
              <group key={x}>
                <mesh position={[x, 0.04, 0.255]}><sphereGeometry args={[0.052, 8, 8]} /><meshStandardMaterial color="#f4f1ea" roughness={0.4} /></mesh>
                <mesh position={[x, 0.04, 0.298]}><sphereGeometry args={[0.027, 8, 8]} /><meshStandardMaterial color="#1a1410" roughness={0.3} /></mesh>
                <mesh position={[x, 0.115, 0.27]} rotation={[0, 0, x > 0 ? -0.15 : 0.15]}><boxGeometry args={[0.11, 0.022, 0.03]} /><meshStandardMaterial color={HAIR} /></mesh>
                <mesh position={[x * 2.6, 0, 0]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color={SKIN} roughness={0.85} /></mesh>
              </group>
            ))}
            <mesh position={[0, -0.12, 0.26]} rotation={[0, 0, 0]}><boxGeometry args={[0.12, 0.02, 0.03]} /><meshStandardMaterial color="#7a3d2a" /></mesh>
            {/* Short curly hair */}
            <mesh position={[0, 0.07, -0.03]} rotation={[-0.3, 0, 0]}>
              <sphereGeometry args={[0.325, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={HAIR} roughness={0.95} />
            </mesh>
            {[[-0.16, 0.3, 0.12], [0.05, 0.34, 0.1], [0.2, 0.28, 0.08], [-0.05, 0.36, -0.1], [-0.2, 0.22, -0.1], [0.19, 0.22, -0.12]].map(([x, y, z], i) => (
              <mesh key={i} position={[x, y, z]}><sphereGeometry args={[0.085, 8, 8]} /><meshStandardMaterial color={HAIR} roughness={0.95} /></mesh>
            ))}

            {/* Head accessories */}
            {appearance.accessory === 'helmet' && (
              <group>
                <mesh position={[0, 0.06, 0]}><sphereGeometry args={[0.35, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.25} /></mesh>
                <mesh position={[0, 0.02, 0.33]}><boxGeometry args={[0.05, 0.28, 0.04]} /><meshStandardMaterial color={STEEL} metalness={0.85} roughness={0.25} /></mesh>
                <mesh position={[0, 0.42, 0]}><coneGeometry args={[0.06, 0.25, 6]} /><meshStandardMaterial color={gold} metalness={0.8} roughness={0.3} /></mesh>
              </group>
            )}
            {appearance.accessory === 'wizard_hat' && (
              <group position={[0, 0.3, 0]}>
                <mesh><cylinderGeometry args={[0.5, 0.5, 0.04, 16]} /><meshStandardMaterial color={gold} roughness={0.6} /></mesh>
                <mesh position={[0, 0.5, 0]}><coneGeometry args={[0.3, 1, 12]} /><meshStandardMaterial color={gold} roughness={0.6} /></mesh>
              </group>
            )}
          </group>

          {/* Arms */}
          {([[-0.5, armL, elbowL], [0.5, armR, elbowR]] as const).map(([x, ref, elbowRef]) => (
            <group key={x} ref={ref} position={[x, 0.74, 0]}>
              <mesh castShadow position={[0, -0.2, 0]}><cylinderGeometry args={[0.1, 0.09, 0.42, 8]} /><meshStandardMaterial color={appearance.secondaryColor} {...variant} /></mesh>
              <group ref={elbowRef} position={[0, -0.42, 0]}>
                <mesh castShadow position={[0, -0.18, 0]}><cylinderGeometry args={[0.09, 0.08, 0.38, 8]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
                <mesh position={[0, -0.4, 0]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
              </group>
              {/* Pauldron */}
              <mesh castShadow position={[x > 0 ? 0.03 : -0.03, 0.06, 0]}>
                <sphereGeometry args={[appearance.accessory === 'dragon_armor' ? 0.27 : 0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                <meshStandardMaterial color={appearance.accessory === 'dragon_armor' ? gold : LEATHER} metalness={appearance.accessory === 'dragon_armor' ? 0.8 : 0} roughness={0.5} />
              </mesh>
              <mesh position={[x > 0 ? 0.03 : -0.03, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.2, 0.025, 6, 14]} />
                <meshStandardMaterial color={gold} metalness={0.8} roughness={0.3} />
              </mesh>
              {appearance.accessory === 'dragon_armor' && (
                <mesh position={[x > 0 ? 0.08 : -0.08, 0.28, 0]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]}>
                  <coneGeometry args={[0.07, 0.3, 5]} />
                  <meshStandardMaterial color={gold} metalness={0.8} roughness={0.3} />
                </mesh>
              )}
            </group>
          ))}

          {/* Cloak hanging from the shoulders */}
          <group ref={cloak} position={[0, 0.82, -0.26]}>
            <mesh castShadow position={[0, -capeH / 2, -0.02]}>
              <boxGeometry args={[0.92, capeH, 0.05]} />
              <meshStandardMaterial color={appearance.primaryColor} side={THREE.DoubleSide} {...variant} />
            </mesh>
            <mesh position={[0, -capeH / 2, -0.055]}>
              <boxGeometry args={[0.8, capeH * 0.92, 0.02]} />
              <meshStandardMaterial color={gold} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
          <mesh position={[0, 0.82, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.26, 0.07, 6, 16]} />
            <meshStandardMaterial color={appearance.primaryColor} {...variant} />
          </mesh>
          <mesh position={[0, 0.8, 0.26]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color={gold} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
