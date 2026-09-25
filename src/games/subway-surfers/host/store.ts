import { create } from "zustand";
import type { BestEntry } from "../engine/best-scores";
import type { CrashCause } from "../engine/events";
import type { PowerKind } from "../engine/types";

/**
 * lobby: the host picks one or two players and types names.
 * camera: the camera and the body tracking get ready.
 * calibrate: each player stands still in their spot.
 * tutorial: step left, step right, jump and duck, live.
 * countdown, running: the run. results: scores, the winner and the best.
 */
export type Phase = "lobby" | "camera" | "calibrate" | "tutorial" | "countdown" | "running" | "results";

export interface PowerView {
  kind: PowerKind;
  /** Share of its time left, 1 when fresh. */
  share: number;
}

/** One player's corner of the screen while running. */
export interface RunnerHud {
  slot: number;
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
  slot: number;
  name: string;
  score: number;
  coins: number;
  distance: number;
  /** Place on the best scores table, or null. */
  best: number | null;
}

export interface SurfState {
  phase: Phase;
  players: 1 | 2;
  names: [string, string];
  hud: RunnerHud[];
  /** 3, 2, 1, then 0 for GO, else null. */
  countdown: number | null;
  results: ResultRow[];
  /** The winning slot with two players, or null for one player or a tie. */
  winner: number | null;
  best: BestEntry[];
  /** Results accept a jump to play again once this is true. */
  jumpToReplay: boolean;
}

export const initialSurfState = (): SurfState => ({
  phase: "lobby",
  players: 1,
  names: ["", ""],
  hud: [],
  countdown: null,
  results: [],
  winner: null,
  best: [],
  jumpToReplay: false,
});

export const useSurfStore = create<SurfState>(() => initialSurfState());

/** The names to show, one per player, "Player 2" for anyone who typed none. */
export function shownNames(state: Pick<SurfState, "names" | "players">): string[] {
  return Array.from({ length: state.players }, (_, i) => state.names[i]!.trim() || `Player ${i + 1}`);
}

export function setPlayers(players: 1 | 2): void {
  useSurfStore.setState({ players });
}

export function setName(slot: number, name: string): void {
  const names = [...useSurfStore.getState().names] as [string, string];
  names[slot - 1] = name.slice(0, 20);
  useSurfStore.setState({ names });
}
