import { create } from "zustand";
import type { SocketStatus } from "@/platform/net/socket-client";
import type { CharacterId } from "@/shared/characters";
import type { Slot } from "@/shared/players";
import type { ControllerState } from "@/shared/protocol";

/** Where the phone is in the join flow. */
export type ControllerStage = "enable" | "joining" | "playing" | "error";

/** `replaced` means this seat was taken over by the same page in another tab. */
export type ControllerError = "not-found" | "full" | "closed" | "unavailable" | "insecure" | "denied" | "replaced";

/** Motion comes from the sensors, or from on screen buttons where there are none. */
export type InputMode = "motion" | "touch";

export interface ControllerStore {
  stage: ControllerStage;
  error: ControllerError | null;
  status: SocketStatus;
  slot: Slot | null;
  inputMode: InputMode;
  /** True once real sensor readings have arrived. */
  sensorsLive: boolean;
  calibrated: boolean;
  hostAway: boolean;
  pick: CharacterId | null;
  ready: boolean;
  /** The latest screen state from the host, null until the first one lands. */
  game: ControllerState | null;
}

export const useControllerStore = create<ControllerStore>(() => ({
  stage: "enable",
  error: null,
  status: "connecting",
  slot: null,
  inputMode: "motion",
  sensorsLive: false,
  calibrated: false,
  hostAway: false,
  pick: null,
  ready: false,
  game: null,
}));
