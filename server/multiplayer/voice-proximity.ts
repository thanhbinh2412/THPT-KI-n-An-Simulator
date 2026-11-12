import type { PlayerManager } from "./player-manager";
const MAX_DISTANCE = 20; const MAX_PEERS = 6;
/** Builds symmetric, closest-first assignments with a bounded peer count. */
export function nearbyVoicePeers(players: PlayerManager, voiceSocketIds: Set<string>) {
  const active = [...voiceSocketIds].map((socketId) => ({ socketId, player: players.getPlayer(socketId) })).filter((item): item is { socketId: string; player: NonNullable<ReturnType<PlayerManager["getPlayer"]>> } => Boolean(item.player));
  const pairs: Array<{ a: typeof active[number]; b: typeof active[number]; distance: number }> = [];
  for (let index = 0; index < active.length; index += 1) for (let next = index + 1; next < active.length; next += 1) { const a = active[index]; const b = active[next]; const distance = Math.hypot(a.player.position.x - b.player.position.x, a.player.position.y - b.player.position.y, a.player.position.z - b.player.position.z); if (distance <= MAX_DISTANCE) pairs.push({ a, b, distance }); }
  pairs.sort((left, right) => left.distance - right.distance);
  const result = new Map<string, string[]>(); active.forEach(({ socketId }) => result.set(socketId, []));
  pairs.forEach(({ a, b }) => { const aa = result.get(a.socketId)!; const bb = result.get(b.socketId)!; if (aa.length < MAX_PEERS && bb.length < MAX_PEERS) { aa.push(b.player.id); bb.push(a.player.id); } });
  return result;
}
