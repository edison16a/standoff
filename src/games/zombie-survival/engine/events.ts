import type { Seat } from "@/platform/protocol";
import type { WeaponId } from "./weapons";
import type { HitPart, ZombieKind } from "./zombie-kinds";

/** The game's phases. The host runs the machine, phones and screens mirror it. */
export const PHASES = ["lobby", "travel", "fight", "clear", "cutscene", "down", "escaped"] as const;
export type Phase = (typeof PHASES)[number];

export type Cutscene = "chopper" | "escape";

export interface RadioLine {
  from: string;
  text: string;
}

/**
 * Everything that happens in a game, as it happens. The renderer draws
 * from these, the sound plays from them and the phones buzz from them, so
 * a hit looks, sounds and feels like one moment.
 */
export type GameEvent =
  | { type: "shot"; seat: Seat; weapon: WeaponId; shotId: number }
  | { type: "dry"; seat: Seat }
  | { type: "reload-start"; seat: Seat; weapon: WeaponId; seconds: number }
  | { type: "shell"; seat: Seat }
  | { type: "reloaded"; seat: Seat }
  | { type: "hit"; seat: Seat; zombie: number; kind: ZombieKind; part: HitPart; weak: number | null; blocked: boolean; damage: number; killed: boolean }
  | { type: "weak-broken"; seat: Seat; zombie: number; weak: number; left: number }
  | { type: "kill"; seat: Seat; zombie: number; kind: ZombieKind; head: boolean }
  | { type: "spawn"; zombie: number; kind: ZombieKind }
  | { type: "swing"; zombie: number; kind: ZombieKind; damage: number }
  | { type: "phase"; phase: Phase; stage: number }
  | { type: "radio"; line: RadioLine }
  | { type: "achievement"; id: string; seat: Seat | null; title: string; text: string }
  | { type: "stage-clear"; stage: number; healed: number };
