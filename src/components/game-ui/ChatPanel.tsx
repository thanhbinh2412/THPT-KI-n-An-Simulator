"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { useMultiplayer } from "@/game/multiplayer/MultiplayerProvider";

export function ChatPanel() {
  const { localPlayer, chatMessages, onlineCount, status, sendChat } = useMultiplayer();
  const [collapsed, setCollapsed] = useState(false); const [draft, setDraft] = useState(""); const [error, setError] = useState(""); const [unread, setUnread] = useState(0); const [composing, setComposing] = useState(false);
  const list = useRef<HTMLDivElement>(null); const nearBottom = useRef(true);
  useEffect(() => { if (!localPlayer) { setDraft(""); setError(""); setUnread(0); } }, [localPlayer]);
  useEffect(() => {
    const element = list.current; if (!element) return;
    if (collapsed) { if (chatMessages.at(-1)?.playerId !== localPlayer?.id) setUnread((count) => count + 1); return; }
    if (nearBottom.current) element.scrollTop = element.scrollHeight;
  }, [chatMessages, collapsed, localPlayer?.id]);
  if (!localPlayer && status !== "reconnecting") return null;
  const submit = async (event: FormEvent) => { event.preventDefault(); const content = draft.trim(); if (!content) return; const result = await sendChat(content); if (result.success) { setDraft(""); setError(""); } else setError(result.message); };
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Escape") { event.currentTarget.blur(); return; } if (event.key === "Enter" && !event.shiftKey && !composing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } };
  return <section className={`chat-panel ${collapsed ? "chat-panel--collapsed" : ""}`} aria-label="Chat chung">
    <header className="chat-panel__header"><span>CHAT CHUNG {unread > 0 && <span className="chat-panel__unread">{unread}</span>}</span><span className="chat-panel__header-actions"><span>● {onlineCount}</span><button type="button" className="chat-panel__toggle" aria-label={collapsed ? "Mở chat" : "Thu gọn chat"} title={collapsed ? "Mở chat" : "Thu gọn chat"} onClick={() => { setCollapsed((value) => !value); setUnread(0); }}>{collapsed ? "▴" : "▾"}</button></span></header>
    {!collapsed && <><div ref={list} className="chat-panel__messages" onScroll={(event) => { const target = event.currentTarget; nearBottom.current = target.scrollHeight - target.scrollTop - target.clientHeight < 28; }}>
      {chatMessages.map((message) => <p key={message.id} className={message.playerId === localPlayer?.id ? "chat-message chat-message--local" : "chat-message"}><strong>{message.playerName}:</strong> {message.content}</p>)}
    </div><form className="chat-panel__form" onSubmit={submit}><textarea value={draft} maxLength={200} rows={1} placeholder={status === "connected" ? "Nhập tin nhắn..." : "Đang kết nối lại..."} disabled={status !== "connected"} onChange={(event) => setDraft(event.target.value)} onKeyDown={keyDown} onCompositionStart={() => setComposing(true)} onCompositionEnd={() => setComposing(false)} /><button type="submit" disabled={!draft.trim() || status !== "connected"} aria-label="Gửi tin nhắn">➤</button></form>{error && <p className="chat-panel__error">{error}</p>}</>}
  </section>;
}
