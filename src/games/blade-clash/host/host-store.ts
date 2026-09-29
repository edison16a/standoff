import { create } from "zustand";
import type { PerSlot, Slot } from "@/games/blade-clash/players";
import type { CalibrationStep, MatchPhase } from "@/games/blade-clash/protocol";
import { DEFAULT_TUNING, type Tuning } from "@/games/blade-clash/tuning";
import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import type { SeatState } from "./lobby";

/** The slice of match state the overlays on top of the canvas draw. */
export interface MatchHud {
  phase: MatchPhase;
  /** Points each, first to POINTS_TO_WIN. */
  score: PerSlot<number>;
  /** Who scored the latest point, for the hit moment. */
  scorer: Slot | null;
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
  /** How hard the computer fencer plays. Kept for the whole visit, so a rematch keeps it. */
  botLevel: BotLevel;
}

const emptySeat = (): SeatState => ({ connected: false, pick: null, ready: false, computer: false });

export const useBladeStore = create<BladeHostState>(() => ({
  seats: { 1: emptySeat(), 2: emptySeat() },
  names: { 1: "Player 1", 2: "Player 2" },
  calibrating: { 1: null, 2: null },
  hud: null,
  tuning: DEFAULT_TUNING,
  tuningOpen: false,
  botLevel: DEFAULT_BOT_LEVEL,
}));

/** Shallow compare, so the per frame HUD sync only writes when something changed. */
export function sameHud(a: MatchHud | null, b: MatchHud | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
