import * as THREE from "three";
import { seeded } from "../engine/rng";

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!];
}

function finish(c: HTMLCanvasElement, srgb = true): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/**
 * The ball's leather, unwrapped: pebbled orange with the black channels
 * of a real basketball, one great circle through the poles, the equator,
 * and the two curved seams on the sides.
 */
export function ballTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 256);
  ctx.fillStyle = "#d8641f";
  ctx.fillRect(0, 0, 512, 256);
  const rng = seeded(21);
  for (let i = 0; i < 9000; i++) {
    ctx.fillStyle = rng() < 0.5 ? "rgba(120,40,8,0.22)" : "rgba(255,170,110,0.16)";
    ctx.fillRect(rng() * 512, rng() * 256, 1.6, 1.6);
  }
  ctx.strokeStyle = "#1b0f0a";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(512, 128);
  for (const x of [1, 256, 511]) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 256);
  }
  ctx.stroke();
  for (const cx of [128, 384]) {
    ctx.beginPath();
    ctx.ellipse(cx, 128, 70, 132, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  return finish(c);
}

/** Net cords in a diamond mesh on a clear background, with a solid loop band at the top. */
export function netTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(512, 256);
  ctx.clearRect(0, 0, 512, 256);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  const cords = 12;
  const w = 512 / cords;
  for (let i = -cords; i <= cords * 2; i++) {
    ctx.beginPath();
    ctx.moveTo(i * w, 14);
    ctx.lineTo(i * w + w * 4, 256);
    ctx.moveTo(i * w, 14);
    ctx.lineTo(i * w - w * 4, 256);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 512, 16);
  const t = finish(c, true);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** A glowing strip for the LED boards: the words scroll along it. */
export function ledTexture(words: readonly string[], colours: readonly string[]): THREE.CanvasTexture {
  const W = 4096;
  const [c, ctx] = canvas(W, 128);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  colours.forEach((col, i) => g.addColorStop(i / Math.max(1, colours.length - 1), col));
  ctx.fillStyle = "#05060d";
  ctx.fillRect(0, 0, W, 128);
  ctx.fillStyle = g;
  ctx.globalAlpha = 0.3;
  ctx.fillRect(0, 0, W, 128);
  ctx.globalAlpha = 1;
  ctx.font = 'italic 900 80px Impact, "Arial Black", sans-serif';
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const step = W / words.length;
  words.forEach((word, i) => {
    ctx.fillStyle = colours[i % colours.length]!;
    ctx.fillText(word, (i + 0.5) * step, 68);
  });
  const t = finish(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

/** Soft round dot for particles and glows. */
export function dotTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.8)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return finish(c, false);
}

/** A soft dark disc for contact shadows under feet and the ball. */
export function blobTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64, 64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(0,0,0,0.55)");
  g.addColorStop(0.6, "rgba(0,0,0,0.2)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return finish(c, false);
}
