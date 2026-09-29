import type * as THREE from "three";
import { Rng } from "../../engine/rng";
import { painted } from "../textures";

/** Cells in the cloud atlas, two across and two down. */
export const CLOUD_CELLS = 4;

/**
 * Four fluffy cartoon clouds on one texture: white puffs piled on a flat
 * base, a soft blue shade underneath and a bright rim on top.
 */
export function cloudTexture(): THREE.Texture {
  return painted("clouds", 512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cw = w / 2;
    const ch = h / 2;
    for (let cell = 0; cell < CLOUD_CELLS; cell++) {
      const rng = new Rng(cell * 17 + 5);
      const ox = (cell % 2) * cw;
      const oy = Math.floor(cell / 2) * ch;
      const base = oy + ch * 0.8;
      const puffs: [number, number, number][] = [];
      const count = 5 + rng.int(0, 3);
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        // Bigger puffs in the middle, so each cloud swells up to a crown.
        const r = ch * (0.16 + 0.2 * Math.sin(t * Math.PI) * rng.range(0.8, 1.15));
        puffs.push([ox + cw * (0.14 + 0.72 * t) + rng.range(-6, 6), base - r * rng.range(0.55, 0.9), r]);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox, oy, cw, base - oy);
      ctx.clip();
      const draw = (fill: string, dy: number, grow: number) => {
        ctx.fillStyle = fill;
        for (const [x, y, r] of puffs) {
          ctx.beginPath();
          ctx.arc(x, y + dy, r * grow, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      // A faint outline, the shaded belly, then the white body lifted off it.
      draw("rgba(120,165,215,0.45)", 0, 1.06);
      draw("#dbeaf8", 0, 1);
      draw("#ffffff", -ch * 0.07, 0.94);
      ctx.restore();
      ctx.fillStyle = "#dbeaf8";
      ctx.fillRect(ox + cw * 0.14, base - 3, cw * 0.72, 3);
    }
  });
}

/**
 * The far city in daylight: blocks and towers washed pale blue by the
 * haze, windows catching the sky, water tanks and a crane or two, on a
 * strip that wraps round the horizon.
 */
export function skylineTexture(): THREE.Texture {
  return painted("day-skyline", 2048, 256, (ctx, w, h) => {
    const rng = new Rng(41);
    ctx.clearRect(0, 0, w, h);
    const layers = [
      { fill: "#b9d6ee", window: "rgba(255,255,255,0.35)", low: 0.45, high: 0.95, width: [40, 120] },
      { fill: "#98bfe0", window: "rgba(235,246,255,0.45)", low: 0.25, high: 0.6, width: [50, 140] },
    ] as const;
    for (const layer of layers) {
      let x = -20;
      while (x < w) {
        const tw = rng.range(layer.width[0], layer.width[1]);
        const th = h * rng.range(layer.low, layer.high);
        ctx.fillStyle = layer.fill;
        ctx.fillRect(x, h - th, tw, th);
        // A stepped top or a spire on the odd tower.
        if (rng.chance(0.3)) ctx.fillRect(x + tw * 0.2, h - th - 14, tw * 0.6, 14);
        if (rng.chance(0.15)) ctx.fillRect(x + tw * 0.48, h - th - 40, 3, 40);
        if (rng.chance(0.25)) {
          ctx.beginPath();
          ctx.ellipse(x + tw * 0.7, h - th - 9, 8, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(x + tw * 0.7 - 6, h - th - 4, 2, 4);
          ctx.fillRect(x + tw * 0.7 + 4, h - th - 4, 2, 4);
        }
        ctx.fillStyle = layer.window;
        for (let y = h - th + 8; y < h - 6; y += 10) {
          for (let wx = x + 6; wx < x + tw - 6; wx += 9) if (rng.chance(0.55)) ctx.fillRect(wx, y, 4, 5);
        }
        x += tw + rng.range(0, 10);
      }
    }
    // Wrapped round the sky, the two ends meet: a band of haze at the foot hides the seam.
    const haze = ctx.createLinearGradient(0, h * 0.7, 0, h);
    haze.addColorStop(0, "rgba(200,230,250,0)");
    haze.addColorStop(1, "rgba(200,230,250,1)");
    ctx.fillStyle = haze;
    ctx.fillRect(0, h * 0.7, w, h * 0.3);
  });
}
