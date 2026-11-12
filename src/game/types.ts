export type Vec3 = [number, number, number];
export type CameraMode = "third" | "first";
export type ColliderType = "box" | "compound" | "trimesh";
export type WorldAssetConfig = {
  id: string; type: "building" | "classroom" | "staircase" | "prop";
  source: "procedural" | "gltf"; modelUrl?: string; position: Vec3; rotation: Vec3;
  scale: Vec3; colliderType: ColliderType;
};
export type Interaction = { id: string; label: string; title: string; body: string; position: Vec3; radius: number };
export type PlayerMotionState = "idle" | "walk" | "run" | "jump" | "fall" | "land" | "stairs" | "sit";
