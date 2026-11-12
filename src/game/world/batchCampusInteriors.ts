import * as THREE from "three";

const studentDeskPart = /^(V43_(?:RIGHT|CENTER)_F\d_R\d)_STUDENT_DESK_\d+_/;

type SourceMesh = { object: THREE.Mesh; parent: THREE.Object3D; matrix: THREE.Matrix4 };
type Batch = {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  sources: SourceMesh[];
};

const runtimeMesh = /(?:GATE|DOOR|HINGE|LED|PHOTO|BULLETIN|DECAL)/i;
const protectedMaterials = /^(?:KA75_DECAL_|KA76_)/;

function hasRuntimeAncestor(object: THREE.Object3D, scene: THREE.Group) {
  for (let current: THREE.Object3D | null = object; current && current !== scene; current = current.parent) {
    if (runtimeMesh.test(current.name) || current.userData.collider === "none") return true;
  }
  return false;
}

function materialKey(material: THREE.Material | THREE.Material[]) {
  return Array.isArray(material) ? material.map((item) => item.uuid).join(":") : material.uuid;
}

/**
 * V43 stores every desk component as a separate mesh node. Batch the 192
 * already-embedded desk sets by wing/floor and shared geometry/material, while
 * retaining the source transforms and leaving the GLB asset itself untouched.
 */
export function batchEmbeddedStudentDesks(scene: THREE.Group) {
  scene.updateMatrixWorld(true);
  const sceneInverse = scene.matrixWorld.clone().invert();
  const batches = new Map<string, Batch>();

  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.parent) return;
    const match = object.name.match(studentDeskPart);
    if (!match) return;
    const key = `${match[1]}:${object.geometry.uuid}:${materialKey(object.material)}`;
    const batch: Batch = batches.get(key) ?? {
      key,
      geometry: object.geometry,
      material: object.material,
      sources: [],
    };
    batch.sources.push({
      object,
      parent: object.parent,
      matrix: sceneInverse.clone().multiply(object.matrixWorld),
    });
    batches.set(key, batch);
  });

  if (!batches.size) return () => undefined;

  const root = new THREE.Group();
  root.name = "V43_StudentDesk_InstancedBatches";
  const sources: SourceMesh[] = [];
  scene.add(root);

  batches.forEach((batch) => {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.sources.length);
    mesh.name = `V43_StudentDesk_Batch_${batch.key}`;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    batch.sources.forEach((source, index) => mesh.setMatrixAt(index, source.matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    root.add(mesh);
    sources.push(...batch.sources);
  });

  sources.forEach(({ object, parent }) => parent.remove(object));
  return () => {
    scene.remove(root);
    sources.forEach(({ object, parent }) => parent.add(object));
  };
}

/**
 * The V78 campus contains thousands of identical static primitives (railings,
 * desks, window bars and trim). Instance only repeated single-material meshes,
 * split into 30m cells for frustum culling. Runtime gates, doors, LED/photo
 * panels and decals intentionally remain independent scene nodes.
 */
export function batchStaticCampusMeshes(scene: THREE.Group) {
  scene.updateMatrixWorld(true);
  const inverseScene = scene.matrixWorld.clone().invert();
  const batches = new Map<string, Batch>();
  const cellSize = 30;
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.parent || Array.isArray(object.material) || (object as THREE.Mesh & { isSkinnedMesh?: boolean }).isSkinnedMesh) return;
    if (runtimeMesh.test(object.name) || protectedMaterials.test(object.material.name) || hasRuntimeAncestor(object, scene)) return;
    const worldPosition = new THREE.Vector3().setFromMatrixPosition(object.matrixWorld);
    const cellX = Math.floor(worldPosition.x / cellSize); const cellZ = Math.floor(worldPosition.z / cellSize);
    const key = `${object.geometry.uuid}:${object.material.uuid}:${cellX}:${cellZ}`;
    const batch: Batch = batches.get(key) ?? { key, geometry: object.geometry, material: object.material, sources: [] };
    batch.sources.push({ object, parent: object.parent, matrix: inverseScene.clone().multiply(object.matrixWorld) });
    batches.set(key, batch);
  });

  const eligible = [...batches.values()].filter((batch) => batch.sources.length >= 2);
  if (!eligible.length) return () => undefined;
  const root = new THREE.Group(); root.name = "V78_Static_Instanced_Meshes"; scene.add(root);
  const sources: SourceMesh[] = [];
  eligible.forEach((batch) => {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material as THREE.Material, batch.sources.length);
    mesh.name = `V78_Static_Instance_${batch.key}`;
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.castShadow = false; mesh.receiveShadow = false;
    batch.sources.forEach((source, index) => mesh.setMatrixAt(index, source.matrix));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    root.add(mesh); sources.push(...batch.sources);
  });
  sources.forEach(({ object, parent }) => parent.remove(object));
  return () => { scene.remove(root); sources.forEach(({ object, parent }) => parent.add(object)); };
}
