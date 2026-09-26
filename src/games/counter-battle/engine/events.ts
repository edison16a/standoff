import type { TeamId } from "./fighter";
import type { GunId } from "./guns";
import type { V3 } from "./vec";

/** Where one bullet or pellet ended up. */
export interface Trace {
  to: V3;
  /** What it struck: a fighter by id, a piece of cover by id, or nothing. */
  hit: { type: "fighter"; id: number; head: boolean } | { type: "cover"; piece: number } | { type: "floor" } | { type: "none" };
}

/**
 * Everything that happens in a match, as it happens. The renderer draws
 * from these, the sound plays from them and the phones buzz from them,
 * so one shot looks, sounds and feels like one moment.
 */
export type BattleEvent =
  | { type: "shot"; shooter: number; gun: GunId; from: V3; traces: Trace[] }
  | { type: "dry"; shooter: number }
  | { type: "reload-start"; fighter: number; gun: GunId; seconds: number }
  | { type: "shell"; fighter: number }
  | { type: "reloaded"; fighter: number }
  | { type: "hit"; shooter: number; target: number; damage: number; head: boolean; health: number }
  | { type: "kill"; killer: number; victim: number; gun: GunId; head: boolean }
  | { type: "countdown"; round: number; seconds: number }
  | { type: "fight"; round: number }
  | { type: "round-end"; round: number; winner: TeamId | null; score: [number, number] }
  | { type: "match-end"; winner: TeamId; score: [number, number] };
