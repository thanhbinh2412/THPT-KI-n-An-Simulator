"use client";

import { CuboidCollider, RigidBody, TrimeshCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store/useGameStore";
import v58CollisionDelta from "../../../assets/school/kien_an_campus_v58_collision_delta.json";
import v72CollisionDelta from "../../../assets/school/kien_an_campus_v72_collision_delta.json";
import v72SceneConfig from "../../../assets/school/kien_an_campus_v72_scene_config.json";

type ColliderKind = "blocking" | "walkable";
type ColliderSpec = { id: string; position: [number, number, number]; rotation: [number, number, number]; halfExtents: [number, number, number]; kind: ColliderKind };
type StairStep = { bounds: THREE.Box3 };
type TrimeshSpec = { id: string; vertices: Float32Array; indices: Uint32Array; debug: ColliderSpec };
type FixedCuboid = { node: string; center: number[]; size: number[] };
type V58CollisionDelta = {
  removedGeometry: string[];
  v51RemoveColliderNodes: string[];
  v53RemoveColliderMeshPrefixes: string[];
  v53RemoveColliderMeshNames: string[];
  v54RemoveLegacyColliderPrefixes: string[];
  v54RemoveLegacyColliderNames: string[];
  v55RemoveColliderPrefixes: string[];
  v56RemoveColliderPrefixes: string[];
  v57RemoveColliderMeshNames: string[];
  v58RemoveColliderMeshNames: string[];
  v51AddFixedCuboids: FixedCuboid[];
  v52AddFixedCuboids: FixedCuboid[];
  v53AddFixedCuboids: FixedCuboid[];
  v55AddFixedCuboids: FixedCuboid[];
  v56AddFixedCuboids: FixedCuboid[];
  v57AddFixedCuboids: FixedCuboid[];
  v58AddFixedCuboids: FixedCuboid[];
};
type V72CollisionDelta = { removedColliders: string[] };
type V72SceneConfig = { removedMeshes: string[]; v71Changes?: { redPavingMeshes: string[]; removedOutdatedVisualMeshes: string[] } };

const collisionDelta = v58CollisionDelta as V58CollisionDelta;
const v72Delta = v72CollisionDelta as V72CollisionDelta;
const v72Scene = v72SceneConfig as V72SceneConfig;
const v71VisualOnlyPrefixes = [
  ...(v72Scene.v71Changes?.redPavingMeshes ?? []),
  "V71_MAIN_GATE_CONCRETE_ONLY",
  "V71_SIDEGATE_LEFT_",
  "V71_SIDEGATE_RIGHT_",
];
// V58 is incremental from V51–V57. Filter every retired node before deriving
// bounds: the V53 end seal and the two old office meshes would otherwise leave
// an invisible wall across the teachers-to-covered-corridor passage.
const removedMeshPrefixes = [
  ...collisionDelta.removedGeometry,
  ...collisionDelta.v51RemoveColliderNodes,
  ...collisionDelta.v53RemoveColliderMeshPrefixes,
  ...collisionDelta.v53RemoveColliderMeshNames,
  ...collisionDelta.v54RemoveLegacyColliderPrefixes,
  ...collisionDelta.v54RemoveLegacyColliderNames,
  ...collisionDelta.v55RemoveColliderPrefixes,
  ...collisionDelta.v56RemoveColliderPrefixes,
  ...collisionDelta.v57RemoveColliderMeshNames,
  ...collisionDelta.v58RemoveColliderMeshNames,
  ...v72Scene.removedMeshes,
  ...(v72Scene.v71Changes?.removedOutdatedVisualMeshes ?? []),
  ...v71VisualOnlyPrefixes,
  ...v72Delta.removedColliders,
  "V48_ASSEMBLY_HALL_BACK",
];
const walkableManifestNode = /(?:_FLOOR|_STAGE(?:$|_)|_THRESHOLD|STAGE_STEP)/;
const stairManifestNode = /(?:STAIR|LANDING)/i;
const retiredExplicitColliderNames = new Set([
  ...collisionDelta.v57RemoveColliderMeshNames,
  ...collisionDelta.v58RemoveColliderMeshNames,
  ...v72Scene.removedMeshes,
  ...(v72Scene.v71Changes?.removedOutdatedVisualMeshes ?? []),
  ...v71VisualOnlyPrefixes,
  ...v72Delta.removedColliders,
]);
// Keep each accumulated manifest delta. The V58 additions deliberately use
// split solids around the 2.8-unit opening; there is no whole-office or
// whole-passage collider that could close the route to the assembly hall.
const explicitColliders: Array<{ id: string; position: number[]; size: number[]; kind: ColliderKind }> = [
  ...collisionDelta.v51AddFixedCuboids,
  ...collisionDelta.v52AddFixedCuboids,
  ...collisionDelta.v53AddFixedCuboids,
  ...collisionDelta.v55AddFixedCuboids,
  ...collisionDelta.v56AddFixedCuboids,
  ...collisionDelta.v57AddFixedCuboids,
  ...collisionDelta.v58AddFixedCuboids,
].filter(({ node }) => !retiredExplicitColliderNames.has(node) && !stairManifestNode.test(node))
  .map(({ node, center, size }) => ({
    id: node,
    position: center,
    size,
    kind: walkableManifestNode.test(node) ? "walkable" : "blocking",
  }));
const explicitMeshNames = new Set(explicitColliders.map((collider) => collider.id));
const structuralMesh = /(?:WALL|COLUMN|FLOOR|GROUND|STAIR|STEP|LANDING|RAIL|PORCH|BRIDGE|STAGE|CURB|SIDEWALK|WINDOW|_BAR_)/i;
const dynamicMesh = /(?:GateLeaf|SideGate|V35_RIGHT_DOOR_(?:LEAF|HANDLE))/i;
const minimumThickness = .08;
const studentDeskPart = /^(V43_(?:RIGHT|CENTER)_F\d_R\d_STUDENT_DESK_\d+)_/;
const teacherDeskPart = /^(V43_(?:RIGHT|CENTER)_F\d_R\d_TEACHER_DESK)_(?!CHAIR)/;
const windowPart = /(?:WINDOW|_BAR_)/i;
// V47's embedded pole photograph, backing and clamps are intentionally visual
// only. Keeping them out of generated collision prevents a floating blocker
// beside the public road while preserving the existing pole/environment body.
const decorativePolePhotoPart = /^(?:V47_ROAD_POLE_2_USER_PHOTO|V47_POLE_PHOTO_(?:BACKING|CLAMP_TOP|CLAMP_BOTTOM))$/;
const stairStepPart = /^(.*(?:STAIR|STAIRS).*?)_STEP_?\d+(?:_|$)/i;
const v64StairMesh = /^V64_STAIR_/;

function boundsCollider(id: string, bounds: THREE.Box3, kind: ColliderKind = "blocking"): ColliderSpec | null {
  if (bounds.isEmpty()) return null;
  const centre = new THREE.Vector3(); const size = new THREE.Vector3();
  bounds.getCenter(centre); bounds.getSize(size);
  return {
    id,
    position: [centre.x, centre.y, centre.z],
    rotation: [0, 0, 0],
    halfExtents: [Math.max(minimumThickness / 2, size.x / 2), Math.max(minimumThickness / 2, size.y / 2), Math.max(minimumThickness / 2, size.z / 2)],
    kind,
  };
}

function windowGroupId(name: string) {
  // A player capsule cannot pass through a window opening, so one shallow box
  // per iron-window assembly is equivalent to its many decorative bars.
  return name.replace(/(?:_BAR)?_[HV]_?\d+$/i, "");
}

function stairRampCollider(id: string, steps: StairStep[]): ColliderSpec | null {
  if (steps.length < 2) return null;
  const xSpan = Math.max(...steps.map(({ bounds }) => bounds.max.x)) - Math.min(...steps.map(({ bounds }) => bounds.min.x));
  const zSpan = Math.max(...steps.map(({ bounds }) => bounds.max.z)) - Math.min(...steps.map(({ bounds }) => bounds.min.z));
  const alongX = xSpan >= zSpan;
  const otherSpan = alongX ? zSpan : xSpan;
  const ordered = [...steps].sort((left, right) => {
    const leftCenter = alongX ? left.bounds.getCenter(new THREE.Vector3()).x : left.bounds.getCenter(new THREE.Vector3()).z;
    const rightCenter = alongX ? right.bounds.getCenter(new THREE.Vector3()).x : right.bounds.getCenter(new THREE.Vector3()).z;
    return leftCenter - rightCenter;
  });
  const first = ordered[0].bounds; const last = ordered[ordered.length - 1].bounds;
  const horizontalRun = alongX ? xSpan : zSpan;
  const firstTop = first.max.y; const lastTop = last.max.y;
  // Start at the lower landing/base of the first solid tread, not at its top.
  // This removes the vertical lip that stopped the character before the ramp.
  const ascending = lastTop >= firstTop;
  const startY = ascending ? first.min.y : first.max.y;
  const endY = ascending ? last.max.y : last.min.y;
  const rise = endY - startY;
  if (horizontalRun < .2 || Math.abs(rise) < .02) return null;
  const angle = Math.atan2(rise, horizontalRun);
  const thickness = .12;
  const x = (Math.min(...steps.map(({ bounds }) => bounds.min.x)) + Math.max(...steps.map(({ bounds }) => bounds.max.x))) / 2;
  const z = (Math.min(...steps.map(({ bounds }) => bounds.min.z)) + Math.max(...steps.map(({ bounds }) => bounds.max.z))) / 2;
  const y = (startY + endY) / 2 - thickness * Math.cos(angle) / 2;
  const slopedRun = Math.hypot(horizontalRun, rise);
  return alongX
    ? { id: `ramp:${id}`, position: [x, y, z], rotation: [0, 0, angle], halfExtents: [slopedRun / 2, thickness / 2, Math.max(otherSpan / 2, minimumThickness / 2)], kind: "walkable" }
    : { id: `ramp:${id}`, position: [x, y, z], rotation: [-angle, 0, 0], halfExtents: [Math.max(otherSpan / 2, minimumThickness / 2), thickness / 2, slopedRun / 2], kind: "walkable" };
}

function trimeshFromWorldGeometry(mesh: THREE.Mesh): TrimeshSpec | null {
  const source = mesh.geometry;
  const position = source.getAttribute("position");
  if (!position || position.count < 3) return null;
  const vertices = new Float32Array(position.count * 3);
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).applyMatrix4(mesh.matrixWorld);
    vertices[index * 3] = point.x; vertices[index * 3 + 1] = point.y; vertices[index * 3 + 2] = point.z;
  }
  const sourceIndices = source.getIndex();
  const indices = sourceIndices
    ? Uint32Array.from({ length: sourceIndices.count }, (_, index) => sourceIndices.getX(index))
    : Uint32Array.from({ length: position.count }, (_, index) => index);
  const bounds = new THREE.Box3().setFromObject(mesh);
  const debug = boundsCollider(`trimesh:${mesh.name}`, bounds, "walkable");
  return debug ? { id: mesh.uuid, vertices, indices, debug } : null;
}

