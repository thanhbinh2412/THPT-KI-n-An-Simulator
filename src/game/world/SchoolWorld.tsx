"use client";

import { CampusModel } from "./CampusModel";
import { BikeStudentNpc } from "./BikeStudentNpc";
import { GateGreeter } from "./GateGreeter";
import { SkyEnvironment } from "./SkyEnvironment";
import { SittingStudentNpc } from "./SittingStudentNpc";
import { TeacherNpc } from "./TeacherNpc";
import { StoneBench } from "./StoneBench";

/** The V61 GLB is the complete campus visual; its navigation layer is separate. */
export function SchoolWorld() {
  return <>
    <SkyEnvironment />
    <CampusModel />
    <BikeStudentNpc />
    <GateGreeter />
    <TeacherNpc />
    <SittingStudentNpc />
    <StoneBench />
  </>;
}
