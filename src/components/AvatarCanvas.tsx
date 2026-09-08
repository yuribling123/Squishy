"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

export type AvatarRecipe = {
  name: string;
  relation: "like" | "dislike" | "self" | "fictional";
  skin: string;
  hairColor: string;
  outfitColor: string;
  hairStyle: number;
  headSize: number;
  bodySize: number;
  height: number;
  eyeSize: number;
};

export type MaterialKind = "mochi" | "cream" | "jelly" | "rubber";

type AvatarCanvasProps = {
  recipe: AvatarRecipe;
  material: MaterialKind;
  softness: number;
  rebound: number;
  resetKey: number;
  onSqueeze: (part: string) => void;
};

type SquishyPartProps = {
  name: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  baseScale: [number, number, number];
  color: string;
  material: MaterialKind;
  softness: number;
  rebound: number;
  geometry: React.ReactNode;
  children?: React.ReactNode;
  onSqueeze: (part: string) => void;
};

const MATERIAL_PROPS: Record<MaterialKind, { roughness: number; metalness: number; clearcoat: number; transmission: number; opacity: number }> = {
  mochi: { roughness: 0.56, metalness: 0, clearcoat: 0.2, transmission: 0, opacity: 1 },
  cream: { roughness: 0.82, metalness: 0, clearcoat: 0.08, transmission: 0, opacity: 1 },
  jelly: { roughness: 0.16, metalness: 0, clearcoat: 0.7, transmission: 0.24, opacity: 0.9 },
  rubber: { roughness: 0.32, metalness: 0, clearcoat: 0.5, transmission: 0, opacity: 1 },
};

function SquishyPart({ name, position, rotation = [0, 0, 0], baseScale, color, material, softness, rebound, geometry, children, onSqueeze }: SquishyPartProps) {
  const group = useRef<THREE.Group>(null);
  const pressed = useRef(false);
  const motion = useRef({ pressure: 0, dragX: 0, dragY: 0, velocity: 0 });
  const start = useRef(new THREE.Vector2());
  const materialProps = MATERIAL_PROPS[material];

  const onPointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    pressed.current = true;
    start.current.set(event.pointer.x, event.pointer.y);
    motion.current.pressure = Math.max(motion.current.pressure, 0.52);
    motion.current.velocity += 0.16 + softness * 0.002;
    (event.target as unknown as Element).setPointerCapture?.(event.pointerId);
    onSqueeze(name);
  };

  const onPointerMove = (event: ThreeEvent<PointerEvent>) => {
    if (!pressed.current) return;
    event.stopPropagation();
    const dx = event.pointer.x - start.current.x;
    const dy = event.pointer.y - start.current.y;
    motion.current.dragX = THREE.MathUtils.clamp(dx * 1.45, -0.65, 0.65);
    motion.current.dragY = THREE.MathUtils.clamp(dy * 1.15, -0.55, 0.55);
    motion.current.pressure = THREE.MathUtils.clamp(0.62 + Math.hypot(dx, dy) * 0.8, 0.55, 1);
  };

  const release = (event: ThreeEvent<PointerEvent>) => {
    if (!pressed.current) return;
    event.stopPropagation();
    pressed.current = false;
    motion.current.velocity += 0.2;
    (event.target as unknown as Element).releasePointerCapture?.(event.pointerId);
  };

  useFrame((state, delta) => {
    if (!group.current) return;
    const m = motion.current;
    const targetPressure = pressed.current ? Math.max(0.6, m.pressure) : 0;
    const speed = 3.2 + rebound * 0.085;
    m.pressure = THREE.MathUtils.damp(m.pressure, targetPressure, speed, delta);
    m.dragX = THREE.MathUtils.damp(m.dragX, pressed.current ? m.dragX : 0, speed * 0.72, delta);
    m.dragY = THREE.MathUtils.damp(m.dragY, pressed.current ? m.dragY : 0, speed * 0.72, delta);
    m.velocity = THREE.MathUtils.damp(m.velocity, 0, 4 + rebound * 0.04, delta);

    const softnessFactor = 0.1 + softness / 160;
    const wobble = Math.sin(state.clock.elapsedTime * (5.2 + rebound * 0.055)) * m.velocity * softnessFactor;
    const squash = m.pressure * softnessFactor;

    group.current.scale.set(baseScale[0] * (1 + squash * 0.22 + Math.abs(m.dragX) * 0.05 + wobble * 0.06), baseScale[1] * (1 - squash * 0.25 + wobble * 0.04), baseScale[2] * (1 + squash * 0.16 - wobble * 0.03));
    group.current.position.set(position[0] + m.dragX * 0.16, position[1] + m.dragY * 0.13, position[2] - m.pressure * 0.09);
    group.current.rotation.set(rotation[0] - m.dragY * 0.05, rotation[1] + m.dragX * 0.06, rotation[2] - m.dragX * 0.16 + wobble * 0.08);
  });

  return (
    <group ref={group} position={position} rotation={rotation}>
      <mesh castShadow receiveShadow onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={release} onPointerCancel={release} onPointerLeave={(event) => { if (pressed.current && event.buttons === 0) release(event); }}>
        {geometry}
        <meshPhysicalMaterial color={color} roughness={materialProps.roughness} metalness={materialProps.metalness} clearcoat={materialProps.clearcoat} transmission={materialProps.transmission} transparent={materialProps.opacity < 1} opacity={materialProps.opacity} thickness={0.8} ior={1.34} />
      </mesh>
      {children}
    </group>
  );
}

