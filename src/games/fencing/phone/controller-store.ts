import { create } from "zustand";
import type { CharacterId } from "@/games/fencing/characters";
import type { Slot } from "@/games/fencing/players";
import type { ControllerState } from "@/games/fencing/protocol";

/** Motion comes from the sensors, or from on screen buttons where there are none. */
export type InputMode = "motion" | "touch";

/** What fencing's phone screens render. */
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
}

export const useControllerStore = create<ControllerStore>(() => ({
  slot: null,
  inputMode: "motion",
  sensorsLive: false,
  calibrated: false,
  pick: null,
  ready: false,
  game: null,
}));
