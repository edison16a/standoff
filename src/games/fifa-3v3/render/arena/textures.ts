import * as THREE from "three";
import { PITCH } from "../../engine/tuning";
import { Rng } from "../../engine/rng";

/** Pixels per metre on the turf. */
const PPM = 64;

function canvasOf(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return [canvas, canvas.getContext("2d")!];
}

function texture(canvas: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/**
 * The pitch: mown stripes in two greens, a little grain, and the white
 * lines of a five a side pitch: halfway line, centre circle, the
 * keepers' half circles and the penalty spots.
 */
export function turfTexture(): THREE.CanvasTexture {
  const L = PITCH.halfLength * 2;
  const W = PITCH.halfWidth * 2;
  const [canvas, ctx] = canvasOf(L * PPM, W * PPM);
  const stripes = 16;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#2a7a33" : "#22682b";
    ctx.fillRect((i * canvas.width) / stripes, 0, canvas.width / stripes + 1, canvas.height);
  }
  // Uneven wear: soft darker patches, heavier in the goalmouths.
  const rng = new Rng(7);
  for (let i = 0; i < 140; i++) {
    const x = rng.next() * canvas.width;
    const y = rng.next() * canvas.height;
    const r = 30 + rng.next() * 120;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(10,40,10,${0.05 + rng.next() * 0.06})`);
    g.addColorStop(1, "rgba(10,40,10,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (const end of [-1, 1]) {
    const x = (end * PITCH.halfLength + PITCH.halfLength) * PPM;
    const g = ctx.createRadialGradient(x, canvas.height / 2, 0, x, canvas.height / 2, 4 * PPM);
    g.addColorStop(0, "rgba(70,60,30,0.25)");
    g.addColorStop(1, "rgba(70,60,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 4 * PPM, canvas.height / 2 - 4 * PPM, 8 * PPM, 8 * PPM);
  }
  drawLines(ctx, canvas.width, canvas.height);
  return texture(canvas);
}

function drawLines(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const m = (v: number) => v * PPM;
  const cx = w / 2;
  const cy = h / 2;
  ctx.strokeStyle = "rgba(245,248,240,0.92)";
  ctx.fillStyle = "rgba(245,248,240,0.92)";
  ctx.lineWidth = m(0.09);
  const inset = m(0.3);
  ctx.strokeRect(m(0.05), inset, w - m(0.1), h - inset * 2);
  ctx.beginPath();
  ctx.moveTo(cx, inset);
  ctx.lineTo(cx, h - inset);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, m(PITCH.centreRadius), 0, Math.PI * 2);
  ctx.stroke();
  // The centre spot and a penalty spot six metres out from each goal.
  for (const [x, r] of [[cx, 0.16], [m(6), 0.11], [w - m(6), 0.11]] as const) {
    ctx.beginPath();
    ctx.arc(x, cy, m(r), 0, Math.PI * 2);
    ctx.fill();
  }
  for (const side of [0, 1]) {
    ctx.beginPath();
    const x = side === 0 ? m(0.05) : w - m(0.05);
    ctx.arc(x, cy, m(PITCH.boxRadius), side === 0 ? -Math.PI / 2 : Math.PI / 2, side === 0 ? Math.PI / 2 : Math.PI * 1.5);
    ctx.stroke();
  }
  for (const [x, y, start] of [[0, 0, 0], [w, 0, Math.PI / 2], [w, h, Math.PI], [0, h, Math.PI * 1.5]] as const) {
    ctx.beginPath();
    ctx.arc(x, y === 0 ? inset : h - inset, m(0.6), start, start + Math.PI / 2);
    ctx.stroke();
  }
}

/** Fine blades of grass for the surface relief, tiled across the pitch. */
export function grassGrain(): THREE.CanvasTexture {
  const [canvas, ctx] = canvasOf(256, 256);
  const image = ctx.createImageData(256, 256);
  const rng = new Rng(3);
  for (let i = 0; i < image.data.length; i += 4) {
    const v = 110 + rng.next() * 145;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = v;
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const t = texture(canvas, false);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** A soft round blob, for shadows under players and the glow round lamps. */
export function blobTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = canvasOf(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.55)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return texture(canvas);
}

/** Net mesh: white cords on a clear background, in 12 centimetre squares when tiled. */
export function netTexture(): THREE.CanvasTexture {
  const [canvas, ctx] = canvasOf(64, 64);
  ctx.strokeStyle = "rgba(255,255,255,1)";
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, 64, 64);
  const t = texture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
