import type { BlockPreset } from "../../../engine/blocks/presets";
import type { PosePatch } from "../pose";

/**
 * The strike of each block preset: what the body does round the touch,
 * written for the right hand striking (mirrored for the left). Three
 * beats on the contact time: the windup `windup` seconds before, the
 * contact itself, and the follow through after. The striking arm is
 * set close to where the hand path takes it (`block-reach.ts`), so the
 * reach only has to finish it; the torso, the head, the legs and the
 * other arm sell the hit.
 */
export interface Strike {
  /** How long before the touch the windup is set. */
  windup: number;
  /** How long after the touch the follow through is held. */
  follow: number;
  keys: { windup: PosePatch; contact: PosePatch; follow: PosePatch };
}

export const STRIKES: Record<BlockPreset, Strike> = {
  // Both palms cocked behind the head, then the whole trunk crunches forward to drive it back down.
  rejection: {
    windup: 0.18,
    follow: 0.16,
    keys: {
      windup: { torsoX: -0.14, neckX: -0.4, armLRaise: 2.75, armRRaise: 2.75, elbowL: 1.0, elbowR: 1.0, armLSpread: 0.3, armRSpread: 0.3, kneeL: 0.5, kneeR: 0.5 },
      contact: { torsoX: 0.28, neckX: -0.1, armLRaise: 2.45, armRRaise: 2.45, elbowL: 0.12, elbowR: 0.12, wristL: 0.5, wristR: 0.5, armLSpread: 0.12, armRSpread: 0.12, legLLift: 0.6, legRLift: 0.6, kneeL: 1.1, kneeR: 1.1 },
      follow: { torsoX: 0.4, neckX: 0.1, armLRaise: 1.9, armRRaise: 1.9, elbowL: 0.25, elbowR: 0.25, wristL: 0.7, wristR: 0.7, legLLift: 0.5, legRLift: 0.5 },
    },
  },
  // Coiled away with the hand high and wide, then the trunk unwinds and the arm comes through and across, the other arm thrown out.
  swat: {
    windup: 0.22,
    follow: 0.2,
    keys: {
      windup: { torsoY: -0.38, torsoZ: -0.12, neckY: 0.3, neckX: -0.35, armRRaise: 2.7, armRSpread: 0.75, elbowR: 1.3, armLRaise: 1.6, armLSpread: 0.6, legRLift: 0.7, kneeR: 1.3 },
      contact: { torsoY: 0.12, torsoZ: 0.05, neckY: 0.1, neckX: -0.3, armRRaise: 2.7, armRSpread: 0.2, elbowR: 0.12, wristR: 0.4, armLRaise: 0.8, armLSpread: 1.1, elbowL: 0.4 },
      follow: { torsoY: 0.45, torsoX: 0.25, torsoZ: 0.18, neckY: -0.15, armRRaise: 1.6, armRSpread: -0.35, elbowR: 0.35, wristR: 0.8, armLRaise: 0.3, armLSpread: 1.2, legRLift: 0.3, legLLift: 0.6, kneeL: 1.0 },
    },
  },
  // The long arm comes up from behind his hip and over, the body stretched out flat along the run.
  chase: {
    windup: 0.26,
    follow: 0.2,
    keys: {
      windup: { torsoX: 0.45, armRRaise: 1.7, armRSpread: 0.25, elbowR: 1.1, neckX: -0.35 },
      contact: { torsoX: 0.2, armRRaise: 3.05, armRSpread: 0.05, elbowR: 0.02, wristR: 0.3, neckX: -0.45, legRLift: 0.2, kneeR: 1.3, legLLift: -0.4, kneeL: 0.9 },
      follow: { torsoX: 0.5, armRRaise: 2.3, elbowR: 0.2, wristR: 0.9, neckX: -0.1, legRLift: 0.6, kneeR: 1.0 },
    },
  },
  // Coming across to his left: both hands sweep from his right side over to the ball, the hips swung out under him.
  help: {
    windup: 0.2,
    follow: 0.2,
    keys: {
      windup: { torsoZ: -0.08, torsoY: -0.25, armLRaise: 2.6, armRRaise: 2.6, armLSpread: -0.25, armRSpread: 0.55, elbowL: 0.6, elbowR: 0.6, neckY: -0.2 },
      contact: { torsoZ: 0.32, torsoY: 0.2, armLRaise: 2.85, armRRaise: 2.85, armLSpread: 0.45, armRSpread: -0.15, elbowL: 0.1, elbowR: 0.15, pelvisZ: 0.12, legLSpread: 0.45, neckY: 0.15 },
      follow: { torsoZ: 0.4, torsoY: 0.4, armLRaise: 2.2, armRRaise: 2.1, armLSpread: 0.75, armRSpread: -0.4, elbowL: 0.3, elbowR: 0.35, neckY: 0.35 },
    },
  },
  // Stretched tall to the glass, the palm flat and held there a beat before it lets go.
  pin: {
    windup: 0.2,
    follow: 0.18,
    keys: {
      windup: { torsoX: 0.1, armRRaise: 2.2, elbowR: 0.9, wristR: -0.3, neckX: -0.35, kneeL: 0.5, kneeR: 0.5 },
      contact: { torsoX: -0.12, torsoZ: -0.08, armRRaise: 3.05, armRSpread: 0.05, elbowR: 0.03, wristR: -0.65, armLRaise: 1.2, armLSpread: 0.5, neckX: -0.5, kneeL: 0.15, kneeR: 0.2, footL: 0.7, footR: 0.7 },
      follow: { torsoX: -0.1, armRRaise: 3.0, elbowR: 0.05, wristR: -0.6, neckX: -0.45, kneeL: 0.2, kneeR: 0.25 },
    },
  },
  // Every inch of reach: up on the shoulder with the fingers spread, then a flick of the wrist as the ball goes off them.
  tip: {
    windup: 0.16,
    follow: 0.18,
    keys: {
      windup: { torsoZ: -0.05, armRRaise: 2.6, elbowR: 0.5, wristR: 0.2, neckX: -0.35 },
      contact: { torsoZ: -0.22, torsoX: -0.06, armRRaise: 3.1, armRSpread: 0.12, elbowR: 0.0, wristR: 0.0, armLRaise: 0.9, armLSpread: 0.7, neckX: -0.5, neckZ: 0.1 },
      follow: { torsoZ: -0.18, armRRaise: 3.0, elbowR: 0.05, wristR: 0.9, neckX: -0.4 },
    },
  },
  // The same full stretch, but the ball goes by: the head turns after it and the arm falls away.
  miss: {
    windup: 0.18,
    follow: 0.24,
    keys: {
      windup: { torsoZ: -0.05, armRRaise: 2.6, elbowR: 0.45, neckX: -0.35 },
      contact: { torsoZ: -0.25, torsoX: -0.08, armRRaise: 3.1, armRSpread: 0.15, elbowR: 0.0, wristR: 0.15, armLRaise: 0.8, armLSpread: 0.75, neckX: -0.5 },
      follow: { torsoZ: -0.1, torsoY: 0.3, neckY: 0.55, neckX: -0.3, armRRaise: 2.3, elbowR: 0.4, wristR: 0.4 },
    },
  },
  // Flying past him: the hand up and out in front, the legs split, the body leaning back off the shooter, the other arm back.
  closeout: {
    windup: 0.2,
    follow: 0.22,
    keys: {
      windup: { torsoX: -0.02, armRRaise: 2.4, elbowR: 0.6, armLRaise: -0.2, armLSpread: 0.7, neckX: -0.3 },
      contact: { torsoX: -0.16, armRRaise: 2.95, armRSpread: -0.05, elbowR: 0.03, wristR: 0.35, armLRaise: -0.45, armLSpread: 0.9, neckX: -0.4, legLLift: -0.5, kneeL: 0.8, legRLift: 0.95, kneeR: 0.6 },
      follow: { torsoX: -0.05, torsoY: 0.2, armRRaise: 2.5, elbowR: 0.25, wristR: 0.8, armLRaise: 0.1, neckY: 0.25, neckX: -0.2 },
    },
  },
};
