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
  position: [33.5, .025, 15.0],
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
  // V02 right-wing stairs: courtyard approach, two switchbacks, upper corridor.
  thirdFloorRoute: [
    [34.8, .025, 20.5], [36.9, .33, 20.5], [39, .33, 19.25],
    [46.8, 2.15, 19.25], [46.8, 2.15, 21.8], [39, 3.98, 21.8],
    [39, 3.98, 19.25], [46.8, 5.8, 19.25], [46.8, 5.8, 21.8],
    [39, 7.63, 21.8], [36.9, 7.63, 21.8],
  ],
};
