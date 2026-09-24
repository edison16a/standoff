import { create } from "zustand";
import type { SocketStatus } from "@/net/socket-client";
import type { PerSlot, Slot } from "@/shared/players";
import type { MatchPhase } from "@/shared/protocol";
import { DEFAULT_TUNING, type Tuning } from "@/shared/tuning";
import type { SeatState } from "./lobby";

export type HostScreen = "landing" | "lobby" | "match";

/** The slice of match state the overlay on top of the canvas draws. */
export interface MatchHud {
  phase: MatchPhase;
  scores: PerSlot<number>;
  countdown: number | null;
  call: string | null;
  winner: Slot | null;
  skipVotes: PerSlot<boolean>;
  rematchVotes: PerSlot<boolean>;
  /** Replay progress in whole percent, and whether it is in slow motion. */
  replay: { percent: number; slow: boolean } | null;
}

/**
 * Everything the host screens render. The session writes here, React
 * reads. The engine itself never goes in the store: it changes 60 times a
 * second and only the canvas needs it at that rate.
 */
export interface HostState {
  screen: HostScreen;
  status: SocketStatus;
  room: { code: string; joinUrl: string } | null;
  seats: PerSlot<SeatState>;
  hud: MatchHud | null;
  tuning: Tuning;
  error: string | null;
}

const emptySeat = (): SeatState => ({ connected: false, pick: null, ready: false });

export const useHostStore = create<HostState>(() => ({
  screen: "landing",
  status: "connecting",
  room: null,
  seats: { 1: emptySeat(), 2: emptySeat() },
  hud: null,
  tuning: DEFAULT_TUNING,
  error: null,
}));

/** Shallow compare, so the per frame HUD sync only writes when something changed. */
export function sameHud(a: MatchHud | null, b: MatchHud | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
