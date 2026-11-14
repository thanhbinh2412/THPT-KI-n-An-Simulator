"use client";
import { Html } from "@react-three/drei";
import { campusDoors } from "@/game/config/campusGameplay";
import { interactions } from "@/game/config/school.config";
import { useGameStore } from "@/game/store/useGameStore";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";

/** Only the reachable target chosen by the physics query receives a marker. */
export function InteractionBeacon() {
  const id = useGameStore((store) => store.nearbyId);
  const teacher = useGameStore((store) => store.teacherPosition);
  const paused = useGameStore((store) => store.paused);
  const dialog = useGameStore((store) => store.activeDialog);
  const target = campusDoors.find((door) => door.id === id) ?? interactions.find((item) => item.id === id);
  const position = id === "teacher-tam" ? teacher : id === stoneBenchConfig.id ? stoneBenchConfig.interactionPosition : target?.position;
  if (!position || paused || dialog) return null;
  return <Html position={[position[0], position[1] + 1.35, position[2]]} center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-200/80 bg-slate-950/80 text-sm font-bold text-amber-100 shadow-lg" aria-hidden="true">
      {id === stoneBenchConfig.id ? "G" : "E"}
    </div>
  </Html>;
}
