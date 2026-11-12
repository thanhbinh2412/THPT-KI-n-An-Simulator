"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";
import { useGameStore } from "@/game/store/useGameStore";
import { teacherNpcConfig } from "./teacherNpc.config";

type LimbName = "leftArm" | "rightArm" | "leftLeg" | "rightLeg";
const limbSpecs: Array<{ id: LimbName; pivot: [number, number, number]; nodes: string[] }> = [
  { id: "leftArm", pivot: [-.245, 1.385, 0], nodes: ["LeftShoulderCap", "LeftUpperSleeve", "LeftForearmSleeve", "LeftHand"] },
  { id: "rightArm", pivot: [.245, 1.385, 0], nodes: ["RightShoulderCap", "RightUpperSleeve", "RightForearmSleeve", "RightHand"] },
  { id: "leftLeg", pivot: [-.115, .745, 0], nodes: ["LeftThigh", "LeftKneeCover", "LeftShin", "LeftShoe", "LeftShoeSole"] },
  { id: "rightLeg", pivot: [.115, .745, 0], nodes: ["RightThigh", "RightKneeCover", "RightShin", "RightShoe", "RightShoeSole"] },
];

/** Adds safe runtime pivots to the separate low-poly limb meshes, then swings them as a slow walk cycle. */
function TeacherWalkAnimator({ root, walking }: { root: React.RefObject<THREE.Group | null>; walking: React.MutableRefObject<boolean> }) {
  const pivots = useRef(new Map<LimbName, THREE.Group>());
  const phase = useRef(0);

  useEffect(() => {
    const model = root.current;
    if (!model) return;
    model.updateMatrixWorld(true);
    const attached: Array<{ pivot: THREE.Group; meshes: THREE.Object3D[] }> = [];
    limbSpecs.forEach((spec) => {
      const meshes = spec.nodes.map((name) => model.getObjectByName(name)).filter((mesh): mesh is THREE.Object3D => Boolean(mesh));
      if (!meshes.length) return;
      const pivot = new THREE.Group();
      pivot.name = `Teacher_${spec.id}_Pivot`;
      pivot.position.fromArray(spec.pivot);
      model.add(pivot);
      meshes.forEach((mesh) => pivot.attach(mesh));
      pivots.current.set(spec.id, pivot);
      attached.push({ pivot, meshes });
    });
    return () => {
      attached.forEach(({ pivot, meshes }) => {
        pivot.rotation.set(0, 0, 0);
        pivot.updateMatrixWorld(true);
        meshes.forEach((mesh) => model.attach(mesh));
        model.remove(pivot);
      });
      pivots.current.clear();
    };
  }, [root]);

  useFrame((state, delta) => {
    const active = walking.current;
    phase.current += delta * (active ? 4.8 : 1.8);
    const stride = active ? Math.sin(phase.current) * .34 : 0;
    const set = (id: LimbName, angle: number) => {
      const pivot = pivots.current.get(id);
      if (pivot) pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, angle, 13, delta);
    };
    // Alternating legs and opposing arms, matching the student's gait while
    // retaining a shorter, composed stride for the áo dài.
    set("leftLeg", stride); set("rightLeg", -stride);
    set("leftArm", -stride * .7); set("rightArm", stride * .7);
    const model = root.current;
    if (model) model.position.y = active ? Math.abs(Math.sin(phase.current * 2)) * .018 : Math.sin(state.clock.elapsedTime * 2) * .006;
  });
  return null;
}

function TeacherModel() {
  const { scene } = useGLTF(teacherNpcConfig.modelUrl);
  // useGLTF caches the asset. The teacher owns one cloned visual graph and
  // never changes the original source model or its materials.
  const model = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => applyUnlitMaterials(model), [model]);
  return <primitive object={model} />;
}

/**
 * A non-physical NPC: she starts at 12A1, walks the courtyard route at a
 * measured pace, and loops. Her movement has no effect on player collisions.
 */
export function TeacherNpc() {
  const walker = useRef<THREE.Group>(null);
  const model = useRef<THREE.Group>(null);
  const waypointIndex = useRef(1);
  const target = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const walking = useRef(true);
  const bubbleText = useRef<string | null>(null);
  const lastPositionReport = useRef(-Infinity);
  const [bubble, setBubble] = useState<string | null>(null);

  useEffect(() => {
    // Publish the initial location before the first animation frame, so the
    // shared interaction manager never targets a stale/default position.
    useGameStore.getState().setTeacherPosition([...teacherNpcConfig.waypoints[0]]);
  }, []);

  useFrame((state, delta) => {
    const root = walker.current;
    if (!root) return;
    const player = useGameStore.getState().playerPosition;
    const distanceToPlayer = Math.hypot(player[0] - root.position.x, player[2] - root.position.z);
    const store = useGameStore.getState();
    const greetingRequestedAt = store.teacherGreetingRequestedAt;
    const greetingActive = greetingRequestedAt !== null
      && Date.now() - greetingRequestedAt < teacherNpcConfig.responseDurationMs;
    if (greetingRequestedAt !== null && !greetingActive) store.clearTeacherGreeting(greetingRequestedAt);
    const nextBubble = greetingActive
      ? "Anh này lại bỏ tiết đúng không? Về lớp nhanhhh"
      : distanceToPlayer <= teacherNpcConfig.greetingRadius ? "Sếp Tám đây" : null;
    if (bubbleText.current !== nextBubble) {
      bubbleText.current = nextBubble;
      setBubble(nextBubble);
    }
    // She only stops and addresses the student after the explicit greeting;
    // simply approaching her leaves the NPC route intact.
    walking.current = !greetingActive;
    if (!walking.current) {
      const targetYaw = Math.atan2(player[0] - root.position.x, player[2] - root.position.z);
      root.rotation.y = THREE.MathUtils.damp(root.rotation.y, targetYaw, 10, delta);
    } else {
      target.fromArray(teacherNpcConfig.waypoints[waypointIndex.current]);
      direction.subVectors(target, root.position);
      const remaining = direction.length();
      if (remaining < .06) {
        waypointIndex.current = (waypointIndex.current + 1) % teacherNpcConfig.waypoints.length;
      } else {
        const travel = Math.min(remaining, teacherNpcConfig.speed * delta);
        root.position.addScaledVector(direction.normalize(), travel);
        const planarLength = Math.hypot(direction.x, direction.z);
        if (planarLength > .001) {
          const targetYaw = Math.atan2(direction.x, direction.z);
          root.rotation.y = THREE.MathUtils.damp(root.rotation.y, targetYaw, 7, delta);
        }
      }
    }
    // Interaction position needs to be fresh, but does not need a 60 Hz React
    // update. Ten reports per second keeps the moving button location precise.
    if (state.clock.elapsedTime - lastPositionReport.current >= .1) {
      store.setTeacherPosition([root.position.x, root.position.y, root.position.z]);
      lastPositionReport.current = state.clock.elapsedTime;
    }
  });

  return <group ref={walker} position={teacherNpcConfig.waypoints[0]} scale={teacherNpcConfig.scale}>
    <group ref={model}><TeacherModel /><TeacherWalkAnimator root={model} walking={walking} /></group>
    {bubble && <Html position={[0, teacherNpcConfig.speechHeight, 0]} center zIndexRange={[10, 0]}>
      <div className="gate-greeter-bubble" role="status">{bubble}</div>
    </Html>}
  </group>;
}

useGLTF.preload(teacherNpcConfig.modelUrl);
