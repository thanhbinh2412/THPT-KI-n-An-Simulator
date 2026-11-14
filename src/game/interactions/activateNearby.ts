import { campusDoors, campusSeatsById, campusSurfacesById, campusLightSwitches } from "@/game/config/campusGameplay";
import { useGameStore } from "@/game/store/useGameStore";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";
import { leaveStoneBenchSeat, requestStoneBenchSeat } from "@/game/world/benchSeatClient";
import { leaveClassroomSeat, requestSeat, requestStandingSurface, requestLight, requestSharedDoor } from "./campusActionClient";

/** Shared by keyboard, the HUD and mobile USE. */
export function activateNearby() {
  const store = useGameStore.getState();
  if (store.paused || store.activeDialog || store.interactionPending) return;
  const id = store.nearbyId;
  if (store.activeSeatId) { leaveClassroomSeat(); return; }
  if (store.benchSeatIndex !== null) { leaveStoneBenchSeat(); return; }
  if (id === stoneBenchConfig.id) { requestStoneBenchSeat(); return; }
  if (id === "teacher-tam") { if (document.pointerLockElement) void document.exitPointerLock(); store.requestTeacherGreeting(); return; }
  if (id && campusSeatsById.has(id)) { requestSeat(id); return; }
  if (id && campusSurfacesById.has(id)) { requestStandingSurface(id); return; }
  const light = campusLightSwitches.find(target => target.id === id);
  if (light) { requestLight(light.roomId); return; }
  const door = campusDoors.find((item) => item.id === id);
  if (door) requestSharedDoor(door.id);
  else if (id) { if (document.pointerLockElement) void document.exitPointerLock(); store.setDialog(id); }
}
