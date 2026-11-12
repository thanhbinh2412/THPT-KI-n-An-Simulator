import v51SceneConfig from "../../../assets/school/kien_an_campus_v51_scene_config.json";
import type { Vec3 } from "@/game/types";

type Grade = 10 | 11 | 12;
type RightSection = 1 | 2 | 3 | 4;
export type ClassroomDoorId = `${Grade}${"A" | "B" | "C"}${RightSection}`;
export type ClassroomId = string;

export type ClassroomRegistryEntry = {
  id: ClassroomId;
  grade: Grade;
  section: number;
  building: "right" | "center";
  floor: 1 | 2 | 3;
  signNodeName: string;
  position: Vec3;
};

export type ClassroomConfig = ClassroomRegistryEntry & {
  id: ClassroomDoorId;
  doorNodeName: string;
  handleNodeName: string;
  /** V35 has no hinge node. This is the measured lower, leading edge of the leaf. */
  hingePosition: Vec3;
  interactionPosition: Vec3;
  furniture: { rows: number; columns: number; frontX: number; rowSpacing: number; columnSpacing: number; orientationY: number; floorY: number };
};

const signRecords = v51SceneConfig.classroomSigns.meshSigns;
export const classroomRegistry: ClassroomRegistryEntry[] = signRecords.map((sign) => ({
  id: sign.label,
  grade: sign.grade as Grade,
  section: sign.roomSequence,
  building: sign.building as "right" | "center",
  floor: sign.floor as 1 | 2 | 3,
  signNodeName: sign.mesh,
  position: [...sign.worldPosition] as Vec3,
}));

if (classroomRegistry.length !== 24 || new Set(classroomRegistry.map((classroom) => classroom.id)).size !== 24) {
  throw new Error("V51 classroom registry must contain 24 uniquely named classrooms.");
}

const roomSlots = [
  { slot: 0, z: 25.908, section: 4 },
  { slot: 1, z: 15.608, section: 3 },
  { slot: 3, z: -2.192, section: 2 },
  { slot: 4, z: -12.492, section: 1 },
] as const;
const floors = [
  { floor: 1, grade: 12, lowerY: 1.781566, surfaceY: .66 },
  { floor: 2, grade: 11, lowerY: 6.681566, surfaceY: 5.1834 },
  { floor: 3, grade: 10, lowerY: 11.581566, surfaceY: 10.0834 },
] as const;

/** Runtime door metadata: V51 preserves the V35 right-wing door leaf nodes. */
export const classrooms: ClassroomConfig[] = floors.flatMap((floor) => roomSlots.map((room) => {
  const registry = classroomRegistry.find((classroom) => classroom.floor === floor.floor && classroom.section === room.section && classroom.building === "right");
  if (!registry) throw new Error(`Missing V51 sign metadata for right floor ${floor.floor}, section ${room.section}.`);
  const id = registry.id as ClassroomDoorId;
  const suffix = `${floor.floor - 1}_${room.slot}`;
  return {
    ...registry,
    id,
    doorNodeName: `V35_RIGHT_DOOR_LEAF_${suffix}`,
    handleNodeName: `V35_RIGHT_DOOR_HANDLE_${suffix}`,
    hingePosition: [31.92, floor.lowerY, room.z],
    interactionPosition: [31.2, floor.lowerY + .86, room.z + .34],
    furniture: { rows: 4, columns: 3, frontX: 38.35, rowSpacing: 1.55, columnSpacing: 2.25, orientationY: Math.PI / 2, floorY: floor.surfaceY },
  };
}));

export const classroomById = new Map(classrooms.map((classroom) => [classroom.id, classroom]));
export const classroomRegistryById = new Map(classroomRegistry.map((classroom) => [classroom.id, classroom]));

export function isClassroomDoorId(value: string | null): value is ClassroomDoorId {
  return value !== null && classroomById.has(value as ClassroomDoorId);
}
