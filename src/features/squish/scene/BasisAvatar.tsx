// Loads the finished Basis model and deforms its surface locally under pointer pressure.
"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, Vector3 } from "three";
import { indentationWeight, stepSpring } from "../physics/localIndentation";
import { createBasisSurfaces, describeBasisPart } from "../services/basisModel";

type BasisAvatarProps = {
  softness: number;
  rebound: number;
  onSqueeze: (part: string) => void;
};

const vertexPosition = new Vector3();
const vertexNormal = new Vector3();

export function BasisAvatar({ softness, rebound, onSqueeze }: BasisAvatarProps) {
  const { scene } = useGLTF("/models/basis-character.glb");
  const surfaces = useMemo(() => createBasisSurfaces(scene), [scene]);
  const groupRef = useRef<Group>(null);
  const wasMoving = useRef(false);
  const { gl } = useThree();
  const press = useRef({
    active: false,
    pointerId: -1,
    point: new Vector3(),
    direction: new Vector3(0, 0, -1),
    displacement: 0,
    velocity: 0,
  });

  useEffect(() => {
    const release = (event: PointerEvent) => {
      if (event.pointerId === press.current.pointerId) press.current.active = false;
    };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);

  function updatePress(event: ThreeEvent<PointerEvent>, begin = false) {
    const group = groupRef.current;
    if (!group) return;
    event.stopPropagation();
    press.current.point.copy(group.worldToLocal(event.point.clone()));
    press.current.direction.copy(event.ray.direction).transformDirection(group.matrixWorld.clone().invert());
    press.current.active = true;
    press.current.pointerId = event.pointerId;
    gl.domElement.setPointerCapture?.(event.pointerId);
    if (begin) onSqueeze(describeBasisPart(event.object.name));
  }

  useFrame((_, delta) => {
    const state = press.current;
    const depth = 0.14 + softness * 0.0023;
    const spring = stepSpring(
      { displacement: state.displacement, velocity: state.velocity },
      state.active ? depth : 0,
      delta,
      rebound,
    );
    state.displacement = spring.displacement;
    state.velocity = spring.velocity;
    const radius = 0.32 + softness * 0.0038;
    const stillMoving = Math.abs(state.displacement) > 0.0002 || Math.abs(state.velocity) > 0.001;
    if (!stillMoving && !wasMoving.current) return;

    for (const surface of surfaces) {
      const positions = surface.mesh.geometry.getAttribute("position");
      const array = positions.array as Float32Array;
      for (let index = 0; index < surface.rest.length; index += 3) {
        vertexPosition.fromArray(surface.rest, index);
        vertexNormal.fromArray(surface.normals, index);
        const facing = Math.max(0, -vertexNormal.dot(state.direction));
        const weight = indentationWeight(vertexPosition.distanceToSquared(state.point), radius, facing);
        array[index] = surface.rest[index] + state.direction.x * state.displacement * weight;
        array[index + 1] = surface.rest[index + 1] + state.direction.y * state.displacement * weight;
        array[index + 2] = surface.rest[index + 2] + state.direction.z * state.displacement * weight;
      }
      positions.needsUpdate = true;
      surface.mesh.geometry.computeVertexNormals();
    }
    wasMoving.current = stillMoving;
  });

  return (
    <group ref={groupRef}>
      {surfaces.map(({ mesh }) => (
        <primitive
          key={mesh.uuid}
          object={mesh}
          onPointerDown={(event: ThreeEvent<PointerEvent>) => updatePress(event, true)}
          onPointerMove={(event: ThreeEvent<PointerEvent>) => {
            if (press.current.active && event.pointerId === press.current.pointerId) updatePress(event);
          }}
          onPointerUp={(event: ThreeEvent<PointerEvent>) => {
            event.stopPropagation();
            press.current.active = false;
            gl.domElement.releasePointerCapture?.(event.pointerId);
          }}
          onPointerCancel={() => { press.current.active = false; }}
        />
      ))}
    </group>
  );
}

useGLTF.preload("/models/basis-character.glb");
