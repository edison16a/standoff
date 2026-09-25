import type { DunkStyle } from "../../roster";
import type { DriveTiming } from "./actions";
import { keyed, type Pose, type PosePatch } from "./pose";

type Key = readonly [number, PosePatch];

/** Up in the air, legs tucked and the ball overhead in both hands: most dunks pass through here. */
const AIR: PosePatch = { hipY: 0, legLLift: 0.7, kneeL: 1.4, legRLift: 0.35, kneeR: 1.0, footL: 0.5, footR: 0.5, torsoX: 0.05 };
const TWO_UP: PosePatch = { armLRaise: 2.6, armRRaise: 2.6, elbowL: 1.1, elbowR: 1.1, armLSpread: 0.18, armRSpread: 0.18 };
const SLAM2: PosePatch = { armLRaise: 1.75, armRRaise: 1.75, elbowL: 0.15, elbowR: 0.15, wristL: 0.7, wristR: 0.7, torsoX: 0.3, neckX: 0.2 };
const SLAM1: PosePatch = { armRRaise: 1.7, elbowR: 0.1, wristR: 0.8, torsoX: 0.28, neckX: 0.2 };

/** Each signature dunk as keys through the flight, s from takeoff (0) to the slam (1). */
const STYLES: Record<DunkStyle, Key[]> = {
  // Both hands stay on the ball as it is cocked right back behind the head.
  hammer: [[0.15, { ...AIR, legLLift: 0.5, legRLift: 0.5, kneeL: 1.2, kneeR: 1.2, ...TWO_UP, armLSpread: -0.06, armRSpread: -0.06 }], [0.7, { armLRaise: 3.25, armRRaise: 3.25, elbowL: 1.5, elbowR: 1.5, armLSpread: -0.1, armRSpread: -0.1, torsoX: -0.25, neckX: -0.2 }], [1, { ...SLAM2, armLSpread: 0, armRSpread: 0 }]],
  tomahawk: [[0.15, { ...AIR, armRRaise: 2.4, elbowR: 1.4, armLRaise: 1.6, elbowL: 0.6, armLSpread: 0.4 }], [0.72, { armRRaise: 3.35, elbowR: 1.9, torsoX: -0.3, armLRaise: 1.9, legRLift: 0.1, kneeR: 1.6 }], [1, { ...SLAM1, armLRaise: 1.2 }]],
  windmill: [[0.05, { ...AIR, armRRaise: 1.1, elbowR: 0.2, armRSpread: 0.35, armLRaise: 1.5, armLSpread: 0.6 }], [0.35, { armRRaise: -0.9 }], [0.65, { armRRaise: -2.6, torsoX: -0.15 }], [1, { armRRaise: -4.5, elbowR: 0.1, wristR: 0.8, torsoX: 0.25 }]],
  reverse: [[0.2, { ...AIR, ...TWO_UP }], [0.75, { armLRaise: 3.0, armRRaise: 3.0, elbowL: 0.5, elbowR: 0.5, torsoX: -0.35, neckX: -0.4 }], [1, { armLRaise: 3.45, armRRaise: 3.45, elbowL: 0.2, elbowR: 0.2, torsoX: -0.5, wristL: 0.6, wristR: 0.6 }]],
  spin360: [[0.15, { ...AIR, ...TWO_UP, legLLift: 0.9, legRLift: 0.9, kneeL: 1.6, kneeR: 1.6 }], [0.8, { armLRaise: 2.9, armRRaise: 2.9, elbowL: 0.8, elbowR: 0.8 }], [1, SLAM2]],
  scoop: [[0.1, { ...AIR, armRRaise: -0.2, elbowR: 0.2, armLRaise: 1.4, armLSpread: 0.5 }], [0.55, { armRRaise: 1.5, elbowR: 0.1 }], [0.85, { armRRaise: 2.75, elbowR: 0.2, torsoX: -0.1 }], [1, SLAM1]],
  flush: [[0.2, { ...AIR, armRRaise: 2.2, elbowR: 1.0, armLRaise: 1.4, armLSpread: 0.5 }], [0.8, { armRRaise: 2.85, elbowR: 0.15 }], [1, SLAM1]],
  rimhang: [[0.2, { ...AIR, ...TWO_UP }], [0.85, { armLRaise: 2.85, armRRaise: 2.85, elbowL: 0.3, elbowR: 0.3 }], [1, { ...SLAM2, armLRaise: 2.3, armRRaise: 2.3 }]],
  cockback: [[0.15, { ...AIR, armRRaise: 2.6, elbowR: 1.2, armLRaise: 1.5, armLSpread: 0.5 }], [0.75, { armRRaise: 3.6, elbowR: 1.1, torsoX: -0.45, neckX: -0.3, legRLift: -0.2, kneeR: 1.8 }], [1, { ...SLAM1, armRRaise: 1.5 }]],
  clutch: [[0.12, { ...AIR, ...TWO_UP }], [0.42, { armLRaise: 0.9, armRRaise: 0.9, elbowL: 1.6, elbowR: 1.6, torsoX: 0.35, legLLift: 1.0, legRLift: 1.0, kneeL: 1.7, kneeR: 1.7 }], [0.8, { armLRaise: 2.8, armRRaise: 2.8, elbowL: 0.6, elbowR: 0.6, torsoX: 0 }], [1, SLAM2]],
};

