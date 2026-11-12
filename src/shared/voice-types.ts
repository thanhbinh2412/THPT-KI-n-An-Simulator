export type VoiceState = { playerId: string; enabled: boolean; muted: boolean; speaking: boolean };
export type VoiceSignalPayload = { targetPlayerId: string; description?: RTCSessionDescriptionInit; candidate?: RTCIceCandidateInit };
