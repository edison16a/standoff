import type { DunkStyle } from "../roster";
import type { Grade, Outcome, ShotKind } from "./shot-model";
import type { DribbleMove, TeamId } from "./types";

/**
 * Everything worth a sound, an effect, a buzz or an announcer line. The
 * match queues these as they happen and the host drains them each frame.
 */
export type MatchEvent =
  | { type: "countdown"; count: number }
  | { type: "go"; team: TeamId }
  | { type: "bounce"; id: number; x: number; z: number; power: number }
  | { type: "squeak"; id: number }
  | { type: "bump"; a: number; b: number; power: number }
  | { type: "gather"; id: number; kind: ShotKind }
  | { type: "shot"; id: number; kind: ShotKind; three: boolean; grade: Grade; chance: number; outcome: Outcome; made: boolean; contest: number }
  | { type: "takeoff"; id: number; dunk: boolean }
  | { type: "dunk"; id: number; style: DunkStyle; power: number }
  | { type: "land"; id: number; hard: boolean }
  | { type: "rim"; power: number }
  | { type: "board"; power: number }
  | { type: "net"; swish: boolean }
  | { type: "floor"; power: number; x: number; z: number }
  | { type: "score"; team: TeamId; points: 1 | 2 | 3; id: number; kind: ShotKind; outcome: Outcome; assist: number | null; streak: number; dunk: DunkStyle | null }
  | { type: "move"; id: number; move: DribbleMove }
  /** A dribble move beat its defender: `hard` sends them stumbling. */
  | { type: "shake"; id: number; victim: number; hard: boolean }
  /** A dribble move went wrong and the ball got away, knocked by `by` if a defender was on top. */
  | { type: "fumble"; id: number; by: number | null }
  /** Reaching in once too often: a foul on `id`, and two shots for `victim`. */
  | { type: "foul"; id: number; victim: number; attempt: number }
  /** A free throw is ready to shoot: shot `n` of 2. */
  | { type: "freeThrow"; id: number; n: 1 | 2 }
  | { type: "miss"; id: number }
  | { type: "block"; id: number; victim: number }
  | { type: "steal"; id: number; victim: number }
  | { type: "whiff"; id: number }
  | { type: "intercept"; id: number; victim: number }
  | { type: "knockdown"; id: number; by: number }
  | { type: "pass"; from: number; to: number; lob: boolean }
  | { type: "catch"; id: number }
  | { type: "rebound"; id: number; offensive: boolean }
  | { type: "loose"; id: number }
  | { type: "call"; id: number }
  | { type: "cleared"; team: TeamId }
  | { type: "mustClear"; id: number }
  | { type: "clockWarning" }
  | { type: "violation"; team: TeamId; reason: "clock" | "out" }
  | { type: "checkUp"; team: TeamId; id: number; defender: number }
  | { type: "check"; team: TeamId; id: number }
  | { type: "heating"; id: number }
  | { type: "onFire"; id: number }
  | { type: "fireOut"; id: number }
  | { type: "gamePoint"; team: TeamId }
  | { type: "win"; team: TeamId };

export type MatchEventType = MatchEvent["type"];
