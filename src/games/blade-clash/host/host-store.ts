import { create } from "zustand";
import type { PerSlot, Slot } from "@/games/blade-clash/players";
import type { MatchPhase } from "@/games/blade-clash/protocol";
import { DEFAULT_TUNING, type Tuning } from "@/games/blade-clash/tuning";
import type { SeatState } from "./lobby";

/** The slice of match state the overlay on top of the canvas draws. */
export interface MatchHud {
  phase: MatchPhase;
  scores: PerSlot<number>;
  countdown: number | null;
  call: string | null;
  winner: Slot | null;
  /** Who scored the last touch, for the call on screen. */
  scorer: Slot | null;
  rematchVotes: PerSlot<boolean>;
}

/**
 * Everything the fencing screens on the computer render. The session
 * writes here, React reads. The engine itself never goes in the store: it
 * changes 60 times a second and only the canvas needs it at that rate.
 */
export interface FencingHostState {
  seats: PerSlot<SeatState>;
  /** What each player is called, from their phone, or "Computer". */
  names: PerSlot<string>;
  hud: MatchHud | null;
  tuning: Tuning;
  tuningOpen: boolean;
}

const emptySeat = (): SeatState => ({ connected: false, pick: null, ready: false, computer: false });

export const useFencingStore = create<FencingHostState>(() => ({
  seats: { 1: emptySeat(), 2: emptySeat() },
  names: { 1: "Player 1", 2: "Player 2" },
  hud: null,
  tuning: DEFAULT_TUNING,
  tuningOpen: false,
}));

/** Shallow compare, so the per frame HUD sync only writes when something changed. */
export function sameHud(a: MatchHud | null, b: MatchHud | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
