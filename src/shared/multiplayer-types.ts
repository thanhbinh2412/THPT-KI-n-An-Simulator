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
  seatId: string | null;
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
export type ActionFailure = { success: false; code: "NOT_JOINED" | "TOO_FAR" | "OCCUPIED" | "INVALID_TARGET" | "ALREADY_SEATED"; message: string };
export type SeatActionResult = { success: true; seatId: string | null; position: [number, number, number] } | ActionFailure;
export type WorldInteractionState = { doors: Record<string, boolean>; pendingDoors: string[]; lights: Record<string, boolean>; seats: Record<string, string> };
export type WorldActionResult = { success: true } | ActionFailure;
export type ChatMessage = { id: string; playerId: string; playerName: string; content: string; timestamp: number };
export type ChatSendPayload = { content: string };
export type ChatSendResult = { success: true; messageId: string } | { success: false; code: "NOT_JOINED" | "INVALID_MESSAGE" | "RATE_LIMITED"; message: string };
export type VoiceState = { playerId: string; enabled: boolean; muted: boolean; speaking: boolean };
export type VoiceSignalPayload = { targetPlayerId: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };

export type ServerToClientEvents = {
  "world:interactions": (payload: WorldInteractionState) => void;
  "player:joined": (payload: { player: PlayerState }) => void;
  "player:left": (payload: { playerId: string }) => void;
  "world:snapshot": (payload: WorldSnapshot) => void;
  "world:online-count": (payload: { count: number }) => void;
  "chat:message": (message: ChatMessage) => void;
  "chat:history": (payload: { messages: ChatMessage[] }) => void;
  "voice:peers": (payload: { playerIds: string[] }) => void;
  "voice:state": (payload: VoiceState) => void;
  "voice:peer-left": (payload: { playerId: string }) => void;
  "voice:offer": (payload: VoiceSignalPayload & { playerId: string; description: RTCSessionDescriptionInit }) => void;
  "voice:answer": (payload: VoiceSignalPayload & { playerId: string; description: RTCSessionDescriptionInit }) => void;
  "voice:ice-candidate": (payload: VoiceSignalPayload & { playerId: string; candidate: RTCIceCandidateInit }) => void;
};

export type ClientToServerEvents = {
  "seat:occupy": (payload: { seatId: string }, acknowledgement: (result: SeatActionResult) => void) => void;
  "seat:leave": (acknowledgement: (result: SeatActionResult) => void) => void;
  "light:toggle": (payload: { roomId: string }, acknowledgement: (result: WorldActionResult) => void) => void;
  "door:toggle": (payload: { doorId: string }, acknowledgement: (result: WorldActionResult) => void) => void;
  "surface:stand": (payload: { surfaceId: string }, acknowledgement: (result: SeatActionResult) => void) => void;
  "player:join": (payload: PlayerProfile, acknowledgement: (result: JoinResult) => void) => void;
  "player:move": (payload: PlayerMovePayload) => void;
  "player:leave": (acknowledgement?: () => void) => void;
  "world:online-count": (acknowledgement: (payload: { count: number }) => void) => void;
  "bench:occupy": (acknowledgement: (result: BenchSeatResult) => void) => void;
  "bench:leave": (acknowledgement?: () => void) => void;
  "chat:send": (payload: ChatSendPayload, acknowledgement: (result: ChatSendResult) => void) => void;
  "voice:enable": (payload: { enabled: boolean; muted: boolean }, acknowledgement?: (result: { success: boolean; message?: string }) => void) => void;
  "voice:state": (payload: { muted: boolean; speaking: boolean }) => void;
  "voice:offer": (payload: VoiceSignalPayload) => void;
  "voice:answer": (payload: VoiceSignalPayload) => void;
  "voice:ice-candidate": (payload: VoiceSignalPayload) => void;
};
