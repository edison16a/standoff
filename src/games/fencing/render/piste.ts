import { EN_GARDE_X, STRIP_HALF_LENGTH } from "@/games/fencing/engine/rules";
import type { Camera } from "./camera";
import type { Palette } from "./palette";

/** The warning zone is the last two metres at each end, as on a real strip. */
const WARNING_ZONE = 2;
/** Thickness of the strip as drawn, in metres of depth. */
const STRIP_DEPTH = 0.55;

/**
 * Draws the strip: a flat band with the centre line, both en garde lines
 * and the end zones marked. Flat fills only, the fencers are the detail.
 */
export function drawPiste(ctx: CanvasRenderingContext2D, camera: Camera, palette: Palette): void {
  const s = camera.pixelsPerMetre;
  const top = camera.floorY - STRIP_DEPTH * s * 0.35;
  const height = STRIP_DEPTH * s * 0.7;
  const left = camera.toScreenX(-STRIP_HALF_LENGTH);
  const right = camera.toScreenX(STRIP_HALF_LENGTH);

  ctx.fillStyle = palette.floor;
  roundRect(ctx, left, top, right - left, height, Math.min(12, height / 2));
  ctx.fill();

  // End zones get a diagonal hatch so players can see the back of the strip coming.
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  for (const [from, to] of [
    [-STRIP_HALF_LENGTH, -STRIP_HALF_LENGTH + WARNING_ZONE],
    [STRIP_HALF_LENGTH - WARNING_ZONE, STRIP_HALF_LENGTH],
  ] as const) {
    const x0 = camera.toScreenX(from);
    const x1 = camera.toScreenX(to);
    ctx.save();
    roundRect(ctx, left, top, right - left, height, Math.min(12, height / 2));
    ctx.clip();
    ctx.beginPath();
    ctx.rect(x0, top, x1 - x0, height);
    ctx.clip();
    ctx.beginPath();
    for (let x = x0 - height; x < x1; x += 10) {
      ctx.moveTo(x, top + height);
      ctx.lineTo(x + height, top);
    }
    ctx.stroke();
    ctx.restore();
  }

  const mark = (x: number, width: number, colour: string) => {
    ctx.fillStyle = colour;
    ctx.fillRect(Math.round(camera.toScreenX(x) - width / 2), top, width, height);
  };
  mark(0, 2, palette.line);
  mark(-EN_GARDE_X, 2, palette.line);
  mark(EN_GARDE_X, 2, palette.line);
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}
