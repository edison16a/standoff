import { create } from "zustand";
import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import type { TeamId } from "../engine/types";
import type { Phase } from "../protocol";
import type { CharacterId } from "../roster";
import type { Role } from "./roles";

export interface SeatView {
  seat: number;
  name: string;
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  team: TeamId | null;
}

/** One of the spots in the lobby's team columns. */
export interface SpotView {
  team: TeamId;
  seat: number | null;
  name: string;
  character: CharacterId;
  role: Role;
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
 * What the Basketball 3v3 screens on the computer render. The session writes
 * here a few times a second; the game itself never goes in the store,
 * since only the canvas needs it at full rate.
 */
export interface NbaHostState {
  phase: Phase;
  seats: SeatView[];
  spots: SpotView[];
  /** Whether computer players fill the empty spots. */
  bots: boolean;
  /** The Computer difficulty picked in the lobby. */
  level: BotLevel;
  /** Why the game cannot start yet, or null when it can. */
  startBlock: "empty" | "oneSided" | null;
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
  bots: true,
  level: DEFAULT_BOT_LEVEL,
  startBlock: "empty",
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
