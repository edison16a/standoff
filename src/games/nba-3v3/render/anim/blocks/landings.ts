import type { BlockPreset } from "../../../engine/blocks/presets";
import { blend, mirrorPatch, type Pose, type PosePatch } from "../pose";

/**
 * How each block preset comes back down, played over the first moments
 * on the floor (written for the right hand, mirrored for the left). The
 * legs give with the landing and the upper body tells the story: a
 * flex after the rejection, the eyes following a swat into the seats,
 * the stumble on out of a chase down, the turn back to the rim after a
 * closeout. The thighs are left to the run underneath, so a man landing
 * on the move keeps his stride and his feet do not slide.
 */
const LAND: Record<BlockPreset, { hold: number; patch: PosePatch }> = {
  rejection: { hold: 0.55, patch: { hipY: -0.16, kneeL: 1.0, kneeR: 1.0, torsoX: 0.18, neckX: 0.05, armLRaise: 0.9, armRRaise: 0.9, armLSpread: 1.0, armRSpread: 1.0, elbowL: 1.7, elbowR: 1.7, wristL: 0.4, wristR: 0.4 } },
  swat: { hold: 0.5, patch: { hipY: -0.12, kneeL: 0.8, kneeR: 0.8, torsoX: 0.12, torsoY: 0.35, neckY: 0.55, neckX: -0.1, armRRaise: 1.2, armRSpread: 0.5, elbowR: 0.2, armLRaise: 0.5, armLSpread: 0.6 } },
  chase: { hold: 0.45, patch: { hipY: -0.1, kneeL: 0.9, kneeR: 0.6, torsoX: 0.42, neckX: 0.1, armRRaise: 0.9, elbowR: 0.6, armLRaise: 0.7, armLSpread: 0.8, elbowL: 0.5 } },
  help: { hold: 0.45, patch: { hipY: -0.13, kneeL: 0.95, kneeR: 0.7, torsoX: 0.2, torsoZ: 0.12, neckY: 0.3, armLRaise: 1.0, armRRaise: 0.8, armLSpread: 0.7, armRSpread: 0.3, elbowL: 0.5, elbowR: 0.5 } },
  pin: { hold: 0.5, patch: { hipY: -0.15, kneeL: 1.0, kneeR: 1.0, torsoX: 0.15, neckX: -0.3, armRRaise: 1.6, elbowR: 0.5, armLRaise: 0.6, armLSpread: 0.5 } },
  tip: { hold: 0.4, patch: { hipY: -0.1, kneeL: 0.75, kneeR: 0.75, torsoX: 0.12, torsoY: 0.2, neckY: 0.35, neckX: -0.15, armRRaise: 1.3, elbowR: 0.4 } },
  miss: { hold: 0.45, patch: { hipY: -0.11, kneeL: 0.8, kneeR: 0.8, torsoX: 0.1, torsoY: 0.4, neckY: 0.6, neckX: -0.2, armRRaise: 1.0, elbowR: 0.6, armLRaise: 0.3 } },
  closeout: { hold: 0.5, patch: { hipY: -0.1, kneeL: 0.8, kneeR: 0.55, torsoX: 0.15, torsoY: -0.5, neckY: -0.6, armRRaise: 0.8, armRSpread: 0.4, elbowR: 0.5, armLRaise: 0.4, armLSpread: 0.7 } },
};

/** The body's knee and hip give is cut back this much at a run, so the stride underneath carries on. */
const RUN_GIVE = 4;

/** The landing of a block preset `since` seconds after the feet came down, over the pose underneath; null once it is done. */
export function blockLandPose(preset: BlockPreset, left: boolean, since: number, speed: number, base: Pose): Pose | null {
  const land = LAND[preset];
  if (since >= land.hold) return null;
  // In hard on the landing, out slowly as he gets back into the play.
  const k = Math.min(1, since / 0.06) * (1 - smooth(since / land.hold));
  let patch = left ? mirrorPatch(land.patch) : land.patch;
  const give = Math.max(0, 1 - speed / RUN_GIVE);
  if (give < 1) patch = { ...patch, hipY: (patch.hipY ?? 0) * give, kneeL: base.kneeL + ((patch.kneeL ?? base.kneeL) - base.kneeL) * give, kneeR: base.kneeR + ((patch.kneeR ?? base.kneeR) - base.kneeR) * give };
  return blend(base, patch, k, { ...base });
}

const smooth = (u: number) => {
  const k = Math.min(1, Math.max(0, u));
  return k * k * (3 - 2 * k);
};
