"use client";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store/useGameStore";

const MODEL_URL = "/models/school/kien_an_school_gate_interactive.glb";
const GATE_ORIGIN = new THREE.Vector3(0, 0, 16);
const LEFT_HINGE = new THREE.Vector3(-4.02, 0, -.05);
const RIGHT_HINGE = new THREE.Vector3(4.08, 0, .1);
const UP = new THREE.Vector3(0, 1, 0);

function setLeafBody(body: RapierRigidBody | null, hinge: THREE.Vector3, centreOffset: THREE.Vector3, angle: number) {
  if (!body) return;
  const q = new THREE.Quaternion().setFromAxisAngle(UP, angle);
  const centre = centreOffset.clone().applyQuaternion(q).add(hinge).add(GATE_ORIGIN);
  body.setNextKinematicTranslation({ x: centre.x, y: 1.62, z: centre.z });
  body.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
}

/** GLB-driven visuals with kinematic leaf colliders derived from the same interpolated hinge angles. */
export function InteractiveGate() {
  const { scene } = useGLTF(MODEL_URL); const gateOpen = useGameStore((s) => s.gateOpen); const closeRequested = useGameStore((s) => s.gateCloseRequested);
  const clone = useMemo(() => { const next = scene.clone(true); next.traverse((object) => { object.castShadow = true; object.receiveShadow = true; }); return next; }, [scene]);
  const hinges = useMemo(() => ({ left: clone.getObjectByName("GateLeaf_Left_Hinge"), right: clone.getObjectByName("GateLeaf_Right_Hinge") }), [clone]);
  const leftBody = useRef<RapierRigidBody | null>(null); const rightBody = useRef<RapierRigidBody | null>(null);
  const leftAngle = useRef(-Math.PI / 2); const rightAngle = useRef(0);
  useEffect(() => {
    if (!hinges.left || !hinges.right) console.warn("Interactive gate hinge nodes missing in kien_an_school_gate_interactive.glb.");
    // The source GLB begins asymmetrically posed; explicitly establish the gameplay pose.
    if (hinges.left) hinges.left.rotation.y = gateOpen ? 0 : -Math.PI / 2;
    if (hinges.right) hinges.right.rotation.y = gateOpen ? -1.4 : 0;
    leftAngle.current = gateOpen ? 0 : -Math.PI / 2; rightAngle.current = gateOpen ? -1.4 : 0;
  // The clone only changes when the asset reloads; do not snap an already animated gate on every toggle.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clone]);
  useFrame((_, delta) => {
    const player = useGameStore.getState().playerPosition;
    const inSwingArea = Math.abs(player[0]) < 4.7 && Math.abs(player[2] - GATE_ORIGIN.z) < 3.45;
    if (closeRequested && !inSwingArea) useGameStore.getState().closeGateWhenClear();
    const open = useGameStore.getState().gateOpen;
    leftAngle.current = THREE.MathUtils.damp(leftAngle.current, open ? 0 : -Math.PI / 2, 6, delta);
    rightAngle.current = THREE.MathUtils.damp(rightAngle.current, open ? -1.4 : 0, 6, delta);
    if (hinges.left) hinges.left.rotation.y = leftAngle.current;
    if (hinges.right) hinges.right.rotation.y = rightAngle.current;
    // The GLB leaves span from each hinge to the centre. Cuboids are deliberately simple and never use mesh colliders.
    setLeafBody(leftBody.current, LEFT_HINGE, new THREE.Vector3(2.01, 0, 0), leftAngle.current);
    setLeafBody(rightBody.current, RIGHT_HINGE, new THREE.Vector3(-2.04, 0, 0), rightAngle.current);
  });
  return <group>
    <primitive object={clone} />
    <RigidBody ref={leftBody} type="kinematicPosition" colliders={false}><CuboidCollider args={[2.01, 1.62, .09]} /></RigidBody>
    <RigidBody ref={rightBody} type="kinematicPosition" colliders={false}><CuboidCollider args={[2.04, 1.62, .09]} /></RigidBody>
  </group>;
}

useGLTF.preload(MODEL_URL);
