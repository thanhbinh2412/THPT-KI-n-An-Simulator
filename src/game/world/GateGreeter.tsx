"use client";

import { Html, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { applyUnlitMaterials } from "@/game/rendering/unlitMaterials";
import { useGameStore } from "@/game/store/useGameStore";
import { gateGreeterConfig, gateGreeterMessages } from "./gateGreeter.config";

type GateSide = "inside" | "outside";
type Greeting = { text: string; id: number };

function GreeterModel() {
  const { scene } = useGLTF(gateGreeterConfig.modelUrl);
  // useGLTF caches source scenes; the NPC receives its own visual graph.
  const model = useMemo(() => scene.clone(true), [scene]);
  useEffect(() => applyUnlitMaterials(model), [model]);

  return <primitive object={model} />;
}

function getStableGateSide(position: readonly number[]): GateSide | null {
  const [, , z] = position;
  const { triggerZ, triggerDepth } = gateGreeterConfig.mainGate;
  if (z <= triggerZ - triggerDepth / 2) return "inside";
  if (z >= triggerZ + triggerDepth / 2) return "outside";
  return null;
}

/**
 * A visual-only gate NPC. It watches the centre red-line crossing, points at
 * the local player, then speaks once for each valid entry or exit.
 */
export function GateGreeter() {
  const previousSide = useRef<GateSide | null>(null);
  const timeout = useRef<number | null>(null);
  const nextGreetingId = useRef(0);
  const group = useRef<THREE.Group>(null);
  const [greeting, setGreeting] = useState<Greeting | null>(null);

  const showGreeting = (text: string) => {
    if (timeout.current) window.clearTimeout(timeout.current);
    nextGreetingId.current += 1;
    setGreeting({ text, id: nextGreetingId.current });
    timeout.current = window.setTimeout(() => {
      timeout.current = null;
      setGreeting(null);
    }, gateGreeterConfig.messageDurationMs);
  };

  useFrame(() => {
    const position = useGameStore.getState().playerPosition;
    // Leaving the central opening disarms the trigger. Passing a pedestrian
    // gate or walking alongside the fence does not count as a red-line crossing.
    if (Math.abs(position[0] - gateGreeterConfig.mainGate.centerX) > gateGreeterConfig.mainGate.halfWidth) {
      previousSide.current = null;
      return;
    }
    // Keep the last stable side while the player is between the two threshold
    // planes. Otherwise every valid crossing would disarm itself mid-gate.
    const side = getStableGateSide(position);
    if (!side) return;
    if (!previousSide.current) {
      previousSide.current = side;
      return;
    }
    if (previousSide.current === side) return;

    previousSide.current = side;
    showGreeting(side === "inside" ? gateGreeterMessages.entering : gateGreeterMessages.leaving);

    // The GLB is authored in a pointing pose facing local +Z. Rotate the whole
    // fixed NPC toward the player when it speaks so the gesture targets them.
    const targetYaw = Math.atan2(
      position[0] - gateGreeterConfig.position[0],
      position[2] - gateGreeterConfig.position[2],
    );
    if (group.current) group.current.rotation.y = targetYaw;
  });

  useFrame((_, delta) => {
    // Keep the pointing pose aimed at a moving player for the full bubble time.
    if (!greeting || !group.current) return;
    const player = useGameStore.getState().playerPosition;
    const targetYaw = Math.atan2(player[0] - gateGreeterConfig.position[0], player[2] - gateGreeterConfig.position[2]);
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, targetYaw, 12, delta);
  });

  useEffect(() => () => {
    if (timeout.current) window.clearTimeout(timeout.current);
  }, []);

  return <group ref={group} position={gateGreeterConfig.position} rotation={[0, gateGreeterConfig.rotationY, 0]} scale={gateGreeterConfig.scale}>
    <GreeterModel />
    {greeting && <Html key={greeting.id} position={[0, gateGreeterConfig.speechHeight, 0]} center zIndexRange={[10, 0]}>
      <div className="gate-greeter-bubble" role="status">{greeting.text}</div>
    </Html>}
  </group>;
}

useGLTF.preload(gateGreeterConfig.modelUrl);
