import type { Texture } from "three";
import { canvas, fbm, hex, mix, noise, scatter, texture, type Rgb } from "./paint";

const WIDTH = 2048;
const HEIGHT = 1024;
/** Planks across the texture's height, laid horizontally like the cover. */
export const PLANKS = 5;

const DARK = hex("#5a3016");
const MID = hex("#8f5427");
const LIGHT = hex("#b8793f");
const GAP = hex("#2a160a");

interface Knot {
  x: number;
  y: number;
  size: number;
}

/**
 * The cutting board: warm planks with flowing grain, the odd knot, butt
 * joints staggered from plank to plank and dark gaps between them. It
 * returns a colour map and a matching bump map so the gaps and grain
 * catch the light.
 */
export function paintWood(): { map: Texture; bump: Texture } {
  const color = canvas(WIDTH, HEIGHT);
  const bump = canvas(WIDTH, HEIGHT);
  const colorData = color.ctx.createImageData(WIDTH, HEIGHT);
  const bumpData = bump.ctx.createImageData(WIDTH, HEIGHT);
  const plankH = HEIGHT / PLANKS;
  const rand = scatter(11);
  const planks = Array.from({ length: PLANKS }, (_, i) => ({
    tone: rand() * 0.35 - 0.15,
    joint: 0.15 + rand() * 0.7,
    seed: i * 31 + 5,
    knots: Array.from({ length: rand() < 0.75 ? 1 + Math.floor(rand() * 2) : 0 }, (): Knot => ({
      x: rand() * WIDTH,
      y: i * plankH + plankH * (0.25 + rand() * 0.5),
      size: 10 + rand() * 16,
    })),
  }));

  for (let y = 0; y < HEIGHT; y++) {
    const index = Math.min(PLANKS - 1, Math.floor(y / plankH));
    const plank = planks[index]!;
    const local = (y - index * plankH) / plankH;
    for (let x = 0; x < WIDTH; x++) {
      const u = x / WIDTH;
      let gy = y + fbm(u * 2.5 + index, local * 1.5, 3, plank.seed) * 30;
      let knotShade = 0;
      for (const knot of plank.knots) {
        const dx = (x - knot.x) * 0.3;
        const dy = y - knot.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        // Grain bends around a knot like water around a stone.
        gy += Math.sign(dy) * 38 * Math.exp(-((d / (knot.size * 3)) ** 2));
        if (d < knot.size) knotShade = Math.max(knotShade, (1 - d / knot.size) * (0.6 + 0.4 * Math.sin(d * 0.9)));
      }
      const ring = Math.sin(gy * 0.42 + fbm(u * 6, local * 4, 2, plank.seed + 3) * 5);
      const fibre = noise(x / 26, y / 1.4, plank.seed + 9);
      const streak = fbm(u * 3, y / 6, 3, plank.seed + 21);
      let t = 0.5 + 0.16 * ring + 0.26 * (fibre - 0.5) + 0.6 * (streak - 0.5) + plank.tone;
      t -= knotShade * 0.9;
      let c: Rgb = t < 0.5 ? mix(DARK, MID, t * 2) : mix(MID, LIGHT, (t - 0.5) * 2);
      let height = 0.55 + 0.12 * ring + 0.08 * fibre;

      // Rounded plank edges: a thin highlight on top, shadow below, a dark gap between.
      const edge = Math.min(local, 1 - local) * plankH;
      const jointDist = Math.abs(u - plank.joint) * WIDTH;
      const seam = Math.min(edge, jointDist);
      if (seam < 3) {
        c = GAP;
        height = 0;
      } else if (seam < 10) {
        const k = (seam - 3) / 7;
        const lit = (edge < 10 && local < 0.5) || (jointDist < 10 && u > plank.joint);
        c = mix(lit ? mix(c, LIGHT, 0.35) : mix(c, DARK, 0.55), c, k);
        height *= 0.4 + 0.6 * k;
      }
      const i = (y * WIDTH + x) * 4;
      colorData.data[i] = c[0];
      colorData.data[i + 1] = c[1];
      colorData.data[i + 2] = c[2];
      colorData.data[i + 3] = 255;
      const h = Math.max(0, Math.min(255, height * 255));
      bumpData.data[i] = bumpData.data[i + 1] = bumpData.data[i + 2] = h;
      bumpData.data[i + 3] = 255;
    }
  }
  color.ctx.putImageData(colorData, 0, 0);
  bump.ctx.putImageData(bumpData, 0, 0);
  return { map: texture(color.c), bump: texture(bump.c, { color: false }) };
}
