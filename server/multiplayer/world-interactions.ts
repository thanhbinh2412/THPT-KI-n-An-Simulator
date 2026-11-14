import { campusDoors, campusLights } from "../../src/game/config/campusGameplay";
import type { WorldActionResult, WorldInteractionState } from "../../src/shared/multiplayer-types";
import type { PlayerManager } from "./player-manager";

/** One shared state for all visitors, including safe deferred door closing. */
export class WorldInteractions {
  private doors = Object.fromEntries(campusDoors.map(door => [door.id, door.gate === "main"]));
  private lights = Object.fromEntries(campusLights.map(light => [light.id, light.defaultOn]));
  private pending = new Set<string>();
  constructor(private players: PlayerManager) {}

  snapshot(): WorldInteractionState {
    return { doors: { ...this.doors }, lights: { ...this.lights }, pendingDoors: [...this.pending],
      seats: Object.fromEntries(this.players.getAllPlayers().filter(player => player.seatId).map(player => [player.seatId!, player.id])) };
  }
  toggleLight(socketId: string, roomId: string): WorldActionResult {
    const light = campusLights.find(light => light.id === roomId);
    if (!light) return { success: false, code: "INVALID_TARGET", message: "Không tìm thấy công tắc." };
    if (!light.switches.some(target => this.players.isNear(socketId, target.position, target.radius + .45))) return { success: false, code: "TOO_FAR", message: "Hãy đến gần công tắc." };
    this.lights[roomId] = !this.lights[roomId]; return { success: true };
  }
  toggleDoor(socketId: string, doorId: string): WorldActionResult {
    const door = campusDoors.find(door => door.id === doorId);
    if (!door) return { success: false, code: "INVALID_TARGET", message: "Không tìm thấy cửa." };
    if (!this.players.isNear(socketId, door.position, door.radius + .45)) return { success: false, code: "TOO_FAR", message: "Hãy đến gần cửa." };
    if (this.pending.has(doorId)) this.pending.delete(doorId);
    else if (this.doors[doorId]) this.pending.add(doorId);
    else this.doors[doorId] = true;
    this.tick(); return { success: true };
  }
  tick() {
    let changed = false;
    for (const id of this.pending) {
      const door = campusDoors.find(door => door.id === id)!;
      const occupied = this.players.getAllPlayers().some(player => door.leaves.some(leaf => {
        const radius = Math.hypot(leaf.center[0], leaf.center[2]) + Math.hypot(leaf.halfExtents[0], leaf.halfExtents[2]) + .55;
        return Math.abs(player.position.y - (leaf.pivot[1]+leaf.center[1])) < leaf.halfExtents[1]+1 && Math.hypot(player.position.x-leaf.pivot[0], player.position.z-leaf.pivot[2]) < radius;
      }));
      if (!occupied) { this.doors[id] = false; this.pending.delete(id); changed = true; }
    }
    return changed;
  }
}
