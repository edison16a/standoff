import * as THREE from "three";
import { seeded } from "../engine/rng";
import { ballSkin } from "./ball-skin";

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

/** The ball's two tone leather (see `ball-skin.ts`), small, for the phone's preview. */
export function ballTexture(): THREE.CanvasTexture {
  const { map, bump } = ballSkin(512);
  bump.dispose();
  return map;
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

/**
 * The upper deck behind the stands: a row of lit suite windows over a
 * packed dark tier, broken by team colour banners. It fills the gap
 * between the crowd and the roof so the arena never ends in black.
 */
export function suitesTexture(banners: readonly string[]): THREE.CanvasTexture {
  const W = 2048;
  const [c, ctx] = canvas(W, 256);
  const rng = seeded(71);
  ctx.fillStyle = "#0b0e1c";
  ctx.fillRect(0, 0, W, 256);
  // The upper tier of fans: small dim heads in rows.
  for (let row = 0; row < 7; row++) {
    for (let x = 4; x < W; x += 9) {
      ctx.fillStyle = `hsl(${Math.floor(rng() * 360)}, 16%, ${Math.floor(14 + rng() * 34)}%)`;
      ctx.fillRect(x + (row % 2) * 4, 118 + row * 19, 6, 12);
    }
  }
  // The suites: warm windows in a band, a few of them dark.
  ctx.fillStyle = "#151a2e";
  ctx.fillRect(0, 44, W, 60);
  for (let x = 6; x < W; x += 40) {
    ctx.fillStyle = rng() < 0.18 ? "#2a2f45" : `rgb(255, ${200 + Math.floor(rng() * 40)}, ${130 + Math.floor(rng() * 60)})`;
    ctx.fillRect(x, 52, 32, 44);
  }
  // Banners hanging in the team colours.
  banners.forEach((colour, i) => {
    const x = ((i + 0.5) / banners.length) * W - 30;
    ctx.fillStyle = colour;
    ctx.fillRect(x, 0, 60, 118);
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillRect(x + 8, 14, 44, 6);
  });
  const t = finish(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}
