import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { HeroModel } from '../hero/HeroModel';
import type { HeroAction } from '../hero/HeroModel';
import { gameAudio } from '../audio/GameAudio';
import { useCombatEvents } from '../hooks/useCombatEvents';
import { useGraphicsQuality } from '../settings/graphics';
import { Boss, Goblin, ShadowWraith, Skeleton, Slime } from '../world3d/creatures';
import { Cn, Glow, Scatter, Terrain, WorldLighting, useSmooth } from '../world3d/kit';
import type { Item } from '../world3d/kit';
import { ROAD_CORRIDOR, buildGems, buildStations, constrainToRoad, makePath, pointAt, project } from '../world3d/path';
import type { ChallengeLite, Gem, PathInfo, Station } from '../world3d/path';
import { getWorldDef } from '../world3d/worlds';
import { clampZoom } from '../world3d/zoom';
import { clampToDeck, onDeck, stepVertical, surfaceY } from '../world3d/surface';
import type { VState } from '../world3d/surface';
import { useCoarsePointer, usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type { StickVector } from './ui/TouchStick';
import type { WorldDef, WorldSignals } from '../world3d/types';
import type { CombatEvent } from '../types';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';

type MoveKeys = { forward: boolean; back: boolean; left: boolean; right: boolean };
const KEY_MAP: Record<string, keyof MoveKeys> = {
  KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
};
const MOVE_SPEED = 9;

function isTypingTarget(t: EventTarget | null): boolean {
  return t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

/* -------------------------------------------------------------------------- monsters */

const SCALE: Record<Station['kind'], number> = { goblin: 1.5, slime: 1.7, skeleton: 1.35, shadow: 1.25, boss: 1 };

function Monster({
  station, def, dead, active, engaged, done, total, events, reduced,
}: {
  station: Station; def: WorldDef; dead: boolean; active: boolean; engaged: boolean; done: number; total: number;
  events: CombatEvent[]; reduced: boolean;
}) {
  const g = useRef<THREE.Group>(null);
  const dying = useRef(dead ? 1 : 0);
  const hitT = useRef(0);
  const lungeT = useRef(0);
  const tauntT = useRef(0);
  useCombatEvents(events, (e) => {
    if (!active) return;
    if (e.type === 'hit' || e.type === 'defeated') hitT.current = 1; // knocked back
    if (e.type === 'player-hit' || e.type === 'player-down' || e.type === 'shield') lungeT.current = 1; // lunges at the hero
    if (e.type === 'miss') tauntT.current = 1; // shrugs it off
  });
  const y = def.heightAt(station.pos[0], station.pos[1]);

  useFrame((st, dt) => {
    const grp = g.current;
    if (!grp) return;
    dying.current = dead ? Math.min(1, dying.current + dt / 0.9) : 0;
    hitT.current = Math.max(0, hitT.current - dt * 3);
    lungeT.current = Math.max(0, lungeT.current - dt * 2.4);
    tauntT.current = Math.max(0, tauntT.current - dt * 2);
    const k = SCALE[station.kind] * (1 - dying.current) * (1 + 0.12 * hitT.current);
    grp.visible = dying.current < 0.98;
    grp.scale.setScalar(Math.max(0.001, k));
    grp.rotation.z = dying.current * 1.1;
    const shake = reduced ? 0 : Math.sin(st.clock.elapsedTime * 60) * 0.28 * hitT.current;
    grp.position.x = shake;
    grp.position.z = Math.sin(lungeT.current * Math.PI) * (station.kind === 'boss' ? 4.5 : 3) - hitT.current * 1.4;
    grp.position.y = -dying.current * 0.6 + Math.sin(tauntT.current * Math.PI) * 0.45;
    grp.rotation.x = -hitT.current * 0.3 + Math.sin(lungeT.current * Math.PI) * 0.35;
  });

  const labelY = station.kind === 'boss' ? 13 : station.kind === 'shadow' ? 5.4 : 4;
  return (
    <group position={[station.pos[0], y, station.pos[1]]} rotation={[0, station.facing, 0]}>
      <group ref={g}>
        {station.kind === 'goblin' && <Goblin reduced={reduced} />}
        {station.kind === 'slime' && <Slime reduced={reduced} />}
        {station.kind === 'skeleton' && <Skeleton reduced={reduced} />}
        {station.kind === 'shadow' && <ShadowWraith reduced={reduced} />}
        {station.kind === 'boss' && <Boss name={station.name} reduced={reduced} />}
      </group>
      {active && !dead && (
        <Html center position={[0, labelY, 0]} distanceFactor={station.kind === 'boss' ? 26 : 12} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-xl border bg-kq-deep/90 px-3 py-1.5 text-center backdrop-blur-sm" style={{ borderColor: engaged ? '#ff6a4d' : '#243455' }}>
            <div className="font-display text-sm text-kq-text">{station.isBoss ? '👑 ' : ''}{station.name}</div>
            <div className="text-base leading-none tracking-wider" aria-label={`${total - done} of ${total} health left`}>
              {Array.from({ length: total }, (_, i) => (i < total - done ? '❤️' : '🖤')).join(' ')}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

/** Glowing beam + arrow above the monster you must fight next, and its battle-zone ring. */
function TargetMarker({ station, def, engaged, reduced }: { station: Station; def: WorldDef; engaged: boolean; reduced: boolean }) {
  const arrow = useRef<THREE.Group>(null);
  const beam = useSmooth(engaged ? 0.25 : 1, 2);
  const ring = useSmooth(engaged ? 1 : 0.35, 3);
  const y = def.heightAt(station.pos[0], station.pos[1]);
  useFrame((st) => {
    if (arrow.current && !reduced) arrow.current.position.y = (station.kind === 'boss' ? 17 : 6.4) + Math.sin(st.clock.elapsedTime * 3) * 0.4;
  });
  return (
    <group position={[station.pos[0], y, station.pos[1]]}>
      <Glow level={beam} min={0} max={1.4} color="#52e0ff" p={[0, 18, 0]} opacity={[0, 0.22]}>
        <cylinderGeometry args={[0.5, 0.8, 36, 10, 1, true]} />
      </Glow>
      <group ref={arrow} position={[0, 6.4, 0]}>
        <Cn a={[0.7, 1.4, 4]} r={[Math.PI, 0, 0]} c="#ffd24d" e="#ffb300" ei={1.4} shadow={false} />
      </group>
      {station.engage < 20 && (
        <Glow level={ring} min={0.15} max={1.8} color="#ff6a4d" p={[0, 0.7, 0]} r={[-Math.PI / 2, 0, 0]} opacity={[0.25, 0.9]}>
          <ringGeometry args={[station.engage - 0.4, station.engage, 56]} />
        </Glow>
      )}
    </group>
  );
}

/* -------------------------------------------------------------------------- combat effects */

type Vec3 = [number, number, number];
interface FxItem {
  key: number;
  kind: 'bolt' | 'burst' | 'text';
  from: Vec3;
  to: Vec3;
  color: string;
  text?: string;
  delay: number;
  life: number;
  size: number;
}

function Bolt({ item }: { item: FxItem }) {
  const g = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame((st) => {
    const grp = g.current;
    if (!grp) return;
    if (t0.current === null) t0.current = st.clock.elapsedTime;
    const t = st.clock.elapsedTime - t0.current - item.delay;
    if (t < 0 || t > item.life) { grp.visible = false; return; }
    const k = t / item.life;
    grp.visible = true;
    grp.position.set(
      item.from[0] + (item.to[0] - item.from[0]) * k,
      item.from[1] + (item.to[1] - item.from[1]) * k + Math.sin(k * Math.PI) * 0.9,
      item.from[2] + (item.to[2] - item.from[2]) * k
    );
    grp.scale.setScalar(item.size * (1 + 0.25 * Math.sin(k * 24)));
  });
  return (
    <group ref={g} visible={false}>
      <mesh><sphereGeometry args={[0.5, 12, 10]} /><meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={3.5} /></mesh>
      <mesh scale={2}><sphereGeometry args={[0.5, 10, 8]} /><meshBasicMaterial color={item.color} transparent opacity={0.28} depthWrite={false} /></mesh>
    </group>
  );
}

function Burst({ item }: { item: FxItem }) {
  const refs = useRef<Array<THREE.Mesh | null>>([]);
  const t0 = useRef<number | null>(null);
  const dirs = useMemo(
    () => Array.from({ length: 18 }, () => {
      const a = Math.random() * Math.PI * 2;
      const e = Math.random() * 1.3 - 0.2;
      return new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(e) + 0.4, Math.sin(a) * Math.cos(e)).multiplyScalar((2.5 + Math.random() * 3.5) * Math.max(0.8, item.size));
    }),
    [item.size]
  );
  useFrame((st) => {
    if (t0.current === null) t0.current = st.clock.elapsedTime;
    const t = st.clock.elapsedTime - t0.current - item.delay;
    const live = t >= 0 && t <= item.life;
    const k = Math.max(0, Math.min(1, t / item.life));
    dirs.forEach((d, i) => {
      const m = refs.current[i];
      if (!m) return;
      m.visible = live;
      if (!live) return;
      m.position.set(d.x * t, d.y * t - 5 * t * t, d.z * t);
      m.scale.setScalar(0.34 * item.size * (1 - k));
    });
  });
  return (
    <group position={item.from}>
      {dirs.map((_, i) => (
        <mesh key={i} ref={(el) => { refs.current[i] = el; }} visible={false}>
          <octahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={3} />
        </mesh>
      ))}
    </group>
  );
}

function FloatText({ item }: { item: FxItem }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShow(true), item.delay * 1000);
    return () => clearTimeout(id);
  }, [item.delay]);
  if (!show) return null;
  return (
    <Html center position={[item.from[0], item.from[1] + 1.4, item.from[2]]} zIndexRange={[40, 0]} style={{ pointerEvents: 'none' }}>
      <div className="fx-text" style={{ color: item.color }}>{item.text}</div>
    </Html>
  );
}

/** Visible feedback for every combat beat: swords flash, bolts fly, impacts burst, numbers float up. */
function CombatFx({ events, heroPos, target, reduced }: {
  events: CombatEvent[]; heroPos: MutableRefObject<THREE.Vector3>; target: { pos: Vec3; chest: number } | null; reduced: boolean;
}) {
  const [items, setItems] = useState<FxItem[]>([]);
  const counter = useRef(0);
  const push = useCallback((list: Array<Omit<FxItem, 'key'>>) => {
    const keyed = list.map((i) => ({ ...i, key: ++counter.current }));
    setItems((prev) => [...prev, ...keyed]);
    for (const it of keyed) setTimeout(() => setItems((prev) => prev.filter((p) => p.key !== it.key)), (it.delay + it.life + 0.3) * 1000);
  }, []);

  useCombatEvents(events, (e) => {
    const h = heroPos.current;
    const hero: Vec3 = [h.x, h.y + 1.8, h.z];
    const mon: Vec3 | null = target ? [target.pos[0], target.pos[1] + target.chest, target.pos[2]] : null;
    const travel = mon ? Math.min(0.55, Math.max(0.22, Math.hypot(mon[0] - hero[0], mon[2] - hero[2]) / 45)) : 0.3;
    const out: Array<Omit<FxItem, 'key'>> = [];
    if (e.type === 'hit' && mon) {
      if (!reduced) {
        out.push({ kind: 'bolt', from: hero, to: mon, color: '#9ff3ff', delay: 0.22, life: travel, size: 0.5 });
        out.push({ kind: 'burst', from: mon, to: mon, color: '#ffd24d', delay: 0.22 + travel, life: 0.6, size: 1 });
      }
      out.push({ kind: 'text', from: mon, to: mon, color: '#ffd24d', text: 'HIT!', delay: 0.22 + travel, life: 1.1, size: 1 });
    }
    if (e.type === 'defeated' && mon) {
      if (!reduced) out.push({ kind: 'burst', from: mon, to: mon, color: '#34d399', delay: 0.3 + travel, life: 0.9, size: 2.2 });
      out.push({ kind: 'text', from: [mon[0], mon[1] + 1.2, mon[2]], to: mon, color: '#34d399', text: 'DEFEATED!', delay: 0.35 + travel, life: 1.4, size: 1 });
    }
    if (e.type === 'miss' && mon) {
      out.push({ kind: 'text', from: mon, to: mon, color: '#c8d3ee', text: 'No effect…', delay: 0.05, life: 1.1, size: 1 });
    }
    if (e.type === 'player-hit' && e.damage === 0 && mon) {
      out.push({ kind: 'text', from: hero, to: hero, color: '#7df9ff', text: 'Practice: 0 HP', delay: 0.3 + travel, life: 1.2, size: 1 });
    }
    if (e.type === 'shield') {
      if (!reduced && mon) out.push({ kind: 'bolt', from: mon, to: hero, color: '#ff5a4d', delay: 0.3, life: travel, size: 0.6 });
      if (!reduced) out.push({ kind: 'burst', from: hero, to: hero, color: '#7df9ff', delay: 0.3 + travel, life: 0.7, size: 1.2 });
      out.push({ kind: 'text', from: hero, to: hero, color: '#7df9ff', text: 'BLOCKED!', delay: 0.3 + travel, life: 1.2, size: 1 });
    }
    if (e.type === 'heal') {
      if (!reduced) out.push({ kind: 'burst', from: hero, to: hero, color: '#34d399', delay: 0, life: 0.8, size: 1.3 });
      out.push({ kind: 'text', from: hero, to: hero, color: '#34d399', text: `+${e.amount} HP`, delay: 0, life: 1.2, size: 1 });
    }
    if (e.type === 'player-hit' && e.damage > 0 && mon) {
      if (!reduced) {
        out.push({ kind: 'bolt', from: mon, to: hero, color: '#ff5a4d', delay: 0.3, life: travel, size: 0.6 });
        out.push({ kind: 'burst', from: hero, to: hero, color: '#ff5a4d', delay: 0.3 + travel, life: 0.6, size: 1 });
      }
      out.push({ kind: 'text', from: hero, to: hero, color: '#ff6b7a', text: `-${e.damage} HP`, delay: 0.3 + travel, life: 1.2, size: 1 });
    }
    if (e.type === 'gem') {
      if (!reduced) out.push({ kind: 'burst', from: hero, to: hero, color: '#3dd6f5', delay: 0, life: 0.6, size: 0.8 });
      out.push({ kind: 'text', from: hero, to: hero, color: '#3dd6f5', text: `+${e.xp} XP`, delay: 0, life: 1.1, size: 1 });
    }
    if (out.length) push(out);
  });

  return (
    <>
      {items.map((it) => (it.kind === 'bolt' ? <Bolt key={it.key} item={it} /> : it.kind === 'burst' ? <Burst key={it.key} item={it} /> : <FloatText key={it.key} item={it} />))}
    </>
  );
}

/* -------------------------------------------------------------------------- path + gems */

function PathTrail({ def, path, prevS, activeS, signals }: { def: WorldDef; path: PathInfo; prevS: number; activeS: number; signals: WorldSignals }) {
  const sets = useMemo(() => {
    const cleared: Item[] = [], active: Item[] = [], future: Item[] = [];
    const step = 2.4;
    for (let s = 1; s < path.total; s += step) {
      const [x, z] = pointAt(path, s);
      const y = surfaceY(def, x, z, 99, signals) + 0.1;
      const [nx, nz] = pointAt(path, s + 0.5);
      const it: Item = { x, y, z, ry: Math.atan2(nx - x, nz - z) };
      (s < prevS ? cleared : s <= activeS ? active : future).push(it);
    }
    return { cleared, active, future };
    // signals only affects bridge-height lookups; keep dots stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def, path, prevS, activeS]);
  return (
    <>
      <Scatter items={sets.cleared}><cylinderGeometry args={[0.38, 0.38, 0.07, 10]} /><meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={0.35} /></Scatter>
      <Scatter items={sets.active}><cylinderGeometry args={[0.5, 0.5, 0.08, 10]} /><meshStandardMaterial color="#7df9ff" emissive="#52e0ff" emissiveIntensity={1.5} /></Scatter>
      <Scatter items={sets.future}><cylinderGeometry args={[0.32, 0.32, 0.06, 10]} /><meshStandardMaterial color="#8a97b8" emissive="#6b7aa3" emissiveIntensity={0.25} /></Scatter>
    </>
  );
}

const GEM_COLORS = ['#3dd6f5', '#f5b942', '#34d399'];
function GemMesh({ gem, i, def, reduced, signals }: { gem: Gem; i: number; def: WorldDef; reduced: boolean; signals: WorldSignals }) {
  const ref = useRef<THREE.Group>(null);
  const y = surfaceY(def, gem.pos[0], gem.pos[1], 99, signals) + 1.1;
  const color = GEM_COLORS[i % 3];
  useFrame((st, dt) => {
    if (!ref.current || reduced) return;
    ref.current.rotation.y += dt * 1.8;
    ref.current.position.y = y + Math.sin(st.clock.elapsedTime * 2 + i) * 0.18;
  });
  return (
    <group ref={ref} position={[gem.pos[0], y, gem.pos[1]]}>
      <mesh castShadow>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.3} roughness={0.15} flatShading />
      </mesh>
    </group>
  );
}

/** A shimmering gate across the road in front of the first living monster: you cannot pass until it is defeated. */
function BarrierGate({ def, path, s, reduced }: { def: WorldDef; path: PathInfo; s: number; reduced: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const [x, z] = pointAt(path, s);
  const [bx, bz] = pointAt(path, s + 1);
  const [ax, az] = pointAt(path, s - 1);
  const ry = Math.atan2(bx - ax, bz - az); // faces along the road; the plane is wide across it
  const y = def.heightAt(x, z);
  useFrame((st) => {
    if (mat.current) mat.current.emissiveIntensity = reduced ? 0.8 : 0.7 + Math.sin(st.clock.elapsedTime * 2.5) * 0.35;
  });
  return (
    <group position={[x, y, z]} rotation={[0, ry, 0]}>
      <mesh position={[0, 2.2, 0]}>
        <planeGeometry args={[ROAD_CORRIDOR * 2, 4.4]} />
        <meshStandardMaterial ref={mat} color="#ff6a4d" emissive="#ff3d1a" emissiveIntensity={0.8} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * ROAD_CORRIDOR, 2.4, 0]}>
          <cylinderGeometry args={[0.18, 0.22, 4.8, 8]} />
          <meshStandardMaterial color="#ffb347" emissive="#ff8a00" emissiveIntensity={1.2} />
        </mesh>
      ))}
    </group>
  );
}

