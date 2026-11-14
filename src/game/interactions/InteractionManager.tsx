"use client";
import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useRapier } from "@react-three/rapier";
import { interactions } from "@/game/config/school.config";
import { campusDoors, campusSeats, campusStandingSurfaces, campusLightSwitches } from "@/game/config/campusGameplay";
import { useGameStore } from "@/game/store/useGameStore";
import { useMultiplayer } from "@/game/multiplayer/MultiplayerProvider";
import { teacherNpcConfig } from "@/game/world/teacherNpc.config";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";
import { activateNearby } from "./activateNearby";
import { InteractionBeacon } from "./InteractionBeacon";

export function InteractionManager() {
  const { world, rapier } = useRapier();
  const { localPlayer } = useMultiplayer();
  const lastCheck = useRef(0);
  useFrame(({ clock }) => {
    if (clock.elapsedTime - lastCheck.current < .09) return;
    lastCheck.current = clock.elapsedTime;
    const store = useGameStore.getState();
    if (!localPlayer || store.paused || store.activeDialog) {
      if (store.nearbyId) store.setNearbyId(null);
      return;
    }
    if (store.activeSeatId) { if (store.nearbyId) store.setNearbyId(null); return; }
    const position = store.playerPosition;
    const seats = campusSeats.filter(seat => !store.occupiedSeats[seat.id] && Math.hypot(position[0]-seat.approach[0], position[2]-seat.approach[2]) <= seat.radius && Math.abs(position[1]-seat.approach[1]) < .6);
    const actions = [...seats, ...campusStandingSurfaces].map(item => ({ ...item, radius: item.reachDistance, approach: item.approach }));
    const candidates = [
      ...campusDoors,
      ...actions, ...campusLightSwitches,
      ...interactions,
      { id: "teacher-tam", position: store.teacherPosition, radius: teacherNpcConfig.interactionRadius },
      { id: stoneBenchConfig.id, position: stoneBenchConfig.interactionPosition, radius: stoneBenchConfig.interactionRadius },
    ].map((item) => ({ ...item, distance: Math.hypot(position[0]-item.position[0], position[2]-item.position[2]) }))
      .filter((item) => item.distance <= item.radius && Math.abs(position[1]-item.position[1]) < 1.35 && (!('approach' in item) || Math.hypot(position[0]-(item.approach as [number,number,number])[0], position[2]-(item.approach as [number,number,number])[2]) <= 1.1))
      .sort((a,b) => a.distance-b.distance);
    const reachable = candidates.filter((item) => {
      if (item.distance < .25) return true;
      // A horizontal chest-height ray prevents use through walls and floors.
      const origin = { x: position[0], y: position[1]+.35, z: position[2] };
      const direction = { x: (item.position[0]-position[0])/item.distance, y: 0, z: (item.position[2]-position[2])/item.distance };
      const hit = world.castRay(new rapier.Ray(origin, direction), Math.max(0, item.distance-.35), true,
        undefined, undefined, undefined, undefined,
        (collider) => {
          const body = collider.parent();
          const data = body?.userData as { doorId?: string; navigation?: boolean } | undefined;
          return Boolean(data?.navigation || (data?.doorId && data.doorId !== item.id));
        });
      return !hit;
    });
    const seatIds = reachable.map(item => item.id);
    if (seatIds.join() !== store.interactionChoices.join()) store.setInteractionChoices(seatIds);
    const preferred = store.preferredInteractionId;
    const id = (preferred && seatIds.includes(preferred) ? preferred : reachable[0]?.id) ?? null;
    if (id !== store.nearbyId) store.setNearbyId(id);
  });
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (!localPlayer || event.repeat || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement ||
          (target instanceof HTMLElement && target.isContentEditable)) return;
      const store = useGameStore.getState();
      if (event.code === "Escape") {
        if (store.activeDialog) store.setDialog(null); else store.setPaused(!store.paused);
        return;
      }
      if (store.paused || store.activeDialog) return;
      if (event.code === "KeyE" || (event.code === "KeyG" && (store.nearbyId === stoneBenchConfig.id || store.benchSeatIndex !== null))) activateNearby();
      if (event.code === "KeyR") store.cycleInteractionChoice();
      if (event.code === "KeyV") store.toggleCamera();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [localPlayer]);
  return <InteractionBeacon />;
}
