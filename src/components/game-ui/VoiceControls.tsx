"use client";
import { useVoice } from "@/game/voice/VoiceProvider";
export function VoiceControls() { const voice = useVoice(); const text = voice.requestingPermission ? "🎤 Đang xin quyền microphone..." : voice.transmitting ? "🔊 Đang nói" : voice.error ? "🎤 Không thể dùng microphone" : voice.enabled ? "🎤 Giữ T để nói" : "🎤 Bấm giữ T để nói"; return <div className="voice-controls pointer-events-none absolute right-4 bottom-4 text-white">{text}</div>; }
