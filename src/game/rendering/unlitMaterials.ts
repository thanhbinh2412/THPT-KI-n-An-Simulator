import * as THREE from "three";

type MaterialSlot = THREE.Material | THREE.Material[];
type Replacement = { mesh: THREE.Mesh; original: MaterialSlot };

function asUnlitMaterial(source: THREE.Material, doubleSided: boolean) {
  const lit = source as THREE.MeshStandardMaterial;
  const material = new THREE.MeshBasicMaterial({
    name: `${source.name || "GLB material"} (unlit)`,
    color: lit.color?.clone() ?? new THREE.Color("#ffffff"),
    map: lit.map ?? null,
    alphaMap: lit.alphaMap ?? null,
    transparent: source.transparent,
    opacity: source.opacity,
    alphaTest: source.alphaTest,
    side: doubleSided ? THREE.DoubleSide : source.side,
    vertexColors: lit.vertexColors === true,
    blending: source.blending,
    depthTest: source.depthTest,
    depthWrite: source.depthWrite,
    polygonOffset: source.polygonOffset,
    polygonOffsetFactor: source.polygonOffsetFactor,
    polygonOffsetUnits: source.polygonOffsetUnits,
  });
  material.toneMapped = false;
  return material;
}

/** Makes a mounted GLTF visual unlit and restores its cached source on cleanup. */
export function applyUnlitMaterials(root: THREE.Object3D) {
  const replacements: Replacement[] = [];
  const converted = new Map<string, THREE.MeshBasicMaterial>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = false;
    object.receiveShadow = false;
    const flagSurface = /flag/i.test(object.name);
    const convert = (source: THREE.Material) => {
      if ((source as THREE.ShaderMaterial).isShaderMaterial || (source as THREE.MeshBasicMaterial).isMeshBasicMaterial) return source;
      const key = `${source.uuid}:${flagSurface ? "double-sided" : "front-sided"}`;
      let material = converted.get(key);
      if (!material) {
        material = asUnlitMaterial(source, flagSurface);
        converted.set(key, material);
      }
      return material;
    };
    const original = object.material;
    const replacement = Array.isArray(original) ? original.map(convert) : convert(original);
    if (replacement !== original) {
      replacements.push({ mesh: object, original });
      object.material = replacement;
    }
  });
  return () => {
    replacements.forEach(({ mesh, original }) => { mesh.material = original; });
    converted.forEach((material) => material.dispose());
  };
}
