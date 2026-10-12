import type * as THREE from "three";
import { canvasTexture } from "../textures";

/**
 * A soft, lumpy puff of smoke: a few overlapping blobs inside a round
 * fade, so a cloud of them reads as gas rather than as discs.
 */
export function puffTexture(): THREE.Texture {
  return canvasTexture("smoke-puff", 128, (ctx, size, rand) => {
    const c = size / 2;
    for (let i = 0; i < 14; i++) {
      const a = rand() * Math.PI * 2;
      const d = rand() * c * 0.38;
      const r = c * (0.28 + rand() * 0.3);
      const x = c + Math.cos(a) * d;
      const y = c + Math.sin(a) * d;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.32)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    // Clip the lumps inside a soft circle, so no square corner ever shows.
    ctx.globalCompositeOperation = "destination-in";
    const edge = ctx.createRadialGradient(c, c, c * 0.35, c, c, c);
    edge.addColorStop(0, "rgba(255,255,255,1)");
    edge.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, size, size);
  }, { repeat: false });
}

/** A thin bright ring fading in and out, for the overpressure wave a big gun pushes out. */
export function ringTexture(): THREE.Texture {
  return canvasTexture("blast-ring", 128, (ctx, size) => {
    const c = size / 2;
    const g = ctx.createRadialGradient(c, c, c * 0.45, c, c, c);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.55, "rgba(255,255,255,0.7)");
    g.addColorStop(0.75, "rgba(255,255,255,0.35)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }, { repeat: false });
}
