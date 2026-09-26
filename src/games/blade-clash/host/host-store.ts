import { create } from "zustand";
import type { PerSlot, Slot } from "@/games/blade-clash/players";
import type { CalibrationStep, MatchPhase } from "@/games/blade-clash/protocol";
import { DEFAULT_TUNING, type Tuning } from "@/games/blade-clash/tuning";
import type { SeatState } from "./lobby";

/** The slice of match state the overlays on top of the canvas draw. */
export interface MatchHud {
  phase: MatchPhase;
  health: PerSlot<number>;
  countdown: number | null;
  winner: Slot | null;
  rematchVotes: PerSlot<boolean>;
}

/**
 * Everything Blade Clash's screens on the computer render. The session
 * writes here, React reads. The engine itself never goes in the store: it
 * changes 60 times a second and only the canvas needs it at that rate.
 */
export interface BladeHostState {
  seats: PerSlot<SeatState>;
  /** What each player is called, from their phone, or "Computer". */
  names: PerSlot<string>;
  /** Which calibration target each phone is on, to show in that player's half. Null once done. */
  calibrating: PerSlot<CalibrationStep | null>;
  hud: MatchHud | null;
  tuning: Tuning;
  tuningOpen: boolean;
}

const emptySeat = (): SeatState => ({ connected: false, pick: null, ready: false, computer: false });

export const useBladeStore = create<BladeHostState>(() => ({
  seats: { 1: emptySeat(), 2: emptySeat() },
  names: { 1: "Player 1", 2: "Player 2" },
  calibrating: { 1: null, 2: null },
  hud: null,
  tuning: DEFAULT_TUNING,
  tuningOpen: false,
}));

/** Shallow compare, so the per frame HUD sync only writes when something changed. */
export function sameHud(a: MatchHud | null, b: MatchHud | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
