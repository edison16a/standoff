import type { Texture } from "three";
import { canvas, fbm, hex, mix, noise, rgb, scatter, shadePixels, smooth, texture, type Rgb } from "./paint";

/**
 * Peels with a smooth or finely pitted surface: citrus, apples, stone
 * fruit and banana. Texture u runs around the fruit and v from the
 * bottom pole (0) to the stem (1).
 */

export interface Skin {
  map: Texture;
  bump?: Texture;
}

const W = 512;
const H = 256;

/** Orange, lemon and lime peel: an even colour with thousands of tiny oil pits. */
export function citrusSkin(base: string, shadow: string, seed: number): Skin {
  const color = canvas(W, H);
  const b = hex(base);
  const s = hex(shadow);
  shadePixels(color.ctx, W, H, (u, v) => {
    const blotch = fbm(u * 6, v * 3, 3, seed, 6);
    const pole = smooth(0.9, 1, v) * 0.5 + smooth(0.1, 0, v) * 0.3;
    return mix(b, s, (blotch - 0.35) * 0.9 + pole);
  });
  const bump = canvas(W, H);
  bump.ctx.fillStyle = "#808080";
  bump.ctx.fillRect(0, 0, W, H);
  const r = scatter(seed + 1);
  for (let i = 0; i < 5200; i++) {
    const x = r() * W;
    const y = r() * H;
    const size = 0.8 + r() * 1.6;
    bump.ctx.fillStyle = `rgba(40,40,40,${0.35 + r() * 0.4})`;
    bump.ctx.beginPath();
    bump.ctx.ellipse(x, y, size, size * 1.6, 0, 0, Math.PI * 2);
    bump.ctx.fill();
    if (i % 3 === 0) {
      color.ctx.fillStyle = rgb(mix(b, s, 0.6), 0.25);
      color.ctx.fillRect(x, y, 1.2, 1.8);
    }
  }
  return { map: texture(color.c), bump: texture(bump.c, { color: false }) };
}

/** Apple skin: a blush over the base, fine vertical streaks and pale pores. */
export function appleSkin(base: string, blush: string, streak: string, seed: number): Skin {
  const color = canvas(W, H);
  const b = hex(base);
  const bl = hex(blush);
  const st = hex(streak);
  const cream = hex("#f3e7a0");
  shadePixels(color.ctx, W, H, (u, v) => {
    const side = fbm(u * 3, v * 1.5, 3, seed, 3);
    let c = mix(b, bl, smooth(0.35, 0.75, side));
    const streaks = fbm(u * 90, v * 4, 2, seed + 5, 90);
    c = mix(c, st, smooth(0.45, 0.8, streaks) * 0.55);
    // The stem cavity and the base fade toward cream.
    c = mix(c, cream, smooth(0.9, 1, v) * 0.55 + smooth(0.08, 0, v) * 0.4);
    return c;
  });
  const r = scatter(seed + 2);
  for (let i = 0; i < 520; i++) {
    color.ctx.fillStyle = `rgba(255,240,200,${0.12 + r() * 0.22})`;
    color.ctx.beginPath();
    color.ctx.arc(r() * W, r() * H, 0.4 + r() * 0.7, 0, Math.PI * 2);
    color.ctx.fill();
  }
  return { map: texture(color.c) };
}

/** Peach and plum: soft colour fields with a velvet or waxy bloom. */
export function stoneFruitSkin(base: string, blush: string, bloom: string, seed: number, bloomAmount: number): Skin {
  const color = canvas(W, H);
  const b = hex(base);
  const bl = hex(blush);
  const bo = hex(bloom);
  shadePixels(color.ctx, W, H, (u, v) => {
    const field = fbm(u * 3, v * 2, 4, seed, 3);
    const facing = 0.5 + 0.5 * Math.cos((u - 0.3) * Math.PI * 2);
    let c = mix(b, bl, smooth(0.3, 0.8, field * 0.6 + facing * 0.55));
    const fine = noise(u * 220, v * 110, seed + 3, 220);
    c = mix(c, bo, smooth(0.55, 1, fbm(u * 24, v * 12, 3, seed + 7, 24)) * bloomAmount + (fine - 0.5) * 0.12);
    return mix(c, hex("#5a3a1a"), smooth(0.97, 1, v) * 0.5);
  });
  return { map: texture(color.c) };
}

/** Banana peel: yellow with green shoulders, brown tips and a few sugar spots. */
export function bananaSkin(seed: number): Skin {
  const color = canvas(W, H);
  const yellow = hex("#f4d03a");
  const deep = hex("#e0ae1c");
  const green = hex("#9fb83a");
  const tip = hex("#3b2812");
  shadePixels(color.ctx, W, H, (u, v) => {
    const ends = Math.min(v, 1 - v);
    let c = mix(yellow, deep, fbm(u * 5, v * 8, 3, seed, 5) * 0.8);
    // Five ridges run along the peel, each a slightly darker line.
    const ridge = Math.abs(((u * 5) % 1) - 0.5);
    c = mix(c, deep, smooth(0.08, 0, Math.abs(ridge - 0.5)) * 0.6);
    c = mix(c, green, smooth(0.16, 0.05, ends) * 0.8);
    return mix(c, tip, smooth(0.045, 0.02, ends));
  });
  const r = scatter(seed + 4);
  for (let i = 0; i < 70; i++) {
    const x = r() * W;
    const y = H * (0.15 + r() * 0.7);
    color.ctx.fillStyle = `rgba(90,52,18,${0.35 + r() * 0.45})`;
    color.ctx.beginPath();
    color.ctx.ellipse(x, y, 1 + r() * 2.5, 1 + r() * 2, r() * 3, 0, Math.PI * 2);
    color.ctx.fill();
  }
  return { map: texture(color.c) };
}

/** Star fruit: waxy gold, deeper along the five ridges and green at the tips. */
export function starSkin(): Skin {
  const color = canvas(W, H);
  shadePixels(color.ctx, W, H, (u, v) => {
    // The ridges sit where the star's points are, five times round.
    const ridge = Math.pow(0.5 + 0.5 * Math.cos(u * Math.PI * 2 * 5), 6);
    let c = mix(hex("#ffd21f"), hex("#ffb000"), fbm(u * 10, v * 4, 3, 19, 10) * 0.6);
    c = mix(c, hex("#d98200"), ridge * 0.7);
    return mix(c, hex("#9ab82a"), smooth(0.1, 0.02, Math.min(v, 1 - v)) * 0.7);
  });
  return { map: texture(color.c) };
}

/** A plain colour field with gentle variation, for leaves, stems and the like. */
export function plainSkin(base: string, shade: string, seed: number, scale = 4): Skin {
  const color = canvas(128, 128);
  const b: Rgb = hex(base);
  const s: Rgb = hex(shade);
  shadePixels(color.ctx, 128, 128, (u, v) => mix(b, s, fbm(u * scale, v * scale * 2, 3, seed, scale)));
  return { map: texture(color.c) };
}
