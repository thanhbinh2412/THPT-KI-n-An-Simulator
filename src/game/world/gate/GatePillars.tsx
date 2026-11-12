"use client";
import { StaticBox } from "../WorldParts";

function RoofCap({ x, width }: { x: number; width: number }) {
  return <group position={[x, 4.18, 0]}>
    <mesh rotation={[0, 0, .16]} position={[-width / 4, .19, 0]} castShadow><boxGeometry args={[width / 2.05,.18,1.55]}/><meshStandardMaterial color="#8d3f38"/></mesh>
    <mesh rotation={[0, 0, -.16]} position={[width / 4, .19, 0]} castShadow><boxGeometry args={[width / 2.05,.18,1.55]}/><meshStandardMaterial color="#8d3f38"/></mesh>
    <mesh position={[0,.4,0]}><boxGeometry args={[width,.12,1.6]}/><meshStandardMaterial color="#b85a4e"/></mesh>
  </group>;
}

export function GatePillars() {
  return <group>
    {/* Main white pillars frame an intentionally collider-free 8 m pedestrian opening. */}
    <StaticBox position={[-5.25, 2.7, 0]} size={[1.05, 5.4, 1.18]} color="#f0eadb" />
    <StaticBox position={[5.25, 2.7, 0]} size={[1.05, 5.4, 1.18]} color="#f0eadb" />
    <StaticBox position={[-5.25, .35, 0]} size={[1.4,.7,1.5]} color="#ded6c6" /><StaticBox position={[5.25,.35,0]} size={[1.4,.7,1.5]} color="#ded6c6" />
    <StaticBox position={[-9.2, 2.1, 0]} size={[.85,4.2,1.05]} color="#f0eadb" /><StaticBox position={[9.2,2.1,0]} size={[.85,4.2,1.05]} color="#f0eadb" />
    <RoofCap x={0} width={11.6} /><RoofCap x={-8.15} width={3.1} /><RoofCap x={8.15} width={3.1} />
  </group>;
}
