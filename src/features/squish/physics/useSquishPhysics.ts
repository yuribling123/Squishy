// Calculates pointer-driven deformation and spring recovery for an avatar part.
"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

type Vector3Tuple = [number, number, number];

type SquishPhysicsOptions = {
  position: Vector3Tuple;
  rotation: Vector3Tuple;
  baseScale: Vector3Tuple;
  softness: number;
  rebound: number;
  onPress: () => void;
};

export function useSquishPhysics({
  position,
  rotation,
  baseScale,
  softness,
  rebound,
  onPress,
}: SquishPhysicsOptions) {
  const groupRef = useRef<THREE.Group>(null);
  const pressedRef = useRef(false);
  const pointerStartRef = useRef(new THREE.Vector2());
  const motionRef = useRef({
    pressure: 0,
    dragX: 0,
    dragY: 0,
    velocity: 0,
  });

  function handlePointerDown(event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    pressedRef.current = true;
    pointerStartRef.current.set(event.pointer.x, event.pointer.y);
    motionRef.current.pressure = Math.max(motionRef.current.pressure, 0.52);
    motionRef.current.velocity += 0.16 + softness * 0.002;
    (event.target as unknown as Element).setPointerCapture?.(event.pointerId);
    onPress();
  }

  function handlePointerMove(event: ThreeEvent<PointerEvent>) {
    if (!pressedRef.current) return;

    event.stopPropagation();
    const dragX = event.pointer.x - pointerStartRef.current.x;
    const dragY = event.pointer.y - pointerStartRef.current.y;

    motionRef.current.dragX = THREE.MathUtils.clamp(dragX * 1.45, -0.65, 0.65);
    motionRef.current.dragY = THREE.MathUtils.clamp(dragY * 1.15, -0.55, 0.55);
    motionRef.current.pressure = THREE.MathUtils.clamp(
      0.62 + Math.hypot(dragX, dragY) * 0.8,
      0.55,
      1,
    );
  }

  function handlePointerRelease(event: ThreeEvent<PointerEvent>) {
    if (!pressedRef.current) return;

    event.stopPropagation();
    pressedRef.current = false;
    motionRef.current.velocity += 0.2;
    (event.target as unknown as Element).releasePointerCapture?.(event.pointerId);
  }

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;

    const motion = motionRef.current;
    const targetPressure = pressedRef.current
      ? Math.max(0.6, motion.pressure)
      : 0;
    const recoverySpeed = 3.2 + rebound * 0.085;

    motion.pressure = THREE.MathUtils.damp(
      motion.pressure,
      targetPressure,
      recoverySpeed,
      delta,
    );
    motion.dragX = THREE.MathUtils.damp(
      motion.dragX,
      pressedRef.current ? motion.dragX : 0,
      recoverySpeed * 0.72,
      delta,
    );
    motion.dragY = THREE.MathUtils.damp(
      motion.dragY,
      pressedRef.current ? motion.dragY : 0,
      recoverySpeed * 0.72,
      delta,
    );
    motion.velocity = THREE.MathUtils.damp(
      motion.velocity,
      0,
      4 + rebound * 0.04,
      delta,
    );

    const softnessFactor = 0.1 + softness / 160;
    const wobble =
      Math.sin(state.clock.elapsedTime * (5.2 + rebound * 0.055)) *
      motion.velocity *
      softnessFactor;
    const squash = motion.pressure * softnessFactor;

    group.scale.set(
      baseScale[0] *
        (1 + squash * 0.22 + Math.abs(motion.dragX) * 0.05 + wobble * 0.06),
      baseScale[1] * (1 - squash * 0.25 + wobble * 0.04),
      baseScale[2] * (1 + squash * 0.16 - wobble * 0.03),
    );
    group.position.set(
      position[0] + motion.dragX * 0.16,
      position[1] + motion.dragY * 0.13,
      position[2] - motion.pressure * 0.09,
    );
    group.rotation.set(
      rotation[0] - motion.dragY * 0.05,
      rotation[1] + motion.dragX * 0.06,
      rotation[2] - motion.dragX * 0.16 + wobble * 0.08,
    );
  });

  return {
    groupRef,
    impulse: (direction: number, strength: number) => {
      motionRef.current.pressure = 0.8;
      motionRef.current.dragX = direction * strength * 0.6;
      motionRef.current.velocity = strength;
    },
    pointerHandlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerRelease,
      onPointerCancel: handlePointerRelease,
      onPointerLeave: (event: ThreeEvent<PointerEvent>) => {
        if (pressedRef.current && event.buttons === 0) {
          handlePointerRelease(event);
        }
      },
    },
  };
}
