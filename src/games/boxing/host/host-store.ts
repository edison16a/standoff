import { create } from "zustand";
import type { MatchResult } from "../engine/events";
import type { OwnView } from "../render/views";
import type { Stage } from "./fight-driver";

export type Screen = "players" | "setup" | "pick" | "fight" | "results";

export interface HudFighter {
  name: string;
  nickname: string;
  colour: string;
  /** 0 to 100. */
  health: number;
  stamina: number;
  /** A counter punch would land hard right now. */
  counter: boolean;
  blocking: boolean;
  /** Holding both gloves out to touch before a round. */
  reaching: boolean;
  /** Stunned by a head shot, reeling back to the corner. */
  stunned: boolean;
  /** Worn down by punishment, so punches are slower and softer for a while. */
  worn: boolean;
  knockdowns: number;
  /** Clean punches taken so far. Each new one flashes the edges of this boxer's view. */
  hurt: number;
  /** Played by a person, not the computer. */
  human: boolean;
}

/** A short word across a view, like "BLOCKED" or "COUNTER". Each has its own id so the same word can pop twice. */
export interface Banner {
  id: number;
  text: string;
  tone: "good" | "bad" | "big" | "info";
  /** Which boxer's view it belongs to, or null for everyone. */
  fighter: 0 | 1 | null;
}

export interface Hud {
  round: number;
  rounds: number;
  /** Seconds left in the round. */
  clock: number;
  phase: string;
  stage: Stage;
  fighters: [HudFighter, HudFighter];
  banners: Banner[];
  /** The referee's count over a boxer who is down. */
  count: { fighter: 0 | 1; n: number; rising: boolean } | null;
  /** Camera slots out of view, while the fight waits for them. */
  away: number[];
  /** Seconds until a paused fight goes on, once everyone is back. */
  resumeIn: number | null;
  /** Seconds of the break, or of waiting to touch gloves, left. */
  phaseLeft: number;
  /** Between rounds: walking to the corners, resting on the stools, or walking back out. */
  breakStage: "walk" | "rest" | "out" | null;
  /** The gloves have touched, and the bell is about to go. */
  touched: boolean;
  /** Which boxers are played by people, each with a view of their own during the rounds. */
  views: (0 | 1)[];
  /** The players' views on screen right now and where the picture draws them. Empty while the broadcast camera has the screen. */
  panes: OwnView[];
}

export interface Records {
  /** Fights won against the computer on this computer. */
  wins: number;
  losses: number;
  /** The quickest knockout of the computer, in seconds of fight time. */
  fastestKo: number | null;
  streak: number;
}

export interface BoxingState {
  screen: Screen;
  players: 1 | 2;
  /** The chosen look for each boxer, as an index into LOOKS. */
  picks: [number, number];
  locked: [boolean, boolean];
  /** How far each player's guard hold has filled toward locking in, 0 to 1. */
  holding: [number, number];
  hud: Hud | null;
  result: (MatchResult & { names: [string, string]; stats: [Record<string, number>, Record<string, number>] }) | null;
  records: Records;
  /** A new best set by the fight just finished, to celebrate on the results. */
  newBest: string | null;
}

export const useBoxingStore = create<BoxingState>(() => ({
  screen: "players",
  players: 1,
  picks: [0, 1],
  locked: [false, false],
  holding: [0, 0],
  hud: null,
  result: null,
  records: { wins: 0, losses: 0, fastestKo: null, streak: 0 },
  newBest: null,
}));
