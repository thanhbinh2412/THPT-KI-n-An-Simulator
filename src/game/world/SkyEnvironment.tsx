"use client";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

const SKY_TEXTURE_URL = "/textures/thpt_kien_an_sky.webp";

/** Blends only the outer texels once, reducing the noticeable seam of a non-guaranteed 360° source image. */
function createSeamReducedTexture(source: THREE.Texture) {
  const image = source.image as CanvasImageSource & { width: number; height: number };
  const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height;
  const context = canvas.getContext("2d"); if (!context) return source;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height); const data = pixels.data; const blendWidth = Math.min(48, Math.floor(canvas.width * .025));
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < blendWidth; x++) {
    const left = (y * canvas.width + x) * 4; const right = (y * canvas.width + (canvas.width - 1 - x)) * 4; const amount = .5 * (1 - x / blendWidth);
    for (let channel = 0; channel < 3; channel++) { const a = data[left + channel]; const b = data[right + channel]; data[left + channel] = a + (b - a) * amount; data[right + channel] = b + (a - b) * amount; }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.ClampToEdgeWrapping; texture.wrapT = THREE.ClampToEdgeWrapping; texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = true; texture.anisotropy = 2;
  return texture;
}

/** Camera-centred, inward-facing sky that deliberately has no physics or shadow participation. */
export function SkyEnvironment() {
  const sourceTexture = useLoader(THREE.TextureLoader, SKY_TEXTURE_URL); const sky = useMemo(() => createSeamReducedTexture(sourceTexture), [sourceTexture]); const mesh = useRef<THREE.Mesh>(null); const { camera } = useThree();
  useEffect(() => () => { if (sky !== sourceTexture) sky.dispose(); }, [sky, sourceTexture]);
  useFrame(() => { mesh.current?.position.copy(camera.position); });
  return <mesh ref={mesh} frustumCulled={false} renderOrder={-1000}>
    <sphereGeometry args={[220, 48, 32]} />
    <meshBasicMaterial map={sky} side={THREE.BackSide} depthWrite={false} depthTest={false} fog={false} toneMapped={false} />
  </mesh>;
}

useLoader.preload(THREE.TextureLoader, SKY_TEXTURE_URL);
