// Loads the finished Basis model and applies reusable local press and drag deformation.
"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Group, Matrix4, Vector2, Vector3 } from "three";
import {
  dragDeformationWeight,
  siliconeDeformationWeight,
  stepSpring,
} from "../physics/localIndentation";
import {
  deformationDepthWeight,
  safeIndentationDepth,
} from "../physics/deformationConstraints";
import {
  applyFaceAttachments,
  createBasisSurfaces,
  createFaceAttachments,
  createHairOccluders,
  createVisibleVertexMask,
  describeBasisPart,
  getDeformationSurfaceName,
  isFaceDetail,
  isDragDeformablePart,
} from "../services/basisModel";

type BasisAvatarProps = {
  softness: number;
  rebound: number;
  enabled: boolean;
  onSqueeze: (part: string) => void;
};

const vertexPosition = new Vector3();
const vertexNormal = new Vector3();
const tangentialDirection = new Vector3();
const cameraRight = new Vector3();
const cameraUp = new Vector3();
const inverseGroupMatrix = new Matrix4();
const contactOffset = new Vector3();
const localCameraPosition = new Vector3();

export function BasisAvatar({ softness, rebound, enabled, onSqueeze }: BasisAvatarProps) {
  const { scene } = useGLTF("/models/basis-character.glb");
  const surfaces = useMemo(() => createBasisSurfaces(scene), [scene]);
  const faceSurface = useMemo(
    () => surfaces.find((surface) => surface.mesh.name === "RoundFullFace"),
    [surfaces],
  );
  const faceAttachments = useMemo(() => createFaceAttachments(surfaces), [surfaces]);
  const hairOccluders = useMemo(() => createHairOccluders(surfaces), [surfaces]);
  const groupRef = useRef<Group>(null);
  const wasMoving = useRef(false);
  const { gl } = useThree();
  const press = useRef({
    active: false,
    pointerId: -1,
    point: new Vector3(),
    direction: new Vector3(0, 0, -1),
    pointerStart: new Vector2(),
    surfaceName: "",
    visibleMask: null as Float32Array | null,
    dragEnabled: false,
    dragTarget: new Vector3(),
    dragOffset: new Vector3(),
    dragVelocity: new Vector3(),
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

  useEffect(() => {
    if (!enabled) press.current.active = false;
  }, [enabled]);

  function updatePress(event: ThreeEvent<PointerEvent>, begin = false) {
    if (!enabled) return;
    const group = groupRef.current;
    if (!group) return;
    event.stopPropagation();
    if (begin) {
      inverseGroupMatrix.copy(group.matrixWorld).invert();
      press.current.point.copy(event.point).applyMatrix4(inverseGroupMatrix);
      press.current.direction.copy(event.ray.direction).transformDirection(inverseGroupMatrix);
      press.current.pointerStart.set(event.clientX, event.clientY);
      press.current.surfaceName = getDeformationSurfaceName(event.object.name);
      const activeSurface = surfaces.find(
        (surface) => surface.mesh.name === press.current.surfaceName,
      );
      localCameraPosition.copy(event.camera.position).applyMatrix4(inverseGroupMatrix);
      press.current.visibleMask = activeSurface?.mesh.name === "RoundFullFace"
        ? createVisibleVertexMask(
          activeSurface,
          hairOccluders,
          localCameraPosition,
          press.current.point,
        )
        : null;
      press.current.dragEnabled = isDragDeformablePart(press.current.surfaceName);
      press.current.dragTarget.set(0, 0, 0);
      cameraRight.setFromMatrixColumn(event.camera.matrixWorld, 0).transformDirection(inverseGroupMatrix);
      cameraUp.setFromMatrixColumn(event.camera.matrixWorld, 1).transformDirection(inverseGroupMatrix);
    } else if (press.current.dragEnabled) {
      const dragScale = 0.0065 + softness * 0.000025;
      press.current.dragTarget
        .copy(cameraRight)
        .multiplyScalar((event.clientX - press.current.pointerStart.x) * dragScale)
        .addScaledVector(cameraUp, (press.current.pointerStart.y - event.clientY) * dragScale)
        .clampLength(0, 0.72);
    }
    press.current.active = true;
    press.current.pointerId = event.pointerId;
    gl.domElement.setPointerCapture?.(event.pointerId);
    if (begin) onSqueeze(describeBasisPart(event.object.name));
  }

  useFrame((_, delta) => {
    const state = press.current;
    const depth = (0.085 + softness * 0.0015) * 5;
    const spring = stepSpring(
      { displacement: state.displacement, velocity: state.velocity },
      state.active ? depth : 0,
      delta,
      rebound,
    );
    state.displacement = spring.displacement;
    state.velocity = spring.velocity;
    const radius = 0.64 + softness * 0.004;
    const constrainedDepth = safeIndentationDepth(state.displacement, radius);
    for (const axis of ["x", "y", "z"] as const) {
      const dragSpring = stepSpring(
        { displacement: state.dragOffset[axis], velocity: state.dragVelocity[axis] },
        state.active && state.dragEnabled ? state.dragTarget[axis] : 0,
        delta,
        rebound,
      );
      state.dragOffset[axis] = dragSpring.displacement;
      state.dragVelocity[axis] = dragSpring.velocity;
    }
    const stillMoving = Math.abs(state.displacement) > 0.0002
      || Math.abs(state.velocity) > 0.001
      || state.dragOffset.lengthSq() > 0.000001
      || state.dragVelocity.lengthSq() > 0.0001;
    if (!stillMoving && !wasMoving.current) return;
    const dragVisibility = Math.min(1, state.dragOffset.length() / 0.08);

    for (const surface of surfaces) {
      const positions = surface.mesh.geometry.getAttribute("position");
      const reveal = surface.mesh.geometry.getAttribute("dragReveal");
      const array = positions.array as Float32Array;
      const revealArray = reveal.array as Float32Array;
      revealArray.fill(0);
      if (isFaceDetail(surface.mesh.name)) {
        reveal.needsUpdate = true;
        continue;
      }
      if (surface.mesh.name !== state.surfaceName) {
        array.set(surface.rest);
        positions.needsUpdate = true;
        reveal.needsUpdate = true;
        continue;
      }
      for (let index = 0; index < surface.rest.length; index += 3) {
        vertexPosition.fromArray(surface.rest, index);
        vertexNormal.fromArray(surface.normals, index);
        const facing = Math.max(0, -vertexNormal.dot(state.direction));
        contactOffset.copy(vertexPosition).sub(state.point);
        const axialDistance = contactOffset.dot(state.direction);
        const radialDistanceSquared = Math.max(
          0,
          contactOffset.lengthSq() - axialDistance * axialDistance,
        );
        const depthWeight = deformationDepthWeight(axialDistance, radius);
        const weight = siliconeDeformationWeight(
          radialDistanceSquared,
          radius,
          facing,
        ) * depthWeight;
        const bulge = Math.max(0, -weight);
        const dragWeight = dragDeformationWeight(
          vertexPosition.distanceToSquared(state.point),
          radius * 1.12,
        );
        const overlayWeight = dragDeformationWeight(
          vertexPosition.distanceToSquared(state.point),
          radius * 1.12,
        );
        revealArray[index / 3] = overlayWeight
          * dragVisibility
          * (state.visibleMask?.[index / 3] ?? 1);
        tangentialDirection
          .copy(vertexPosition)
          .sub(state.point);
        tangentialDirection.addScaledVector(
          state.direction,
          -tangentialDirection.dot(state.direction),
        );
        if (tangentialDirection.lengthSq() > 0.000001) tangentialDirection.normalize();
        array[index] = surface.rest[index]
          + state.direction.x * constrainedDepth * weight
          + tangentialDirection.x * constrainedDepth * bulge * 0.32
          + state.dragOffset.x * dragWeight;
        array[index + 1] = surface.rest[index + 1]
          + state.direction.y * constrainedDepth * weight
          + tangentialDirection.y * constrainedDepth * bulge * 0.32
          + state.dragOffset.y * dragWeight;
        array[index + 2] = surface.rest[index + 2]
          + state.direction.z * constrainedDepth * weight
          + tangentialDirection.z * constrainedDepth * bulge * 0.32
          + state.dragOffset.z * dragWeight;
      }
      positions.needsUpdate = true;
      reveal.needsUpdate = true;
      surface.mesh.geometry.computeVertexNormals();
    }
    if (faceSurface) {
      applyFaceAttachments(faceSurface, faceAttachments);
    }
    wasMoving.current = stillMoving;
  });

  return (
    <group ref={groupRef}>
      {surfaces.map(({ mesh, overlay }) => (
        <group key={mesh.uuid}>
          <primitive
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
          <primitive object={overlay} />
        </group>
      ))}
    </group>
  );
}

useGLTF.preload("/models/basis-character.glb");