/** How far the body turns in the air: a half turn for the reverse, all the way round for the 360. */
export function dunkSpin(style: DunkStyle, t: number, d: DriveTiming): number {
  const s = Math.min(1, Math.max(0, (t - d.takeoff) / (d.finish - d.takeoff)));
  const ease = s * s * (3 - 2 * s);
  if (style === "reverse") return Math.PI * ease;
  if (style === "spin360") return Math.PI * 2 * ease;
  return 0;
}

/**
 * A dunk from gather to landing: a two foot gather, the style's flight,
 * the slam at the rim, a hang for those who hang, then the drop.
 */
export function dunkPose(style: DunkStyle, t: number, d: DriveTiming, base: Pose): Pose {
  const air = d.finish - d.takeoff;
  const hang = d.rimHang;
  const keys: Key[] = [
    [0, { legLLift: 0.6, kneeL: 0.6, legRLift: -0.2, kneeR: 0.8, hipY: -0.06, torsoX: 0.3, armLRaise: 1.0, armRRaise: 1.05, elbowL: 1.7, elbowR: 1.8, armLSpread: 0.25 }],
    [d.takeoff * 0.85, { legLLift: 0.7, legRLift: 0.7, kneeL: 1.25, kneeR: 1.25, hipY: -0.2, torsoX: 0.4, armLRaise: 0.4, armRRaise: 0.45, elbowL: 0.6, elbowR: 0.6 }],
    ...STYLES[style].map(([s, patch]) => [d.takeoff + s * air, patch] as const),
  ];
  if (hang > 0) {
    // Hanging on the rim: arms up holding on, legs swinging under.
    keys.push([d.finish + 0.08, { armLRaise: 2.95, armRRaise: 2.95, elbowL: 0.1, elbowR: 0.1, wristL: 0.9, wristR: 0.9, legLLift: 0.3, legRLift: 0.1, kneeL: 0.6, kneeR: 0.4, torsoX: -0.05 }]);
    keys.push([d.finish + hang * 0.6, { legLLift: -0.1, legRLift: -0.2, kneeL: 0.3, kneeR: 0.2 }]);
    keys.push([d.finish + hang, { legLLift: 0.3, legRLift: 0.2, kneeL: 0.5, kneeR: 0.4 }]);
  } else {
    keys.push([d.finish + 0.1, { torsoX: 0.2, legLLift: 0.35, legRLift: 0.35, kneeL: 0.6, kneeR: 0.6 }]);
  }
  keys.push([d.land - 0.05, { legLLift: 0.25, legRLift: 0.25, kneeL: 0.35, kneeR: 0.35, footL: 0.2, footR: 0.2, armLRaise: 1.4, armRRaise: 1.4, elbowL: 0.6, elbowR: 0.6, wristL: 0, wristR: 0 }]);
  keys.push([d.land + 0.12, { hipY: -0.18, legLLift: 0.6, legRLift: 0.6, kneeL: 1.2, kneeR: 1.2, footL: 0, footR: 0, torsoX: 0.35, armLRaise: 0.8, armRRaise: 0.8, armLSpread: 0.6, armRSpread: 0.6, elbowL: 1.4, elbowR: 1.4 }]);
  return keyed(keys, t, base);
}
