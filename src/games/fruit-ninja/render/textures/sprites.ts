import type { Texture } from "three";
import { canvas, fbm, scatter, texture } from "./paint";

/**
 * Small greyscale sprites that effects tint with their own colour: a soft
 * glow, a four point sparkle, a smoke puff, juice splats and cracks.
 * Each is painted once and shared.
 */

const cache = new Map<string, Texture>();

function once(key: string, paint: () => Texture): Texture {
  let tex = cache.get(key);
  if (!tex) {
    tex = paint();
    cache.set(key, tex);
  }
  return tex;
}

export function glowTexture(): Texture {
  return once("glow", () => {
    const { c, ctx } = canvas(128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.2, "rgba(255,255,255,0.75)");
    g.addColorStop(0.5, "rgba(255,255,255,0.22)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return texture(c);
  });
}

/** A bright dot with four long rays, for rare fruit glitter and blade sparks. */
export function sparkleTexture(): Texture {
  return once("sparkle", () => {
    const { c, ctx } = canvas(128);
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 22);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    for (const [w, h] of [
      [4, 62],
      [62, 4],
    ] as const) {
      const ray = ctx.createRadialGradient(64, 64, 0, 64, 64, 62);
      ray.addColorStop(0, "rgba(255,255,255,0.95)");
      ray.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = ray;
      ctx.beginPath();
      ctx.ellipse(64, 64, w, h, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    return texture(c);
  });
}

export function smokeTexture(): Texture {
  return once("smoke", () => {
    const { c, ctx } = canvas(128);
    const image = ctx.createImageData(128, 128);
    for (let y = 0; y < 128; y++) {
      for (let x = 0; x < 128; x++) {
        const d = Math.hypot(x - 64, y - 64) / 64;
        const n = fbm(x / 24, y / 24, 4, 7);
        // The last fade guarantees nothing at the sprite edge, or the square would show.
        const a = Math.max(0, 1 - d * (1.1 - n * 0.5)) * (0.5 + n * 0.8) * Math.max(0, Math.min(1, (1 - d) / 0.3));
        const i = (y * 128 + x) * 4;
        image.data[i] = image.data[i + 1] = image.data[i + 2] = 255;
        image.data[i + 3] = Math.min(255, a * 255);
      }
    }
    ctx.putImageData(image, 0, 0);
    return texture(c);
  });
}

/** Soft rays of light fanning out from the middle, for the halo round rare fruit. */
export function raysTexture(): Texture {
  return once("rays", () => {
    const { c, ctx } = canvas(256);
    ctx.translate(128, 128);
    for (let i = 0; i < 14; i++) {
      ctx.rotate((Math.PI * 2) / 14);
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, "rgba(255,255,255,0.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      const spread = i % 2 === 0 ? 10 : 5;
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-spread, 128);
      ctx.lineTo(spread, 128);
      ctx.lineTo(2, 0);
      ctx.fill();
    }
    return texture(c);
  });
}

/** A juice splat: a blob with droplets flung out around it. Several variants, so stains never repeat. */
export function splatTexture(variant: number): Texture {
  return once(`splat:${variant}`, () => {
    const { c, ctx } = canvas(256);
    const r = scatter(100 + variant * 13);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    const lobes = 9 + Math.floor(r() * 6);
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      const wobble = 1 + 0.18 * Math.sin(a * lobes + variant) + 0.12 * (fbm(Math.cos(a) * 2 + 3, Math.sin(a) * 2 + 3, 3, variant) - 0.5);
      const d = 62 * wobble;
      ctx.lineTo(128 + Math.cos(a) * d, 128 + Math.sin(a) * d);
    }
    ctx.fill();
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      const d = 70 + r() * 50;
      const size = 3 + r() * 9 * (1 - (d - 70) / 60);
      ctx.beginPath();
      ctx.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, Math.max(1.5, size), 0, Math.PI * 2);
      ctx.fill();
      // A streak joins the bigger drops back to the splat, like juice that ran.
      if (size > 6) {
        ctx.lineWidth = size * 0.8;
        ctx.strokeStyle = "#ffffff";
        ctx.beginPath();
        ctx.moveTo(128 + Math.cos(a) * 55, 128 + Math.sin(a) * 55);
        ctx.lineTo(128 + Math.cos(a) * d, 128 + Math.sin(a) * d);
        ctx.stroke();
      }
    }
    return texture(c);
  });
}

/** Branching cracks that spread from a few points, for big fruit taking hits. */
export function crackTexture(): Texture {
  return once("crack", () => {
    const { c, ctx } = canvas(512, 256);
    const r = scatter(77);
    ctx.lineCap = "round";
    const branch = (x: number, y: number, angle: number, length: number, width: number, depth: number) => {
      let px = x;
      let py = y;
      let a = angle;
      for (let i = 0; i < length; i++) {
        a += (r() - 0.5) * 0.7;
        const nx = px + Math.cos(a) * 7;
        const ny = py + Math.sin(a) * 7;
        ctx.strokeStyle = `rgba(40,8,6,${0.9 - i / (length * 1.6)})`;
        ctx.lineWidth = width * (1 - i / length) + 0.6;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        px = nx;
        py = ny;
        if (depth > 0 && r() < 0.12) branch(px, py, a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.6), length * 0.5, width * 0.6, depth - 1);
      }
    };
    for (let k = 0; k < 7; k++) {
      const x = r() * 512;
      const y = 40 + r() * 176;
      for (let s = 0; s < 4; s++) branch(x, y, r() * Math.PI * 2, 14 + r() * 12, 3.5, 2);
    }
    return texture(c);
  });
}
