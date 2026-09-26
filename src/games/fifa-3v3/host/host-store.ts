import { create } from "zustand";
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
}

/** A computer player filling a place in the lobby's team columns. */
export interface BotView {
  team: TeamId;
  character: CharacterId;
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
