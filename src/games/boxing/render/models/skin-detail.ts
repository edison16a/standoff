import * as THREE from "three";
import { seeded } from "../../engine/random";

const SIZE = 256;

/**
 * A tiling normal map of skin's fine grain: pores and the faint unevenness
 * of real skin, so close ups under the ring lights break up the highlight
 * instead of shining like plastic. Built once from seeded noise.
 */
export function skinDetail(): THREE.DataTexture {
  const random = seeded(808);
  const height = new Float32Array(SIZE * SIZE);
  // Two octaves of smooth bumps and a sprinkle of pores.
  const blobs = (count: number, radius: number, depth: number) => {
    for (let i = 0; i < count; i++) {
      const cx = random() * SIZE;
      const cy = random() * SIZE;
      const r = radius * (0.6 + random() * 0.8);
      const sign = random() < 0.5 ? -1 : 1;
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          const d = Math.hypot(dx, dy) / r;
          if (d >= 1) continue;
          const x = (Math.floor(cx + dx) + SIZE) % SIZE;
          const y = (Math.floor(cy + dy) + SIZE) % SIZE;
          height[y * SIZE + x] = height[y * SIZE + x]! + sign * depth * (1 - d * d) * (1 - d * d);
        }
      }
    }
  };
  blobs(90, 14, 0.5);
  blobs(700, 3, 0.35);
  blobs(2600, 1.2, -0.5);
  const data = new Uint8Array(SIZE * SIZE * 4);
  const at = (x: number, y: number) => height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]!;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const nx = (at(x - 1, y) - at(x + 1, y)) * 0.9;
      const ny = (at(x, y - 1) - at(x, y + 1)) * 0.9;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * SIZE + x) * 4;
      data[i] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[i + 2] = Math.round(((1 / len) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, SIZE, SIZE, THREE.RGBAFormat);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
