import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, Heart, Lock, Zap } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { WORLDS } from '../data/worlds';
import { getXpForNextLevel } from '../data/ranks';
import { Player } from './WorldScene';
import { Crystal } from './QuestStage';
import { SceneBoundary } from './ui/SceneBoundary';
import { usePrefersReducedMotion, useCoarsePointer } from '../hooks/usePrefersReducedMotion';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';

const RING_RADIUS = 26;
const BOUNDS = 48;
const INTERACT_RADIUS = 5;
const MOVE_SPEED = 10;
const SPAWN: [number, number, number] = [0, 0, 13];
// Solid circles the player cannot walk through: [x, z, radius]. Currently just the Royal Repository.
const OBSTACLES: Array<[number, number, number]> = [[0, 0, 7]];
const TIP_KEY = 'gitquest:explore-tip-seen'; // device-level UI preference, not game progress

interface PortalInfo {
  id: number;
  name: string;
  color: string;
  position: [number, number, number];
  unlocked: boolean;
}

type MoveKeys = { forward: boolean; back: boolean; left: boolean; right: boolean };
type StickVector = { x: number; z: number };

const KEY_MAP: Record<string, keyof MoveKeys> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

function tipAlreadySeen(): boolean {
  try {
    return localStorage.getItem(TIP_KEY) === '1';
  } catch {
    return false;
  }
}

/** Royal Repository landmark, built from primitives (placeholder for a modelled castle; see docs/DESIGN.md). */
function Castle() {
  const wall = '#33466f';
  const roof = '#2b5cc4';
  return (
    <group>
      <mesh position={[0, 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[9, 4, 9]} />
        <meshStandardMaterial color={wall} roughness={0.9} />
      </mesh>
      {[[-4.5, -4.5], [4.5, -4.5], [-4.5, 4.5], [4.5, 4.5]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 3.5, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.3, 7, 12]} />
            <meshStandardMaterial color="#3b5080" roughness={0.9} />
          </mesh>
          <mesh position={[0, 8.2, 0]} castShadow>
            <coneGeometry args={[1.7, 2.6, 12]} />
            <meshStandardMaterial color={roof} roughness={0.6} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 7.5, 0]} castShadow>
        <boxGeometry args={[4.6, 7, 4.6]} />
        <meshStandardMaterial color="#3a4f7c" roughness={0.9} />
      </mesh>
      <mesh position={[0, 13.2, 0]} castShadow>
        <coneGeometry args={[3.4, 4.4, 4]} />
        <meshStandardMaterial color={roof} roughness={0.6} />
      </mesh>
      {/* Gate and lit windows */}
      <mesh position={[0, 1.4, 4.52]}>
        <boxGeometry args={[2, 2.8, 0.2]} />
        <meshStandardMaterial color="#0a1020" emissive="#f5b942" emissiveIntensity={0.25} />
      </mesh>
      {[[-1.2, 8.5], [1.2, 8.5], [0, 6]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 2.32]}>
          <boxGeometry args={[0.5, 0.9, 0.1]} />
          <meshStandardMaterial color="#f5b942" emissive="#f5b942" emissiveIntensity={1.4} />
        </mesh>
      ))}
      <pointLight position={[0, 4, 6]} color="#ffcf80" intensity={30} distance={22} />
    </group>
  );
}

function PortalPillar({ portal, highlighted, reduced }: { portal: PortalInfo; highlighted: boolean; reduced: boolean }) {
  const ring = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ring.current && !reduced) ring.current.rotation.z += delta * (portal.unlocked ? 1.0 : 0.15);
  });
  const color = portal.unlocked ? portal.color : '#4b5563';
  // Face the castle so players walking out from the center see the open side of the gate.
  const facing = Math.atan2(-portal.position[0], -portal.position[2]);
  return (
    <group position={portal.position} rotation={[0, facing, 0]}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[3, 3.3, 0.6, 24]} />
        <meshStandardMaterial color="#1f2937" roughness={0.8} />
      </mesh>
      {[-2.1, 2.1].map((x) => (
        <mesh key={x} position={[x, 2.5, 0]} castShadow>
          <cylinderGeometry args={[0.35, 0.45, 4.4, 10]} />
          <meshStandardMaterial color="#2c3d63" roughness={0.85} />
        </mesh>
      ))}
      <mesh ref={ring} position={[0, 3.4, 0]}>
        <torusGeometry args={[1.7, 0.2, 16, 40]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={portal.unlocked ? (highlighted ? 1.5 : 0.6) : 0.05}
        />
      </mesh>
      <mesh position={[0, 3.4, 0]}>
        <circleGeometry args={[1.55, 32]} />
        <meshBasicMaterial color={color} transparent opacity={portal.unlocked ? (highlighted ? 0.55 : 0.3) : 0.08} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {portal.unlocked && <pointLight position={[0, 3.4, 1]} color={color} intensity={highlighted ? 40 : 14} distance={16} />}
      <Html center position={[0, 6.4, 0]} distanceFactor={16} zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
        <div className="whitespace-nowrap rounded-full border border-kq-edge bg-kq-deep/85 px-3 py-1 text-sm text-kq-text backdrop-blur-sm select-none">
          {portal.unlocked ? (
            <span style={{ color: portal.color }} className="font-semibold">World {portal.id}</span>
          ) : (
            <span className="text-kq-muted">World {portal.id} 🔒</span>
          )}
          <span className="text-kq-muted"> · {portal.name}</span>
        </div>
      </Html>
    </group>
  );
}

