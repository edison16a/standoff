import { create } from "zustand";
import type { CharacterId } from "../characters";
import type { PhoneState } from "../protocol";

export type SetupStep = "calibrate" | "kart" | "ready";

/** Steering by tilting the phone, or with on screen arrows where there are no sensors. */
export type SteerMode = "tilt" | "buttons";

/** What Magic Kart's phone screens render. */
export interface ControllerStore {
  step: SetupStep;
  steerMode: SteerMode;
  /** True once real sensor readings arrive. */
  sensorsLive: boolean;
  calibrated: boolean;
  /** The driver this phone asked for, shown at once while the host confirms. */
  wanted: CharacterId | null;
  /** The latest screen state from the host, null until the first one lands. */
  host: PhoneState | null;
}

export const useControllerStore = create<ControllerStore>(() => ({
  step: "calibrate",
  steerMode: "tilt",
  sensorsLive: false,
  calibrated: false,
  wanted: null,
  host: null,
}));
