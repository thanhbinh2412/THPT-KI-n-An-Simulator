"use client";
import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import { campusConfig } from "@/game/config/campus.config";
import { CampusCollision } from "./CampusCollision";
import { CampusDoors } from "./CampusDoors";

/** Visuals and navigation are exported together from the editable V02 scene. */
export function CampusModel({ collisionsEnabled = true }: { collisionsEnabled?: boolean }) {
  const { scene } = useGLTF(campusConfig.modelUrl);
  const model = useMemo(() => scene.clone(true), [scene]);
  return <group><primitive object={model} />
    {collisionsEnabled && <CampusCollision />}
    <CampusDoors scene={model} collisionsEnabled={collisionsEnabled} />
  </group>;
}
useGLTF.preload(campusConfig.modelUrl);
