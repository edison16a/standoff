import type { ChargeKey } from "../../engine/moves";
import type { CharacterId } from "../../roster";
import type { PosePatch } from "./pose";
import type { StrikeAnim } from "./strike";

/*
 * The charged moves' animations. The wind up doubles as the charging
 * pose (see charging.ts), so each is a deep, readable silhouette: the
 * blade drawn far back, the fist cocked at the hip, the staff gathered
 * in. Every one starts coiled, since the move comes out of the held
 * charge, and follows through well past the hit. Moves that travel or
 * leap use explicit keys timed to their motion. Weapon angles follow
 * samurai.ts and mage.ts: armRRaise + elbowR + wristR.
 */

const coiled = (anims: Record<ChargeKey, StrikeAnim>) => {
  for (const a of Object.values(anims)) a.coiled = true;
  return anims;
};

const lunge: PosePatch = { hipY: -0.24, legLLift: 1.1, kneeL: 1.2, legRLift: -0.75, kneeR: 0.15, footR: 0.3 };
const squat: PosePatch = { hipY: -0.32, legLLift: 0.8, kneeL: 1.6, legRLift: 0.8, kneeR: 1.6, footL: -0.7, footR: -0.7, torsoX: 0.35 };
const guardL: PosePatch = { armLRaise: 1.2, elbowL: 2.1, armLSpread: -0.2 };

const karateTuck: PosePatch = { legLLift: 1.6, kneeL: 2.3, legRLift: 1.4, kneeR: 2.2, torsoX: 0.4 };
// Flying feet first: the hips lift clear of the floor and the body lies back behind the kick.
const flyingKick: PosePatch = { hipY: 0.3, torsoX: -0.2, pelvisX: -0.55, legRLift: 1.5, kneeR: 0, footR: 0.5, legLLift: 1.3, kneeL: 2.4, ...guardL, armRRaise: -0.6, elbowR: 0.5, neckX: 0.3 };

const KARATE: Record<ChargeKey, StrikeAnim> = coiled({
  holdSide: {
    windup: { torsoY: 1.2, torsoX: 0.15, hipY: -0.2, legLLift: 0.55, kneeL: 1.1, legRLift: 0.9, kneeR: 2.2, ...guardL, armRRaise: 0.4, elbowR: 2.3 },
    hit: { legRLift: 1.75, kneeR: 0.05, footR: 0.5, torsoX: -0.6, pelvisY: -0.6, legLLift: 0, kneeL: 0.2, armLSpread: 1.1, armRSpread: 0.9, armLRaise: 0.6, armRRaise: 0.4 },
    alt: { legRLift: 2.1, kneeR: 0, footR: 0.5, torsoX: -0.75, pelvisY: -0.7, legLLift: 0, kneeL: 0.2, armLSpread: 1.3, armRSpread: 1.1 },
    follow: { legRLift: 0.6, kneeR: 1.6, torsoX: -0.1, pelvisY: 0.3, armLSpread: 0.4, armRSpread: 0.4 },
    spin: 1,
    trail: "ankleR",
  },
  holdUp: {
    windup: { ...squat, torsoY: 1.0, armRRaise: -0.45, elbowR: 2.2, armRSpread: 0.25, ...guardL },
    hit: { hipY: 0.05, armRRaise: 3.1, elbowR: 0, armRSpread: -0.1, torsoY: -0.4, torsoX: -0.35, neckX: -0.3, legLLift: 1.4, kneeL: 2.1, legRLift: -0.15, kneeR: 0, footR: 0.7, armLRaise: 0.4, elbowL: 1.4 },
    follow: { armRRaise: 3.2, elbowR: 0.3, torsoX: -0.45, legLLift: 1.0, kneeL: 1.8 },
    spin: 1,
    trail: "handR",
  },
  holdDown: {
    windup: { ...squat, armLRaise: 0.9, elbowL: 1.4, armRRaise: 0.9, elbowR: 1.4, armLSpread: 0.5, armRSpread: 0.5 },
    hit: { hipY: -0.42, legLLift: 1.45, kneeL: 0, footL: 0.5, legRLift: -1.4, kneeR: 0, footR: 0.4, torsoX: 0, armLRaise: 2.4, armRRaise: 2.4, armLSpread: 1.1, armRSpread: 1.1, elbowL: 0.2, elbowR: 0.2 },
    follow: { hipY: -0.35, legLLift: 1.2, legRLift: -1.1, armLRaise: 2.0, armRRaise: 2.0 },
    trail: "ankleR",
  },
  holdHeavy: {
    windup: { ...squat, torsoX: 0.55, torsoY: 0.5, legRLift: 0.2, kneeR: 1.9, armRRaise: -0.8, elbowR: 0.5, armLRaise: -0.6, elbowL: 0.5 },
    hit: flyingKick,
    // Dragon Flight: a spring off the back foot at 8, flying feet first to 22, then touching down.
    keys: [[0, {}], [7, { ...squat, torsoX: 0.7, armRRaise: -1.0, armLRaise: -0.9 }], [10, { ...karateTuck, torsoX: -0.1, torsoY: 0 }], [13, flyingKick], [22, flyingKick], [28, { ...squat, torsoX: 0.3, legRLift: 0.6, kneeR: 1.4 }], [36, { hipY: -0.1, kneeL: 0.6, kneeR: 0.6 }]],
    trail: "ankleR",
  },
  holdHeavyDown: {
    windup: { ...squat, ...guardL, armRRaise: 1.1, elbowR: 2.1 },
    hit: { legRLift: 0.3, kneeR: 0, footR: -0.4, torsoX: 0.55, legLLift: 1.0, kneeL: 1.8 },
    // Heel Drop: spring up at 6 with the leg swinging high, then crash the heel down from 16.
    keys: [
      [0, {}],
      [5, { ...squat, hipY: -0.4, torsoX: 0.5 }],
      [10, { legRLift: 2.3, kneeR: 0.4, legLLift: 0.6, kneeL: 1.2, torsoX: -0.35, armLSpread: 1.0, armRSpread: 1.0, armLRaise: 1.6, armRRaise: 1.6 }],
      [15, { legRLift: 3.0, kneeR: 0, footR: 0.5, torsoX: -0.55, neckX: 0.3 }],
      [18, { legRLift: 0.9, kneeR: 0, footR: -0.3, torsoX: 0.4, neckX: 0 }],
      [24, { legRLift: 0.25, footR: -0.5, torsoX: 0.6, hipY: -0.3, legLLift: 1.1, kneeL: 1.9, armLSpread: 1.3, armRSpread: 1.3, armLRaise: 0.9, armRRaise: 0.9 }],
      [34, { hipY: -0.2, torsoX: 0.3, legRLift: 0.5, kneeR: 0.9 }],
    ],
    trail: "ankleR",
  },
});

