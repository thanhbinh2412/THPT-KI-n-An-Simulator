import { randomUUID } from "node:crypto";
import type { ChatMessage } from "../../src/shared/multiplayer-types";

export class ChatManager {
  private readonly messages: ChatMessage[] = [];
  add(playerId: string, playerName: string, content: string) {
    const message: ChatMessage = { id: randomUUID(), playerId, playerName, content, timestamp: Date.now() };
    this.messages.push(message);
    if (this.messages.length > 100) this.messages.splice(0, this.messages.length - 100);
    return message;
  }
  getRecent(limit = 100) { return this.messages.slice(-Math.min(100, Math.max(1, limit))); }
}
