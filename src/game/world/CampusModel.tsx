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
import v51CollisionDelta from "../../../assets/school/kien_an_campus_v51_collision_delta.json";

const UP = new THREE.Vector3(0, 1, 0);
type V51CollisionDelta = { removedGeometry: string[]; v51RemoveColliderNodes: string[] };

// The V51 export retains legacy V48–V50 nodes in its hierarchy. They are not
// part of the V51 campus layout and would otherwise overlap the enlarged hall.
// Keep the corrected V34 guard sign: it is listed only because it never needs
// a static collider, not because its visual mesh is obsolete.
const legacyV51VisualPrefixes = [
  ...(v51CollisionDelta as V51CollisionDelta).removedGeometry,
  ...(v51CollisionDelta as V51CollisionDelta).v51RemoveColliderNodes,
].filter((name) => name !== "V34_GUARD_GATE_FACING_SIGN");

function hideLegacyV51Geometry(scene: THREE.Group) {
  const changed: Array<{ object: THREE.Object3D; visible: boolean }> = [];
  scene.traverse((object) => {
    if (!legacyV51VisualPrefixes.some((prefix) => object.name.startsWith(prefix))) return;
    changed.push({ object, visible: object.visible });
    object.visible = false;
  });
  return () => changed.forEach(({ object, visible }) => { object.visible = visible; });
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

/** Primary V51 visual scene. Its expanded hall, covered corridor, corrected guard sign and pole photo are embedded in the cached GLB. */
export function CampusModel() {
  const { scene, animations } = useGLTF(campusConfig.modelUrl);
  const trafficMixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  useLayoutEffect(() => {
    const restoreLegacyGeometry = hideLegacyV51Geometry(scene);
    const restoreDeskMeshes = batchEmbeddedStudentDesks(scene);
    const restoreMaterials = applyUnlitMaterials(scene);
    return () => { restoreMaterials(); restoreDeskMeshes(); restoreLegacyGeometry(); };
  }, [scene]);
  useEffect(() => {
    const traffic = animations.find((clip) => clip.name === "TrafficLoop_V23");
    if (!traffic) { console.warn("Campus V51 traffic clip missing: TrafficLoop_V23"); return; }
    const action = trafficMixer.clipAction(traffic); action.setLoop(THREE.LoopRepeat, Infinity); action.play();
    return () => { action.stop(); trafficMixer.stopAllAction(); trafficMixer.uncacheRoot(scene); };
  }, [animations, scene, trafficMixer]);
  useFrame((_, delta) => trafficMixer.update(delta));
  return <group position={campusConfig.position} rotation={campusConfig.rotation} scale={campusConfig.scale}><primitive object={scene} /><CampusCollision scene={scene} /><ClassroomDoors scene={scene} />{gateSpecs.map((spec) => <AnimatedGate key={spec.id} spec={spec} scene={scene} />)}</group>;
}

useGLTF.preload(campusConfig.modelUrl);
