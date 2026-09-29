import { create } from "zustand";
import type { Mode } from "../engine/types";
import { EMPTY_PROGRESS, type Progress } from "./progress";
import type { Status } from "./round";

/** Where the host is: picking a level, getting the camera ready, calibrating, playing, or looking at results. */
export type Phase = "menu" | "camera" | "calibrate" | "play" | "results";

/** One player's numbers for the HUD. */
export interface HudPlayer {
  attempt: number;
  percent: number;
  /** Best this round. */
  best: number;
  status: Status;
  /** Waiting for their start after a crash or stepping back in. */
  waiting: boolean;
  mode: Mode;
  /** Place in a race, 1 for the leader. Equal racers share one. */
  place: number;
}

export interface ResultRow {
  slot: number;
  finished: boolean;
  best: number;
  attempts: number;
  jumps: number;
  /** Place in a race: by the finish, or by how far each got if it ended early. */
  place: number;
}

export interface CubeState {
  phase: Phase;
  players: 1 | 2;
  levelId: string;
  practice: boolean;
  /** Played with bodies in front of the camera, or with the keyboard. */
  input: "camera" | "keys";
  progress: Progress;
  hud: HudPlayer[];
  /** A short message over one player's view, like a new best. Keyed so the same text can show twice. */
  banner: { slot: number; text: string; key: number } | null;
  results: ResultRow[];
  /** Who won the race, or null alone, on a dead heat, or when ended early. */
  winner: number | null;
}

export const initialCubeState = (): CubeState => ({
  phase: "menu",
  players: 1,
  levelId: "first-light",
  practice: false,
  input: "camera",
  progress: EMPTY_PROGRESS,
  hud: [],
  banner: null,
  results: [],
  winner: null,
});

/** The host's UI state. The game loop writes it a few times a second at most, never per frame. */
export const useCubeStore = create<CubeState>(() => initialCubeState());
