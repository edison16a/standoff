import type { Celebration } from "../../roster";
import { over, STAND, type Pose, type PosePatch } from "./pose";

/**
 * Each player's own celebration after a make or a win:
 * Ashby's night night, Whitlock's roar, Varelas flexing,
 * Vukmir's shrug, and so on. `t` runs from zero and they loop.
 */
export function celebratePose(style: Celebration, t: number): Pose {
  const p = { ...STAND };
  const beat = Math.sin(t * 9);
  const slow = Math.sin(t * 4);
  const patch: Record<Celebration, PosePatch> = {
    night: { armLRaise: 1.9, armRRaise: 1.9, armLSpread: -0.55, armRSpread: 0.65, elbowL: 2.4, elbowR: 2.3, neckZ: 0.45, neckX: 0.1, torsoZ: 0.1 },
    roar: { armLSpread: 1.25, armRSpread: 1.25, armLRaise: 0.3, armRRaise: 0.3, elbowL: 1.8 + beat * 0.15, elbowR: 1.8 + beat * 0.15, torsoX: -0.25, neckX: -0.5, hipY: -0.06, kneeL: 0.4, kneeR: 0.4 },
    flex: { armLRaise: 1.5, armRRaise: 1.5, armLSpread: 1.2, armRSpread: 1.2, elbowL: 2.3 + beat * 0.1, elbowR: 2.3 - beat * 0.1, torsoX: -0.1, neckX: -0.3, hipY: -0.05, legLSpread: 0.25, legRSpread: 0.25 },
    shrug: { armLRaise: 0.5, armRRaise: 0.5, armLSpread: 0.75, armRSpread: 0.75, elbowL: 1.3, elbowR: 1.3, armLTwist: -0.8, armRTwist: -0.8, neckZ: 0.3 + slow * 0.1, torsoX: -0.05 },
    shimmy: { torsoY: beat * 0.35, armLRaise: 0.7, armRRaise: 0.7, armLSpread: 0.9, armRSpread: 0.9, elbowL: 1.5, elbowR: 1.5, hipY: -0.08, kneeL: 0.5, kneeR: 0.5, neckY: -beat * 0.2 },
    wrist: { armLRaise: 1.3, elbowL: 1.5, armLSpread: 0.05, armRRaise: 1.35, armRSpread: -0.35, elbowR: 1.95 + beat * 0.12, neckX: 0.35, neckY: 0.2 },
    pound: { armRRaise: 0.95 + Math.max(0, beat) * 0.3, armRSpread: -0.35, elbowR: 2.4, armLRaise: 0.4, armLSpread: 0.5, elbowL: 0.6, torsoX: -0.15, neckX: -0.35 },
    scream: { armLSpread: 1.45, armRSpread: 1.45, armLRaise: 0.35, armRRaise: 0.35, elbowL: 0.35, elbowR: 0.35, torsoX: -0.3, neckX: -0.55, hipY: -0.1, kneeL: 0.55, kneeR: 0.55, legLSpread: 0.3, legRSpread: 0.3 },
    reach: { armRRaise: 3.05, elbowR: 0.05, armRSpread: 0.1, armLRaise: 0.3, armLSpread: 0.3, neckX: -0.4, torsoX: -0.1 },
    calm: { neckX: 0.15 + slow * 0.12, armLRaise: 0.15, armRRaise: 0.15, elbowL: 0.4, elbowR: 0.4 },
  };
  return over(p, patch[style]);
}

/** The losers: hands on the knees, heads down. */
export function dejectedPose(t: number): Pose {
  const p = { ...STAND };
  return over(p, {
    torsoX: 0.75, hipY: -0.1, neckX: 0.3 + Math.sin(t * 1.5) * 0.05,
    legLLift: 0.45, legRLift: 0.45, kneeL: 0.6, kneeR: 0.6, legLSpread: 0.15, legRSpread: 0.15,
    armLRaise: 0.9, armRRaise: 0.9, elbowL: 0.4, elbowR: 0.4, armLSpread: 0.1, armRSpread: 0.1,
  });
}
