"use client";
import { useFrame } from "@react-three/fiber";
import { Component, useEffect, useMemo, useRef, Suspense, type ReactNode } from "react";
import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import type { PlayerMotionState } from "@/game/types";
import { CHARACTER_CONFIG } from "./character.config";
import { CharacterAnimator } from "./CharacterAnimator";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";

type CharacterProps = { motion: React.MutableRefObject<PlayerMotionState>; speed: React.MutableRefObject<number>; velocity: React.MutableRefObject<THREE.Vector3>; visible: boolean; orientToVelocity?: boolean; seatedYaw?: number };
const skin = "#e9b491"; const uniform = "#8fc8df"; const navy = "#263b67"; const shoe = "#252937";

function Limb({ side, upper, lower, hand = false }: { side: 1 | -1; upper: boolean; lower: boolean; hand?: boolean }) {
  return <group position={[side * (upper ? .31 : .18), upper ? .02 : -.42, 0]}>
    <mesh position={[0,-.23,0]}><capsuleGeometry args={[upper ? .105 : .09, upper ? .34 : .27, 5, 8]} /><meshBasicMaterial color={upper ? uniform : skin} /></mesh>
    {hand && <mesh position={[0,-.48,0]}><sphereGeometry args={[.11,8,6]}/><meshBasicMaterial color={skin}/></mesh>}
    {lower && <mesh position={[0,-.2,0]}><capsuleGeometry args={[.11,.34,5,8]}/><meshBasicMaterial color={navy}/></mesh>}
  </group>;
}

/** Procedural joint rig. Swap this component for a GLB AnimationMixer adapter later without affecting player physics. */
export function ProceduralCharacterFallback({ motion, speed, velocity: _velocity, visible }: CharacterProps) {
  const root = useRef<THREE.Group>(null); const leftArm = useRef<THREE.Group>(null); const rightArm = useRef<THREE.Group>(null); const leftLeg = useRef<THREE.Group>(null); const rightLeg = useRef<THREE.Group>(null);
  const phase = useRef(0); const landing = useRef(0);
  useFrame((state, delta) => {
    const stateName = motion.current; const moving = stateName === "walk" || stateName === "run" || stateName === "stairs"; const airborne = stateName === "jump" || stateName === "fall";
    const rate = stateName === "run" ? 13 : stateName === "stairs" ? 7 : 9; if (moving) phase.current += delta * rate * Math.max(.55, speed.current / 4); else phase.current += delta * 2;
    if (stateName === "land") landing.current = 1; landing.current = Math.max(0, landing.current - delta * 6);
    const stride = moving ? (stateName === "run" ? .78 : .5) * Math.sin(phase.current) : 0;
    const targetArm = airborne ? -.75 : stride; const targetLeg = airborne ? .5 : -stride;
    const smooth = 1 - Math.exp(-delta * 13);
    if (leftArm.current) leftArm.current.rotation.x = THREE.MathUtils.lerp(leftArm.current.rotation.x, targetArm, smooth);
    if (rightArm.current) rightArm.current.rotation.x = THREE.MathUtils.lerp(rightArm.current.rotation.x, -targetArm, smooth);
    if (leftLeg.current) leftLeg.current.rotation.x = THREE.MathUtils.lerp(leftLeg.current.rotation.x, targetLeg, smooth);
    if (rightLeg.current) rightLeg.current.rotation.x = THREE.MathUtils.lerp(rightLeg.current.rotation.x, -targetLeg, smooth);
    if (root.current) { const bob = moving ? Math.abs(Math.sin(phase.current * 2)) * .035 : Math.sin(state.clock.elapsedTime * 2) * .012; root.current.position.y = bob - landing.current * .11; root.current.rotation.x = stateName === "run" ? -.12 : 0; }
  });
  return <group visible={visible} ref={root} position={[0,-.86,0]}>
    <group position={[0,.98,0]}><mesh><boxGeometry args={[.56,.72,.28]}/><meshBasicMaterial color={uniform}/></mesh><mesh position={[0,.54,0]}><sphereGeometry args={[.28,12,9]}/><meshBasicMaterial color={skin}/></mesh><mesh position={[-.1,.58,.25]}><sphereGeometry args={[.025,6,6]}/><meshBasicMaterial color="#1e293b"/></mesh><mesh position={[.1,.58,.25]}><sphereGeometry args={[.025,6,6]}/><meshBasicMaterial color="#1e293b"/></mesh>
      <group ref={leftArm} position={[-.38,.25,0]}><Limb side={-1} upper lower hand /></group><group ref={rightArm} position={[.38,.25,0]}><Limb side={1} upper lower hand /></group>
    </group>
    <group ref={leftLeg} position={[-.16,.53,0]}><Limb side={-1} upper={false} lower /><mesh position={[0,-.58,.1]}><boxGeometry args={[.2,.14,.38]}/><meshBasicMaterial color={shoe}/></mesh></group>
    <group ref={rightLeg} position={[.16,.53,0]}><Limb side={1} upper={false} lower /><mesh position={[0,-.58,.1]}><boxGeometry args={[.2,.14,.38]}/><meshBasicMaterial color={shoe}/></mesh></group>
  </group>;
}

function KienAnStudent({ motion, speed, velocity, visible, orientToVelocity, seatedYaw }: CharacterProps) {
  const { scene } = useGLTF(CHARACTER_CONFIG.modelUrl);
  // GLB assets are cached by useGLTF. Clone only the visual graph for this local player instance.
  const model = useMemo(() => scene.clone(true), [scene]); const root = useRef<THREE.Group>(null);
  useEffect(() => applyUnlitMaterials(model), [model]);
  return <group visible={visible} position={[0, CHARACTER_CONFIG.modelOffsetY, 0]} scale={CHARACTER_CONFIG.modelScale} rotation={[0, CHARACTER_CONFIG.modelRotationY, 0]}>
    <group ref={root}><primitive object={model} /><CharacterAnimator root={root} motion={motion} speed={speed} velocity={velocity} orientToVelocity={orientToVelocity} seatedYaw={seatedYaw} /></group>
  </group>;
}

export function CharacterModel(props: CharacterProps) {
  const fallback = <ProceduralCharacterFallback {...props} />;
  return <CharacterAssetBoundary fallback={fallback}><Suspense fallback={fallback}><KienAnStudent {...props} /></Suspense></CharacterAssetBoundary>;
}

class CharacterAssetBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

useGLTF.preload(CHARACTER_CONFIG.modelUrl);
