import { JOINTS, neutral, over, type Joint, type Pose } from "../pose";

/**
 * The body shapes tackles are built from. Every preset is authored for
 * a tackler on the carrier's left; `mirror` flips one for the right.
 * A body lying along its facing is pitched a quarter turn forward and
 * barrel rolled: barrel 0 is face down, PI/2 on the right side, PI on
 * the back with the head still the way he was going.
 */
export const BASE = neutral();
export const QUARTER = Math.PI / 2;

/** Face down, arms out ahead to take the fall. */
export const PRONE = over(BASE, {
  pitch: 1.52, neckX: -0.7,
  shLX: -2.7, shRX: -2.5, elL: -0.4, elR: -0.6, shLZ: 0.45, shRZ: 0.5,
  hipLX: 0.05, hipRX: 0.1, kneeL: 0.3, kneeR: 0.5, hipLZ: 0.1, hipRZ: 0.15,
});

/** On the back with the head the way he was going, knees up, arms loose at the sides. */
export const ROLLED_BACK = over(BASE, {
  pitch: 1.52, barrel: Math.PI, neckX: -0.5,
  shLX: -0.4, shRX: -0.3, shLZ: 0.7, shRZ: 0.8, elL: -0.7, elR: -0.5,
  hipLX: -0.7, hipRX: -0.3, kneeL: 1.2, kneeR: 0.6, hipLZ: 0.12, hipRZ: 0.1,
});

/** Flat on the back with the head where he came from, knocked back by a hit. */
export const SUPINE = over(BASE, {
  pitch: -1.5, neckX: 0.5,
  shLX: 0.4, shRX: 0.6, shLZ: 0.8, shRZ: 0.9, elL: -0.6, elR: -0.4,
  hipLX: -0.5, hipRX: -0.2, kneeL: 1.0, kneeR: 0.5, hipLZ: 0.1, hipRZ: 0.12,
});

/** Lying on the right side, curled a little, the top arm over. */
export const ON_SIDE = over(BASE, {
  pitch: 1.5, barrel: QUARTER, neckX: -0.4, spineX: 0.15,
  shLX: -1.4, shRX: -2.2, elL: -1.0, elR: -0.5, shLZ: 0.3, shRZ: 0.5,
  hipLX: -0.5, hipRX: -0.2, kneeL: 0.9, kneeR: 0.6,
});

/** Sat down hard on the turf, hands behind on the grass. */
export const SEATED = over(BASE, {
  pitch: -0.35, spineX: 0.25, neckX: 0.1,
  hipLX: -1.25, hipRX: -1.1, kneeL: 0.9, kneeR: 0.6, hipLZ: 0.25, hipRZ: 0.3,
  shLX: 0.7, shRX: 0.7, elL: -0.15, elR: -0.15, shLZ: 0.45, shRZ: 0.45,
});

/** Up on one knee, a hand on the turf, about to stand. */
export const KNEEL = over(BASE, {
  pitch: 0.55, neckX: -0.5, spineX: 0.2,
  shLX: -1.0, shRX: -0.3, elL: -0.2, elR: -0.9,
  hipLX: -1.6, kneeL: 1.4, hipRX: -0.4, kneeR: 2.1, hipLZ: 0.15, hipRZ: 0.1,
});

/** Pushed up off the turf on both hands, chest up, one knee coming through. */
export const PUSH_UP = over(BASE, {
  pitch: 1.05, neckX: -0.8, spineX: -0.15,
  shLX: -1.15, shRX: -1.15, elL: -0.05, elR: -0.05, shLZ: 0.3, shRZ: 0.3,
  hipLX: -0.9, kneeL: 1.9, hipRX: 0.2, kneeR: 1.2,
});

/** Arms locked round a man in front: shoulders forward, elbows bent, hands crossing behind him. */
export const WRAP_ARMS: Partial<Pose> = { shLX: -1.55, shRX: -1.55, shLY: 0.75, shRY: 0.75, elL: -1.35, elR: -1.35, shLZ: 0.35, shRZ: 0.35 };

/** Arms flung wide for balance. */
export const FLAIL: Partial<Pose> = { shLX: -0.9, shRX: -1.2, shLZ: 1.2, shRZ: 1.0, elL: -0.5, elR: -0.7 };

/** The ball carried high and tight under the right arm, as it stays through a fall. */
export const TUCKED: Partial<Pose> = { shRX: -0.35, elR: -2.0, shRY: 0.5, shRZ: 0.1 };

const PAIRS: [Joint, Joint][] = [
  ["shLX", "shRX"], ["shLY", "shRY"], ["shLZ", "shRZ"], ["elL", "elR"],
  ["hipLX", "hipRX"], ["hipLZ", "hipRZ"], ["kneeL", "kneeR"], ["ankL", "ankR"],
];
const FLIP = new Set<Joint>(["side", "roll", "yaw", "barrel", "pelvisY", "pelvisZ", "spineY", "spineZ", "neckY"]);

/** The same pose seen in a mirror: left and right swapped, every turn to the side reversed. */
export function mirror(p: Pose): Pose {
  const out = {} as Pose;
  for (const j of JOINTS) out[j] = FLIP.has(j) ? -p[j] : p[j];
  for (const [l, r] of PAIRS) {
    out[l] = p[r];
    out[r] = p[l];
  }
  return out;
}

/** Mirrors a pose authored for the left when the man came from the right. */
export const sided = (p: Pose, side: 1 | -1): Pose => (side > 0 ? p : mirror(p));

/** Legs still driving through contact: short, hard strides on top of a pose until `until` seconds. */
export function churn(p: Pose, t: number, until: number): Pose {
  if (t >= until) return p;
  const k = Math.min(1, (until - t) / 0.12);
  const s = Math.sin(t * 21) * k;
  return over(p, { hipLX: p.hipLX + s * 0.45, hipRX: p.hipRX - s * 0.45, kneeL: p.kneeL + Math.max(0, s) * 0.5, kneeR: p.kneeR + Math.max(0, -s) * 0.5 });
}

/** A change to a pose seen in a mirror, for leans and lurches added on top of another pose. */
export function mirrorDelta(d: Partial<Pose>): Partial<Pose> {
  const out: Partial<Pose> = {};
  const other = new Map<Joint, Joint>();
  for (const [l, r] of PAIRS) {
    other.set(l, r);
    other.set(r, l);
  }
  for (const [k, v] of Object.entries(d) as [Joint, number][]) out[other.get(k) ?? k] = FLIP.has(k) ? -v : v;
  return out;
}
