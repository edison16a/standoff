import type { MoveState } from "../engine/gestures/move-types";
import { withAlpha } from "./draw";
import { toBox, type Fit } from "./fit";

/** The line is drawn this many shoulder widths either side of the player's home. */
const REACH = 1.1;

/**
 * A player's head line and the band around it, so they can see what
 * counts: the head over the top of the band is a jump, under the bottom
 * a duck. The edge being crossed lights up while the move lasts.
 */
export function drawHeadLine(ctx: CanvasRenderingContext2D, moves: MoveState, colour: string, fit: Fit): void {
  const line = moves.line;
  if (!line) return;
  const left = toBox(fit, { x: line.x - line.width * REACH, y: line.top });
  const right = toBox(fit, { x: line.x + line.width * REACH, y: line.bottom });
  const middle = toBox(fit, { x: line.x, y: line.y }).y;
  const thin = Math.max(1.5, fit.height * 0.004);
  ctx.save();
  ctx.fillStyle = withAlpha(colour, 0.14);
  ctx.fillRect(left.x, left.y, right.x - left.x, right.y - left.y);
  const edge = (y: number, lit: boolean) => {
    ctx.setLineDash(lit ? [] : [thin * 4, thin * 3]);
    ctx.lineWidth = lit ? thin * 2.5 : thin;
    ctx.strokeStyle = lit ? "#ffffff" : withAlpha(colour, 0.8);
    ctx.beginPath();
    ctx.moveTo(left.x, y);
    ctx.lineTo(right.x, y);
    ctx.stroke();
  };
  edge(left.y, moves.jumping);
  edge(right.y, moves.ducking);
  ctx.setLineDash([]);
  ctx.lineCap = "round";
  for (const [stroke, width] of [["rgba(0, 0, 0, 0.5)", thin * 4], [colour, thin * 2]] as const) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(left.x, middle);
    ctx.lineTo(right.x, middle);
    ctx.stroke();
  }
  ctx.restore();
}
