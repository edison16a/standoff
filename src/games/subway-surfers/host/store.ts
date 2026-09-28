import { create } from "zustand";
import type { BestEntry } from "../engine/best-scores";
import { DEFAULT_DIFFICULTY, type Difficulty } from "../engine/difficulty";
import type { CrashCause } from "../engine/events";
import type { PowerKind } from "../engine/types";

/**
 * lobby: the player picks how hard to start and types a name.
 * camera: the camera and the body tracking get ready.
 * calibrate: the player stands still in their spot.
 * tutorial: step left, step right, jump and duck, live.
 * countdown, running: the run. results: the score and the best runs.
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
  multiplier: number;
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
  score: number;
  coins: number;
  distance: number;
  /** Place on the best scores table, or null. */
  best: number | null;
}

export interface SurfState {
  phase: Phase;
  difficulty: Difficulty;
  name: string;
  hud: RunnerHud | null;
  /** 3, 2, 1, then 0 for GO, else null. */
  countdown: number | null;
  result: ResultRow | null;
  best: BestEntry[];
  /** Results accept a jump to play again once this is true. */
  jumpToReplay: boolean;
}

export const initialSurfState = (): SurfState => ({
  phase: "lobby",
  difficulty: DEFAULT_DIFFICULTY,
  name: "",
  hud: null,
  countdown: null,
  result: null,
  best: [],
  jumpToReplay: false,
});

export const useSurfStore = create<SurfState>(() => initialSurfState());

/** The name to show, "Player 1" when none was typed. */
export function shownName(name: string): string {
  return name.trim() || "Player 1";
}

export function setDifficulty(difficulty: Difficulty): void {
  useSurfStore.setState({ difficulty });
}

export function setName(name: string): void {
  useSurfStore.setState({ name: name.slice(0, 20) });
}
