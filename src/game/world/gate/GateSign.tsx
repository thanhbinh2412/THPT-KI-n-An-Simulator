"use client";
import { Text } from "@react-three/drei";

/** The sign is a separate visual component so a future GLB gate can retain the same gameplay opening. */
export function GateSign() {
  return <group position={[0, 5.1, 0]}>
    <mesh castShadow><boxGeometry args={[10.1, 1.18, .22]} /><meshStandardMaterial color="#791f2a" /></mesh>
    <mesh position={[-4.3, 0, .13]}><cylinderGeometry args={[.38,.38,.035,24]}/><meshStandardMaterial color="#efe5cb"/></mesh>
    <mesh position={[-4.3, 0, .17]}><ringGeometry args={[.22,.3,24]}/><meshBasicMaterial color="#a22b36"/></mesh>
    <Text position={[.48, -.01, .14]} fontSize={.47} maxWidth={8.75} anchorX="center" anchorY="middle" color="#fff8e8" outlineWidth={.006} outlineColor="#f3e2c5" letterSpacing={-.025}>
      TRƯỜNG TRUNG HỌC PHỔ THÔNG KIẾN AN
    </Text>
  </group>;
}
