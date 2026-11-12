"use client";
import { StaticBox } from "../WorldParts";

function MetalBars({ position, width, height }: { position: [number, number, number]; width: number; height: number }) {
  const bars = Array.from({ length: Math.floor(width / .38) + 1 });
  return <group position={position}>{bars.map((_, index) => <mesh key={index} position={[-width / 2 + index * .38, height / 2, 0]} castShadow><boxGeometry args={[.07,height,.07]}/><meshStandardMaterial color="#17342f"/></mesh>)}<mesh position={[0,.32,0]}><boxGeometry args={[width,.38,.13]}/><meshStandardMaterial color="#183630"/></mesh><mesh position={[0,height-.25,0]}><boxGeometry args={[width,.11,.11]}/><meshStandardMaterial color="#183630"/></mesh></group>;
}

export function GateFence() {
  return <group>
    {/* Gates are visual-only and folded outward: the centre stays clear for traversal. */}
    <group position={[-2.55,.1,.35]} rotation={[0,-.38,0]}><MetalBars position={[0,0,0]} width={4.5} height={3.25}/></group>
    <group position={[2.55,.1,.35]} rotation={[0,.38,0]}><MetalBars position={[0,0,0]} width={4.5} height={3.25}/></group>
    <StaticBox position={[-7.25,1.2,0]} size={[2.95,2.4,1.05]} color="#a95342" />
    <StaticBox position={[7.25,1.2,0]} size={[2.95,2.4,1.05]} color="#eee4cc" />
    <MetalBars position={[-7.25,.02,.57]} width={2.3} height={2.05}/><MetalBars position={[7.25,.02,.57]} width={2.3} height={2.05}/>
    <mesh position={[-7.25,1.4,.56]}><boxGeometry args={[2.75,.04,.04]}/><meshStandardMaterial color="#e8d5b4"/></mesh>
  </group>;
}
