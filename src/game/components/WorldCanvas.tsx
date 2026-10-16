import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { HeroModel } from '../hero/HeroModel';
import { Boss, Goblin, ShadowWraith, Skeleton, Slime } from '../world3d/creatures';
import { Terrain, WorldLighting } from '../world3d/kit';
import { getWorldDef } from '../world3d/worlds';
import { useCoarsePointer, usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import type { StickVector } from './ui/TouchStick';
import type { WorldDef, WorldSignals } from '../world3d/types';
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

/** Decorative wanderers per world (idle presentation only; no combat is simulated). Positions are [x, z]. */
const AMBIENT: Record<number, Array<{ kind: 'goblin' | 'skeleton' | 'slime' | 'shadow'; at: [number, number]; ry: number }>> = {
  1: [{ kind: 'goblin', at: [12, 12], ry: 2.5 }, { kind: 'slime', at: [-13, 18], ry: 0.5 }],
  2: [{ kind: 'skeleton', at: [-9, -2], ry: 1 }, { kind: 'shadow', at: [12, -14], ry: 3 }],
  3: [{ kind: 'slime', at: [-7, -12], ry: 0 }, { kind: 'goblin', at: [11, -4], ry: 4 }],
  4: [{ kind: 'skeleton', at: [8, 18], ry: 3.5 }, { kind: 'shadow', at: [-9, -22], ry: 0.3 }],
  5: [{ kind: 'goblin', at: [-10, 6], ry: 1.2 }],
  7: [{ kind: 'shadow', at: [-14, 8], ry: 0.4 }, { kind: 'skeleton', at: [14, 4], ry: 3.8 }],
  8: [{ kind: 'shadow', at: [-12, 14], ry: 0.7 }, { kind: 'shadow', at: [14, 4], ry: 3.2 }, { kind: 'skeleton', at: [-10, -2], ry: 1.4 }],
};

function Ambient({ def, reduced }: { def: WorldDef; reduced: boolean }) {
  const list = AMBIENT[def.id] ?? [];
  return (
    <>
      {list.map((c, i) => (
        <group key={i} position={[c.at[0], def.heightAt(c.at[0], c.at[1]), c.at[1]]} rotation={[0, c.ry, 0]}>
          {c.kind === 'goblin' && <Goblin reduced={reduced} />}
          {c.kind === 'skeleton' && <Skeleton reduced={reduced} />}
          {c.kind === 'slime' && <Slime reduced={reduced} />}
          {c.kind === 'shadow' && <ShadowWraith reduced={reduced} />}
        </group>
      ))}
    </>
  );
}

function Hero({
  def, signals, appearance, stick, enabled,
}: {
  def: WorldDef; signals: WorldSignals; appearance: CharacterAppearance; stick: MutableRefObject<StickVector>; enabled: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const speed = useRef(0);
  const keys = useRef<MoveKeys>({ forward: false, back: false, left: false, right: false });
  const heading = useRef(Math.PI);
  const sig = useRef(signals);
  sig.current = signals;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const desired = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const { camera } = useThree();

  useEffect(() => {
    const set = (e: KeyboardEvent, v: boolean) => {
      const dir = KEY_MAP[e.code];
      // Never steal keys while the player is typing a command.
      if (!dir || isTypingTarget(e.target)) return;
      if (enabledRef.current) e.preventDefault();
      keys.current[dir] = v;
    };
    const down = (e: KeyboardEvent) => set(e, true);
    const up = (e: KeyboardEvent) => set(e, false);
    const clear = () => { keys.current = { forward: false, back: false, left: false, right: false }; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  const groundY = (x: number, z: number) => (def.groundAt ? def.groundAt(x, z, sig.current) : def.heightAt(x, z));

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const k = keys.current;
    let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0) + stick.current.x;
    let dz = (k.back ? 1 : 0) - (k.forward ? 1 : 0) + stick.current.z;
    if (!enabledRef.current) { dx = 0; dz = 0; }
    let mag = Math.hypot(dx, dz);
    if (mag > 1) { dx /= mag; dz /= mag; mag = 1; }
    if (mag < 0.08) mag = 0;

    const solve = (nx: number, nz: number): [number, number] | null => {
      const r = Math.hypot(nx, nz);
      if (r > def.radius) { nx *= def.radius / r; nz *= def.radius / r; }
      for (const [ox, oz, or] of def.obstacles) {
        const ex = nx - ox;
        const ez = nz - oz;
        const d = Math.hypot(ex, ez);
        if (d < or + 0.45 && d > 0.0001) { nx = ox + (ex / d) * (or + 0.45); nz = oz + (ez / d) * (or + 0.45); }
      }
      if (def.walkable && !def.walkable(nx, nz, sig.current)) return null;
      return [nx, nz];
    };

    if (mag > 0) {
      const sx = g.position.x + dx * MOVE_SPEED * dt;
      const sz = g.position.z + dz * MOVE_SPEED * dt;
      const moved = solve(sx, sz) ?? solve(sx, g.position.z) ?? solve(g.position.x, sz);
      if (moved) { g.position.x = moved[0]; g.position.z = moved[1]; }
      const target = Math.atan2(dx, dz);
      const diff = Math.atan2(Math.sin(target - heading.current), Math.cos(target - heading.current));
      heading.current += diff * Math.min(1, dt * 10);
      g.rotation.y = heading.current;
    }
    // If the world changed under the hero (e.g. a bridge broke), return to the spawn point.
    if (def.walkable && !def.walkable(g.position.x, g.position.z, sig.current)) {
      g.position.x = def.spawn[0];
      g.position.z = def.spawn[1];
    }
    speed.current += (mag - speed.current) * Math.min(1, dt * 10);
    const ty = groundY(g.position.x, g.position.z);
    g.position.y += (ty - g.position.y) * Math.min(1, dt * 14);

    // Third-person follow camera, kept clear of the terrain.
    desired.set(g.position.x, g.position.y + 6.8, g.position.z + 11.5);
    desired.y = Math.max(desired.y, def.heightAt(desired.x, desired.z) + 3);
    camera.position.lerp(desired, 1 - Math.exp(-dt * 4));
    look.set(g.position.x, g.position.y + 1.8, g.position.z - 1.5);
    camera.lookAt(look);
  });

  return (
    <group ref={group} position={[def.spawn[0], def.heightAt(def.spawn[0], def.spawn[1]), def.spawn[1]]} rotation={[0, Math.PI, 0]}>
      <HeroModel appearance={appearance} speedRef={speed} />
    </group>
  );
}

export interface WorldCanvasProps {
  worldId: number;
  signals: WorldSignals;
  appearance: CharacterAppearance;
  showBoss: boolean;
  bossName?: string;
  stick: MutableRefObject<StickVector>;
  /** False while a dialog (e.g. pause) is open, so keys do not move the hero. */
  controlsEnabled: boolean;
}

export function WorldCanvas({ worldId, signals, appearance, showBoss, bossName, stick, controlsEnabled }: WorldCanvasProps) {
  const def = useMemo(() => getWorldDef(worldId), [worldId]);
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const SceneC = def.Scene;
  const t = def.theme;
  const background = t.enclosed ? t.skyTop : `linear-gradient(180deg, ${t.skyTop} 0%, ${t.skyBottom} 62%, ${t.skyBottom} 100%)`;
  const bossY = def.heightAt(def.boss.position[0], def.boss.position[1]);

  return (
    <div className="absolute inset-0" style={{ background }}>
      <Canvas
        key={def.id}
        shadows={!coarse}
        dpr={coarse ? 1 : [1, 1.5]}
        camera={{ position: [def.spawn[0], 8, def.spawn[1] + 12], fov: 50, near: 0.3, far: 400 }}
        gl={{ antialias: !coarse, alpha: true }}
        style={{ background: 'transparent' }}
        onCreated={({ camera }) => camera.lookAt(def.spawn[0], 2, def.spawn[1] - 2)}
      >
        <WorldLighting theme={t} coarse={coarse} />
        {t.stars && <Stars radius={150} depth={50} count={coarse ? Math.floor(t.stars / 2) : t.stars} factor={5} fade speed={reduced ? 0 : 0.3} />}
        <Terrain heightAt={def.heightAt} size={def.terrain.size} segments={def.terrain.segments} palette={def.terrain.palette} />
        <SceneC signals={signals} reduced={reduced} coarse={coarse} />
        <Ambient def={def} reduced={reduced} />
        {showBoss && (
          <group position={[def.boss.position[0], bossY, def.boss.position[1]]} rotation={[0, def.boss.facing, 0]}>
            <Boss name={bossName} reduced={reduced} />
          </group>
        )}
        <Hero def={def} signals={signals} appearance={appearance} stick={stick} enabled={controlsEnabled} />
      </Canvas>
    </div>
  );
}
