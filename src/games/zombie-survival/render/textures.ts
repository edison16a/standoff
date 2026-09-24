import * as THREE from "three";
import { lowQuality } from "./quality";

/**
 * Every texture is painted on a canvas when first asked for, then
 * shared. Nothing is downloaded, so the game starts instantly and works
 * offline, and grime, cracks and lit windows still read as detail.
 */

const cache = new Map<string, THREE.Texture>();

type Paint = (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void;

function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

export function canvasTexture(key: string, size: number, paint: Paint, opts: { color?: boolean; repeat?: boolean } = {}): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available.");
  paint(ctx, size, seeded(key.length * 977 + key.charCodeAt(0) * 31));
  const texture = new THREE.CanvasTexture(canvas);
  if (opts.color !== false) texture.colorSpace = THREE.SRGBColorSpace;
  if (opts.repeat !== false) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = lowQuality() ? 1 : 4;
  cache.set(key, texture);
  return texture;
}

/** Speckles every pixel block a little lighter or darker than the base. */
export function speckle(ctx: CanvasRenderingContext2D, size: number, rand: () => number, base: [number, number, number], spread: number, cell = 2): void {
  for (let y = 0; y < size; y += cell) {
    for (let x = 0; x < size; x += cell) {
      const v = (rand() - 0.5) * spread;
      ctx.fillStyle = `rgb(${base[0] + v},${base[1] + v},${base[2] + v})`;
      ctx.fillRect(x, y, cell, cell);
    }
  }
}

/** Soft dark blotches: oil, damp and dried blood. */
export function blotches(ctx: CanvasRenderingContext2D, size: number, rand: () => number, colour: string, count: number, max: number): void {
  for (let i = 0; i < count; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = max * (0.3 + rand() * 0.7);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, colour);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

export function cracks(ctx: CanvasRenderingContext2D, size: number, rand: () => number, colour: string, count: number): void {
  ctx.strokeStyle = colour;
  for (let i = 0; i < count; i++) {
    let x = rand() * size;
    let y = rand() * size;
    ctx.lineWidth = 0.6 + rand() * 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 6; j++) {
      x += (rand() - 0.5) * size * 0.12;
      y += (rand() - 0.5) * size * 0.12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** A soft round glow, white in the middle, for lamps, lasers and flashes. */
export function glowTexture(): THREE.Texture {
  return canvasTexture("glow", 128, (ctx, size) => {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.75)");
    g.addColorStop(0.45, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }, { repeat: false });
}

/** A ragged star for muzzle flashes. */
export function flashTexture(): THREE.Texture {
  return canvasTexture("flash", 128, (ctx, size, rand) => {
    const c = size / 2;
    ctx.translate(c, c);
    for (let i = 0; i < 9; i++) {
      ctx.rotate((Math.PI * 2) / 9 + rand() * 0.2);
      const len = c * (0.55 + rand() * 0.45);
      const g = ctx.createLinearGradient(0, 0, len, 0);
      g.addColorStop(0, "rgba(255,250,220,1)");
      g.addColorStop(1, "rgba(255,160,40,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -c * 0.08);
      ctx.lineTo(len, 0);
      ctx.lineTo(0, c * 0.08);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, c * 0.5);
    g.addColorStop(0, "rgba(255,255,240,1)");
    g.addColorStop(1, "rgba(255,180,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-c, -c, size, size);
  }, { repeat: false });
}

/** Big white text on a coloured board, for road signs and the hospital. */
export function signTexture(key: string, lines: string[], bg: string, fg: string, width = 512, height = 256): THREE.Texture {
  const hit = cache.get(`sign:${key}`);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const sizePx = Math.floor((height * 0.7) / lines.length);
  ctx.font = `700 ${sizePx}px Arial, Helvetica, sans-serif`;
  lines.forEach((line, i) => ctx.fillText(line, width / 2, (height / (lines.length + 1)) * (i + 1)));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  cache.set(`sign:${key}`, texture);
  return texture;
}

export function disposeTextures(): void {
  for (const texture of cache.values()) texture.dispose();
  cache.clear();
}
