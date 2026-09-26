import { create } from "zustand";
import type { GunId } from "../engine/guns";
import type { PhoneState } from "../protocol";

/** The setup pages, in order: aim at your view, pick a gun, say ready. */
export const STEPS = ["Aim", "Gun", "Ready"] as const;
export type SetupStep = 0 | 1 | 2;

export interface Flash {
  key: number;
  text: string;
  tone: "good" | "bad";
}

/** What Counter Battle's phone screens render. The host's messages land here. */
export interface PhoneStore {
  step: SetupStep;
  calibrated: boolean;
  /** The gun on screen in the pick, sent once confirmed. */
  wanted: GunId;
  /** The latest state from the host, null until the first one lands. */
  host: PhoneState | null;
  /** A word flashed over the controller, like Head shot. */
  flash: Flash | null;
  /** The running reload on this phone's clock: when it began and when it will end. */
  reload: { from: number; to: number } | null;
}

export const usePhoneStore = create<PhoneStore>(() => ({
  step: 0,
  calibrated: false,
  wanted: "rifle",
  host: null,
  flash: null,
  reload: null,
}));
