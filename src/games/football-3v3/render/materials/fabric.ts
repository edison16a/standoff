import * as THREE from "three";

/**
 * The jersey's mesh knit as a tiling normal map: rows of little round
 * holes set in a brick pattern, the way athletic mesh is woven. Made
 * from a height field in plain arrays, so it costs no canvas and tests
 * can read it.
 */
export function knitHeight(size: number): Float32Array {
  const h = new Float32Array(size * size);
  const cells = 8;
  const cell = size / cells;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const row = Math.floor(y / cell);
      // Every other row of holes is shifted half a cell, like bricks.
      const cx = ((x + (row % 2) * cell * 0.5) % cell) / cell - 0.5;
      const cy = (y % cell) / cell - 0.5;
      const r = Math.hypot(cx * 1.15, cy);
      h[y * size + x] = r < 0.3 ? -Math.cos((r / 0.3) * Math.PI * 0.5) : 0.15 * Math.sin(r * Math.PI * 2);
    }
  }
  return h;
}

export function knitNormalMap(size = 128): THREE.DataTexture {
  const h = knitHeight(size);
  const data = new Uint8Array(size * size * 4);
  const at = (x: number, y: number) => h[((y + size) % size) * size + ((x + size) % size)]!;
  const n = new THREE.Vector3();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      n.set(at(x - 1, y) - at(x + 1, y), at(x, y - 1) - at(x, y + 1), 1.6).normalize();
      const o = (y * size + x) * 4;
      data[o] = (n.x * 0.5 + 0.5) * 255;
      data[o + 1] = (n.y * 0.5 + 0.5) * 255;
      data[o + 2] = (n.z * 0.5 + 0.5) * 255;
      data[o + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}
