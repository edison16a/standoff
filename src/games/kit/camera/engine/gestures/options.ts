import { DEFAULT_GUARD, type GuardOptions } from "./guard";
import { DEFAULT_LINE, type LineOptions } from "./head-line";
import { DEFAULT_HEAD, type HeadMoveOptions } from "./head-moves";
import { DEFAULT_LANE, type LaneOptions } from "./lane";
import { DEFAULT_LEAN, type LeanOptions } from "./lean";
import { DEFAULT_PUNCH, type PunchOptions } from "./punch";

/** Every threshold of every move, grouped by move. Each one can be tuned by a game. */
export interface MoveOptions {
  lane: LaneOptions;
  /** Jumps and ducks: the band around the head line and its timing. */
  head: HeadMoveOptions;
  /** How the head line follows a player at rest. */
  line: LineOptions;
  lean: LeanOptions;
  guard: GuardOptions;
  punch: PunchOptions;
}

export const DEFAULT_MOVES: MoveOptions = {
  lane: DEFAULT_LANE,
  head: DEFAULT_HEAD,
  line: DEFAULT_LINE,
  lean: DEFAULT_LEAN,
  guard: DEFAULT_GUARD,
  punch: DEFAULT_PUNCH,
};

/** Any subset of any group, for example `{ lane: { lanes: 5 }, head: { up: 0.3 } }`. */
export type MoveTuning = { [K in keyof MoveOptions]?: Partial<MoveOptions[K]> };

export function tune(base: MoveOptions, patch: MoveTuning = {}): MoveOptions {
  return {
    lane: { ...base.lane, ...patch.lane },
    head: { ...base.head, ...patch.head },
    line: { ...base.line, ...patch.line },
    lean: { ...base.lean, ...patch.lean },
    guard: { ...base.guard, ...patch.guard },
    punch: { ...base.punch, ...patch.punch },
  };
}
