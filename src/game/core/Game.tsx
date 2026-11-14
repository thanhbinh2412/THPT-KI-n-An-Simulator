"use client";
import { Canvas } from "@react-three/fiber";
import { Physics, type RapierRigidBody } from "@react-three/rapier";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { SchoolWorld } from "@/game/world/SchoolWorld";
import { PlayerController } from "@/game/player/PlayerController";
import { CameraController } from "@/game/camera/CameraController";
import { InteractionManager } from "@/game/interactions/InteractionManager";
import { GameHUD } from "@/components/game-ui/GameHUD";
import { MobileControls } from "@/components/game-ui/MobileControls";
import { MultiplayerProvider, useMultiplayer } from "@/game/multiplayer/MultiplayerProvider";
import { RemotePlayers } from "@/game/multiplayer/RemotePlayers";
import { MultiplayerUI } from "@/components/game-ui/MultiplayerUI";
import { GameLoadingScreen } from "@/components/game-ui/GameLoadingScreen";
import { ChatPanel } from "@/components/game-ui/ChatPanel";
import { useGameStore } from "@/game/store/useGameStore";
import { BackgroundMusicProvider } from "@/game/audio/BackgroundMusicProvider";
import { VoiceProvider } from "@/game/voice/VoiceProvider";
import { VoiceControls } from "@/components/game-ui/VoiceControls";
import { GraphicsSettingsProvider, useGraphicsSettings } from "@/game/performance/GraphicsSettings";
import { PerformanceMonitor, PerformanceOverlay } from "@/components/game-ui/PerformanceOverlay";
import type { Vec3 } from "@/game/types";

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

/** Enables the existing collider-box renderer only for local development. */
function PhysicsDebugQuery() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || new URLSearchParams(window.location.search).get("debugPhysics") !== "true") return;
    if (!useGameStore.getState().physicsDebug) useGameStore.getState().togglePhysicsDebug();
  }, []);
  return null;
}

function Scene({ onReady }: { onReady: () => void }) {
  const player = useRef<RapierRigidBody | null>(null);
  const { localPlayer } = useMultiplayer();
  const paused = useGameStore((s) => s.paused);
  const activeDialog = useGameStore((s) => s.activeDialog);
  const physicsDebug = useGameStore((s) => s.physicsDebug);
  const spawn: Vec3 | undefined = localPlayer ? [localPlayer.position.x, localPlayer.position.y, localPlayer.position.z] : undefined;
  const graphics = useGraphicsSettings();
  return <>
    <Physics gravity={[0, -9.81, 0]} debug={physicsDebug}>{graphics.campusVisible && <SchoolWorld collisionsEnabled={graphics.collisionsEnabled} />}<PlayerController bodyRef={player} enabled={!!localPlayer && !paused && !activeDialog} spawn={spawn} /><RemotePlayers /><InteractionManager /></Physics>
    <CameraController player={player} /><PerformanceMonitor /><PhysicsDebugQuery /><SceneReady onReady={onReady} />
  </>;
}

export default function Game() {
  const [sceneReady, setSceneReady] = useState(false);
  const markSceneReady = useCallback(() => setSceneReady(true), []);
  return <BackgroundMusicProvider><MultiplayerProvider><VoiceProvider><GraphicsSettingsProvider><GameContent sceneReady={sceneReady} markSceneReady={markSceneReady} /></GraphicsSettingsProvider></VoiceProvider></MultiplayerProvider></BackgroundMusicProvider>;
}

function GameContent({ sceneReady, markSceneReady }: { sceneReady: boolean; markSceneReady: () => void }) { const graphics = useGraphicsSettings(); return <main className="game-shell relative"><Canvas shadows={graphics.shadows} dpr={graphics.dpr} camera={{ fov: 58, position: [0, 5, 27]}} gl={{ antialias: false, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: .9, outputColorSpace: THREE.SRGBColorSpace }}><Suspense fallback={null}><Scene onReady={markSceneReady} /></Suspense></Canvas><GameLoadingScreen ready={sceneReady} /><GameHUD /><MobileControls /><ChatPanel /><VoiceControls /><MultiplayerUI /><PerformanceOverlay /></main>; }
