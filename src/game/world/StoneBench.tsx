"use client";

import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect, useMemo } from "react";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";
import { stoneBenchConfig } from "./stoneBench.config";

/** A separate asset and small physical footprint; it never modifies campus geometry. */
export function StoneBench() {
  const { scene } = useGLTF(stoneBenchConfig.modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    const restoreMaterials = applyUnlitMaterials(model);
    return restoreMaterials;
  }, [model]);

  return <RigidBody type="fixed" colliders={false} position={stoneBenchConfig.position} rotation={[0, stoneBenchConfig.rotationY, 0]}>
    <primitive object={model} />
    {/* Seat/back/legs are one compact obstacle; the player teleports only to the authored seat anchor. */}
    <CuboidCollider args={[.92, .5, .34]} position={[0, .5, -.04]} />
  </RigidBody>;
}

useGLTF.preload(stoneBenchConfig.modelUrl);
