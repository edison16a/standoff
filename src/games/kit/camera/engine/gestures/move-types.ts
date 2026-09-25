import type { HeadLineView } from "./head-line";
import type { Side } from "./lean";
import type { Punch } from "./punch";

/** Everything one player is doing right now. Games read it every frame. */
export interface MoveState {
  slot: number;
  /** In view now. */
  present: boolean;
  /** Has a head line. Jumps, ducks and lanes need one. Guard, punches and leans work without. */
  calibrated: boolean;
  lane: number;
  /**
   * The head against its line, in the player's shoulder widths. `rise` is
   * above the line, negative below. `side` is the head and shoulders right
   * of home, negative left. Both 0 before calibration.
   */
  head: { rise: number; side: number };
  jumping: boolean;
  ducking: boolean;
  lean: Side;
  guard: boolean;
  /** How clearly each move is happening, 0 to 1. */
  confidence: { lane: number; jump: number; duck: number; lean: number; guard: number };
  /** How far up and down the head is from its line in shoulder widths, and the lean in torso lengths. Never negative but the lean. */
  amounts: { rise: number; drop: number; lean: number };
  /** The head line and its band where they sit in the picture now, for drawing. Null before calibration. */
  line: HeadLineView | null;
}

/** Something that happened, on the frame it happened. Punches only ever arrive as events. */
export type MoveEvent = { slot: number; time: number } & (
  | { type: "jump"; confidence: number }
  | { type: "land" }
  | { type: "duck"; confidence: number }
  | { type: "stand" }
  | { type: "lane"; lane: number; from: number }
  | { type: "lean"; side: Side }
  | { type: "guard"; up: boolean }
  | ({ type: "punch" } & Punch)
  | { type: "away" }
  | { type: "back" }
);

export function idleState(slot: number, calibrated = false): MoveState {
  return {
    slot,
    present: false,
    calibrated,
    lane: 0,
    head: { rise: 0, side: 0 },
    jumping: false,
    ducking: false,
    lean: 0,
    guard: false,
    confidence: { lane: 0, jump: 0, duck: 0, lean: 0, guard: 0 },
    amounts: { rise: 0, drop: 0, lean: 0 },
    line: null,
  };
}
