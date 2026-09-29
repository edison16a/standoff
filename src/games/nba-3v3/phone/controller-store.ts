import { create } from "zustand";
import type { PhoneState } from "../protocol";
import type { BuildId } from "../builds";

export type SetupStep = "build" | "ready";

export interface Flash {
  key: number;
  text: string;
  tone: "good" | "bad" | "info";
}

/** What Basketball 3v3's phone screens render. */
export interface ControllerStore {
  step: SetupStep;
  /** The build this phone asked for, shown at once while the host confirms. */
  wanted: BuildId | null;
  /** The latest screen state from the host, null until the first one lands. */
  host: PhoneState | null;
  /** A word flashed over the controller, like "Green!" or "Stolen". */
  flash: Flash | null;
  /** When Shoot went down, on this phone's clock, while it is held. */
  aimingSince: number | null;
}

export const useControllerStore = create<ControllerStore>(() => ({
  step: "build",
  wanted: null,
  host: null,
  flash: null,
  aimingSince: null,
}));
