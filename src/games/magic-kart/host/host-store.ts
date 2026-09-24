import { create } from "zustand";
import type { CharacterId } from "../characters";
import type { ItemKind } from "../engine/items";
import type { EffectKind, Phase } from "../protocol";
import type { TrackId } from "../tracks";

export interface SeatView {
  seat: number;
  name: string;
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
}

/** The overlay on one player's part of the split screen. */
export interface ViewHud {
  seat: number;
  kartId: number;
  name: string;
  color: string;
  place: number;
  lap: number;
  item: ItemKind | null;
  rolling: boolean;
  wrongWay: boolean;
  finished: boolean;
  effect: EffectKind | null;
  /** A short message across the view, like "Final lap". */
  banner: string | null;
  away: boolean;
}

export interface StandingRow {
  kartId: number;
  name: string;
  color: string;
  character: CharacterId;
  place: number;
  lap: number;
  finished: boolean;
  /** Finish time in seconds, for those over the line. */
  time: number | null;
  computer: boolean;
}

/**
 * What the Magic Kart screens on the computer render. The session writes
 * here and React reads. The race itself never goes in the store: it
 * changes 60 times a second and only the canvas needs it at that rate.
 */
export interface KartHostState {
  phase: Phase;
  mapId: TrackId;
  /** Fill empty grid places with computer karts. */
  computers: boolean;
  seats: SeatView[];
  views: ViewHud[];
  standings: StandingRow[];
  /** 3, 2, 1 through the countdown, 0 for the moment of GO, else null. */
  countdown: number | null;
  laps: number;
}

export const useKartStore = create<KartHostState>(() => ({
  phase: "lobby",
  mapId: "beach",
  computers: true,
  seats: [],
  views: [],
  standings: [],
  countdown: null,
  laps: 2,
}));
