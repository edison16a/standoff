import type { Spot } from "../engine/spots";
import { withAlpha } from "./draw";
import { toBox, type Fit } from "./fit";

/** How a player's guide looks: waiting for them, found and holding still, or done. */
export interface GuideState {
  slot: number;
  colour: string;
  phase: "find" | "hold" | "done";
  /** The ring, 0 to 1. */
  progress: number;
  /** Where the player's head is while they hold still, then their head line once set. Picture y, 0 to 1. */
  line?: number | null;
}

/**
 * Head, shoulders and body to the waist, 100 wide and 130 tall, the head
 * a circle drawn apart: the outline players step into. Only the upper
 * body, since a computer camera close up sees a player from the waist up.
 */
const BUST = "M42 40 L58 40 L60 48 C76 50 90 54 93 66 L98 130 L2 130 L7 66 C10 54 24 50 40 48 Z";
const BUST_HEAD = { x: 50, y: 22, r: 18 };
const BUST_HEIGHT = 130;

/** Path2D exists only in the browser, so the outline is built on first use, never on the server. */
let bust: Path2D | null = null;
const bustPath = () => (bust ??= new Path2D(BUST));

/** Where the guide's head sits down the picture, leaving room above it for a jump. Its waist is at the bottom. */
export const GUIDE_HEAD = 0.32;

/** The outline of where a player should stand, a ring above it that fills as they hold still, and their head line. */
export function drawGuide(ctx: CanvasRenderingContext2D, spot: Spot, guide: GuideState, fit: Fit): void {
  // Before the first layout the box has no size, and a ring would get a negative radius.
  if (fit.height < 40) return;
  const head = toBox(fit, { x: spot.x, y: GUIDE_HEAD });
  const scale = ((1 - GUIDE_HEAD) * fit.height) / (BUST_HEIGHT - BUST_HEAD.y);
  ctx.save();
  ctx.translate(head.x - BUST_HEAD.x * scale, head.y - BUST_HEAD.y * scale);
  ctx.scale(scale, scale);
  const path = bustPath();
  ctx.fillStyle = withAlpha(guide.colour, guide.phase === "find" ? 0.1 : 0.22);
  ctx.fill(path);
  ctx.lineWidth = 3.5 / scale;
  ctx.setLineDash(guide.phase === "find" ? [12 / scale, 9 / scale] : []);
  ctx.strokeStyle = withAlpha(guide.colour, 0.95);
  ctx.stroke(path);
  ctx.beginPath();
  ctx.arc(BUST_HEAD.x, BUST_HEAD.y, BUST_HEAD.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  if (guide.line !== null && guide.line !== undefined) drawGuideLine(ctx, spot, guide, guide.line, fit, scale * 100);
  const top = head.y - (BUST_HEAD.r + 4) * scale;
  const radius = fit.height * 0.05;
  drawRing(ctx, { x: head.x, y: Math.max(radius + 6, top - radius - fit.height * 0.02) }, radius, guide);
}

/** A line across the guide at the head's height: dashed while it settles, solid once it is the player's head line. */
function drawGuideLine(ctx: CanvasRenderingContext2D, spot: Spot, guide: GuideState, y: number, fit: Fit, width: number): void {
  const at = toBox(fit, { x: spot.x, y });
  ctx.save();
  ctx.lineCap = "round";
  ctx.setLineDash(guide.phase === "done" ? [] : [10, 8]);
  for (const [stroke, lineWidth] of [["rgba(0, 0, 0, 0.5)", 7], [guide.colour, 3.5]] as const) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(at.x - width * 0.75, at.y);
    ctx.lineTo(at.x + width * 0.75, at.y);
    ctx.stroke();
  }
  ctx.restore();
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
