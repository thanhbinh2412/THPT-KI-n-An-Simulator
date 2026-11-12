"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { CharacterAnimator } from "@/game/character/CharacterAnimator";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";
import { useGameStore } from "@/game/store/useGameStore";
import type { PlayerMotionState } from "@/game/types";
import { bikeStudentNpcConfig } from "./bikeStudentNpc.config";

type Conversation = "prompt" | "unknown" | "bike-located" | "arrived";

function BikeStudentModel({
  motion,
  speed,
  velocity,
}: {
  motion: React.MutableRefObject<PlayerMotionState>;
  speed: React.MutableRefObject<number>;
  velocity: React.MutableRefObject<THREE.Vector3>;
}) {
  const { scene } = useGLTF(bikeStudentNpcConfig.modelUrl);
  // The shared GLTF cache remains untouched; this stationary NPC owns a clone.
  const model = useMemo(() => scene.clone(true), [scene]);
  const visualRoot = useRef<THREE.Group>(null);
  useEffect(() => applyUnlitMaterials(model), [model]);
  return <group ref={visualRoot}><primitive object={model} /><CharacterAnimator root={visualRoot} motion={motion} speed={speed} velocity={velocity} /></group>;
}

/** A visual-only conversation NPC. Choice selection and its run route are local. */
export function BikeStudentNpc() {
  const root = useRef<THREE.Group>(null);
  const near = useRef(false);
  const lastCheck = useRef(-Infinity);
  const conversationRef = useRef<Conversation>("prompt");
  const routeActive = useRef(false);
  const routeIndex = useRef(0);
  const motion = useRef<PlayerMotionState>("idle");
  const speed = useRef(0);
  const velocity = useRef(new THREE.Vector3());
  const target = useMemo(() => new THREE.Vector3(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const [dialogueVisible, setDialogueVisible] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [conversation, setConversation] = useState<Conversation>("prompt");

  useFrame((state, delta) => {
    const group = root.current;
    if (!group) return;

    if (routeActive.current) {
      target.fromArray(bikeStudentNpcConfig.thirdFloorRoute[routeIndex.current]);
      direction.subVectors(target, group.position);
      const remaining = direction.length();
      if (remaining < .06) {
        routeIndex.current += 1;
        if (routeIndex.current >= bikeStudentNpcConfig.thirdFloorRoute.length) {
          routeActive.current = false;
          motion.current = "idle";
          speed.current = 0;
          velocity.current.set(0, 0, 0);
          conversationRef.current = "arrived";
          setConversation("arrived");
          setDialogueVisible(false);
        }
      } else {
        const travel = Math.min(remaining, bikeStudentNpcConfig.runSpeed * delta);
        direction.multiplyScalar(1 / remaining);
        group.position.addScaledVector(direction, travel);
        velocity.current.copy(direction).multiplyScalar(bikeStudentNpcConfig.runSpeed);
        speed.current = bikeStudentNpcConfig.runSpeed;
        motion.current = Math.abs(velocity.current.y) > .06 ? "stairs" : "run";
      }
    } else if (motion.current !== "idle") {
      motion.current = "idle";
      speed.current = 0;
      velocity.current.set(0, 0, 0);
    }

    if (state.clock.elapsedTime - lastCheck.current >= .125 && (conversationRef.current === "prompt" || conversationRef.current === "unknown")) {
      const [playerX, , playerZ] = useGameStore.getState().playerPosition;
      const distance = Math.hypot(playerX - group.position.x, playerZ - group.position.z);
      const nextNear = near.current
        ? distance <= bikeStudentNpcConfig.leaveRadius
        : distance <= bikeStudentNpcConfig.enterRadius;
      if (nextNear !== near.current) {
        near.current = nextNear;
        setDialogueVisible(nextNear);
        if (!nextNear) {
          setSelectedChoice(null);
          // Leaving after the first reply ends that local exchange; returning
          // later starts the original question again.
          if (conversationRef.current === "unknown") {
            conversationRef.current = "prompt";
            setConversation("prompt");
          }
        }
        // A visible HTML choice panel must receive pointer input. The canvas can
        // be clicked afterwards to restore normal pointer-lock camera control.
        if (nextNear && document.pointerLockElement) void document.exitPointerLock();
      }
      lastCheck.current = state.clock.elapsedTime;
    }
  });

  const selectChoice = (index: number) => {
    setSelectedChoice(index);
    if (index === 0) {
      conversationRef.current = "unknown";
      setConversation("unknown");
      return;
    }
    conversationRef.current = "bike-located";
    setConversation("bike-located");
    routeIndex.current = 0;
    routeActive.current = true;
  };

  const dialogue = conversation === "unknown"
    ? bikeStudentNpcConfig.unknownReply
    : conversation === "bike-located"
      ? bikeStudentNpcConfig.bikeLocatedReply
      : bikeStudentNpcConfig.dialogue;

  return <group
    ref={root}
    position={bikeStudentNpcConfig.position}
    rotation={[0, bikeStudentNpcConfig.rotationY, 0]}
    scale={bikeStudentNpcConfig.scale}
  >
    <BikeStudentModel motion={motion} speed={speed} velocity={velocity} />
    {dialogueVisible && conversation !== "arrived" && <Html position={[0, bikeStudentNpcConfig.speechHeight, 0]} center zIndexRange={[20, 0]}>
      <div className="npc-choice-dialogue" role="dialog" aria-label="Hội thoại học sinh">
        <p className="npc-choice-dialogue__bubble">{dialogue}</p>
        {conversation === "prompt" && <div className="npc-choice-dialogue__choices">
          {bikeStudentNpcConfig.choices.map((choice, index) => <button
            type="button"
            key={choice}
            className={selectedChoice === index ? "npc-choice-dialogue__choice npc-choice-dialogue__choice--selected" : "npc-choice-dialogue__choice"}
            onClick={() => selectChoice(index)}
          >{choice}</button>)}
        </div>}
      </div>
    </Html>}
  </group>;
}

useGLTF.preload(bikeStudentNpcConfig.modelUrl);
