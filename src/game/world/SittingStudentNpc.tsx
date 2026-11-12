"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";
import { useGameStore } from "@/game/store/useGameStore";
import { sittingStudentNpcConfig } from "./sittingStudentNpc.config";

type HeadRuntime = {
  pivot: THREE.Object3D;
  rest: THREE.Euler;
};

function SittingStudentModel({
  onHeadReady,
}: {
  onHeadReady: (head: HeadRuntime | null) => void;
}) {
  const { scene } = useGLTF(sittingStudentNpcConfig.modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const restoreMaterials = applyUnlitMaterials(model);
    const hiddenSupportNodes = sittingStudentNpcConfig.assetSupportNodeNames
      .map((name) => model.getObjectByName(name))
      .filter((node): node is THREE.Object3D => Boolean(node));
    hiddenSupportNodes.forEach((node) => { node.visible = false; });

    const head = model.getObjectByName("HeadPivot");
    if (!head) {
      console.warn("Sitting student NPC: HeadPivot is missing; head tracking is disabled.");
      onHeadReady(null);
    } else {
      // The GLB's HeadPivot already has the author-defined neck transform.
      // Keep that rest orientation and add only local, clamped offsets.
      onHeadReady({ pivot: head, rest: head.rotation.clone() });
    }

    return () => {
      hiddenSupportNodes.forEach((node) => { node.visible = true; });
      onHeadReady(null);
      restoreMaterials();
    };
  }, [model, onHeadReady]);

  return <primitive object={model} />;
}

/**
 * A visual-only local-reactive NPC crouching on the right badminton umpire chair.
 * It never creates a physics body or multiplayer event.
 */
export function SittingStudentNpc() {
  const root = useRef<THREE.Group>(null);
  const head = useRef<HeadRuntime | null>(null);
  const trackingPlayer = useRef(false);
  const bubbleVisibleRef = useRef(false);
  const lastProximityCheck = useRef(-Infinity);
  const playerWorld = useMemo(() => new THREE.Vector3(), []);
  const playerInHeadParent = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  const handleHeadReady = useCallback((nextHead: HeadRuntime | null) => {
    head.current = nextHead;
  }, []);

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;
    const player = useGameStore.getState().playerPosition;

    // Threshold checks are deliberately limited to 8 Hz. Head damping remains
    // per-frame so the response is smooth without React state churn.
    if (state.clock.elapsedTime - lastProximityCheck.current >= .125) {
      // The NPC sits above the court. Proximity is intentionally measured
      // along the playable floor, otherwise the chair height shrinks the
      // useful radius for a player standing at the court centre.
      const distance = Math.hypot(player[0] - group.position.x, player[2] - group.position.z);
      const nextTracking = trackingPlayer.current
        ? distance <= sittingStudentNpcConfig.leaveRadius
        : distance <= sittingStudentNpcConfig.detectionRadius;
      const nextBubbleVisible = bubbleVisibleRef.current
        ? distance <= sittingStudentNpcConfig.leaveRadius
        : distance <= sittingStudentNpcConfig.bubbleEnterRadius;
      trackingPlayer.current = nextTracking;
      if (nextBubbleVisible !== bubbleVisibleRef.current) {
        bubbleVisibleRef.current = nextBubbleVisible;
        setBubbleVisible(nextBubbleVisible);
      }
      lastProximityCheck.current = state.clock.elapsedTime;
    }

    const headRuntime = head.current;
    if (!headRuntime) return;
    const { pivot, rest } = headRuntime;
    const parent = pivot.parent;
    if (!parent) return;

    let targetX = rest.x;
    let targetY = rest.y;
    if (trackingPlayer.current) {
      playerWorld.set(player[0], player[1], player[2]);
      // Convert the player world position to the head's parent space before
      // calculating a yaw. This preserves the campus/NPC root rotation.
      parent.updateWorldMatrix(true, false);
      playerInHeadParent.copy(playerWorld);
      parent.worldToLocal(playerInHeadParent);
      direction.subVectors(playerInHeadParent, pivot.position);
      const horizontalDistance = Math.hypot(direction.x, direction.z);
      const requestedYaw = Math.atan2(direction.x, direction.z);
      const yawOffset = THREE.MathUtils.euclideanModulo(requestedYaw - rest.y + Math.PI, Math.PI * 2) - Math.PI;
      targetY = rest.y + THREE.MathUtils.clamp(yawOffset, -Math.PI / 3, Math.PI / 3);
      const requestedPitch = Math.atan2(-direction.y, Math.max(horizontalDistance, .001));
      targetX = rest.x + THREE.MathUtils.clamp(requestedPitch - rest.x, -Math.PI / 12, Math.PI / 9);
    }

    pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, targetX, 10, delta);
    pivot.rotation.y = THREE.MathUtils.damp(pivot.rotation.y, targetY, 10, delta);
    pivot.rotation.z = THREE.MathUtils.damp(pivot.rotation.z, rest.z, 10, delta);
  });

  return <group
    ref={root}
    position={sittingStudentNpcConfig.position}
    rotation={[0, sittingStudentNpcConfig.rotationY, 0]}
    scale={sittingStudentNpcConfig.scale}
  >
    <SittingStudentModel onHeadReady={handleHeadReady} />
    <Html position={[0, sittingStudentNpcConfig.speechHeight, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: "none" }}>
      <div className={`npc-speech-bubble${bubbleVisible ? " npc-speech-bubble--visible" : ""}`} role="status">
        {sittingStudentNpcConfig.dialogue}
      </div>
    </Html>
  </group>;
}

useGLTF.preload(sittingStudentNpcConfig.modelUrl);
