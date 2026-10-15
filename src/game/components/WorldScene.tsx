import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Float, Sphere, Cone, Cylinder, Box, Cloud, Clouds } from '@react-three/drei';
import * as THREE from 'three';
import { WORLDS } from '../data/worlds';
import type { GameProgress } from '../types';
import type { CharacterAppearance } from '../adapters/CharacterAppearanceAdapter';

function Terrain() {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(400, 400, 64, 64);
    const positions = geo.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const dist = Math.sqrt(x * x + y * y);
      const noise = Math.sin(x * 0.05) * Math.cos(y * 0.05) * 2;
      positions.setZ(i, noise + Math.sin(dist * 0.03) * 3);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, -40]} receiveShadow>
      <meshStandardMaterial color="#1a3a2a" roughness={0.9} metalness={0.1} />
    </mesh>
  );
}

function Castle({ position, color, unlocked }: { position: [number, number, number]; color: string; unlocked: boolean }) {
  const baseRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (baseRef.current && unlocked) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02 + (hovered ? 0.05 : 0);
      baseRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group position={position}>
      {/* Base */}
      <Box
        ref={baseRef}
        args={[8, 6, 8]}
        position={[0, 3, 0]}
        castShadow
        onPointerOver={() => unlocked && setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshStandardMaterial color={unlocked ? color : '#444'} roughness={0.7} metalness={0.2} />
      </Box>
      {/* Towers */}
      <Cylinder args={[1.5, 1.5, 9, 8]} position={[-4, 4.5, -4]} castShadow>
        <meshStandardMaterial color={unlocked ? color : '#555'} roughness={0.7} />
      </Cylinder>
      <Cylinder args={[1.5, 1.5, 9, 8]} position={[4, 4.5, -4]} castShadow>
        <meshStandardMaterial color={unlocked ? color : '#555'} roughness={0.7} />
      </Cylinder>
      <Cylinder args={[1.5, 1.5, 9, 8]} position={[-4, 4.5, 4]} castShadow>
        <meshStandardMaterial color={unlocked ? color : '#555'} roughness={0.7} />
      </Cylinder>
      <Cylinder args={[1.5, 1.5, 9, 8]} position={[4, 4.5, 4]} castShadow>
        <meshStandardMaterial color={unlocked ? color : '#555'} roughness={0.7} />
      </Cylinder>
      {/* Tower roofs */}
      <Cone args={[2, 3, 8]} position={[-4, 10.5, -4]}>
        <meshStandardMaterial color={unlocked ? '#fbbf24' : '#666'} roughness={0.5} />
      </Cone>
      <Cone args={[2, 3, 8]} position={[4, 10.5, -4]}>
        <meshStandardMaterial color={unlocked ? '#fbbf24' : '#666'} roughness={0.5} />
      </Cone>
      <Cone args={[2, 3, 8]} position={[-4, 10.5, 4]}>
        <meshStandardMaterial color={unlocked ? '#fbbf24' : '#666'} roughness={0.5} />
      </Cone>
      <Cone args={[2, 3, 8]} position={[4, 10.5, 4]}>
        <meshStandardMaterial color={unlocked ? '#fbbf24' : '#666'} roughness={0.5} />
      </Cone>
      {unlocked && (
        <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
          <Sphere args={[0.8, 16, 16]} position={[0, 8, 0]}>
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} />
          </Sphere>
        </Float>
      )}
    </group>
  );
}

function Tree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Cylinder args={[0.3, 0.4, 3, 6]} position={[0, 1.5, 0]}>
        <meshStandardMaterial color="#5d4037" roughness={0.9} />
      </Cylinder>
      <Cone args={[2, 4, 8]} position={[0, 4.5, 0]}>
        <meshStandardMaterial color="#2d6a4f" roughness={0.8} />
      </Cone>
      <Cone args={[1.5, 3, 8]} position={[0, 6, 0]}>
        <meshStandardMaterial color="#40916c" roughness={0.8} />
      </Cone>
    </group>
  );
}

function Crystal({ position, color = '#3b82f6' }: { position: [number, number, number]; color?: string }) {
  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={2}>
      <mesh position={position} rotation={[0.3, 0.5, 0.2]}>
        <octahedronGeometry args={[0.6, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.4} transparent opacity={0.8} />
      </mesh>
    </Float>
  );
}

