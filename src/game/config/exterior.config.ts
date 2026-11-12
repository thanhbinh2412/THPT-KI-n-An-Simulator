import type { Vec3 } from "@/game/types";

/** Asset uses X-road / Y-across-road / Z-up. Transform maps Z→world Y and keeps houses beyond the road. */
export const exteriorConfig: { modelUrl: string; position: Vec3; rotation: Vec3; scale: number; visible: boolean } = {
  modelUrl: "/models/kien_an_road.glb",
  // Crosswalk local centre X=-2.9 becomes the school gate centre X=0.
  // School-side sidewalk local Y=-10..-7 maps to world Z=37.8..40.8 at the V17 gate.
  position: [2.9, 0, 47.8],
  rotation: [-Math.PI / 2, 0, 0],
  scale: 1,
  visible: true,
};
