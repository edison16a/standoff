import type { PosePatch } from "./pose";
import type { BaseStyle } from "./style";

/*
 * The katana points along the fist's forward axis. Its angle from
 * straight ahead is armRRaise + elbowR + wristR: 0 points forward,
 * about 1.6 up, about 3.1 back over the shoulder and -1.6 down.
 */
const overhead: PosePatch = { armRRaise: 2.8, elbowR: 0.8, wristR: 0.2, torsoX: -0.2, torsoY: 0.5, hipZ: -0.1 };
const cutDown: PosePatch = { armRRaise: 1.2, elbowR: 0, wristR: -1.6, torsoX: 0.35, torsoY: -0.5, hipZ: 0.2, legLLift: 0.9, kneeL: 1.0, legRLift: -0.6, kneeR: 0.1 };
const draw: PosePatch = { hipY: -0.2, torsoY: 0.8, torsoX: 0.3, armRRaise: 0.5, armRSpread: -0.6, elbowR: 1.6, wristR: -1.0, legLLift: 0.8, kneeL: 1.1, kneeR: 0.6 };
const iai: PosePatch = { hipZ: 0.3, hipY: -0.25, torsoY: -0.6, torsoX: 0.25, armRRaise: 1.55, armRSpread: 0.2, elbowR: 0, wristR: -1.55, legLLift: 1.1, kneeL: 1.3, legRLift: -0.7, kneeR: 0.1 };
const crouch: PosePatch = { hipY: -0.25, kneeL: 1.2, kneeR: 1.2, legLLift: 0.6, legRLift: 0.6 };

/** Samurai: a low wide stance with the blade forward, and long arcing cuts. */
export const SAMURAI_STYLE: BaseStyle = {
  stance: { torsoY: 0.2, hipY: -0.08, legLLift: 0.45, kneeL: 0.6, footL: -0.15, legRLift: -0.35, kneeR: 0.3, armRRaise: 0.7, elbowR: 0.9, wristR: -0.9, armLRaise: 0.9, elbowL: 1.2, armLSpread: -0.1 },
  runArms: { armRRaise: 0.4, elbowR: 0.6, wristR: -0.7, armLRaise: 0, elbowL: 0.8 },
  armSwing: 0.5,
  runLean: 0.45,
  stride: 2.1,
  guard: { armRRaise: 1.5, elbowR: 0.9, wristR: -0.8, armRSpread: -0.4, armLRaise: 1.2, elbowL: 1.6 },
  win: { armRRaise: 3.0, elbowR: 0.1, wristR: -1.5, armLRaise: 0.3, elbowL: 1.4, armLSpread: 0.3, legRLift: 0, kneeR: 0.1 },
  moves: {
    jab: { windup: { armRRaise: 2.2, elbowR: 0.6, wristR: 0.3, torsoY: 0.3 }, hit: { armRRaise: 1.4, elbowR: 0.1, wristR: -1.8, torsoY: -0.3 }, trail: "tip" },
    // Wide Slash dashes in: a low lunging step under the raised blade, then the cut carries through.
    side: {
      windup: { ...overhead, torsoX: 0.15, hipY: -0.12, legLLift: 0.7, kneeL: 1.0, legRLift: -0.45, kneeR: 0.3 },
      hit: { ...cutDown, hipY: -0.22, torsoX: 0.45 },
      follow: { ...cutDown, hipY: -0.18, torsoY: -0.75, wristR: -1.9, armRRaise: 0.9 },
      trail: "tip",
    },
    up: {
      windup: { armRRaise: 0.6, elbowR: 0.2, wristR: -1.2, torsoX: 0.2 },
      hit: { armRRaise: 3.2, elbowR: 0, wristR: 0.4, torsoX: -0.35 },
      trail: "tip",
    },
    down: {
      windup: { hipY: -0.2, armRRaise: 1.8, elbowR: 0.8, wristR: 0.4 },
      hit: { hipY: -0.4, kneeL: 1.8, legLLift: 1.1, footL: -0.7, legRLift: -0.4, kneeR: 1.2, torsoX: 0.5, armRRaise: 1.0, elbowR: 0, wristR: -1.5 },
      trail: "tip",
    },
    air: {
      windup: { armRRaise: 1.4, armRSpread: 0.6, elbowR: 0, wristR: -1.4, legLLift: 1.0, kneeL: 1.6 },
      hit: { armRRaise: 1.45, armRSpread: 1.3, elbowR: 0, wristR: -1.45, legLLift: 1.0, kneeL: 1.6, legRLift: 0.4, kneeR: 1.0 },
      spin: 1,
      trail: "tip",
    },
    airUp: { windup: { armRRaise: 0.5, elbowR: 0, wristR: -1.0, torsoX: 0.2 }, hit: { armRRaise: 3.1, elbowR: 0, wristR: 0, torsoX: -0.3 }, trail: "tip" },
    airDown: {
      windup: { armRRaise: 2.6, elbowR: 1.0, wristR: -2.0, legLLift: 0.6, kneeL: 1.0 },
      hit: { armRRaise: 0.3, elbowR: 0, wristR: -1.9, armLRaise: 0.3, legLLift: 1.2, kneeL: 2.0, legRLift: 1.2, kneeR: 2.0 },
      trail: "tip",
    },
    heavy: { windup: draw, hit: iai, trail: "tip" },
    heavySide: {
      windup: draw,
      hit: { armRRaise: -0.5, elbowR: 0, wristR: 0.5, torsoX: 0.55, torsoY: -0.6, hipY: -0.2, legLLift: 1.0, kneeL: 1.2, legRLift: -0.6, kneeR: 0.3 },
      trail: "tip",
    },
    heavyUp: { windup: { ...crouch, armRRaise: 0.5, wristR: -1.2 }, hit: { hipY: 0, kneeL: 0.3, kneeR: 0.3, armRRaise: 3.0, elbowR: 0, wristR: 0.2, torsoX: -0.3 }, flip: 1, trail: "tip" },
    heavyDown: {
      windup: { hipY: -0.2, armRRaise: 2.6, elbowR: 0.4, wristR: 0 },
      hit: { hipY: -0.45, kneeL: 2.0, legLLift: 1.2, footL: -0.8, armRRaise: 1.1, armRSpread: 1.2, elbowR: 0, wristR: -1.6, torsoX: 0.5 },
      spin: 1,
      trail: "tip",
    },
    ult: {
      windup: draw,
      hit: iai,
      keys: [[0, {}], [16, draw], [21, cutDown], [26, overhead], [31, cutDown], [36, overhead], [41, cutDown], [48, draw], [53, iai], [70, iai]],
      trail: "tip",
    },
  },
};