export function Player({ appearance, position, spin = true }: { appearance: CharacterAppearance; position: [number, number, number]; spin?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Mesh>(null);
  const rightArmRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.25;
      if (spin) groupRef.current.rotation.y += delta * 0.3;
    }
    if (bodyRef.current) {
      bodyRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.05;
    }
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.3;
    }
    if (leftArmRef.current) {
      leftArmRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
    if (rightArmRef.current) {
      rightArmRef.current.rotation.x = -Math.sin(state.clock.elapsedTime * 3) * 0.3;
    }
  });

  const matProps = useMemo(() => {
    const base: THREE.MeshStandardMaterialParameters = {
      color: appearance.primaryColor,
      roughness: 0.5,
    };
    if (appearance.materialVariant === 'metallic') {
      base.metalness = 0.9;
      base.roughness = 0.2;
    } else if (appearance.materialVariant === 'crystal') {
      base.transparent = true;
      base.opacity = 0.7;
      base.metalness = 0.3;
    } else if (appearance.materialVariant === 'phoenix') {
      base.emissive = appearance.accentColor;
      base.emissiveIntensity = 0.3;
    }
    return base;
  }, [appearance]);

  return (
    <group ref={groupRef} position={position}>
      {/* Body */}
      <mesh ref={bodyRef} castShadow position={[0, 1, 0]}>
        <capsuleGeometry args={[0.6, 1.2, 8, 16]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Head */}
      <mesh ref={headRef} castShadow position={[0, 2.2, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color={appearance.secondaryColor} roughness={0.5} />
      </mesh>
      {/* Arms */}
      <mesh ref={leftArmRef} castShadow position={[0.7, 1.4, 0]}>
        <capsuleGeometry args={[0.18, 0.7, 6, 12]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      <mesh ref={rightArmRef} castShadow position={[-0.7, 1.4, 0]}>
        <capsuleGeometry args={[0.18, 0.7, 6, 12]} />
        <meshStandardMaterial {...matProps} />
      </mesh>
      {/* Eyes */}
      <mesh position={[0.15, 2.3, 0.4]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-0.15, 2.3, 0.4]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
      </mesh>
      {/* Accessory */}
      {appearance.accessory === 'cape' && (
        <mesh position={[0, 1, -0.5]} rotation={[0.2, 0, 0]}>
          <planeGeometry args={[1.5, 2]} />
          <meshStandardMaterial color={appearance.accentColor} side={THREE.DoubleSide} roughness={0.6} />
        </mesh>
      )}
      {appearance.accessory === 'helmet' && (
        <mesh position={[0, 2.5, 0]}>
          <sphereGeometry args={[0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={appearance.accentColor} metalness={0.8} roughness={0.2} />
        </mesh>
      )}
      {appearance.accessory === 'wizard_hat' && (
        <group position={[0, 2.7, 0]}>
          <Cone args={[0.5, 1.5, 16]}>
            <meshStandardMaterial color={appearance.accentColor} roughness={0.6} />
          </Cone>
        </group>
      )}
      {appearance.accessory === 'dragon_armor' && (
        <>
          <mesh position={[0, 1.5, 0.55]}>
            <boxGeometry args={[1.2, 0.6, 0.3]} />
            <meshStandardMaterial color={appearance.accentColor} metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, 2.3, 0]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.3, 0.4, 4]} />
            <meshStandardMaterial color={appearance.accentColor} metalness={0.9} roughness={0.1} />
          </mesh>
        </>
      )}
      {/* Glow ring */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1, 1.3, 32]} />
        <meshStandardMaterial color={appearance.accentColor} emissive={appearance.accentColor} emissiveIntensity={0.5} transparent opacity={0.5} />
      </mesh>
    </group>
  );
}

