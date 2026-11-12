import type { Vec3 } from "@/game/types";

/**
 * `UMPIRE_CHAIR_SEAT` spans X=25.46..26.14, Z=-0.04..0.54 and its top is
 * Y=2.293. The crouching GLB's shoes begin at local Y=0.233, so its root is
 * raised by 2.06 m to place the feet directly on the chair seat.
 */
export const sittingStudentNpcConfig: {
  id: "badminton-sitting-student";
  modelUrl: string;
  position: Vec3;
  rotationY: number;
  scale: number;
  speechHeight: number;
  detectionRadius: number;
  bubbleEnterRadius: number;
  leaveRadius: number;
  dialogue: string;
  assetSupportNodeNames: string[];
} = {
  id: "badminton-sitting-student",
  modelUrl: "/models/characters/kien_an_student_crouching_face_uncovered.glb",
  // Centre of UMPIRE_CHAIR_SEAT, with the feet resting on its top surface.
  position: [25.8, 2.06, .25],
  // The model's face is local +Z; -90° makes it face the courtyard (-X).
  rotationY: -Math.PI / 2,
  scale: 1,
  speechHeight: 2.12,
  // The badminton-court centre is ~4.1 m away on the ground plane. Keep the
  // message visible from there and add a wider exit band to avoid flicker.
  detectionRadius: 6,
  bubbleEnterRadius: 5,
  leaveRadius: 5.75,
  dialogue: "Thả tao xuống nhanhh con kia",
  // The asset includes a short demonstration support. The campus chair already
  // provides the real support at this location, so avoid drawing both.
  assetSupportNodeNames: [
    "Post_vertical",
    "Post_vertical_side_shade",
    "Crossbar_foot_platform",
    "Side_support_right",
    "Horizontal_hand_rail",
    "Front_rust_screw",
    "Front_rust_screw_2",
  ],
};
