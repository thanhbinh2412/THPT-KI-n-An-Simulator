import type { Vec3 } from "@/game/types";
import { campusDoors, campusRevision, campusSpawn } from "./campusGameplay";

const directory = "/models/campus-v02/";
export const campusConfig = {
  modelUrl: `${directory}kien_an_campus_photo_v02.glb?v=${campusRevision}`,
  position: [0, 0, 0] as Vec3, rotation: [0, 0, 0] as Vec3, scale: 1, spawn: campusSpawn,
};
export const campusCollisionUrl = `${directory}kien_an_campus_photo_v02_collision.glb?v=${campusRevision}`;
export type CampusGateId = "main" | "left" | "right";
export const campusGateConfig = Object.fromEntries(campusDoors.filter((door) => door.gate).map((door) => [door.gate, {
  interactionPosition: door.position, radius: door.radius, duration: 1.5,
}])) as Record<CampusGateId, { interactionPosition: Vec3; radius: number; duration: number }>;
