import { create } from "zustand";
import type { PhoneState } from "../protocol";
import type { CharacterId } from "../roster";

export type SetupStep = "fighter" | "ready";

export interface Flash {
  key: number;
  text: string;
  tone: "good" | "bad" | "info";
}

/** What Brawl Battle's phone screens render. */
export interface PhoneStore {
  step: SetupStep;
  /** The fighter this phone picked, shown at once while the host confirms. */
  wanted: CharacterId | null;
  /** The latest state from the host, null until the first one lands. */
  host: PhoneState | null;
  /** A word flashed over the controller, like KO or Ult ready. */
  flash: Flash | null;
}

export const usePhoneStore = create<PhoneStore>(() => ({
  step: "fighter",
  wanted: null,
  host: null,
  flash: null,
}));
