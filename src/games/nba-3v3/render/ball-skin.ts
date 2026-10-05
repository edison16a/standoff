import * as THREE from "three";
import { seeded } from "../engine/rng";

/**
 * The ball's leather, worked out on the sphere itself so the seams are
 * real curves: the cross of two great circles, and four ovals round the
 * sides and the poles. The ovals are orange and the lobes between them
 * cream, the two tone panels of a modern game ball, so
 * every turn of the spin reads from across the arena. The channels are
 * sunk into a bump map with the pebbling, so the lights catch both.
 */

const ORANGE: readonly [number, number, number] = [214, 92, 30];
const CREAM: readonly [number, number, number] = [228, 205, 168];
const SEAM: readonly [number, number, number] = [44, 34, 30];
/** Half the width of a channel, in radians of the ball: about 4 mm. */
const CHANNEL = 0.034;
/**
 * The ovals' half spans as seen down their own axis: wide toward the
 * cross, narrow toward the next oval. That leaves cream lobes running
 * out from the cross along the diagonals: twelve panels in all, four
 * cream and eight orange.
 */
const OVAL_A = 0.8;
const OVAL_B = 0.55;

interface Skin {
  map: THREE.CanvasTexture;
  bump: THREE.CanvasTexture;
}

/** How far outside (positive) or inside an oval round axis `k` a direction is, in radians, roughly. */
function oval(across: number, along: number, axis: number): number {
  if (axis <= 0) return 1;
  return (Math.hypot(across / OVAL_A, along / OVAL_B) - 1) * OVAL_B;
}

/** The tone (0 orange, 1 cream) and how deep in a channel a direction on the ball is, 0 to 1. Written to `hit` to spare allocations. */
const hit = { tone: 0, channel: 0 };
function sample(x: number, y: number, z: number): void {
  const ox = Math.min(oval(z, y, x), oval(z, y, -x));
  const oy = Math.min(oval(z, x, y), oval(z, x, -y));
  // A seam only shows where it divides two colours, or across the cross.
  let d = Math.min(Math.abs(x), Math.abs(y));
  if (ox >= -CHANNEL && oy > 0) d = Math.min(d, Math.abs(ox));
  if (oy >= -CHANNEL && ox > 0) d = Math.min(d, Math.abs(oy));
  hit.tone = Math.min(ox, oy) < 0 ? 0 : 1;
  hit.channel = Math.max(0, 1 - d / CHANNEL);
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D, ImageData] {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  return [c, ctx, ctx.createImageData(w, h)];
}

/** `width` is the texture's size round the equator; the phone's small preview asks for less. */
export function ballSkin(width = 1024): Skin {
  const W = width;
  const H = width / 2;
  const [mc, mctx, colour] = canvas(W, H);
  const [bc, bctx, bump] = canvas(W, H);
  const rng = seeded(21);
  for (let r = 0; r < H; r++) {
    // Rows run pole to pole and columns round the equator, as three.js lays a sphere's texture.
    const theta = ((r + 0.5) / H) * Math.PI;
    const st = Math.sin(theta);
    const y = Math.cos(theta);
    for (let c = 0; c < W; c++) {
      const phi = ((c + 0.5) / W) * Math.PI * 2;
      sample(-Math.cos(phi) * st, y, Math.sin(phi) * st);
      const { tone, channel } = hit;
      const base = tone ? CREAM : ORANGE;
      // Pebbling: tiny bumps that catch the light a little lighter, and a faint mottle in the dye.
      const pebble = rng();
      const shade = 0.94 + pebble * 0.1 - channel * 0.05;
      const k = (r * W + c) * 4;
      const groove = channel * channel * (3 - 2 * channel);
      for (let i = 0; i < 3; i++) colour.data[k + i] = Math.round((base[i]! * shade) * (1 - groove) + SEAM[i]! * groove);
      colour.data[k + 3] = 255;
      const height = 200 + pebble * 55 - groove * 190;
      bump.data[k] = bump.data[k + 1] = bump.data[k + 2] = height;
      bump.data[k + 3] = 255;
    }
  }
  mctx.putImageData(colour, 0, 0);
  bctx.putImageData(bump, 0, 0);
  printName(mctx, W, H);
  const map = new THREE.CanvasTexture(mc);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const bumpMap = new THREE.CanvasTexture(bc);
  bumpMap.anisotropy = 4;
  return { map, bump: bumpMap };
}

/** The arena's own name printed small on two of the orange panels, as a maker's mark would be. */
function printName(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.save();
  ctx.font = `italic 900 ${Math.round(W * 0.03)}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(90, 24, 10, 0.55)";
  for (const x of [W * 0.5, 0]) {
    ctx.fillText("STANDOFF", x, H * 0.37);
    if (x === 0) ctx.fillText("STANDOFF", W, H * 0.37);
  }
  ctx.restore();
}
