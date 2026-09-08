// Hosts the interactive 3D avatar with lighting, shadows, and camera controls.
"use client";

import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import type { AvatarRecipe, MaterialKind } from "../domain/avatar.types";
import { Avatar } from "./Avatar";
import { SceneLighting } from "./SceneLighting";
import { useSquishStore } from "../store/useSquishStore";

type AvatarCanvasProps = {
  recipe: AvatarRecipe;
  material: MaterialKind;
  softness: number;
  rebound: number;
  resetKey: number;
  onSqueeze: (part: string) => void;
};

export default function AvatarCanvas({
  recipe,
  material,
  softness,
  rebound,
  resetKey,
  onSqueeze,
}: AvatarCanvasProps) {
  const orbitEnabled = useSquishStore((state) => state.studioMode !== "play" || state.tool === "squish");
  return (
    <Canvas
      key={resetKey}
      shadows
      dpr={[1, 1.7]}
      camera={{ position: [0, 0.15, 9.5], fov: 42 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      }}
      style={{ touchAction: "none" }}
    >
      <SceneLighting />
      <Avatar
        recipe={recipe}
        material={material}
        softness={softness}
        rebound={rebound}
        onSqueeze={onSqueeze}
      />
      <ContactShadows
        position={[0, -2.78, 0]}
        opacity={0.24}
        scale={7}
        blur={2.8}
        far={4.5}
        color="#70553f"
      />
      <OrbitControls
        enabled={orbitEnabled}
        enablePan={false}
        enableZoom
        minDistance={8.8}
        maxDistance={11}
        minPolarAngle={Math.PI * 0.39}
        maxPolarAngle={Math.PI * 0.59}
        rotateSpeed={0.45}
      />
    </Canvas>
  );
}
