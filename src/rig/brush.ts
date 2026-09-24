import type { Vec2 } from "./geometry";

/**
 * The only colours a fencer is drawn in: white, black, three greys between
 * them, and the accent. `trim` is the player colour, the accent for player
 * one and white for player two, so the two read apart even in matching kit.
 */
export type Tone = "paper" | "light" | "mid" | "dark" | "ink" | "trim";

export interface Brush {
  ctx: CanvasRenderingContext2D;
  tones: Record<Tone, string>;
  /** Outline colour, which flips with the theme so pieces read on any background. */
  outline: string;
  /** Metres per screen pixel, so line widths stay crisp at any zoom. */
  px: number;
}

/** Fills and outlines whatever path `build` traces. */
export function paint(brush: Brush, tone: Tone, build: (ctx: CanvasRenderingContext2D) => void): void {
  const { ctx } = brush;
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = brush.tones[tone];
  ctx.fill();
  ctx.lineWidth = 1.5 * brush.px;
  ctx.strokeStyle = brush.outline;
  ctx.stroke();
}

/** Strokes a line in a tone, for details like seams, mesh and visor slits. */
export function line(brush: Brush, tone: Tone | "outline", width: number, points: Vec2[]): void {
  const { ctx } = brush;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineWidth = width * brush.px;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = tone === "outline" ? brush.outline : brush.tones[tone];
  ctx.stroke();
}

/**
 * Traces a limb: two circles of radius r1 and r2 joined by tangent sides.
 * Every arm and leg segment is one of these, tapered a little toward the
 * hand or foot.
 */
export function capsule(ctx: CanvasRenderingContext2D, a: Vec2, b: Vec2, r1: number, r2: number): void {
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  const n = angle + Math.PI / 2;
  ctx.moveTo(a.x + Math.cos(n) * r1, a.y + Math.sin(n) * r1);
  ctx.lineTo(b.x + Math.cos(n) * r2, b.y + Math.sin(n) * r2);
  ctx.arc(b.x, b.y, r2, n, n - Math.PI, true);
  ctx.lineTo(a.x - Math.cos(n) * r1, a.y - Math.sin(n) * r1);
  ctx.arc(a.x, a.y, r1, n - Math.PI, n, true);
  ctx.closePath();
}

/** Runs `draw` in a frame rotated and moved to sit on a joint. */
export function at(ctx: CanvasRenderingContext2D, origin: Vec2, angle: number, draw: () => void): void {
  ctx.save();
  ctx.translate(origin.x, origin.y);
  ctx.rotate(angle);
  draw();
  ctx.restore();
}
