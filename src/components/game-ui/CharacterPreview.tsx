"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PlayerCharacter } from "@/game/character/PlayerCharacter";
import type { PlayerGender } from "@/game/character/character.assets";
import type { PlayerMotionState } from "@/game/types";

function PreviewAvatar({ gender }: { gender: PlayerGender }) {
  const motion = useRef<PlayerMotionState>("idle");
  const speed = useRef(0); const velocity = useRef(new THREE.Vector3());
  return <group position={[0, .84, 0]} rotation={[0, Math.PI, 0]}><PlayerCharacter gender={gender} motion={motion} speed={speed} velocity={velocity} orientToVelocity={false} /></group>;
}

function PreviewCamera() {
  const { camera } = useThree();
  useEffect(() => {
    // The supplied characters are 1.8925 m tall. A 5.2 m camera arm frames
    // their full height with breathing room instead of cropping the head.
    camera.position.set(0, 1.08, 5.2);
    camera.lookAt(0, .92, 0);
    camera.updateProjectionMatrix();
  }, [camera]);
  return null;
}

/** Lightweight idle-only R3F preview for the profile selector. */
export function CharacterPreview({ gender }: { gender: PlayerGender }) {
  return <div className="character-preview" aria-hidden="true"><Canvas dpr={[1, 1.25]} camera={{ fov: 30 }} gl={{ antialias: false, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping }}>
    <PreviewCamera /><PreviewAvatar gender={gender} />
  </Canvas></div>;
}
