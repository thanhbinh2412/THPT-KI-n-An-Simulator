"use client";

import { useFrame, useThree } from "@react-three/fiber";
import type { RapierRigidBody } from "@react-three/rapier";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGameStore } from "@/game/store/useGameStore";

const TPS_DISTANCE = 5.8;
const TPS_MIN_DISTANCE = 1.35;
const TPS_OCCLUSION_PADDING = .32;
const TPS_FOV = 58;
const TPS_CLOSE_FOV = 66;

let heading = 0;
export const getCameraHeading = () => heading;

// The desktop path updates these values through pointer lock.  Keeping the
// mobile path here makes both input methods drive exactly the same camera.
export const rotateCamera = (deltaX: number, deltaY: number) => {
  heading -= deltaX * .004;
  cameraPitch = THREE.MathUtils.clamp(cameraPitch - deltaY * .0032, -1.1, .65);
};

let cameraPitch = -.18;

type MaterialSlot = THREE.Material | THREE.Material[];
type FadedOccluder = { mesh: THREE.Mesh; original: MaterialSlot; replacements: THREE.Material[] };

function fadeMaterial(material: THREE.Material) {
  const clone = material.clone();
  clone.transparent = true;
  clone.opacity = Math.min(material.opacity, .22);
  clone.depthWrite = false;
  clone.needsUpdate = true;
  return clone;
}

/**
 * Third-person camera with a retractable collision arm. Visual raycasting is
 * deliberate here: the campus model is the authoritative occlusion surface,
 * while Rapier continues to own player movement and physical collision.
 */
export function CameraController({ player }: { player: React.RefObject<RapierRigidBody | null> }) {
  const { camera, gl, scene } = useThree();
  const mode = useGameStore((s) => s.cameraMode);
  const paused = useGameStore((s) => s.paused);
  const sittingOnBench = useGameStore((s) => s.benchSeatIndex !== null);
  const target = useRef(new THREE.Vector3());
  const desired = useRef(new THREE.Vector3());
  const arm = useRef(new THREE.Vector3());
  const forward = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const armLift = useRef(new THREE.Vector3(0, 1.35, 0));
  const lookLift = useRef(new THREE.Vector3());
  const raycaster = useRef(new THREE.Raycaster());
  const currentDistance = useRef(TPS_DISTANCE);
  const lastOcclusionSample = useRef(-Infinity);
  const occlusion = useRef<{ distance: number; mesh: THREE.Mesh | null }>({ distance: TPS_DISTANCE, mesh: null });
  const faded = useRef<FadedOccluder | null>(null);

  const clearFadedOccluder = () => {
    const current = faded.current;
    if (!current) return;
    current.mesh.material = current.original;
    current.replacements.forEach((material) => material.dispose());
    faded.current = null;
  };

  const setFadedOccluder = (mesh: THREE.Mesh | null) => {
    if (faded.current?.mesh === mesh) return;
    clearFadedOccluder();
    if (!mesh || !mesh.visible) return;
    const original = mesh.material;
    const materials = Array.isArray(original) ? original : [original];
    // Keep sky and custom shader effects intact; the retracting arm alone
    // handles those rather than altering their render path.
    if (materials.some((material) => (material as THREE.ShaderMaterial).isShaderMaterial)) return;
    const replacements = materials.map(fadeMaterial);
    mesh.material = Array.isArray(original) ? replacements : replacements[0];
    faded.current = { mesh, original, replacements };
  };

  useEffect(() => {
    const canvas = gl.domElement;
    const lock = () => { if (!paused && window.matchMedia("(pointer:fine)").matches) canvas.requestPointerLock?.(); };
    const move = (event: MouseEvent) => {
      if (document.pointerLockElement === canvas) {
        heading -= event.movementX * .0024;
        cameraPitch = THREE.MathUtils.clamp(cameraPitch - event.movementY * .002, -1.1, .65);
      }
    };
    canvas.addEventListener("click", lock);
    document.addEventListener("mousemove", move);
    return () => { canvas.removeEventListener("click", lock); document.removeEventListener("mousemove", move); };
  }, [gl, paused]);

  useEffect(() => () => clearFadedOccluder(), []);

  useFrame((state, delta) => {
    const body = player.current;
    if (!body) return;

    const p = body.translation();
    const cameraHeight = sittingOnBench ? (mode === "first" ? .3 : .52) : (mode === "first" ? .62 : .95);
    target.current.set(p.x, p.y + cameraHeight, p.z);
    forward.current.set(Math.sin(heading), 0, Math.cos(heading));

    if (mode === "first") {
      clearFadedOccluder();
      currentDistance.current = TPS_DISTANCE;
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.damp(camera.fov, TPS_FOV, 12, delta);
        camera.updateProjectionMatrix();
      }
      camera.position.lerp(target.current, 1 - Math.exp(-delta * 14));
    } else {
      // Camera arm starts at the player and retracts before the closest visual
      // wall/railing/ceiling, solving corridors and stair landings alike.
      arm.current.copy(forward.current).multiplyScalar(TPS_DISTANCE).add(armLift.current);
      const armLength = arm.current.length();
      const armDirection = arm.current.normalize();
      if (state.clock.elapsedTime - lastOcclusionSample.current >= 1 / 30) {
        raycaster.current.set(target.current, armDirection);
        raycaster.current.near = .48; // Ignore the local avatar at the camera target.
        raycaster.current.far = armLength;
        const hit = raycaster.current.intersectObjects(scene.children, true)
          .find((intersection) => intersection.object instanceof THREE.Mesh && intersection.object.visible);
        occlusion.current = { distance: hit?.distance ?? armLength, mesh: hit?.object instanceof THREE.Mesh ? hit.object : null };
        lastOcclusionSample.current = state.clock.elapsedTime;
      }
      const allowedDistance = occlusion.current.mesh
        ? THREE.MathUtils.clamp(occlusion.current.distance - TPS_OCCLUSION_PADDING, TPS_MIN_DISTANCE, armLength)
        : armLength;
      currentDistance.current = THREE.MathUtils.damp(currentDistance.current, allowedDistance, 22, delta);
      desired.current.copy(target.current).addScaledVector(armDirection, currentDistance.current);
      camera.position.lerp(desired.current, 1 - Math.exp(-delta * 18));

      const compression = THREE.MathUtils.clamp((armLength - currentDistance.current) / (armLength - TPS_MIN_DISTANCE), 0, 1);
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.damp(camera.fov, THREE.MathUtils.lerp(TPS_FOV, TPS_CLOSE_FOV, compression), 12, delta);
        camera.updateProjectionMatrix();
      }

      // If an object is still inside the minimum safe camera arm, fade only
      // that occluding mesh until the player has enough room on screen.
      setFadedOccluder(occlusion.current.mesh && allowedDistance <= TPS_MIN_DISTANCE + .01 ? occlusion.current.mesh : null);
    }

    look.current.copy(target.current).add(lookLift.current.set(0, Math.sin(cameraPitch) * 4, 0)).addScaledVector(forward.current, -8);
    camera.lookAt(look.current);
  });

  return null;
}
