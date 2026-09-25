import type { CharacterId } from "../../roster";
import type { ChargeKey } from "../../engine/moves";
import type { PosePatch } from "./pose";
import type { StrikeAnim } from "./strike";

/*
 * The charged moves' animations. The wind up pose doubles as the
 * charging pose, held while the button is, so it is deep and coiled;
 * the hit pose is the release.
 */

const crouch: PosePatch = { hipY: -0.3, kneeL: 1.4, kneeR: 1.4, legLLift: 0.7, legRLift: 0.7 };
const coilBack: PosePatch = { torsoY: 1.0, torsoX: 0.1, hipZ: -0.1, legLLift: 0.6, kneeL: 1.0, kneeR: 0.8 };

const KARATE: Record<ChargeKey, StrikeAnim> = {
  holdSide: {
    windup: { ...coilBack, armRRaise: 0.2, elbowR: 2.3, armLRaise: 0.9, elbowL: 2.0, legRLift: 0.5, kneeR: 1.6 },
    hit: { legRLift: 1.7, kneeR: 0.05, footR: 0.5, torsoX: -0.55, pelvisY: -0.6, legLLift: 0, kneeL: 0.25, armLSpread: 1.0, armRSpread: 0.8 },
    spin: 1,
    trail: "ankleR",
  },
  holdUp: {
    windup: { ...crouch, torsoY: 0.8, armRRaise: -0.2, elbowR: 2.4, armLRaise: 0.9, elbowL: 2.1 },
    hit: { armRRaise: 3.05, elbowR: 0, torsoY: -0.4, torsoX: -0.35, legLLift: 1.3, kneeL: 2.0, legRLift: -0.2, kneeR: 0.1 },
    spin: 1,
    trail: "handR",
  },
  holdDown: {
    windup: { ...crouch, armLRaise: 1.2, elbowL: 2.0, armRRaise: 1.2, elbowR: 2.0 },
    hit: { hipY: -0.5, legLLift: 1.5, legLSpread: 1.2, kneeL: 0, legRLift: 1.5, legRSpread: 1.2, kneeR: 0, armLSpread: 1.4, armRSpread: 1.4 },
    trail: "ankleR",
  },
  holdHeavy: {
    windup: { ...coilBack, hipY: -0.25, legRLift: 1.0, kneeR: 2.2, armLRaise: 1.2, elbowL: 2.0 },
    hit: { legRLift: 1.55, kneeR: 0, footR: 0.4, legLLift: 0.9, kneeL: 2.2, torsoX: -0.3, armLSpread: 1.2, armRSpread: 0.6, armRRaise: -0.4 },
    trail: "ankleR",
  },
  holdHeavyDown: {
    windup: { legRLift: 2.8, kneeR: 0, torsoX: -0.4, armLSpread: 1.0, armRSpread: 1.0 },
    hit: { legRLift: 0.4, kneeR: 0.1, footR: -0.3, torsoX: 0.5, legLLift: 0.9, kneeL: 1.8, armLRaise: 0.3, armRRaise: 0.3 },
    trail: "ankleR",
  },
};

const overhead: PosePatch = { armRRaise: 2.9, elbowR: 0.6, wristR: 0.3, torsoX: -0.25, torsoY: 0.6 };
const sheathe: PosePatch = { hipY: -0.28, torsoY: 1.0, torsoX: 0.35, armRRaise: 0.4, armRSpread: -0.7, elbowR: 1.7, wristR: -1.0, legLLift: 0.9, kneeL: 1.3, kneeR: 0.8 };

const SAMURAI: Record<ChargeKey, StrikeAnim> = {
  holdSide: { windup: overhead, hit: { armRRaise: 1.1, elbowR: 0, wristR: -1.5, torsoX: 0.4, torsoY: -0.6, legLLift: 1.0, kneeL: 1.1, legRLift: -0.6 }, trail: "tip" },
  holdUp: { windup: { ...crouch, armRRaise: 0.3, wristR: -1.4 }, hit: { armRRaise: 3.3, elbowR: 0, wristR: 0.3, torsoX: -0.45, kneeL: 0.3, kneeR: 0.3 }, trail: "tip" },
  holdDown: { windup: { ...crouch, armRRaise: 1.5, armRSpread: -1.0, wristR: -1.5 }, hit: { ...crouch, armRRaise: 1.4, armRSpread: 1.4, elbowR: 0, wristR: -1.5 }, spin: 2, trail: "tip" },
  holdHeavy: { windup: sheathe, hit: { hipZ: 0.35, hipY: -0.3, torsoY: -0.8, torsoX: 0.3, armRRaise: 1.5, armRSpread: 0.4, elbowR: 0, wristR: -1.5, legLLift: 1.2, kneeL: 1.3, legRLift: -0.8 }, trail: "tip" },
  holdHeavyDown: { windup: { ...overhead, armLRaise: 2.6, elbowL: 0.6 }, hit: { hipY: -0.5, torsoX: 0.8, armRRaise: 0.6, elbowR: 0, wristR: -1.9, armLRaise: 0.6, legLLift: 1.2, kneeL: 1.9, kneeR: 1.2 }, trail: "tip" },
};

