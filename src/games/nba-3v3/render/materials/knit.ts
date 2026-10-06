import * as THREE from "three";

/** The height of a basketball jersey's mesh knit at a texel: rows of small round holes, every other row offset. */
export function knitHeight(x: number, y: number, size: number): number {
  const cell = size / 4;
  const row = Math.floor(y / cell);
  const cx = ((x + (row % 2) * cell * 0.5) % cell) - cell / 2;
  const cy = (y % cell) - cell / 2;
  const r = Math.hypot(cx, cy) / (cell * 0.32);
  return r < 1 ? -Math.cos((r * Math.PI) / 2) : 0;
}

/**
 * A tiling normal map of the knit, made once in code. It is tiled many
 * times over the kit, so up close the cloth shows its holes and from
 * the broadcast camera it melts into a soft sheen.
 */
export function knitNormalMap(size = 64): THREE.DataTexture {
  const data = new Uint8Array(size * size * 4);
  const h = (x: number, y: number) => knitHeight((x + size) % size, (y + size) % size, size);
  const depth = 2.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (h(x + 1, y) - h(x - 1, y)) * depth;
      const dy = (h(x, y + 1) - h(x, y - 1)) * depth;
      const n = new THREE.Vector3(-dx, -dy, 2).normalize();
      data.set([(n.x * 0.5 + 0.5) * 255, (n.y * 0.5 + 0.5) * 255, (n.z * 0.5 + 0.5) * 255, 255], (y * size + x) * 4);
    }
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}
