"use client";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import type { ReactNode } from "react";
import type { Vec3 } from "@/game/types";
import { useGameStore } from "@/game/store/useGameStore";

export function StaticBox({ position, size, color = "#e7d7bd", children, opacity = 1 }: { position: Vec3; size: Vec3; color?: string; children?: ReactNode; opacity?: number }) {
  return <RigidBody type="fixed" colliders={false} position={position}>
    <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    <mesh castShadow receiveShadow><boxGeometry args={size} /><meshStandardMaterial color={color} transparent={opacity < 1} opacity={opacity} /></mesh>
    {children}
  </RigidBody>;
}

export function Floor({ position, size }: { position: Vec3; size: Vec3 }) { return <StaticBox position={position} size={size} color="#b9a381" />; }
export function Wall({ position, size }: { position: Vec3; size: Vec3 }) { return <StaticBox position={position} size={size} color="#f3ead9" />; }

export function Staircase({ position, floors = 1, direction = 1 }: { position: Vec3; floors?: number; direction?: 1 | -1 }) {
  const debug = useGameStore((s) => s.physicsDebug); const height = 3.4; const count = 12; const length = 4.6; const rise = height / count; const run = length / count; const slope = Math.atan2(height, length);
  return <group position={position}>
    {Array.from({ length: floors }).map((_, floor) => {
      const flightDirection = (floor % 2 === 0 ? direction : -direction) as 1 | -1;
      return <group key={`flight-${floor}`} position={[0, floor * height, 0]}>
        {/* Visual steps have no colliders; one continuous ramp provides reliable player traversal. */}
        {Array.from({ length: count }).map((_, step) => {
          const z = flightDirection * (-length / 2 + (step + .5) * run); const top = (step + 1) * rise;
          return <mesh key={step} position={[0, top / 2, z]} castShadow receiveShadow><boxGeometry args={[2.25, top, run]} /><meshStandardMaterial color="#976d4c" /></mesh>;
        })}
        <RigidBody type="fixed" colliders={false} rotation={[flightDirection === 1 ? -slope : slope, 0, 0]} position={[0, height / 2, 0]}>
          <CuboidCollider args={[1.13, .08, Math.sqrt(length * length + height * height) / 2]} />
          {debug && <mesh><boxGeometry args={[2.28,.16,Math.sqrt(length * length + height * height)]}/><meshBasicMaterial color="#20d9ff" transparent opacity={.38}/></mesh>}
        </RigidBody>
      </group>;
    })}
    {Array.from({ length: floors + 1 }).map((_, floor) => { const side = floor === 0 ? -direction : (floor % 2 ? direction : -direction); return <Floor key={`landing-${floor}`} position={[0, floor * height + .08, side * (length / 2 + .55)]} size={[2.5, .16, 1.25]} />; })}
  </group>;
}
