export const CHARACTER_CONFIG = {
  modelUrl: "/models/characters/kien_an_student_lowpoly.glb",
  // Measured GLB bounds: 1.8925 m; this places it at a ~1.70 m gameplay height.
  modelScale: .9,
  modelRotationY: 0,
  // Local offset from the capsule centre; calculated from the GLB sole and capsule base.
  modelOffsetY: -.835,
} as const;
