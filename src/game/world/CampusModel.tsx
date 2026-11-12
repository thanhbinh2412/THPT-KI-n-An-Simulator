"use client";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { campusConfig, campusGateConfig, type CampusGateId } from "@/game/config/campus.config";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";
import { useGameStore } from "@/game/store/useGameStore";
import { ClassroomDoors } from "@/game/classrooms/ClassroomDoors";
import { CampusCollision } from "./CampusCollision";
import { batchEmbeddedStudentDesks } from "./batchCampusInteriors";
import v58CollisionDelta from "../../../assets/school/kien_an_campus_v58_collision_delta.json";

const UP = new THREE.Vector3(0, 1, 0);
const photoMeshNames = new Set([
  "SCHOOL_BULLETIN_BOARD_CONTENT",
  "CLASS_12A3_PHOTO_FRONT",
  "CLASS_12A3_PHOTO_BACK",
]);
type V58CollisionDelta = {
  removedGeometry: string[];
  v51RemoveColliderNodes: string[];
  v56RemoveColliderPrefixes: string[];
  v57RemoveColliderMeshNames: string[];
  v58RemoveColliderMeshNames: string[];
};

// The V58 export retains some legacy nodes in its hierarchy. They are not part
// of the active campus layout and would otherwise overlap the corrected hall
// or seal the new teachers-to-hall passage.
// Keep the corrected V34 guard sign: it is listed only because it never needs
// a static collider, not because its visual mesh is obsolete.
const legacyV58VisualPrefixes = [
  ...(v58CollisionDelta as V58CollisionDelta).removedGeometry,
  ...(v58CollisionDelta as V58CollisionDelta).v51RemoveColliderNodes,
  ...(v58CollisionDelta as V58CollisionDelta).v56RemoveColliderPrefixes,
  ...(v58CollisionDelta as V58CollisionDelta).v57RemoveColliderMeshNames,
  ...(v58CollisionDelta as V58CollisionDelta).v58RemoveColliderMeshNames,
].filter((name) => name !== "V34_GUARD_GATE_FACING_SIGN");

function hideLegacyV58Geometry(scene: THREE.Group) {
  const changed: Array<{ object: THREE.Object3D; visible: boolean }> = [];
  scene.traverse((object) => {
    if (!legacyV58VisualPrefixes.some((prefix) => object.name.startsWith(prefix))) return;
    changed.push({ object, visible: object.visible });
    object.visible = false;
  });
  return () => changed.forEach(({ object, visible }) => { object.visible = visible; });
}

/**
 * V63 keeps the original photographs as GLB textures. The campus is made
 * unlit for performance, so give only these display surfaces dedicated,
 * untinted materials after that conversion. This preserves their embedded
 * maps while making their front/back faces reliable without touching boards,
 * signs, or any other campus material.
 */
function preparePhotoDisplayMaterials(scene: THREE.Group) {
  const originals: Array<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }> = [];
  const replacements: THREE.Material[] = [];
  const diagnostics: Array<{ name: string; found: boolean; hasMap: boolean; hasImage: boolean }> = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !photoMeshNames.has(object.name)) return;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const updatedMaterials = sourceMaterials.map((source) => {
      const material = source.clone();
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
        material.color.set(0xffffff);
        material.side = THREE.DoubleSide;
        material.opacity = 1;
        material.transparent = false;
        material.depthWrite = true;
        material.depthTest = true;
        material.needsUpdate = true;
      }
      replacements.push(material);
      return material;
    });
    originals.push({ mesh: object, material: object.material });
    object.material = Array.isArray(object.material) ? updatedMaterials : updatedMaterials[0];
    const firstMaterial = updatedMaterials[0] as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
    diagnostics.push({ name: object.name, found: true, hasMap: Boolean(firstMaterial.map), hasImage: Boolean(firstMaterial.map?.image) });
  });
  if (process.env.NODE_ENV !== "production") {
    const reported = new Set(diagnostics.map(({ name }) => name));
    photoMeshNames.forEach((name) => {
      if (!reported.has(name)) diagnostics.push({ name, found: false, hasMap: false, hasImage: false });
    });
    console.info("[Campus V63] photo display materials", diagnostics);
  }
  return () => {
    originals.forEach(({ mesh, material }) => { mesh.material = material; });
    // These targeted clones are not owned by the GLTF cache.
    replacements.forEach((material) => material.dispose());
  };
}

