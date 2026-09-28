import * as THREE from "three";

/**
 * The paint splat atlas, drawn in code once: a 4 by 4 grid of splats,
 * each a different shape. The top two rows are round splats for the turf,
 * bunker tops and players. The bottom two rows have drips running down,
 * for walls. Colour comes from the team at draw time, so the atlas holds
 * shape only, one thing per channel:
 *
 * - green: how much paint covers the pixel (the splat's outline).
 * - red: for drip pixels, how far down the drip they are, 0 to 1, so a
 *   shader can let the drip run down over time. Zero on the splat itself.
 * - blue: how thick the paint is, for a wet, raised look.
 */
export const ATLAS_COLS = 4;
export const ROUND_TILES = 8;
export const DRIP_TILES = 8;

const CELL = 256;

type Draw = CanvasRenderingContext2D;

function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** A closed blob through points round a centre, smoothed by curving through midpoints. */
function blob(ctx: Draw, x: number, y: number, radii: number[]): void {
  const n = radii.length;
  const pt = (i: number) => {
    const a = (i / n) * Math.PI * 2;
    const r = radii[((i % n) + n) % n]!;
    return [x + Math.cos(a) * r, y + Math.sin(a) * r] as const;
  };
  ctx.beginPath();
  const [x0, y0] = pt(0);
  const [x1, y1] = pt(1);
  ctx.moveTo((x0 + x1) / 2, (y0 + y1) / 2);
  for (let i = 1; i <= n; i++) {
    const [cx, cy] = pt(i);
    const [nx, ny] = pt(i + 1);
    ctx.quadraticCurveTo(cx, cy, (cx + nx) / 2, (cy + ny) / 2);
  }
  ctx.fill();
}

/** Radii for a lumpy splat: a few waves of different sizes, and some spikes thrown out. */
function outline(r: number, rand: () => number, spikes: number): number[] {
  const n = 48;
  const waves = [1, 2, 3].map((k) => ({ k: k * 2 + Math.floor(rand() * 3), a: (0.14 / k) * (0.5 + rand()), p: rand() * 6.3 }));
  const radii: number[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    let k = 1;
    for (const w of waves) k += w.a * Math.sin(w.k * t + w.p);
    radii.push(r * k);
  }
  // Spikes: a few points pushed far out, their neighbours a little, so they taper.
  for (let s = 0; s < spikes; s++) {
    const i = Math.floor(rand() * n);
    const push = r * (0.35 + rand() * 0.7);
    radii[i] = radii[i]! + push;
    radii[(i + 1) % n] = radii[(i + 1) % n]! + push * 0.35;
    radii[(i + n - 1) % n] = radii[(i + n - 1) % n]! + push * 0.35;
  }
  return radii;
}

/** One splat's shape: the blob, a ring of flung drops and a few streaks. `level` scales it for the thickness passes. */
function splatShape(ctx: Draw, cx: number, cy: number, r: number, seed: number, level: number): void {
  const rand = seeded(seed);
  const radii = outline(r, rand, 5 + Math.floor(rand() * 5)).map((v) => v * level);
  blob(ctx, cx, cy, radii);
  const drops = 14 + Math.floor(rand() * 14);
  for (let i = 0; i < drops; i++) {
    const a = rand() * Math.PI * 2;
    const d = r * (1.1 + Math.pow(rand(), 1.6) * 1.5);
    const size = r * (0.03 + rand() * 0.1) * (1.6 - d / (r * 2.6)) * level;
    if (size <= 0.4) continue;
    // Drops further out are stretched along their flight.
    ctx.save();
    ctx.translate(cx + Math.cos(a) * d, cy + Math.sin(a) * d);
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * (1 + (d / r - 1) * 0.8), size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const streaks = 2 + Math.floor(rand() * 3);
  for (let i = 0; i < streaks; i++) {
    const a = rand() * Math.PI * 2;
    const from = r * 0.8;
    const to = r * (1.4 + rand() * 0.5);
    const w = r * (0.05 + rand() * 0.05) * level;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a - 0.12) * from, cy + Math.sin(a - 0.12) * from);
    ctx.lineTo(cx + Math.cos(a) * to, cy + Math.sin(a) * to);
    ctx.lineTo(cx + Math.cos(a + 0.12) * from, cy + Math.sin(a + 0.12) * from);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * to, cy + Math.sin(a) * to, w, 0, Math.PI * 2);
    ctx.fill();
  }
}

interface Drip {
  x: number;
  top: number;
  length: number;
  width: number;
}

