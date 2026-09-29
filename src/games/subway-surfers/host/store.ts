import { create } from "zustand";
import type { LeaderEntry } from "@/games/kit/leaderboard";
import { DEFAULT_DIFFICULTY, type Difficulty } from "../engine/difficulty";
import type { CrashCause } from "../engine/events";
import type { PowerKind } from "../engine/types";

/** How the player runs: in front of the camera, or with the arrow keys or WASD. */
export type InputMode = "camera" | "keyboard";

/**
 * lobby: the player picks camera or keyboard, how hard to start, and types a name.
 * camera: the camera and the body tracking get ready.
 * calibrate: the player stands still in their spot.
 * tutorial: step left, step right, jump and duck, live.
 * The camera steps and the tutorial are skipped with the keyboard.
 * countdown, running: the run. results: the score and the leaderboard.
 */
export type Phase = "lobby" | "camera" | "calibrate" | "tutorial" | "countdown" | "running" | "results";

export interface PowerView {
  kind: PowerKind;
  /** Share of its time left, 1 when fresh. */
  share: number;
}

/** The overlay while running. */
export interface RunnerHud {
  name: string;
  score: number;
  coins: number;
  /** The zone's multiplier, doubled by the score multiplier power up. */
  multiplier: number;
  /** The level the run is on, whose own multiplier shows beside the score. */
  difficulty: Difficulty;
  /** Points just won from coins and power ups, popping up by the score. */
  gain: { amount: number; id: number } | null;
  distance: number;
  powers: PowerView[];
  /** Out of view: the run waits for them. `resume` counts down once they are back. */
  away: boolean;
  resume: number | null;
  crashed: CrashCause | null;
  /** A shout across their view, like a power up's name or "Saved!". */
  banner: { text: string; id: number } | null;
  /** Tutorial moves done, 0 to 4. */
  tutorial: number;
}

export interface ResultRow {
  name: string;
  difficulty: Difficulty;
  input: InputMode;
  score: number;
  coins: number;
  distance: number;
  /** Where the score came from, multipliers included. */
  points: { running: number; coins: number; powers: number };
  /** Its place on this computer's leaderboard, 1 for the top, out of `total` runs. */
  rank: number;
  total: number;
  /** Ahead of every earlier run on this computer. */
  best: boolean;
  /** Its row on the leaderboard, to light up. */
  entryId: string;
}

export interface SurfState {
  phase: Phase;
  input: InputMode;
  difficulty: Difficulty;
  name: string;
  hud: RunnerHud | null;
  /** 3, 2, 1, then 0 for GO, else null. */
  countdown: number | null;
  result: ResultRow | null;
  /** Every run on this computer, best first. */
  board: LeaderEntry[];
  /** Results accept a jump to play again once this is true. */
  jumpToReplay: boolean;
}

export const initialSurfState = (): SurfState => ({
  phase: "lobby",
  input: "camera",
  difficulty: DEFAULT_DIFFICULTY,
  name: "",
  hud: null,
  countdown: null,
  result: null,
  board: [],
  jumpToReplay: false,
});

export const useSurfStore = create<SurfState>(() => initialSurfState());

/** The name to show, "Player 1" when none was typed. */
export function shownName(name: string): string {
  return name.trim() || "Player 1";
}

export function setInput(input: InputMode): void {
  useSurfStore.setState({ input });
}

export function setDifficulty(difficulty: Difficulty): void {
  useSurfStore.setState({ difficulty });
}

export function setName(name: string): void {
  useSurfStore.setState({ name: name.slice(0, 20) });
}
