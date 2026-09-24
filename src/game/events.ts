import type { Slot } from "@/shared/players";

/**
 * Everything worth reacting to, emitted by the engine as it happens. The
 * sound director and the renderer's effects listen to the same stream,
 * which is what keeps sound and picture in sync.
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
  /** The host's own cue when the slow motion after a touch ends. */
  | { type: "impact"; t: number; scorer: Slot }
  | { type: "matchWon"; t: number; winner: Slot };

export type GameEventType = GameEvent["type"];