/* -------------------------------------------------------------------------- hero */

interface HeroProps {
  def: WorldDef;
  path: PathInfo;
  signals: WorldSignals;
  appearance: CharacterAppearance;
  stick: MutableRefObject<StickVector>;
  zoomRef: MutableRefObject<number>;
  enabled: boolean;
  autoWalk: boolean;
  onAutoWalkChange: (on: boolean) => void;
  active: Station | null;
  gems: Gem[];
  onCollectGem: (id: string) => void;
  onEngagedChange: (engaged: boolean) => void;
  /** Arc length of the first living monster's barrier (Infinity once everything is defeated). */
  limitS: number;
  onBlocked: (reason: 'monster' | 'edge') => void;
  events: CombatEvent[];
  heroPosRef: MutableRefObject<THREE.Vector3>;
  /** Set to true to request a jump (the hero consumes it). */
  jumpRef: MutableRefObject<boolean>;
}

function Hero(props: HeroProps) {
  const { def, path, signals, appearance, stick, zoomRef, enabled } = props;
  const group = useRef<THREE.Group>(null);
  const speed = useRef(0);
  const keys = useRef<MoveKeys>({ forward: false, back: false, left: false, right: false });
  const heading = useRef(Math.PI);
  const engagedRef = useRef(false);
  const taken = useRef<Set<string>>(new Set());
  const shake = useRef(0);
  const lastBlockedAt = useRef(-10);
  const action = useRef<HeroAction>({ kind: 'idle', t: 0 });
  const stepAcc = useRef(0);
  const vs = useRef<VState>({ y: def.heightAt(def.spawn[0], def.spawn[1]), vy: 0, air: false });
  const airRef = useRef(0);
  const camBase = useRef(vs.current.y);
  useCombatEvents(props.events, (e) => {
    if (e.type === 'hit') action.current = { kind: 'attack', t: 0 };
    if (e.type === 'player-hit' && e.damage > 0) {
      action.current = { kind: 'hurt', t: 0 };
      shake.current = 1;
    }
  });
  // Latest props, read inside the frame loop without re-subscribing
  const live = useRef(props);
  live.current = props;
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();

  useEffect(() => {
    const clear = () => { keys.current = { forward: false, back: false, left: false, right: false }; };
    const down = (e: KeyboardEvent) => {
      // Typing a command must never move the hero.
      if (isTypingTarget(e.target)) { clear(); return; }
      if (e.code === 'Space') {
        // Let Space press a focused button; otherwise it is the jump key.
        const el = e.target;
        if (el instanceof HTMLElement && ['BUTTON', 'A', 'SELECT', 'SUMMARY'].includes(el.tagName)) return;
        if (live.current.enabled) {
          e.preventDefault();
          live.current.jumpRef.current = true;
        }
        return;
      }
      const dir = KEY_MAP[e.code];
      if (dir) {
        if (live.current.enabled) e.preventDefault();
        keys.current[dir] = true;
        return;
      }
      if (live.current.enabled) {
        if (e.code === 'Equal' || e.code === 'NumpadAdd') zoomRef.current = clampZoom(zoomRef.current * 0.85);
        if (e.code === 'Minus' || e.code === 'NumpadSubtract') zoomRef.current = clampZoom(zoomRef.current / 0.85);
      }
    };
    // Releases are ALWAYS honoured, even if focus moved to the terminal meanwhile; otherwise a key
    // held while a fight steals focus would stay "pressed" forever and the hero would walk on its own.
    const up = (e: KeyboardEvent) => {
      const dir = KEY_MAP[e.code];
      if (dir) keys.current[dir] = false;
    };
    const focusIn = (e: FocusEvent) => { if (isTypingTarget(e.target)) clear(); };
    const hidden = () => { if (document.hidden) clear(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    window.addEventListener('focusin', focusIn);
    document.addEventListener('visibilitychange', hidden);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      window.removeEventListener('focusin', focusIn);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [zoomRef]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const p = live.current;
    const dt = Math.min(delta, 0.05);
    const k = keys.current;
    let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0) + stick.current.x;
    let dz = (k.back ? 1 : 0) - (k.forward ? 1 : 0) + stick.current.z;
    if (!p.enabled) {
      dx = 0; dz = 0;
      keys.current = { forward: false, back: false, left: false, right: false };
    }
    let mag = Math.hypot(dx, dz);
    if (mag > 1) { dx /= mag; dz /= mag; mag = 1; }
    if (mag < 0.08) { mag = 0; dx = 0; dz = 0; }

    const act = p.active;
    const toAct = act ? Math.hypot(act.pos[0] - g.position.x, act.pos[1] - g.position.z) : Infinity;

    // Manual input always wins over auto-walk.
    if (mag > 0 && p.autoWalk) p.onAutoWalkChange(false);

    // Auto-walk: follow the path toward the next monster, stopping at the edge of its battle zone.
    if (p.autoWalk && !act) p.onAutoWalkChange(false);
    if (mag === 0 && p.autoWalk && p.enabled && act) {
      const here = project(path, g.position.x, g.position.z);
      const targetS = Math.min(p.limitS - 0.5, path.total, act.isBoss ? path.total : act.s - act.engage * 0.55);
      if (here.s < targetS - 0.8 && toAct > act.engage * 0.6) {
        const [tx, tz] = pointAt(path, Math.min(here.s + 3.5, targetS));
        const ex = tx - g.position.x;
        const ez = tz - g.position.z;
        const len = Math.hypot(ex, ez) || 1;
        dx = ex / len; dz = ez / len; mag = 0.9;
      } else {
        p.onAutoWalkChange(false);
      }
    }

    const fromS = project(path, g.position.x, g.position.z).s;
    const block = { reason: null as 'monster' | 'edge' | null };
    const solve = (nx: number, nz: number): [number, number] | null => {
      const r = Math.hypot(nx, nz);
      if (r > def.radius) { nx *= def.radius / r; nz *= def.radius / r; }
      for (const [ox, oz, or] of def.obstacles) {
        const ex = nx - ox;
        const ez = nz - oz;
        const d = Math.hypot(ex, ez);
        if (d < or + 0.45 && d > 0.0001) { nx = ox + (ex / d) * (or + 0.45); nz = oz + (ez / d) * (or + 0.45); }
      }
      const road = constrainToRoad(path, nx, nz, fromS, p.limitS);
      if (!road.ok) { block.reason = 'monster'; return null; }
      if (road.reason === 'edge') block.reason = block.reason ?? 'edge';
      nx = road.x;
      nz = road.z;
      const rail = clampToDeck(def.bridges, nx, nz, g.position.y, signals);
      nx = rail[0];
      nz = rail[1];
      if (def.walkable && !def.walkable(nx, nz, signals)) return null;
      return [nx, nz];
    };

    if (mag > 0) {
      const sx = g.position.x + dx * MOVE_SPEED * mag * dt;
      const sz = g.position.z + dz * MOVE_SPEED * mag * dt;
      const moved = solve(sx, sz) ?? solve(sx, g.position.z) ?? solve(g.position.x, sz);
      if (moved) { g.position.x = moved[0]; g.position.z = moved[1]; }
      if (block.reason === 'monster' && state.clock.elapsedTime - lastBlockedAt.current > 2.5) {
        lastBlockedAt.current = state.clock.elapsedTime;
        p.onBlocked('monster');
      }
      const target = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(target - heading.current), Math.cos(target - heading.current));
      heading.current += diff * Math.min(1, dt * 10);
    } else if (act && toAct < act.engage) {
      // In a fight: stand your ground and face the monster.
      const target = Math.atan2(act.pos[0] - g.position.x, act.pos[1] - g.position.z);
      const diff = Math.atan2(Math.sin(target - heading.current), Math.cos(target - heading.current));
      heading.current += diff * Math.min(1, dt * 6);
    }
    g.rotation.y = heading.current;

    if (def.walkable && !def.walkable(g.position.x, g.position.z, signals)) {
      // The ground vanished under the hero (e.g. a bridge broke): put them back on solid ground.
      const [rx, rz] = def.rescue ?? def.spawn;
      g.position.x = rx;
      g.position.z = rz;
      vs.current = { y: surfaceY(def, rx, rz, 99, signals), vy: 0, air: false };
    }
    speed.current += (mag - speed.current) * Math.min(1, dt * 10);
    // Vertical motion: walk on the ground or a bridge deck, and jump with Space
    const jumpReq = p.jumpRef.current;
    p.jumpRef.current = false;
    const ground = surfaceY(def, g.position.x, g.position.z, vs.current.y, signals);
    const v = stepVertical(vs.current, ground, dt, jumpReq && p.enabled);
    g.position.y = vs.current.y;
    airRef.current = vs.current.air ? 1 : 0;
    if (v.jumped) gameAudio.playSfx('jump');
    if (v.landed) gameAudio.playSfx('land');
    if (!vs.current.air) camBase.current += (vs.current.y - camBase.current) * Math.min(1, dt * 6);

    stepAcc.current += vs.current.air ? 0 : dt * speed.current;
    if (stepAcc.current > 0.5) {
      stepAcc.current = 0;
      gameAudio.playSfx(onDeck(def, g.position.x, g.position.z, g.position.y, signals) ? 'plank' : 'step');
    }
    p.heroPosRef.current.set(g.position.x, g.position.y, g.position.z);

    // Fight starts when you are inside the monster's battle zone.
    const engagedNow = !!act && toAct <= act.engage;
    if (engagedNow !== engagedRef.current) {
      engagedRef.current = engagedNow;
      p.onEngagedChange(engagedNow);
    }

    // Gems
    for (const gem of p.gems) {
      if (taken.current.has(gem.id)) continue;
      if (Math.hypot(gem.pos[0] - g.position.x, gem.pos[1] - g.position.z) < 1.8) {
        taken.current.add(gem.id);
        p.onCollectGem(gem.id);
      }
    }

    // Camera: follow with zoom, stay above the terrain, shake when hurt.
    shake.current = Math.max(0, shake.current - dt * 3);
    const zf = clampZoom(zoomRef.current);
    desired.set(g.position.x, camBase.current + 6.8 * zf, g.position.z + 11.5 * zf);
    desired.y = Math.max(desired.y, def.heightAt(desired.x, desired.z) + 2.5);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 5));
    if (shake.current > 0) {
      camera.position.x += Math.sin(state.clock.elapsedTime * 70) * 0.25 * shake.current;
      camera.position.y += Math.cos(state.clock.elapsedTime * 63) * 0.18 * shake.current;
    }
    look.set(g.position.x, (camBase.current + g.position.y) * 0.5 + 1.8, g.position.z - 1.5);
    camera.lookAt(look);
  });

  return (
    <group ref={group} position={[def.spawn[0], def.heightAt(def.spawn[0], def.spawn[1]), def.spawn[1]]} rotation={[0, Math.PI, 0]}>
      <HeroModel appearance={appearance} speedRef={speed} actionRef={action} airRef={airRef} />
    </group>
  );
}

