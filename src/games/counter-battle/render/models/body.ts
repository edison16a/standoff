import { ball, box, capsule, cyl, lathe, paint, roundBox, shade } from "../geo";
import type { Outfit } from "./outfit";
import type { Rig } from "./rig";

/**
 * The body every fighter shares under their gear: hips, torso, arms,
 * gloved hands, legs and boots, sized by the rig. Each character passes
 * its own colours and cut, then adds its head and gear on top.
 */
export interface BodyStyle {
  top: string;
  /** Side panels and the collar. */
  trim: string;
  /** The upper arm: a sleeve colour, or the skin for bare arms. */
  sleeve: string;
  /** The forearm: sleeve, cuff or skin. */
  forearm: string;
  glove: string;
  pants: string;
  boot: string;
  sole: string;
  skin: string;
  /** Wider, boxier torso for bulky gear. */
  chestWidth: number;
  chestDepth: number;
  /** A loose jersey that hangs over the hips. */
  loose?: boolean;
  /** High laced boots rather than low trainers. */
  highBoots?: boolean;
}

export function buildBody(rig: Rig, o: Outfit, st: BodyStyle): void {
  const z = rig.size;
  const s = z.s;
  const b = z.bulk;

  // Hips: a rounded seat in the trousers.
  o.add(rig.pelvis, "cloth", paint(capsule(0.11 * s, 0.14 * s * b), st.pants, { at: [0, -0.02 * s, 0], rot: [0, 0, Math.PI / 2], scale: [1.05, 1, 1.1] }));
  o.add(rig.pelvis, "gear", paint(cyl(0.155 * s * b, 0.155 * s * b, 0.045 * s, 18), shade(st.pants, -0.45), { at: [0, 0.06 * s, 0], scale: [1, 1, 0.78] }));

  // The belly on the spine, the chest shell on the chest joint.
  const cw = st.chestWidth * b;
  const cd = st.chestDepth;
  o.add(rig.spine, "cloth", paint(cyl(0.16 * s, 0.15 * s, 0.24 * s, 18), st.top, { at: [0, 0.08 * s, 0], scale: [cw, 1, cd * 0.72] }));
  if (st.loose) o.add(rig.spine, "cloth", paint(cyl(0.158 * s, 0.165 * s, 0.13 * s, 18), st.top, { at: [0, -0.05 * s, 0], scale: [cw, 1, cd * 0.78] }));
  const chest = lathe([[0.155, 0], [0.168, 0.08], [0.178, 0.17], [0.172, 0.24], [0.13, 0.29], [0.06, 0.31]].map(([r, y]) => [r! * s, y! * s] as const), 22);
  o.add(rig.chest, "cloth", paint(chest, st.top, { scale: [cw * 1.08, 1, cd * 0.74] }));
  // Side panels down the ribs in the trim colour.
  for (const side of [-1, 1]) o.add(rig.chest, "cloth", paint(box(0.03 * s, 0.24 * s, 0.13 * s * cd), st.trim, { at: [side * 0.178 * s * cw, 0.12 * s, 0] }));
  o.add(rig.neck, "skin", paint(cyl(0.048 * s, 0.056 * s, 0.12 * s, 12), st.skin, { at: [0, 0.03 * s, 0] }));

  const arm = (side: 1 | -1, shoulder: typeof rig.shoulderL, elbow: typeof rig.elbowL, hand: typeof rig.handL) => {
    const r = (0.052 + 0.014 * b) * s;
    o.add(shoulder, "cloth", paint(ball(r * 1.18, 14, 10), st.sleeve, { scale: [1.05, 0.95, 1] }));
    o.add(shoulder, "cloth", paint(capsule(r, z.upperArm * 0.62), st.sleeve, { at: [0, -z.upperArm * 0.5, 0] }));
    o.add(elbow, "cloth", paint(ball(r * 0.92, 12, 8), st.forearm));
    o.add(elbow, st.forearm === st.skin ? "skin" : "cloth", paint(capsule(r * 0.86, z.foreArm * 0.6), st.forearm, { at: [0, -z.foreArm * 0.45, 0], scale: [1, 1, 0.92] }));
    // A glove: the back of the hand, the fingers curled round, the thumb along the side.
    o.add(hand, "gear",
      paint(roundBox(0.078 * s, 0.085 * s, 0.04 * s, 0.015 * s), st.glove, { at: [0, -0.035 * s, 0] }),
      paint(capsule(0.021 * s, 0.038 * s, 8), st.glove, { at: [0, -0.08 * s, 0.016 * s], rot: [0, 0, Math.PI / 2] }),
      paint(capsule(0.014 * s, 0.035 * s, 8), st.glove, { at: [side * 0.035 * s, -0.035 * s, 0.022 * s], rot: [0.5, 0, 0] }),
      paint(cyl(0.036 * s, 0.04 * s, 0.035 * s, 10), shade(st.glove, -0.3), { at: [0, 0.005 * s, 0], scale: [1, 1, 0.7] }),
    );
  };
  arm(1, rig.shoulderL, rig.elbowL, rig.handL);
  arm(-1, rig.shoulderR, rig.elbowR, rig.handR);

  const leg = (hip: typeof rig.hipL, knee: typeof rig.kneeL, ankle: typeof rig.ankleL) => {
    const r = (0.074 + 0.022 * b) * s;
    o.add(hip, "cloth", paint(capsule(r, z.thigh * 0.7), st.pants, { at: [0, -z.thigh * 0.48, 0] }));
    o.add(knee, "cloth", paint(capsule(r * 0.78, z.shin * 0.72), st.pants, { at: [0, -z.shin * 0.45, 0] }));
    const bootH = (st.highBoots ? 0.2 : 0.09) * s;
    o.add(knee, "gear", paint(cyl(r * 0.8, r * 0.72, bootH, 12), st.boot, { at: [0, -z.shin + bootH / 2 - 0.02 * s, 0] }));
    // The foot runs forward from the ankle, with a thick sole and a toe cap.
    o.add(ankle, "gear",
      paint(roundBox(0.1 * s, 0.085 * s, 0.25 * s, 0.035 * s), st.boot, { at: [0, -0.02 * s, 0.05 * s] }),
      paint(roundBox(0.105 * s, 0.028 * s, 0.27 * s, 0.012 * s), st.sole, { at: [0, -z.ankle + 0.014 * s, 0.05 * s] }),
      paint(ball(0.05 * s, 10, 8), st.boot, { at: [0, -0.02 * s, 0.14 * s], scale: [1, 0.8, 1] }),
    );
  };
  leg(rig.hipL, rig.kneeL, rig.ankleL);
  leg(rig.hipR, rig.kneeR, rig.ankleR);
}

/** A kneepad strapped over the knee, as padded or plated as the character wants. */
export function kneePads(rig: Rig, o: Outfit, colour: string): void {
  const s = rig.size.s;
  for (const knee of [rig.kneeL, rig.kneeR]) {
    o.add(knee, "gear", paint(roundBox(0.1 * s, 0.13 * s, 0.05 * s, 0.03 * s), colour, { at: [0, -0.03 * s, 0.075 * s] }));
  }
}

/** Elbow pads on both forearms. */
export function elbowPads(rig: Rig, o: Outfit, colour: string): void {
  const s = rig.size.s;
  for (const elbow of [rig.elbowL, rig.elbowR]) {
    o.add(elbow, "gear", paint(roundBox(0.08 * s, 0.09 * s, 0.04 * s, 0.02 * s), colour, { at: [0, -0.02 * s, -0.055 * s] }));
  }
}
