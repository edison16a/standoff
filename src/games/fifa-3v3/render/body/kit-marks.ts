import type { Kit } from "../../looks";

/**
 * The printed marks on a kit: the name and number on the back, the
 * crest over the heart, the maker's mark and the sponsor across the
 * chest. Each draws in canvas pixels; `squash` is the print's height
 * over its width per metre on the body, so letters keep their shape
 * once the shirt wraps the torso.
 */

const FONT = "Arial Black, Arial, Helvetica, sans-serif";

function outlined(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, kit: Kit, stroke: number): void {
  ctx.lineJoin = "round";
  ctx.lineWidth = stroke;
  ctx.strokeStyle = kit.ink === kit.trim ? "rgba(0,0,0,0.35)" : kit.trim;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = kit.ink;
  ctx.fillText(text, x, y);
}

/** Text at (x, y) squashed to the body's proportions. */
function squashed(ctx: CanvasRenderingContext2D, squash: number, x: number, y: number, draw: () => void): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1, squash);
  draw();
  ctx.restore();
}

/** The name across the shoulders and the big number below it. `px` is pixels per metre across the back. */
export function printBack(ctx: CanvasRenderingContext2D, kit: Kit, name: string, number: number, x: number, nameY: number, numberY: number, px: number, squash: number): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const text = name.toUpperCase();
  if (text) {
    // A long name shrinks to fit across the shoulders.
    let size = 0.055 * px;
    ctx.font = `800 ${size}px ${FONT}`;
    while (size > 0.025 * px && ctx.measureText(text).width > 0.3 * px) {
      size -= 1;
      ctx.font = `800 ${size}px ${FONT}`;
    }
    squashed(ctx, squash, x, nameY, () => outlined(ctx, text, 0, 0, kit, size * 0.14));
  }
  ctx.font = `900 ${0.25 * px}px ${FONT}`;
  squashed(ctx, squash, x, numberY, () => outlined(ctx, String(number), 0, 0, kit, 0.018 * px));
}

/** A shield crest over the heart: the trim colour with the ink round it and a band across. */
export function printCrest(ctx: CanvasRenderingContext2D, kit: Kit, cx: number, cy: number, px: number, squash: number): void {
  const w = 0.03 * px;
  const h = 0.036 * px;
  squashed(ctx, squash, cx, cy, () => {
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(w, -h);
    ctx.lineTo(w, h * 0.15);
    ctx.quadraticCurveTo(w * 0.9, h * 0.85, 0, h * 1.25);
    ctx.quadraticCurveTo(-w * 0.9, h * 0.85, -w, h * 0.15);
    ctx.closePath();
    ctx.fillStyle = kit.trim;
    ctx.fill();
    ctx.lineWidth = 0.005 * px;
    ctx.strokeStyle = kit.ink;
    ctx.stroke();
    ctx.fillStyle = kit.ink;
    ctx.fillRect(-w, -h * 0.25, 2 * w, h * 0.3);
    ctx.beginPath();
    ctx.arc(0, h * 0.55, w * 0.32, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** A maker's mark: a plain swept tick, nobody's logo. */
export function printMaker(ctx: CanvasRenderingContext2D, kit: Kit, cx: number, cy: number, px: number, squash: number): void {
  const w = 0.026 * px;
  squashed(ctx, squash, cx, cy, () => {
    ctx.fillStyle = kit.ink;
    ctx.beginPath();
    ctx.moveTo(-w, w * 0.15);
    ctx.quadraticCurveTo(-w * 0.2, w * 0.75, w, -w * 0.55);
    ctx.quadraticCurveTo(-w * 0.1, w * 0.35, -w, w * 0.15);
    ctx.fill();
  });
}

/** The sponsor across the chest: the platform's own name, as a club wears its sponsor. */
export function printSponsor(ctx: CanvasRenderingContext2D, kit: Kit, cx: number, cy: number, px: number, squash: number): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `italic 900 ${0.06 * px}px ${FONT}`;
  squashed(ctx, squash, cx, cy, () => {
    ctx.fillStyle = kit.ink;
    ctx.fillText("STANDOFF", 0, 0);
  });
}

/** A small number on the front of the shorts. */
export function printShortsNumber(ctx: CanvasRenderingContext2D, kit: Kit, number: number, x: number, y: number, px: number, squash: number): void {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${0.07 * px}px ${FONT}`;
  squashed(ctx, squash, x, y, () => outlined(ctx, String(number), 0, 0, kit, 0.006 * px));
}
