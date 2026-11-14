import type { Vec3 } from "@/game/types";

/** Anchored to the embedded V02_Stone_Bench_03. */
export const stoneBenchConfig: {
  id: "stone-bench";
  modelUrl: string;
  position: Vec3;
  rotationY: number;
  interactionPosition: Vec3;
  interactionRadius: number;
  seatedBodyPositions: [Vec3, Vec3, Vec3];
  standingBodyPosition: Vec3;
  seatedYaw: number;
} = {
  id: "stone-bench",
  modelUrl: "/assets/school/kien_an_stone_bench_colored.glb",
  position: [4, 0, 44],
  rotationY: 0,
  interactionPosition: [4, .86, 45.1],
  interactionRadius: 2.0,
  seatedBodyPositions: [[3.45, .835, 44], [4, .835, 44], [4.55, .835, 44]],
  standingBodyPosition: [4, .86, 45.1],
  seatedYaw: 0,
};
