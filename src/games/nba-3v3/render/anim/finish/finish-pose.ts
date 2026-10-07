import { specOf } from "../../../engine/finish/ball-track";
import type { Athlete } from "../../../engine/types";
import { keyed, mirrorPatch, type Pose, type PosePatch } from "../pose";
import { DUNK_TOPS } from "./dunk-tops";
import { gatherKeys, type Key } from "./gather";
import { LAYUP_TOPS } from "./layup-tops";

type Drive = Extract<Athlete["action"], { kind: "drive" }>;

/**
 * A layup or a dunk from the first gather step to the landing, on the
 * engine's clock: the preset's footwork, its shape in the air, the
 * follow through or the hang on the rim, and the knees giving as the
 * feet come down. Authored for the right hand, mirrored for the left.
 */
export function finishPose(act: Drive, base: Pose): Pose {
  const g = act.takeoff;
  const air = Math.max(0.05, act.finish - g);
  const keys: Key[] = gatherKeys(specOf(act).steps, g);
  const tops = act.dunk ? DUNK_TOPS[act.style ?? "flush"] : LAYUP_TOPS[act.layup ?? "finger"];
  for (const [s, patch] of tops) keys.push([g + Math.max(0.08, s) * air, patch]);
  keys.push(...(act.dunk ? afterSlam(act) : afterLayup(act)));
  keys.sort((p, q) => p[0] - q[0]);
  return keyed(act.hand === -1 ? keys.map(([at, p]) => [at, mirrorPatch(p)] as const) : keys, act.t, base);
}

/** The arm held up in the follow through, the wrist dropped, the legs reaching for the floor and giving on it. */
function afterLayup(act: Drive): Key[] {
  const follow: PosePatch = { armRRaise: 2.75, elbowR: 0.12, wristR: 1.0 };
  return [
    [act.finish + 0.1, follow],
    [act.land - 0.08, { legLLift: 0.3, kneeL: 0.4, legRLift: 0.45, kneeR: 0.6, footL: 0.2, footR: 0.2, torsoZ: 0, torsoY: 0, armRRaise: 2.2, elbowR: 0.5, wristR: 0.3 }],
    [act.land + 0.1, { hipY: -0.12, kneeL: 0.8, kneeR: 0.8, legLLift: 0.45, legRLift: 0.45, footL: 0, footR: 0, armRRaise: 0.4, elbowR: 0.5, wristR: 0, armLRaise: 0.4, armLSpread: 0.25, neckX: 0, neckY: 0, neckZ: 0 }],
  ];
}

/** Hanging on the rim with the legs swinging under, or straight back down, and a hard landing on both feet. */
function afterSlam(act: Drive): Key[] {
  const hang = act.rimHang;
  const keys: Key[] = [];
  if (hang > 0) {
    keys.push([act.finish + 0.1, { armLRaise: 3.0, armRRaise: 3.0, elbowL: 0.05, elbowR: 0.05, wristL: 0.9, wristR: 0.9, armLSpread: 0.22, armRSpread: 0.22, legLLift: 0.45, legRLift: 0.2, kneeL: 0.8, kneeR: 0.5, torsoX: -0.12, neckX: -0.15 }]);
    keys.push([act.finish + hang * 0.45, { legLLift: -0.25, legRLift: -0.3, kneeL: 0.35, kneeR: 0.25, torsoX: 0.08 }]);
    keys.push([act.finish + hang * 0.8, { legLLift: 0.15, legRLift: 0.05, kneeL: 0.45, kneeR: 0.35, torsoX: -0.02 }]);
    keys.push([act.finish + hang, { legLLift: 0.3, legRLift: 0.2, kneeL: 0.5, kneeR: 0.4, armLRaise: 2.7, armRRaise: 2.7 }]);
  } else {
    // Through the ring and the arm carried on down past the face, the legs swinging under to land.
    keys.push([act.finish + 0.1, { torsoX: 0.25, legLLift: 0.35, legRLift: 0.35, kneeL: 0.6, kneeR: 0.6, armRRaise: 1.3, elbowR: 0.3, wristR: 0.5 }]);
  }
  keys.push([act.land - 0.05, { legLLift: 0.25, legRLift: 0.25, kneeL: 0.35, kneeR: 0.35, footL: 0.2, footR: 0.2, armLRaise: 1.4, armRRaise: 1.4, elbowL: 0.6, elbowR: 0.6, wristL: 0, wristR: 0 }]);
  keys.push([act.land + 0.12, { hipY: -0.18, legLLift: 0.6, legRLift: 0.6, kneeL: 1.2, kneeR: 1.2, footL: 0, footR: 0, torsoX: 0.35, armLRaise: 0.8, armRRaise: 0.8, armLSpread: 0.6, armRSpread: 0.6, elbowL: 1.4, elbowR: 1.4, neckX: 0 }]);
  return keys;
}
