// Creates independent, centered meshes and undeformed picking surfaces from the Basis asset.
import { Box3, BufferAttribute, DynamicDrawUsage, Mesh, MeshStandardMaterial, Object3D, Vector3 } from "three";

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
    const rest = new Float32Array(geometry.getAttribute("position").array);
    const normals = new Float32Array(geometry.getAttribute("normal").array);
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(rest), 3).setUsage(DynamicDrawUsage));
    geometry.computeBoundingSphere();
    if (geometry.boundingSphere) geometry.boundingSphere.radius += 0.5;
    surfaces.push({ mesh, rest, normals });
  });
  return surfaces;
}

export type BasisSurface = {
  mesh: Mesh;
  rest: Float32Array;
  normals: Float32Array;
};

export function describeBasisPart(name: string) {
  if (name.startsWith("Hair")) return "头发";
  if (name.includes("Foot")) return "小脚";
  if (name.includes("Arm")) return "手臂";
  if (name.includes("Pants")) return "裤子";
  if (name.includes("Tshirt")) return "肚子";
  if (name.includes("Neck")) return "脖子";
  return "脸颊";
}
