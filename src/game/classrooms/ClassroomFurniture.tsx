"use client";

import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { classrooms } from "./classroom.config";

const DESK_MODEL_URL = "/models/kien_an_school_desk_bench.glb";
// Asset bounds: 1.82 m wide, 1.315 m deep and .934 m high.
const DESK_COLLIDER_HALF_EXTENTS: [number, number, number] = [.91, .47, .66];
const deskWood = new THREE.MeshBasicMaterial({ color: "#9b673d", toneMapped: false });
const deskWoodDark = new THREE.MeshBasicMaterial({ color: "#714426", toneMapped: false });
const deskMetal = new THREE.MeshBasicMaterial({ color: "#3f4852", toneMapped: false });
const deskRubber = new THREE.MeshBasicMaterial({ color: "#20242b", toneMapped: false });

export type DeskPlacement = { id: string; classroomId: string; position: [number, number, number]; rotationY: number };
export type SeatPosition = { seatId: string; classroomId: string; deskId: string; position: [number, number, number]; rotationY: number };
type SourceMesh = { key: string; geometry: THREE.BufferGeometry; material: THREE.Material; localMatrix: THREE.Matrix4 };

function buildRightWingDesks(): DeskPlacement[] {
  return classrooms.flatMap((classroom) => {
    const layout = classroom.furniture;
    return Array.from({ length: layout.rows }, (_, row) => Array.from({ length: layout.columns }, (_, column) => ({
      id: `${classroom.id}-desk-${row + 1}-${column + 1}`,
      classroomId: classroom.id,
      position: [layout.frontX - row * layout.rowSpacing, layout.floorY, classroom.hingePosition[2] + (column - (layout.columns - 1) / 2) * layout.columnSpacing] as [number, number, number],
      rotationY: layout.orientationY,
    }))).flat();
  });
}

function buildCenterWingDesks(): DeskPlacement[] {
  // Center-wing boards are on Z=-30.18. The model's +Z-facing seats are
  // rotated toward -Z, with benches parallel to the corridor and a clear aisle.
  const boardCenters = [-12.58, -.28, 8.52, 20.62];
  const floorY = [.2834, 5.1834, 10.0834];
  return floorY.flatMap((y, floorIndex) => boardCenters.flatMap((centerX, roomIndex) => Array.from({ length: 4 }, (_, row) => Array.from({ length: 3 }, (_, column) => ({
    id: `center-f${floorIndex + 1}-r${roomIndex + 1}-desk-${row + 1}-${column + 1}`,
    classroomId: `center-f${floorIndex + 1}-r${roomIndex + 1}`,
    position: [centerX + (column - 1) * 2.25, y, -27.2 + row * 1.35] as [number, number, number],
    rotationY: Math.PI,
  }))).flat()));
}

export const classroomDeskPlacements = [...buildRightWingDesks(), ...buildCenterWingDesks()];
export const classroomSeatPositions: SeatPosition[] = classroomDeskPlacements.flatMap((desk) => {
  const sideways = new THREE.Vector3(.42, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), desk.rotationY);
  const benchOffset = new THREE.Vector3(0, 0, -.34).applyAxisAngle(new THREE.Vector3(0, 1, 0), desk.rotationY);
  return [
    { seatId: `${desk.id}-seat-left`, classroomId: desk.classroomId, deskId: desk.id, position: [desk.position[0] + benchOffset.x - sideways.x, desk.position[1], desk.position[2] + benchOffset.z - sideways.z], rotationY: desk.rotationY },
    { seatId: `${desk.id}-seat-right`, classroomId: desk.classroomId, deskId: desk.id, position: [desk.position[0] + benchOffset.x + sideways.x, desk.position[1], desk.position[2] + benchOffset.z + sideways.z], rotationY: desk.rotationY },
  ];
});

function materialForMesh(name: string) {
  if (/RubberFoot/i.test(name)) return deskRubber;
  if (/Wood|Bench_Backrest|BookShelf/i.test(name)) return /edge|trim|skirt/i.test(name) ? deskWoodDark : deskWood;
  return deskMetal;
}

function sourceMeshes(scene: THREE.Group) {
  scene.updateMatrixWorld(true);
  const meshes: SourceMesh[] = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    // The supplied GLB has default unlit-white materials. Assign shared wood,
    // metal and rubber materials once, before instancing, so it remains visible
    // in the intentionally unlit campus renderer.
    const material = materialForMesh(object.name);
    object.material = material;
    object.castShadow = false; object.receiveShadow = false;
    meshes.push({ key: object.uuid, geometry: object.geometry, material, localMatrix: object.matrixWorld.clone() });
  });
  return meshes;
}

function FurnitureMeshInstances({ source }: { source: SourceMesh }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!mesh.current) return;
    const deskMatrix = new THREE.Matrix4(); const rotation = new THREE.Quaternion(); const position = new THREE.Vector3(); const scale = new THREE.Vector3(1, 1, 1); const matrix = new THREE.Matrix4();
    classroomDeskPlacements.forEach((placement, index) => {
      position.fromArray(placement.position); rotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), placement.rotationY);
      deskMatrix.compose(position, rotation, scale); matrix.multiplyMatrices(deskMatrix, source.localMatrix); mesh.current!.setMatrixAt(index, matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [source]);
  return <instancedMesh ref={mesh} args={[source.geometry, source.material, classroomDeskPlacements.length]} frustumCulled />;
}

/** Shared asset geometry/materials are instanced once across all right and center classrooms. */
export function ClassroomFurniture() {
  const { scene } = useGLTF(DESK_MODEL_URL);
  const meshes = useMemo(() => sourceMeshes(scene), [scene]);
  return <>
    {meshes.map((source) => <FurnitureMeshInstances key={source.key} source={source} />)}
    <RigidBody type="fixed" colliders={false} userData={{ furniture: "desk-bench", deskCount: classroomDeskPlacements.length }}>
      {classroomDeskPlacements.map((placement) => <CuboidCollider key={placement.id} position={[placement.position[0], placement.position[1] + DESK_COLLIDER_HALF_EXTENTS[1], placement.position[2]]} rotation={[0, placement.rotationY, 0]} args={DESK_COLLIDER_HALF_EXTENTS} />)}
    </RigidBody>
  </>;
}

useGLTF.preload(DESK_MODEL_URL);
