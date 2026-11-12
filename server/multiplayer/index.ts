import type { Server } from "socket.io";
import type { ClientToServerEvents, PlayerMovePayload, ServerToClientEvents } from "../../src/shared/multiplayer-types";
import { multiplayerConfig } from "./config";
import { PlayerManager } from "./player-manager";

const WORLD_ROOM = "shared-world";
const locomotion = new Set(["idle", "walk", "run", "jump", "fall", "land", "stairs", "sit"]);

function validName(value: unknown) {
  if (typeof value !== "string") return undefined;
  const name = value.trim();
  if (name.length < multiplayerConfig.minNameLength || name.length > multiplayerConfig.maxNameLength || /[\u0000-\u001f\u007f-\u009f]/.test(name)) return undefined;
  return name;
}

function validGender(value: unknown): value is "male" | "female" { return value === "male" || value === "female"; }

function validMove(value: unknown): value is PlayerMovePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as PlayerMovePayload;
  const p = payload.position;
  const b = multiplayerConfig.worldBounds;
  return !!p && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z) && p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY && p.z >= b.minZ && p.z <= b.maxZ && Number.isFinite(payload.rotationY) && Number.isInteger(payload.sequence) && payload.sequence >= 0 && locomotion.has(payload.locomotion);
}

export function initializeMultiplayer(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  const players = new PlayerManager();
  const lastMoveAt = new Map<string, number>();
  const emitCount = () => io.emit("world:online-count", { count: players.getOnlineCount() });
  const remove = (socketId: string) => { const player = players.removePlayer(socketId); if (player) { io.to(WORLD_ROOM).emit("player:left", { playerId: player.id }); emitCount(); } };

  io.on("connection", (socket) => {
    socket.on("world:online-count", (acknowledgement) => acknowledgement({ count: players.getOnlineCount() }));
    socket.on("player:join", (payload, acknowledgement) => {
      const name = validName(payload?.name);
      if (!name) return acknowledgement({ success: false, code: "INVALID_NAME", message: "Tên phải có từ 2 đến 24 ký tự hợp lệ." });
      if (!validGender(payload?.gender)) return acknowledgement({ success: false, code: "JOIN_FAILED", message: "Vui lòng chọn nhân vật Nam hoặc Nữ." });
      const existing = players.getPlayer(socket.id);
      if (existing) return acknowledgement({ success: true, player: existing, players: players.getAllPlayers(), onlineCount: players.getOnlineCount(), serverTime: Date.now() });
      if (players.isFull()) return acknowledgement({ success: false, code: "WORLD_FULL", message: "Trường hiện đã đủ người tham gia." });
      const player = players.addPlayer(socket.id, name, payload.gender);
      const existingPlayers = players.getAllPlayers().filter((item) => item.id !== player.id);
      socket.join(WORLD_ROOM);
      acknowledgement({ success: true, player, players: existingPlayers, onlineCount: players.getOnlineCount(), serverTime: Date.now() });
      socket.to(WORLD_ROOM).emit("player:joined", { player });
      emitCount();
      console.info(`[multiplayer] player joined (${players.getOnlineCount()} online)`);
    });
    socket.on("player:move", (payload) => {
      const now = Date.now();
      const previous = lastMoveAt.get(socket.id) ?? 0;
      if (now - previous < 1000 / multiplayerConfig.maxMoveEventsPerSecond) return;
      lastMoveAt.set(socket.id, now);
      if (validMove(payload)) players.updatePlayer(socket.id, payload);
    });
    socket.on("bench:occupy", (acknowledgement) => acknowledgement(players.occupyBenchSeat(socket.id)));
    socket.on("bench:leave", (acknowledgement) => { players.leaveBenchSeat(socket.id); acknowledgement?.(); });
    socket.on("player:leave", (acknowledgement) => { remove(socket.id); socket.leave(WORLD_ROOM); acknowledgement?.(); });
    socket.on("disconnect", () => { lastMoveAt.delete(socket.id); remove(socket.id); });
  });

  const deltaTimer = setInterval(() => { const changed = players.getChangedPlayers(); if (changed.length) io.to(WORLD_ROOM).volatile.emit("world:snapshot", { type: "delta", serverTime: Date.now(), players: changed }); }, Math.round(1000 / multiplayerConfig.snapshotRate));
  const fullTimer = setInterval(() => io.to(WORLD_ROOM).emit("world:snapshot", { type: "full", serverTime: Date.now(), players: players.getAllPlayers() }), multiplayerConfig.fullSnapshotIntervalMs);
  return { close() { clearInterval(deltaTimer); clearInterval(fullTimer); } };
}
