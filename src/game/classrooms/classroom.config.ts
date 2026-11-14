import { campusDoors, campusRooms } from "@/game/config/campusGameplay";
import type { Vec3 } from "@/game/types";

export type ClassroomDoorId = string;
export type ClassroomId = string;
export type ClassroomRegistryEntry = {
  id: string; grade: 10 | 11 | 12; section: number; building: string; floor: number; signNodeName: string; position: Vec3;
};
export type ClassroomConfig = ClassroomRegistryEntry & {
  doorNodeName: string; handleNodeName: string; hingePosition: Vec3; interactionPosition: Vec3;
  furniture: { rows: number; columns: number; frontX: number; rowSpacing: number; columnSpacing: number; orientationY: number; floorY: number };
};
export const classroomRegistry: ClassroomRegistryEntry[] = campusRooms.map((room) => ({
  ...room, grade: Number(room.id.slice(0, 2)) as 10 | 11 | 12, section: Number(room.id.slice(3)),
  signNodeName: `V02_Class_Sign_${room.building}_${room.id}`,
}));
export const classrooms: ClassroomConfig[] = campusDoors.filter((door) => !door.gate).map((door) => ({
  ...(classroomRegistry.find((room) => room.id === door.id) ?? {
    id: door.id, grade: 12 as const, section: 0, building: "service", floor: 1, signNodeName: "", position: door.position,
  }),
  doorNodeName: door.leaves[0].node, handleNodeName: "", hingePosition: door.leaves[0].pivot, interactionPosition: door.position,
  // Interiors are embedded in the GLB; this adapter keeps legacy consumers typed.
  furniture: { rows: 0, columns: 0, frontX: 0, rowSpacing: 0, columnSpacing: 0, orientationY: 0, floorY: door.leaves[0].pivot[1] },
}));
export const classroomById = new Map(classrooms.map((room) => [room.id, room]));
export const classroomRegistryById = new Map(classroomRegistry.map((room) => [room.id, room]));
export function isClassroomDoorId(value: string | null): value is ClassroomDoorId {
  return value !== null && classroomById.has(value);
}
