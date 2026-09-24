import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from "three";

/**
 * Helpers for painting textures on a canvas at load time. Every surface in
 * the game is painted in code, so the game ships no image files and every
 * fruit can have its own peel, rind and flesh.
 */

export type Ctx = CanvasRenderingContext2D;

export function canvas(width: number, height = width): { c: HTMLCanvasElement; ctx: Ctx } {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is not available in this browser.");
  return { c, ctx };
}

/** A colour texture. Colour maps are in sRGB, data maps like bump are not. */
export function texture(c: HTMLCanvasElement, options: { color?: boolean; wrap?: boolean } = {}): Texture {
  const tex = new CanvasTexture(c);
  if (options.color !== false) tex.colorSpace = SRGBColorSpace;
  if (options.wrap) tex.wrapS = tex.wrapT = RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Deterministic hash noise so every load paints the same fruit. */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise from 0 to 1. `wrapX` makes it tile around a fruit's circumference. */
export function noise(x: number, y: number, seed = 0, wrapX = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const fx = x - xi;
  const fy = y - yi;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const w = (v: number) => (wrapX > 0 ? ((v % wrapX) + wrapX) % wrapX : v);
  const a = hash(w(xi), yi, seed);
  const b = hash(w(xi + 1), yi, seed);
  const c = hash(w(xi), yi + 1, seed);
  const d = hash(w(xi + 1), yi + 1, seed);
  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

/** Layered noise for natural looking variation. */
export function fbm(x: number, y: number, octaves = 4, seed = 0, wrapX = 0): number {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq, seed + i * 17, wrapX ? wrapX * freq : 0);
    amp *= 0.5;
    freq *= 2;
  }
  return sum / (1 - Math.pow(0.5, octaves));
}

/** A seeded random stream for scattering seeds, dots and streaks. */
export function scatter(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rgb = [number, number, number];

export function hex(value: string): Rgb {
  const n = parseInt(value.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

/**
 * Fills a canvas pixel by pixel. `shade` gets texture coordinates from 0
 * to 1, with v = 0 at the bottom as three.js reads it, and returns a colour. Used for grain and peel, where per pixel
 * noise looks far better than drawn shapes.
 */
export function shadePixels(ctx: Ctx, width: number, height: number, shade: (u: number, v: number, x: number, y: number) => Rgb): void {
  const image = ctx.createImageData(width, height);
  const data = image.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = shade((x + 0.5) / width, 1 - (y + 0.5) / height, x, y);
      const i = (y * width + x) * 4;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
}

export function rgb(c: Rgb, alpha = 1): string {
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
}

/** Clamped smooth step, as in shaders. */
export function smooth(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Scatters soft round dots, for pits, pores and freckles. v runs up the texture. */
export function dots(ctx: Ctx, width: number, height: number, count: number, seed: number, draw: (x: number, y: number, r: () => number) => void): void {
  const r = scatter(seed);
  for (let i = 0; i < count; i++) draw(r() * width, r() * height, r);
}
