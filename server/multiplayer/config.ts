function positiveInteger(value: string | undefined, fallback: number, minimum = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
}

export const multiplayerConfig = {
  maxPlayers: positiveInteger(process.env.MULTIPLAYER_MAX_PLAYERS, 50),
  snapshotRate: positiveInteger(process.env.MULTIPLAYER_SNAPSHOT_RATE, 15),
  fullSnapshotIntervalMs: positiveInteger(process.env.MULTIPLAYER_FULL_SNAPSHOT_INTERVAL_MS, 5000, 1000),
  maxNameLength: positiveInteger(process.env.MULTIPLAYER_MAX_NAME_LENGTH, 24, 2),
  minNameLength: positiveInteger(process.env.MULTIPLAYER_MIN_NAME_LENGTH, 2, 1),
  // These broad bounds cover the campus and road while rejecting malformed teleport packets.
  worldBounds: { minX: -120, maxX: 120, minY: -3, maxY: 30, minZ: -120, maxZ: 120 },
  maximumRunSpeed: 6.4,
  movementTolerance: 2.25,
  maxMoveEventsPerSecond: positiveInteger(process.env.MULTIPLAYER_MAX_MOVE_EVENTS_PER_SECOND, 30),
} as const;