type GateSpec = {
  id: CampusGateId; hinges: string[]; pivots: THREE.Vector3[]; offsets: THREE.Vector3[];
  closed: number[]; open: number[]; colliders: Array<[number, number, number]>; colliderCenterY: number[];
};
const gateSpecs: GateSpec[] = [
  // Bounds measured from the campus gate subtrees, not approximated from the visible opening.
  { id: "main", hinges: ["GateLeaf_Left_Hinge", "GateLeaf_Right_Hinge"], pivots: [new THREE.Vector3(-4.02, 0, 37.45), new THREE.Vector3(4.08, 0, 37.6)], offsets: [new THREE.Vector3(0, 0, -1.974), new THREE.Vector3(-2.034, 0, 0)], closed: [-Math.PI / 2, 0], open: [0, -1.4], colliders: [[.08, 1.59, 2.04], [2.05, 1.65, .08]], colliderCenterY: [1.64, 1.7] },
  { id: "left", hinges: ["SideGate_LEFT_Hinge"], pivots: [new THREE.Vector3(-8.93, 0, 37.5)], offsets: [new THREE.Vector3(1.555, 0, 0)], closed: [0], open: [1.45], colliders: [[1.565, 1.07, .15]], colliderCenterY: [1.11] },
  { id: "right", hinges: ["SideGate_RIGHT_Hinge"], pivots: [new THREE.Vector3(8.93, 0, 37.5)], offsets: [new THREE.Vector3(-1.555, 0, 0)], closed: [0], open: [-1.45], colliders: [[1.565, 1.07, .15]], colliderCenterY: [1.11] },
];

function updateBody(body: RapierRigidBody | null, pivot: THREE.Vector3, offset: THREE.Vector3, angle: number, centerY: number) {
  if (!body) return; const rotation = new THREE.Quaternion().setFromAxisAngle(UP, angle); const position = offset.clone().applyQuaternion(rotation).add(pivot);
  body.setNextKinematicTranslation({ x: position.x, y: centerY, z: position.z }); body.setNextKinematicRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
}

function AnimatedGate({ spec, scene }: { spec: GateSpec; scene: THREE.Group }) {
  const bodies = useRef<Array<RapierRigidBody | null>>([]); const angles = useRef([...spec.closed]); const hinges = useMemo(() => spec.hinges.map((name) => scene.getObjectByName(name)), [scene, spec]);
  useEffect(() => {
    const open = useGameStore.getState().campusGates[spec.id];
    hinges.forEach((hinge, index) => {
      const angle = open ? spec.open[index] : spec.closed[index];
      angles.current[index] = angle;
      if (hinge) hinge.rotation.y = angle; else console.warn(`Campus V35 hinge missing: ${spec.hinges[index]}`);
    });
  }, [hinges, spec]);
  useFrame((_, delta) => {
    const store = useGameStore.getState(); const open = store.campusGates[spec.id]; const lambda = 6 / campusGateConfig[spec.id].duration;
    const player = store.playerPosition; const pivot = spec.pivots[0]; const occupied = Math.abs(player[0] - pivot.x) < (spec.id === "main" ? 5 : 3) && Math.abs(player[2] - pivot.z) < 3.6;
    if (store.campusGateCloseRequested === spec.id && !occupied) store.closeCampusGateWhenClear(spec.id);
    spec.pivots.forEach((pivotPoint, index) => { angles.current[index] = THREE.MathUtils.damp(angles.current[index], open ? spec.open[index] : spec.closed[index], lambda, delta); if (hinges[index]) hinges[index]!.rotation.y = angles.current[index]; updateBody(bodies.current[index], pivotPoint, spec.offsets[index], angles.current[index], spec.colliderCenterY[index]); });
  });
  return <>{spec.pivots.map((_, index) => <RigidBody key={index} ref={(body) => { bodies.current[index] = body; }} type="kinematicPosition" colliders={false}><CuboidCollider args={spec.colliders[index]} /></RigidBody>)}</>;
}

/** Primary V63 visual scene. Embedded photo displays retain their original GLB textures. */
export function CampusModel({ collisionsEnabled = true }: { collisionsEnabled?: boolean }) {
  const { scene, animations } = useGLTF(campusConfig.modelUrl);
  const trafficMixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  useLayoutEffect(() => {
    const restoreLegacyGeometry = hideLegacyV58Geometry(scene);
    const restoreDeskMeshes = batchEmbeddedStudentDesks(scene);
    const restoreMaterials = applyUnlitMaterials(scene);
    const restorePhotoMaterials = preparePhotoDisplayMaterials(scene);
    return () => { restorePhotoMaterials(); restoreMaterials(); restoreDeskMeshes(); restoreLegacyGeometry(); };
  }, [scene]);
  useEffect(() => {
    const traffic = animations.find((clip) => clip.name === "TrafficLoop_V23");
    // V60 has no campus animation clips; keep this optional so the loader does
    // not report a false error while character/NPC animation remains unchanged.
    if (!traffic) return;
    const action = trafficMixer.clipAction(traffic); action.setLoop(THREE.LoopRepeat, Infinity); action.play();
    return () => { action.stop(); trafficMixer.stopAllAction(); trafficMixer.uncacheRoot(scene); };
  }, [animations, scene, trafficMixer]);
  useFrame((_, delta) => trafficMixer.update(delta));
  return <group position={campusConfig.position} rotation={campusConfig.rotation} scale={campusConfig.scale}><primitive object={scene} />{collisionsEnabled && <CampusCollision scene={scene} />}<ClassroomDoors scene={scene} />{gateSpecs.map((spec) => <AnimatedGate key={spec.id} spec={spec} scene={scene} />)}</group>;
}

useGLTF.preload(campusConfig.modelUrl);
