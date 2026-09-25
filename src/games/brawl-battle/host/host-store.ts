import { create } from "zustand";
import type { Difficulty } from "../engine/bots/brain";
import type { RoomPhase } from "../protocol";
import type { CharacterId } from "../roster";
import type { Slot } from "./lobby";

export interface SeatView {
  seat: number;
  name: string;
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
}

/** A place in the lobby, with the name to show on it. */
export type SlotView = Slot & { name: string; colour: string | null };

/** One fighter's card in the HUD and the results. */
export interface FighterCard {
  id: number;
  name: string;
  character: CharacterId;
  colour: string;
  bot: boolean;
  /** A phone playing them has dropped, so a bot stands in. */
  away: boolean;
  percent: number;
  stocks: number;
  ult: number;
  out: boolean;
  place: number | null;
  kos: number;
  falls: number;
  damage: number;
  /** Counts the hits taken, so the percent can jump on each one. */
  hits: number;
}

export interface Banner {
  key: number;
  text: string;
  sub: string | null;
  colour: string;
}

/**
 * What Brawl Battle's screens on the computer render. The session writes
 * here a few times a second and on every hit; the match itself never
 * goes in the store, since only the canvas needs it at full rate.
 */
export interface BrawlHostState {
  phase: RoomPhase;
  seats: SeatView[];
  slots: SlotView[];
  bots: number;
  difficulty: Difficulty;
  canStart: boolean;
  stageName: string;
  fighters: FighterCard[];
  /** The big word in the middle: Ready, Fight or Game. */
  call: "ready" | "fight" | "game" | null;
  banner: Banner | null;
  winner: number | null;
  /** Players whose phones joined during the match, waiting for the next one. */
  waiting: string[];
}

export const useBrawlStore = create<BrawlHostState>(() => ({
  phase: "lobby",
  seats: [],
  slots: [],
  bots: 1,
  difficulty: "normal",
  canStart: false,
  stageName: "",
  fighters: [],
  call: null,
  banner: null,
  winner: null,
  waiting: [],
}));
