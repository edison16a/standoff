import { create } from "zustand";
import type { PhoneState } from "../protocol";
import type { CharacterId } from "../roster";
import type { LocalMeter } from "./kick-meter";

export type SetupStep = "star" | "ready";

/** What Football 3v3's phone screens render. */
export interface PhoneStore {
  step: SetupStep;
  /** The star this phone asked for, shown at once while the host confirms. */
  wanted: CharacterId | null;
  /** The latest screen state from the host, null until the first one lands. */
  host: PhoneState | null;
  /** The kick meters as this phone draws them, on its own clock. */
  kick: LocalMeter | null;
}

export const usePhoneStore = create<PhoneStore>(() => ({
  step: "star",
  wanted: null,
  host: null,
  kick: null,
}));
