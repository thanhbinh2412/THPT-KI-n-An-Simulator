import * as THREE from "three";

const studentDeskPart = /^(V43_(?:RIGHT|CENTER)_F\d_R\d)_STUDENT_DESK_\d+_/;

type SourceMesh = { object: THREE.Mesh; parent: THREE.Object3D; matrix: THREE.Matrix4 };
type Batch = {
  key: string;
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  sources: SourceMesh[];
};

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