const drawBack: PosePatch = { torsoY: 1.15, torsoX: 0.2, armRRaise: 0.45, armRSpread: 0.3, elbowR: 0.9, wristR: 1.95, armLRaise: 1.35, elbowL: 0.35, armLSpread: -0.3, ...lunge };
const jodan: PosePatch = { armRRaise: 2.85, elbowR: 0.7, wristR: 0, armLRaise: 2.75, elbowL: 0.85, armLSpread: -0.45, torsoX: -0.3, hipY: 0.03, legLLift: 0.35, kneeL: 0.3, legRLift: -0.3, footR: 0.4 };
const iaiCrouch: PosePatch = { hipY: -0.34, torsoY: 1.0, torsoX: 0.5, armRRaise: 0.35, armRSpread: -0.75, elbowR: 1.7, wristR: -1.05, armLRaise: 0.4, elbowL: 1.5, armLSpread: -0.6, legLLift: 1.0, kneeL: 1.6, legRLift: -0.2, kneeR: 1.2 };
const dashCut: PosePatch = { hipY: -0.32, torsoX: 0.6, torsoY: -0.75, armRRaise: 1.35, armRSpread: 1.0, elbowR: 0, wristR: -1.35, armLRaise: -0.5, elbowL: 0.3, legLLift: 1.25, kneeL: 1.3, legRLift: -0.95, kneeR: 0.15 };

