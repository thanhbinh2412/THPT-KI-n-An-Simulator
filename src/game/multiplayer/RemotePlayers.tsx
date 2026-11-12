"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { PlayerCharacter } from "@/game/character/PlayerCharacter";
import type { PlayerMotionState } from "@/game/types";
import type { PlayerState } from "@/shared/multiplayer-types";
import { useMultiplayer } from "./MultiplayerProvider";
import { ChatBubble } from "@/components/game-ui/ChatBubble";
import { VoiceIndicator } from "@/components/game-ui/VoiceIndicator";
import { useVoice } from "@/game/voice/VoiceProvider";

const INTERPOLATION_DELAY_MS = 120;
const MAX_SNAPSHOTS = 8;
type Snapshot = { receivedAt: number; position: THREE.Vector3; rotationY: number; locomotion: PlayerMotionState };

function interpolateAngle(from: number, to: number, amount: number) {
  const difference = THREE.MathUtils.euclideanModulo(to - from + Math.PI, Math.PI * 2) - Math.PI;
  return from + difference * amount;
}

function RemotePlayer({ player, bubble, speaking }: { player: PlayerState; bubble?: import("@/shared/multiplayer-types").ChatMessage; speaking?: boolean }) {
  const root = useRef<THREE.Group>(null); const motion = useRef<PlayerMotionState>(player.locomotion); const speed = useRef(0); const velocity = useRef(new THREE.Vector3()); const snapshots = useRef<Snapshot[]>([{ receivedAt: performance.now(), position: new THREE.Vector3(player.position.x, player.position.y, player.position.z), rotationY: player.rotationY, locomotion: player.locomotion }]); const lastSequence = useRef(player.sequence);
  useEffect(() => {
    if (player.sequence <= lastSequence.current) return;
    lastSequence.current = player.sequence;
    const buffer = snapshots.current;
    buffer.push({ receivedAt: performance.now(), position: new THREE.Vector3(player.position.x, player.position.y, player.position.z), rotationY: player.rotationY, locomotion: player.locomotion });
    if (buffer.length > MAX_SNAPSHOTS) buffer.splice(0, buffer.length - MAX_SNAPSHOTS);
  }, [player.sequence, player.position.x, player.position.y, player.position.z, player.rotationY, player.locomotion]);
  useFrame((_state, delta) => {
    if (!root.current) return;
    const buffer = snapshots.current;
    const renderAt = performance.now() - INTERPOLATION_DELAY_MS;
    let earlier = buffer[0]; let later = buffer[buffer.length - 1];
    for (let index = 1; index < buffer.length; index += 1) {
      if (buffer[index].receivedAt >= renderAt) { earlier = buffer[index - 1]; later = buffer[index]; break; }
    }
    const span = Math.max(1, later.receivedAt - earlier.receivedAt);
    const amount = THREE.MathUtils.clamp((renderAt - earlier.receivedAt) / span, 0, 1);
    const target = earlier.position.clone().lerp(later.position, amount);
    const targetYaw = interpolateAngle(earlier.rotationY, later.rotationY, amount);
    motion.current = amount < .5 ? earlier.locomotion : later.locomotion;
    const before = root.current.position.clone();
    root.current.position.lerp(target, 1 - Math.exp(-delta * 22));
    const moved = root.current.position.distanceTo(before); speed.current = moved / Math.max(delta, .001); velocity.current.copy(root.current.position).sub(before).multiplyScalar(1 / Math.max(delta, .001));
    root.current.rotation.y = interpolateAngle(root.current.rotation.y, targetYaw, 1 - Math.exp(-delta * 18));
  });
  return <group ref={root} position={[player.position.x, player.position.y, player.position.z]}><PlayerCharacter gender={player.gender} motion={motion} speed={speed} velocity={velocity} visible orientToVelocity={false} /><ChatBubble message={bubble} /><VoiceIndicator speaking={speaking} /><Html position={[0, 1.35, 0]} center distanceFactor={10} style={{ pointerEvents: "none" }}><span className="remote-name">{player.name}</span></Html></group>;
}

export function RemotePlayers() { const { remotePlayers, chatBubbles } = useMultiplayer(); const { speaking } = useVoice(); return <>{remotePlayers.map((player) => <RemotePlayer key={player.id} player={player} bubble={chatBubbles[player.id]} speaking={speaking[player.id]} />)}</>; }
