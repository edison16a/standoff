import { create } from "zustand";
import type { BladeId } from "../blades";
import type { Seat } from "../engine/events";
import { DEFAULT_SETTINGS, type Settings } from "../engine/settings";
import type { HostPhase, SetupStep } from "../protocol";

/** One player as the lobby card shows them. */
export interface LobbySeat {
  seat: Seat;
  name: string;
  connected: boolean;
  step: SetupStep | null;
  blade: BladeId;
  ready: boolean;
}

export interface ScoreRow {
  seat: Seat;
  name: string;
  score: number;
  /** Still in the round. A player who left keeps their row, greyed. */
  active: boolean;
}

/** What the overlays on top of the canvas draw during a round. */
export interface RoundHud {
  phase: HostPhase;
  countdown: number;
  secondsLeft: number;
  standings: ScoreRow[];
  winners: Seat[];
}

/**
 * Everything the fruit screens on the computer render. The session
 * writes here and React reads. Fruit positions never go in the store:
 * they change every frame and only the canvas needs them.
 */
export interface FruitHostState {
  settings: Settings;
  seats: LobbySeat[];
  hud: RoundHud;
}

export const LOBBY_HUD: RoundHud = { phase: "lobby", countdown: 0, secondsLeft: 0, standings: [], winners: [] };

export const useFruitStore = create<FruitHostState>(() => ({
  settings: DEFAULT_SETTINGS,
  seats: [],
  hud: LOBBY_HUD,
}));
