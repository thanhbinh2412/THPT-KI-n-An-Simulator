import manifest from "../../../assets/school/Campus-Rebuild/v02/gameplay.json";
import type { Vec3 } from "@/game/types";
import type { CampusGateId } from "./campus.config";

export type CampusLeaf = { node: string; pivot: Vec3; center: Vec3; halfExtents: Vec3; openAngle: number };
export type CampusDoor = { id: string; gate?: CampusGateId; title: string; position: Vec3; radius: number; leaves: CampusLeaf[] };
export const campusDoors = manifest.doors as CampusDoor[];
export const campusRooms = manifest.rooms.map((room) => ({ ...room, position: room.position as Vec3 }));
export const campusRevision = manifest.revision;
export const campusSpawn = manifest.spawn as Vec3;
