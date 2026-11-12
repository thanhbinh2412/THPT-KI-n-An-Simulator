"use client";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import { type RapierRigidBody } from "@react-three/rapier";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { campusConfig, campusGateConfig, type CampusGateId } from "@/game/config/campus.config";
import { useGameStore } from "@/game/store/useGameStore";
import { ClassroomDoors } from "@/game/classrooms/ClassroomDoors";
import { CampusCollision } from "./CampusCollision";

const UP = new THREE.Vector3(0, 1, 0);
const LED_TEXTURE_URL = "/assets/school/led.png";
const CENTER_STAGE_LED_MESH = "V31_CENTER_STAGE_LED_BLOCKER";
const GUARD_ROOM_BANNER_MESH = "V65_GUARD_ROAD_BANNER_CONTENT";
const GUARD_ROOM_BANNER_TEXT = "THPT Kiến An - Ngày trở về";
const photoMeshNames = new Set([
  "SCHOOL_BULLETIN_BOARD_CONTENT",
  "CLASS_12A3_PHOTO_FRONT",
  "CLASS_12A3_PHOTO_BACK",
]);
const legacyVisualPrefixes = [
  // The nearby utility-pole photo is intentionally excluded from the school scene.
  "V47_ROAD_POLE_2_USER_PHOTO",
  "V47_POLE_PHOTO_BACKING",
  "V47_POLE_PHOTO_CLAMP_TOP",
  "V47_POLE_PHOTO_CLAMP_BOTTOM",
];

function hideLegacyGeometry(scene: THREE.Group) {
  const changed: Array<{ object: THREE.Object3D; visible: boolean }> = [];
  scene.traverse((object) => {
    if (!legacyVisualPrefixes.some((prefix) => object.name.startsWith(prefix))) return;
    changed.push({ object, visible: object.visible });
    object.visible = false;
  });
  return () => changed.forEach(({ object, visible }) => { object.visible = visible; });
}

/**
 * V72 keeps the original photographs as GLB textures. The campus is made
 * unlit for performance, so give only these display surfaces dedicated,
 * untinted materials after that conversion. This preserves their embedded
 * maps while making their front/back faces reliable without touching boards,
 * signs, or any other campus material.
 */
function preparePhotoDisplayMaterials(scene: THREE.Group) {
  const originals: Array<{ mesh: THREE.Mesh; material: THREE.Material | THREE.Material[] }> = [];
  const replacements: THREE.Material[] = [];
  const diagnostics: Array<{ name: string; found: boolean; hasMap: boolean; hasImage: boolean }> = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !photoMeshNames.has(object.name)) return;
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const updatedMaterials = sourceMaterials.map((source) => {
      const material = source.clone();
      if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
        material.color.set(0xffffff);
        material.side = THREE.DoubleSide;
        material.opacity = 1;
        material.transparent = false;
        material.depthWrite = true;
        material.depthTest = true;
        material.needsUpdate = true;
      }
      replacements.push(material);
      return material;
    });
    originals.push({ mesh: object, material: object.material });
    object.material = Array.isArray(object.material) ? updatedMaterials : updatedMaterials[0];
    const firstMaterial = updatedMaterials[0] as THREE.MeshBasicMaterial | THREE.MeshStandardMaterial;
    diagnostics.push({ name: object.name, found: true, hasMap: Boolean(firstMaterial.map), hasImage: Boolean(firstMaterial.map?.image) });
  });
  if (process.env.NODE_ENV !== "production") {
    const reported = new Set(diagnostics.map(({ name }) => name));
    photoMeshNames.forEach((name) => {
      if (!reported.has(name)) diagnostics.push({ name, found: false, hasMap: false, hasImage: false });
    });
    console.info("[Campus V72] photo display materials", diagnostics);
  }
  return () => {
    originals.forEach(({ mesh, material }) => { mesh.material = material; });
    // These targeted clones are not owned by the GLTF cache.
    replacements.forEach((material) => material.dispose());
  };
}

/** Applies only the authored contact-shadow decal rules; PBR colours stay in the GLB. */
function prepareV76Decals(scene: THREE.Group) {
  const materialStates: Array<{ material: THREE.Material; depthWrite: boolean; polygonOffset: boolean; factor: number; units: number; vertexColors?: boolean }> = [];
  const meshStates: Array<{ mesh: THREE.Mesh; castShadow: boolean; receiveShadow: boolean; renderOrder: number }> = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      const standard = material as THREE.MeshStandardMaterial;
      if (material.name !== "KA75_DECAL_ao") return;
      materialStates.push({ material, depthWrite: material.depthWrite, polygonOffset: material.polygonOffset, factor: material.polygonOffsetFactor, units: material.polygonOffsetUnits, vertexColors: "vertexColors" in standard ? standard.vertexColors : undefined });
      material.depthWrite = false; material.polygonOffset = true; material.polygonOffsetFactor = -2; material.polygonOffsetUnits = -2;
      if ("vertexColors" in standard) standard.vertexColors = true;
      material.needsUpdate = true;
    });
    if (materials.some((material) => material.name === "KA75_DECAL_ao")) {
      meshStates.push({ mesh: object, castShadow: object.castShadow, receiveShadow: object.receiveShadow, renderOrder: object.renderOrder });
      object.castShadow = false; object.receiveShadow = false; object.renderOrder = 2;
    }
  });
  return () => {
    materialStates.forEach(({ material, depthWrite, polygonOffset, factor, units, vertexColors }) => {
      material.depthWrite = depthWrite; material.polygonOffset = polygonOffset; material.polygonOffsetFactor = factor; material.polygonOffsetUnits = units;
      if (vertexColors !== undefined) (material as THREE.MeshStandardMaterial).vertexColors = vertexColors;
      material.needsUpdate = true;
    });
    meshStates.forEach(({ mesh, castShadow, receiveShadow, renderOrder }) => { mesh.castShadow = castShadow; mesh.receiveShadow = receiveShadow; mesh.renderOrder = renderOrder; });
  };
}

