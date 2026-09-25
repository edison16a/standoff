import type { Level, Mode, Orb, Pad } from "./types";

/** One player's avatar in a level, at one instant. Plain data, so it can be copied for checkpoints. */
export interface PlayerState {
  /** The middle of the player. */
  x: number;
  y: number;
  vy: number;
  mode: Mode;
  /** 1 when gravity pulls down, -1 when a ball rolls on the ceiling. */
  gravity: 1 | -1;
  /** Standing on a surface on the gravity side. */
  grounded: boolean;
  /** How far the avatar has turned, in radians, counter clockwise. */
  angle: number;
  speed: number;
  /** Time left on a jump pressed a moment too early. */
  buffer: number;
  /** Time left to jump after running off an edge. */
  coyote: number;
  usedPads: Set<Pad>;
  usedOrbs: Set<Orb>;
  dead: boolean;
  finished: boolean;
}

/** Something that happened in a step, for sounds, sparks and the run's score. */
export type PlayerEvent =
  | { type: "jump" }
  | { type: "flap" }
  | { type: "flip"; gravity: 1 | -1 }
  | { type: "land" }
  | { type: "pad"; x: number; y: number }
  | { type: "orb"; x: number; y: number }
  | { type: "portal"; mode: Mode }
  | { type: "speed"; speed: number; faster: boolean }
  | { type: "death"; x: number; y: number }
  | { type: "finish" };

/** The player standing at the start of a level. */
export function startState(level: Level): PlayerState {
  return {
    x: 0,
    y: level.startMode === "ufo" ? 3 : 0.46,
    vy: 0,
    mode: level.startMode,
    gravity: 1,
    grounded: level.startMode !== "ufo",
    angle: 0,
    speed: level.startSpeed,
    buffer: 0,
    coyote: 0,
    usedPads: new Set(),
    usedOrbs: new Set(),
    dead: false,
    finished: false,
  };
}

/** A copy that shares nothing with the original, for practice checkpoints. */
export function copyState(state: PlayerState): PlayerState {
  return { ...state, usedPads: new Set(state.usedPads), usedOrbs: new Set(state.usedOrbs) };
}
