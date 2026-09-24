import type { Texture } from "three";
import { C, R, S, disc, grain, radial, seed } from "./flesh-kit";
import { canvas, scatter, texture } from "./paint";

/** Faces of fruit cut across its axis: a round slice with the rind on the outside. */

export function melonFlesh(options: { rindDark: string; rindLight: string; flesh: string; core: string; seeds: number; seedValue: number }): Texture {
  const { c, ctx } = canvas(S);
  disc(ctx, R, options.rindDark);
  disc(ctx, R * 0.965, options.rindLight);
  disc(ctx, R * 0.93, radial(ctx, R * 0.78, R * 0.93, [[0, options.flesh], [0.55, "#f7d7c8"], [1, "#eaf2c9"]]));
  disc(ctx, R * 0.86, radial(ctx, 0, R * 0.86, [[0, options.core], [0.75, options.flesh], [1, options.flesh]]));
  grain(ctx, 0, R * 0.84, 5000, "#ffd0d6", options.seedValue);
  const r = scatter(options.seedValue + 1);
  for (let i = 0; i < options.seeds; i++) {
    const a = (i / options.seeds) * Math.PI * 2 + (r() - 0.5) * 0.3;
    seed(ctx, a, R * (0.44 + r() * 0.2), 9 + r() * 4, "#1b1310");
  }
  for (let i = 0; i < options.seeds / 3; i++) seed(ctx, r() * Math.PI * 2, R * (0.15 + r() * 0.2), 6 + r() * 3, "#f3e6c8", false);
  return texture(c);
}

export function citrusFlesh(options: { peel: string; flesh: string; deep: string; segments: number; seedValue: number }): Texture {
  const { c, ctx } = canvas(S);
  disc(ctx, R, options.peel);
  disc(ctx, R * 0.93, "#fff4dd");
  const r = scatter(options.seedValue);
  const n = options.segments;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2 + 0.035;
    const a1 = ((i + 1) / n) * Math.PI * 2 - 0.035;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(C + Math.cos((a0 + a1) / 2) * R * 0.1, C + Math.sin((a0 + a1) / 2) * R * 0.1);
    ctx.arc(C, C, R * 0.85, a0, a1);
    ctx.closePath();
    ctx.fillStyle = radial(ctx, R * 0.1, R * 0.85, [[0, options.deep], [0.5, options.flesh], [1, options.deep]]);
    ctx.fill();
    ctx.clip();
    // Juice sacs: short streaks fanning out from the middle.
    for (let k = 0; k < 160; k++) {
      const a = a0 + r() * (a1 - a0);
      const d = R * (0.15 + r() * 0.7);
      ctx.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.28)" : "rgba(160,60,0,0.16)";
      ctx.lineWidth = 2 + r() * 2.5;
      ctx.beginPath();
      ctx.moveTo(C + Math.cos(a) * d, C + Math.sin(a) * d);
      ctx.lineTo(C + Math.cos(a) * (d + 14), C + Math.sin(a) * (d + 14));
      ctx.stroke();
    }
    ctx.restore();
  }
  disc(ctx, R * 0.1, "#fff4dd");
  return texture(c);
}

export function kiwiFlesh(): Texture {
  const { c, ctx } = canvas(S);
  disc(ctx, R, "#6f5230");
  disc(ctx, R * 0.965, radial(ctx, 0, R * 0.965, [[0, "#f6f8dc"], [0.24, "#e7f1b5"], [0.36, "#a9d65a"], [0.8, "#72b832"], [1, "#5f9e2a"]]));
  const r = scatter(9);
  for (let i = 0; i < 90; i++) {
    const a = r() * Math.PI * 2;
    ctx.strokeStyle = "rgba(245,250,220,0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(C + Math.cos(a) * R * 0.2, C + Math.sin(a) * R * 0.2);
    ctx.lineTo(C + Math.cos(a) * R * (0.6 + r() * 0.3), C + Math.sin(a) * R * (0.6 + r() * 0.3));
    ctx.stroke();
  }
  for (let i = 0; i < 80; i++) seed(ctx, r() * Math.PI * 2, R * (0.27 + r() * 0.1), 5 + r() * 2, "#16110b");
  return texture(c);
}

export function coconutFlesh(): Texture {
  const { c, ctx } = canvas(S);
  disc(ctx, R, "#6b4526");
  disc(ctx, R * 0.93, "#2d1a0c");
  disc(ctx, R * 0.87, radial(ctx, R * 0.6, R * 0.87, [[0, "#f4efe6"], [1, "#fffdf8"]]));
  disc(ctx, R * 0.6, radial(ctx, 0, R * 0.6, [[0, "#dcd9d0"], [0.8, "#cdc6b8"], [0.96, "#a39a8a"], [1, "#efe9de"]]));
  return texture(c);
}