const SAMURAI: Record<ChargeKey, StrikeAnim> = coiled({
  holdSide: {
    windup: drawBack,
    hit: { ...lunge, hipY: -0.28, torsoY: -0.85, torsoX: 0.3, armRRaise: 1.5, armRSpread: 0.3, elbowR: 0, wristR: -1.45, armLRaise: -0.3, elbowL: 0.4 },
    follow: { torsoY: -1.2, armRSpread: 1.25, wristR: -1.5, armLRaise: -0.5 },
    trail: "tip",
  },
  holdUp: {
    windup: { ...squat, torsoY: 0.6, armRRaise: -0.25, elbowR: 0.25, wristR: -2.2, armLRaise: 0.2, elbowL: 1.2 },
    hit: { hipY: 0.06, armRRaise: 3.05, elbowR: 0, wristR: 0.25, torsoX: -0.4, neckX: -0.25, torsoY: -0.2, legLLift: 0.2, kneeL: 0.1, legRLift: -0.1, kneeR: 0.05, footL: 0.4, footR: 0.4, armLRaise: 2.4, elbowL: 0.6 },
    follow: { armRRaise: 3.25, wristR: 0.45, torsoX: -0.5, hipY: 0 },
    trail: "tip",
  },
  holdDown: {
    windup: { ...squat, torsoY: 1.25, armRRaise: 0.9, armRSpread: 0.9, elbowR: 0.4, wristR: 1.6, armLRaise: 1.0, elbowL: 1.2 },
    hit: { hipY: -0.36, legLLift: 0.8, kneeL: 1.4, legRLift: 0.3, kneeR: 1.6, legLSpread: 0.3, legRSpread: 0.3, torsoX: 0.3, armRRaise: 1.45, armRSpread: 1.35, elbowR: 0, wristR: -1.45, armLRaise: 1.2, armLSpread: 1.2, elbowL: 0.1 },
    spin: 2,
    trail: "tip",
  },
  holdHeavy: {
    windup: iaiCrouch,
    hit: dashCut,
    // Lightning Draw: gone at 8, a flash across to 18, then the blade flicked clean.
    keys: [[0, {}], [7, { ...iaiCrouch, torsoX: 0.7, hipY: -0.4 }], [9, dashCut], [18, { ...dashCut, torsoY: -0.95, armRSpread: 1.3 }], [26, { ...dashCut, torsoX: 0.25, torsoY: -0.3, armRSpread: 0.5, armRRaise: 0.9, wristR: -1.95, hipY: -0.22 }], [38, { hipY: -0.1, torsoX: 0.2, armRRaise: 0.8, wristR: -1.5, armRSpread: 0.2 }]],
    trail: "tip",
  },
  holdHeavyDown: {
    windup: jodan,
    hit: { hipY: -0.55, torsoX: 0.85, neckX: -0.4, armRRaise: 0.55, elbowR: 0, wristR: -2.05, armLRaise: 0.6, elbowL: 0.1, armLSpread: -0.4, legLLift: 1.35, kneeL: 2.0, footL: -0.6, legRLift: -0.25, kneeR: 1.95, footR: 0.6 },
    follow: { hipY: -0.5, torsoX: 0.95, wristR: -2.15 },
    trail: "tip",
  },
});

const gather: PosePatch = { torsoY: 0.95, torsoX: 0.15, armLRaise: 0.55, elbowL: 1.9, armLSpread: -0.55, armRRaise: 0.35, elbowR: 1.2, wristR: -1.55, hipY: -0.14, legLLift: 0.6, kneeL: 0.9, kneeR: 0.5 };
const thrust: PosePatch = { torsoY: -0.45, torsoX: 0.2, armLRaise: 1.55, elbowL: 0.05, armLSpread: -0.15, armRRaise: 1.5, elbowR: 0.05, wristR: -3.1, ...lunge, hipY: -0.15, legLLift: 0.8, kneeL: 0.8 };
const skyward: PosePatch = { armRRaise: 2.95, elbowR: 0.05, wristR: -3.0, armLRaise: 2.7, elbowL: 0.2, armLSpread: 0.5, torsoX: -0.3, neckX: -0.45, hipY: 0.06, kneeL: 0.05, kneeR: 0.05 };

const MAGE: Record<ChargeKey, StrikeAnim> = coiled({
  holdSide: { windup: gather, hit: thrust, follow: { ...thrust, torsoY: -0.6, elbowL: 0.2, armLSpread: 0.2 }, trail: "handL" },
  holdUp: {
    windup: { ...squat, torsoX: 0.55, neckX: 0.4, armLRaise: 0.8, elbowL: 2.1, armLSpread: -0.5, armRRaise: 0.9, elbowR: 2.0, wristR: -2.9 },
    hit: skyward,
    follow: { ...skyward, armLSpread: 0.9, neckX: -0.55 },
    trail: "tip",
  },
  holdDown: {
    windup: { armRRaise: 2.9, elbowR: 0.1, wristR: -3.0, armLRaise: 2.8, elbowL: 0.3, armLSpread: -0.3, torsoX: -0.3, hipY: 0.05, neckX: -0.3 },
    hit: { ...squat, torsoX: 0.5, armRRaise: 0.95, elbowR: 0.1, wristR: -1.05, armLRaise: 1.1, elbowL: 0, armLSpread: 1.3, neckX: 0.2 },
    trail: "tip",
  },
  holdHeavy: {
    windup: { ...gather, torsoY: 1.1, armRRaise: 0.8, elbowR: 1.7, wristR: -2.5, armLRaise: 0.9, elbowL: 1.8 },
    hit: { ...thrust, armLRaise: 1.45, elbowL: 0.25, armLSpread: -0.4 },
    follow: { torsoY: 0.1, armRRaise: 1.2, elbowR: 0.6, wristR: -2.4, armLRaise: 0.9, elbowL: 1.2, hipY: -0.1 },
    trail: "tip",
  },
  holdHeavyDown: {
    windup: { ...squat, torsoX: 0.45, armRRaise: 1.2, elbowR: 1.4, wristR: -2.6, armLRaise: 1.1, elbowL: 1.9, armLSpread: -0.4 },
    hit: { armRRaise: 2.4, elbowR: 0, wristR: -3.2, armLRaise: 2.9, elbowL: 0.1, armLSpread: 0.6, torsoX: -0.3, neckX: -0.4 },
    alt: { armRRaise: 2.0, elbowR: 0.1, wristR: -3.4, armLRaise: 2.2, elbowL: 0.2, armLSpread: 1.1, torsoX: -0.15, neckX: -0.2 },
    follow: { armRRaise: 1.4, wristR: -2.8, armLRaise: 1.5, torsoX: 0 },
    trail: "tip",
  },
});

