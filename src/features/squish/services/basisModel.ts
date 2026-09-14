// Creates independent, centered meshes and undeformed picking surfaces from the Basis asset.
import {
  Box3,
  BufferAttribute,
  DynamicDrawUsage,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Ray,
  Triangle,
  Vector3,
  DoubleSide,
} from "three";
import { MeshBVH } from "three-mesh-bvh";

export function createBasisSurfaces(scene: Object3D) {
  scene.updateMatrixWorld(true);
  const box = new Box3().setFromObject(scene);
  const center = box.getCenter(new Vector3());
  const scale = 5 / box.getSize(new Vector3()).y;
  const surfaces: BasisSurface[] = [];
  scene.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry.clone().applyMatrix4(object.matrixWorld);
    geometry.translate(-center.x, -center.y, -center.z);
    geometry.scale(scale, scale, scale);
    geometry.translate(0, -0.18, 0);
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const materials = sourceMaterials.map((material) => material.clone() as MeshStandardMaterial);
    const mesh = new Mesh(geometry, Array.isArray(object.material) ? materials : materials[0]);
    mesh.name = object.name;
    mesh.castShadow = mesh.receiveShadow = true;
    if (object.name.startsWith("Hair")) mesh.renderOrder = 200;
    const rest = new Float32Array(geometry.getAttribute("position").array);
    const normals = new Float32Array(geometry.getAttribute("normal").array);
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(rest), 3).setUsage(DynamicDrawUsage));
    geometry.setAttribute(
      "dragReveal",
      new BufferAttribute(new Float32Array(rest.length / 3), 1).setUsage(DynamicDrawUsage),
    );
    geometry.computeBoundingSphere();
    if (geometry.boundingSphere) geometry.boundingSphere.radius += 0.5;
    const overlayMaterials = materials.map(createDragOverlayMaterial);
    const overlay = new Mesh(
      geometry,
      Array.isArray(object.material) ? overlayMaterials : overlayMaterials[0],
    );
    overlay.name = `${object.name}_DragOverlay`;
    overlay.visible = true;
    overlay.renderOrder = object.name === "RoundFullFace"
      ? 300
      : isFaceDetail(object.name) ? 301 : 100;
    overlay.raycast = () => undefined;
    surfaces.push({ mesh, overlay, rest, normals });
  });
  return surfaces;
}

function createDragOverlayMaterial(source: MeshStandardMaterial) {
  const material = source.clone();
  material.transparent = false;
  material.depthTest = false;
  material.depthWrite = false;
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        "#include <common>\nattribute float dragReveal;\nvarying float vDragReveal;",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvDragReveal = dragReveal;",
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "#include <common>\nvarying float vDragReveal;",
      )
      .replace(
        "#include <opaque_fragment>",
        "float dragCoverage = smoothstep(0.015, 0.18, vDragReveal);\nfloat dragDither = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);\nif (dragCoverage <= 0.001 || dragCoverage < dragDither) discard;\n#include <opaque_fragment>",
      );
  };
  material.customProgramCacheKey = () => "local-drag-overlay-v1";
  return material;
}

export type BasisSurface = {
  mesh: Mesh;
  overlay: Mesh;
  rest: Float32Array;
  normals: Float32Array;
};

export type FaceAttachment = {
  surface: BasisSurface;
  triangleVertices: Uint32Array;
  barycentric: Float32Array;
  offsets: Float32Array;
  restNormals: Float32Array;
};

const attachmentPoint = new Vector3();
const attachmentOffset = new Vector3();
const barycentricPoint = new Vector3();
const triangleA = new Vector3();
const triangleB = new Vector3();
const triangleC = new Vector3();
const restTriangleNormal = new Vector3();
const currentTriangleNormal = new Vector3();
const attachmentRotation = new Quaternion();
const visibilityRay = new Ray();
const visibilityDirection = new Vector3();
const visibilityNormal = new Vector3();
const triangleCenter = new Vector3();

export type HairOccluder = { tree: MeshBVH };

export function createHairOccluders(surfaces: BasisSurface[]) {
  return surfaces.filter((surface) => surface.mesh.name.startsWith("Hair")).map((surface) => {
    const geometry = surface.mesh.geometry.clone();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(surface.rest), 3));
    return { tree: new MeshBVH(geometry) };
  });
}

