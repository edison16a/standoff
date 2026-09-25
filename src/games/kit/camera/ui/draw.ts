import type { Body } from "../engine/body";
import { BONES, LM } from "../engine/landmarks";
import { toBox, type Fit } from "./fit";

const MIN_VISIBLE = 0.5;

export function drawSkeleton(ctx: CanvasRenderingContext2D, body: Body, colour: string, fit: Fit): void {
  const width = Math.max(2.5, fit.height * 0.011);
  const seen = (i: number) => (body.landmarks[i]?.visibility ?? 0) >= MIN_VISIBLE;
  const at = (i: number) => toBox(fit, body.landmarks[i]!);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // A dark edge under each bone keeps the colour readable over any clothes or wall.
  for (const [stroke, lineWidth] of [["rgba(0, 0, 0, 0.5)", width + 4], [colour, width]] as const) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    for (const [a, b] of BONES) {
      if (!seen(a) || !seen(b)) continue;
      const [p, q] = [at(a), at(b)];
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  for (const i of [LM.leftWrist, LM.rightWrist, LM.leftElbow, LM.rightElbow, LM.leftKnee, LM.rightKnee]) {
    if (!seen(i)) continue;
    const p = at(i);
    ctx.beginPath();
    ctx.arc(p.x, p.y, width * (i === LM.leftWrist || i === LM.rightWrist ? 1.3 : 0.8), 0, Math.PI * 2);
    ctx.fill();
  }
  if (seen(LM.nose)) {
    const head = toBox(fit, body.head);
    const radius = Math.max(width * 2, body.shoulderWidth * fit.height * 0.36);
    ctx.beginPath();
    ctx.arc(head.x, head.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = withAlpha(colour, 0.25);
    ctx.fill();
    ctx.lineWidth = width;
    ctx.strokeStyle = colour;
    ctx.stroke();
  }
  ctx.restore();
}

/** Turns "#rrggbb" into rgba with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
