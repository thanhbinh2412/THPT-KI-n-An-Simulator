"use client";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { campusDoors, type CampusDoor, type CampusLeaf } from "@/game/config/campusGameplay";
import { useGameStore } from "@/game/store/useGameStore";

const up = new THREE.Vector3(0, 1, 0);
function Leaf({ door, leaf, scene, collisionsEnabled }: { door: CampusDoor; leaf: CampusLeaf; scene: THREE.Group; collisionsEnabled: boolean }) {
  const body = useRef<RapierRigidBody>(null);
  const hinge = useMemo(() => scene.getObjectByName(leaf.node), [scene, leaf.node]);
  const initial = useGameStore.getState();
  const open = door.gate ? initial.campusGates[door.gate] : initial.classroomDoors[door.id];
  const angle = useRef(open ? leaf.openAngle : 0);
  const rotation = useMemo(() => new THREE.Quaternion(), []);
  const original = useMemo(() => hinge?.quaternion.clone(), [hinge]);
  useEffect(() => {
    if (!hinge) console.warn(`Missing V02 door hinge: ${leaf.node}`);
    return () => { if (hinge && original) hinge.quaternion.copy(original); };
  }, [hinge, original, leaf.node]);
  useFrame((_, dt) => {
    const store = useGameStore.getState();
    const isOpen = door.gate ? store.campusGates[door.gate] : store.classroomDoors[door.id];
    angle.current = THREE.MathUtils.damp(angle.current, isOpen ? leaf.openAngle : 0, 7, Math.min(dt, .05));
    rotation.setFromAxisAngle(up, angle.current);
    if (hinge) hinge.quaternion.copy(rotation);
    body.current?.setNextKinematicRotation(rotation);
  });
  if (!collisionsEnabled) return null;
  return <RigidBody ref={body} type="kinematicPosition" colliders={false} position={leaf.pivot}
    rotation={[0, angle.current, 0]} userData={{ doorId: door.id }}>
    <CuboidCollider args={leaf.halfExtents} position={leaf.center} />
  </RigidBody>;
}

export function CampusDoors({ scene, collisionsEnabled }: { scene: THREE.Group; collisionsEnabled: boolean }) {
  useFrame(() => {
    const store = useGameStore.getState();
    for (const door of campusDoors) {
      const requested = door.gate ? store.campusGateCloseRequested === door.gate : store.classroomDoorCloseRequested === door.id;
      if (!requested) continue;
      const occupied = door.leaves.some((leaf) => {
        const radius = Math.hypot(leaf.center[0], leaf.center[2]) + Math.hypot(leaf.halfExtents[0], leaf.halfExtents[2]) + .55;
        return Math.abs(store.playerPosition[1] - (leaf.pivot[1] + leaf.center[1])) < leaf.halfExtents[1] + 1 &&
          Math.hypot(store.playerPosition[0] - leaf.pivot[0], store.playerPosition[2] - leaf.pivot[2]) < radius;
      });
      if (!occupied) {
        if (door.gate) store.closeCampusGateWhenClear(door.gate);
        else store.closeClassroomDoorWhenClear(door.id);
      }
    }
  });
  return <>{campusDoors.flatMap((door) => door.leaves.map((leaf) => <Leaf key={leaf.node} door={door} leaf={leaf} scene={scene} collisionsEnabled={collisionsEnabled} />))}</>;
}
