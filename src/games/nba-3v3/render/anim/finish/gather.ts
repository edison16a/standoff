import type { Steps } from "../../../engine/finish/spec";
import type { PosePatch } from "../pose";

/** A key: a time in seconds on the drive's clock, and the pose there. */
export type Key = readonly [number, PosePatch];

/**
 * The footwork into the jump, for a right hand finish (a left hand one
 * is the mirror image). Each is keyed on `g`, the seconds to takeoff,
 * and ends with the body leaving the floor. The arms here are only the
 * start: the hands on the ball are set on the real ball afterwards.
 */
export function gatherKeys(steps: Steps, g: number): Key[] {
  return STEPS[steps](g);
}

/** Leaving the floor off the left foot, the right knee driving up. */
const OFF_LEFT: PosePatch = { legLLift: 0.15, kneeL: 0.75, legRLift: 0.55, kneeR: 1.35, hipY: -0.15, torsoX: 0.22 };

/** Ball up in both hands at the chest, elbows out. */
const CARRY: PosePatch = { armLRaise: 0.7, armRRaise: 0.75, elbowL: 1.5, elbowR: 1.55, armLSpread: 0.25, armRSpread: 0.15 };

const STEPS: Record<Steps, (g: number) => Key[]> = {
  // Right foot down with the ball to the hip, a long left with the knee loaded, up off it.
  two: (g) => [
    [0, { legRLift: 0.75, kneeR: 0.55, legLLift: -0.35, kneeL: 0.8, hipY: -0.06, torsoX: 0.3, ...CARRY }],
    [g * 0.45, { legRLift: 0.05, kneeR: 0.5, legLLift: 0.8, kneeL: 0.5, hipY: -0.09, torsoX: 0.3 }],
    [g, OFF_LEFT],
  ],
  // A step out to the left with the shoulders sold that way, then a long step across to the right, and up.
  euro: (g) => [
    [0, { legRLift: 0.6, kneeR: 0.6, legLLift: -0.25, kneeL: 0.7, hipY: -0.07, torsoX: 0.3, ...CARRY }],
    [g * 0.32, { legLLift: 0.35, kneeL: 0.6, legLSpread: 0.35, legRLift: 0.1, kneeR: 0.9, torsoZ: -0.28, torsoY: 0.2, neckZ: 0.15, hipY: -0.12 }],
    [g * 0.66, { legRLift: 0.25, kneeR: 0.75, legRSpread: 0.4, legLLift: 0.55, kneeL: 0.5, legLSpread: -0.05, torsoZ: 0.3, torsoY: -0.2, neckZ: -0.1, hipY: -0.14 }],
    [g, { ...OFF_LEFT, legRSpread: 0.1, legLSpread: 0, torsoZ: 0.12, torsoY: 0, neckZ: 0 }],
  ],
  // Into a two foot stop, the pump fake up on the toes, back down, then the left foot through and up.
  fake: (g) => [
    [0, { legRLift: 0.6, kneeR: 0.6, legLLift: -0.2, kneeL: 0.7, hipY: -0.06, torsoX: 0.3, ...CARRY }],
    [g * 0.4, { legLLift: 0.6, kneeL: 1.0, legRLift: 0.6, kneeR: 1.0, legLSpread: 0.12, legRSpread: 0.12, hipY: -0.17, torsoX: 0.35 }],
    [g * 0.5, { legLLift: 0.12, kneeL: 0.25, legRLift: 0.12, kneeR: 0.25, footL: 0.4, footR: 0.4, hipY: -0.02, torsoX: 0.02, neckX: -0.3, armLRaise: 2.3, armRRaise: 2.3, elbowL: 1.0, elbowR: 1.0 }],
    [g * 0.62, { legLLift: 0.6, kneeL: 1.05, legRLift: 0.6, kneeR: 1.05, footL: 0, footR: 0, hipY: -0.19, torsoX: 0.45, neckX: -0.1, ...CARRY }],
    [g * 0.84, { legLLift: 0.95, kneeL: 0.9, legLSpread: -0.12, legRLift: -0.1, kneeR: 0.7, hipY: -0.2, torsoX: 0.5, torsoZ: 0.15 }],
    [g, { ...OFF_LEFT, legLSpread: 0, torsoZ: 0.1, torsoX: 0.3 }],
  ],
  // Planted on the left, the right leg swung wide and round as the body spins on it, then down and up.
  spin: (g) => [
    [0, { legRLift: 0.6, kneeR: 0.6, legLLift: -0.25, kneeL: 0.7, hipY: -0.07, torsoX: 0.32, ...CARRY }],
    [g * 0.25, { legLLift: 0.45, kneeL: 0.85, legRLift: 0.1, kneeR: 0.7, hipY: -0.14, torsoX: 0.38, neckY: -0.3 }],
    [g * 0.55, { legRLift: 0.35, kneeR: 0.9, legRSpread: 0.55, legLLift: 0.35, kneeL: 0.9, hipY: -0.16, torsoX: 0.3, neckY: -0.6 }],
    [g * 0.8, { legRLift: 0.55, kneeR: 0.6, legRSpread: 0.15, legLLift: 0.1, kneeL: 0.6, hipY: -0.12, neckY: 0 }],
    [g, { ...OFF_LEFT, legRSpread: 0 }],
  ],
  // A hop into a jump stop, both feet down wide and deep, then up off both.
  stop: (g) => [
    [0, { legRLift: 0.6, kneeR: 0.6, legLLift: -0.25, kneeL: 0.7, hipY: -0.06, torsoX: 0.3, ...CARRY }],
    [g * 0.4, { legLLift: 0.45, kneeL: 0.9, legRLift: 0.45, kneeR: 0.9, footL: 0.3, footR: 0.3, hipY: -0.05, torsoX: 0.25 }],
    [g * 0.8, { legLLift: 0.85, kneeL: 1.45, legRLift: 0.85, kneeR: 1.45, legLSpread: 0.14, legRSpread: 0.14, footL: 0, footR: 0, hipY: -0.26, torsoX: 0.5, neckX: -0.3 }],
    [g, { legLLift: -0.05, kneeL: 0.15, legRLift: -0.05, kneeR: 0.15, legLSpread: 0.06, legRSpread: 0.06, footL: 0.6, footR: 0.6, hipY: 0, torsoX: 0.08, neckX: -0.2 }],
  ],
  // Already on the left foot: straight up off it.
  one: (g) => [
    [0, { legLLift: 0.6, kneeL: 0.7, legRLift: -0.1, kneeR: 0.6, hipY: -0.1, torsoX: 0.28, ...CARRY }],
    [g, OFF_LEFT],
  ],
};
