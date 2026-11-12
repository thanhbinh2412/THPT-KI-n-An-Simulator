"use client";
import { useRef } from "react";
import { useGameStore } from "@/game/store/useGameStore";
import { useMultiplayer } from "@/game/multiplayer/MultiplayerProvider";

export function MobileControls() {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const setMove = useGameStore((s) => s.setMobileMove);
  const setJump = useGameStore((s) => s.setMobileJump);
  const nearby = useGameStore((s) => s.nearbyId);
  const toggle = useGameStore((s) => s.toggleCamera);
  const setRun = useGameStore((s) => s.setRun);
  const { localPlayer } = useMultiplayer();
  const useNearby = () => {
    const store = useGameStore.getState();
    if (nearby === "campus-gate-main") store.requestCampusGateToggle("main");
    else if (nearby === "campus-gate-left") store.requestCampusGateToggle("left");
    else if (nearby === "campus-gate-right") store.requestCampusGateToggle("right");
    else if (nearby === "school-gate") store.requestGateToggle();
    else if (nearby) store.setDialog(nearby);
  };
  const move = (event: React.PointerEvent) => {
    if (!origin.current) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    setMove({ right: Math.max(-1, Math.min(1, dx / 40)), forward: Math.max(-1, Math.min(1, -dy / 40)) });
  };
  if (!localPlayer) return null;
  return (
    <div className="pointer-events-none absolute inset-0 md:hidden">
      <div
        className="pointer-events-auto absolute bottom-7 left-6 h-28 w-28 rounded-full border border-white/30 bg-slate-950/40"
        onPointerDown={(e) => {
          origin.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          origin.current = null;
          setMove({ forward: 0, right: 0 });
        }}
      />
      <div className="pointer-events-auto absolute bottom-7 right-5 grid grid-cols-2 gap-3">
        <button className="touch-button" onClick={() => setJump(true)}>
          JUMP
        </button>
        <button className="touch-button" onClick={useNearby}>
          USE
        </button>
        <button className="touch-button" onClick={() => setRun(!useGameStore.getState().run)}>
          RUN
        </button>
        <button className="touch-button" onClick={toggle}>
          CAM
        </button>
      </div>
    </div>
  );
}
