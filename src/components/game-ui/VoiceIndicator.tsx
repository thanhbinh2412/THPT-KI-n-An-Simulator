"use client";
import { Html } from "@react-three/drei";
export function VoiceIndicator({ speaking }: { speaking?: boolean }) { if (!speaking) return null; return <Html position={[0, 2.02, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}><span className="voice-indicator" aria-label="Đang nói">🔊</span></Html>; }
