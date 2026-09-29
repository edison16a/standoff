/**
 * The paint splat atlas, drawn in code once: a grid of different splat
 * shapes, each in its own cell. The first half lies flat (floors, lids,
 * bodies); the second half has drips running down, for walls and the
 * sides of bunkers. Pure data, so it can be tested without a browser.
 *
 * Channels: red is how thick the paint is (for shading), green is how far
 * down a drip a pixel sits (0 for the splat itself, so drips can run in
 * over time), alpha is coverage. Rows run top down, as an image does.
 */

export const ATLAS_GRID = 4;
export const TILE_COUNT = ATLAS_GRID * ATLAS_GRID;
/** Tiles from here on have drips. */
export const DRIP_FROM = TILE_COUNT / 2;

interface Circle {
  x: number;
  y: number;
  r: number;
}

interface Drip {
  x: number;
  top: number;
  length: number;
  width: number;
}

interface Shape {
  radius: number;
  /** Sine wobble round the rim: [strength, frequency, phase]. */
  wobble: [number, number, number][];
  /** Thin spikes thrown out from the rim: [angle, length, sharpness]. */
  spikes: [number, number, number][];
  stretch: number;
  drops: Circle[];
  drips: Drip[];
}

/** A small seeded random source, so every run draws the same atlas. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One splat's shape in tile units, where the tile runs from -1 to 1. */
function shapeFor(tile: number, rand: () => number): Shape {
  const drips = tile >= DRIP_FROM;
  const kind = tile % 4;
  // A stretched splat is drawn smaller so its long axis still fits the cell.
  const radius = kind === 2 ? 0.26 + rand() * 0.04 : drips ? 0.3 + rand() * 0.06 : 0.28 + rand() * 0.1;
  const wobble: Shape["wobble"] = [];
  for (let k = 2; k <= 7; k++) wobble.push([(0.05 + rand() * 0.07) / Math.sqrt(k - 1), k, rand() * Math.PI * 2]);
  const spikes: Shape["spikes"] = [];
  // Kind 0 is a round burst, 1 a star of long spikes, 2 a stretched glancing hit, 3 a broken cluster.
  const count = kind === 1 ? 10 + Math.floor(rand() * 6) : 4 + Math.floor(rand() * 5);
  for (let i = 0; i < count; i++) spikes.push([rand() * Math.PI * 2, radius * (kind === 1 ? 0.4 + rand() * 0.45 : 0.15 + rand() * 0.35), 30 + rand() * 120]);
  const drops: Circle[] = [];
  const dropCount = kind === 3 ? 22 : 10 + Math.floor(rand() * 8);
  for (let i = 0; i < dropCount; i++) {
    const a = rand() * Math.PI * 2;
    const d = radius * (1.15 + rand() * (kind === 3 ? 0.95 : 0.7));
    drops.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: radius * (0.03 + rand() * rand() * 0.22) });
  }
  const runs: Drip[] = [];
  if (drips) {
    const n = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < n; i++) {
      const x = (rand() * 2 - 1) * radius * 0.75;
      const top = Math.sqrt(Math.max(0, radius * radius - x * x)) * 0.7;
      runs.push({ x, top, length: 0.2 + rand() * (0.82 - top - 0.2), width: radius * (0.07 + rand() * 0.08) });
    }
  }
  return { radius, wobble, spikes, stretch: kind === 2 ? 1.5 + rand() * 0.3 : 1, drops, drips: runs };
}

/** Samples round the rim per splat: the rim's radius is looked up by angle, not summed per pixel. */
const RIM_STEPS = 1024;

/** The rim's radius at each angle: the base, its wobble and the spikes. */
function rimTable(s: Shape): Float32Array {
  const table = new Float32Array(RIM_STEPS + 1);
  for (let i = 0; i <= RIM_STEPS; i++) {
    const a = (i / RIM_STEPS) * Math.PI * 2 - Math.PI;
    let r = s.radius;
    for (const [amp, k, phase] of s.wobble) r += s.radius * amp * Math.sin(k * a + phase);
    for (const [angle, length, sharp] of s.spikes) r += length * Math.pow(Math.max(0, Math.cos(a - angle)), sharp);
    table[i] = r;
  }
  return table;
}

