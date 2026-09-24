import type { Vec2 } from "./geometry";

/**
 * What a piece is painted in: any CSS colour from the skin, or `trim` for
 * the player colour. Trim is red for player one and green for player two,
 * like the scoring lamps, so the two read apart even in matching kit.
 */
export type Tone = string;

/** Colours that do not change between skins: eyes, grips and bare faces. */
export const INK = "#18191b";
export const FACE = "#f0c49c";
export const LEATHER = "#4a3222";

export interface Brush {
  ctx: CanvasRenderingContext2D;
  /** The player colour that `trim` resolves to. */
  trim: string;
  /** Outline colour, which flips with the theme so pieces read on any background. */
  outline: string;
  /** Metres per screen pixel, so line widths stay crisp at any zoom. */
  px: number;
}

/** The actual colour for a tone, with `trim` swapped for the player colour. */
export function colour(brush: Brush, tone: Tone): string {
  return tone === "trim" ? brush.trim : tone;
}

/** Fills and outlines whatever path `build` traces. */
export function paint(brush: Brush, tone: Tone, build: (ctx: CanvasRenderingContext2D) => void): void {
  const { ctx } = brush;
  ctx.beginPath();
  build(ctx);
  ctx.fillStyle = colour(brush, tone);
  ctx.fill();
  ctx.lineWidth = 1.5 * brush.px;
  ctx.strokeStyle = brush.outline;
  ctx.stroke();
}

/** One filled shape inside a group. */
export interface Part {
  tone: Tone;
  build: (ctx: CanvasRenderingContext2D) => void;
}

/**
 * Paints several shapes as one silhouette. All outlines go down first at
 * double width, then every fill on top, so the seams where a thigh meets
 * a shin disappear and only the outer edge of the limb is outlined. This
 * is what makes separate cutout pieces read as one body.
 */
export function paintGroup(brush: Brush, parts: Part[]): void {
  const { ctx } = brush;
  ctx.lineJoin = "round";
  ctx.lineWidth = 3 * brush.px;
  ctx.strokeStyle = brush.outline;
  for (const part of parts) {
    ctx.beginPath();
    part.build(ctx);
    ctx.stroke();
  }
  for (const part of parts) {
    ctx.beginPath();
    part.build(ctx);
    ctx.fillStyle = colour(brush, part.tone);
    ctx.fill();
  }
}

/** Strokes a line in a tone, for details like seams, mesh and visor slits. */
export function line(brush: Brush, tone: Tone | "outline", width: number, points: Vec2[]): void {
  const { ctx } = brush;
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineWidth = width * brush.px;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = tone === "outline" ? brush.outline : colour(brush, tone);
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
