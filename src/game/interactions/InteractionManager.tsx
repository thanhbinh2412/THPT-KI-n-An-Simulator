"use client";
import { useEffect } from "react";
import { interactions } from "@/game/config/school.config";
import { useGameStore } from "@/game/store/useGameStore";
import { classrooms, isClassroomDoorId } from "@/game/classrooms/classroom.config";
import { useMultiplayer } from "@/game/multiplayer/MultiplayerProvider";
import { teacherNpcConfig } from "@/game/world/teacherNpc.config";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";
import { leaveStoneBenchSeat, requestStoneBenchSeat } from "@/game/world/benchSeatClient";

export function InteractionManager() {
  const position = useGameStore((s) => s.playerPosition); const nearbyId = useGameStore((s) => s.nearbyId); const teacherPosition = useGameStore((s) => s.teacherPosition);
  const { localPlayer } = useMultiplayer();
  useEffect(() => {
    const nearby = [
      ...interactions.map((item) => ({ id: item.id, position: item.position, radius: item.radius })),
      ...classrooms.map((classroom) => ({ id: classroom.id, position: classroom.interactionPosition, radius: 2.05 })),
      { id: "teacher-tam", position: teacherPosition, radius: teacherNpcConfig.interactionRadius },
      { id: stoneBenchConfig.id, position: stoneBenchConfig.interactionPosition, radius: stoneBenchConfig.interactionRadius },
    ].map((item) => ({ ...item, distance: Math.hypot(position[0] - item.position[0], position[1] - item.position[1], position[2] - item.position[2]) }))
      .filter((item) => item.distance <= item.radius)
      .sort((left, right) => left.distance - right.distance)[0]?.id ?? null;
    if (nearby !== nearbyId) useGameStore.getState().setNearbyId(nearby);
  }, [position, nearbyId, teacherPosition]);
  useEffect(() => {
    // A real button is shown for this interaction, so free the cursor once
    // when it becomes available. Clicking the canvas later restores normal
    // pointer-lock camera control.
    if (nearbyId === "teacher-tam" && document.pointerLockElement) void document.exitPointerLock();
  }, [nearbyId]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (!localPlayer || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return; if (event.code === "KeyG" && !event.repeat) { const store = useGameStore.getState(); if (store.benchSeatIndex !== null) leaveStoneBenchSeat(); else if (store.nearbyId === stoneBenchConfig.id) requestStoneBenchSeat(); } if (event.code === "KeyE") { const id = useGameStore.getState().nearbyId; if (id === "teacher-tam") useGameStore.getState().requestTeacherGreeting(); else if (id === "campus-gate-main") useGameStore.getState().requestCampusGateToggle("main"); else if (id === "campus-gate-left") useGameStore.getState().requestCampusGateToggle("left"); else if (id === "campus-gate-right") useGameStore.getState().requestCampusGateToggle("right"); else if (isClassroomDoorId(id)) useGameStore.getState().requestClassroomDoorToggle(id); else if (id) useGameStore.getState().setDialog(id); } if (event.code === "KeyV") useGameStore.getState().toggleCamera(); if (event.code === "Escape") useGameStore.getState().setPaused(true); };
    window.addEventListener("keydown", handler); return () => window.removeEventListener("keydown", handler);
  }, [localPlayer]);
  return null;
}
