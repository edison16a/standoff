import { pineappleEye } from "../models/shapes";
import { canvas, fbm, hex, mix, noise, scatter, shadePixels, smooth, texture } from "./paint";
import type { Skin } from "./skins-smooth";

/** Rinds and husks with strong pattern: melons, kiwi, coconut, strawberry, pineapple and more. */

const W = 512;
const H = 256;

/** Watermelon rind: wavy dark stripes from pole to pole over a mottled lighter green. */
export function melonSkin(light: string, dark: string, stripes: number, width: number, seed: number): Skin {
  const color = canvas(W, H);
  const l = hex(light);
  const d = hex(dark);
  const pale = hex("#a9c77a");
  shadePixels(color.ctx, W, H, (u, v) => {
    const wobble = (fbm(u * stripes, v * 5, 3, seed, stripes) - 0.5) * 0.9;
    const band = Math.abs(((u * stripes + wobble) % 1 + 1) % 1 - 0.5);
    const edge = width * (0.55 + 0.45 * Math.sin(Math.PI * v)) + (noise(u * stripes * 8, v * 40, seed + 2, stripes * 8) - 0.5) * 0.08;
    const mottle = fbm(u * 18, v * 9, 3, seed + 4, 18);
    let c = mix(l, pale, smooth(0.55, 0.9, mottle) * 0.5);
    c = mix(c, d, smooth(edge + 0.03, edge - 0.03, 0.5 - band));
    c = mix(c, d, (1 - mottle) * 0.25);
    const pole = Math.min(v, 1 - v);
    return mix(c, hex("#c7b77a"), smooth(0.025, 0.005, pole) * 0.8);
  });
  return { map: texture(color.c) };
}

/** Kiwi: brown skin under a coat of short fine hairs. */
export function kiwiSkin(seed: number): Skin {
  const color = canvas(W, H);
  shadePixels(color.ctx, W, H, (u, v) => mix(hex("#8b6a3c"), hex("#5e4322"), fbm(u * 10, v * 6, 4, seed, 10)));
  const r = scatter(seed);
  for (let i = 0; i < 9000; i++) {
    const x = r() * W;
    const y = r() * H;
    const a = r() * Math.PI * 2;
    color.ctx.strokeStyle = r() < 0.5 ? "rgba(60,40,18,0.35)" : "rgba(170,135,85,0.3)";
    color.ctx.lineWidth = 0.7;
    color.ctx.beginPath();
    color.ctx.moveTo(x, y);
    color.ctx.lineTo(x + Math.cos(a) * 3, y + Math.sin(a) * 3);
    color.ctx.stroke();
  }
  return { map: texture(color.c) };
}

/** Coconut husk: long wavy fibres in several browns, with the three eyes at the top. */
export function coconutSkin(seed: number): Skin {
  const color = canvas(W, H);
  shadePixels(color.ctx, W, H, (u, v) => mix(hex("#5b3820"), hex("#3c2413"), fbm(u * 8, v * 4, 3, seed, 8)));
  const r = scatter(seed);
  const tones = ["rgba(40,22,10,0.5)", "rgba(125,86,50,0.45)", "rgba(150,112,72,0.35)", "rgba(88,56,30,0.5)"];
  for (let i = 0; i < 1400; i++) {
    let x = r() * W;
    let y = r() * H;
    color.ctx.strokeStyle = tones[i % tones.length]!;
    color.ctx.lineWidth = 0.6 + r() * 1.4;
    color.ctx.beginPath();
    color.ctx.moveTo(x, y);
    for (let k = 0; k < 8; k++) {
      x += (r() - 0.5) * 3;
      y += 4 + r() * 5;
      color.ctx.lineTo(x, y);
    }
    color.ctx.stroke();
  }
  for (let e = 0; e < 3; e++) {
    const x = ((e + 0.2) / 3) * W;
    const g = color.ctx.createRadialGradient(x, H * 0.07, 0, x, H * 0.07, 16);
    g.addColorStop(0, "#1a0d05");
    g.addColorStop(0.7, "#2a160a");
    g.addColorStop(1, "rgba(42,22,10,0)");
    color.ctx.fillStyle = g;
    color.ctx.fillRect(x - 18, H * 0.07 - 18, 36, 36);
  }
  return { map: texture(color.c) };
}

