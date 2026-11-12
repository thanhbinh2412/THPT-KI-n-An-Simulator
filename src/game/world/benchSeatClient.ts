"use client";

import { useGameStore } from "@/game/store/useGameStore";
import { getMultiplayerSocket } from "@/game/multiplayer/socket-client";

/** Server-authoritative three-seat reservation for the stone bench. */
export function requestStoneBenchSeat() {
  const socket = getMultiplayerSocket();
  if (!socket.connected) return;
  socket.emit("bench:occupy", (result) => {
    if (result.success) useGameStore.getState().setBenchSeatIndex(result.seatIndex);
  });
}

export function leaveStoneBenchSeat() {
  useGameStore.getState().setBenchSeatIndex(null);
  const socket = getMultiplayerSocket();
  if (socket.connected) socket.emit("bench:leave");
}