export function createVisibleVertexMask(
  surface: BasisSurface,
  occluders: HairOccluder[],
  cameraPosition: Vector3,
  contactPoint: Vector3,
) {
  const vertexCount = surface.rest.length / 3;
  const visibleVertices = new Float32Array(vertexCount);
  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const index = vertex * 3;
    attachmentPoint.fromArray(surface.rest, index);
    visibilityDirection.copy(attachmentPoint).sub(cameraPosition);
    const distance = visibilityDirection.length();
    visibilityDirection.multiplyScalar(1 / distance);
    visibilityNormal.fromArray(surface.normals, index);
    const frontFacing = visibilityNormal.dot(visibilityDirection) < -0.05;
    visibilityRay.set(cameraPosition, visibilityDirection);
    const occluded = occluders.some(({ tree }) => tree.raycastFirst(
      visibilityRay,
      DoubleSide,
      0.001,
      Math.max(0.001, distance - 0.012),
    ));
    visibleVertices[vertex] = frontFacing && !occluded ? 1 : 0;
  }
  const indices = surface.mesh.geometry.index?.array;
  const triangleCount = indices ? indices.length / 3 : vertexCount / 3;
  const triangleVertices = new Uint32Array(triangleCount * 3);
  const visibleTriangles = new Uint8Array(triangleCount);
  const vertexTriangles = Array.from({ length: vertexCount }, () => [] as number[]);
  let seedTriangle = -1;
  let seedDistance = Number.POSITIVE_INFINITY;

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const a = Number(indices ? indices[triangle * 3] : triangle * 3);
    const b = Number(indices ? indices[triangle * 3 + 1] : triangle * 3 + 1);
    const c = Number(indices ? indices[triangle * 3 + 2] : triangle * 3 + 2);
    triangleVertices[triangle * 3] = a;
    triangleVertices[triangle * 3 + 1] = b;
    triangleVertices[triangle * 3 + 2] = c;
    vertexTriangles[a].push(triangle);
    vertexTriangles[b].push(triangle);
    vertexTriangles[c].push(triangle);
    if (!(visibleVertices[a] && visibleVertices[b] && visibleVertices[c])) continue;
    visibleTriangles[triangle] = 1;
    triangleA.fromArray(surface.rest, a * 3);
    triangleB.fromArray(surface.rest, b * 3);
    triangleC.fromArray(surface.rest, c * 3);
    triangleCenter.copy(triangleA).add(triangleB).add(triangleC).multiplyScalar(1 / 3);
    const distance = triangleCenter.distanceToSquared(contactPoint);
    if (distance < seedDistance) {
      seedDistance = distance;
      seedTriangle = triangle;
    }
  }

  const mask = new Float32Array(vertexCount);
  if (seedTriangle < 0) return mask;
  const connected = new Uint8Array(triangleCount);
  const queue = new Uint32Array(triangleCount);
  let readIndex = 0;
  let writeIndex = 1;
  queue[0] = seedTriangle;
  connected[seedTriangle] = 1;
  while (readIndex < writeIndex) {
    const triangle = queue[readIndex];
    readIndex += 1;
    for (let corner = 0; corner < 3; corner += 1) {
      const vertex = triangleVertices[triangle * 3 + corner];
      mask[vertex] = 1;
      for (const neighbor of vertexTriangles[vertex]) {
        if (!visibleTriangles[neighbor] || connected[neighbor]) continue;
        connected[neighbor] = 1;
        queue[writeIndex] = neighbor;
        writeIndex += 1;
      }
    }
  }
  return mask;
}

export function isFaceDetail(name: string) {
  return name.startsWith("BeanEye_")
    || name.startsWith("CheekMark_")
    || name === "HorizontalMouth"
    || name === "SmallFaceDot";
}

export function getDeformationSurfaceName(name: string) {
  return isFaceDetail(name) ? "RoundFullFace" : name;
}

