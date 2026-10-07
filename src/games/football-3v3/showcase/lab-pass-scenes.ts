import type { PassStage } from "./lab-pass";

/**
 * The lab's staged passes and line play (lab-pass.ts). The receiver is
 * set out from the QB, a defender out from the receiver: `f` metres
 * along the offense's way and `c` across. Each catch stage asks for the
 * move it shows and how it finishes.
 */
export const PASS_STAGES = {
  // Catches the game logic picks from how the ball arrives.
  chest: { call: "throw", wr: { at: [9, 2] }, want: { who: "wr", kind: "chest", result: "held" }, length: 2.6 },
  highpoint: { call: "throw", wr: { at: [10, 0] }, loft: 3.2, want: { who: "wr", kind: "high", result: "held" }, length: 2.8 },
  layout: { call: "throw", wr: { at: [9, 0] }, shift: [0, 2.5], want: { who: "wr", kind: "dive", result: "held" }, length: 2.8 },
  shoulder: { call: "throw", wr: { at: [5, 3], move: [1, 0] }, throwAt: 0.9, want: { who: "wr", kind: "shoulder", result: "held" }, length: 3.4 },
  traffic: { call: "throw", wr: { at: [9, 1] }, d: { at: [0.9, 0.5] }, want: { who: "wr", kind: "stumble", result: "held" }, length: 2.8 },
  jarred: { call: "throw", wr: { at: [9, 1] }, d: { at: [0.9, 0.4], move: [-1, -0.3] }, want: { who: "wr", kind: "stumble", result: "jarred" }, length: 2.8 },
  // A defender in the lane: he picks it with a leap, or a computer defender gets a hand up and swats it.
  pick: { call: "throw", wr: { at: [11, 0] }, d: { at: [-1.6, 0.3] }, want: { who: "d", kind: "pick", result: "held" }, length: 2.8 },
  swat: { call: "throw", wr: { at: [11, 0] }, d: { at: [-1.6, 0.5], auto: true }, unread: true, want: { who: "d", kind: "swat", result: "swatted" }, length: 2.8 },
  // Line play from the snap, the middle pair held in one block move.
  passset: { call: "throw", block: { kind: "pass", at: 0.45 }, length: 2.6 },
  driveblock: { call: "run", block: { kind: "drive", at: 0.45 }, length: 2.6 },
  anchor: { call: "throw", block: { kind: "anchor", at: 0.45 }, length: 2.6 },
  pancake: { call: "run", block: { kind: "pancake", at: 0.9 }, length: 3.6 },
  ripby: { call: "throw", block: { kind: "shed", at: 1.0 }, length: 3.2 },
} satisfies Record<string, PassStage>;

export type PassMove = keyof typeof PASS_STAGES;
export const PASS_MOVES = Object.keys(PASS_STAGES) as PassMove[];
