import type * as THREE from "three";
import type { BodyCtx } from "./context";
import { ATLAS, toAtlas } from "./kit-layout";
import { bell, occlude, ramp, tint, type Influence, type PartList } from "./parts";
import { tube, type Key } from "./profile";
import type { BoneName } from "./rig";

/**
 * The legs: thighs and knees in one smooth piece bending at the knee,
 * and the socks pulled up over the shin pads, the pad a flat plate down
 * the front, the calf swelling behind, gathered at the ankle into the
 * boot.
 */

type Row = readonly [dy: number, outer: number, inner: number, front: number, back: number, power?: number];

/** The thigh and knee, down from the hip joint. */
const THIGH: readonly Row[] = [
  [0.03, 0.084, 0.07, 0.086, 0.092],
  [-0.08, 0.083, 0.072, 0.087, 0.082],
  [-0.2, 0.074, 0.065, 0.078, 0.07],
  [-0.31, 0.06, 0.06, 0.064, 0.058],
  [-0.39, 0.051, 0.05, 0.054, 0.05],
  [-0.44, 0.049, 0.047, 0.056, 0.047],
  [-0.48, 0.048, 0.046, 0.05, 0.05],
  [-0.53, 0.047, 0.045, 0.047, 0.056],
];

/** The sock, down from the knee joint: the rolled top, the pad and calf, the ankle. */
const SOCK: readonly Row[] = [
  [-0.025, 0.055, 0.053, 0.056, 0.059],
  [-0.06, 0.052, 0.05, 0.054, 0.063],
  [-0.13, 0.054, 0.05, 0.06, 0.071, 2.3],
  [-0.21, 0.049, 0.046, 0.059, 0.062, 2.3],
  [-0.29, 0.04, 0.038, 0.051, 0.048, 2.2],
  [-0.35, 0.033, 0.032, 0.036, 0.036],
  [-0.4, 0.033, 0.032, 0.036, 0.035],
  [-0.45, 0.036, 0.035, 0.042, 0.04],
];

function keys(rows: readonly Row[], top: number, x: number, side: 1 | -1, s: number, bulk: number): Key[] {
  return rows.map(([dy, outer, inner, f, b, power]) => ({
    y: top + dy * s,
    l: (side > 0 ? outer : inner) * s * bulk,
    r: (side > 0 ? inner : outer) * s * bulk,
    f: f * s * bulk,
    b: b * s * bulk,
    power,
    x,
  }));
}

const bones = (side: 1 | -1) =>
  (side > 0 ? { hip: "hipL", knee: "kneeL", ankle: "ankleL" } : { hip: "hipR", knee: "kneeR", ankle: "ankleR" }) satisfies Record<string, BoneName>;

/** Hips at the top of the thigh, the thigh to the knee, the shin below, each blended across its joint. */
function legWeights(c: BodyCtx, side: 1 | -1): (p: THREE.Vector3) => Influence {
  const { hip, knee, ankle } = bones(side);
  const hipY = c.rest.hipL.y;
  const kneeY = c.rest.kneeL.y;
  const ankleY = c.rest.ankleL.y;
  const s = c.d.s;
  return (p) => {
    const pelvis = 0.45 * ramp(hipY - 0.05 * s, hipY + 0.04 * s, p.y);
    const shin = ramp(kneeY + 0.045 * s, kneeY - 0.045 * s, p.y);
    const foot = ramp(ankleY + 0.04 * s, ankleY - 0.01 * s, p.y);
    return [["hips", pelvis], [hip, (1 - pelvis) * (1 - shin)], [knee, shin * (1 - foot)], [ankle, foot]];
  };
}

export function addLegs(skin: PartList, kit: PartList, c: BodyCtx, tone: string): void {
  const { s, b, hipW } = c.d;
  const hipY = c.rest.hipL.y;
  const kneeY = c.rest.kneeL.y;
  for (const side of [1, -1] as const) {
    const x = side * hipW;
    // Seams down the inside of each leg.
    const a0 = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    const thigh = tube(keys(THIGH, hipY, x, side, s, 0.88 + 0.26 * b), { n: c.nSmall + 6, step: c.step, a0 });
    // Shade just under the shorts' hem and behind the knee.
    occlude(tint(thigh, tone), (p) => 0.3 * ramp(0.58 * s, 0.62 * s, p.y) + 0.18 * bell(p.y, kneeY, 0.04 * s) * ramp(0, -0.04 * s, p.z));
    skin.weighted(thigh, legWeights(c, side));
    const sockRows = keys(SOCK, kneeY, x, side, s, 0.9 + 0.2 * b);
    const sock = tube(sockRows, { n: c.nSmall + 6, step: c.step, a0: Math.PI });
    const top = sockRows[0]!.y;
    const bottom = sockRows[sockRows.length - 1]!.y;
    toAtlas(sock, ATLAS.socks, (p) => (p.y - bottom) / (top - bottom));
    occlude(tint(sock, "#ffffff"), (p) => 0.25 * ramp(bottom + 0.06 * s, bottom + 0.02 * s, p.y));
    kit.weighted(sock, legWeights(c, side));
  }
}
