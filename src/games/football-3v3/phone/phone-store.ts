import { create } from "zustand";
import type { PhoneState } from "../protocol";
import type { BuildId } from "../builds";
import type { ThrowReading } from "../engine/pass-meter";
import type { LocalMeter } from "./kick-meter";

export type SetupStep = "build" | "ready";

/** What Football 3v3's phone screens render. */
export interface PhoneStore {
  step: SetupStep;
  /** The build this phone asked for, shown at once while the host confirms. */
  wanted: BuildId | null;
  /** The latest screen state from the host, null until the first one lands. */
  host: PhoneState | null;
  /** The kick meters as this phone draws them, on its own clock. */
  kick: LocalMeter | null;
  /** When the thumb went down on the throw stick, on this phone's clock, while it is held. */
  throwSince: number | null;
  /** Where the throw meter stopped on the last throw, and when, to show the grade a moment. */
  lastThrow: { reading: ThrowReading; at: number } | null;
}

export const usePhoneStore = create<PhoneStore>(() => ({
  step: "build",
  wanted: null,
  host: null,
  kick: null,
  throwSince: null,
  lastThrow: null,
}));