function buildColliders(scene: THREE.Group) {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3(); const centre = new THREE.Vector3(); const size = new THREE.Vector3();
  const position = new THREE.Vector3(); const quaternion = new THREE.Quaternion(); const scale = new THREE.Vector3(); const rotation = new THREE.Euler();
  const colliders: ColliderSpec[] = [];
  const furnitureBounds = new Map<string, THREE.Box3>();
  const windowBounds = new Map<string, THREE.Box3>();
  const stairSteps = new Map<string, StairStep[]>();
  const stairTrimeshes: TrimeshSpec[] = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (decorativePolePhotoPart.test(object.name)) return;
    // The V58 file retains obsolete nodes. Filter before collecting
    // window groups too, otherwise those old window bars would still create an
    // invisible collider even though their meshes are hidden from the scene.
    if (removedMeshPrefixes.some((prefix) => object.name.startsWith(prefix)) || explicitMeshNames.has(object.name)) return;
    // V72's active multi-storey stairwells are V64_STAIR meshes. Their bounds
    // span every flight and landing, so a CuboidCollider turns the whole shaft
    // into a solid wall. Preserve the authored triangles instead.
    if (v64StairMesh.test(object.name)) {
      const trimesh = trimeshFromWorldGeometry(object);
      if (trimesh) stairTrimeshes.push(trimesh);
      return;
    }
    const stairStep = object.name.match(stairStepPart);
    if (stairStep) {
      const steps = stairSteps.get(stairStep[1]) ?? [];
      steps.push({ bounds: new THREE.Box3().expandByObject(object) });
      stairSteps.set(stairStep[1], steps);
      return;
    }
    const furnitureMatch = object.name.match(studentDeskPart) ?? object.name.match(teacherDeskPart);
    if (furnitureMatch) {
      const bounds = furnitureBounds.get(furnitureMatch[1]) ?? new THREE.Box3();
      bounds.expandByObject(object);
      furnitureBounds.set(furnitureMatch[1], bounds);
    }
    if (windowPart.test(object.name) && !/WINDOW_GLASS/i.test(object.name)) {
      const id = windowGroupId(object.name);
      const bounds = windowBounds.get(id) ?? new THREE.Box3();
      bounds.expandByObject(object);
      windowBounds.set(id, bounds);
      return;
    }
    if (!structuralMesh.test(object.name) || dynamicMesh.test(object.name) || /WINDOW_GLASS/i.test(object.name)) return;
    const geometry = object.geometry;
    if (!geometry.attributes.position) return;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox || geometry.boundingBox.isEmpty()) return;
    box.copy(geometry.boundingBox); box.getCenter(centre); box.getSize(size);
    object.matrixWorld.decompose(position, quaternion, scale);
    centre.applyMatrix4(object.matrixWorld);
    rotation.setFromQuaternion(quaternion);
    const halfExtents: [number, number, number] = [
      Math.max(minimumThickness / 2, Math.abs(size.x * scale.x) / 2),
      Math.max(minimumThickness / 2, Math.abs(size.y * scale.y) / 2),
      Math.max(minimumThickness / 2, Math.abs(size.z * scale.z) / 2),
    ];
    colliders.push({ id: object.uuid, position: [centre.x, centre.y, centre.z], rotation: [rotation.x, rotation.y, rotation.z], halfExtents, kind: /(?:FLOOR|GROUND|STAIR|STEP|LANDING|BRIDGE|STAGE)/i.test(object.name) ? "walkable" : "blocking" });
  });
  explicitColliders.forEach((collider) => {
    colliders.push({ id: collider.id, position: [...collider.position] as [number, number, number], rotation: [0, 0, 0], halfExtents: collider.size.map((value) => value / 2) as [number, number, number], kind: collider.kind });
  });
  // A stair flight made of individual solid treads has vertical risers that can
  // exceed the character controller's safe autostep limit. Keep the visible
  // treads, but use one thin slope for traversal; rails and stairwell walls
  // remain ordinary blocking colliders.
  stairSteps.forEach((steps, id) => {
    const ramp = stairRampCollider(id, steps);
    if (ramp) { colliders.push(ramp); return; }
    steps.forEach(({ bounds }, index) => {
      const fallback = boundsCollider(`${id}:step:${index}`, bounds, "walkable");
      if (fallback) colliders.push(fallback);
    });
  });
  furnitureBounds.forEach((bounds, id) => {
    const collider = boundsCollider(id, bounds);
    if (collider) colliders.push(collider);
  });
  windowBounds.forEach((bounds, id) => {
    const collider = boundsCollider(`window:${id}`, bounds);
    if (collider) colliders.push(collider);
  });
  return { colliders, stairTrimeshes };
}

