import type { Texture } from "three";
import { canvas, fbm, texture } from "./paint";
import { once } from "./sprites";

/** The sprites a bomb needs: rolling puffs for its fire and smoke, and the ring of its shockwave. */

/**
 * A billowing puff with its own light and shade: lumpy like a cauliflower,
 * lit from the top left like the rest of the board. Tinted, it makes fire
 * that rolls and smoke with body, where a flat blob would look like a smudge.
 */
export function puffTexture(): Texture {
  return once("puff", () => {
    const size = 128;
    const { c, ctx } = canvas(size);
    const image = ctx.createImageData(size, size);
    const height = (x: number, y: number) => {
      const d = Math.hypot(x, y);
      const lumps = fbm(x * 1.7 + 5, y * 1.7 + 5, 3, 31);
      return Math.sqrt(Math.max(0, 1 - d * d)) + lumps * 0.4;
    };
    const light = { x: -0.5, y: 0.55, z: 0.67 };
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const x = (px + 0.5) / (size / 2) - 1;
        const y = 1 - (py + 0.5) / (size / 2);
        const d = Math.hypot(x, y);
        const e = 0.02;
        const nx = (height(x - e, y) - height(x + e, y)) / (2 * e);
        const ny = (height(x, y - e) - height(x, y + e)) / (2 * e);
        const len = Math.hypot(nx, ny, 1);
        const lit = Math.max(0, (nx * light.x + ny * light.y + light.z) / len);
        const shade = 0.42 + 0.58 * lit;
        // A ragged edge from the same lumps, fading to nothing well inside the square.
        const edge = 0.8 + (fbm(x * 2 + 9, y * 2 + 9, 3, 47) - 0.5) * 0.4;
        const alpha = Math.max(0, Math.min(1, (edge - d) / 0.22)) * Math.max(0, Math.min(1, (1 - d) / 0.15));
        const i = (py * size + px) * 4;
        // Warm shadows: the shaded side loses blue and green before red, so fire darkens to red, never to olive.
        image.data[i] = Math.min(255, shade ** 0.5 * 255);
        image.data[i + 1] = Math.min(255, shade * 255);
        image.data[i + 2] = Math.min(255, shade ** 1.5 * 255);
        image.data[i + 3] = alpha * 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    return texture(c);
  });
}

/** A soft bright ring with a hazy inside, for a bomb's shockwave. */
export function ringTexture(): Texture {
  return once("ring", () => {
    const { c, ctx } = canvas(256);
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.55, "rgba(255,255,255,0.08)");
    g.addColorStop(0.8, "rgba(255,255,255,0.5)");
    g.addColorStop(0.9, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    return texture(c);
  });
}
