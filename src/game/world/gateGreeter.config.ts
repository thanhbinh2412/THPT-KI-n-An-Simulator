import type { Vec3 } from "@/game/types";

/** A stationary NPC at the main entrance. This is never the local player model. */
export const gateGreeterConfig: {
  modelUrl: string;
  position: Vec3;
  rotationY: number;
  scale: number;
  speechHeight: number;
  mainGate: { halfWidth: number; triggerZ: number; triggerDepth: number };
  messageDurationMs: number;
} = {
  modelUrl: "/models/characters/kien_an_student_anh_tai.glb",
  // Just inside the courtyard, alongside the main route and clear of the gate colliders.
  position: [2.65, .02, 32.5],
  // The GLB's face points along +Z, towards the street and main gate.
  rotationY: 0,
  scale: .94,
  speechHeight: 2.05,
  // Red-line crossing point shown in the gate reference: a little inside the
  // main entrance, centred on the courtyard-to-sidewalk transition surface.
  // `triggerDepth` is a small hysteresis band to avoid re-triggering while
  // standing directly on the line.
  mainGate: { halfWidth: 4.1, triggerZ: 34.68, triggerDepth: .5 },
  messageDurationMs: 4600,
};

export const gateGreeterMessages = {
  entering: "Này, đi đâu đấy. Chào chưa",
  leaving: "Đi đâu đấy, trốn học à. Đi vào nhanh",
} as const;