/* -------------------------------------------------------------------------- canvas */

export interface WorldCanvasProps {
  worldId: number;
  /** Changes when the level restarts, so the 3D world is rebuilt from scratch. */
  runKey: number;
  signals: WorldSignals;
  appearance: CharacterAppearance;
  challenges: ChallengeLite[];
  worldBossName?: string;
  activeChallengeId: string | null;
  /** Per challenge: all objectives done (monster defeated) in this run. */
  finished: boolean[];
  objectivesDone: number;
  objectivesTotal: number;
  collectedGems: string[];
  events: CombatEvent[];
  stick: MutableRefObject<StickVector>;
  zoomRef: MutableRefObject<number>;
  controlsEnabled: boolean;
  autoWalk: boolean;
  onAutoWalkChange: (on: boolean) => void;
  engaged: boolean;
  onEngagedChange: (engaged: boolean) => void;
  onCollectGem: (id: string) => void;
  onBlocked: (reason: 'monster' | 'edge') => void;
  jumpRef: MutableRefObject<boolean>;
}

export function WorldCanvas(props: WorldCanvasProps) {
  const { worldId, runKey, signals, appearance, challenges, worldBossName, activeChallengeId, finished, collectedGems, zoomRef } = props;
  const def = useMemo(() => getWorldDef(worldId), [worldId]);
  const path = useMemo(() => makePath(def.path), [def]);
  const stations = useMemo(() => buildStations(def, path, challenges, worldBossName), [def, path, challenges, worldBossName]);
  const allGems = useMemo(() => buildGems(def, path, stations), [def, path, stations]);
  const gems = useMemo(() => allGems.filter((g) => !collectedGems.includes(g.id)), [allGems, collectedGems]);
  const reduced = usePrefersReducedMotion();
  const touch = useCoarsePointer();
  const quality = useGraphicsQuality();
  // `coarse` means "use the light version": touch devices and the Low setting
  const coarse = touch || quality === 'low';
  const SceneC = def.Scene;
  const t = def.theme;
  const background = t.enclosed ? t.skyTop : `linear-gradient(180deg, ${t.skyTop} 0%, ${t.skyBottom} 62%, ${t.skyBottom} 100%)`;

  const activeIdx = stations.findIndex((s) => s.challengeId === activeChallengeId);
  const activeStation = activeIdx >= 0 && !finished[activeIdx] ? stations[activeIdx] : null;
  const prevS = activeIdx > 0 ? (stations[activeIdx - 1].isBoss ? 0 : stations[activeIdx - 1].s) : 0;
  const activeS = activeStation ? Math.min(path.total, activeStation.s) : path.total;

  const heroPos = useRef(new THREE.Vector3(def.spawn[0], 0, def.spawn[1]));
  const fxTarget = activeStation
    ? { pos: [activeStation.pos[0], def.heightAt(activeStation.pos[0], activeStation.pos[1]), activeStation.pos[1]] as Vec3, chest: activeStation.kind === 'boss' ? 7 : activeStation.kind === 'shadow' ? 3.2 : 2.2 }
    : null;

  // The first living monster is a wall: nobody gets past it until it is defeated.
  const firstOpen = stations.findIndex((_, i) => !finished[i]);
  const limitS = firstOpen < 0 ? Infinity : stations[firstOpen].isBoss ? path.total : stations[firstOpen].s - 2.4;

  // Pinch-to-zoom on touch screens
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinch = useRef(0);

  return (
    <div
      className="absolute inset-0"
      style={{ background, touchAction: 'none' }}
      onWheel={(e) => { zoomRef.current = clampZoom(zoomRef.current * (1 + Math.sign(e.deltaY) * 0.1)); }}
      onPointerDown={(e) => { pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.current.size === 2) lastPinch.current = 0; }}
      onPointerMove={(e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (lastPinch.current > 0) zoomRef.current = clampZoom(zoomRef.current * (lastPinch.current / d));
          lastPinch.current = d;
        }
      }}
      onPointerUp={(e) => { pointers.current.delete(e.pointerId); lastPinch.current = 0; }}
      onPointerCancel={(e) => { pointers.current.delete(e.pointerId); lastPinch.current = 0; }}
    >
      <Canvas
        key={`${def.id}-${runKey}-${quality}`}
        shadows={quality === 'high' && !touch}
        dpr={coarse ? 1 : quality === 'medium' ? [1, 1.25] : [1, 1.5]}
        camera={{ position: [def.spawn[0], 8, def.spawn[1] + 12], fov: 50, near: 0.3, far: 500 }}
        gl={{ antialias: !coarse, alpha: true }}
        style={{ background: 'transparent' }}
        onCreated={({ camera }) => camera.lookAt(def.spawn[0], 2, def.spawn[1] - 2)}
      >
        <WorldLighting theme={t} coarse={coarse} />
        {t.stars && <Stars radius={150} depth={50} count={coarse ? Math.floor(t.stars / 2) : t.stars} factor={5} fade speed={reduced ? 0 : 0.3} />}
        <Terrain heightAt={def.heightAt} size={def.terrain.size} segments={def.terrain.segments} palette={def.terrain.palette} />
        <SceneC signals={signals} reduced={reduced} coarse={coarse} />

        <PathTrail def={def} path={path} prevS={prevS} activeS={activeS} signals={signals} />
        {gems.map((g, i) => <GemMesh key={g.id} gem={g} i={i} def={def} reduced={reduced} signals={signals} />)}
        {stations.map((s, i) => (
          <Monster
            key={s.challengeId}
            station={s}
            def={def}
            dead={!!finished[i]}
            active={s.challengeId === activeChallengeId}
            engaged={props.engaged}
            done={s.challengeId === activeChallengeId ? props.objectivesDone : 0}
            total={s.challengeId === activeChallengeId ? props.objectivesTotal : 1}
            events={props.events}
            reduced={reduced}
          />
        ))}
        {Number.isFinite(limitS) && <BarrierGate def={def} path={path} s={Math.max(0.5, limitS)} reduced={reduced} />}
        {activeStation && <TargetMarker station={activeStation} def={def} engaged={props.engaged} reduced={reduced} />}

        <Hero
          def={def}
          path={path}
          signals={signals}
          appearance={appearance}
          stick={props.stick}
          zoomRef={zoomRef}
          enabled={props.controlsEnabled}
          autoWalk={props.autoWalk}
          onAutoWalkChange={props.onAutoWalkChange}
          active={activeStation}
          gems={gems}
          onCollectGem={props.onCollectGem}
          onEngagedChange={props.onEngagedChange}
          limitS={limitS}
          onBlocked={props.onBlocked}
          events={props.events}
          heroPosRef={heroPos}
          jumpRef={props.jumpRef}
        />
        <CombatFx events={props.events} heroPos={heroPos} target={fxTarget} reduced={reduced} />
      </Canvas>
    </div>
  );
}
