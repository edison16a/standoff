import { create } from "zustand";
import type { CharacterId } from "@/games/fencing/characters";
import type { Sensitivity } from "@/games/fencing/motion/gesture";
import type { Slot } from "@/games/fencing/players";
import type { ControllerState, FeedbackEvent, StrikeAction } from "@/games/fencing/protocol";

/** Motion comes from the sensors, or from on screen buttons where there are none. */
export type InputMode = "motion" | "touch";

/** A strike this phone read, the moment it read it. */
export interface Detected {
  action: StrikeAction;
  at: number;
}

/** What the referee made of a strike, as the host told this phone. */
export interface Verdict {
  event: FeedbackEvent;
  reason?: "far" | "wide";
  at: number;
}

/** What fencing's phone screens render. */
export interface ControllerStore {
  slot: Slot | null;
  inputMode: InputMode;
  /** True once real sensor readings have arrived. */
  sensorsLive: boolean;
  calibrated: boolean;
  /** This player's own jab level, from the practice step. Null until practised. */
  sensitivity: Sensitivity | null;
  pick: CharacterId | null;
  ready: boolean;
  /** The latest screen state from the host, null until the first one lands. */
  game: ControllerState | null;
  detected: Detected | null;
  verdict: Verdict | null;
}

export const useControllerStore = create<ControllerStore>(() => ({
  slot: null,
  inputMode: "motion",
  sensorsLive: false,
  calibrated: false,
  sensitivity: null,
  pick: null,
  ready: false,
  game: null,
  detected: null,
  verdict: null,
}));
