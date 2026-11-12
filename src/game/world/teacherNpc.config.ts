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
    // 12A1 is the first left-hand room of the right wing when facing its facade.
    [classroom12A1.interactionPosition[0], .66, classroom12A1.interactionPosition[2]],
    // Descend the raised porch steps before entering the open courtyard.
    [27.7, .33, -12.15], [26.86, .11, -12.15], [24.5, .02, -12.15],
    // A wide, obstacle-free loop around the courtyard.
    [18, .02, -18], [5, .02, -20], [-10, .02, -18], [-19, .02, -10],
    [-20, .02, 4], [-17, .02, 17], [-8, .02, 25], [4, .02, 27],
    [15, .02, 22], [20, .02, 10], [18, .02, -2], [24.5, .02, -12.15],
  ],
};