/** How far inside the splat body a point is (positive inside), in tile units. */
function bodyDistance(s: Shape, rim: Float32Array, x: number, y: number, margin: number): number {
  const px = x / s.stretch;
  const f = ((Math.atan2(y, px) + Math.PI) / (Math.PI * 2)) * RIM_STEPS;
  const i = Math.floor(f);
  const r = rim[i]! + (rim[Math.min(RIM_STEPS, i + 1)]! - rim[i]!) * (f - i);
  let best = r - Math.hypot(px, y);
  for (const c of s.drops) {
    // Most drops are nowhere near: a cheap box test first.
    if (Math.abs(x - c.x) > c.r + margin || Math.abs(y - c.y) > c.r + margin) continue;
    best = Math.max(best, c.r - Math.hypot(x - c.x, y - c.y));
  }
  return best;
}

/** How far inside a drip a point is, and how far down it that point sits from 0 to 1. */
function dripDistance(s: Shape, x: number, y: number): { inside: number; along: number } {
  let inside = -Infinity;
  let along = 0;
  for (const d of s.drips) {
    // Down is +y in the image. Each drip is a tapering line that ends in a round bead.
    const t = Math.min(1, Math.max(0, (y - d.top) / d.length));
    const w = d.width * (1 - 0.35 * t);
    const line = w - Math.hypot(x - d.x, y - (d.top + t * d.length));
    const bead = d.width * 1.2 - Math.hypot(x - d.x, y - (d.top + d.length));
    const here = Math.max(line, bead);
    if (here > inside) {
      inside = here;
      along = t;
    }
  }
  return { inside, along };
}

/**
 * Draws the atlas: `size` pixels square, RGBA, rows from the top. About
 * a tenth of a second for 1024 pixels, done once per page.
 */
export function drawDecalAtlas(size = 1024, seed = 17): Uint8Array {
  const data = new Uint8Array(size * size * 4);
  const cell = size / ATLAS_GRID;
  const px = 2 / cell;
  const rand = seeded(seed);
  for (let tile = 0; tile < TILE_COUNT; tile++) {
    const s = shapeFor(tile, rand);
    const rim = rimTable(s);
    const ox = (tile % ATLAS_GRID) * cell;
    const oy = Math.floor(tile / ATLAS_GRID) * cell;
    // A fine grain in the paint, so a big splat is never a flat colour.
    const grain = seeded(seed * 31 + tile);
    for (let j = 0; j < cell; j++) {
      const y = ((j + 0.5) / cell) * 2 - 1;
      for (let i = 0; i < cell; i++) {
        const x = ((i + 0.5) / cell) * 2 - 1;
        // Nothing within two pixels of the cell's edge, so mipmaps never bleed between splats.
        const edge = Math.min(i, j, cell - 1 - i, cell - 1 - j);
        const body = bodyDistance(s, rim, x, y, px * 2);
        const drip = s.drips.length ? dripDistance(s, x, y) : { inside: -Infinity, along: 0 };
        const sd = Math.max(body, drip.inside);
        const cover = edge < 2 ? 0 : Math.min(1, Math.max(0, sd / px + 0.5));
        if (cover <= 0) continue;
        // Thick in the middle, thin and a little darker at the rim, like wet paint.
        const depth = Math.min(1, Math.max(0, sd / (s.radius * 0.35)));
        const edgeLight = Math.min(1, sd / (px * 2.5));
        const shade = 0.55 + 0.35 * Math.sqrt(depth) + 0.1 * edgeLight + (grain() - 0.5) * 0.06;
        const o = ((oy + j) * size + ox + i) * 4;
        data[o] = Math.round(Math.min(1, Math.max(0, shade)) * 255);
        data[o + 1] = body >= drip.inside || body > 0 ? 0 : Math.round((0.02 + 0.98 * drip.along) * 255);
        data[o + 2] = 0;
        data[o + 3] = Math.round(cover * 255);
      }
    }
  }
  return data;
}
