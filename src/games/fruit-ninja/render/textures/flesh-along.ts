import type { Texture, Vector2 } from "three";
import { S } from "./flesh-kit";
import { canvas, scatter, texture, type Ctx } from "./paint";

/**
 * Faces of fruit cut lengthwise through the stem: apples, stone fruit,
 * strawberries and dragonfruit. Each painter gets the cut's outline in
 * the texture's own square, so the skin line follows the real shape.
 */

type Outline = readonly Vector2[];

/** Traces the outline, scaled toward the fruit's middle by `scale`. */
function trace(ctx: Ctx, outline: Outline, scale = 1, centre = { u: 0.5, v: 0.5 }): void {
  ctx.beginPath();
  outline.forEach((p, i) => {
    const x = (centre.u + (p.x - centre.u) * scale) * S;
    const y = (1 - (centre.v + (p.y - centre.v) * scale)) * S;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
}

function middle(outline: Outline): { u: number; v: number } {
  const vs = outline.map((p) => p.y);
  return { u: 0.5, v: (Math.min(...vs) + Math.max(...vs)) / 2 };
}

function teardrop(ctx: Ctx, x: number, y: number, size: number, angle: number, colour: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, -size * 1.6);
  ctx.quadraticCurveTo(size, 0, 0, size);
  ctx.quadraticCurveTo(-size, 0, 0, -size * 1.6);
  ctx.fill();
  ctx.restore();
}

/** Apple: creamy flesh, a skin line, the core with its seeds and the stem's channel. */
export function appleFlesh(outline: Outline, skin: string): Texture {
  const { c, ctx } = canvas(S);
  const mid = middle(outline);
  const cy = (1 - mid.v) * S;
  trace(ctx, outline);
  const g = ctx.createRadialGradient(S / 2, cy, 0, S / 2, cy, S * 0.5);
  g.addColorStop(0, "#fff8e0");
  g.addColorStop(0.7, "#fbecc0");
  g.addColorStop(1, "#f3dc9c");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // Fine fibres and wet sparkle, so the cut face never reads as flat paint.
  const r = scatter(31);
  for (let i = 0; i < 900; i++) {
    const x = r() * S;
    const y = r() * S;
    const a = Math.atan2(y - cy, x - S / 2);
    ctx.strokeStyle = r() < 0.5 ? "rgba(200,160,80,0.12)" : "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * 6, y + Math.sin(a) * 6);
    ctx.stroke();
  }
  ctx.restore();
  // A pale band just under the skin, then the skin itself.
  ctx.lineWidth = 22;
  ctx.strokeStyle = "rgba(255,252,236,0.7)";
  ctx.stroke();
  ctx.lineWidth = 9;
  ctx.strokeStyle = skin;
  ctx.stroke();
  // The core: a soft heart shaped outline from stem to base, ringed by the fruit's vascular dots.
  ctx.fillStyle = "rgba(232,208,140,0.55)";
  ctx.strokeStyle = "rgba(180,140,70,0.55)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(S / 2, cy - S * 0.22);
  ctx.bezierCurveTo(S / 2 + S * 0.2, cy - S * 0.2, S / 2 + S * 0.16, cy + S * 0.16, S / 2, cy + S * 0.22);
  ctx.bezierCurveTo(S / 2 - S * 0.16, cy + S * 0.16, S / 2 - S * 0.2, cy - S * 0.2, S / 2, cy - S * 0.22);
  ctx.fill();
  ctx.stroke();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    ctx.fillStyle = "rgba(170,130,60,0.5)";
    ctx.beginPath();
    ctx.arc(S / 2 + Math.cos(a) * S * 0.2, cy + Math.sin(a) * S * 0.27, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(170,130,60,0.6)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(S / 2, cy - S * 0.22);
  ctx.lineTo(S / 2, S * 0.08);
  ctx.moveTo(S / 2, cy + S * 0.22);
  ctx.lineTo(S / 2, S * 0.9);
  ctx.stroke();
  teardrop(ctx, S / 2 - 20, cy + 6, 14, -0.3, "#4a2a12");
  teardrop(ctx, S / 2 + 20, cy + 6, 14, 0.3, "#4a2a12");
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  for (const x of [S / 2 - 22, S / 2 + 18]) {
    ctx.beginPath();
    ctx.ellipse(x, cy - 2, 3, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  return texture(c);
}

/** Plum and peach: juicy flesh around a rough stone, reddened close to it. */
export function stoneFlesh(outline: Outline, options: { skin: string; flesh: string; edge: string; blush: string }): Texture {
  const { c, ctx } = canvas(S);
  const mid = middle(outline);
  trace(ctx, outline);
  const g = ctx.createRadialGradient(S / 2, (1 - mid.v) * S, S * 0.1, S / 2, (1 - mid.v) * S, S * 0.5);
  g.addColorStop(0, options.blush);
  g.addColorStop(0.45, options.flesh);
  g.addColorStop(1, options.edge);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 10;
  ctx.strokeStyle = options.skin;
  ctx.stroke();
  const cy = (1 - mid.v) * S;
  const r = scatter(4);
  // Red fibres reach out from the stone into the flesh.
  for (let i = 0; i < 120; i++) {
    const a = r() * Math.PI * 2;
    ctx.strokeStyle = `rgba(170,30,20,${0.08 + r() * 0.15})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(S / 2 + Math.cos(a) * S * 0.12, cy + Math.sin(a) * S * 0.17);
    ctx.lineTo(S / 2 + Math.cos(a) * S * (0.2 + r() * 0.1), cy + Math.sin(a) * S * (0.26 + r() * 0.1));
    ctx.stroke();
  }
  const stone = ctx.createRadialGradient(S / 2 - 10, cy - 20, 5, S / 2, cy, S * 0.2);
  stone.addColorStop(0, "#b9774a");
  stone.addColorStop(1, "#6a3517");
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.ellipse(S / 2, cy, S * 0.12, S * 0.17, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = "rgba(60,25,8,0.5)";
    ctx.lineWidth = 2;
    const a = r() * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(S / 2 + Math.cos(a) * S * 0.06, cy + Math.sin(a) * S * 0.09, 6 + r() * 8, r() * 6, r() * 6 + 1.2);
    ctx.stroke();
  }
  return texture(c);
}

/** Strawberry: red at the edge, a pale heart, white veins reaching out to the seeds. */
export function strawberryFlesh(outline: Outline): Texture {
  const { c, ctx } = canvas(S);
  const mid = middle(outline);
  trace(ctx, outline);
  ctx.fillStyle = "#e3202e";
  ctx.fill();
  trace(ctx, outline, 0.8, mid);
  ctx.fillStyle = "#f7626a";
  ctx.fill();
  trace(ctx, outline, 0.5, mid);
  ctx.fillStyle = "#ffd9d2";
  ctx.fill();
  const r = scatter(8);
  const cy = (1 - mid.v) * S;
  for (let i = 0; i < 36; i++) {
    const p = outline[Math.floor(r() * outline.length)]!;
    ctx.strokeStyle = "rgba(255,235,230,0.55)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(S / 2, cy);
    ctx.quadraticCurveTo(S / 2 + (p.x * S - S / 2) * 0.5, cy + 10, p.x * S * 0.92 + S * 0.04, (1 - p.y) * S * 0.92 + S * 0.04);
    ctx.stroke();
  }
  return texture(c);
}

/** Dragonfruit: snow white flesh full of tiny black seeds inside a hot pink skin. */
export function dragonFlesh(outline: Outline): Texture {
  const { c, ctx } = canvas(S);
  const mid = middle(outline);
  trace(ctx, outline);
  ctx.fillStyle = "#e8207a";
  ctx.fill();
  trace(ctx, outline, 0.9, mid);
  ctx.fillStyle = "#fbf6f4";
  ctx.fill();
  ctx.save();
  ctx.clip();
  const r = scatter(21);
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = "#15100e";
    ctx.beginPath();
    ctx.ellipse(r() * S, r() * S, 2.2, 1.5, r() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  return texture(c);
}