interface ControllerProps {
  appearance: CharacterAppearance;
  portals: PortalInfo[];
  stick: MutableRefObject<StickVector>;
  onNearChange: (id: number | null) => void;
}

/** Keyboard + touch-stick character with a third-person follow camera. */
function PlayerController({ appearance, portals, stick, onNearChange }: ControllerProps) {
  const group = useRef<THREE.Group>(null);
  const keys = useRef<MoveKeys>({ forward: false, back: false, left: false, right: false });
  const heading = useRef(Math.PI);
  const nearRef = useRef<number | null>(null);
  const desired = useMemo(() => new THREE.Vector3(), []);
  const lookAt = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();

  useEffect(() => {
    const set = (e: KeyboardEvent, value: boolean) => {
      const dir = KEY_MAP[e.code];
      // Never steal keys while the player is typing in a text field.
      if (!dir || isTypingTarget(e.target)) return;
      e.preventDefault();
      keys.current[dir] = value;
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const blur = () => {
      keys.current = { forward: false, back: false, left: false, right: false };
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const k = keys.current;
    let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0) + stick.current.x;
    let dz = (k.back ? 1 : 0) - (k.forward ? 1 : 0) + stick.current.z;
    let mag = Math.hypot(dx, dz);

    if (mag > 0.08) {
      if (mag > 1) {
        dx /= mag;
        dz /= mag;
        mag = 1;
      }
      g.position.x += dx * MOVE_SPEED * dt;
      g.position.z += dz * MOVE_SPEED * dt;

      // World edge
      const r = Math.hypot(g.position.x, g.position.z);
      if (r > BOUNDS) {
        g.position.x *= BOUNDS / r;
        g.position.z *= BOUNDS / r;
      }
      // Solid landmarks
      for (const [ox, oz, or] of OBSTACLES) {
        const ex = g.position.x - ox;
        const ez = g.position.z - oz;
        const d = Math.hypot(ex, ez);
        if (d < or && d > 0.0001) {
          g.position.x = ox + (ex / d) * or;
          g.position.z = oz + (ez / d) * or;
        }
      }
      // Turn smoothly (shortest arc) to face the direction of travel.
      const target = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(target - heading.current), Math.cos(target - heading.current));
      heading.current += diff * Math.min(1, dt * 10);
      g.rotation.y = heading.current;
    }

    // Third-person follow camera: behind and above, eased, frame-rate independent.
    desired.set(g.position.x, 9, g.position.z + 14);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
    lookAt.set(g.position.x, 2, g.position.z);
    camera.lookAt(lookAt);

    // Nearest portal within interaction range.
    let nearest: number | null = null;
    let best = INTERACT_RADIUS;
    for (const p of portals) {
      const d = Math.hypot(p.position[0] - g.position.x, p.position[2] - g.position.z);
      if (d < best) {
        best = d;
        nearest = p.id;
      }
    }
    if (nearest !== nearRef.current) {
      nearRef.current = nearest;
      onNearChange(nearest);
    }
  });

  return (
    <group ref={group} position={SPAWN} rotation={[0, Math.PI, 0]}>
      <Player appearance={appearance} position={[0, 0, 0]} spin={false} />
    </group>
  );
}