function addPlanarUv(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute("position");
  if (!position || geometry.getAttribute("uv")) return;
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return;
  const size = new THREE.Vector3();
  bounds.getSize(size);
  // The LED is a flat facade panel. Project across its two largest local axes
  // so the supplied image covers it even though the GLB export has no UVs.
  type VectorAxis = "x" | "y" | "z";
  const componentIndex: Record<VectorAxis, number> = { x: 0, y: 1, z: 2 };
  const axes: VectorAxis[] = ["x", "y", "z"];
  axes.sort((left, right) => size[right] - size[left]);
  const first = axes[0]; const second = axes[1];
  const firstSpan = Math.max(size[first], Number.EPSILON);
  const secondSpan = Math.max(size[second], Number.EPSILON);
  const uv = new Float32Array(position.count * 2);
  const minimum = bounds.min;
  for (let index = 0; index < position.count; index += 1) {
    uv[index * 2] = (position.getComponent(index, componentIndex[first]) - minimum[first]) / firstSpan;
    uv[index * 2 + 1] = (position.getComponent(index, componentIndex[second]) - minimum[second]) / secondSpan;
  }
  geometry.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
}

/** Replaces only the central-building LED panel content; its surrounding frame remains part of the GLB. */
function prepareCenterStageLed(scene: THREE.Group, texture: THREE.Texture) {
  const mesh = scene.getObjectByName(CENTER_STAGE_LED_MESH);
  if (!(mesh instanceof THREE.Mesh)) {
    if (process.env.NODE_ENV !== "production") console.warn(`[Campus V72] LED mesh not found: ${CENTER_STAGE_LED_MESH}`);
    return () => undefined;
  }
  const original = mesh.material;
  const originalGeometry = mesh.geometry;
  // GLB V72's display surface has vertex colours but no UV attribute.
  // Clone before adding UVs because useGLTF caches the source geometry.
  const geometry = originalGeometry.clone();
  addPlanarUv(geometry);
  mesh.geometry = geometry;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  const material = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false });
  mesh.material = material;
  return () => { mesh.material = original; mesh.geometry = originalGeometry; geometry.dispose(); material.dispose(); };
}

function createGuardRoomBannerTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 2048; canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.fillStyle = "#fffdf7";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#a53931";
  context.font = "700 126px Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(GUARD_ROOM_BANNER_TEXT, canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  // The authored banner UV is horizontally mirrored. Match its vertical GLTF
  // orientation and reverse U only, so the new Vietnamese text reads normally.
  texture.flipY = false;
  texture.repeat.set(-1, 1);
  texture.offset.set(1, 0);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function prepareGuardRoomBanner(scene: THREE.Group) {
  const mesh = scene.getObjectByName(GUARD_ROOM_BANNER_MESH);
  if (!(mesh instanceof THREE.Mesh)) {
    if (process.env.NODE_ENV !== "production") console.warn(`[Campus V72] guard-room banner mesh not found: ${GUARD_ROOM_BANNER_MESH}`);
    return () => undefined;
  }
  const texture = createGuardRoomBannerTexture();
  if (!texture) return () => undefined;
  const original = mesh.material;
  const material = new THREE.MeshBasicMaterial({ map: texture, color: 0xffffff, side: THREE.DoubleSide, toneMapped: false });
  mesh.material = material;
  return () => { mesh.material = original; material.dispose(); texture.dispose(); };
}

