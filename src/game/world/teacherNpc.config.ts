import { classroomById } from "@/game/classrooms/classroom.config";
import type { Vec3 } from "@/game/types";

const classroom12A1 = classroomById.get("12A1");
if (!classroom12A1) throw new Error("Teacher route requires classroom 12A1.");

/** A visual-only, slow courtyard route beginning at the 12A1 doorway. */
export const teacherNpcConfig: {
  modelUrl: string;
  scale: number;
  speed: number;
  speechHeight: number;
  greetingRadius: number;
  interactionRadius: number;
  responseDurationMs: number;
  waypoints: Vec3[];
} = {
  modelUrl: "/models/characters/female_teacher_red_aodai.glb",
  // The source GLB is 1.8925 m tall; this gives the teacher a natural ~1.70 m height.
  scale: .9,
  speed: .82,
  speechHeight: 2.18,
  // The name appears as the player approaches. At the smaller interaction
  // radius, the HUD offers a clickable greeting and releases pointer lock.
  greetingRadius: 7,
  interactionRadius: 3.8,
  responseDurationMs: 5000,
  waypoints: [
    [36.9, .33, classroom12A1.interactionPosition[2]],
    [36.9, .33, 20.5], [35.35, .12, 20.5], [34.4, .02, 20.5],
    [19, .02, 24], [14, .02, 33], [0, .02, 35], [-13, .02, 34],
    [-26, .02, 29], [-27, .02, 23], [-16, .02, 21], [0, .02, 22],
    [18, .02, 23], [34.4, .02, 20.5], [35.35, .12, 20.5], [36.9, .33, 20.5],
  ],
};