function Kingdom({ portals, nearId, reduced, coarse }: { portals: PortalInfo[]; nearId: number | null; reduced: boolean; coarse: boolean }) {
  // Deterministic scenery so it does not reshuffle between renders.
  const trees = useMemo(() => {
    let seed = 7;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    return Array.from({ length: coarse ? 24 : 40 }, (_, i) => {
      const a = rnd() * Math.PI * 2;
      const r = 10 + rnd() * 40;
      return { key: i, x: Math.cos(a) * r, z: Math.sin(a) * r, h: 1.8 + rnd() * 2.6 };
    });
  }, [coarse]);

  const crystals = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.2;
        const r = i % 2 ? 15 : 20;
        return { key: i, position: [Math.cos(a) * r, 1.2, Math.sin(a) * r] as [number, number, number], color: ['#3dd6f5', '#f5b942', '#34d399'][i % 3] };
      }),
    []
  );

  return (
    <>
      <color attach="background" args={['#081029']} />
      <fog attach="fog" args={['#0d1b3d', 40, 115]} />
      <hemisphereLight args={['#8fb4ff', '#1b2a1f', 0.85]} />
      <directionalLight position={[22, 32, 12]} intensity={1.3} color="#ffd9a0" castShadow={!coarse} shadow-mapSize={[1024, 1024]} />
      <Stars radius={110} depth={40} count={coarse ? 500 : 1400} factor={4} fade speed={reduced ? 0 : 0.4} />

      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[BOUNDS + 12, 64]} />
        <meshStandardMaterial color="#143323" roughness={1} />
      </mesh>
      {/* Cobbled paths from the castle to each world */}
      {portals.map((p) => {
        const mid = (7 + RING_RADIUS) / 2;
        const len = RING_RADIUS - 7;
        const ux = p.position[0] / RING_RADIUS;
        const uz = p.position[2] / RING_RADIUS;
        return (
          <mesh key={`path-${p.id}`} position={[ux * mid, 0.02, uz * mid]} rotation={[0, Math.atan2(ux, uz), 0]} receiveShadow>
            <boxGeometry args={[2.6, 0.04, len]} />
            <meshStandardMaterial color="#3a4a6e" roughness={0.95} />
          </mesh>
        );
      })}

      <Castle />

      {trees.map((t) => (
        <mesh key={t.key} position={[t.x, t.h / 2, t.z]} castShadow>
          <coneGeometry args={[0.95, t.h, 6]} />
          <meshStandardMaterial color="#14532d" roughness={0.9} flatShading />
        </mesh>
      ))}
      {crystals.map((c) => (
        <Crystal key={c.key} position={c.position} color={c.color} speed={0.9} reduced={reduced} />
      ))}
      {portals.map((p) => (
        <PortalPillar key={p.id} portal={p} highlighted={p.id === nearId} reduced={reduced} />
      ))}
    </>
  );
}

/** On-screen movement stick for touch devices. Writes a -1..1 vector the 3D controller reads each frame. */
function TouchStick({ vector }: { vector: MutableRefObject<StickVector> }) {
  const RADIUS = 48;
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let dx = e.clientX - (rect.left + rect.width / 2);
    let dy = e.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    setKnob({ x: dx, y: dy });
    const nx = dx / RADIUS;
    const nz = dy / RADIUS;
    vector.current = Math.hypot(nx, nz) < 0.15 ? { x: 0, z: 0 } : { x: nx, z: nz }; // small dead zone
  };
  const end = () => {
    setKnob({ x: 0, y: 0 });
    vector.current = { x: 0, z: 0 };
  };

  return (
    <div
      ref={base}
      role="group"
      aria-label="Movement stick"
      className="absolute bottom-6 left-6 h-32 w-32 touch-none select-none rounded-full border border-kq-edge bg-kq-deep/70 backdrop-blur"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) update(e);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-kq-cyan/70 bg-kq-cyan/25"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

