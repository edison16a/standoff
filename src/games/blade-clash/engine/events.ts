import type { Slot } from "@/games/blade-clash/players";
import type { BodyPart } from "./body";
import type { Vec3 } from "./geometry";

/**
 * Everything worth reacting to, emitted by the engine as it happens. The
 * sound, the renderer's effects and the phones' buzzes all listen to the
 * same stream, which is what keeps them in step.
 */
export type GameEvent =
  | { type: "countdown"; t: number; remaining: number }
  | { type: "fight"; t: number }
  /** A blade moving fast: a whoosh. */
  | { type: "swing"; t: number; slot: Slot; speed: number }
  /** The blades met. `strength` runs from 0 for a tap to 1 for a full swing into a full swing. */
  | { type: "clash"; t: number; at: Vec3; strength: number }
  /** A slash landed. `score` is the attacker's points after it, and `final` means it won the fight. */
  | { type: "hit"; t: number; attacker: Slot; victim: Slot; at: Vec3; part: BodyPart; speed: number; score: number; final: boolean }
  /** After a point both fighters are back on their marks, so the picture cuts rather than streaks. */
  | { type: "reset"; t: number }
  /** The host's own cue when the slow motion after the final hit ends. */
  | { type: "finish"; t: number; winner: Slot }
  | { type: "matchWon"; t: number; winner: Slot };

export type GameEventType = GameEvent["type"];
