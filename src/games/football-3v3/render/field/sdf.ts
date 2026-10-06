const INF = 1e20;

/**
 * Squared distance to the nearest set cell along one line (Felzenszwalb
 * and Huttenlocher's lower envelope of parabolas), in place over `f`
 * from `offset` every `stride` for `n` cells. `v`, `z` and `d` are
 * scratch arrays at least n + 1 long.
 */
function line(f: Float64Array, offset: number, stride: number, n: number, v: Int32Array, z: Float64Array, d: Float64Array): void {
  let k = 0;
  v[0] = 0;
  z[0] = -INF;
  z[1] = INF;
  for (let q = 1; q < n; q++) {
    const fq = f[offset + q * stride]!;
    let s: number;
    do {
      const r = v[k]!;
      s = (fq - f[offset + r * stride]! + q * q - r * r) / (2 * q - 2 * r);
    } while (s <= z[k]! && --k > -1);
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INF;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1]! < q) k++;
    const r = v[k]!;
    d[q] = (q - r) * (q - r) + f[offset + r * stride]!;
  }
  for (let q = 0; q < n; q++) f[offset + q * stride] = d[q]!;
}

/** Exact squared distances to the nearest set cell in a width by height grid, in place. */
function transform(grid: Float64Array, width: number, height: number): void {
  const n = Math.max(width, height) + 1;
  const v = new Int32Array(n);
  const z = new Float64Array(n + 1);
  const d = new Float64Array(n);
  for (let x = 0; x < width; x++) line(grid, x, width, height, v, z, d);
  for (let y = 0; y < height; y++) line(grid, y * width, 1, width, v, z, d);
}

/**
 * The signed distance field of a coverage mask (0 to 255, like a canvas's
 * alpha): for every cell, how many cells it is from the shape's edge,
 * negative inside. An antialiased edge cell puts the edge part of the
 * way across it, so curves come out smooth rather than in steps.
 */
export function signedDistance(mask: ArrayLike<number>, width: number, height: number): Float32Array {
  const size = width * height;
  const outside = new Float64Array(size);
  const inside = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    const a = mask[i]! / 255;
    // Fully in or out cells seed one field; an edge cell seeds both by how far into it the edge sits.
    outside[i] = a >= 1 ? 0 : a <= 0 ? INF : Math.max(0, 0.5 - a) ** 2;
    inside[i] = a <= 0 ? 0 : a >= 1 ? INF : Math.max(0, a - 0.5) ** 2;
  }
  transform(outside, width, height);
  transform(inside, width, height);
  const out = new Float32Array(size);
  for (let i = 0; i < size; i++) out[i] = Math.sqrt(outside[i]!) - Math.sqrt(inside[i]!);
  return out;
}

/** Packs signed distances into bytes, 128 on the edge, `spread` cells either side reaching 0 and 255. */
export function packDistance(sd: Float32Array, spread: number): Uint8Array {
  const out = new Uint8Array(sd.length);
  for (let i = 0; i < sd.length; i++) out[i] = Math.max(0, Math.min(255, Math.round(128 - (sd[i]! / spread) * 127)));
  return out;
}