/** Strawberry: glossy red dotted with yellow seeds, each sitting in its own little pit. */
export function strawberrySkin(seed: number): Skin {
  const color = canvas(W, H);
  const bump = canvas(W, H);
  shadePixels(color.ctx, W, H, (u, v) => {
    const c = mix(hex("#d4121c"), hex("#a3060f"), fbm(u * 6, v * 5, 3, seed, 6) * 0.9);
    return mix(c, hex("#f25a4a"), smooth(0.8, 1, v) * 0.35);
  });
  bump.ctx.fillStyle = "#909090";
  bump.ctx.fillRect(0, 0, W, H);
  const rows = 15;
  const r = scatter(seed);
  for (let row = 0; row < rows; row++) {
    const v = (row + 0.5) / rows;
    // Fewer seeds around the narrow tip than around the shoulders.
    const around = Math.max(5, Math.round(18 * Math.sin(Math.PI * (0.15 + v * 0.75))));
    for (let k = 0; k < around; k++) {
      const x = ((k + (row % 2) * 0.5 + (r() - 0.5) * 0.2) / around) * W;
      const y = (1 - v) * H + (r() - 0.5) * 3;
      const sx = 5.5;
      color.ctx.fillStyle = "rgba(120,5,12,0.75)";
      color.ctx.beginPath();
      color.ctx.ellipse(x, y, sx, 7, 0, 0, Math.PI * 2);
      color.ctx.fill();
      color.ctx.fillStyle = "#f2cf52";
      color.ctx.beginPath();
      color.ctx.ellipse(x, y + 1, 2.2, 3.4, 0, 0, Math.PI * 2);
      color.ctx.fill();
      bump.ctx.fillStyle = "#303030";
      bump.ctx.beginPath();
      bump.ctx.ellipse(x, y, sx, 7, 0, 0, Math.PI * 2);
      bump.ctx.fill();
      bump.ctx.fillStyle = "#b0b0b0";
      bump.ctx.beginPath();
      bump.ctx.ellipse(x, y + 1, 2.2, 3.4, 0, 0, Math.PI * 2);
      bump.ctx.fill();
    }
  }
  return { map: texture(color.c), bump: texture(bump.c, { color: false }) };
}

/** Pineapple: a spiral lattice of diamond eyes, each with a dark rim and a spiky tip. */
export function pineappleSkin(seed: number): Skin {
  const color = canvas(W, H);
  const bump = canvas(W, H);
  const heights: number[] = [];
  shadePixels(color.ctx, W, H, (u, v) => {
    const eye = pineappleEye(u, v);
    const dist = 1 - eye;
    heights.push(eye);
    const tone = fbm(u * 9, v * 6, 2, seed, 9);
    // Golden orange eyes, greener toward the crown, with dark grooves between them.
    let c = mix(hex("#e89a2a"), hex("#c9781c"), tone);
    c = mix(c, hex("#8c9a2e"), smooth(0.55, 1, v) * 0.45 * tone);
    c = mix(c, hex("#b0781e"), smooth(0.45, 0.9, eye) * 0.5);
    c = mix(c, hex("#3e2208"), smooth(0.7, 0.95, dist));
    // A dark spiky bract near the top of each eye.
    const s = u * 9 + v * 6;
    const d = u * 9 - v * 6;
    const fs = (((s % 1) + 1) % 1) - 0.5;
    const fd = (((d % 1) + 1) % 1) - 0.5;
    const spike = Math.hypot(fs + fd, (fs - fd) * 0.5 - 0.2);
    c = mix(c, hex("#2e1a06"), smooth(0.12, 0.04, spike));
    return mix(c, hex("#f6c85a"), smooth(0.2, 0.05, Math.hypot(fs + fd - 0.05, fs - fd + 0.1)) * 0.5);
  });
  shadePixels(bump.ctx, W, H, (_u, _v, x, y) => {
    const h = heights[y * W + x]! * 220;
    return [h, h, h];
  });
  return { map: texture(color.c), bump: texture(bump.c, { color: false }) };
}

/** Pomegranate: leathery deep red with paler freckled patches. */
export function pomegranateSkin(seed: number): Skin {
  const color = canvas(W, H);
  shadePixels(color.ctx, W, H, (u, v) => {
    let c = mix(hex("#b3192b"), hex("#7a0d1b"), fbm(u * 5, v * 4, 4, seed, 5));
    c = mix(c, hex("#d6804d"), smooth(0.68, 0.85, fbm(u * 3, v * 2, 3, seed + 3, 3)) * 0.55);
    return mix(c, hex("#f0b890"), smooth(0.7, 1, noise(u * 160, v * 80, seed + 5, 160)) * 0.25);
  });
  return { map: texture(color.c) };
}

/** Dragonfruit: hot pink with a soft sheen. The green tipped scales are geometry. */
export function dragonSkin(seed: number): Skin {
  const color = canvas(W, H);
  shadePixels(color.ctx, W, H, (u, v) => mix(hex("#ef2b86"), hex("#b3125c"), fbm(u * 6, v * 4, 3, seed, 6) * 0.8));
  return { map: texture(color.c) };
}
