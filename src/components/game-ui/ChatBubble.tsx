"use client";
import { Html } from "@react-three/drei";
import type { ChatMessage } from "@/shared/multiplayer-types";
export function ChatBubble({ message }: { message?: ChatMessage }) {
  if (!message) return null;
  return <Html position={[0, 1.72, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}><span className="player-chat-bubble">{message.content}</span></Html>;
}
