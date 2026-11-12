import type { Vec3 } from "@/game/types";

/**
 * The placement is anchored beside TREE_2, the green planter next to the
 * left basketball post. Keeping every anchor here makes it quick to retune
 * from an in-game debug position without touching movement code.
 */
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
  // To the right (+X) of the green TREE_2 planter. The backrest faces the
  // tree and the seat faces +X, directly toward the right-side school wing.
  position: [-17, 0, 16],
  rotationY: Math.PI / 2,
  interactionPosition: [-15.8, .86, 16],
  interactionRadius: 2.25,
  // Character root is lowered onto the 0.50 m seat rather than lifted to the
  // 1 m-high backrest. The capsule is static while seated, so it cannot be
  // pushed through the small bench collider.
  // Bench is 1.8 m long; these three anchors leave a comfortable 0.55 m
  // spacing along it, so local and remote students never overlap.
  seatedBodyPositions: [
    [-16.9, .835, 16.55],
    [-16.9, .835, 16],
    [-16.9, .835, 15.45],
  ],
  standingBodyPosition: [-15.8, .86, 16],
  seatedYaw: Math.PI / 2,
};
