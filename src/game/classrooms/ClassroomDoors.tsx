"use client";

import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { classrooms, type ClassroomConfig, type ClassroomDoorId } from "./classroom.config";
import { useGameStore } from "@/game/store/useGameStore";

const UP = new THREE.Vector3(0, 1, 0);
const DOOR_HEIGHT = 2.86;
const DOOR_LENGTH = .68;
const OPEN_ANGLE = Math.PI / 2;

type DoorRuntime = { config: ClassroomConfig; pivot: THREE.Group };

function isDoorSwingOccupied(config: ClassroomConfig) {
  const player = useGameStore.getState().playerPosition;
  const [x, , z] = config.hingePosition;
  // Covers the closed leaf and the quarter-circle swept by it, with a capsule
  // safety margin. Closing is retried as soon as the player leaves this area.
  return Math.abs(player[0] - x) < 1.2 && Math.abs(player[2] - z) < 1.2;
}

/** V51 retains the V35 classroom leaf names, measured runtime hinges and kinematic colliders. */
export function ClassroomDoors({ scene }: { scene: THREE.Group }) {
  const bodies = useRef<Partial<Record<ClassroomDoorId, RapierRigidBody | null>>>({});
  const runtimes = useRef<DoorRuntime[]>([]);
  const angles = useRef<Partial<Record<ClassroomDoorId, number>>>({});

  useEffect(() => {
    scene.updateMatrixWorld(true);
    const attached: Array<{ pivot: THREE.Group; visuals: THREE.Object3D[] }> = [];
    runtimes.current = classrooms.flatMap((config) => {
      const leaf = scene.getObjectByName(config.doorNodeName);
      if (!leaf) {
        console.warn(`Campus V51 classroom leaf missing: ${config.doorNodeName}`);
        return [];
      }
      const pivot = new THREE.Group();
      pivot.name = `${config.doorNodeName}_RuntimeHinge`;
      pivot.position.fromArray(config.hingePosition);
      scene.add(pivot);
      const visuals = [leaf, scene.getObjectByName(config.handleNodeName)].filter((item): item is THREE.Object3D => Boolean(item));
      visuals.forEach((visual) => pivot.attach(visual));
      attached.push({ pivot, visuals });
      angles.current[config.id] = 0;
      return [{ config, pivot }];
    });
    return () => {
      attached.forEach(({ pivot, visuals }) => {
        pivot.rotation.set(0, 0, 0);
        pivot.updateMatrixWorld(true);
        visuals.forEach((visual) => scene.attach(visual));
        scene.remove(pivot);
      });
      runtimes.current = [];
    };
  }, [scene]);

  useFrame((_, delta) => {
    const store = useGameStore.getState();
    const requested = store.classroomDoorCloseRequested;
    if (requested) {
      const classroom = classrooms.find((entry) => entry.id === requested);
      if (classroom && !isDoorSwingOccupied(classroom)) store.closeClassroomDoorWhenClear(requested);
    }
    runtimes.current.forEach(({ config, pivot }) => {
      const open = useGameStore.getState().classroomDoors[config.id];
      const next = THREE.MathUtils.damp(angles.current[config.id] ?? 0, open ? OPEN_ANGLE : 0, 9, delta);
      angles.current[config.id] = next;
      pivot.rotation.y = next;
      const body = bodies.current[config.id];
      if (!body) return;
      const hinge = new THREE.Vector3().fromArray(config.hingePosition);
      const centerOffset = new THREE.Vector3(0, DOOR_HEIGHT / 2, DOOR_LENGTH / 2).applyAxisAngle(UP, next);
      const position = hinge.add(centerOffset);
      const rotation = new THREE.Quaternion().setFromAxisAngle(UP, next);
      body.setNextKinematicTranslation(position);
      body.setNextKinematicRotation(rotation);
    });
  });

  return <>
    {classrooms.map((config) => <RigidBody
      key={config.id}
      ref={(body) => { bodies.current[config.id] = body; }}
      type="kinematicPosition"
      colliders={false}
      position={[config.hingePosition[0], config.hingePosition[1] + DOOR_HEIGHT / 2, config.hingePosition[2] + DOOR_LENGTH / 2]}
    >
      <CuboidCollider args={[.055, DOOR_HEIGHT / 2, DOOR_LENGTH / 2]} />
    </RigidBody>)}
  </>;
}
