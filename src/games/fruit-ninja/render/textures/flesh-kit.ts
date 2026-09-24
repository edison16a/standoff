import { scatter, type Ctx } from "./paint";

/**
 * Shared brushes for painting cut faces. Faces are painted into a square
 * with the fruit's edge on the square's inscribed circle.
 */

export const S = 512;
export const C = S / 2;
export const R = S / 2 - 1;

export function disc(ctx: Ctx, radius: number, fill: string | CanvasGradient): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(C, C, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function radial(ctx: Ctx, r0: number, r1: number, stops: [number, string][]): CanvasGradient {
  const g = ctx.createRadialGradient(C, C, r0, C, C, r1);
  for (const [at, colour] of stops) g.addColorStop(at, colour);
  return g;
}

/** A seed shaped like a teardrop, its point toward the middle. */
export function seed(ctx: Ctx, angle: number, dist: number, length: number, colour: string, shine = true): void {
  ctx.save();
  ctx.translate(C + Math.cos(angle) * dist, C + Math.sin(angle) * dist);
  ctx.rotate(angle);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.ellipse(0, 0, length, length * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-length * 0.9, -length * 0.3);
  ctx.lineTo(-length * 1.6, 0);
  ctx.lineTo(-length * 0.9, length * 0.3);
  ctx.fill();
  if (shine) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.ellipse(length * 0.2, -length * 0.15, length * 0.35, length * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Tiny sparkles of juice so the flesh never looks flat. */
export function grain(ctx: Ctx, inner: number, outer: number, count: number, colour: string, seedValue: number, size = 1.6): void {
  const r = scatter(seedValue);
  ctx.fillStyle = colour;
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const d = inner + Math.sqrt(r()) * (outer - inner);
    ctx.globalAlpha = 0.15 + r() * 0.35;
    ctx.fillRect(C + Math.cos(a) * d, C + Math.sin(a) * d, size, size * 2.2);
  }
  ctx.globalAlpha = 1;
}

