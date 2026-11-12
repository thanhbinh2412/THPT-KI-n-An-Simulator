export type Vector3State = { x: number; y: number; z: number };
export type PlayerGender = "male" | "female";

export type LocomotionState = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "stairs" | "sit";

export type PlayerState = {
  id: string;
  name: string;
  gender: PlayerGender;
  position: Vector3State;
  rotationY: number;
  locomotion: LocomotionState;
  /** Null when standing; the authoritative server assigns one of 3 bench seats. */
  benchSeat: number | null;
  sequence: number;
  updatedAt: number;
};

export type PlayerMovePayload = {
  position: Vector3State;
  rotationY: number;
  locomotion: LocomotionState;
  sequence: number;
};

export type PlayerProfile = { name: string; gender: PlayerGender };
export type JoinSuccess = { success: true; player: PlayerState; players: PlayerState[]; onlineCount: number; serverTime: number };
export type JoinFailure = { success: false; code: "INVALID_NAME" | "WORLD_FULL" | "RATE_LIMITED" | "JOIN_FAILED"; message: string };
export type JoinResult = JoinSuccess | JoinFailure;
export type WorldSnapshot = { type: "delta" | "full"; serverTime: number; players: PlayerState[] };
export type BenchSeatResult = { success: true; seatIndex: number } | { success: false; code: "BENCH_FULL" | "NOT_JOINED" };

export type ServerToClientEvents = {
  "player:joined": (payload: { player: PlayerState }) => void;
  "player:left": (payload: { playerId: string }) => void;
  "world:snapshot": (payload: WorldSnapshot) => void;
  "world:online-count": (payload: { count: number }) => void;
};

export type ClientToServerEvents = {
  "player:join": (payload: PlayerProfile, acknowledgement: (result: JoinResult) => void) => void;
  "player:move": (payload: PlayerMovePayload) => void;
  "player:leave": (acknowledgement?: () => void) => void;
  "world:online-count": (acknowledgement: (payload: { count: number }) => void) => void;
  "bench:occupy": (acknowledgement: (result: BenchSeatResult) => void) => void;
  "bench:leave": (acknowledgement?: () => void) => void;
};