export function ExploreView() {
  const { progress, appearance, enterWorld, setScreen } = useGame();
  const [nearId, setNearId] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(() => !tipAlreadySeen());
  const stick = useRef<StickVector>({ x: 0, z: 0 });
  const tipButton = useRef<HTMLButtonElement>(null);
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();

  const unlocked = progress?.unlockedWorlds ?? [1];
  const portals = useMemo<PortalInfo[]>(
    () =>
      WORLDS.map((w, i) => {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / WORLDS.length;
        return {
          id: w.id,
          name: w.name,
          color: w.color,
          position: [Math.cos(angle) * RING_RADIUS, 0, Math.sin(angle) * RING_RADIUS] as [number, number, number],
          unlocked: unlocked.includes(w.id),
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unlocked.join(',')]
  );

  const nearPortal = portals.find((p) => p.id === nearId) ?? null;

  useEffect(() => {
    if (showTip) tipButton.current?.focus();
  }, [showTip]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || showTip) return;
      if ((e.code === 'KeyE' || e.code === 'Enter') && nearPortal?.unlocked) {
        e.preventDefault();
        enterWorld(nearPortal.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearPortal, enterWorld, showTip]);

  const dismissTip = () => {
    try {
      localStorage.setItem(TIP_KEY, '1');
    } catch {
      /* storage unavailable: the tip will simply show again next visit */
    }
    setShowTip(false);
  };

  const xp = progress ? getXpForNextLevel(progress.totalXp) : null;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-kq-night text-kq-text">
      <SceneBoundary
        fallback={
          <div className="absolute inset-0 grid place-items-center px-6 text-center text-kq-muted">
            3D exploration isn&apos;t available on this device. Use the world map to choose a quest instead.
            <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-primary mt-4">Open world map</button>
          </div>
        }
      >
        <Canvas
          shadows={!coarse}
          dpr={coarse ? 1 : [1, 1.5]}
          camera={{ position: [SPAWN[0], 9, SPAWN[2] + 14], fov: 55 }}
          gl={{ antialias: !coarse }}
        >
          <Kingdom portals={portals} nearId={nearId} reduced={reduced} coarse={coarse} />
          <PlayerController appearance={appearance} portals={portals} stick={stick} onNearChange={setNearId} />
        </Canvas>
      </SceneBoundary>

      {/* Top bar */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-start justify-between gap-3 p-3 sm:p-4">
        <button onClick={() => setScreen('worldMap')} className="kq-btn kq-btn-ghost pointer-events-auto !min-h-[40px] text-sm">
          <ArrowLeft size={16} aria-hidden="true" /> World map
        </button>
        {progress && xp && (
          <div className="kq-panel pointer-events-none flex items-center gap-3 px-3 py-1.5 text-sm">
            <span className="font-display text-kq-gold">{progress.rank}</span>
            <span className="flex items-center gap-1"><Heart size={14} className="text-kq-ruby" fill="currentColor" aria-hidden="true" />{progress.health}/{progress.maxHealth}</span>
            <span className="flex items-center gap-1"><Zap size={14} className="text-kq-gold" fill="currentColor" aria-hidden="true" />{progress.totalXp} XP</span>
          </div>
        )}
        {!coarse && (
          <div className="kq-panel pointer-events-none hidden px-3 py-1.5 text-sm text-kq-muted md:block">
            Move: <b className="text-kq-text">WASD</b> / arrows · Enter: <b className="text-kq-text">E</b>
          </div>
        )}
      </div>

      {coarse && <TouchStick vector={stick} />}

      {/* Portal prompt */}
      {nearPortal && (
        <div className="absolute bottom-8 left-1/2 w-[92%] max-w-md -translate-x-1/2 text-center sm:bottom-10">
          {nearPortal.unlocked ? (
            <button onClick={() => enterWorld(nearPortal.id)} className="kq-btn kq-btn-gold w-full text-base" style={{ boxShadow: `0 0 22px ${nearPortal.color}55` }}>
              {coarse ? 'Tap' : 'Press E'} to enter World {nearPortal.id}: {nearPortal.name}
            </button>
          ) : (
            <div className="kq-panel flex items-center justify-center gap-2 px-4 py-3 text-kq-muted" role="status">
              <Lock size={14} aria-hidden="true" /> World {nearPortal.id} is locked. Finish earlier quests to open it.
            </div>
          )}
        </div>
      )}

      {/* First-visit controls card */}
      {showTip && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black/60 px-4">
          <div role="dialog" aria-modal="true" aria-labelledby="explore-tip-title" className="kq-panel kq-panel-gold w-full max-w-md p-6">
            <h2 id="explore-tip-title" className="kq-gold-text mb-3 text-2xl font-bold">Explore the kingdom</h2>
            <ul className="mb-5 space-y-2 text-base text-kq-text">
              <li><b className="text-kq-cyan">Move:</b> {coarse ? 'drag the stick at the bottom left.' : 'WASD or the arrow keys.'}</li>
              <li><b className="text-kq-cyan">Start a quest:</b> walk up to a glowing portal and {coarse ? 'tap the button that appears.' : 'press E.'}</li>
              <li><b className="text-kq-cyan">Grey portals</b> are locked until you finish earlier worlds.</li>
              <li><b className="text-kq-cyan">Not into walking?</b> The World map button takes you straight to your quests.</li>
            </ul>
            <button ref={tipButton} onClick={dismissTip} className="kq-btn kq-btn-primary w-full">Got it, let&apos;s go</button>
          </div>
        </div>
      )}
    </div>
  );
}
