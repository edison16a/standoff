import { create } from "zustand";
import type { SocketStatus } from "@/platform/net/socket-client";
import type { PerSlot, Slot } from "@/games/fencing/players";
import type { MatchPhase } from "@/games/fencing/protocol";
import { DEFAULT_TUNING, type Tuning } from "@/games/fencing/tuning";
import type { SeatState } from "./lobby";

export type HostScreen = "landing" | "lobby" | "match";

/** The slice of match state the overlay on top of the canvas draws. */
export interface MatchHud {
  phase: MatchPhase;
  scores: PerSlot<number>;
  countdown: number | null;
  call: string | null;
  winner: Slot | null;
  rematchVotes: PerSlot<boolean>;
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
  /** False on a multi instance deploy without Redis, where joins can miss the room. */
  sharedRooms: boolean;
  /** A reload is getting its room back. */
  resuming: boolean;
}

const emptySeat = (): SeatState => ({ connected: false, pick: null, ready: false, computer: false });

export const useHostStore = create<HostState>(() => ({
  screen: "landing",
  status: "connecting",
  room: null,
  seats: { 1: emptySeat(), 2: emptySeat() },
  hud: null,
  tuning: DEFAULT_TUNING,
  error: null,
  sharedRooms: true,
  resuming: false,
}));

/** Shallow compare, so the per frame HUD sync only writes when something changed. */
export function sameHud(a: MatchHud | null, b: MatchHud | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
