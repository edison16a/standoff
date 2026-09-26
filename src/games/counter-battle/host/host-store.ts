import { create } from "zustand";
import type { SplitPane } from "@/games/kit/split/SplitMap";
import type { Difficulty, TeamId } from "../engine/fighter";
import type { GunId } from "../engine/guns";
import type { MatchPhase } from "../engine/match";
import type { Mode, RoomPhase } from "../protocol";
import type { CharacterId } from "../roster";
import type { ViewRect } from "../render/layout";

/** One place in the lobby's team columns. */
export interface SpotView {
  team: TeamId;
  seat: number | null;
  name: string;
  colour: string;
  gun: GunId | null;
  ready: boolean;
}

/** One player's view during the match, with what their corner of the HUD shows. */
export interface PaneView {
  rect: ViewRect;
  fighter: number;
  name: string;
  colour: string;
  team: TeamId;
  gun: GunId;
  health: number;
  alive: boolean;
  ammo: number;
  magazine: number;
  reloading: boolean;
  /** 0 to 1 through the running reload. */
  reload: number;
  /** The phone dropped and the computer is shooting for them. */
  away: boolean;
}

export interface FeedEntry {
  key: number;
  killer: { name: string; colour: string; team: TeamId };
  victim: { name: string; colour: string; team: TeamId };
  gun: GunId;
  head: boolean;
}

export interface Banner {
  key: number;
  text: string;
  sub: string | null;
  /** A team's colour, or white for the neutral calls. */
  tone: TeamId | "white";
}

/** One fighter's line on the results. */
export interface ResultRow {
  id: number;
  team: TeamId;
  name: string;
  colour: string;
  bot: boolean;
  character: CharacterId;
  gun: GunId;
  kills: number;
  deaths: number;
  headshots: number;
  damage: number;
}

/**
 * What the Counter Battle screens on the computer render. The session
 * writes here a few times a second and on every kill; the battle itself
 * never goes in the store, since only the canvas needs it at full rate.
 */
export interface CounterHostState {
  phase: RoomPhase;
  mode: Mode;
  difficulty: Difficulty;
  spots: SpotView[];
  /** Players waiting for a place, and players still choosing a gun or not ready. */
  bench: string[];
  choosing: string[];
  canStart: boolean;
  /** The split screen as it stands in the lobby, and in the match. */
  split: SplitPane[];
  matchPhase: MatchPhase;
  round: number;
  score: [number, number];
  roundsToWin: number;
  countdown: number | null;
  panes: PaneView[];
  /** A spare quarter showing the television camera, if any. */
  tv: ViewRect | null;
  feed: FeedEntry[];
  banner: Banner | null;
  winner: TeamId | null;
  results: ResultRow[];
  /** Players whose phones joined during the match, waiting for the next one. */
  waiting: string[];
}

export const useCounterStore = create<CounterHostState>(() => ({
  phase: "lobby",
  mode: "1v1",
  difficulty: "normal",
  spots: [],
  bench: [],
  choosing: [],
  canStart: false,
  split: [],
  matchPhase: "countdown",
  round: 1,
  score: [0, 0],
  roundsToWin: 5,
  countdown: null,
  panes: [],
  tv: null,
  feed: [],
  banner: null,
  winner: null,
  results: [],
  waiting: [],
}));
