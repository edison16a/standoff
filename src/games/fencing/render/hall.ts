import type { Camera } from "./camera";
import type { Palette } from "./palette";

/** Flags per strand, and how far the strand sags at its middle as a share of the screen. */
const FLAGS = 24;
const SAG = 0.03;

/**
 * The hall behind the strip: a painted rail along the wall and two strands
 * of bunting across the top. It is fixed to the screen rather than the
 * strip, so it stays put while the camera follows the fencers.
 */
export function drawHall(ctx: CanvasRenderingContext2D, camera: Camera, palette: Palette): void {
  const { width, height } = camera;
  ctx.fillStyle = palette.rail;
  ctx.fillRect(0, camera.floorY - height * 0.2, width, height * 0.035);
  strand(ctx, palette, width, height * 0.11, height, 0);
  strand(ctx, palette, width, height * 0.16, height, 3);
}

/** One sagging string of triangle flags, its colours offset so the two strands differ. */
function strand(ctx: CanvasRenderingContext2D, palette: Palette, width: number, top: number, height: number, shift: number): void {
  const sagAt = (x: number) => top + Math.sin((x / width) * Math.PI) * height * SAG;
  const step = width / FLAGS;
  const size = Math.min(step * 0.6, height * 0.028);

  ctx.strokeStyle = palette.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, sagAt(0));
  for (let x = 8; x <= width + 8; x += 8) ctx.lineTo(x, sagAt(x));
  ctx.stroke();

  for (let i = 0; i < FLAGS; i++) {
    const left = i * step + (step - size) / 2;
    const right = left + size;
    const middle = (left + right) / 2;
    ctx.fillStyle = palette.confetti[(i + shift) % palette.confetti.length] ?? palette.muted;
    ctx.beginPath();
    ctx.moveTo(left, sagAt(left));
    ctx.lineTo(right, sagAt(right));
    ctx.lineTo(middle, sagAt(middle) + size * 1.1);
    ctx.closePath();
    ctx.fill();
  }
}
