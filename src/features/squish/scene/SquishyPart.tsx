// Connects a deformable 3D body part to its pointer handlers and physics.
"use client";

import { useRef, useState, type ReactNode } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { MaterialKind } from "../domain/avatar.types";
import { getMaterialPreset } from "../domain/materials";
import { useSquishPhysics } from "../physics/useSquishPhysics";
import { useSquishStore } from "../store/useSquishStore";
import { HeartSticker, type Sticker } from "./HeartSticker";
import { playSquishSound } from "../services/squishAudio";

type Vector3Tuple = [number, number, number];

type SquishyPartProps = {
  name: string;
  position: Vector3Tuple;
  rotation?: Vector3Tuple;
  baseScale: Vector3Tuple;
  color: string;
  material: MaterialKind;
  softness: number;
  rebound: number;
  geometry: ReactNode;
  children?: ReactNode;
  onSqueeze: (part: string) => void;
};

export function SquishyPart({
  name,
  position,
  rotation = [0, 0, 0],
  baseScale,
  color,
  material,
  softness,
  rebound,
  geometry,
  children,
  onSqueeze,
}: SquishyPartProps) {
  const surface = getMaterialPreset(material).surface;
  const tool = useSquishStore((state) => state.studioMode === "play" ? state.tool : "squish");
  const strike = useSquishStore((state) => state.strike);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const gesture = useRef<{ x: number; y: number; time: number; pointer: number } | null>(null);
  const { groupRef, pointerHandlers, impulse } = useSquishPhysics({
    position,
    rotation,
    baseScale,
    softness,
    rebound,
    onPress: () => onSqueeze(name),
  });

  function onPointerDown(event: ThreeEvent<PointerEvent>) {
    if (tool === "squish") return pointerHandlers.onPointerDown(event);
    event.stopPropagation();
    if (tool === "heart" && groupRef.current && event.face) {
      const normal = event.face.normal.clone();
      const point = groupRef.current.worldToLocal(event.point.clone()).addScaledVector(normal, 0.045);
      setStickers((items) => [...items.slice(-7), {
        id: performance.now(), point: point.toArray(), normal: normal.toArray(),
      }]);
      onSqueeze(name);
      return;
    }
    if (gesture.current) return;
    gesture.current = { x: event.clientX, y: event.clientY, time: performance.now(), pointer: event.pointerId };
    (event.target as unknown as Element).setPointerCapture?.(event.pointerId);
  }

  function releaseWhip(event: ThreeEvent<PointerEvent>, cancelled = false) {
    const start = gesture.current;
    if (!start || start.pointer !== event.pointerId) return;
    gesture.current = null;
    event.stopPropagation();
    (event.target as unknown as Element).releasePointerCapture?.(event.pointerId);
    if (cancelled || tool !== "whip") return;
    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
    if (distance < 12) return;
    const direction = event.clientX >= start.x ? 1 : -1;
    const strength = Math.min(1, 0.35 + distance / Math.max(100, performance.now() - start.time));
    impulse(direction, strength);
    strike(direction, strength);
    onSqueeze(name);
    playSquishSound(useSquishStore.getState().soundOn, 25 + strength * 40);
  }

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <mesh
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerMove={(event) => {
          if (tool === "squish") pointerHandlers.onPointerMove(event);
          else if (gesture.current) event.stopPropagation();
        }}
        onPointerUp={(event) => {
          pointerHandlers.onPointerUp(event);
          releaseWhip(event);
        }}
        onPointerCancel={(event) => {
          pointerHandlers.onPointerCancel(event);
          releaseWhip(event, true);
        }}
        onPointerLeave={pointerHandlers.onPointerLeave}
      >
        {geometry}
        <meshPhysicalMaterial
          color={color}
          roughness={surface.roughness}
          metalness={surface.metalness}
          clearcoat={surface.clearcoat}
          transmission={surface.transmission}
          transparent={surface.opacity < 1}
          opacity={surface.opacity}
          thickness={0.8}
          ior={1.34}
        />
      </mesh>
      {children}
      {stickers.map((sticker) => <HeartSticker key={sticker.id} sticker={sticker} />)}
    </group>
  );
}
