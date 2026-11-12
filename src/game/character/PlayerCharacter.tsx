"use client";

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PlayerMotionState } from "@/game/types";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";
import { CHARACTER_ASSETS, playerAnimationForMotion, type PlayerAnimation, type PlayerGender } from "./character.assets";

export type PlayerCharacterProps = {
  gender: PlayerGender;
  motion: React.MutableRefObject<PlayerMotionState>;
  speed: React.MutableRefObject<number>;
  velocity: React.MutableRefObject<THREE.Vector3>;
  visible?: boolean;
  orientToVelocity?: boolean;
  seatedYaw?: number;
};

function AnimatedCharacter({ gender, motion, speed: _speed, velocity, visible = true, orientToVelocity = true, seatedYaw }: PlayerCharacterProps) {
  const asset = CHARACTER_ASSETS[gender];
  const { scene, animations } = useGLTF(asset.modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);
  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model]);
  const root = useRef<THREE.Group>(null);
  const active = useRef<PlayerAnimation | null>(null);
  const requested = useRef<PlayerAnimation>("Idle");
  const sitFinished = useRef(false);

  useEffect(() => {
    const restoreMaterials = applyUnlitMaterials(model);
    const finishSit = (event: THREE.Event & { action?: THREE.AnimationAction }) => {
      if (event.action?.getClip().name === "Sit" && requested.current === "Sit") sitFinished.current = true;
    };
    mixer.addEventListener("finished", finishSit);
    return () => { mixer.removeEventListener("finished", finishSit); mixer.stopAllAction(); mixer.uncacheRoot(model); restoreMaterials(); };
  }, [mixer, model]);

  useFrame((_state, delta) => {
    const nextRequested = playerAnimationForMotion(motion.current);
    if (nextRequested !== requested.current) {
      requested.current = nextRequested;
      if (nextRequested !== "Sit") sitFinished.current = false;
    }
    const target = requested.current === "Sit" && sitFinished.current ? "SittingIdle" : requested.current;
    if (target !== active.current) {
      const clip = animations.find((item) => item.name === target);
      if (clip) {
        const next = mixer.clipAction(clip);
        const previous = active.current ? animations.find((item) => item.name === active.current) : undefined;
        if (previous) mixer.clipAction(previous).fadeOut(.16);
        next.reset();
        next.setLoop(target === "Sit" || target === "Jump" ? THREE.LoopOnce : THREE.LoopRepeat, target === "Sit" || target === "Jump" ? 1 : Infinity);
        next.clampWhenFinished = target === "Sit" || target === "Jump";
        next.fadeIn(.16).play();
        active.current = target;
      }
    }
    const visual = root.current;
    if (visual) {
      if (motion.current === "sit" && seatedYaw !== undefined) visual.rotation.y = THREE.MathUtils.damp(visual.rotation.y, seatedYaw, 11, delta);
      else if (orientToVelocity && Math.hypot(velocity.current.x, velocity.current.z) > .08) visual.rotation.y = THREE.MathUtils.damp(visual.rotation.y, Math.atan2(velocity.current.x, velocity.current.z), 11, delta);
    }
    mixer.update(delta);
  });

  return <group visible={visible} position={[0, asset.offsetY, 0]} scale={asset.scale}><group ref={root}><primitive object={model} /></group></group>;
}

export function PlayerCharacter(props: PlayerCharacterProps) {
  return <AnimatedCharacter key={props.gender} {...props} />;
}

useGLTF.preload(CHARACTER_ASSETS.male.modelUrl);
useGLTF.preload(CHARACTER_ASSETS.female.modelUrl);
