import type { PosePatch } from "./pose";
import type { BaseStyle } from "./style";

/*
 * The staff runs along the fist. Its tilt is armRRaise + elbowR + wristR:
 * 0 holds it upright with the gem on top, about -1.6 points the gem
 * forward and 1.6 points the heel forward, for a poke.
 */
const skyward: PosePatch = { armRRaise: 2.9, elbowR: 0.1, wristR: -3.0, armLRaise: 2.6, elbowL: 0.3, armLSpread: 0.4, torsoX: -0.2, neckX: -0.3, hipY: 0.1 };
const hunch: PosePatch = { armLRaise: 1.2, elbowL: 2.2, armLSpread: -0.4, armRRaise: 1.2, elbowR: 2.0, wristR: -3.2, torsoX: 0.4, hipY: -0.15, kneeL: 0.7, kneeR: 0.7, legLLift: 0.35, legRLift: 0.35 };
const nova: PosePatch = { armLSpread: 1.5, armRSpread: 1.5, armLRaise: 1.4, armRRaise: 1.4, elbowL: 0, elbowR: 0, wristR: -1.4, torsoX: -0.25, neckX: -0.3, hipY: 0, kneeL: 0.2, kneeR: 0.2, legLLift: 0, legRLift: 0 };
const castL: PosePatch = { armLRaise: 1.6, elbowL: 0, armLSpread: -0.1, torsoY: -0.5, armRRaise: 0.6, elbowR: 1.2, wristR: -1.8 };

/** Mage: an upright scholar with the staff planted, who throws spells from both hands. */
export const MAGE_STYLE: BaseStyle = {
  stance: { torsoX: 0.12, neckX: 0.1, kneeL: 0.15, kneeR: 0.15, armRRaise: 0.3, elbowR: 1.1, wristR: -1.4, armLRaise: 0.6, elbowL: 1.2, armLSpread: 0.3 },
  runArms: { armRRaise: 0.3, elbowR: 1.1, wristR: -1.4, armLRaise: 0.2, elbowL: 0.9 },
  armSwing: 0.4,
  runLean: 0.3,
  stride: 1.9,
  guard: { armLRaise: 1.3, elbowL: 1.8, armLSpread: -0.3, armRRaise: 1.1, elbowR: 1.2, wristR: -2.3 },
  win: { armRRaise: 2.9, elbowR: 0.2, wristR: -3.1, armLRaise: 2.6, elbowL: 0.2, armLSpread: 0.5 },
  moves: {
    jab: { windup: { armRRaise: 0.8, elbowR: 1.8, wristR: -1.1, torsoY: 0.3 }, hit: { armRRaise: 1.5, elbowR: 0.1, wristR: -0.1, torsoY: -0.3, hipZ: 0.1 }, trail: "none" },
    // Spark: a gliding step forward behind an open palm.
    side: {
      windup: { armLRaise: 0.5, elbowL: 2.1, armLSpread: -0.3, torsoY: 0.6, torsoX: 0.2, hipY: -0.1, legLLift: 0.6, kneeL: 0.8, legRLift: -0.3 },
      hit: { ...castL, torsoX: 0.3, hipY: -0.14, legLLift: 0.85, kneeL: 0.9, legRLift: -0.55, kneeR: 0.15 },
      trail: "handL",
    },
    up: { windup: { hipY: -0.12, kneeL: 0.5, kneeR: 0.5, armRRaise: 0.2 }, hit: { ...skyward, hipY: 0 }, trail: "tip" },
    down: {
      windup: { armRRaise: 1.6, elbowR: 0.6, wristR: -2.2 },
      hit: { hipY: -0.25, kneeL: 1, kneeR: 1, legLLift: 0.5, legRLift: 0.5, torsoX: 0.35, armRRaise: 1.0, elbowR: 0, wristR: -3.3 },
      trail: "tip",
    },
    air: {
      windup: { armLRaise: 1.0, elbowL: 1.5, armRRaise: 1.0, elbowR: 1.2 },
      hit: { armLRaise: 1.5, armLSpread: 1.4, elbowL: 0, armRRaise: 1.5, armRSpread: 1.4, elbowR: 0, wristR: -1.5, legLLift: 0.8, kneeL: 1.2 },
      spin: 1,
      trail: "tip",
    },
    airUp: { windup: { armLRaise: 0.2, armRRaise: 0.2, elbowR: 1.4, wristR: -1.6 }, hit: { armLRaise: 2.9, elbowL: 0, armRRaise: 2.9, elbowR: 0, wristR: -2.9 }, trail: "tip" },
    airDown: {
      windup: { armLRaise: 2.6, armRRaise: 2.6, elbowR: 0, wristR: -2.6, legLLift: 0.6, kneeL: 1.0 },
      hit: { armLRaise: 0.3, armRRaise: 0.3, armLSpread: 0.2, armRSpread: 0.2, elbowR: 0, elbowL: 0, wristR: -3.4, legLLift: 1.3, kneeL: 2.0, legRLift: 1.3, kneeR: 2.0 },
      trail: "tip",
    },
    heavy: { windup: { armLRaise: 0.6, elbowL: 2.1, torsoY: 0.6 }, hit: castL, trail: "handL" },
    heavySide: {
      windup: { armLRaise: 0.3, elbowL: 1.9, armRRaise: 0.4, elbowR: 1.9, wristR: -2.3, hipZ: -0.1, torsoX: -0.15 },
      hit: { armLRaise: 1.55, elbowL: 0, armRRaise: 1.55, elbowR: 0, wristR: -1.55, torsoX: 0.25, hipZ: 0.15, legLLift: 0.6, kneeL: 0.7, legRLift: -0.4 },
      trail: "tip",
    },
    heavyUp: { windup: hunch, hit: { ...skyward, armLSpread: 1.0 }, trail: "tip" },
    heavyDown: { windup: hunch, hit: nova, trail: "none" },
    ult: { windup: skyward, hit: nova, keys: [[0, {}], [12, skyward], [36, { ...skyward, armLSpread: 0.9 }], [42, nova], [60, nova]], trail: "tip" },
  },
};