function Eye({ x, size, isDisliked }: { x: number; size: number; isDisliked: boolean }) {
  return (
    <group position={[x, 0.02, 1.04]} scale={size}>
      <mesh castShadow scale={[0.16, isDisliked ? 0.11 : 0.2, 0.08]} rotation={[0, 0, isDisliked ? -x * 0.35 : 0]}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshStandardMaterial color="#332b26" roughness={0.55} />
      </mesh>
      <mesh position={[-0.035, 0.055, 0.075]} scale={0.035}><sphereGeometry args={[1, 12, 8]} /><meshBasicMaterial color="#fff8ef" /></mesh>
    </group>
  );
}

function Hair({ style, color }: { style: number; color: string }) {
  if (style === 2) {
    return <group><mesh position={[0, 0.56, 0]} scale={[1.33, 0.72, 1.17]} castShadow><sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.68]} /><meshStandardMaterial color={color} roughness={0.78} /></mesh><mesh position={[0, 1.13, 0]} scale={[0.34, 0.44, 0.34]} castShadow><sphereGeometry args={[1, 28, 20]} /><meshStandardMaterial color={color} roughness={0.78} /></mesh></group>;
  }
  if (style === 1) {
    return <group><mesh position={[0, 0.45, -0.02]} scale={[1.38, 0.86, 1.2]} castShadow><sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.72]} /><meshStandardMaterial color={color} roughness={0.74} /></mesh>{[-0.62, -0.28, 0.08, 0.43, 0.7].map((x, index) => <mesh key={x} position={[x, 0.18 + Math.abs(index - 2) * 0.04, 1.01]} rotation={[0, 0, (index - 2) * -0.09]} scale={[0.31, 0.48, 0.12]} castShadow><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={color} roughness={0.74} /></mesh>)}</group>;
  }
  return <group><mesh position={[0, 0.57, -0.03]} scale={[1.34, 0.69, 1.16]} castShadow><sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.64]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh><mesh position={[-0.48, 0.24, 1.01]} rotation={[0, 0, -0.25]} scale={[0.46, 0.25, 0.12]} castShadow><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh><mesh position={[0.16, 0.28, 1.04]} rotation={[0, 0, 0.13]} scale={[0.64, 0.23, 0.12]} castShadow><sphereGeometry args={[1, 20, 16]} /><meshStandardMaterial color={color} roughness={0.72} /></mesh></group>;
}

