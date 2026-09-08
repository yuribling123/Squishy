// Assembles the customizable avatar from its body parts and facial features.
"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group } from "three";
import type { AvatarRecipe, MaterialKind } from "../domain/avatar.types";
import { Face } from "./Face";
import { Hair } from "./Hair";
import { SquishyPart } from "./SquishyPart";
import { useSquishStore } from "../store/useSquishStore";

type AvatarProps = {
  recipe: AvatarRecipe;
  material: MaterialKind;
  softness: number;
  rebound: number;
  onSqueeze: (part: string) => void;
};

export function Avatar({
  recipe,
  material,
  softness,
  rebound,
  onSqueeze,
}: AvatarProps) {
  const avatarRef = useRef<Group>(null);
  const reaction = useRef({ id: 0, start: 0, strength: 0, direction: 1 });
  const isDisliked = recipe.relation === "dislike";

  useFrame((state) => {
    const avatar = avatarRef.current;
    if (!avatar) return;

    avatar.position.y = Math.sin(state.clock.elapsedTime * 1.25) * 0.035;
    avatar.rotation.y = Math.sin(state.clock.elapsedTime * 0.55) * 0.035;
    const impact = useSquishStore.getState().impact;
    if (impact.id !== reaction.current.id) {
      reaction.current = { ...impact, start: state.clock.elapsedTime };
    }
    const elapsed = state.clock.elapsedTime - reaction.current.start;
    const kick = Math.sin(elapsed * 15) * Math.exp(-elapsed * 3.8) * reaction.current.strength;
    avatar.rotation.z = -kick * reaction.current.direction * 0.45;
    avatar.position.x = kick * reaction.current.direction * 0.25;
  });

  const sharedPhysics = {
    material,
    softness,
    rebound,
    onSqueeze,
  };

  return (
    <group ref={avatarRef} position={[0, -0.2, 0]} scale={[1, recipe.height, 1]}>
      <SquishyPart
        {...sharedPhysics}
        name="脸颊"
        position={[0, 1.17, 0]}
        baseScale={[
          1.28 * recipe.headSize,
          1.18 * recipe.headSize,
          1.1 * recipe.headSize,
        ]}
        color={recipe.skin}
        geometry={<sphereGeometry args={[1, 64, 48]} />}
      >
        <Hair style={recipe.hairStyle} color={recipe.hairColor} />
        <Face eyeSize={recipe.eyeSize} isDisliked={isDisliked} />
      </SquishyPart>

      <SquishyPart
        {...sharedPhysics}
        name="肚子"
        position={[0, -1.18, -0.08]}
        baseScale={[0.87 * recipe.bodySize, 1.03, 0.7 * recipe.bodySize]}
        color={recipe.outfitColor}
        geometry={<sphereGeometry args={[1, 48, 36]} />}
      >
        <mesh position={[0, 0.38, 0.68]} scale={[0.26, 0.15, 0.04]}>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color="#f3e9db" roughness={0.8} />
        </mesh>
      </SquishyPart>

      <SquishyPart
        {...sharedPhysics}
        name="左手"
        position={[-0.91 * recipe.bodySize, -1.18, -0.05]}
        rotation={[0, 0, 0.22]}
        baseScale={[0.3, 0.75, 0.3]}
        color={recipe.outfitColor}
        geometry={<capsuleGeometry args={[0.55, 1.15, 12, 24]} />}
      />
      <SquishyPart
        {...sharedPhysics}
        name="右手"
        position={[0.91 * recipe.bodySize, -1.18, -0.05]}
        rotation={[0, 0, -0.22]}
        baseScale={[0.3, 0.75, 0.3]}
        color={recipe.outfitColor}
        geometry={<capsuleGeometry args={[0.55, 1.15, 12, 24]} />}
      />
      <SquishyPart
        {...sharedPhysics}
        name="左脚"
        position={[-0.43 * recipe.bodySize, -2.12, -0.02]}
        rotation={[0, 0, 0.05]}
        baseScale={[0.34, 0.51, 0.38]}
        color={recipe.skin}
        geometry={<capsuleGeometry args={[0.58, 0.72, 12, 24]} />}
      />
      <SquishyPart
        {...sharedPhysics}
        name="右脚"
        position={[0.43 * recipe.bodySize, -2.12, -0.02]}
        rotation={[0, 0, -0.05]}
        baseScale={[0.34, 0.51, 0.38]}
        color={recipe.skin}
        geometry={<capsuleGeometry args={[0.58, 0.72, 12, 24]} />}
      />
    </group>
  );
}
