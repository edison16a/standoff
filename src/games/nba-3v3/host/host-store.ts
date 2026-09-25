import { create } from "zustand";
import type { TeamId } from "../engine/types";
import type { Phase } from "../protocol";
import type { CharacterId } from "../roster";

export interface SeatView {
  seat: number;
  name: string;
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  team: TeamId | null;
}

/** One of the six spots in the lobby's team columns. */
export interface SpotView {
  team: TeamId;
  seat: number | null;
  name: string;
  character: CharacterId;
}

export interface Banner {
  key: number;
  text: string;
  sub: string | null;
  tone: "gold" | "team0" | "team1" | "white" | "red";
}

export interface ResultRow {
  id: number;
  team: TeamId;
  name: string;
  seat: number | null;
  character: CharacterId;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  made: number;
  attempts: number;
}

/**
 * What the NBA 3v3 screens on the computer render. The session writes
 * here a few times a second; the game itself never goes in the store,
 * since only the canvas needs it at full rate.
 */
export interface NbaHostState {
  phase: Phase;
  seats: SeatView[];
  spots: SpotView[];
  score: [number, number];
  shotClock: number;
  offence: TeamId;
  mustClear: boolean;
  /** The ball is dead or being checked: the shot clock is stopped. */
  checking: boolean;
  countdown: number | null;
  /** The free throws after a foul, as the scoreboard says it, like "Free throw 1 of 2". */
  freeThrow: string | null;
  gamePoint: [boolean, boolean];
  banner: Banner | null;
  winner: TeamId | null;
  results: ResultRow[];
  /** Players whose phones joined during the game, waiting for the next one. */
  waiting: string[];
}

export const useNbaStore = create<NbaHostState>(() => ({
  phase: "lobby",
  seats: [],
  spots: [],
  score: [0, 0],
  shotClock: 12,
  offence: 0,
  mustClear: false,
  checking: false,
  countdown: null,
  freeThrow: null,
  gamePoint: [false, false],
  banner: null,
  winner: null,
  results: [],
  waiting: [],
}));
