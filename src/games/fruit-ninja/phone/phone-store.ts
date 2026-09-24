import { create } from "zustand";
import { DEFAULT_BLADE, type BladeId } from "../blades";
import type { PhoneState, SetupStep } from "../protocol";

/** What the fruit screens on the phone render. */
export interface FruitPhoneState {
  seat: number;
  step: SetupStep;
  blade: BladeId;
  /** Setup finished and the player said ready. */
  ready: boolean;
  /** The latest screen state from the host, null until the first one lands. */
  game: PhoneState | null;
  /** Bumped by every buzz from the host, so the screen can flash along. */
  flash: { event: string; at: number } | null;
}

export const useFruitPhone = create<FruitPhoneState>(() => ({
  seat: 1,
  step: "calibrate",
  blade: DEFAULT_BLADE,
  ready: false,
  game: null,
  flash: null,
}));
