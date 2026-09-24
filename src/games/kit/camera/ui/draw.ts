import type { Body } from "../engine/body";
import { BONES, LM } from "../engine/landmarks";
import type { Spot } from "../engine/spots";
import { toBox, type Fit } from "./fit";

/** How a player's guide looks: waiting for them, found and holding still, or done. */
export interface GuideState {
  slot: number;
  colour: string;
  phase: "find" | "hold" | "done";
  /** The ring, 0 to 1. */
  progress: number;
}

/** A standing person, 100 wide and 260 tall, arms a little out: the outline players step into. */
const SILHOUETTE =
  "M40 44 L60 44 C72 46 84 50 86 60 L94 128 Q95 138 88 138 L82 136 L76 78 L74 140 L70 250 Q70 258 62 258 L56 258 L53 152 " +
    "L47 152 L44 258 L38 258 Q30 258 30 250 L26 140 L24 78 L18 136 L12 138 Q5 138 6 128 L14 60 C16 50 28 46 40 44 Z";

/** Path2D exists only in the browser, so the outline is built on first use, never on the server. */
let silhouette: Path2D | null = null;
const silhouettePath = () => (silhouette ??= new Path2D(SILHOUETTE));

/** Where the guide stands: feet near the bottom, as tall as a player a couple of metres back. */
export const GUIDE_FEET = 0.95;
export const GUIDE_HEIGHT = 0.74;
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

/** The outline of where a player should stand, with a ring above it that fills as they hold still. */
export function drawGuide(ctx: CanvasRenderingContext2D, spot: Spot, guide: GuideState, fit: Fit): void {
  // Before the first layout the box has no size, and a ring would get a negative radius.
  if (fit.height < 40) return;
  const feet = toBox(fit, { x: spot.x, y: GUIDE_FEET });
  const height = GUIDE_HEIGHT * fit.height;
  const scale = height / 260;
  ctx.save();
  ctx.translate(feet.x - 50 * scale, feet.y - height);
  ctx.scale(scale, scale);
  const path = silhouettePath();
  ctx.fillStyle = withAlpha(guide.colour, guide.phase === "find" ? 0.1 : 0.22);
  ctx.fill(path);
  ctx.lineWidth = 3.5 / scale;
  ctx.setLineDash(guide.phase === "find" ? [12 / scale, 9 / scale] : []);
  ctx.strokeStyle = withAlpha(guide.colour, 0.95);
  ctx.stroke(path);
  ctx.beginPath();
  ctx.arc(50, 22, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  drawRing(ctx, { x: feet.x, y: feet.y - height - fit.height * 0.075 }, fit.height * 0.05, guide);
}

function drawRing(ctx: CanvasRenderingContext2D, centre: { x: number; y: number }, radius: number, guide: GuideState): void {
  const width = Math.max(4, radius * 0.22);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineWidth = width;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, radius, 0, Math.PI * 2);
  ctx.stroke();
  if (guide.progress > 0) {
    ctx.strokeStyle = guide.colour;
    ctx.beginPath();
    ctx.arc(centre.x, centre.y, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, guide.progress));
    ctx.stroke();
  }
  ctx.fillStyle = guide.phase === "done" ? guide.colour : "rgba(0, 0, 0, 0.45)";
  ctx.beginPath();
  ctx.arc(centre.x, centre.y, Math.max(1, radius - width / 2), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `800 ${Math.round(radius * 0.95)}px system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(guide.phase === "done" ? "OK" : `P${guide.slot}`, centre.x, centre.y + radius * 0.04);
  ctx.restore();
}

/** Turns "#rrggbb" into rgba with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
