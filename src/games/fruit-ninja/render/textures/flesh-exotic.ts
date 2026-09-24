import type { Texture } from "three";
import { C, R, S, disc, grain, radial, seed } from "./flesh-kit";
import { canvas, scatter, texture } from "./paint";

/** Cut faces for the tropical and special fruit. */

export function pineappleFlesh(): Texture {
  const { c, ctx } = canvas(S);
  disc(ctx, R, "#9a6a20");
  const r = scatter(5);
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    ctx.fillStyle = "#5e3a0e";
    ctx.beginPath();
    ctx.arc(C + Math.cos(a) * R * 0.92, C + Math.sin(a) * R * 0.92, R * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }
  disc(ctx, R * 0.86, radial(ctx, 0, R * 0.86, [[0, "#fff3b0"], [0.3, "#ffe36b"], [1, "#ffc928"]]));
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2;
    ctx.strokeStyle = r() < 0.5 ? "rgba(255,250,210,0.4)" : "rgba(210,140,0,0.2)";
    ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(C + Math.cos(a) * R * 0.24, C + Math.sin(a) * R * 0.24);
    ctx.lineTo(C + Math.cos(a) * R * 0.84, C + Math.sin(a) * R * 0.84);
    ctx.stroke();
  }
  disc(ctx, R * 0.22, radial(ctx, 0, R * 0.22, [[0, "#fff7cf"], [1, "#f5dd86"]]));
  return texture(c);
}

export function bananaFlesh(): Texture {
  const { c, ctx } = canvas(S);
  disc(ctx, R, "#e8c02c");
  disc(ctx, R * 0.9, radial(ctx, 0, R * 0.9, [[0, "#fff6d6"], [0.8, "#fbeab5"], [1, "#f1d890"]]));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    ctx.fillStyle = "rgba(120,80,30,0.55)";
    ctx.beginPath();
    ctx.arc(C + Math.cos(a) * R * 0.1, C + Math.sin(a) * R * 0.1, R * 0.035, 0, Math.PI * 2);
    ctx.fill();
  }
  grain(ctx, 0, R * 0.85, 1200, "#ffffff", 3);
  return texture(c);
}

export function pomegranateFlesh(): Texture {
  const { c, ctx } = canvas(S);
  disc(ctx, R, "#9d1628");
  disc(ctx, R * 0.9, "#f2ddb0");
  const r = scatter(12);
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2;
    // Leave thin pale walls between the six chambers.
    if (Math.abs(((a / (Math.PI / 3)) % 1) - 0.5) > 0.44) continue;
    const d = R * (0.12 + Math.sqrt(r()) * 0.72);
    const x = C + Math.cos(a) * d;
    const y = C + Math.sin(a) * d;
    const size = R * (0.035 + r() * 0.02);
    const g = ctx.createRadialGradient(x - size * 0.3, y - size * 0.3, 0, x, y, size);
    g.addColorStop(0, "#ff8a96");
    g.addColorStop(0.5, "#d3122e");
    g.addColorStop(1, "#8a0418");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  return texture(c);
}

/** The star fruit's slice: a five pointed star, pale inside, with seeds near the middle. */
export function starFlesh(outline: (phi: number) => number): Texture {
  const { c, ctx } = canvas(S);
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const phi = (i / 120) * Math.PI * 2;
    const d = outline(phi) * R;
    // Canvas y runs down while texture v runs up, hence the minus.
    ctx.lineTo(C + Math.sin(phi) * d, C - Math.cos(phi) * d);
  }
  ctx.fillStyle = radial(ctx, 0, R, [[0, "#fff8c8"], [0.6, "#ffe479"], [1, "#f5b800"]]);
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = "#e5a400";
  ctx.stroke();
  for (let k = 0; k < 5; k++) {
    const phi = (k / 5) * Math.PI * 2;
    ctx.strokeStyle = "rgba(255,255,230,0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(C, C);
    ctx.lineTo(C + Math.sin(phi) * R * 0.8, C - Math.cos(phi) * R * 0.8);
    ctx.stroke();
    seed(ctx, phi - Math.PI / 2 + Math.PI / 5, R * 0.22, 8, "#8a5a10");
  }
  return texture(c);
}