function Avatar({ recipe, material, softness, rebound, onSqueeze }: Omit<AvatarCanvasProps, "resetKey">) {
  const avatar = useRef<THREE.Group>(null);
  const isDisliked = recipe.relation === "dislike";

  useFrame((state) => {
    if (!avatar.current) return;
    avatar.current.position.y = Math.sin(state.clock.elapsedTime * 1.25) * 0.035;
    avatar.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.035;
  });

  return (
    <group ref={avatar} position={[0, -0.2, 0]} scale={[1, recipe.height, 1]}>
      <SquishyPart name="脸颊" position={[0, 1.17, 0]} baseScale={[1.28 * recipe.headSize, 1.18 * recipe.headSize, 1.1 * recipe.headSize]} color={recipe.skin} material={material} softness={softness} rebound={rebound} onSqueeze={onSqueeze} geometry={<sphereGeometry args={[1, 64, 48]} />}>
        <Hair style={recipe.hairStyle} color={recipe.hairColor} />
        <Eye x={-0.4} size={recipe.eyeSize} isDisliked={isDisliked} /><Eye x={0.4} size={recipe.eyeSize} isDisliked={isDisliked} />
        <mesh position={[0, -0.42, 1.06]} rotation={[0, 0, isDisliked ? Math.PI : 0]}><torusGeometry args={[0.14, 0.025, 12, 28, Math.PI]} /><meshStandardMaterial color="#81594f" roughness={0.65} /></mesh>
        <mesh position={[-0.72, -0.28, 0.88]} rotation={[0, 0, 0.16]} scale={[0.24, 0.11, 0.04]}><sphereGeometry args={[1, 18, 12]} /><meshBasicMaterial color="#dc7770" transparent opacity={0.28} /></mesh>
        <mesh position={[0.72, -0.28, 0.88]} rotation={[0, 0, -0.16]} scale={[0.24, 0.11, 0.04]}><sphereGeometry args={[1, 18, 12]} /><meshBasicMaterial color="#dc7770" transparent opacity={0.28} /></mesh>
      </SquishyPart>
      <SquishyPart name="肚子" position={[0, -1.18, -0.08]} baseScale={[0.87 * recipe.bodySize, 1.03, 0.7 * recipe.bodySize]} color={recipe.outfitColor} material={material} softness={softness} rebound={rebound} onSqueeze={onSqueeze} geometry={<sphereGeometry args={[1, 48, 36]} />}><mesh position={[0, 0.38, 0.68]} scale={[0.26, 0.15, 0.04]}><sphereGeometry args={[1, 18, 12]} /><meshStandardMaterial color="#f3e9db" roughness={0.8} /></mesh></SquishyPart>
      <SquishyPart name="左手" position={[-0.91 * recipe.bodySize, -1.18, -0.05]} rotation={[0, 0, 0.22]} baseScale={[0.3, 0.75, 0.3]} color={recipe.outfitColor} material={material} softness={softness} rebound={rebound} onSqueeze={onSqueeze} geometry={<capsuleGeometry args={[0.55, 1.15, 12, 24]} />} />
      <SquishyPart name="右手" position={[0.91 * recipe.bodySize, -1.18, -0.05]} rotation={[0, 0, -0.22]} baseScale={[0.3, 0.75, 0.3]} color={recipe.outfitColor} material={material} softness={softness} rebound={rebound} onSqueeze={onSqueeze} geometry={<capsuleGeometry args={[0.55, 1.15, 12, 24]} />} />
      <SquishyPart name="左脚" position={[-0.43 * recipe.bodySize, -2.12, -0.02]} rotation={[0, 0, 0.05]} baseScale={[0.34, 0.51, 0.38]} color={recipe.skin} material={material} softness={softness} rebound={rebound} onSqueeze={onSqueeze} geometry={<capsuleGeometry args={[0.58, 0.72, 12, 24]} />} />
      <SquishyPart name="右脚" position={[0.43 * recipe.bodySize, -2.12, -0.02]} rotation={[0, 0, -0.05]} baseScale={[0.34, 0.51, 0.38]} color={recipe.skin} material={material} softness={softness} rebound={rebound} onSqueeze={onSqueeze} geometry={<capsuleGeometry args={[0.58, 0.72, 12, 24]} />} />
    </group>
  );
}

export default function AvatarCanvas({ recipe, material, softness, rebound, resetKey, onSqueeze }: AvatarCanvasProps) {
  return <Canvas key={resetKey} shadows dpr={[1, 1.7]} camera={{ position: [0, 0.05, 7.6], fov: 38 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }} style={{ touchAction: "none" }}><ambientLight intensity={1.35} /><hemisphereLight args={["#fff7ed", "#a98c72", 1.25]} /><spotLight position={[-4, 6, 6]} angle={0.48} penumbra={0.9} intensity={75} castShadow color="#fff2e6" /><pointLight position={[4, 2, 4]} intensity={16} color="#ffd1b7" /><Avatar recipe={recipe} material={material} softness={softness} rebound={rebound} onSqueeze={onSqueeze} /><ContactShadows position={[0, -2.78, 0]} opacity={0.24} scale={7} blur={2.8} far={4.5} color="#70553f" /><OrbitControls enablePan={false} enableZoom minDistance={6.3} maxDistance={9} minPolarAngle={Math.PI * 0.39} maxPolarAngle={Math.PI * 0.59} rotateSpeed={0.45} /></Canvas>;
}
