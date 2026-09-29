import { create } from "zustand";
import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import type { Role } from "../roles";
import type { BuildId } from "../builds";
import type { RoomPhase } from "../protocol";
import type { TeamId } from "../teams";
import type { CeremonyCard } from "./ceremony-card";
import type { StrikeFacts } from "./replay-facts";
import type { ReplayStage } from "./replay-script";

export interface SeatView {
  seat: number;
  name: string;
  connected: boolean;
  pick: BuildId | null;
  ready: boolean;
  team: TeamId | null;
  role: Role | null;
}

/** A computer player filling a place in the lobby's team columns. */
export interface BotView {
  team: TeamId;
  build: BuildId;
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

/** The goal replay's overlay: the stage it is at and the strike's numbers. */
export interface ReplayCard {
  stage: ReplayStage;
  /** Who struck the ball. */
  kicker: string | null;
  facts: StrikeFacts | null;
  /** Playing in slow motion right now. */
  slow: boolean;
}

/** One player's say in skipping the replay. */
export interface SkipView {
  seat: number;
  name: string;
  agreed: boolean;
}

export interface ResultRow {
  /** An athlete's id, or -1 and -2 for the red and blue keepers. */
  id: number;
  team: TeamId;
  name: string;
  /** The build played, or null for a computer keeper in goal. */
  build: BuildId | null;
  seat: number | null;
  goals: number;
  shots: number;
  tackles: number;
  passes: number;
  /** A keeper's saves, or the shots an outfield player blocked. */
  saves: number;
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
  replayCard: ReplayCard | null;
  skip: SkipView[];
  winner: TeamId | null;
  /** The trophy ceremony's names and where it is, once the scene has cut to it. */
  ceremony: CeremonyCard | null;
  results: ResultRow[];
  /** Phones' players in the match, for the strip along the bottom. */
  roster: { id: number; seat: number; name: string; team: TeamId; build: BuildId; hasBall: boolean; away: boolean }[];
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
  replayCard: null,
  skip: [],
  winner: null,
  ceremony: null,
  results: [],
  roster: [],
}));
