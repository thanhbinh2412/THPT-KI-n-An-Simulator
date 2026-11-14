import { campusDoors } from "@/game/config/campusGameplay";
import { useGameStore } from "@/game/store/useGameStore";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";
import { leaveStoneBenchSeat, requestStoneBenchSeat } from "@/game/world/benchSeatClient";

/** Shared by keyboard, the HUD and mobile USE. */
export function activateNearby() {
  const store = useGameStore.getState();
  if (store.paused || store.activeDialog) return;
  const id = store.nearbyId;
  if (store.benchSeatIndex !== null) { leaveStoneBenchSeat(); return; }
  if (id === stoneBenchConfig.id) { requestStoneBenchSeat(); return; }
  if (id === "teacher-tam") { if (document.pointerLockElement) void document.exitPointerLock(); store.requestTeacherGreeting(); return; }
  const door = campusDoors.find((item) => item.id === id);
  if (door?.gate) store.requestCampusGateToggle(door.gate);
  else if (door) store.requestClassroomDoorToggle(door.id);
  else if (id) { if (document.pointerLockElement) void document.exitPointerLock(); store.setDialog(id); }
}
