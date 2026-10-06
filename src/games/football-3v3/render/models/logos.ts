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
  // Three tall tongues, the tallest leaning back, over a round base.
  const outer = new Path2D(
    "M 50 96 C 26 96 14 80 18 62 C 21 50 30 44 30 30 C 38 38 42 46 42 54 C 46 40 48 24 40 6 C 58 16 70 32 68 50 C 74 44 78 36 76 26 C 88 40 90 62 82 76 C 76 90 64 96 50 96 Z",
  );
  const inner = new Path2D("M 52 88 C 38 88 31 78 34 67 C 36 60 41 57 42 50 C 47 56 50 62 50 68 C 54 60 56 50 53 40 C 63 48 68 60 65 70 C 69 67 71 63 71 58 C 76 66 76 76 70 82 C 66 86 60 88 52 88 Z");
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