const gather: PosePatch = { armLRaise: 0.8, elbowL: 1.8, armRRaise: 0.9, elbowR: 1.6, torsoX: 0.2, hipY: -0.1, kneeL: 0.6, kneeR: 0.6 };
const thrust: PosePatch = { armLRaise: 1.55, elbowL: 0.05, armRRaise: 1.5, elbowR: 0.1, torsoX: 0.2, torsoY: -0.2 };

const MAGE: Record<ChargeKey, StrikeAnim> = {
  holdSide: { windup: gather, hit: thrust, trail: "handL" },
  holdUp: { windup: { ...gather, hipY: -0.2 }, hit: { armLRaise: 3.0, armRRaise: 3.0, elbowL: 0.1, elbowR: 0.1, torsoX: -0.3 }, trail: "handL" },
  holdDown: { windup: { ...gather, armLRaise: 2.4, armRRaise: 2.4 }, hit: { ...crouch, armLRaise: 0.1, armRRaise: 0.1, armLSpread: 0.8, armRSpread: 0.8, torsoX: 0.4 }, trail: "handL" },
  holdHeavy: { windup: { ...gather, torsoY: 0.6 }, hit: { ...thrust, legLLift: 0.6, kneeL: 0.9, legRLift: -0.4 }, trail: "handL" },
  holdHeavyDown: { windup: { armLRaise: 2.2, armRRaise: 2.2, elbowL: 0.8, elbowR: 0.8, torsoX: -0.3 }, hit: { armLRaise: 2.9, armRRaise: 1.6, elbowL: 0, elbowR: 0, torsoX: -0.2, neckX: -0.4 }, trail: "handL" },
};

const heave: PosePatch = { armRRaise: 2.2, elbowR: 1.4, armRSpread: 0.6, torsoY: 1.0, torsoX: -0.15, hipY: -0.15, kneeL: 0.7, kneeR: 0.7 };

const BEAR: Record<ChargeKey, StrikeAnim> = {
  holdSide: { windup: heave, hit: { armRRaise: 1.5, elbowR: 0, armRSpread: -0.2, torsoY: -0.8, torsoX: 0.4, legLLift: 0.8, kneeL: 1.0 }, trail: "handR" },
  holdUp: { windup: { ...crouch, armLRaise: -0.3, armRRaise: -0.3, elbowL: 1.6, elbowR: 1.6 }, hit: { armLRaise: 3.1, armRRaise: 3.1, elbowL: 0.2, elbowR: 0.2, torsoX: -0.4, kneeL: 0.2, kneeR: 0.2 }, trail: "handR" },
  holdDown: { windup: { armLRaise: 2.9, armRRaise: 2.9, elbowL: 0.6, elbowR: 0.6, torsoX: -0.3 }, hit: { ...crouch, armLRaise: 0.9, armRRaise: 0.9, elbowL: 0, elbowR: 0, torsoX: 0.7 }, trail: "handR" },
  holdHeavy: { windup: { ...crouch, torsoX: 0.5, armLRaise: 0.4, armRRaise: 0.4, elbowL: 1.8, elbowR: 1.8 }, hit: { torsoX: -0.35, neckX: -0.5, armLSpread: 1.3, armRSpread: 1.3, armLRaise: 0.9, armRRaise: 0.9 }, trail: "none" },
  holdHeavyDown: { windup: { ...crouch, armLRaise: 2.6, armRRaise: 2.6 }, hit: { legLLift: 1.3, kneeL: 1.8, legRLift: 1.3, kneeR: 1.8, armLRaise: 1.6, armRRaise: 1.6, armLSpread: 0.9, armRSpread: 0.9, torsoX: 0.4 }, trail: "none" },
};

export const CHARGED_ANIMS: Record<CharacterId, Record<ChargeKey, StrikeAnim>> = { karate: KARATE, samurai: SAMURAI, mage: MAGE, bear: BEAR };
