import type { Slot } from "@/shared/players";

/**
 * Everything worth reacting to, emitted by the engine as it happens. The
 * sound director, the screen flash and the replay recorder all listen to
 * the same stream, which is what keeps sound, motion and replay in sync.
 */
export type GameEvent =
  | { type: "countdown"; t: number; remaining: number }
  | { type: "allez"; t: number }
  | { type: "jab"; t: number; slot: Slot }
  | { type: "parry"; t: number; slot: Slot }
  | { type: "whiff"; t: number; slot: Slot }
  | { type: "parried"; t: number; attacker: Slot; clash: boolean }
  | { type: "touch"; t: number; scorer: Slot; matchPoint: boolean }
  | { type: "double"; t: number }
  | { type: "corps"; t: number }
  | { type: "replayStart"; t: number }
  | { type: "replayEnd"; t: number }
  | { type: "matchWon"; t: number; winner: Slot };

export type GameEventType = GameEvent["type"];
