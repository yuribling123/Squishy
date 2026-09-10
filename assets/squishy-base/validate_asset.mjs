// Validate exported geometry, morph targets, skeletons, and posed vertices with the project's Three.js loader.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box3, Vector3 } from 'three';

const root = new URL('./', import.meta.url);
const names = ['Squash', 'Stretch', 'Flatten', 'HeadSquash', 'FacePullLeft', 'FacePullRight', 'FaceStretch', 'FaceSquash'];
const close = (a, b, tolerance = 2e-5) => Math.abs(a-b) < tolerance;
const loaded = [];
const report = { loader: 'Three.js GLTFLoader', assets: [] };

for (const filename of ['squishy_base.glb', 'glasses_soft_square.glb']) {
  const bytes = await readFile(new URL(filename, root));
  const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const gltf = await new GLTFLoader().parseAsync(arrayBuffer, '');
  gltf.scene.updateMatrixWorld(true);
  const meshes = [];
  gltf.scene.traverse(object => { if (object.isMesh) meshes.push(object); });
  assert(meshes.length > 0);
  let triangles = 0;
  let vertexCount = 0;
  const skeleton = meshes[0].skeleton;
  assert.equal(skeleton.bones.length, 17);
  for (const bone of ['Root', 'Pelvis', 'Chest', 'Neck', 'Head', ...['L', 'R'].flatMap(s => ['UpperArm','LowerArm','Hand','UpperLeg','LowerLeg','Foot'].map(n => `${n}${s}`))]) {
    // GLTFLoader sanitizes periods in Object3D names, while the glTF JSON retains them.
    assert(skeleton.bones.some(b => b.name === bone), `Missing bone ${bone}`);
  }
  skeleton.update();
  for (const mesh of meshes) {
    assert(mesh.isSkinnedMesh, `${mesh.name} is not skinned`);
    assert.equal(mesh.skeleton.bones.length, 17);
    assert.deepEqual(Object.keys(mesh.morphTargetDictionary), names);
    assert.equal(mesh.geometry.morphAttributes.position.length, 8);
    assert.equal(mesh.geometry.morphAttributes.normal.length, 8);
    assert(mesh.morphTargetInfluences.every(v => v === 0));
    const { position, skinWeight, skinIndex, normal } = mesh.geometry.attributes;
    triangles += mesh.geometry.index.count / 3;
    vertexCount += position.count;
    for (let i = 0; i < position.count; i++) {
      let sum = 0;
      for (let j = 0; j < 4; j++) {
        const weight = skinWeight.getComponent(i,j);
        assert(weight >= 0 && weight <= 1);
        assert(skinIndex.getComponent(i,j) < 17);
        sum += weight;
      }
      assert(close(sum,1,1e-4), `${mesh.name} has invalid weights at ${i}`);
      const n = new Vector3().fromBufferAttribute(normal,i);
      assert(close(n.length(), 1, .002));
      const actual = mesh.getVertexPosition(i,new Vector3());
      const original = new Vector3().fromBufferAttribute(position,i);
      assert(actual.distanceTo(original) < .0001, `${mesh.name} has invalid inverse binds`);
    }
    for (const attrs of Object.values(mesh.geometry.morphAttributes)) {
      for (const attr of attrs) assert([...attr.array].every(Number.isFinite));
    }
  }
  const rest = new Box3().setFromObject(gltf.scene, true);
  const morphs = {};
  for (const name of names) {
    for (const mesh of meshes) mesh.morphTargetInfluences[mesh.morphTargetDictionary[name]] = 1;
    // CPU evaluation exercises morphs plus skinning independently of a GPU/viewer.
    const box = new Box3();
    let changed = 0;
    for (const mesh of meshes) {
      const position = mesh.geometry.attributes.position;
      for (let i=0; i<position.count; i++) {
        const vertex = mesh.getVertexPosition(i,new Vector3());
        assert(vertex.toArray().every(Number.isFinite));
        if (vertex.distanceTo(new Vector3().fromBufferAttribute(position,i)) > 1e-5) changed++;
        box.expandByPoint(vertex.applyMatrix4(mesh.matrixWorld));
      }
    }
    assert(changed > 0, `${name} is a no-op`);
    morphs[name] = { changedVertices: changed, size: box.getSize(new Vector3()).toArray() };
    for (const mesh of meshes) mesh.morphTargetInfluences.fill(0);
  }
  if (filename === 'squishy_base.glb') {
    assert(morphs.Squash.size[1] < rest.getSize(new Vector3()).y * .8);
    assert(morphs.Stretch.size[1] > rest.getSize(new Vector3()).y * 1.2);
    assert(morphs.Flatten.size[2] < rest.getSize(new Vector3()).z * .4);
  }
  const poseChecks = [];
  for (const bone of skeleton.bones.filter(b => b.name !== 'Root')) {
    const originals = new Map(meshes.map(m => [m, Array.from({length:m.geometry.attributes.position.count}, (_,i) => m.getVertexPosition(i,new Vector3()))]));
    const originalQuaternion = bone.quaternion.clone();
    bone.rotateX(.38);
    gltf.scene.updateMatrixWorld(true);
    for (const mesh of meshes) mesh.skeleton.update();
    let changed=0;
    for (const mesh of meshes) {
      for (let i=0; i<mesh.geometry.attributes.position.count; i++) {
        const v=mesh.getVertexPosition(i,new Vector3());
        assert(v.toArray().every(Number.isFinite));
        if(v.distanceTo(originals.get(mesh)[i]) > 1e-5) changed++;
      }
    }
    // An isolated glasses variant intentionally has no limb geometry.
    if (filename === 'squishy_base.glb') assert(changed > 0, `${bone.name} does not influence any vertices`);
    poseChecks.push({ bone: bone.name, changedVertices: changed });
    bone.quaternion.copy(originalQuaternion);
    gltf.scene.updateMatrixWorld(true);
    for (const mesh of meshes) mesh.skeleton.update();
  }
  report.assets.push({ filename, bytes: bytes.length, drawPrimitives: meshes.length, triangles, exportedVertices: vertexCount, bones: skeleton.bones.map(b => b.name), morphs, poseChecks, restSize:rest.getSize(new Vector3()).toArray() });
  loaded.push({ gltf, meshes });
}
// The optional glasses must share exact inverse bind matrices with the base.
for(let i=0;i<17;i++) {
  assert.equal(loaded[0].meshes[0].skeleton.bones[i].name, loaded[1].meshes[0].skeleton.bones[i].name);
  const a=loaded[0].meshes[0].skeleton.boneInverses[i].elements;
  const b=loaded[1].meshes[0].skeleton.boneInverses[i].elements;
  assert(a.every((v,j)=>close(v,b[j])));
}
report.passed = true;
await writeFile(new URL('validation_report.json',root), JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:true, assets:report.assets.map(({filename,triangles,bytes,drawPrimitives})=>({filename,triangles,bytes,drawPrimitives}))},null,2));
