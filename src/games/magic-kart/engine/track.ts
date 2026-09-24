import type { TrackDef } from "../tracks/types";
import { sampleClosedCurve } from "./spline";

/** Metres between centre line samples. */
export const SAMPLE_SPACING = 1;
/** Width of the striped kerb on each side of the tarmac. */
export const KERB_WIDTH = 1.4;
/** How far along the road a local search looks either way, in samples. */
const SEARCH_WINDOW = 24;

export interface TrackPoint {
  x: number;
  y: number;
  z: number;
  /** Unit tangent along the direction of travel. */
  tx: number;
  tz: number;
  /** Unit vector to the right of travel. */
  rx: number;
  rz: number;
  /** Signed bend in radians per metre, right turns positive. */
  bend: number;
}

export interface Located {
  index: number;
  /** Distance along the lap from the finish line. */
  s: number;
  /** Sideways offset from the centre line, right positive. */
  d: number;
}

interface Span {
  start: number;
  end: number;
}

/**
 * The driving surface of one map. Everything the engine asks about the
 * track goes through here: where a point is along the lap, how high the
 * ground is, and whether there is a barrier or a drop at the edge.
 */
export class Track {
  readonly points: TrackPoint[];
  readonly length: number;
  readonly halfWidth: number;
  /** Offset from the centre line to the barrier, or to the drop. */
  readonly edge: number;
  readonly ramps: (Span & { height: number })[];
  readonly gaps: Span[];
  private readonly open: (Span & { side: number })[];

  constructor(readonly def: TrackDef) {
    const raw = sampleClosedCurve(def.points.map(([x, z, y]) => ({ x, z, y: y ?? 0 })), SAMPLE_SPACING);
    this.length = raw.length * SAMPLE_SPACING;
    const n = raw.length;
    const tangents = raw.map((_, i) => {
      const a = raw[(i - 1 + n) % n]!;
      const b = raw[(i + 1) % n]!;
      const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return { tx: (b.x - a.x) / len, tz: (b.z - a.z) / len };
    });
    this.points = raw.map((p, i) => {
      const { tx, tz } = tangents[i]!;
      const prev = tangents[(i - 2 + n) % n]!;
      const next = tangents[(i + 2) % n]!;
      const bend = (prev.tx * next.tz - prev.tz * next.tx) / (4 * SAMPLE_SPACING);
      return { x: p.x, y: p.y, z: p.z, tx, tz, rx: -tz, rz: tx, bend };
    });
    this.halfWidth = def.width / 2;
    this.edge = this.halfWidth + KERB_WIDTH + def.shoulder;
    const at = (fraction: number) => this.wrap(fraction * this.length);
    this.ramps = def.ramps.map((r) => ({ start: at(r.at) - r.length, end: at(r.at), height: r.height }));
    this.gaps = def.gaps.map((g) => ({ start: at(g.at), end: at(g.at) + g.length }));
    this.open = def.openEdges.map((o) => ({ start: at(o.from), end: at(o.to), side: o.side === "left" ? -1 : o.side === "right" ? 1 : 0 }));
  }

  wrap(s: number): number {
    return ((s % this.length) + this.length) % this.length;
  }

  /** Signed distance travelled going from `from` to `to`, the short way round. */
  forward(from: number, to: number): number {
    const d = this.wrap(to - from);
    return d > this.length / 2 ? d - this.length : d;
  }

  indexAt(s: number): number {
    return Math.floor(this.wrap(s) / SAMPLE_SPACING) % this.points.length;
  }

  /** Where x, z sits on the lap. A hint of -1 searches the whole track. */
  locate(x: number, z: number, hint: number): Located {
    const n = this.points.length;
    const from = hint < 0 ? 0 : hint - SEARCH_WINDOW;
    const to = hint < 0 ? n : hint + SEARCH_WINDOW;
    let best = { dist: Infinity, index: 0, t: 0, d: 0 };
    for (let k = from; k < to; k++) {
      const i = ((k % n) + n) % n;
      const a = this.points[i]!;
      const b = this.points[(i + 1) % n]!;
      const sx = b.x - a.x;
      const sz = b.z - a.z;
      const len2 = sx * sx + sz * sz || 1;
      const t = Math.max(0, Math.min(1, ((x - a.x) * sx + (z - a.z) * sz) / len2));
      const px = a.x + sx * t;
      const pz = a.z + sz * t;
      const dist = (x - px) ** 2 + (z - pz) ** 2;
      if (dist < best.dist) {
        const len = Math.sqrt(len2);
        best = { dist, index: i, t, d: ((x - a.x) * -sz + (z - a.z) * sx) / len };
      }
    }
    return { index: best.index, s: this.wrap((best.index + best.t) * SAMPLE_SPACING), d: best.d };
  }

  /** The centre line frame at s, blended between samples. */
  frameAt(s: number): TrackPoint {
    const w = this.wrap(s) / SAMPLE_SPACING;
    const i = Math.floor(w) % this.points.length;
    const f = w - Math.floor(w);
    const a = this.points[i]!;
    const b = this.points[(i + 1) % this.points.length]!;
    const lerp = (u: number, v: number) => u + (v - u) * f;
    const tx = lerp(a.tx, b.tx);
    const tz = lerp(a.tz, b.tz);
    const len = Math.hypot(tx, tz) || 1;
    return { x: lerp(a.x, b.x), y: lerp(a.y, b.y), z: lerp(a.z, b.z), tx: tx / len, tz: tz / len, rx: -tz / len, rz: tx / len, bend: lerp(a.bend, b.bend) };
  }

  /** World position of a point on the lap, with the ground height under it. */
  pointAt(s: number, d: number): { x: number; y: number; z: number } {
    const f = this.frameAt(s);
    return { x: f.x + f.rx * d, y: f.y + this.rampHeight(s), z: f.z + f.rz * d };
  }

  rampHeight(s: number): number {
    for (const ramp of this.ramps) {
      const into = this.wrap(s - ramp.start);
      const length = ramp.end - ramp.start;
      if (into <= length) return ramp.height * Math.pow(into / length, 1.4);
    }
    return 0;
  }

  inGap(s: number): boolean {
    return this.gaps.some((gap) => this.wrap(s - gap.start) <= gap.end - gap.start);
  }

  /**
   * True where the edge has a barrier. Elsewhere it is a drop. `side` is
   * 1 for the right edge, -1 for the left, 0 for either.
   */
  hasWall(s: number, side = 0): boolean {
    return !this.open.some(
      (span) => (side === 0 || span.side === 0 || span.side === side) && this.wrap(s - span.start) <= this.wrap(span.end - span.start),
    );
  }

  /** Ground height at a point on the lap, or null where there is nothing to stand on. */
  groundAt(s: number, d: number): number | null {
    // Past the edge there is only ground behind a barrier. The open side is a drop.
    if (Math.abs(d) > this.edge + 0.5 && !this.hasWall(s, Math.sign(d))) return null;
    if (this.inGap(s)) return null;
    return this.frameAt(s).y + this.rampHeight(s);
  }

  /** The sharpest bend in the next stretch of road, for the computer drivers. */
  sharpestAhead(s: number, distance: number): number {
    let sharpest = 0;
    for (let k = 0; k < distance; k += 3) {
      const bend = this.points[this.indexAt(s + k)]!.bend;
      if (Math.abs(bend) > Math.abs(sharpest)) sharpest = bend;
    }
    return sharpest;
  }
}
