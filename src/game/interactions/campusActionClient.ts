"use client";
import { getMultiplayerSocket } from "@/game/multiplayer/socket-client";
import { useGameStore } from "@/game/store/useGameStore";
import type { SeatActionResult, WorldActionResult } from "@/shared/multiplayer-types";

function begin() {
  const store = useGameStore.getState(), socket = getMultiplayerSocket();
  if (store.interactionPending || !socket.connected) return false;
  store.setInteractionMessage(null); store.setInteractionPending(true); return true;
}
function finish(error: Error | null, result?: WorldActionResult | SeatActionResult) {
  const store = useGameStore.getState(); store.setInteractionPending(false);
  if (error || !result) { store.setInteractionMessage("Mất kết nối khi thao tác. Hãy thử lại."); return false; }
  if (!result.success) { store.setInteractionMessage(result.message); return false; }
  return true;
}
export function requestSeat(seatId: string) {
  if (!begin()) return;
  getMultiplayerSocket().timeout(5000).emit("seat:occupy", { seatId }, (error, result?: SeatActionResult) => {
    if (finish(error, result) && result?.success) useGameStore.getState().setActiveSeat(result.seatId);
  });
}
export function leaveClassroomSeat() {
  if (!begin()) return;
  getMultiplayerSocket().timeout(5000).emit("seat:leave", (error, result?: SeatActionResult) => {
    if (finish(error, result) && result?.success) {
      const store = useGameStore.getState(); store.setActiveSeat(null); store.teleportPlayer(result.position);
    }
  });
}
export function requestStandingSurface(surfaceId: string) {
  if (!begin()) return;
  getMultiplayerSocket().timeout(5000).emit("surface:stand", { surfaceId }, (error, result?: SeatActionResult) => {
    if (finish(error, result) && result?.success) useGameStore.getState().teleportPlayer(result.position);
  });
}
export function requestLight(roomId: string) {
  if (!begin()) return;
  getMultiplayerSocket().timeout(5000).emit("light:toggle", { roomId }, finish);
}
export function requestSharedDoor(doorId: string) {
  if (!begin()) return;
  getMultiplayerSocket().timeout(5000).emit("door:toggle", { doorId }, finish);
}