function Portal({ position }: { position: [number, number, number] }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(() => {
    if (ref.current) ref.current.rotation.z += 0.02;
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <torusGeometry args={[2, 0.3, 16, 32]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={0.6} transparent opacity={0.7} />
      </mesh>
      <mesh>
        <circleGeometry args={[1.8, 32]} />
        <meshStandardMaterial color="#a855f7" transparent opacity={0.2} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

interface WorldSceneProps {
  /** Appearance from the appearance adapter. Falls back to the legacy saved value. */
  appearance?: CharacterAppearance;
  progress: GameProgress | null;
  onWorldClick?: (worldId: number) => void;
}

function SceneContent({ progress, onWorldClick, appearance: appearanceProp }: WorldSceneProps) {
  const unlockedWorlds = progress?.unlockedWorlds ?? [1];
  const appearance = appearanceProp ?? progress?.characterAppearance;
  const playerPos: [number, number, number] = [0, 0, 5];

  const trees = useMemo(() => {
    const result: { pos: [number, number, number]; key: string }[] = [];
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const radius = 25 + Math.random() * 50;
      const x = Math.cos(angle) * radius;
      const z = -40 + Math.sin(angle) * radius;
      result.push({ pos: [x, 0, z], key: `tree-${i}` });
    }
    return result;
  }, []);

  const crystals = useMemo(() => {
    const result: { pos: [number, number, number]; color: string; key: string }[] = [];
    const colors = ['#3b82f6', '#22c55e', '#fbbf24', '#ef4444', '#a855f7'];
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 100;
      const z = -40 + (Math.random() - 0.5) * 100;
      result.push({ pos: [x, 1 + Math.random() * 3, z], color: colors[i % colors.length], key: `crystal-${i}` });
    }
    return result;
  }, []);

  return (
    <>
      <fog attach="fog" args={['#0a0e1a', 60, 180]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[20, 40, 20]} intensity={0.8} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[0, 20, -40]} intensity={0.5} color="#3b82f6" />
      <pointLight position={[20, 15, -20]} intensity={0.3} color="#fbbf24" />
      <pointLight position={[-20, 15, -60]} intensity={0.3} color="#22c55e" />

      <Terrain />

      {/* World castles */}
      {WORLDS.map((world) => {
        const unlocked = unlockedWorlds.includes(world.id);
        return (
          <group
            key={world.id}
            position={world.position}
            onClick={(e) => {
              e.stopPropagation();
              if (unlocked && onWorldClick) onWorldClick(world.id);
            }}
          >
            <Castle position={[0, 0, 0]} color={world.color} unlocked={unlocked} />
            {unlocked && (
              <Text
                position={[0, 14, 0]}
                fontSize={2}
                color={world.accentColor}
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.1}
                outlineColor="#000"
              >
                {world.name}
              </Text>
            )}
            {!unlocked && (
              <Text
                position={[0, 14, 0]}
                fontSize={1.5}
                color="#666"
                anchorX="center"
                anchorY="middle"
              >
                🔒 Locked
              </Text>
            )}
          </group>
        );
      })}

      {/* Trees */}
      {trees.map((t) => (
        <Tree key={t.key} position={t.pos} />
      ))}

      {/* Crystals */}
      {crystals.map((c) => (
        <Crystal key={c.key} position={c.pos} color={c.color} />
      ))}

      {/* Portals between worlds */}
      {unlockedWorlds.length > 1 && (
        <Portal position={[30, 2, -35]} />
      )}

      {/* Clouds */}
      <Clouds material={THREE.MeshBasicMaterial} limit={50} range={80}>
        <Cloud color="#1a2a4a" opacity={0.3} segments={20} bounds={[60, 8, 60]} volume={25} position={[0, 30, -40]} speed={0.15} />
        <Cloud color="#0f1a3a" opacity={0.2} segments={15} bounds={[40, 6, 40]} volume={18} position={[-30, 25, -50]} speed={0.1} />
      </Clouds>

      {/* Player */}
      {appearance && <Player appearance={appearance} position={playerPos} />}
    </>
  );
}

export function WorldScene({ progress, onWorldClick, appearance }: WorldSceneProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 25, 35], fov: 50 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true }}
    >
      <SceneContent progress={progress} onWorldClick={onWorldClick} appearance={appearance} />
      <OrbitControls
        enablePan={false}
        minDistance={20}
        maxDistance={80}
        maxPolarAngle={Math.PI / 2.5}
        target={[0, 5, -40]}
      />
    </Canvas>
  );
}
