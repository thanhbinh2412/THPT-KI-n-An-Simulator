import { randomUUID } from "node:crypto";
import type { BenchSeatResult, PlayerGender, PlayerMovePayload, PlayerState, Vector3State } from "../../src/shared/multiplayer-types";
import { multiplayerConfig } from "./config";

type Session = { player: PlayerState; lastAcceptedAt: number; changed: boolean };
const spawnPositions: Vector3State[] = [
  { x: 0, y: .86, z: 39.8 }, { x: 1.4, y: .86, z: 39.8 }, { x: -1.4, y: .86, z: 39.8 },
  { x: 2.7, y: .86, z: 40.8 }, { x: -2.7, y: .86, z: 40.8 }, { x: 0, y: .86, z: 41.4 },
];

export class PlayerManager {
  private readonly sessions = new Map<string, Session>();
  private spawnIndex = 0;

  addPlayer(socketId: string, name: string, gender: PlayerGender) {
    const existing = this.sessions.get(socketId);
    if (existing) return existing.player;
    const position = spawnPositions[this.spawnIndex++ % spawnPositions.length];
    const now = Date.now();
    const player: PlayerState = { id: randomUUID(), name, gender, position: { ...position }, rotationY: Math.PI, locomotion: "idle", benchSeat: null, sequence: 0, updatedAt: now };
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

  removePlayer(socketId: string) { const player = this.sessions.get(socketId)?.player; this.sessions.delete(socketId); return player; }
  getChangedPlayers() { const changed: PlayerState[] = []; this.sessions.forEach((session) => { if (session.changed) { changed.push(session.player); session.changed = false; } }); return changed; }
}
