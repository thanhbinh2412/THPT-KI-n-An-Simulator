"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useGameStore } from "@/game/store/useGameStore";
import { getMultiplayerSocket } from "./socket-client";
import type { JoinResult, PlayerGender, PlayerState, WorldSnapshot } from "@/shared/multiplayer-types";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";

type ConnectionStatus = "guest" | "connecting" | "connected" | "reconnecting" | "disconnected" | "error";
type MultiplayerContextValue = {
  localPlayer: PlayerState | null; remotePlayers: PlayerState[]; onlineCount: number; status: ConnectionStatus; error: string | null;
  join: (name: string, gender: PlayerGender) => void; leave: () => void;
};
const MultiplayerContext = createContext<MultiplayerContextValue | null>(null);
const STORAGE_KEY = "kien-an-player-profile";

function samePlayerList(players: Map<string, PlayerState>) { return [...players.values()]; }

export function MultiplayerProvider({ children }: { children: ReactNode }) {
  const [localPlayer, setLocalPlayer] = useState<PlayerState | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<PlayerState[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [status, setStatus] = useState<ConnectionStatus>("guest");
  const [error, setError] = useState<string | null>(null);
  const remoteRef = useRef(new Map<string, PlayerState>());
  const profileRef = useRef<{ name: string; gender: PlayerGender } | null>(null);
  const sequenceRef = useRef(0);
  const latestPosition = useRef<[number, number, number] | null>(null);
  const latestMotion = useRef<PlayerState["locomotion"]>("idle");
  const lastYaw = useRef(Math.PI);
  const joiningRef = useRef(false);

  const publishRemotes = useCallback(() => setRemotePlayers(samePlayerList(remoteRef.current)), []);
  const applySnapshot = useCallback((snapshot: WorldSnapshot) => {
    const localId = localPlayer?.id;
    if (snapshot.type === "full") remoteRef.current.clear();
    snapshot.players.forEach((player) => { if (player.id !== localId) remoteRef.current.set(player.id, player); });
    publishRemotes();
  }, [localPlayer?.id, publishRemotes]);

  const performJoin = useCallback((rawName: string, gender: PlayerGender, reconnecting = false) => {
    const name = rawName.trim();
    if (joiningRef.current || !name) return;
    joiningRef.current = true; setError(null); setStatus(reconnecting ? "reconnecting" : "connecting");
    const socket = getMultiplayerSocket();
    if (!socket.connected) socket.connect();
    socket.timeout(8000).emit("player:join", { name, gender }, (timeoutError, result?: JoinResult) => {
      joiningRef.current = false;
      if (timeoutError || !result) { setStatus("error"); setError("Không thể kết nối tới máy chủ. Vui lòng thử lại."); return; }
      if (!result.success) { setStatus("error"); setError(result.message); return; }
      profileRef.current = { name, gender }; sequenceRef.current = 0; remoteRef.current = new Map(result.players.map((player) => [player.id, player]));
      setLocalPlayer(result.player); setOnlineCount(result.onlineCount); publishRemotes(); setStatus("connected"); window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, gender }));
    });
  }, [publishRemotes]);

  useEffect(() => {
    const socket = getMultiplayerSocket();
    const joined = ({ player }: { player: PlayerState }) => { if (player.id !== localPlayer?.id) { remoteRef.current.set(player.id, player); publishRemotes(); } };
    const left = ({ playerId }: { playerId: string }) => { remoteRef.current.delete(playerId); publishRemotes(); };
    const count = ({ count: nextCount }: { count: number }) => setOnlineCount(nextCount);
    const connected = () => { if (profileRef.current && !localPlayer) performJoin(profileRef.current.name, profileRef.current.gender, true); };
    const disconnected = () => { useGameStore.getState().setBenchSeatIndex(null); if (profileRef.current) { setLocalPlayer(null); remoteRef.current.clear(); publishRemotes(); setStatus("reconnecting"); } else setStatus("disconnected"); };
    socket.on("player:joined", joined); socket.on("player:left", left); socket.on("world:snapshot", applySnapshot); socket.on("world:online-count", count); socket.on("connect", connected); socket.on("disconnect", disconnected);
    socket.emit("world:online-count", (result) => setOnlineCount(result.count));
    return () => { socket.off("player:joined", joined); socket.off("player:left", left); socket.off("world:snapshot", applySnapshot); socket.off("world:online-count", count); socket.off("connect", connected); socket.off("disconnect", disconnected); };
  }, [applySnapshot, localPlayer, performJoin, publishRemotes]);

  useEffect(() => {
    if (!localPlayer) return;
    const socket = getMultiplayerSocket();
    let previousMotion = latestMotion.current;
    let lastSentKey = "";
    const send = (reliable = false) => {
      const position = latestPosition.current;
      if (!position || !socket.connected) return;
      const payload = { position: { x: position[0], y: position[1], z: position[2] }, rotationY: lastYaw.current, locomotion: latestMotion.current, sequence: ++sequenceRef.current };
      const key = `${payload.position.x.toFixed(2)}:${payload.position.y.toFixed(2)}:${payload.position.z.toFixed(2)}:${payload.rotationY.toFixed(2)}:${payload.locomotion}`;
      if (!reliable && key === lastSentKey) return;
      lastSentKey = key;
      if (reliable) socket.emit("player:move", payload); else socket.volatile.emit("player:move", payload);
    };
    const unsubscribe = useGameStore.subscribe((state) => {
      const position = state.playerPosition;
      const previous = latestPosition.current;
      const dx = previous ? position[0] - previous[0] : 0; const dz = previous ? position[2] - previous[2] : 0;
      if (state.benchSeatIndex !== null) lastYaw.current = stoneBenchConfig.seatedYaw;
      else if (Math.hypot(dx, dz) > .005) lastYaw.current = Math.atan2(dx, dz);
      latestPosition.current = position;
      latestMotion.current = state.playerMotion;
      if (previousMotion !== state.playerMotion && state.playerMotion === "idle") send(true);
      previousMotion = state.playerMotion;
    });
    const timer = window.setInterval(() => send(), 1000 / 15);
    return () => { unsubscribe(); window.clearInterval(timer); };
  }, [localPlayer]);

  const leave = useCallback(() => {
    const socket = getMultiplayerSocket();
    profileRef.current = null; sequenceRef.current = 0; latestPosition.current = null; remoteRef.current.clear();
    if (socket.connected) { socket.emit("bench:leave"); socket.emit("player:leave"); }
    useGameStore.getState().setBenchSeatIndex(null);
    setLocalPlayer(null); publishRemotes(); setStatus("guest"); setError(null);
  }, [publishRemotes]);

  const value = useMemo(() => ({ localPlayer, remotePlayers, onlineCount, status, error, join: (name: string, gender: PlayerGender) => performJoin(name, gender), leave }), [localPlayer, remotePlayers, onlineCount, status, error, performJoin, leave]);
  return <MultiplayerContext.Provider value={value}>{children}</MultiplayerContext.Provider>;
}

export function useMultiplayer() {
  const value = useContext(MultiplayerContext);
  if (!value) throw new Error("useMultiplayer must be used inside MultiplayerProvider");
  return value;
}

export function getSavedMultiplayerProfile(): { name: string; gender: PlayerGender } | null {
  if (typeof window === "undefined") return null;
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object") return null;
    const profile = value as { name?: unknown; gender?: unknown };
    return typeof profile.name === "string" && profile.name.trim().length >= 2 && profile.name.trim().length <= 24 && (profile.gender === "male" || profile.gender === "female")
      ? { name: profile.name, gender: profile.gender }
      : null;
  } catch { return null; }
}