function DebugCollider({ collider }: { collider: ColliderSpec }) {
  const enabled = useGameStore((state) => state.physicsDebug);
  if (!enabled) return null;
  return <mesh position={collider.position} rotation={collider.rotation}><boxGeometry args={collider.halfExtents.map((value) => value * 2) as [number, number, number]} /><meshBasicMaterial color={collider.kind === "walkable" ? "#20d9ff" : "#e879f9"} wireframe transparent opacity={.3} depthTest={false} /></mesh>;
}

/**
 * V72 is the authoritative visual geometry. V72 changes only gate materials
 * and UVs, so it intentionally reuses the validated V71 collision manifest.
 * Its embedded platforms and steps,
 * desks, walls and rails derive their existing static collision directly; each
 * embedded desk set and teacher desk gets one simple
 * bounding-box collider. Dynamic gates and classroom doors stay kinematic.
 */
export function CampusCollision({ scene }: { scene: THREE.Group }) {
  const { colliders, stairTrimeshes } = useMemo(() => buildColliders(scene), [scene]);
  return <RigidBody type="fixed" colliders={false} userData={{ colliderCount: colliders.length + stairTrimeshes.length, campusVersion: "V72" }}>
    {colliders.map((collider) => <group key={collider.id}>
      <CuboidCollider position={collider.position} rotation={collider.rotation} args={collider.halfExtents} />
      <DebugCollider collider={collider} />
    </group>)}
    {stairTrimeshes.map((stair) => <group key={stair.id}>
      <TrimeshCollider args={[stair.vertices, stair.indices]} />
      <DebugCollider collider={stair.debug} />
    </group>)}
  </RigidBody>;
}
