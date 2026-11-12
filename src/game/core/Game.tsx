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
import { useGameStore } from "@/game/store/useGameStore";
import type { Vec3 } from "@/game/types";

function SceneReady({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady]);
  return null;
}

function Scene({ onReady }: { onReady: () => void }) {
  const player = useRef<RapierRigidBody | null>(null);
  const { localPlayer } = useMultiplayer();
  const paused = useGameStore((s) => s.paused);
  const spawn: Vec3 | undefined = localPlayer ? [localPlayer.position.x, localPlayer.position.y, localPlayer.position.z] : undefined;
  return <>
    <Physics gravity={[0, -18, 0]}><SchoolWorld /><PlayerController bodyRef={player} enabled={!!localPlayer && !paused} spawn={spawn} /><RemotePlayers /></Physics>
    <CameraController player={player} /><InteractionManager /><SceneReady onReady={onReady} />
  </>;
}

export default function Game() {
  const [sceneReady, setSceneReady] = useState(false);
  const markSceneReady = useCallback(() => setSceneReady(true), []);
  return <MultiplayerProvider><main className="game-shell relative"><Canvas shadows={false} dpr={[1, 1.25]} camera={{ fov: 58, position: [0, 5, 27]}} gl={{ antialias: false, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping, outputColorSpace: THREE.SRGBColorSpace }}><Suspense fallback={null}><Scene onReady={markSceneReady} /></Suspense></Canvas><GameLoadingScreen ready={sceneReady} /><GameHUD /><MobileControls /><MultiplayerUI /></main></MultiplayerProvider>;
}