export function createFaceAttachments(surfaces: BasisSurface[]) {
  const face = surfaces.find((surface) => surface.mesh.name === "RoundFullFace");
  if (!face) return [];
  const faceGeometry = face.mesh.geometry.clone();
  faceGeometry.setAttribute("position", new BufferAttribute(new Float32Array(face.rest), 3));
  const faceTree = new MeshBVH(faceGeometry);
  const faceIndices = faceGeometry.index?.array;

  return surfaces.filter((surface) => isFaceDetail(surface.mesh.name)).map((surface) => {
    const vertexCount = surface.rest.length / 3;
    const triangleVertices = new Uint32Array(vertexCount * 3);
    const barycentric = new Float32Array(vertexCount * 3);
    const offsets = new Float32Array(surface.rest.length);
    const restNormals = new Float32Array(surface.rest.length);

    for (let vertex = 0; vertex < vertexCount; vertex += 1) {
      const index = vertex * 3;
      attachmentPoint.fromArray(surface.rest, index);
      const hit = faceTree.closestPointToPoint(attachmentPoint);
      if (!hit) continue;
      const triangleIndex = hit.faceIndex * 3;
      const a = Number(faceIndices ? faceIndices[triangleIndex] : triangleIndex);
      const b = Number(faceIndices ? faceIndices[triangleIndex + 1] : triangleIndex + 1);
      const c = Number(faceIndices ? faceIndices[triangleIndex + 2] : triangleIndex + 2);
      triangleVertices[index] = a;
      triangleVertices[index + 1] = b;
      triangleVertices[index + 2] = c;
      triangleA.fromArray(face.rest, a * 3);
      triangleB.fromArray(face.rest, b * 3);
      triangleC.fromArray(face.rest, c * 3);
      Triangle.getBarycoord(hit.point, triangleA, triangleB, triangleC, barycentricPoint);
      barycentricPoint.toArray(barycentric, index);
      attachmentOffset.copy(attachmentPoint).sub(hit.point).toArray(offsets, index);
      Triangle.getNormal(triangleA, triangleB, triangleC, restTriangleNormal);
      restTriangleNormal.toArray(restNormals, index);
    }
    return { surface, triangleVertices, barycentric, offsets, restNormals };
  });
}

export function applyFaceAttachments(
  face: BasisSurface,
  attachments: FaceAttachment[],
) {
  const facePositions = face.mesh.geometry.getAttribute("position").array as Float32Array;
  const faceReveal = face.mesh.geometry.getAttribute("dragReveal").array as Float32Array;
  for (const attachment of attachments) {
    const positions = attachment.surface.mesh.geometry.getAttribute("position");
    const reveal = attachment.surface.mesh.geometry.getAttribute("dragReveal") as BufferAttribute;
    const array = positions.array as Float32Array;
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const index = vertex * 3;
      const a = attachment.triangleVertices[index] * 3;
      const b = attachment.triangleVertices[index + 1] * 3;
      const c = attachment.triangleVertices[index + 2] * 3;
      triangleA.fromArray(facePositions, a);
      triangleB.fromArray(facePositions, b);
      triangleC.fromArray(facePositions, c);
      attachmentPoint
        .copy(triangleA)
        .multiplyScalar(attachment.barycentric[index])
        .addScaledVector(triangleB, attachment.barycentric[index + 1])
        .addScaledVector(triangleC, attachment.barycentric[index + 2]);
      Triangle.getNormal(triangleA, triangleB, triangleC, currentTriangleNormal);
      restTriangleNormal.fromArray(attachment.restNormals, index);
      attachmentRotation.setFromUnitVectors(restTriangleNormal, currentTriangleNormal);
      attachmentOffset
        .fromArray(attachment.offsets, index)
        .applyQuaternion(attachmentRotation);
      attachmentPoint.add(attachmentOffset).toArray(array, index);
      (reveal.array as Float32Array)[vertex] = faceReveal[a / 3]
        * attachment.barycentric[index]
        + faceReveal[b / 3] * attachment.barycentric[index + 1]
        + faceReveal[c / 3] * attachment.barycentric[index + 2];
    }
    positions.needsUpdate = true;
    reveal.needsUpdate = true;
    attachment.surface.mesh.geometry.computeVertexNormals();
  }
}

export function isDragDeformablePart(name: string) {
  return name === "RoundFullFace"
    || name.startsWith("Ear_")
    || name.startsWith("SmallArm_")
    || name.startsWith("BareFoot_");
}

export function describeBasisPart(name: string) {
  if (name.startsWith("Hair")) return "头发";
  if (name.includes("Foot")) return "小脚";
  if (name.includes("Arm")) return "手臂";
  if (name.includes("Pants")) return "裤子";
  if (name.includes("Tshirt")) return "肚子";
  if (name.includes("Neck")) return "脖子";
  return "脸颊";
}
