import type { LayupKind } from "../types";
import type { LayupSpec } from "./spec";
import { LAYUP_TRACKS as T } from "./tracks";

/**
 * The layups, each hand made. Timing is in seconds, distances in metres.
 * `evade` is how much of a defender's chance to block it the finish
 * takes away: a reverse uses the rim, a scoop and an up and under go
 * round the hands, a body shield keeps the ball the far side of him.
 */
export const LAYUP_SPEC: Record<LayupKind, LayupSpec> = {
  /** Finger roll from the front: up at full stretch and rolled soft off the fingertips. */
  finger: {
    gather: 0.36, air: 0.4, stop: 0.72, shift: 0, steps: "two", turn: null, yaw: "rim", track: T.front, blendFrom: 1.35,
    peak: 0.7, release: { up: 0.86, rim: 0.5, side: 0.05, ext: 0.96 }, family: "layup", apex: 0.42, backspin: [3, 5], evade: 0.1,
  },
  /** Under the backboard from the baseline, back to the rim, flipped up the far side. */
  reverse: {
    gather: 0.36, air: 0.46, stop: 0.6, shift: 0, steps: "two", turn: null, yaw: "path", track: T.reverse, blendFrom: 1.3,
    peak: 0.66, release: { up: 0.9, rim: 0.35, side: 0.1, ext: 0.95 }, family: "reverse", apex: 0.55, backspin: [6, 9], evade: 0.5,
  },
  /** Euro step: one step at the defender, a long step across, and up away from him. */
  euro: {
    gather: 0.5, air: 0.38, stop: 0.8, shift: 0.7, steps: "euro", turn: null, yaw: "rim", track: T.sweep, blendFrom: 1.35,
    peak: 0.62, release: { up: 0.85, rim: 0.45, side: 0.15, ext: 0.95 }, family: "auto", apex: 0.4, backspin: [5, 8], evade: 0.45,
  },
  /** Up and under: stop, show it high to get him up, then step through under his arms. */
  upUnder: {
    gather: 0.64, air: 0.34, stop: 0.72, shift: 0.55, steps: "fake", turn: null, yaw: "rim", track: T.fake, blendFrom: 1.3,
    peak: 0.5, release: { up: 0.62, rim: 0.6, side: 0.28, ext: 0.92 }, family: "layup", apex: 0.55, backspin: [6, 9], evade: 0.6,
  },
  /** Scoop: the ball kept low and away, then swung up underhand round the hands. */
  scoop: {
    gather: 0.38, air: 0.4, stop: 0.9, shift: 0.35, steps: "two", turn: null, yaw: "rim", track: T.low, blendFrom: 1.3,
    peak: 0.58, release: { up: 0.5, rim: 0.65, side: 0.35, ext: 0.9 }, family: "layup", apex: 0.78, backspin: [7, 10], evade: 0.5,
  },
  /** Teardrop: up early off one foot from short of the rim, high and soft over the big man. */
  teardrop: {
    gather: 0.2, air: 0.28, stop: 1.9, shift: 0, steps: "one", turn: null, yaw: "rim", track: T.high, blendFrom: 1.2,
    peak: 0.42, release: { up: 0.95, rim: 0.3, side: 0.04, ext: 0.97 }, family: "floater", apex: 1.15, backspin: [3, 6], evade: 0.55,
  },
  /** High off the glass from the wing, over a man at the rim. */
  glass: {
    gather: 0.38, air: 0.42, stop: 0.95, shift: 0, steps: "two", turn: null, yaw: "rim", track: T.front, blendFrom: 1.35,
    peak: 0.72, release: { up: 0.92, rim: 0.36, side: 0.08, ext: 0.97 }, family: "bank", apex: 0.62, backspin: [5, 8], evade: 0.35,
  },
  /** Off the wrong foot, a beat early, before a trailing shot blocker can time it. */
  wrongFoot: {
    gather: 0.22, air: 0.36, stop: 1.05, shift: 0, steps: "one", turn: null, yaw: "rim", track: T.high, blendFrom: 1.3,
    peak: 0.56, release: { up: 0.8, rim: 0.55, side: 0.1, ext: 0.94 }, family: "auto", apex: 0.48, backspin: [5, 8], evade: 0.4,
  },
  /** Spin layup: a full spin away from the defender on the gather, the ball tucked, then up. */
  spin: {
    gather: 0.52, air: 0.38, stop: 0.8, shift: 0.5, steps: "spin", turn: { turns: 1, during: "gather" }, yaw: "rim", track: T.tuck, blendFrom: 1.35,
    peak: 0.62, release: { up: 0.85, rim: 0.45, side: 0.15, ext: 0.95 }, family: "auto", apex: 0.42, backspin: [5, 8], evade: 0.45,
  },
  /** Body shield: the shoulder leaned into the defender and the ball up the far side in the far hand. */
  shield: {
    gather: 0.36, air: 0.4, stop: 0.9, shift: 0, steps: "two", turn: null, yaw: "rim", track: T.shield, blendFrom: 1.3,
    peak: 0.55, release: { up: 0.86, rim: 0.32, side: 0.32, ext: 0.96 }, family: "auto", apex: 0.48, backspin: [5, 8], evade: 0.5,
  },
  /** Power layup: a hard jump stop on both feet and up strong off the glass. */
  power: {
    gather: 0.42, air: 0.36, stop: 0.78, shift: 0, steps: "stop", turn: null, yaw: "rim", track: T.front, blendFrom: 1.35,
    peak: 0.62, release: { up: 0.9, rim: 0.4, side: 0, ext: 0.95 }, family: "auto", apex: 0.45, backspin: [5, 8], evade: 0.25,
  },
};
