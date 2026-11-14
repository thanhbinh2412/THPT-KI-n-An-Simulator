import type { Vec3 } from "@/game/types";

export const campusConfig: { modelUrl: string; position: Vec3; rotation: Vec3; scale: number; spawn: Vec3 } = {
  // Versioned filename prevents browsers/CDNs from reusing the previous campus GLB.
  modelUrl: "/assets/school/KienAn_V78_SanGachMo.glb",
  position: [0, 0, 0], rotation: [0, 0, 0], scale: 1,
  // Outside the main gate at Z=37.5, within the 2.5 m main-gate interaction zone.
  spawn: [0, .86, 39.8],
};

export type CampusGateId = "main" | "left" | "right";
export const campusGateConfig: Record<CampusGateId, { interactionPosition: Vec3; radius: number; duration: number }> = {
  main: { interactionPosition: [0, 1.5, 39.8], radius: 2.5, duration: 1.8 },
  left: { interactionPosition: [-7.4, 1.5, 39.8], radius: 2.5, duration: 1.2 },
  right: { interactionPosition: [7.4, 1.5, 39.8], radius: 2.5, duration: 1.2 },
};
