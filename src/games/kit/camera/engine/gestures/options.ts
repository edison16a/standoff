import { DEFAULT_DUCK, type DuckOptions } from "./duck";
import { DEFAULT_GUARD, type GuardOptions } from "./guard";
import { DEFAULT_JUMP, type JumpOptions } from "./jump";
import { DEFAULT_LANE, type LaneOptions } from "./lane";
import { DEFAULT_LEAN, type LeanOptions } from "./lean";
import { DEFAULT_PUNCH, type PunchOptions } from "./punch";

export interface ReferenceOptions {
  /** How slowly the standing reference follows a neutral player, as a time constant in milliseconds. */
  followMs: number;
  /** A change of size bigger than this share means the player stepped nearer or further. */
  resizeAt: number;
  /** Moving faster than this, in torso lengths per second, is not neutral. */
  restSpeed: number;
}

/** Every threshold of every move, grouped by move. Each one can be tuned by a game. */
export interface MoveOptions {
  lane: LaneOptions;
  jump: JumpOptions;
  duck: DuckOptions;
  lean: LeanOptions;
  guard: GuardOptions;
  punch: PunchOptions;
  reference: ReferenceOptions;
}

export const DEFAULT_MOVES: MoveOptions = {
  lane: DEFAULT_LANE,
  jump: DEFAULT_JUMP,
  duck: DEFAULT_DUCK,
  lean: DEFAULT_LEAN,
  guard: DEFAULT_GUARD,
  punch: DEFAULT_PUNCH,
  reference: { followMs: 2000, resizeAt: 0.12, restSpeed: 0.8 },
};

/** Any subset of any group, for example `{ lane: { lanes: 5 }, jump: { rise: 0.25 } }`. */
export type MoveTuning = { [K in keyof MoveOptions]?: Partial<MoveOptions[K]> };

export function tune(base: MoveOptions, patch: MoveTuning = {}): MoveOptions {
  return {
    lane: { ...base.lane, ...patch.lane },
    jump: { ...base.jump, ...patch.jump },
    duck: { ...base.duck, ...patch.duck },
    lean: { ...base.lean, ...patch.lean },
    guard: { ...base.guard, ...patch.guard },
    punch: { ...base.punch, ...patch.punch },
    reference: { ...base.reference, ...patch.reference },
  };
}
