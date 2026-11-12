"use client";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlayerMotionState } from "@/game/types";

type AnimatorProps = { root: React.RefObject<THREE.Group | null>; motion: React.MutableRefObject<PlayerMotionState>; speed: React.MutableRefObject<number>; velocity: React.MutableRefObject<THREE.Vector3>; orientToVelocity?: boolean; seatedYaw?: number };
type Joint = "LeftHip" | "RightHip" | "LeftKnee" | "RightKnee" | "LeftShoulder" | "RightShoulder" | "LeftElbow" | "RightElbow";
const joints: Joint[] = ["LeftHip", "RightHip", "LeftKnee", "RightKnee", "LeftShoulder", "RightShoulder", "LeftElbow", "RightElbow"];

/** Applies offsets on top of the GLB's authored rest transforms; meshes always remain attached to their real pivots. */
export function CharacterAnimator({ root, motion, speed, velocity, orientToVelocity = true, seatedYaw }: AnimatorProps) {
  const rest = useRef(new Map<Joint, THREE.Euler>()); const phase = useRef(0); const landing = useRef(0);
  useEffect(() => { const scene = root.current; if (!scene) return; joints.forEach((name) => { const joint = scene.getObjectByName(name); if (joint) rest.current.set(name, joint.rotation.clone()); }); }, [root]);
  useFrame((state, delta) => {
    const model = root.current; if (!model || rest.current.size === 0) return;
    const stateName = motion.current; const moving = stateName === "walk" || stateName === "run" || stateName === "stairs"; const airborne = stateName === "jump" || stateName === "fall";
    const rate = stateName === "run" ? 13 : stateName === "stairs" ? 7 : 9; if (moving) phase.current += delta * rate * Math.max(.6, speed.current / 4); else phase.current += delta * 2;
    if (stateName === "land") landing.current = 1; landing.current = Math.max(0, landing.current - delta * 7);
    const stride = moving ? Math.sin(phase.current) * (stateName === "run" ? .78 : .5) : 0;
    const set = (name: Joint, x: number) => { const joint = model.getObjectByName(name); const base = rest.current.get(name); if (!joint || !base) return; joint.rotation.x = THREE.MathUtils.damp(joint.rotation.x, base.x + x, 16, delta); };
    if (stateName === "sit") {
      // Keep the torso upright with both thighs forward and knees bent on the
      // stone bench. All offsets remain relative to the authored GLB pivots.
      set("LeftShoulder", -.1); set("RightShoulder", -.1); set("LeftElbow", -.45); set("RightElbow", -.45);
      set("LeftHip", -1.22); set("RightHip", -1.22); set("LeftKnee", 1.45); set("RightKnee", 1.45);
    } else if (airborne) {
      set("LeftShoulder", -.72); set("RightShoulder", -.72); set("LeftHip", .35); set("RightHip", .35); set("LeftKnee", .55); set("RightKnee", .55); set("LeftElbow", -.28); set("RightElbow", -.28);
    } else {
      // Left leg and right arm share a phase; the opposing pair uses the inverse phase.
      set("LeftHip", stride); set("RightHip", -stride); set("RightShoulder", stride * .85); set("LeftShoulder", -stride * .85);
      set("LeftKnee", Math.max(0, -stride) * .42); set("RightKnee", Math.max(0, stride) * .42); set("LeftElbow", Math.max(0, stride) * -.22); set("RightElbow", Math.max(0, -stride) * -.22);
    }
    const planar = Math.hypot(velocity.current.x, velocity.current.z);
    if (stateName === "sit" && seatedYaw !== undefined) model.rotation.y = THREE.MathUtils.damp(model.rotation.y, seatedYaw, 11, delta);
    else if (orientToVelocity && planar > .08) { const yaw = Math.atan2(velocity.current.x, velocity.current.z); model.rotation.y = THREE.MathUtils.damp(model.rotation.y, yaw, 11, delta); }
    const bob = stateName === "sit" ? 0 : moving ? Math.abs(Math.sin(phase.current * 2)) * .025 : Math.sin(state.clock.elapsedTime * 2) * .008;
    model.position.y = bob - landing.current * .075;
  });
  return null;
}
