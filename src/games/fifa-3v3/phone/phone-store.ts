import { create } from "zustand";
import type { PhoneState } from "../protocol";
import type { CharacterId } from "../roster";

export type SetupStep = "star" | "ready";

/** What Soccer 3v3's phone screens render. */
export interface PhoneStore {
  step: SetupStep;
  /** The star this phone asked for, shown at once while the host confirms. */
  wanted: CharacterId | null;
  /** The latest screen state from the host, null until the first one lands. */
  host: PhoneState | null;
  /** When Shoot/Pass went down, on the phone's clock, while it is held. */
  shootSince: number | null;
}

export const usePhoneStore = create<PhoneStore>(() => ({
  step: "star",
  wanted: null,
  host: null,
  shootSince: null,
}));
