import type { Server } from "socket.io";
import type { ClientToServerEvents, PlayerMovePayload, ServerToClientEvents } from "../../src/shared/multiplayer-types";
import { multiplayerConfig } from "./config";
import { PlayerManager } from "./player-manager";
import { ChatManager } from "./chat-manager";
import { nearbyVoicePeers } from "./voice-proximity";

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
  const chat = new ChatManager();
  const lastMoveAt = new Map<string, number>();
  const lastChatAt = new Map<string, number>();
  const voice = new Map<string, { enabled: boolean; muted: boolean; speaking: boolean }>();
  let voicePeers = new Map<string, string[]>();
  const emitCount = () => io.emit("world:online-count", { count: players.getOnlineCount() });
  const emitVoiceState = (socketId: string) => { const player = players.getPlayer(socketId); const state = voice.get(socketId); if (player && state) io.to(WORLD_ROOM).emit("voice:state", { playerId: player.id, ...state }); };
  const remove = (socketId: string) => { lastChatAt.delete(socketId); const player = players.removePlayer(socketId); voice.delete(socketId); if (player) { io.to(WORLD_ROOM).emit("player:left", { playerId: player.id }); io.to(WORLD_ROOM).emit("voice:peer-left", { playerId: player.id }); emitCount(); } };
  const canSignal = (socketId: string, targetPlayerId: string) => voicePeers.get(socketId)?.includes(targetPlayerId) ?? false;
  const targetSocket = (playerId: string) => [...voice.keys()].find((socketId) => players.getPlayer(socketId)?.id === playerId);

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
      socket.emit("chat:history", { messages: chat.getRecent() });
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
    socket.on("voice:enable", (payload, acknowledgement) => {
      if (!players.getPlayer(socket.id) || !payload || typeof payload.enabled !== "boolean" || typeof payload.muted !== "boolean") return acknowledgement?.({ success: false, message: "Voice state không hợp lệ." });
      voice.set(socket.id, { enabled: payload.enabled, muted: payload.muted, speaking: false }); emitVoiceState(socket.id); acknowledgement?.({ success: true });
    });
    socket.on("voice:state", (payload) => { const state = voice.get(socket.id); if (!state || !state.enabled || !payload || typeof payload.muted !== "boolean" || typeof payload.speaking !== "boolean") return; state.muted = payload.muted; state.speaking = state.muted ? false : payload.speaking; emitVoiceState(socket.id); });
    (["voice:offer", "voice:answer", "voice:ice-candidate"] as const).forEach((event) => socket.on(event, (payload) => { if (!payload || typeof payload.targetPlayerId !== "string" || !canSignal(socket.id, payload.targetPlayerId)) return; const target = targetSocket(payload.targetPlayerId); const sender = players.getPlayer(socket.id); if (!target || !sender) return; if (event === "voice:offer" && payload.description?.type === "offer") io.to(target).emit("voice:offer", { playerId: sender.id, targetPlayerId: payload.targetPlayerId, description: payload.description }); else if (event === "voice:answer" && payload.description?.type === "answer") io.to(target).emit("voice:answer", { playerId: sender.id, targetPlayerId: payload.targetPlayerId, description: payload.description }); else if (event === "voice:ice-candidate" && payload.candidate) io.to(target).emit("voice:ice-candidate", { playerId: sender.id, targetPlayerId: payload.targetPlayerId, candidate: payload.candidate }); }));
    socket.on("chat:send", (payload, acknowledgement) => {
      const player = players.getPlayer(socket.id);
      if (!player) return acknowledgement({ success: false, code: "NOT_JOINED", message: "Bạn cần vào trường trước khi chat." });
      if (!payload || typeof payload !== "object" || Object.keys(payload).some((key) => key !== "content") || typeof payload.content !== "string") return acknowledgement({ success: false, code: "INVALID_MESSAGE", message: "Tin nhắn không hợp lệ." });
      const content = payload.content.trim();
      if (!content || [...content].length > 200 || /[\u0000-\u001f\u007f-\u009f]/.test(content)) return acknowledgement({ success: false, code: "INVALID_MESSAGE", message: "Tin nhắn phải có từ 1 đến 200 ký tự hợp lệ." });
      const now = Date.now();
      if (now - (lastChatAt.get(socket.id) ?? 0) < 900) return acknowledgement({ success: false, code: "RATE_LIMITED", message: "Bạn đang gửi tin nhắn quá nhanh." });
      lastChatAt.set(socket.id, now);
      const message = chat.add(player.id, player.name, content);
      io.to(WORLD_ROOM).emit("chat:message", message);
      acknowledgement({ success: true, messageId: message.id });
    });
    socket.on("player:leave", (acknowledgement) => { remove(socket.id); socket.leave(WORLD_ROOM); acknowledgement?.(); });
    socket.on("disconnect", () => { lastMoveAt.delete(socket.id); lastChatAt.delete(socket.id); remove(socket.id); });
  });

  const deltaTimer = setInterval(() => { const changed = players.getChangedPlayers(); if (changed.length) io.to(WORLD_ROOM).volatile.emit("world:snapshot", { type: "delta", serverTime: Date.now(), players: changed }); }, Math.round(1000 / multiplayerConfig.snapshotRate));
  const fullTimer = setInterval(() => io.to(WORLD_ROOM).emit("world:snapshot", { type: "full", serverTime: Date.now(), players: players.getAllPlayers() }), multiplayerConfig.fullSnapshotIntervalMs);
  const voiceTimer = setInterval(() => { const enabled = new Set([...voice].filter(([, state]) => state.enabled).map(([socketId]) => socketId)); const next = nearbyVoicePeers(players, enabled); voice.forEach((_, socketId) => { const nextPeers = next.get(socketId) ?? []; const previous = voicePeers.get(socketId) ?? []; previous.filter((id) => !nextPeers.includes(id)).forEach((playerId) => io.to(socketId).emit("voice:peer-left", { playerId })); io.to(socketId).emit("voice:peers", { playerIds: nextPeers }); }); voicePeers = next; }, 500);
  return { close() { clearInterval(deltaTimer); clearInterval(fullTimer); clearInterval(voiceTimer); } };
}
