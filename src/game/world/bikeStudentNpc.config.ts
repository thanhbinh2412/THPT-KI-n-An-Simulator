import type { Vec3 } from "@/game/types";

/** Standing student at the right side of the courtyard-facing rearmost block. */
export const bikeStudentNpcConfig: {
  id: "bike-student";
  modelUrl: string;
  position: Vec3;
  rotationY: number;
  scale: number;
  speechHeight: number;
  enterRadius: number;
  leaveRadius: number;
  dialogue: string;
  unknownReply: string;
  bikeLocatedReply: string;
  choices: readonly [string, string];
  runSpeed: number;
  thirdFloorRoute: Vec3[];
} = {
  id: "bike-student",
  modelUrl: "/models/characters/kien_an_student_lowpoly.glb",
  // The final rear block spans X=-17.8..17.8 and its courtyard-facing facade
  // is Z=-64.5. This is the marked front-right open-courtyard location.
  position: [12.5, .025, -60.0],
  // The character source faces local +Z, toward the courtyard.
  rotationY: 0,
  scale: .9,
  speechHeight: 2.02,
  enterRadius: 4.25,
  leaveRadius: 5,
  dialogue: "Bọn kia, chúng mày giấu xe tao ở đâu rồi",
  unknownReply: "Mày thích điêu không",
  bikeLocatedReply: "Đứa nào treo xe tao lên đó, chúng mày có lấy xuống cho tao không",
  choices: [
    "Tao không biết",
    "Ơ sao Xe đạp mày lại treo lên tầng 3 kìa :))",
  ],
  runSpeed: 3.7,
  // Measured from REAR_STAIR_2 (the central stairwell of the rearmost block).
  // Points alternate between the two flights and their intermediate landings.
  thirdFloorRoute: [
    [-1.22, .025, -60.2], [-1.22, .235, -65.66],
    [-1.22, 2.495, -71.53], [1.22, 2.685, -71.53], [1.22, 4.945, -65.66],
    [-1.22, 5.135, -65.66], [-1.22, 7.395, -71.53], [1.22, 7.585, -71.53],
    [1.22, 9.845, -65.66], [5.2, 9.845, -63.45],
  ],
};
