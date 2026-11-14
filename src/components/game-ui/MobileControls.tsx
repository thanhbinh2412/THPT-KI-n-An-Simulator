"use client";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/game/store/useGameStore";
import { useMultiplayer } from "@/game/multiplayer/MultiplayerProvider";
import { activateNearby } from "@/game/interactions/activateNearby";
import { rotateCamera } from "@/game/camera/CameraController";

export function MobileControls() {
  const origin = useRef<{ x: number; y: number } | null>(null);
  const cameraTouch = useRef<{ id: number; x: number; y: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const setMove = useGameStore((s) => s.setMobileMove);
  const setJump = useGameStore((s) => s.setMobileJump);
  const nearby = useGameStore((s) => s.nearbyId);
  const toggle = useGameStore((s) => s.toggleCamera);
  const setRun = useGameStore((s) => s.setRun);
  const { localPlayer } = useMultiplayer();
  const move = (event: React.PointerEvent) => {
    if (!origin.current) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    setMove({ right: Math.max(-1, Math.min(1, dx / 40)), forward: Math.max(-1, Math.min(1, -dy / 40)) });
  };
  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen?.();
      // Orientation locking is intentionally best-effort: Safari on iOS does
      // not expose it, but its responsive landscape layout still works.
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: "landscape") => Promise<void> };
      await orientation?.lock?.("landscape");
    } catch {
      // Browsers can deny fullscreen/orientation requests without user action.
    }
  };
  const beginCameraDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    cameraTouch.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveCamera = (event: React.PointerEvent<HTMLDivElement>) => {
    const activeTouch = cameraTouch.current;
    if (!activeTouch || activeTouch.id !== event.pointerId) return;
    rotateCamera(event.clientX - activeTouch.x, event.clientY - activeTouch.y);
    cameraTouch.current = { ...activeTouch, x: event.clientX, y: event.clientY };
  };
  const endCameraDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (cameraTouch.current?.id === event.pointerId) cameraTouch.current = null;
  };
  if (!localPlayer) return null;
  return (
    <div className="pointer-events-none absolute inset-0 md:hidden">
      <div
        className="mobile-joystick pointer-events-auto absolute bottom-5 left-4 z-20 h-24 w-24 rounded-full"
        onPointerDown={(e) => {
          origin.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={move}
        onPointerUp={() => {
          origin.current = null;
          setMove({ forward: 0, right: 0 });
        }}
        onPointerCancel={() => {
          origin.current = null;
          setMove({ forward: 0, right: 0 });
        }}
      />
      <div
        className="mobile-camera-zone pointer-events-auto absolute inset-y-0 left-[42%] right-0"
        onPointerDown={beginCameraDrag}
        onPointerMove={moveCamera}
        onPointerUp={endCameraDrag}
        onPointerCancel={endCameraDrag}
        aria-label="Vuốt để xoay góc nhìn"
      />
      <button className="mobile-fullscreen pointer-events-auto absolute right-3 top-3 z-20" onClick={toggleFullscreen} aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>
        {fullscreen ? "⤢" : "⛶"}
      </button>
      <div className="mobile-action-grid pointer-events-auto absolute bottom-5 right-4 z-20 grid grid-cols-2 gap-2">
        <button className="touch-button" onClick={() => setJump(true)}>
          JUMP
        </button>
        <button className="touch-button" onClick={activateNearby} disabled={!nearby}>
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
