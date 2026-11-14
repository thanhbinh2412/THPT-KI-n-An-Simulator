"use client";
import { useGLTF } from "@react-three/drei";
import { RigidBody, TrimeshCollider } from "@react-three/rapier";
import { useMemo } from "react";
import * as THREE from "three";
import { campusCollisionUrl } from "@/game/config/campus.config";

/** Independent simplified navigation asset; no bounds from visual buildings. */
export function CampusCollision() {
  const { scene } = useGLTF(campusCollisionUrl);
  const shapes = useMemo(() => {
    scene.updateMatrixWorld(true);
    const result: Array<{ id: string; vertices: Float32Array; indices: Uint32Array }> = [];
    const point = new THREE.Vector3();
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const position = object.geometry.getAttribute("position");
      const vertices = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
        vertices.set([point.x, point.y, point.z], i * 3);
      }
      const source = object.geometry.getIndex();
      const indices = source ? Uint32Array.from(source.array) : Uint32Array.from({ length: position.count }, (_, i) => i);
      result.push({ id: object.uuid, vertices, indices });
    });
    return result;
  }, [scene]);
  return <RigidBody type="fixed" colliders={false} userData={{ campusVersion: "V02", navigation: true }}>
    {shapes.map((shape) => <TrimeshCollider key={shape.id} args={[shape.vertices, shape.indices]} />)}
  </RigidBody>;
}
