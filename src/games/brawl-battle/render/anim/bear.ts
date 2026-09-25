import type { PosePatch } from "./pose";
import type { BaseStyle } from "./style";

const crouch: PosePatch = { hipY: -0.2, kneeL: 1.2, kneeR: 1.2, legLLift: 0.6, legRLift: 0.6, footL: -0.6, footR: -0.6, torsoX: 0.4 };
const raised: PosePatch = { armLRaise: 3.0, armRRaise: 3.0, elbowL: 0.7, elbowR: 0.7, armLSpread: 0.1, armRSpread: 0.1, torsoX: -0.3 };
const pound: PosePatch = { armLRaise: 1.2, armRRaise: 1.2, elbowL: 0, elbowR: 0, armLSpread: -0.2, armRSpread: -0.2, torsoX: 0.8, hipY: -0.3, kneeL: 1.3, kneeR: 1.3, legLLift: 0.7, legRLift: 0.7, footL: -0.6, footR: -0.6 };
const wide: PosePatch = { armLRaise: 1.5, armLSpread: 1.4, armRRaise: 1.5, armRSpread: 1.4, elbowL: 0.2, elbowR: 0.2 };

/** Bear: hunched and heavy, arms wide. Everything he does is a big, slow swing. */
export const BEAR_STYLE: BaseStyle = {
  stance: { torsoX: 0.25, neckX: -0.15, hipY: -0.04, armLRaise: 0.5, armRRaise: 0.5, armLSpread: 0.45, armRSpread: 0.45, elbowL: 0.9, elbowR: 0.9, legLLift: 0.25, kneeL: 0.35, legRLift: 0.25, kneeR: 0.35, legLSpread: 0.12, legRSpread: 0.12 },
  runArms: { elbowL: 1.0, elbowR: 1.0, armLSpread: 0.35, armRSpread: 0.35 },
  armSwing: 0.8,
  runLean: 0.45,
  stride: 2.0,
  guard: { armLRaise: 1.3, armRRaise: 1.3, elbowL: 2.0, elbowR: 2.0, armLSpread: -0.25, armRSpread: -0.25, torsoX: 0.35 },
  win: { armLRaise: 1.6, armRRaise: 1.6, armLSpread: 1.4, armRSpread: 1.4, elbowL: 2.0, elbowR: 2.0, neckX: -0.4, torsoX: -0.2 },
  moves: {
    jab: { windup: { armRRaise: 2.4, elbowR: 0.4, torsoY: 0.4 }, hit: { armRRaise: 1.0, elbowR: 0.2, torsoY: -0.4, torsoX: 0.35 }, trail: "handR" },
    side: {
      windup: { armRRaise: 2.9, elbowR: 0.6, armLRaise: 0.3, torsoX: -0.25, torsoY: 0.5, hipZ: -0.1 },
      hit: { armRRaise: 0.9, elbowR: 0, torsoX: 0.5, torsoY: -0.5, hipZ: 0.2, legLLift: 0.7, kneeL: 0.8 },
      trail: "handR",
    },
    up: {
      windup: { torsoX: 0.7, neckX: 0.5, hipY: -0.15, kneeL: 1.0, kneeR: 1.0, legLLift: 0.5, legRLift: 0.5 },
      hit: { torsoX: -0.5, neckX: -0.6, hipY: 0.15, armLRaise: -0.4, armRRaise: -0.4, kneeL: 0.1, kneeR: 0.1, legLLift: 0, legRLift: 0 },
      trail: "none",
    },
    down: {
      windup: { hipY: 0.15, armLRaise: 2.8, armRRaise: 2.8, torsoX: -0.2 },
      hit: { hipY: -0.3, pelvisX: 1.2, torsoX: 0.2, armLRaise: 2.9, armRRaise: 2.9, armLSpread: 0.6, armRSpread: 0.6, legLLift: -0.4, legRLift: -0.4, neckX: -0.8 },
      trail: "none",
    },
    air: { windup: { armLRaise: 1.0, elbowL: 1.6, armRRaise: 1.0, elbowR: 1.6 }, hit: wide, spin: 1, trail: "handR" },
    airUp: { windup: { armRRaise: 0.2, elbowR: 1.2, legLLift: 0.8, kneeL: 1.4 }, hit: { armRRaise: 3.0, elbowR: 0, armLRaise: 2.8, neckX: -0.4 }, trail: "handR" },
    airDown: {
      windup: raised,
      hit: { torsoX: 0.6, neckX: 0.4, legLLift: 1.8, legRLift: 1.8, kneeL: 2.2, kneeR: 2.2, armLRaise: 1.3, armRRaise: 1.3, elbowL: 1.4, elbowR: 1.4, armLSpread: 0, armRSpread: 0 },
      flip: 1,
      trail: "none",
    },
    heavy: {
      windup: { ...raised, hipZ: -0.12, torsoX: -0.35, torsoY: 0.3 },
      hit: { armLRaise: 1.1, armRRaise: 1.1, elbowL: 0, elbowR: 0, torsoX: 0.6, torsoY: 0, hipZ: 0.25, legLLift: 0.9, kneeL: 1.0, legRLift: -0.5 },
      trail: "handR",
    },
    heavySide: {
      windup: { ...crouch, armLRaise: -0.6, armRRaise: -0.6 },
      hit: { torsoX: 0.8, neckX: -0.5, armRRaise: 0.3, armRSpread: 0.8, elbowR: 1.8, armLRaise: -0.8, legLLift: 1.0, kneeL: 1.2, legRLift: -0.6, kneeR: 0.3, hipY: -0.15 },
      trail: "none",
    },
    heavyUp: { windup: crouch, hit: { ...raised, hipY: 0, kneeL: 0.6, kneeR: 0.6, legLLift: 0.4, legRLift: 0.4, footL: 0, footR: 0 }, trail: "handR" },
    heavyDown: { windup: { ...raised, hipY: 0.05 }, hit: pound, trail: "handR" },
    ult: {
      windup: crouch,
      hit: pound,
      keys: [[0, {}], [9, { ...crouch, armLRaise: -0.5, armRRaise: -0.5 }], [14, { ...wide, armLRaise: 2.6, armRRaise: 2.6, hipY: 0, legLLift: 1.0, kneeL: 1.8, legRLift: 1.0, kneeR: 1.8 }], [28, { ...raised, legLLift: 0.2, kneeL: 0.3, legRLift: 0.2, kneeR: 0.3 }], [37, pound], [55, pound]],
      trail: "handR",
    },
  },
};
