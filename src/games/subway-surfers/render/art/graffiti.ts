import { Rng } from "../../engine/rng";

/** Loud spray paint colours, fill and outline. */
const SPRAYS = [
  ["#ff3d7f", "#2a0a3d"],
  ["#ffd21f", "#1b2a8a"],
  ["#2ee6a8", "#10213d"],
  ["#4db8ff", "#2b0f4a"],
  ["#ff8a1f", "#3b0a0a"],
  ["#b46bff", "#111133"],
] as const;

const WORDS = ["RUN", "SURF", "ZOOM", "YO!", "WOW", "HYPE", "FLY", "GO!", "JUMP", "RAD", "BOOM", "COOL"];

export const DISPLAY_FONT = '"Arial Black", "Arial Rounded MT Bold", Impact, "DejaVu Sans", sans-serif';

/**
 * A graffiti piece: a fat word with an outline, a shadow and a shine,
 * with drips, stars and a few spray dots around it. Drawn over whatever
 * is already on the canvas, inside the box given.
 */
export function drawGraffiti(ctx: CanvasRenderingContext2D, seed: number, x: number, y: number, w: number, h: number): void {
  const rng = new Rng(seed * 7919 + 13);
  const [fill, line] = SPRAYS[seed % SPRAYS.length]!;
  const [fill2] = SPRAYS[(seed + 2) % SPRAYS.length]!;
  const word = WORDS[rng.int(0, WORDS.length - 1)]!;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rng.range(-0.12, 0.08));
  // A cloud of background colour behind the letters, like a real piece.
  ctx.fillStyle = fill2;
  ctx.globalAlpha = 0.85;
  blob(ctx, rng, 0, 0, w * 0.46, h * 0.36);
  ctx.globalAlpha = 1;
  const size = Math.min(h * 0.62, (w * 1.35) / word.length);
  ctx.font = `900 ${size}px ${DISPLAY_FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(0,0,0,0.55)";
  ctx.lineWidth = size * 0.3;
  ctx.strokeText(word, size * 0.06, size * 0.08);
  ctx.strokeStyle = line;
  ctx.lineWidth = size * 0.24;
  ctx.strokeText(word, 0, 0);
  const gradient = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.3, fill);
  gradient.addColorStop(1, fill2);
  ctx.fillStyle = gradient;
  ctx.fillText(word, 0, 0);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = Math.max(2, size * 0.03);
  ctx.strokeText(word, -size * 0.02, -size * 0.03);
  // Drips under the letters.
  ctx.fillStyle = fill;
  for (let i = 0; i < 5; i++) {
    const dx = rng.range(-w * 0.3, w * 0.3);
    const top = size * 0.3;
    const length = rng.range(size * 0.2, size * 0.6);
    ctx.fillRect(dx, top, size * 0.06, length);
    ctx.beginPath();
    ctx.arc(dx + size * 0.03, top + length, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 3; i++) star(ctx, rng.range(-w * 0.45, w * 0.45), rng.range(-h * 0.4, h * 0.4), rng.range(size * 0.12, size * 0.22), "#ffffff");
  ctx.restore();
}

function blob(ctx: CanvasRenderingContext2D, rng: Rng, cx: number, cy: number, rx: number, ry: number): void {
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i <= points; i++) {
    const a = (i / points) * Math.PI * 2;
    const r = rng.range(0.82, 1.08);
    const px = cx + Math.cos(a) * rx * r;
    const py = cy + Math.sin(a) * ry * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
