import type { PosePatch } from "./pose";
import type { Style } from "./style";

const punchR: PosePatch = { armRRaise: 1.55, elbowR: 0.05, armRSpread: -0.1, armLRaise: 0.8, elbowL: 2.2, torsoY: -0.4, hipZ: 0.08 };
const punchL: PosePatch = { armLRaise: 1.55, elbowL: 0.05, armLSpread: -0.1, armRRaise: 0.8, elbowR: 2.2, torsoY: 0.4, hipZ: 0.08 };
const coil: PosePatch = { hipY: -0.25, torsoY: 0.9, armRRaise: 0.2, elbowR: 2.3, armLRaise: 0.8, elbowL: 2.2, kneeL: 1, kneeR: 1, legLLift: 0.5, legRLift: 0.5 };
const uppercut: PosePatch = { hipY: 0, armRRaise: 3.0, elbowR: 0, armRSpread: -0.1, torsoY: -0.3, torsoX: -0.3, legLLift: 1.2, kneeL: 2.0, legRLift: -0.2, kneeR: 0.1 };

/** Karate: a bouncy fighting stance, snappy punches and high, wide kicks. */
export const KARATE_STYLE: Style = {
  stance: { torsoY: 0.25, hipY: -0.06, legLLift: 0.35, kneeL: 0.45, footL: -0.1, legRLift: -0.25, kneeR: 0.35, armLRaise: 1.0, elbowL: 1.9, armRRaise: 0.7, elbowR: 2.1, armLSpread: 0.15, armRSpread: 0.2 },
  runArms: { armLRaise: 0.3, armRRaise: 0.3, elbowL: 1.5, elbowR: 1.5, torsoY: 0 },
  armSwing: 1,
  runLean: 0.35,
  stride: 2.2,
  guard: { armLRaise: 1.4, armRRaise: 1.4, elbowL: 2.3, elbowR: 2.3, armLSpread: -0.3, armRSpread: -0.3 },
  win: { armLRaise: 2.9, elbowL: 0.1, armRRaise: 0.8, elbowR: 2.0, legRLift: 0, kneeR: 0.1, torsoY: 0 },
  moves: {
    jab: { windup: { armRRaise: 1.0, elbowR: 2.2, torsoY: 0.45 }, hit: punchR, trail: "handR" },
    side: {
      windup: { legRLift: 0.9, kneeR: 2.0, torsoX: -0.15, pelvisY: 0.4, armLRaise: 0.6 },
      hit: { legRLift: 1.6, kneeR: 0.05, footR: 0.5, torsoX: -0.5, pelvisY: -0.5, legLLift: 0, kneeL: 0.25, armLSpread: 0.9 },
      trail: "ankleR",
    },
    up: {
      windup: { legRLift: 0.7, kneeR: 1.8 },
      hit: { legRLift: 2.7, kneeR: 0, footR: 0.3, torsoX: -0.65, armLSpread: 0.9, armRSpread: 0.9, armLRaise: 0.4, armRRaise: 0.4, legLLift: 0, kneeL: 0.2 },
      trail: "ankleR",
    },
    down: {
      windup: { hipY: -0.3, legLLift: 1.2, kneeL: 2.0, footL: -0.8, torsoX: 0.35, legRLift: 0.4, kneeR: 1.2 },
      hit: { hipY: -0.42, legLLift: 1.3, kneeL: 2.3, footL: -1.0, legRLift: 1.45, kneeR: 0, torsoX: 0.4, armLRaise: 0.2, armLSpread: 0.9 },
      trail: "ankleR",
    },
    air: {
      windup: { legRLift: 0.6, kneeR: 1.2, torsoX: 0.2 },
      hit: { legRLift: 1.9, kneeR: 2.4, torsoX: -0.1, armLRaise: -0.5, armRRaise: -0.5, elbowL: 0.3, elbowR: 0.3, legLLift: -0.3, kneeL: 0.8 },
      trail: "none",
    },
    airUp: {
      windup: { legLLift: 1.5, kneeL: 1.8, legRLift: 1.2, kneeR: 1.6 },
      hit: { legRLift: 2.8, kneeR: 0, legLLift: 1.2, kneeL: 1.5 },
      alt: { legLLift: 2.8, kneeL: 0, legRLift: 1.2, kneeR: 1.5 },
      flip: -1,
      trail: "ankleR",
    },
    airDown: {
      windup: { legLLift: 1.7, kneeL: 2.3, legRLift: 1.7, kneeR: 2.3, armLRaise: 2.2, armRRaise: 2.2 },
      hit: { legLLift: 0.1, kneeL: 0, legRLift: -0.1, kneeR: 0, footL: 0.8, footR: 0.8, armLRaise: 2.8, armRRaise: 2.8, torsoX: 0.1 },
      trail: "ankleR",
    },
    heavy: {
      windup: { armRRaise: 0.3, elbowR: 2.3, torsoY: 0.9, hipZ: -0.12, hipY: -0.1, kneeL: 0.7, kneeR: 0.7 },
      hit: { ...punchR, armRRaise: 1.6, elbowR: 0, torsoY: -0.7, torsoX: 0.3, hipZ: 0.25, hipY: -0.12, legLLift: 0.8, kneeL: 0.9, legRLift: -0.5, kneeR: 0.1 },
      trail: "handR",
    },
    heavySide: {
      windup: { legRLift: 1.2, kneeR: 2.2, legLLift: 0.5, kneeL: 1.5, torsoX: 0.2 },
      hit: { legRLift: 1.6, kneeR: 0, footR: 0.3, legLLift: 0.6, kneeL: 2.2, torsoX: -0.7, armLRaise: 1.0, armRRaise: -0.4, armLSpread: 0.5 },
      trail: "ankleR",
    },
    heavyUp: { windup: coil, hit: uppercut, spin: 2, trail: "handR" },
    heavyDown: {
      windup: { hipY: -0.35, legLLift: 1.1, kneeL: 2.1, footL: -1, torsoX: 0.4 },
      hit: { hipY: -0.45, legLLift: 1.3, kneeL: 2.3, footL: -1, legRLift: 0.2, legRSpread: 1.45, kneeR: 0, armLRaise: 0.4, armLSpread: 0.4, torsoX: 0.4 },
      spin: 1,
      trail: "ankleR",
    },
    ult: {
      windup: coil,
      hit: punchR,
      keys: [[0, {}], [10, coil], [14, punchR], [19, punchL], [24, punchR], [29, punchL], [34, punchR], [38, coil], [41, uppercut], [60, uppercut]],
      trail: "handR",
    },
  },
};
