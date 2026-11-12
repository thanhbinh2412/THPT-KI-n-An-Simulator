"use client";
import { CapsuleCollider, RigidBody, type RapierCollider, type RapierRigidBody, useRapier } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { PlayerMotionState, Vec3 } from "@/game/types";
import { useInputControls } from "./useInputControls";
import { getCameraHeading } from "@/game/camera/CameraController";
import { useGameStore } from "@/game/store/useGameStore";
import { PlayerCharacter } from "@/game/character/PlayerCharacter";
import { campusConfig } from "@/game/config/campus.config";
import { stoneBenchConfig } from "@/game/world/stoneBench.config";
import { leaveStoneBenchSeat } from "@/game/world/benchSeatClient";
import { useMultiplayer } from "@/game/multiplayer/MultiplayerProvider";
import { ChatBubble } from "@/components/game-ui/ChatBubble";
import { VoiceIndicator } from "@/components/game-ui/VoiceIndicator";
import { useVoice } from "@/game/voice/VoiceProvider";

const GRAVITY = 9.81;
const JUMP_SPEED = Math.sqrt(2 * GRAVITY * .7);
type CharacterController = ReturnType<ReturnType<typeof useRapier>["world"]["createCharacterController"]>;

/** Physics-first player: a kinematic Rapier character controller, never visual-only movement. */
export function PlayerController({ bodyRef, enabled = true, spawn }: { bodyRef: React.RefObject<RapierRigidBody | null>; enabled?: boolean; spawn?: Vec3 }) {
  const { world } = useRapier(); const input = useInputControls(enabled); const collider = useRef<RapierCollider | null>(null);
  const { localPlayer, chatBubbles } = useMultiplayer();
  const { speaking } = useVoice();
  const controller = useRef<CharacterController | null>(null); const velocity = useRef(new THREE.Vector3()); const direction = useRef(new THREE.Vector3()); const verticalVelocity = useRef(0); const grounded = useRef(false); const lastReport = useRef(0);
  const motion = useRef<PlayerMotionState>("idle"); const visualSpeed = useRef(0); const reportedGrounded = useRef(false); const appliedSpawn = useRef(""); const wasSitting = useRef(false); const cameraMode = useGameStore((s) => s.cameraMode); const physicsDebug = useGameStore((s) => s.physicsDebug);
  useEffect(() => {
    const next = world.createCharacterController(.035);
    // V75's authored walk boxes include every tread, so use the documented
    // step/snap values and let Rapier resolve only manifest geometry.
    next.enableAutostep(.22, .18, true); next.enableSnapToGround(.25); next.setMaxSlopeClimbAngle(Math.PI * .3); next.setMinSlopeSlideAngle(Math.PI * .42);
    controller.current = next;
    return () => { world.removeCharacterController(next); controller.current = null; };
  }, [world]);
  useFrame((state, delta) => {
    const body = bodyRef.current; const shape = collider.current; const control = controller.current; if (!body || !shape || !control) return;
    if (spawn) { const key = spawn.join(","); if (key !== appliedSpawn.current) { body.setTranslation({ x: spawn[0], y: spawn[1], z: spawn[2] }, true); velocity.current.set(0, 0, 0); verticalVelocity.current = 0; appliedSpawn.current = key; } }
    const dt = Math.min(delta, 1 / 30); const store = useGameStore.getState(); const mobile = store.mobileMove;
    const forwardInput = enabled ? input.current.forward + mobile.forward : 0; const rightInput = enabled ? input.current.right + mobile.right : 0;
    const seatedPosition = store.benchSeatIndex === null ? null : stoneBenchConfig.seatedBodyPositions[store.benchSeatIndex];
    if (seatedPosition) {
      wasSitting.current = true;
      // Any attempt to move, jump or use the mobile joystick stands the player
      // up at the clear side of the bench before normal movement resumes.
      if (forwardInput || rightInput || input.current.jump || store.mobileJump) {
        leaveStoneBenchSeat();
        body.setTranslation({ x: stoneBenchConfig.standingBodyPosition[0], y: stoneBenchConfig.standingBodyPosition[1], z: stoneBenchConfig.standingBodyPosition[2] }, true);
      } else {
        velocity.current.set(0, 0, 0); verticalVelocity.current = 0; grounded.current = true;
        body.setNextKinematicTranslation({ x: seatedPosition[0], y: seatedPosition[1], z: seatedPosition[2] });
        motion.current = "sit"; useGameStore.getState().setPlayerMotion("sit");
        if (state.clock.elapsedTime - lastReport.current > 1 / 15) { useGameStore.getState().setPlayerPosition([...seatedPosition]); lastReport.current = state.clock.elapsedTime; }
        return;
      }
    }
    if (wasSitting.current) {
      // G explicitly ends the sit state. Put the capsule at the clear front
      // anchor, rather than leaving a standing collider inside the bench.
      body.setTranslation({ x: stoneBenchConfig.standingBodyPosition[0], y: stoneBenchConfig.standingBodyPosition[1], z: stoneBenchConfig.standingBodyPosition[2] }, true);
      velocity.current.set(0, 0, 0); verticalVelocity.current = 0; wasSitting.current = false;
    }
    direction.current.set(rightInput, 0, -forwardInput); if (direction.current.lengthSq() > 1) direction.current.normalize(); direction.current.applyAxisAngle(new THREE.Vector3(0, 1, 0), getCameraHeading());
    const running = enabled && (input.current.run || useGameStore.getState().run); const maxSpeed = running ? 6.4 : 4.1;
    velocity.current.x = THREE.MathUtils.damp(velocity.current.x, direction.current.x * maxSpeed, 18, dt); velocity.current.z = THREE.MathUtils.damp(velocity.current.z, direction.current.z * maxSpeed, 18, dt);
    const askedJump = enabled && (input.current.jump || useGameStore.getState().mobileJump);
    if (askedJump && grounded.current) { verticalVelocity.current = JUMP_SPEED; grounded.current = false; input.current.jump = false; useGameStore.getState().setMobileJump(false); }
    if (!grounded.current) verticalVelocity.current -= GRAVITY * dt; else if (verticalVelocity.current < 0) verticalVelocity.current = 0;
    control.computeColliderMovement(shape, { x: velocity.current.x * dt, y: verticalVelocity.current * dt, z: velocity.current.z * dt });
    const move = control.computedMovement(); const onGround = control.computedGrounded();
    if (verticalVelocity.current > 0 && move.y < verticalVelocity.current * dt * .45) verticalVelocity.current = 0;
    if (onGround && verticalVelocity.current <= 0) verticalVelocity.current = 0;
    grounded.current = onGround;
    if (reportedGrounded.current !== onGround) { reportedGrounded.current = onGround; useGameStore.getState().setPlayerGrounded(onGround); }
    const p = body.translation(); body.setNextKinematicTranslation({ x: p.x + move.x, y: p.y + move.y, z: p.z + move.z });
    visualSpeed.current = Math.hypot(velocity.current.x, velocity.current.z);
    const nextMotion: PlayerMotionState = !onGround ? (verticalVelocity.current > .15 ? "jump" : "fall") : (Math.abs(move.y) > .012 && visualSpeed.current > .2 ? "stairs" : visualSpeed.current > .25 ? (running ? "run" : "walk") : motion.current === "fall" ? "land" : "idle");
    motion.current = nextMotion; useGameStore.getState().setPlayerMotion(nextMotion);
    if (state.clock.elapsedTime - lastReport.current > 1 / 15) { const pos = body.translation(); useGameStore.getState().setPlayerPosition([pos.x, pos.y, pos.z]); lastReport.current = state.clock.elapsedTime; }
  });
  return <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={campusConfig.spawn} enabledRotations={[false, false, false]}>
    <CapsuleCollider ref={collider} args={[.6,.25]} />
    {physicsDebug && <mesh><capsuleGeometry args={[.25, 1.2, 8, 12]} /><meshBasicMaterial color="#22d3ee" wireframe transparent opacity={.8} depthTest={false} /></mesh>}
    <PlayerCharacter gender={localPlayer?.gender ?? "male"} motion={motion} speed={visualSpeed} velocity={velocity} visible={cameraMode === "third"} seatedYaw={stoneBenchConfig.seatedYaw} />
    <ChatBubble message={localPlayer ? chatBubbles[localPlayer.id] : undefined} />
    <VoiceIndicator speaking={localPlayer ? speaking[localPlayer.id] : false} />
  </RigidBody>;
}
