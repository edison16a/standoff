import { create } from "zustand";
import type { Seat } from "@/platform/protocol";
import type { WeaponId } from "../engine/weapons";
import type { GunMessage, ScoreMessage, StateMessage } from "../protocol/messages";

/** The setup pages, in order: aim, then gun, then ready. */
export const STEPS = ["Calibrate", "Weapon", "Ready"] as const;

/** What the phone's screens render. The host's messages land here. */
export interface PhoneState {
  seat: Seat | null;
  step: number;
  calibrated: boolean;
  weapon: WeaponId;
  ready: boolean;
  state: StateMessage | null;
  gun: GunMessage | null;
  score: ScoreMessage | null;
  /** The running reload on this phone's clock: when it began and when it will end. */
  reload: { from: number; to: number } | null;
}

export const usePhoneStore = create<PhoneState>(() => ({
  seat: null,
  step: 0,
  calibrated: false,
  weapon: "rifle",
  ready: false,
  state: null,
  gun: null,
  score: null,
  reload: null,
}));
