import * as THREE from "three";
import type { HairStyle, Look } from "../../../looks";
import { groom, join, roughen } from "../parts";
import { aboveLine, azimuth, crown } from "./hairline";
import { hairExtras } from "./hair-extras";
import type { HeadSurface } from "./sculpt";
import { noise3, shell } from "./shell";

/**
 * Every player's hair as a shell grown off the sculpted scalp: its
 * thickness over the head is the cut (a fade short at the sides, a quiff
 * on top, a parting), and its colour carries the grain of the strands,
 * fading into the skin at a faded edge. Twists, a bun and tufts are
 * added on top (hair-extras.ts). The silhouette is what you know a
 * player by from the stands, so each style keeps its own.
 */

interface Cut {
  /** Thickness in metres at a spot that has hair. */
  thick(b: THREE.Vector3, d: THREE.Vector3): number;
  /** How far the colour fades toward the skin there, 0 none to 1 bare. */
  fade(b: THREE.Vector3, d: THREE.Vector3): number;
  /** Lowers the hairline at the front, for a fringe. */
  fringe?: number;
  /** The grain: which way the strands run, as a scale on x, y and z of the streak noise. */
  grain: readonly [number, number, number];
  rough: number;
}

const bell = (x: number, c: number, w: number) => Math.exp(-(((x - c) / w) ** 2));
const bumps = (b: THREE.Vector3, f: number) => Math.abs(noise3(b.x * f, b.y * f, b.z * f));
const sides = (b: THREE.Vector3, d: THREE.Vector3) => 1 - crown(b, d);

const CUTS: Record<HairStyle, Cut> = {
  buzz: { thick: () => 0.0022, fade: () => 0.22, grain: [900, 900, 900], rough: 0.8 },
  slick: {
    // Faded short at the sides, volume combed up and back on top, lifted at the front.
    thick: (b, d) => 0.003 + crown(b, d) * (0.008 + 0.009 * bell(azimuth(d), 0, 0.45) * Math.max(0, d.z)),
    fade: (b, d) => 0.45 * sides(b, d),
    grain: [700, 80, 60],
    rough: 0.45,
  },
  swept: {
    // Short, a fringe brushed across the forehead to one side.
    thick: (b, d) => 0.005 + 0.005 * crown(b, d) + 0.005 * bell(b.y, 0.07, 0.02) * Math.max(0, d.z) * (0.6 + 0.4 * d.x),
    fade: (b, d) => 0.1 * sides(b, d),
    fringe: 0.012,
    grain: [60, 600, 120],
    rough: 0.5,
  },
  parted: {
    // Combed over from a side parting on the player's left.
    thick: (b, d) => (0.006 + 0.005 * crown(b, d)) * (1 - 0.7 * bell(b.x, 0.026, 0.004) * crown(b, d)),
    fade: () => 0.05,
    grain: [500, 120, 60],
    rough: 0.5,
  },
  messy: { thick: (b) => 0.008 + 0.01 * bumps(b, 90), fade: () => 0.04, fringe: 0.01, grain: [300, 300, 300], rough: 0.6 },
  curlytop: {
    // Short faded sides, a tight crop of curls on top.
    thick: (b, d) => 0.0025 + crown(b, d) * (0.016 + 0.008 * bumps(b, 260)),
    fade: (b, d) => 0.55 * sides(b, d),
    grain: [1400, 1400, 1400],
    rough: 0.8,
  },
  curls: { thick: (b) => 0.016 + 0.009 * bumps(b, 220), fade: () => 0.03, grain: [1400, 1400, 1400], rough: 0.8 },
  afro: { thick: (b) => 0.046 + 0.006 * bumps(b, 160), fade: () => 0.02, grain: [1600, 1600, 1600], rough: 0.85 },
  twists: { thick: () => 0.006, fade: () => 0.05, grain: [900, 900, 900], rough: 0.7 },
  bun: {
    // Pulled back tight to the bun on the crown.
    thick: (b) => 0.006 + 0.003 * Math.max(0, -b.z / 0.1),
    fade: () => 0.04,
    grain: [600, 40, 40],
    rough: 0.45,
  },
};

/** The hair, beard aside, as one piece for the gear material, in the head's frame at scale `k`. */
export function hairGeometry(look: Look, head: HeadSurface, k: number, fine: boolean): THREE.BufferGeometry | null {
  const cut = CUTS[look.hairStyle];
  const hair = new THREE.Color(look.hair);
  const skin = new THREE.Color(look.skin);
  // A faded edge shows the scalp through it: a darker, cooler skin rather than the skin itself.
  const scalp = skin.clone().multiplyScalar(0.62).lerp(hair, 0.35);
  const [gx, gy, gz] = cut.grain;
  const geo = shell(
    head,
    (b, d) => {
      const above = aboveLine(b, d, cut.fringe ?? 0);
      if (above <= 0) return 0;
      // The edge thins to nothing, so a fade blends instead of stepping.
      // The crop thins to nothing at its edge, over the scalp painted its colour, so no step shows.
      const t = cut.thick(b, d);
      const u = Math.min(1, above / (0.008 + 0.9 * t));
      return Math.max(0.0004, t * u * u * (3 - 2 * u)) * k;
    },
    (b, d, out) => {
      const streak = noise3(b.x * gx, b.y * gy, b.z * gz) * 0.5 + 0.5;
      out.copy(hair).multiplyScalar(0.78 + 0.44 * streak);
      const edge = 1 - Math.min(1, aboveLine(b, d, cut.fringe ?? 0) / 0.01);
      out.lerp(scalp, Math.min(0.9, cut.fade(b, d) + edge * 0.45));
    },
    false,
  );
  // The strands are drawn finer than the vertices, in the head's own units scaled to the body's.
  const parts = geo ? [groom(roughen(geo, cut.rough), [gx / k, gy / k, gz / k])] : [];
  parts.push(...hairExtras(look, k, fine));
  return parts.length ? join(parts) : null;
}
