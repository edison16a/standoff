import * as THREE from "three";

/**
 * Every texture is painted on a canvas the first time it is asked for, then
 * shared. Nothing is downloaded, so the hall appears at once and works
 * offline. Randomness is seeded, so every run paints the same grain.
 */

type Paint = (ctx: CanvasRenderingContext2D, w: number, h: number, rand: () => number) => void;

interface TextureOptions {
  width?: number;
  height?: number;
  /** Colour data (sRGB). False for bump and roughness maps. */
  color?: boolean;
  repeat?: boolean;
}

const cache = new Map<string, THREE.CanvasTexture>();

export function seeded(seed: number): () => number {
  let s = seed % 2147483647 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function canvasTexture(key: string, paint: Paint, options: TextureOptions = {}): THREE.CanvasTexture {
  const hit = cache.get(key);
  if (hit) return hit;
  const width = options.width ?? 256;
  const height = options.height ?? width;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available.");
  let seed = 7;
  for (const char of key) seed = (seed * 31 + char.charCodeAt(0)) % 2147483647;
  paint(ctx, width, height, seeded(seed));
  const texture = new THREE.CanvasTexture(canvas);
  if (options.color !== false) texture.colorSpace = THREE.SRGBColorSpace;
  if (options.repeat !== false) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  cache.set(key, texture);
  return texture;
}

/** Brushed metal streaks, as a bump map, for plate armour and guards. */
export function brushedBump(): THREE.CanvasTexture {
  return canvasTexture("brushed", (ctx, w, h, rand) => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      const v = 110 + rand() * 60;
      ctx.strokeStyle = `rgba(${v},${v},${v},0.5)`;
      ctx.lineWidth = 0.5 + rand();
      const y = rand() * h;
      ctx.beginPath();
      ctx.moveTo(rand() * w, y);
      ctx.lineTo(rand() * w, y + (rand() - 0.5) * 2);
      ctx.stroke();
    }
  }, { color: false });
}

/** A soft round glow, white in the middle, for lamps, sparks and flashes. */
export function glowTexture(): THREE.CanvasTexture {
  return canvasTexture("glow", (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, "rgba(255,255,255,0.7)");
    g.addColorStop(0.5, "rgba(255,255,255,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  }, { width: 128, repeat: false });
}

/** A beam of light fading along its length and toward its edges, for spotlight cones. */
export function beamTexture(): THREE.CanvasTexture {
  return canvasTexture("beam", (ctx, w, h) => {
    const along = ctx.createLinearGradient(0, 0, 0, h);
    along.addColorStop(0, "rgba(255,255,255,0.9)");
    along.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "destination-in";
    const across = ctx.createLinearGradient(0, 0, w, 0);
    across.addColorStop(0, "rgba(0,0,0,0)");
    across.addColorStop(0.5, "rgba(0,0,0,1)");
    across.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, w, h);
  }, { width: 64, height: 256, repeat: false });
}