/** Where a wall splat's drips run: from the lower half of the blob, straight down. */
function drips(cx: number, cy: number, r: number, seed: number): Drip[] {
  const rand = seeded(seed * 31 + 7);
  const count = 2 + Math.floor(rand() * 4);
  const out: Drip[] = [];
  for (let i = 0; i < count; i++) {
    const x = cx + (rand() * 2 - 1) * r * 0.75;
    const top = cy + r * (0.2 + rand() * 0.4);
    out.push({ x, top, length: (CELL - 10 - top) * (0.35 + rand() * 0.65), width: r * (0.07 + rand() * 0.07) });
  }
  return out;
}

/** Draws a drip as beads down its path, `value` giving each bead's grey from its distance down. */
function drawDrip(ctx: Draw, d: Drip, value: (t: number) => string): void {
  for (let y = 0; y <= d.length; y += 1) {
    const t = y / d.length;
    // Thinner as it runs, with a fat bead where it stops.
    const w = d.width * (1 - 0.35 * t) + (t > 0.93 ? d.width * 0.6 * Math.sin(((t - 0.93) / 0.07) * Math.PI) : 0);
    ctx.fillStyle = value(t);
    ctx.beginPath();
    ctx.arc(d.x + Math.sin(y * 0.05 + d.x) * 1.2, d.top + y, Math.max(0.8, w), 0, Math.PI * 2);
    ctx.fill();
  }
}

function layer(): [HTMLCanvasElement, Draw] {
  const c = document.createElement("canvas");
  c.width = CELL * ATLAS_COLS;
  c.height = CELL * ATLAS_COLS;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  return [c, ctx];
}

/** Builds the atlas texture. */
export function splatAtlas(): THREE.CanvasTexture {
  const [cover, cc] = layer();
  const [drip, dc] = layer();
  const [thick, tc] = layer();
  const tiles = Array.from({ length: ROUND_TILES + DRIP_TILES }, (_, tile) => {
    const ox = (tile % ATLAS_COLS) * CELL;
    const oy = Math.floor(tile / ATLAS_COLS) * CELL;
    const dripping = tile >= ROUND_TILES;
    return { tile, ox, oy, dripping, cx: ox + CELL / 2, cy: oy + (dripping ? CELL * 0.36 : CELL / 2), r: CELL * (dripping ? 0.19 : 0.22) };
  });
  for (const t of tiles) {
    const seed = 101 + t.tile * 17;
    cc.fillStyle = "#fff";
    splatShape(cc, t.cx, t.cy, t.r, seed, 1);
    // Thickness: the same shape shrunk in steps, so paint builds up towards the middle.
    tc.fillStyle = "rgba(255,255,255,0.22)";
    for (let k = 0; k < 5; k++) splatShape(tc, t.cx, t.cy, t.r * (1 - k * 0.17), seed, 1 - k * 0.12);
  }
  // The splats alone, before any drips: drip order only counts outside them.
  const body = read(cover);
  for (const t of tiles.filter((x) => x.dripping)) {
    for (const d of drips(t.cx - t.ox, t.cy - t.oy, t.r, t.tile)) {
      const at = { ...d, x: d.x + t.ox, top: d.top + t.oy };
      drawDrip(cc, at, () => "#fff");
      drawDrip(tc, at, () => "rgba(255,255,255,0.5)");
      drawDrip(dc, at, (k) => `rgb(${Math.round(12 + k * 243)},0,0)`);
    }
  }
  return combine(read(cover), read(drip), read(thick), body);
}

function read(c: HTMLCanvasElement): Uint8ClampedArray {
  return c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
}

/** Packs the grey layers into one image: drip order in red, cover in green, thickness in blue. */
function combine(cv: Uint8ClampedArray, dv: Uint8ClampedArray, tv: Uint8ClampedArray, body: Uint8ClampedArray): THREE.CanvasTexture {
  const [out, ctx] = layer();
  const img = ctx.createImageData(out.width, out.height);
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = body[i]! > 100 ? 0 : dv[i]!;
    img.data[i + 1] = cv[i]!;
    img.data[i + 2] = tv[i]!;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.colorSpace = THREE.NoColorSpace;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  return tex;
}

/** The atlas tile's corner and size in UV space, for remapping a decal's own 0 to 1 UVs. */
export function tileUv(tile: number): { u: number; v: number; size: number } {
  const col = tile % ATLAS_COLS;
  const row = Math.floor(tile / ATLAS_COLS);
  // The canvas's top row is the texture's top, since canvas textures are flipped.
  return { u: col / ATLAS_COLS, v: (ATLAS_COLS - 1 - row) / ATLAS_COLS, size: 1 / ATLAS_COLS };
}
