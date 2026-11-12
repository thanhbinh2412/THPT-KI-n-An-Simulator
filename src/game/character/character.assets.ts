import type { PlayerMotionState } from "@/game/types";

export type PlayerGender = "male" | "female";
export type PlayerAnimation = "Idle" | "Walk" | "Run" | "Jump" | "Sit" | "SittingIdle";

export const CHARACTER_ASSETS: Record<PlayerGender, { modelUrl: string; scale: number; offsetY: number }> = {
  male: { modelUrl: "/assets/characters/kien_an_student_5_animations.glb", scale: 1, offsetY: -.835 },
  female: { modelUrl: "/assets/characters/kien_an_female_student_6_animations.glb", scale: 1, offsetY: -.835 },
};

export function playerAnimationForMotion(motion: PlayerMotionState): PlayerAnimation {
  if (motion === "walk" || motion === "stairs") return "Walk";
  if (motion === "run") return "Run";
  if (motion === "jump" || motion === "fall" || motion === "land") return "Jump";
  if (motion === "sit") return "Sit";
  return "Idle";
}