const raised: PosePatch = { armLRaise: 2.95, armRRaise: 2.95, elbowL: 0.6, elbowR: 0.6, armLSpread: 0.2, armRSpread: 0.2, torsoX: -0.4, neckX: -0.3, hipY: 0.05 };
const flatSlam: PosePatch = { ...squat, torsoX: 1.05, neckX: -0.6, armLRaise: 0.95, armRRaise: 0.95, elbowL: 0, elbowR: 0, armLSpread: 0.1, armRSpread: 0.1 };

const BEAR: Record<ChargeKey, StrikeAnim> = coiled({
  holdSide: {
    windup: { torsoY: 1.25, torsoX: -0.1, hipY: -0.12, armRRaise: 0.9, armRSpread: 1.2, elbowR: 1.5, armLRaise: 1.1, elbowL: 1.3, legLLift: 0.6, kneeL: 0.9, kneeR: 0.7 },
    hit: { torsoY: -0.9, torsoX: 0.45, armRRaise: 1.55, armRSpread: -0.25, elbowR: 0.2, armLRaise: 0.2, elbowL: 0.9, legLLift: 0.9, kneeL: 1.0, legRLift: -0.5, kneeR: 0.2, hipY: -0.15 },
    follow: { torsoY: -1.2, armRSpread: -0.75, armRRaise: 1.2, torsoX: 0.55 },
    trail: "handR",
  },
  holdUp: {
    windup: { ...squat, torsoX: 0.8, neckX: 0.5, armLRaise: 0.35, armRRaise: 0.35, elbowL: 1.5, elbowR: 1.5, armLSpread: -0.2, armRSpread: -0.2 },
    hit: { hipY: 0.12, armLRaise: 3.1, armRRaise: 3.1, elbowL: 0.15, elbowR: 0.15, torsoX: -0.45, neckX: -0.55, kneeL: 0.05, kneeR: 0.05, footL: 0.5, footR: 0.5 },
    trail: "handR",
  },
  holdDown: { windup: raised, hit: flatSlam, follow: { ...flatSlam, torsoX: 1.1, hipY: -0.36 }, trail: "handR" },
  holdHeavy: {
    windup: { ...squat, torsoX: 0.75, neckX: 0.55, armLRaise: 0.9, armRRaise: 0.9, elbowL: 2.3, elbowR: 2.3, armLSpread: -0.35, armRSpread: -0.35 },
    hit: { hipY: 0.02, torsoX: -0.4, neckX: -0.75, armLRaise: 1.35, armRRaise: 1.35, armLSpread: 1.45, armRSpread: 1.45, elbowL: 0.4, elbowR: 0.4, legLLift: 0.5, kneeL: 0.7, legRLift: -0.3 },
    trail: "none",
  },
  holdHeavyDown: {
    windup: { ...squat, ...raised, hipY: -0.3 },
    hit: flatSlam,
    // Meteor Belly: leap at 8, roll forward over the top, belly first from 24, crash at 36.
    keys: [
      [0, {}],
      [7, { ...squat, hipY: -0.4, armLRaise: -0.6, armRRaise: -0.6 }],
      [12, { ...raised, legLLift: 0.7, kneeL: 1.4, legRLift: 0.7, kneeR: 1.4 }],
      [22, { pelvisX: 0.9, torsoX: 0.3, armLRaise: 2.2, armRRaise: 2.2, armLSpread: 1.1, armRSpread: 1.1, legLLift: -0.3, legRLift: -0.3, kneeL: 0.5, kneeR: 0.5 }],
      [27, { pelvisX: 1.45, torsoX: 0.1, neckX: -0.8, armLRaise: 2.6, armRRaise: 2.6, armLSpread: 1.4, armRSpread: 1.4, elbowL: 0.2, elbowR: 0.2 }],
      [37, { pelvisX: 1.45, hipY: -0.35, torsoX: 0.1 }],
      [48, { ...squat, pelvisX: 0.3, armLRaise: 0.8, armRRaise: 0.8 }],
    ],
    trail: "none",
  },
});

export const CHARGED_ANIMS: Record<CharacterId, Record<ChargeKey, StrikeAnim>> = { karate: KARATE, samurai: SAMURAI, mage: MAGE, bear: BEAR };
