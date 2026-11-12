"use client";
import { useGLTF } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { useEffect } from "react";
import { exteriorConfig } from "@/game/config/exterior.config";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";

function ExteriorColliders() {
  const [offsetX, , offsetZ] = exteriorConfig.position;
  return <>
    {/* The road and both sidewalks are level with the V17 gate approach. */}
    <RigidBody type="fixed" colliders={false} position={[offsetX, -.14, offsetZ]}><CuboidCollider args={[80, .14, 10]} /></RigidBody>
    {/* The residential/parking row begins beyond the far sidewalk, leaving the full road traversable. */}
    <RigidBody type="fixed" colliders={false} position={[offsetX, 8.4, offsetZ + 21.5]}><CuboidCollider args={[80, 8.4, 11]} /></RigidBody>
  </>;
}

/** Exterior road aligned to the positive-Z side of the V17 school gate. */
export function ExteriorEnvironment() {
  const { scene } = useGLTF(exteriorConfig.modelUrl);
  useEffect(() => applyUnlitMaterials(scene), [scene]);
  return <>
    <group visible={exteriorConfig.visible} position={exteriorConfig.position} scale={[1, 1, -1]}>
      <group rotation={exteriorConfig.rotation} scale={exteriorConfig.scale}><primitive object={scene} /></group>
    </group>
    <ExteriorColliders />
  </>;
}

useGLTF.preload(exteriorConfig.modelUrl);
