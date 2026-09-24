import * as THREE from "three";
import { Rng } from "../engine/rng";

/**
 * Textures painted in code on a canvas, once each and shared. Seeded,
 * never Math.random, so the showcase captures the same picture every time.
 */
const cache = new Map<string, THREE.Texture>();

export function painted(key: string, width: number, height: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, repeat = false): THREE.Texture {
  const found = cache.get(key);
  if (found) return found;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.userData.shared = true;
  cache.set(key, texture);
  return texture;
}

/** A soft round glow, white in the middle. */
export function glowTexture(): THREE.Texture {
  return painted("glow", 128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.7)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });
}

/** A four pointed twinkle, for coins and sparks. */
export function sparkTexture(): THREE.Texture {
  return painted("spark", 128, 128, (ctx, w) => {
    const c = w / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    for (const [dx, dy] of [[1, 0], [0, 1]] as const) {
      ctx.beginPath();
      ctx.moveTo(c - dx * c, c - dy * c);
      ctx.lineTo(c + dy * 6, c + dx * 6);
      ctx.lineTo(c + dx * c, c + dy * c);
      ctx.lineTo(c - dy * 6, c - dx * 6);
      ctx.fill();
    }
  });
}

/** The stones between and under the tracks. */
export function gravelTexture(): THREE.Texture {
  return painted(
    "gravel",
    256,
    256,
    (ctx, w, h) => {
      const rng = new Rng(11);
      ctx.fillStyle = "#8b8378";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        const shade = rng.int(95, 185);
        ctx.fillStyle = `rgb(${shade + 8},${shade + 2},${shade - 8})`;
        const r = rng.range(1.2, 4.2);
        const x = rng.range(0, w);
        const y = rng.range(0, h);
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * rng.range(0.6, 1), rng.range(0, 3), 0, Math.PI * 2);
        ctx.fill();
      }
    },
    true,
  );
}

/** Warning stripes, for barriers and ramps. */
export function stripeTexture(a: string, b: string, stripes = 6): THREE.Texture {
  return painted(`stripes-${a}-${b}-${stripes}`, 256, 64, (ctx, w, h) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = b;
    const step = w / stripes;
    for (let x = -h; x < w + h; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, h);
      ctx.lineTo(x + step / 2, h);
      ctx.lineTo(x + step / 2 + h, 0);
      ctx.lineTo(x + h, 0);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 0, w, h);
  });
}

/** Chevrons pointing up the slope of a ramp. */
export function chevronTexture(): THREE.Texture {
  return painted("chevrons", 128, 256, (ctx, w, h) => {
    ctx.fillStyle = "#2b2f3a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#ffd21f";
    for (let y = 10; y < h; y += 52) {
      ctx.beginPath();
      ctx.moveTo(14, y + 34);
      ctx.lineTo(w / 2, y + 6);
      ctx.lineTo(w - 14, y + 34);
      ctx.lineTo(w - 14, y + 50);
      ctx.lineTo(w / 2, y + 22);
      ctx.lineTo(14, y + 50);
      ctx.fill();
    }
  });
}

/** Weathered concrete, for walls, platforms and tunnels. */
export function concreteTexture(): THREE.Texture {
  return painted(
    "concrete",
    256,
    256,
    (ctx, w, h) => {
      const rng = new Rng(5);
      ctx.fillStyle = "#c9c3b8";
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = `rgba(${rng.chance(0.5) ? "255,255,255" : "70,60,50"},${rng.range(0.02, 0.08)})`;
        ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(4, 30), rng.range(2, 12));
      }
      ctx.strokeStyle = "rgba(60,50,40,0.25)";
      ctx.lineWidth = 3;
      ctx.strokeRect(1, 1, w - 2, h - 2);
      ctx.fillStyle = "rgba(60,50,40,0.12)";
      ctx.fillRect(0, h * 0.82, w, h * 0.18);
    },
    true,
  );
}

/** Red brick, in courses. */
export function brickTexture(): THREE.Texture {
  return painted(
    "brick",
    256,
    256,
    (ctx, w, h) => {
      const rng = new Rng(9);
      ctx.fillStyle = "#e8d6c0";
      ctx.fillRect(0, 0, w, h);
      const bh = 16;
      const bw = 42;
      for (let row = 0; row * bh < h; row++) {
        for (let x = (row % 2) * -bw * 0.5; x < w; x += bw) {
          const r = rng.int(150, 196);
          ctx.fillStyle = `rgb(${r},${Math.round(r * 0.42)},${Math.round(r * 0.3)})`;
          ctx.fillRect(x + 2, row * bh + 2, bw - 4, bh - 4);
        }
      }
    },
    true,
  );
}
