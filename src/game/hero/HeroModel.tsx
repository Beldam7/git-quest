import { useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { sanitizeAppearance } from '../adapters/CharacterAppearanceAdapter';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';

/**
 * The Git Quest hero: a stylised fantasy adventurer built from layered primitives with a real joint hierarchy
 * (hips > legs > knees, torso > head/arms/cloak), so it walks instead of sliding.
 *
 * The character is the player's start.ng character (see adapters/CharacterAppearanceAdapter.ts), as the
 * platform's "character rule" requires. Every field changes what you see:
 *   body            -> build (broader shoulders / slimmer shoulders and wider hips, plus a skirt)
 *   primaryColor    -> tunic, sleeves and (darkened) cloak
 *   secondaryColor  -> trousers or skirt (and scarf / backpack trim)
 *   skinColor, hairColor, hair (7 styles), hat (5), accessory (6)
 * Fixed fantasy costume: leather harness and belt, boots, gloves, sword, gold trim, glowing chest gem.
 *
 * Facing: the model looks toward +Z. Origin is at the feet. Height is about 2.6 units.
 */
const GOLD = '#f5b942';
const LEATHER = '#6b4528';
const LEATHER_DARK = '#432a17';
const PANTS = '#4b3a2c';
const STEEL = '#b8c2d2';

/** A one-shot action the hero plays: swinging the sword (correct command) or staggering (wrong command). */
export interface HeroAction {
  kind: 'idle' | 'attack' | 'hurt';
  /** Seconds since the action began. */
  t: number;
}

export function HeroModel({
  appearance: rawAppearance, speedRef, spin = false, actionRef, airRef,
}: {
  appearance: CharacterAppearance;
  /** 0 = standing still, 1 = full run. Drives the walk cycle. */
  speedRef?: MutableRefObject<number>;
  /** Turntable rotation, for previews. */
  spin?: boolean;
  /** Set `{ kind: 'attack', t: 0 }` to play a sword swing, or `'hurt'` for a stagger. */
  actionRef?: MutableRefObject<HeroAction>;
  /** 1 while the hero is in the air (jumping or falling), 0 on the ground. Drives the jump pose. */
  airRef?: MutableRefObject<number>;
}) {
  // Always render a complete, valid character, whatever data arrives (old saves, new platform options).
  const appearance = sanitizeAppearance(rawAppearance);
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
  const hipSword = useRef<THREE.Group>(null);
  const handSword = useRef<THREE.Group>(null);
  const slash = useRef<THREE.Mesh>(null);
  const slashMat = useRef<THREE.MeshStandardMaterial>(null);
  const phase = useRef(0);
  const airSm = useRef(0);

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

    // Jump pose: knees tucked, arms up, cloak streaming
    airSm.current += ((airRef?.current ?? 0) - airSm.current) * Math.min(1, delta * 14);
    const air = airSm.current;
    if (air > 0.01) {
      const toward = (r: { current: THREE.Group | null }, v: number) => { if (r.current) r.current.rotation.x += (v - r.current.rotation.x) * air; };
      toward(legL, -0.75);
      toward(legR, 0.3);
      toward(kneeL, 1.1);
      toward(kneeR, 0.5);
      toward(armL, -1.4);
      toward(armR, -1.4);
      toward(cloak, 0.95);
    }

    // One-shot combat actions
    if (root.current) { root.current.position.z = 0; root.current.rotation.z = 0; }
    let attackU = -1;
    const act = actionRef?.current;
    if (act && act.kind !== 'idle') {
      act.t += delta;
      const u = act.t / (act.kind === 'attack' ? 0.62 : 0.55);
      const ease = (x: number) => x * x * (3 - 2 * Math.min(1, Math.max(0, x)));
      const pulse = Math.sin(Math.PI * Math.min(1, u));
      if (u >= 1) {
        act.kind = 'idle';
        act.t = 0;
      } else if (act.kind === 'attack') {
        attackU = u;
        const raise = -0.4 + (-2.8 + 0.4) * ease(u / 0.3);
        const swing = -2.8 + (0.9 + 2.8) * ease((u - 0.3) / 0.35);
        const back = 0.9 * (1 - ease((u - 0.65) / 0.35));
        if (armR.current) armR.current.rotation.x = u < 0.3 ? raise : u < 0.65 ? swing : back;
        if (elbowR.current) elbowR.current.rotation.x = -0.15;
        if (armL.current) armL.current.rotation.x = -0.5 * pulse;
        if (torso.current) { torso.current.rotation.y = 0.55 * pulse; torso.current.rotation.x = 0.22 * pulse; }
        if (root.current) root.current.position.z = 0.9 * pulse;
        if (slash.current && slashMat.current) {
          const k = (u - 0.3) / 0.5;
          slash.current.visible = k > 0 && k < 1;
          slash.current.rotation.z = 1.0 - 1.7 * Math.min(1, Math.max(0, k));
          slashMat.current.opacity = Math.max(0, 0.95 * (1 - k));
        }
      } else {
        if (torso.current) torso.current.rotation.x = -0.45 * pulse;
        if (head.current) head.current.rotation.x = -0.35 * pulse;
        if (armL.current) armL.current.rotation.x = -0.9 * pulse;
        if (armR.current) armR.current.rotation.x = -0.9 * pulse;
        if (root.current) {
          root.current.position.z = -0.7 * pulse;
          root.current.rotation.z = 0.14 * Math.sin(u * 18) * (1 - u);
        }
      }
    }
    if (attackU < 0 && slash.current) slash.current.visible = false;
    if (handSword.current) handSword.current.visible = attackU >= 0;
    if (hipSword.current) hipSword.current.visible = attackU < 0;
  });

  const tunic = appearance.primaryColor;
  const trousers = appearance.secondaryColor;
  const skin = appearance.skinColor;
  const hairC = appearance.hairColor;
  const female = appearance.body === 'female';
  const cloakColor = useMemo(() => `#${new THREE.Color(tunic).multiplyScalar(0.62).getHexString()}`, [tunic]);
  const shoulder = female ? 0.9 : 1.04;
  const hipW = female ? 1.1 : 1;
  const backpack = appearance.accessory === 'backpack';
  const bare = appearance.hair === 'bald';
  const capHair = !bare && appearance.hair !== 'afro';

  return (
    <group ref={root}>
      <mesh ref={slash} position={[0, 1.7, 1.05]} rotation={[0, 0, 1]} visible={false}>
        <torusGeometry args={[1.3, 0.07, 6, 28, Math.PI * 0.85]} />
        <meshStandardMaterial ref={slashMat} color="#cffaff" emissive="#52e0ff" emissiveIntensity={2.2} transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {/* Hips */}
      <group position={[0, 1.1, 0]}>
        <mesh castShadow position={[0, 0.02, 0]}>
          <boxGeometry args={[0.64 * hipW, 0.3, 0.4]} />
          <meshStandardMaterial color={trousers} roughness={0.9} />
        </mesh>
        {female && (
          <mesh castShadow position={[0, -0.22, 0]}>
            <coneGeometry args={[0.6, 0.62, 14]} />
            <meshStandardMaterial color={trousers} roughness={0.9} />
          </mesh>
        )}
        <mesh position={[0, 0.2, 0]}>
          <boxGeometry args={[0.68 * hipW, 0.11, 0.44]} />
          <meshStandardMaterial color={LEATHER_DARK} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.2, 0.235]}>
          <boxGeometry args={[0.13, 0.11, 0.03]} />
          <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
        </mesh>

        {/* Sword on the left hip */}
        <group ref={hipSword} position={[-0.4, 0.12, -0.08]} rotation={[0, 0, 0.16]}>
          <mesh position={[0, -0.5, 0]}><boxGeometry args={[0.08, 0.95, 0.1]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.7} /></mesh>
          <mesh position={[0, -1.0, 0]}><boxGeometry args={[0.1, 0.1, 0.12]} /><meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 0.08, 0]}><boxGeometry args={[0.32, 0.06, 0.08]} /><meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} /></mesh>
          <mesh position={[0, 0.3, 0]}><cylinderGeometry args={[0.035, 0.035, 0.3, 6]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
          <mesh position={[0, 0.48, 0]}><sphereGeometry args={[0.06, 8, 8]} /><meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} /></mesh>
        </group>

        {/* Legs */}
        {([[-0.19, legL, kneeL], [0.19, legR, kneeR]] as const).map(([x, ref, kneeRef]) => (
          <group key={x} ref={ref} position={[x * hipW, -0.02, 0]}>
            <mesh castShadow position={[0, -0.27, 0]}><cylinderGeometry args={[0.15, 0.13, 0.56, 8]} /><meshStandardMaterial color={trousers} roughness={0.9} /></mesh>
            <group ref={kneeRef} position={[0, -0.55, 0]}>
              <mesh castShadow position={[0, -0.25, 0]}><cylinderGeometry args={[0.125, 0.105, 0.5, 8]} /><meshStandardMaterial color={trousers} roughness={0.9} /></mesh>
              <mesh castShadow position={[0, -0.3, 0]}><cylinderGeometry args={[0.15, 0.16, 0.34, 8]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
              <mesh position={[0, -0.14, 0]}><cylinderGeometry args={[0.17, 0.15, 0.1, 8]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
              <mesh castShadow position={[0, -0.46, 0.08]}><boxGeometry args={[0.22, 0.13, 0.4]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
            </group>
          </group>
        ))}

        {/* Torso */}
        <group ref={torso} position={[0, 0.17, 0]}>
          <group scale={[shoulder, 1, 1]}>
            <mesh castShadow position={[0, 0.42, 0]}>
              <cylinderGeometry args={[0.37, 0.3, 0.82, 10]} />
              <meshStandardMaterial color={tunic} roughness={0.75} />
            </mesh>
            {/* Leather chest harness */}
            <mesh castShadow position={[0, 0.5, 0.22]}><boxGeometry args={[0.5, 0.5, 0.14]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
            <mesh position={[-0.2, 0.62, 0.3]} rotation={[0, 0, 0.2]}><boxGeometry args={[0.06, 0.7, 0.04]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
            <mesh position={[0.2, 0.62, 0.3]} rotation={[0, 0, -0.2]}><boxGeometry args={[0.06, 0.7, 0.04]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
            <mesh position={[0, 0.52, 0.31]} scale={[0.7, 1, 0.45]}>
              <octahedronGeometry args={[0.13, 0]} />
              <meshStandardMaterial color="#3dd6f5" emissive="#3dd6f5" emissiveIntensity={0.9} />
            </mesh>
          </group>

          {/* Neck and head */}
          <mesh position={[0, 0.9, 0]}><cylinderGeometry args={[0.1, 0.11, 0.16, 8]} /><meshStandardMaterial color={skin} roughness={0.85} /></mesh>
          {appearance.accessory === 'scarf' && (
            <group position={[0, 0.88, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.2, 0.085, 8, 18]} /><meshStandardMaterial color={trousers} roughness={0.9} /></mesh>
              <mesh position={[0.12, -0.28, 0.22]} rotation={[0.1, 0, -0.1]}><boxGeometry args={[0.16, 0.5, 0.05]} /><meshStandardMaterial color={trousers} roughness={0.9} /></mesh>
            </group>
          )}
          <group ref={head} position={[0, 1.18, 0]}>
            <mesh castShadow scale={[1, 1.08, 1]}><sphereGeometry args={[0.3, 16, 14]} /><meshStandardMaterial color={skin} roughness={0.85} /></mesh>
            <mesh position={[0, -0.02, 0.29]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color={skin} roughness={0.85} /></mesh>
            {[-0.11, 0.11].map((x) => (
              <group key={x}>
                <mesh position={[x, 0.04, 0.255]}><sphereGeometry args={[0.052, 8, 8]} /><meshStandardMaterial color="#f4f1ea" roughness={0.4} /></mesh>
                <mesh position={[x, 0.04, 0.298]}><sphereGeometry args={[0.027, 8, 8]} /><meshStandardMaterial color="#1a1410" roughness={0.3} /></mesh>
                <mesh position={[x, 0.115, 0.27]} rotation={[0, 0, x > 0 ? -0.15 : 0.15]}><boxGeometry args={[0.11, 0.022, 0.03]} /><meshStandardMaterial color={hairC} /></mesh>
                <mesh position={[x * 2.6, 0, 0]}><sphereGeometry args={[0.055, 8, 8]} /><meshStandardMaterial color={skin} roughness={0.85} /></mesh>
              </group>
            ))}
            <mesh position={[0, -0.12, 0.26]}><boxGeometry args={[0.12, 0.02, 0.03]} /><meshStandardMaterial color="#7a3d2a" /></mesh>

            {/* Hair */}
            {capHair && (
              <mesh position={[0, 0.07, -0.03]} rotation={[-0.3, 0, 0]}>
                <sphereGeometry args={[0.325, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
                <meshStandardMaterial color={hairC} roughness={0.95} />
              </mesh>
            )}
            {appearance.hair === 'short' && [[-0.16, 0.3, 0.12], [0.05, 0.34, 0.1], [0.2, 0.28, 0.08], [-0.05, 0.36, -0.1], [-0.2, 0.22, -0.1], [0.19, 0.22, -0.12]].map(([x, y, z], i) => (
              <mesh key={i} position={[x, y, z]}><sphereGeometry args={[0.085, 8, 8]} /><meshStandardMaterial color={hairC} roughness={0.95} /></mesh>
            ))}
            {appearance.hair === 'afro' && (
              <mesh position={[0, 0.1, -0.05]}>
                <sphereGeometry args={[0.52, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.64]} />
                <meshStandardMaterial color={hairC} roughness={1} />
              </mesh>
            )}
            {appearance.hair === 'bun' && <mesh position={[0, 0.42, -0.06]}><sphereGeometry args={[0.16, 10, 10]} /><meshStandardMaterial color={hairC} roughness={0.95} /></mesh>}
            {appearance.hair === 'ponytail' && (
              <group position={[0, 0.02, -0.34]} rotation={[0.5, 0, 0]}>
                <mesh position={[0, -0.28, 0]}><cylinderGeometry args={[0.09, 0.04, 0.6, 8]} /><meshStandardMaterial color={hairC} roughness={0.95} /></mesh>
                <mesh><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={GOLD} metalness={0.6} roughness={0.4} /></mesh>
              </group>
            )}
            {appearance.hair === 'braids' && [-0.24, -0.12, 0, 0.12, 0.24].map((x) => (
              <mesh key={x} position={[x, -0.3, -0.2]}><cylinderGeometry args={[0.04, 0.03, 0.75, 6]} /><meshStandardMaterial color={hairC} roughness={0.95} /></mesh>
            ))}
            {appearance.hair === 'dreads' && Array.from({ length: 9 }, (_, i) => {
              const a = (i / 9) * Math.PI * 2;
              return (
                <mesh key={i} position={[Math.cos(a) * 0.27, -0.22, Math.sin(a) * 0.24 - 0.04]}>
                  <cylinderGeometry args={[0.045, 0.035, 0.7, 6]} /><meshStandardMaterial color={hairC} roughness={0.95} />
                </mesh>
              );
            })}

            {/* Hats */}
            {appearance.hat === 'cap' && (
              <group>
                <mesh position={[0, 0.09, 0]}><sphereGeometry args={[0.335, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} /><meshStandardMaterial color={tunic} roughness={0.8} /></mesh>
                <mesh position={[0, 0.1, 0.3]} rotation={[0.15, 0, 0]}><boxGeometry args={[0.42, 0.03, 0.26]} /><meshStandardMaterial color={tunic} roughness={0.8} /></mesh>
              </group>
            )}
            {appearance.hat === 'beanie' && (
              <group>
                <mesh position={[0, 0.06, 0]}><sphereGeometry args={[0.35, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} /><meshStandardMaterial color={trousers} roughness={1} /></mesh>
                <mesh position={[0, 0.4, 0]}><sphereGeometry args={[0.08, 8, 8]} /><meshStandardMaterial color={trousers} roughness={1} /></mesh>
              </group>
            )}
            {appearance.hat === 'tophat' && (
              <group position={[0, 0.3, 0]}>
                <mesh><cylinderGeometry args={[0.43, 0.43, 0.04, 18]} /><meshStandardMaterial color="#1a1a22" roughness={0.5} /></mesh>
                <mesh position={[0, 0.25, 0]}><cylinderGeometry args={[0.25, 0.27, 0.5, 16]} /><meshStandardMaterial color="#1a1a22" roughness={0.5} /></mesh>
                <mesh position={[0, 0.07, 0]}><cylinderGeometry args={[0.275, 0.275, 0.08, 16]} /><meshStandardMaterial color={tunic} roughness={0.6} /></mesh>
              </group>
            )}
            {appearance.hat === 'crown' && (
              <group position={[0, 0.32, 0]}>
                <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.27, 0.045, 8, 20]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} /></mesh>
                {Array.from({ length: 6 }, (_, i) => {
                  const a = (i / 6) * Math.PI * 2;
                  return (
                    <mesh key={i} position={[Math.cos(a) * 0.27, 0.12, Math.sin(a) * 0.27]}>
                      <coneGeometry args={[0.06, 0.22, 5]} /><meshStandardMaterial color={GOLD} metalness={0.85} roughness={0.3} />
                    </mesh>
                  );
                })}
              </group>
            )}

            {/* Face accessories */}
            {appearance.accessory === 'glasses' && (
              <group position={[0, 0.04, 0.3]}>
                {[-0.11, 0.11].map((x) => (
                  <mesh key={x} position={[x, 0, 0]}><torusGeometry args={[0.075, 0.014, 8, 18]} /><meshStandardMaterial color="#1a1a22" metalness={0.5} roughness={0.4} /></mesh>
                ))}
                <mesh><boxGeometry args={[0.07, 0.014, 0.014]} /><meshStandardMaterial color="#1a1a22" /></mesh>
              </group>
            )}
            {appearance.accessory === 'earrings' && [-0.33, 0.33].map((x) => (
              <mesh key={x} position={[x, -0.1, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color={GOLD} metalness={0.9} roughness={0.25} /></mesh>
            ))}
            {appearance.accessory === 'beard' && (
              <mesh position={[0, -0.2, 0.11]} scale={[1, 0.85, 0.9]}><sphereGeometry args={[0.23, 12, 10]} /><meshStandardMaterial color={hairC} roughness={1} /></mesh>
            )}
          </group>

          {/* Arms */}
          {([[-0.5, armL, elbowL], [0.5, armR, elbowR]] as const).map(([x, ref, elbowRef]) => (
            <group key={x} ref={ref} position={[x * shoulder, 0.74, 0]}>
              <mesh castShadow position={[0, -0.2, 0]}><cylinderGeometry args={[0.1, 0.09, 0.42, 8]} /><meshStandardMaterial color={tunic} roughness={0.75} /></mesh>
              <group ref={elbowRef} position={[0, -0.42, 0]}>
                <mesh castShadow position={[0, -0.18, 0]}><cylinderGeometry args={[0.09, 0.08, 0.38, 8]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
                <mesh position={[0, -0.4, 0]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color={LEATHER_DARK} roughness={0.8} /></mesh>
                {x > 0 && (
                  <group ref={handSword} position={[0, -0.4, 0]} rotation={[-0.9, 0, 0]} visible={false}>
                    <mesh position={[0, -0.02, 0]}><cylinderGeometry args={[0.04, 0.04, 0.3, 6]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
                    <mesh position={[0, -0.2, 0]}><boxGeometry args={[0.34, 0.06, 0.09]} /><meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} /></mesh>
                    <mesh position={[0, -0.75, 0]}><boxGeometry args={[0.09, 1.05, 0.03]} /><meshStandardMaterial color="#dfe8f5" metalness={0.9} roughness={0.2} emissive="#52e0ff" emissiveIntensity={0.45} /></mesh>
                    <mesh position={[0, -1.34, 0]}><coneGeometry args={[0.05, 0.14, 4]} /><meshStandardMaterial color="#dfe8f5" metalness={0.9} roughness={0.2} emissive="#52e0ff" emissiveIntensity={0.45} /></mesh>
                  </group>
                )}
              </group>
              {/* Pauldron */}
              <mesh castShadow position={[x > 0 ? 0.03 : -0.03, 0.06, 0]}>
                <sphereGeometry args={[0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
                <meshStandardMaterial color={LEATHER} roughness={0.5} />
              </mesh>
              <mesh position={[x > 0 ? 0.03 : -0.03, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.2, 0.025, 6, 14]} />
                <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
              </mesh>
            </group>
          ))}

          {/* Backpack */}
          {backpack && (
            <group position={[0, 0.45, -0.38]}>
              <mesh castShadow><boxGeometry args={[0.52, 0.66, 0.26]} /><meshStandardMaterial color={trousers} roughness={0.85} /></mesh>
              <mesh position={[0, 0.2, 0.14]}><boxGeometry args={[0.46, 0.2, 0.05]} /><meshStandardMaterial color={LEATHER} roughness={0.8} /></mesh>
            </group>
          )}

          {/* Cloak hanging from the shoulders */}
          <group ref={cloak} position={[0, 0.82, backpack ? -0.58 : -0.26]}>
            <mesh castShadow position={[0, -0.675, -0.02]}>
              <boxGeometry args={[0.92, 1.35, 0.05]} />
              <meshStandardMaterial color={cloakColor} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0, -0.675, -0.055]}>
              <boxGeometry args={[0.8, 1.24, 0.02]} />
              <meshStandardMaterial color={GOLD} roughness={0.8} side={THREE.DoubleSide} />
            </mesh>
          </group>
          <mesh position={[0, 0.82, backpack ? -0.3 : -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.26, 0.07, 6, 16]} />
            <meshStandardMaterial color={cloakColor} roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.8, 0.26]}>
            <sphereGeometry args={[0.055, 8, 8]} />
            <meshStandardMaterial color={GOLD} metalness={0.8} roughness={0.3} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
