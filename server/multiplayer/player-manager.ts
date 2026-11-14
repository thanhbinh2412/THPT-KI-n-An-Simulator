import { campusSpawn, campusSeatsById, campusSurfacesById } from "../../src/game/config/campusGameplay";
import { randomUUID } from "node:crypto";
import type { BenchSeatResult, PlayerGender, PlayerMovePayload, PlayerState, Vector3State, SeatActionResult } from "../../src/shared/multiplayer-types";
import { multiplayerConfig } from "./config";

type Session = { player: PlayerState; lastAcceptedAt: number; changed: boolean };
const spawnPositions: Vector3State[] = [0, 1.3, -1.3, 2.6, -2.6, .65].map((offset, index) => ({
  x: campusSpawn[0] + offset, y: campusSpawn[1], z: campusSpawn[2] + (index > 2 ? 1.1 : 0),
}));

export class PlayerManager {
  private readonly sessions = new Map<string, Session>();
  private spawnIndex = 0;

  addPlayer(socketId: string, name: string, gender: PlayerGender) {
    const existing = this.sessions.get(socketId);
    if (existing) return existing.player;
    const position = spawnPositions[this.spawnIndex++ % spawnPositions.length];
    const now = Date.now();
    const player: PlayerState = { id: randomUUID(), name, gender, position: { ...position }, rotationY: Math.PI, locomotion: "idle", benchSeat: null, seatId: null, sequence: 0, updatedAt: now };
    this.sessions.set(socketId, { player, lastAcceptedAt: now, changed: true });
    return player;
  }

  getPlayer(socketId: string) { return this.sessions.get(socketId)?.player; }
  getAllPlayers() { return [...this.sessions.values()].map(({ player }) => player); }
  getOnlineCount() { return this.sessions.size; }
  isFull() { return this.sessions.size >= multiplayerConfig.maxPlayers; }

  updatePlayer(socketId: string, payload: PlayerMovePayload) {
    const session = this.sessions.get(socketId);
    if (!session || payload.sequence <= session.player.sequence) return undefined;
    const seat = session.player.seatId ? campusSeatsById.get(session.player.seatId) : undefined;
    if (seat) {
      session.player = { ...session.player, position: { x: seat.position[0], y: seat.position[1], z: seat.position[2] }, rotationY: seat.rotationY, locomotion: "sit", sequence: payload.sequence, updatedAt: Date.now() };
      session.changed = true; return session.player;
    }
    const now = Date.now();
    const elapsedSeconds = Math.max(.05, (now - session.lastAcceptedAt) / 1000);
    const distance = Math.hypot(payload.position.x - session.player.position.x, payload.position.y - session.player.position.y, payload.position.z - session.player.position.z);
    if (distance > multiplayerConfig.maximumRunSpeed * elapsedSeconds + multiplayerConfig.movementTolerance) return undefined;
    session.player = { ...session.player, position: { ...payload.position }, rotationY: payload.rotationY, locomotion: payload.locomotion, sequence: payload.sequence, updatedAt: now };
    session.lastAcceptedAt = now;
    session.changed = true;
    return session.player;
  }

  occupyBenchSeat(socketId: string): BenchSeatResult {
    const session = this.sessions.get(socketId);
    if (!session) return { success: false, code: "NOT_JOINED" };
    if (session.player.seatId) return { success: false, code: "BENCH_FULL" };
    if (session.player.benchSeat !== null) return { success: true, seatIndex: session.player.benchSeat };
    const occupied = new Set(this.getAllPlayers().map((player) => player.benchSeat).filter((seat): seat is number => seat !== null));
    const seatIndex = [0, 1, 2].find((seat) => !occupied.has(seat));
    if (seatIndex === undefined) return { success: false, code: "BENCH_FULL" };
    session.player = { ...session.player, benchSeat: seatIndex, updatedAt: Date.now() };
    session.changed = true;
    return { success: true, seatIndex };
  }

