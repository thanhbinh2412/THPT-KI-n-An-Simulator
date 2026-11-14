"use client";

import { CampusModel } from "./CampusModel";
import { BikeStudentNpc } from "./BikeStudentNpc";
import { GateGreeter } from "./GateGreeter";
import { SkyEnvironment } from "./SkyEnvironment";
import { SittingStudentNpc } from "./SittingStudentNpc";
import { TeacherNpc } from "./TeacherNpc";
import { StoneBench } from "./StoneBench";
import { CourtyardNpcCrowd } from "./CourtyardNpcCrowd";

/** The V61 GLB is the complete campus visual; its navigation layer is separate. */
export function SchoolWorld({ collisionsEnabled = true }: { collisionsEnabled?: boolean }) {
  return <>
    <SkyEnvironment />
    {/* V75 preserves its authored MeshStandardMaterials, so it needs actual
        environment lighting rather than the old unlit-only campus path. */}
    <hemisphereLight args={["#c9e3ff", "#6d5847", 2.15]} />
    <directionalLight
      position={[45, 75, 35]}
      intensity={3.4}
      castShadow
      shadow-mapSize-width={2048}
      shadow-mapSize-height={2048}
      shadow-bias={-0.0005}
      shadow-normalBias={0.02}
      shadow-camera-left={-70}
      shadow-camera-right={70}
      shadow-camera-top={90}
      shadow-camera-bottom={-90}
    />
    <CampusModel collisionsEnabled={collisionsEnabled} />
    <BikeStudentNpc />
    <GateGreeter />
    <TeacherNpc />
    <SittingStudentNpc />
    <StoneBench />
    <CourtyardNpcCrowd />
  </>;
}
