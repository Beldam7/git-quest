import { Canvas } from '@react-three/fiber';
import { Player } from './WorldScene';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

/** Live 3D preview of the real in-game character model, so styling changes are shown on the actual hero. */
export function CharacterPreview({ appearance }: { appearance: CharacterAppearance }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div
      className="h-72 w-56 overflow-hidden rounded-2xl border border-kq-edge bg-gradient-to-b from-kq-panel to-kq-ink"
      role="img"
      aria-label="3D preview of your character"
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.6, 5.4], fov: 40 }} onCreated={({ camera }) => camera.lookAt(0, 1.1, 0)}>
        <hemisphereLight args={['#9ec5ff', '#1b2a1f', 1]} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} color="#ffd9a0" />
        <pointLight position={[-2, 1.5, 2]} color="#3dd6f5" intensity={6} distance={8} />
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.4, 32]} />
          <meshStandardMaterial color="#1c2f52" roughness={0.9} />
        </mesh>
        <Player appearance={appearance} position={[0, 0, 0]} spin={!reduced} />
      </Canvas>
    </div>
  );
}
