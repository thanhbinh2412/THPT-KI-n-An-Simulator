"use client";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { campusLights } from "@/game/config/campusGameplay";
import { useGameStore } from "@/game/store/useGameStore";

/** Independent materials per room; a small light pool avoids 53 realtime lights. */
export function ClassroomLights({ scene }: { scene: THREE.Group }) {
  const states = useGameStore(s => s.roomLights);
  const lamps = useRef<Array<THREE.PointLight | null>>([]);
  const active = useRef<number[]>([]); const lastCheck = useRef(0);
  const bindings = useMemo(() => campusLights.map(light => {
    const tubes: THREE.Mesh[] = [], furniture: THREE.Mesh[] = [];
    scene.getObjectByName(light.tubeNode)?.traverse(o => { if (o instanceof THREE.Mesh) tubes.push(o); });
    for (const name of light.renderNodes) scene.getObjectByName(name)?.traverse(o => { if (o instanceof THREE.Mesh) furniture.push(o); });
    return { light, tubes, furniture };
  }), [scene]);
  useEffect(() => {
    const restore: Array<() => void> = [];
    for (const { tubes, furniture } of bindings) for (const mesh of [...tubes, ...furniture]) {
      const original = mesh.material;
      const clones = (Array.isArray(original) ? original : [original]).map(m => { const clone = m.clone(); clone.userData.originalLightColor = (clone as THREE.MeshStandardMaterial).color?.clone(); return clone; });
      mesh.material = Array.isArray(original) ? clones : clones[0];
      restore.push(() => { mesh.material = original; clones.forEach(m => m.dispose()); });
    }
    return () => restore.forEach(fn => fn());
  }, [bindings]);
  useEffect(() => {
    for (const { light, tubes, furniture } of bindings) {
      const on = states[light.id] ?? light.defaultOn;
      for (const mesh of furniture) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const mat = m as THREE.MeshStandardMaterial, color = mat.userData.originalLightColor as THREE.Color | undefined;
        if (color && mat.color) mat.color.copy(color).multiplyScalar(on ? 1 : .58);
      }
      for (const mesh of tubes) for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        const mat = m as THREE.MeshStandardMaterial;
        mat.color?.set(on ? "#fff4cf" : "#777c7b");
        if (mat.emissive) { mat.emissive.set("#fff0bc"); mat.emissiveIntensity = on ? 2.2 : 0; }
      }
    }
  }, [bindings, states]);
  useFrame(({ clock }, dt) => {
    const store = useGameStore.getState();
    if (clock.elapsedTime-lastCheck.current>.2) {
      lastCheck.current = clock.elapsedTime;
      active.current = campusLights.map((light, index) => ({ index, distance: Math.hypot(store.playerPosition[0]-light.position[0], store.playerPosition[2]-light.position[2]), height: Math.abs(store.playerPosition[1]-(light.position[1]-2.0)) }))
        .filter(item => item.distance<18 && item.height<1.9).sort((a,b) => a.distance-b.distance).slice(0,3).map(item => item.index);
    }
    lamps.current.forEach((lamp, index) => {
      if (!lamp) return; const light = campusLights[active.current[index]];
      if (light) lamp.position.set(...light.position);
      lamp.intensity = THREE.MathUtils.damp(lamp.intensity, light && (store.roomLights[light.id] ?? true) ? 65 : 0, 12, dt);
    });
  });
  return <>{[0,1,2].map(i => <pointLight key={i} ref={lamp => { lamps.current[i] = lamp; }} color="#fff0d1" intensity={0} distance={13} decay={2} />)}</>;
}
