import * as THREE from "three";

const SIZE = 512;

/** A tiny seeded random, so every renderer paints the same turf. */
function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Thousands of short blades on dark thatch, drawn wrapping at the edges so the tile repeats with no seam. */
function blades(ctx: CanvasRenderingContext2D, rand: () => number): void {
  ctx.fillStyle = "rgb(70,70,70)";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.lineCap = "round";
  for (let i = 0; i < 26000; i++) {
    const x = rand() * SIZE;
    const y = rand() * SIZE;
    // Blades lean mostly one way, as mown turf does, with plenty of strays.
    const a = Math.PI * 0.5 + (rand() - 0.5) * (rand() < 0.8 ? 0.9 : 3);
    const len = 5 + rand() * 11;
    const g = Math.round(90 + rand() * 150);
    ctx.strokeStyle = `rgb(${g},${g},${g})`;
    ctx.lineWidth = 0.8 + rand() * 1.3;
    const dx = Math.cos(a) * len;
    const dy = Math.sin(a) * len;
    for (const ox of [-SIZE, 0, SIZE]) {
      for (const oy of [-SIZE, 0, SIZE]) {
        if (x + ox + Math.min(0, dx) > SIZE + 2 || x + ox + Math.max(0, dx) < -2) continue;
        if (y + oy + Math.min(0, dy) > SIZE + 2 || y + oy + Math.max(0, dy) < -2) continue;
        ctx.beginPath();
        ctx.moveTo(x + ox, y + oy);
        ctx.lineTo(x + ox + dx, y + oy + dy);
        ctx.stroke();
      }
    }
  }
}

/**
 * The turf seen up close, as one tile that repeats: red is the blade
 * pattern (brighter blade tips against darker thatch, 0.5 on average),
 * green and blue are the surface normal it makes, and alpha a softer
 * version for clumps. The field's paint and colour come from the shader;
 * this only gives it a surface.
 */
export function grassTexture(): THREE.DataTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  blades(ctx, rng(9157));
  const src = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const h = new Float32Array(SIZE * SIZE);
  let mean = 0;
  for (let i = 0; i < h.length; i++) mean += h[i] = src[i * 4]! / 255;
  mean /= h.length;
  const at = (x: number, y: number) => h[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)]!;
  const out = new Uint8Array(SIZE * SIZE * 4);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      // Slopes across a few texels, wrapping, for a normal that tilts with each blade.
      const sx = (at(x + 1, y) - at(x - 1, y)) * 2.2;
      const sy = (at(x, y + 1) - at(x, y - 1)) * 2.2;
      const len = Math.hypot(sx, sy, 1);
      const soft = (at(x - 3, y) + at(x + 3, y) + at(x, y - 3) + at(x, y + 3) + at(x, y)) / 5;
      out[i] = Math.round(THREE.MathUtils.clamp(0.5 + (h[y * SIZE + x]! - mean) * 1.2, 0, 1) * 255);
      out[i + 1] = Math.round((0.5 - (0.5 * sx) / len) * 255);
      out[i + 2] = Math.round((0.5 - (0.5 * sy) / len) * 255);
      out[i + 3] = Math.round(THREE.MathUtils.clamp(0.5 + (soft - mean) * 1.6, 0, 1) * 255);
    }
  }
  const texture = new THREE.DataTexture(out, SIZE, SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}
