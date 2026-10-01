import type { Player } from "@/platform/games/game-api";
import { playerColor } from "@/games/kit/players";

/** A box on the page in CSS pixels, such as a player's zone. */
export type Box = { x: number; y: number; w: number; h: number };

/** The outline of a player's zone while they calibrate in it, so they can see which part of the screen is theirs. */
export function drawZone(ctx: CanvasRenderingContext2D, box: Box, colour: string): void {
  ctx.save();
  ctx.fillStyle = "rgba(10, 10, 20, 0.28)";
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 10]);
  ctx.beginPath();
  ctx.roundRect(box.x + 8, box.y + 8, box.w - 16, box.h - 16, 18);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** How a calibration target is drawn on the big screen: its spot, colour and the words under or over it. */
export interface MarkPlan {
  key: string;
  at: { x: number; y: number };
  colour: string;
  words: string[];
  above: boolean;
  align: "start" | "center" | "end";
}

/** Room the words need beside a target near a side edge, so they line up with it there instead of running off. */
const SIDE_ROOM = 110;
/** Room each line of words needs below a target. */
const LINE_ROOM = 34;

/**
 * Plans one calibration target, named for everyone looking for it. The
 * target itself is the look every aiming game shares (look/TargetMark).
 * Its words go below it, or above when they would run past the bottom of
 * the zone, and line up with its side near a side edge.
 */
export function planMark(at: { x: number; y: number }, who: Player[], box: Box): MarkPlan {
  const words = who.map((player) => `${player.name}, point here`);
  const above = at.y + 48 + words.length * LINE_ROOM > box.y + box.h;
  const align = at.x - box.x < SIDE_ROOM ? "start" : box.x + box.w - at.x < SIDE_ROOM ? "end" : "center";
  return { key: `${Math.round(at.x)},${Math.round(at.y)}`, at, colour: playerColor(who[0]!.seat), words, above, align };
}

/** A player's laser dot: a glow, a ring in their colour round a white core, and their name if given. `alpha` fades all of it. */
export function drawDot(ctx: CanvasRenderingContext2D, at: { x: number; y: number }, colour: string, name: string, box: Box, alpha = 1): void {
  ctx.save();
  const glow = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, 28);
  glow.addColorStop(0, colour);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.globalAlpha = 0.55 * alpha;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(at.x, at.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = colour;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 11, 0, Math.PI * 2);
  ctx.stroke();
  if (name) {
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillStyle = colour;
    // The name flips to the dot's other side near the right or top edge, so it stays in sight too.
    const flipX = at.x + 16 + ctx.measureText(name).width > box.x + box.w;
    ctx.textAlign = flipX ? "right" : "left";
    ctx.fillText(name, flipX ? at.x - 16 : at.x + 16, at.y - 14 < box.y + 12 ? at.y + 26 : at.y - 14);
  }
  ctx.restore();
}
