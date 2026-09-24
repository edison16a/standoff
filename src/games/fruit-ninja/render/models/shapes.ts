import type { BufferGeometry } from "three";
import type { RevolveShape } from "./revolve";

/**
 * The silhouette of every fruit, as a shape turned around the y axis.
 * Most start from an ellipse and add what makes the fruit itself: an
 * apple's dimples, a lemon's nubs, a plum's crease, a star fruit's points.
 * Sizes are in model units, about one unit across the middle.
 */

const PI = Math.PI;

/** Angle difference folded into -PI..PI, for creases placed at one angle. */
function around(phi: number, at: number): number {
  return Math.atan2(Math.sin(phi - at), Math.cos(phi - at));
}

export function ellipsoid(rx: number, ry: number, rings = 40, segments = 48): RevolveShape {
  return { y: (t) => -ry * Math.cos(PI * t), r: (t) => rx * Math.sin(PI * t), rings, segments };
}

export const APPLE: RevolveShape = {
  y: (t) => {
    const th = PI * t;
    return -0.86 * Math.cos(th) + 0.22 * Math.exp(-((th / 0.42) ** 2)) - 0.3 * Math.exp(-(((PI - th) / 0.45) ** 2));
  },
  r: (t, phi) => {
    const th = PI * t;
    // A little wider at the shoulders, with five soft lobes at the base.
    return Math.sin(th) * (0.95 + 0.09 * t) * (1 + 0.03 * Math.cos(5 * phi) * (1 - t));
  },
};

export const ORANGE: RevolveShape = { y: (t) => -0.94 * Math.cos(PI * t), r: (t) => Math.sin(PI * t) };

export const LEMON: RevolveShape = {
  y: (t) => {
    const c = Math.cos(PI * t);
    return -c * (0.98 + 0.28 * Math.abs(c) ** 14);
  },
  r: (t) => 0.8 * Math.sin(PI * t) ** 0.9,
};

export const LIME: RevolveShape = {
  y: (t) => {
    const c = Math.cos(PI * t);
    return -c * (0.9 + 0.1 * Math.abs(c) ** 16);
  },
  r: (t) => 0.92 * Math.sin(PI * t),
};

export const WATERMELON = ellipsoid(1, 1.14, 48, 64);
export const GIANT_MELON = ellipsoid(1, 1.3, 48, 64);

export const KIWI: RevolveShape = {
  y: (t) => -1 * Math.cos(PI * t),
  r: (t) => 0.82 * Math.sin(PI * t) * (1 + 0.06 * (t - 0.5)),
};

export const COCONUT: RevolveShape = {
  y: (t) => -1.05 * Math.cos(PI * t),
  r: (t, phi) => Math.sin(PI * t) * (1 + 0.04 * Math.cos(3 * phi) * Math.sin(PI * t)),
};

/** Plum and peach: round with a crease down one side and a small point at the tip. */
export function creased(height: number, depth: number): RevolveShape {
  return {
    y: (t) => -height * Math.cos(PI * t) - 0.05 * Math.exp(-((((1 - t) * PI) / 0.3) ** 2)),
    r: (t, phi) => Math.sin(PI * t) * (1 - depth * Math.exp(-((around(phi, PI / 2) / 0.22) ** 2)) * Math.sin(PI * t)),
  };
}

export const STRAWBERRY: RevolveShape = {
  y: (t) => {
    if (t < 0.7) return -1 + (t / 0.7) * 1.35;
    const s = (t - 0.7) / 0.3;
    return 0.35 + 0.26 * Math.sin((s * PI) / 2) - 0.08 * Math.exp(-(((1 - t) / 0.08) ** 2));
  },
  r: (t) => {
    if (t < 0.7) return 0.9 * Math.sin((PI / 2) * (t / 0.7)) ** 0.85;
    const s = (t - 0.7) / 0.3;
    return 0.9 * Math.sqrt(Math.max(0, 1 - s * s));
  },
};

export const BANANA_LENGTH = 2.7;
const BANANA_BEND = 2.2;

export const BANANA: RevolveShape = {
  y: (t) => (t - 0.5) * BANANA_LENGTH,
  r: (t, phi) => 0.34 * Math.sin(PI * t) ** 0.55 * (1 + 0.05 * Math.cos(5 * phi)),
  rings: 48,
  segments: 40,
};

/** Curves the straight banana into an arc and centres it. */
export function bendBanana(geo: BufferGeometry): void {
  const pos = geo.getAttribute("position");
  const shift = (BANANA_BEND * (1 - Math.cos(BANANA_LENGTH / 2 / BANANA_BEND))) / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const a = pos.getY(i) / BANANA_BEND;
    pos.setXY(i, BANANA_BEND - (BANANA_BEND - x) * Math.cos(a) - shift, (BANANA_BEND - x) * Math.sin(a));
  }
  pos.needsUpdate = true;
}

export const PINEAPPLE: RevolveShape = {
  y: (t) => -1 * Math.cos(PI * t),
  r: (t) => 0.74 * Math.sin(PI * t) ** 0.6,
};

export const POMEGRANATE: RevolveShape = {
  y: (t) => -0.94 * Math.cos(PI * t) + 0.06 * Math.exp(-((t / 0.12) ** 2)),
  r: (t, phi) => Math.sin(PI * t) * (1 + 0.035 * Math.cos(6 * phi) * Math.sin(PI * t)),
};

export const DRAGONFRUIT: RevolveShape = {
  y: (t) => -1 * Math.cos(PI * t),
  r: (t) => 0.78 * Math.sin(PI * t) ** 0.85,
};

/** The star fruit's cross section, from 0 (middle) to 1 (tip of a point). */
export function starOutline(phi: number): number {
  return 0.46 + 0.54 * Math.pow(0.5 + 0.5 * Math.cos(5 * phi), 1.6);
}

export const STAR_FRUIT: RevolveShape = {
  y: (t) => (t - 0.5) * 2.3,
  r: (t, phi) => 0.62 * Math.sin(PI * t) ** 0.4 * starOutline(phi),
  rings: 32,
  segments: 80,
};
