import { create } from "zustand";
import type { CharacterId } from "@/games/blade-clash/characters";
import type { Slot } from "@/games/blade-clash/players";
import type { ControllerState, FeedbackEvent } from "@/games/blade-clash/protocol";

/** The sword follows the motion sensors, or a drag pad where there are none. */
export type InputMode = "motion" | "touch";

/** The last thing the host said happened to this player's sword. */
export interface Flash {
  event: FeedbackEvent;
  at: number;
}

/** What Blade Clash's phone screens render. */
export interface ControllerStore {
  slot: Slot | null;
  inputMode: InputMode;
  /** True once real sensor readings have arrived. */
  sensorsLive: boolean;
  calibrated: boolean;
  pick: CharacterId | null;
  ready: boolean;
  /** The latest screen state from the host, null until the first one lands. */
  game: ControllerState | null;
  flash: Flash | null;
}

export const useControllerStore = create<ControllerStore>(() => ({
  slot: null,
  inputMode: "motion",
  sensorsLive: false,
  calibrated: false,
  pick: null,
  ready: false,
  game: null,
  flash: null,
}));

/** Which page the phone shows. */
export type PhonePage = "setup" | "calibrate" | "match";

/**
 * A phone that rejoins mid match in a fresh page has lost its
 * calibration, and an uncalibrated sword sends nothing. So it aims again
 * first and drops straight back in. After the match it only needs the
 * Rematch and Menu buttons.
 */
export function phonePage(state: Pick<ControllerStore, "game" | "calibrated">): PhonePage {
  const phase = state.game?.phase ?? "lobby";
  if (phase === "lobby") return "setup";
  return state.calibrated || phase === "matchOver" ? "match" : "calibrate";
}
