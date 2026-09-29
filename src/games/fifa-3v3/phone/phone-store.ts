import { create } from "zustand";
import type { PhoneState } from "../protocol";
import type { BuildId } from "../builds";

export type SetupStep = "build" | "ready";

/** What Soccer 3v3's phone screens render. */
export interface PhoneStore {
  step: SetupStep;
  /** The build this phone asked for, shown at once while the host confirms. */
  wanted: BuildId | null;
  /** The latest screen state from the host, null until the first one lands. */
  host: PhoneState | null;
  /** When Shoot/Pass went down, on the phone's clock, while it is held. */
  shootSince: number | null;
}

export const usePhoneStore = create<PhoneStore>(() => ({
  step: "build",
  wanted: null,
  host: null,
  shootSince: null,
}));