type GateSpec = {
  id: CampusGateId; hinges: string[]; pivots: THREE.Vector3[]; offsets: THREE.Vector3[];
  closed: number[]; open: number[]; colliders: Array<[number, number, number]>; colliderCenterY: number[];
};
const gateSpecs: GateSpec[] = [
  // Bounds measured from the campus gate subtrees, not approximated from the visible opening.
  { id: "main", hinges: ["GateLeaf_Left_Hinge", "GateLeaf_Right_Hinge"], pivots: [new THREE.Vector3(-4.02, 0, 37.45), new THREE.Vector3(4.08, 0, 37.6)], offsets: [new THREE.Vector3(0, 0, -1.974), new THREE.Vector3(-2.034, 0, 0)], closed: [-Math.PI / 2, 0], open: [0, -1.4], colliders: [[.08, 1.59, 2.04], [2.05, 1.65, .08]], colliderCenterY: [1.64, 1.7] },
  { id: "left", hinges: ["SideGate_LEFT_Hinge"], pivots: [new THREE.Vector3(-8.93, 0, 37.5)], offsets: [new THREE.Vector3(1.555, 0, 0)], closed: [0], open: [1.45], colliders: [[1.565, 1.07, .15]], colliderCenterY: [1.11] },
  { id: "right", hinges: ["SideGate_RIGHT_Hinge"], pivots: [new THREE.Vector3(8.93, 0, 37.5)], offsets: [new THREE.Vector3(-1.555, 0, 0)], closed: [0], open: [-1.45], colliders: [[1.565, 1.07, .15]], colliderCenterY: [1.11] },
];

function updateBody(body: RapierRigidBody | null, pivot: THREE.Vector3, offset: THREE.Vector3, angle: number, centerY: number) {
  if (!body) return; const rotation = new THREE.Quaternion().setFromAxisAngle(UP, angle); const position = offset.clone().applyQuaternion(rotation).add(pivot);
  body.setNextKinematicTranslation({ x: position.x, y: centerY, z: position.z }); body.setNextKinematicRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w });
}

function AnimatedGate({ spec, scene }: { spec: GateSpec; scene: THREE.Group }) {
  const bodies = useRef<Array<RapierRigidBody | null>>([]); const angles = useRef([...spec.closed]); const hinges = useMemo(() => spec.hinges.map((name) => scene.getObjectByName(name)), [scene, spec]);
  useEffect(() => {
    const open = useGameStore.getState().campusGates[spec.id];
    hinges.forEach((hinge, index) => {
      const angle = open ? spec.open[index] : spec.closed[index];
      angles.current[index] = angle;
      if (hinge) hinge.rotation.y = angle; else console.warn(`Campus V35 hinge missing: ${spec.hinges[index]}`);
    });
  }, [hinges, spec]);
  useFrame((_, delta) => {
    const store = useGameStore.getState(); const open = store.campusGates[spec.id]; const lambda = 6 / campusGateConfig[spec.id].duration;
    const player = store.playerPosition; const pivot = spec.pivots[0]; const occupied = Math.abs(player[0] - pivot.x) < (spec.id === "main" ? 5 : 3) && Math.abs(player[2] - pivot.z) < 3.6;
    if (store.campusGateCloseRequested === spec.id && !occupied) store.closeCampusGateWhenClear(spec.id);
    spec.pivots.forEach((pivotPoint, index) => { angles.current[index] = THREE.MathUtils.damp(angles.current[index], open ? spec.open[index] : spec.closed[index], lambda, delta); if (hinges[index]) hinges[index]!.rotation.y = angles.current[index]; updateBody(bodies.current[index], pivotPoint, spec.offsets[index], angles.current[index], spec.colliderCenterY[index]); });
  });
  // The V75 collider manifest supplies the moving gate colliders from the
  // actual leaf nodes. Keep this component strictly responsible for visuals.
  return null;
}

/** Primary V72 visual scene. Embedded photo displays retain their original GLB textures. */
export function CampusModel({ collisionsEnabled = true }: { collisionsEnabled?: boolean }) {
  const { scene, animations } = useGLTF(campusConfig.modelUrl);
  const ledTexture = useTexture(LED_TEXTURE_URL);
  const trafficMixer = useMemo(() => new THREE.AnimationMixer(scene), [scene]);
  useLayoutEffect(() => {
    const restoreV76Decals = prepareV76Decals(scene);
    // V76 is intentionally rendered with GLTFLoader's original materials and
    // geometry. Do not replace, clone, batch, recolour, or hide model nodes.
    return restoreV76Decals;
  }, [scene]);
  useLayoutEffect(() => prepareCenterStageLed(scene, ledTexture), [ledTexture, scene]);
  useEffect(() => {
    const traffic = animations.find((clip) => clip.name === "TrafficLoop_V23");
    // V60 has no campus animation clips; keep this optional so the loader does
    // not report a false error while character/NPC animation remains unchanged.
    if (!traffic) return;
    const action = trafficMixer.clipAction(traffic); action.setLoop(THREE.LoopRepeat, Infinity); action.play();
    return () => { action.stop(); trafficMixer.stopAllAction(); trafficMixer.uncacheRoot(scene); };
  }, [animations, scene, trafficMixer]);
  useFrame((_, delta) => trafficMixer.update(delta));
  return <group position={campusConfig.position} rotation={campusConfig.rotation} scale={campusConfig.scale}><primitive object={scene} />{collisionsEnabled && <CampusCollision scene={scene} />}<ClassroomDoors scene={scene} />{gateSpecs.map((spec) => <AnimatedGate key={spec.id} spec={spec} scene={scene} />)}</group>;
}

useGLTF.preload(campusConfig.modelUrl);
useTexture.preload(LED_TEXTURE_URL);
