import { create } from "zustand";
import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import type { RoomPhase } from "../protocol";
import type { Board } from "../render/hud/board";
import type { LobbyRole } from "../roles";
import type { CharacterId } from "../roster";
import type { TeamId } from "../teams";
import type { ReplayCard } from "./replay/director";

export interface SeatView {
  seat: number;
  name: string;
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  team: TeamId | null;
  role: LobbyRole | null;
}

/** A computer player filling a place in the lobby's team columns. */
export interface BotView {
  team: TeamId;
  character: CharacterId;
  role: LobbyRole;
}

/** A word under the score bug for a big moment, so nothing pops up across the picture. */
export interface Callout {
  text: string;
  /** Who it is about, like the scorer. */
  sub: string | null;
  colour: string;
}

/** One player's say in skipping the replay. */
export interface SkipView {
  seat: number;
  name: string;
  agreed: boolean;
}

/** A player's line on the end screen. */
export interface ResultRow {
  id: number;
  team: TeamId;
  name: string;
  character: CharacterId;
  seat: number | null;
  role: LobbyRole;
  passYards: number;
  rushYards: number;
  recYards: number;
  touchdowns: number;
  tackles: number;
  interceptions: number;
}

/** A phone's player, for the strip along the bottom of the game. */
export interface StripPlayer {
  id: number;
  seat: number;
  name: string;
  team: TeamId;
  character: CharacterId;
  role: LobbyRole;
  hasBall: boolean;
  away: boolean;
}

/**
 * What Football 3v3's screens on the computer render. The session writes
 * here a few times a second and React reads. The match itself never goes
 * in the store: it changes sixty times a second and only the canvas
 * needs it at that rate.
 */
export interface FootballHostState {
  phase: RoomPhase;
  seats: SeatView[];
  bots: BotView[];
  level: BotLevel;
  /** Why the game cannot start yet, or null when it can. */
  startBlock: "empty" | null;
  board: Board | null;
  callout: Callout | null;
  replayCard: ReplayCard | null;
  skip: SkipView[];
  score: [number, number];
  /** Set at the final whistle: the winners, or null for a tie. */
  over: { winner: TeamId | null } | null;
  results: ResultRow[];
  strip: StripPlayer[];
}

export const useFootballStore = create<FootballHostState>(() => ({
  phase: "lobby",
  seats: [],
  bots: [],
  level: DEFAULT_BOT_LEVEL,
  startBlock: "empty",
  board: null,
  callout: null,
  replayCard: null,
  skip: [],
  score: [0, 0],
  over: null,
  results: [],
  strip: [],
}));
