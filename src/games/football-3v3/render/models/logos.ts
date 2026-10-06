import type { TeamId } from "../../teams";

/**
 * The team marks, drawn in code: a lightning bolt for Storm and a flame
 * for Blaze. Each is drawn facing right into a square, so on a helmet
 * it can be laid to face forward on either side.
 */
export function drawLogo(ctx: CanvasRenderingContext2D, team: TeamId, size: number): void {
  ctx.save();
  ctx.scale(size / 100, size / 100);
  ctx.lineJoin = "round";
  if (team === 0) bolt(ctx);
  else flame(ctx);
  ctx.restore();
}

/** A bolt slashing forward and down, gold edged in white and navy. */
function bolt(ctx: CanvasRenderingContext2D): void {
  const p = new Path2D("M 70 8 L 30 8 L 48 40 L 22 40 L 74 94 L 58 54 L 82 54 Z");
  ctx.lineWidth = 12;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke(p);
  ctx.lineWidth = 5;
  ctx.strokeStyle = "#0b2a6b";
  ctx.stroke(p);
  const g = ctx.createLinearGradient(80, 8, 30, 94);
  g.addColorStop(0, "#ffe27a");
  g.addColorStop(1, "#e3a90f");
  ctx.fillStyle = g;
  ctx.fill(p);
}

/** Three tongues of flame swept back, as if rushing forward. */
function flame(ctx: CanvasRenderingContext2D): void {
  const outer = new Path2D(
    "M 52 94 C 24 94 12 74 18 54 C 22 40 34 34 32 18 C 46 28 50 40 48 50 C 56 40 58 26 54 8 C 74 22 86 44 82 64 C 80 80 70 94 52 94 Z",
  );
  const inner = new Path2D("M 52 86 C 36 86 28 74 32 62 C 36 54 42 52 42 44 C 50 52 52 58 50 66 C 58 60 62 52 62 42 C 72 54 74 66 70 74 C 66 82 60 86 52 86 Z");
  ctx.lineWidth = 11;
  ctx.strokeStyle = "#ffffff";
  ctx.stroke(outer);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#5a0d04";
  ctx.stroke(outer);
  const g = ctx.createLinearGradient(50, 94, 50, 8);
  g.addColorStop(0, "#ff5a1f");
  g.addColorStop(1, "#ffb21f");
  ctx.fillStyle = g;
  ctx.fill(outer);
  ctx.fillStyle = "#ffe066";
  ctx.fill(inner);
}
