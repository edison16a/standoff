import { create } from "zustand";
import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import type { Role } from "../roles";
import type { CharacterId } from "../roster";
import type { RoomPhase } from "../protocol";
import type { TeamId } from "../teams";

export interface SeatView {
  seat: number;
  name: string;
  connected: boolean;
  pick: CharacterId | null;
  ready: boolean;
  team: TeamId | null;
  role: Role | null;
}

/** A computer player filling a place in the lobby's team columns. */
export interface BotView {
  team: TeamId;
  character: CharacterId;
  role: Role;
}

/** A stoppage shown on the score bug: a foul and its booking, then the free kick or penalty. */
export interface Moment {
  text: string;
  /** Who it is about, like the player booked. */
  sub: string | null;
  card: boolean;
  colour: string;
}

export interface Banner {
  /** Changes each time, so the same words can play their entrance again. */
  id: number;
  text: string;
  sub: string | null;
  colour: string;
}

export interface ResultRow {
  id: number;
  team: TeamId;
  name: string;
  character: CharacterId;
  seat: number | null;
  goals: number;
  shots: number;
  tackles: number;
  passes: number;
}

/**
 * What Soccer 3v3's screens on the computer render. The session writes
 * here a few times a second and React reads. The match itself never goes
 * in the store: it changes sixty times a second and only the canvas
 * needs it at that rate.
 */
export interface FifaHostState {
  phase: RoomPhase;
  seats: SeatView[];
  bots: BotView[];
  /** Whether computer players fill the empty places. */
  botsOn: boolean;
  /** How sharp the computer players are. */
  level: BotLevel;
  moment: Moment | null;
  /** Why the match cannot start yet, or null when it can. */
  startBlock: "empty" | "oneSided" | null;
  score: [number, number];
  clock: number;
  golden: boolean;
  replay: boolean;
  banner: Banner | null;
  winner: TeamId | null;
  results: ResultRow[];
  saves: [number, number];
  /** Phones' players in the match, for the strip along the bottom. */
  roster: { id: number; seat: number; name: string; team: TeamId; character: CharacterId; hasBall: boolean; away: boolean }[];
}

export const useFifaStore = create<FifaHostState>(() => ({
  phase: "lobby",
  seats: [],
  bots: [],
  botsOn: true,
  level: DEFAULT_BOT_LEVEL,
  moment: null,
  startBlock: "empty",
  score: [0, 0],
  clock: 0,
  golden: false,
  replay: false,
  banner: null,
  winner: null,
  results: [],
  saves: [0, 0],
  roster: [],
}));