  leaveBenchSeat(socketId: string) {
    const session = this.sessions.get(socketId);
    if (!session || session.player.benchSeat === null) return;
    session.player = { ...session.player, benchSeat: null, updatedAt: Date.now() };
    session.changed = true;
  }

  occupySeat(socketId: string, seatId: string): SeatActionResult {
    const session = this.sessions.get(socketId), seat = campusSeatsById.get(seatId);
    if (!session) return { success: false, code: "NOT_JOINED", message: "Bạn cần vào trường trước." };
    if (!seat) return { success: false, code: "INVALID_TARGET", message: "Không tìm thấy chỗ ngồi." };
    if (session.player.seatId === seatId) return { success: true, seatId, position: seat.position };
    if (session.player.seatId || session.player.benchSeat !== null) return { success: false, code: "ALREADY_SEATED", message: "Hãy đứng dậy trước khi đổi ghế." };
    if (!this.isNear(socketId, seat.approach, seat.radius + .45)) return { success: false, code: "TOO_FAR", message: "Hãy đến gần lối vào chỗ ngồi." };
    if (this.getAllPlayers().some(player => player.seatId === seatId)) return { success: false, code: "OCCUPIED", message: "Chỗ này đã có người ngồi." };
    session.player = { ...session.player, seatId, benchSeat: null, position: { x: seat.position[0], y: seat.position[1], z: seat.position[2] }, rotationY: seat.rotationY, locomotion: "sit", updatedAt: Date.now() };
    session.lastAcceptedAt = Date.now(); session.changed = true;
    return { success: true, seatId, position: seat.position };
  }

  leaveSeat(socketId: string): SeatActionResult {
    const session = this.sessions.get(socketId);
    if (!session) return { success: false, code: "NOT_JOINED", message: "Bạn cần vào trường trước." };
    const seat = session.player.seatId ? campusSeatsById.get(session.player.seatId) : undefined;
    const position: [number, number, number] = seat?.exitPositions[0] ?? [session.player.position.x, session.player.position.y, session.player.position.z];
    session.player = { ...session.player, seatId: null, position: { x: position[0], y: position[1], z: position[2] }, locomotion: "idle", updatedAt: Date.now() };
    session.lastAcceptedAt = Date.now(); session.changed = true;
    return { success: true, seatId: null, position };
  }

  standOnSurface(socketId: string, surfaceId: string): SeatActionResult {
    const session = this.sessions.get(socketId), surface = campusSurfacesById.get(surfaceId);
    if (!session) return { success: false, code: "NOT_JOINED", message: "Bạn cần vào trường trước." };
    if (!surface) return { success: false, code: "INVALID_TARGET", message: "Không tìm thấy mặt bàn." };
    if (session.player.seatId || session.player.benchSeat !== null) return { success: false, code: "ALREADY_SEATED", message: "Hãy đứng dậy trước." };
    if (!this.isNear(socketId, surface.approach, surface.radius + .45)) return { success: false, code: "TOO_FAR", message: "Hãy đến gần bàn giáo viên." };
    const position = surface.position;
    session.player = { ...session.player, position: { x: position[0], y: position[1], z: position[2] }, locomotion: "idle", updatedAt: Date.now() };
    session.lastAcceptedAt = Date.now(); session.changed = true;
    return { success: true, seatId: null, position };
  }

  isNear(socketId: string, position: [number, number, number], radius: number) {
    const player = this.getPlayer(socketId); if (!player) return false;
    return Math.hypot(player.position.x-position[0], player.position.z-position[2]) <= radius && Math.abs(player.position.y-position[1]) < 1.35;
  }

  removePlayer(socketId: string) { const player = this.sessions.get(socketId)?.player; this.sessions.delete(socketId); return player; }
  getChangedPlayers() { const changed: PlayerState[] = []; this.sessions.forEach((session) => { if (session.changed) { changed.push(session.player); session.changed = false; } }); return changed; }
}
