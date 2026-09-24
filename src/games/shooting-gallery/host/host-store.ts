import { createStore, type StoreApi } from "zustand/vanilla";
import type { BestEntry } from "../engine/high-scores";
import { DEFAULT_ROUND, type RoundSeconds } from "../engine/rules";
import type { GalleryState } from "../protocol";

/**
 * What the computer's screens render, apart from the 3D booth itself.
 * One store per room, owned by the session, so two rooms never share it.
 */
export interface HostState {
  game: GalleryState;
  seconds: RoundSeconds;
  /** The high score table for the chosen round length. */
  best: BestEntry[];
  canStart: boolean;
  hint: string;
  musicOn: boolean;
}

export type HostStore = StoreApi<HostState>;

export function createHostStore(): HostStore {
  return createStore<HostState>(() => ({
    game: { kind: "state", phase: "lobby", seconds: DEFAULT_ROUND, timeLeft: DEFAULT_ROUND, countdown: 0, players: [], winners: [] },
    seconds: DEFAULT_ROUND,
    best: [],
    canStart: false,
    hint: "",
    musicOn: true,
  }));
}
