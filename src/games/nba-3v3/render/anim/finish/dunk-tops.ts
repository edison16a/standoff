import type { DunkStyle } from "../../../roster";
import type { PosePatch } from "../pose";
import type { AirKey } from "./layup-tops";

/** Up in the air, legs tucked: most dunks pass through here. */
const AIR: PosePatch = { hipY: 0, legLLift: 0.7, kneeL: 1.4, legRLift: 0.35, kneeR: 1.0, footL: 0.5, footR: 0.5, torsoX: 0.05 };
/** Off both feet: the knees come up together. */
const TUCK: PosePatch = { hipY: 0, legLLift: 0.6, kneeL: 1.25, legRLift: 0.6, kneeR: 1.25, footL: 0.5, footR: 0.5, torsoX: 0.05 };
const TWO_UP: PosePatch = { armLRaise: 2.6, armRRaise: 2.6, elbowL: 1.1, elbowR: 1.1, armLSpread: 0.18, armRSpread: 0.18 };
const SLAM2: PosePatch = { armLRaise: 1.75, armRRaise: 1.75, elbowL: 0.15, elbowR: 0.15, wristL: 0.7, wristR: 0.7, torsoX: 0.3, neckX: 0.2 };
const SLAM1: PosePatch = { armRRaise: 1.7, elbowR: 0.1, wristR: 0.8, torsoX: 0.28, neckX: 0.2 };

/**
 * Each dunk in the air, for a right hand dunk, keyed from takeoff (0)
 * to the slam (1). The hands on the ball are set on the real ball (see
 * `finish-hands.ts`); these shape the legs, the body, the head and a
 * free arm. A turn in the air (the reverse, the 360) is the engine's.
 */
export const DUNK_TOPS: Record<DunkStyle, AirKey[]> = {
  twoHand: [[0.15, { ...TUCK, ...TWO_UP }], [0.75, { torsoX: -0.1, neckX: -0.25 }], [1, SLAM2]],
  hammer: [[0.15, { ...AIR, legLLift: 0.5, legRLift: 0.5, kneeL: 1.2, kneeR: 1.2, ...TWO_UP }], [0.7, { torsoX: -0.25, neckX: -0.2 }], [1, SLAM2]],
  tomahawk: [[0.15, { ...AIR, armLRaise: 1.6, elbowL: 0.6, armLSpread: 0.4 }], [0.72, { torsoX: -0.3, armLRaise: 1.9, legRLift: 0.1, kneeR: 1.6 }], [1, { ...SLAM1, armLRaise: 1.2 }]],
  windmill: [[0.05, { ...AIR, armLRaise: 1.5, armLSpread: 0.6 }], [0.65, { torsoX: -0.15 }], [1, { torsoX: 0.25, neckX: 0.15 }]],
  reverse: [[0.2, { ...TUCK, ...TWO_UP }], [0.75, { torsoX: -0.35, neckX: -0.4 }], [1, { torsoX: -0.5, neckX: -0.5 }]],
  spin360: [[0.15, { ...TUCK, legLLift: 0.9, legRLift: 0.9, kneeL: 1.6, kneeR: 1.6, ...TWO_UP }], [0.8, { torsoX: 0 }], [1, SLAM2]],
  scoop: [[0.1, { ...AIR, armLRaise: 1.4, armLSpread: 0.5 }], [0.85, { torsoX: -0.1 }], [1, SLAM1]],
  flush: [[0.2, { ...AIR, armLRaise: 1.4, armLSpread: 0.5 }], [1, SLAM1]],
  rimhang: [[0.2, { ...TUCK, ...TWO_UP }], [0.85, { neckX: -0.2 }], [1, SLAM2]],
  cockback: [[0.15, { ...AIR, armLRaise: 1.5, armLSpread: 0.5 }], [0.75, { torsoX: -0.45, neckX: -0.3, legRLift: -0.2, kneeR: 1.8 }], [1, { ...SLAM1 }]],
  clutch: [[0.12, { ...TUCK, ...TWO_UP }], [0.42, { torsoX: 0.35, legLLift: 1.0, legRLift: 1.0, kneeL: 1.7, kneeR: 1.7 }], [0.8, { torsoX: 0 }], [1, SLAM2]],
  // Up through the man: the left knee driven up into him, both hands cocked back over his head, then hammered down.
  poster: [
    [0.15, { ...AIR, legLLift: 1.2, kneeL: 1.5, legLSpread: 0.35, legRLift: 0.2, kneeR: 1.3, torsoX: 0.15, ...TWO_UP }],
    [0.7, { torsoX: -0.25, neckX: -0.2 }],
    [1, { ...SLAM2, legLLift: 0.9 }],
  ],
  // Straight back up off both feet from under the rim.
  putback: [[0.2, { ...TUCK, ...TWO_UP, legLLift: 0.4, legRLift: 0.4, kneeL: 0.9, kneeR: 0.9 }], [1, SLAM2]],
  // Caught high and thrown down in one: the legs split wide in the air, the free arm flung out.
  alley: [
    [0.15, { ...AIR, legLLift: 0.95, kneeL: 1.2, legRLift: -0.2, kneeR: 1.1, armLRaise: 1.9, armLSpread: 0.9, elbowL: 0.4, torsoX: -0.1 }],
    [0.65, { torsoX: -0.25, neckX: -0.3 }],
    [1, { ...SLAM1, armLRaise: 1.3 }],
  ],
  jumpStop: [[0.15, { ...TUCK, ...TWO_UP }], [0.7, { torsoX: -0.12, neckX: -0.25 }], [1, SLAM2]],
};
