"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@/shared/multiplayer-types";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | undefined;

export function getMultiplayerSocket() {
  if (typeof window === "undefined") throw new Error("Socket.IO can only be created in the browser.");
  socket ??= io({ path: "/socket.io", autoConnect: false, reconnection: true, reconnectionDelay: 1000, reconnectionDelayMax: 5000 });
  return socket;
}
