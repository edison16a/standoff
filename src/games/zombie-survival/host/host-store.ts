import { create } from "zustand";
import type { Seat } from "@/platform/protocol";
import type { Cutscene, Phase } from "../engine/events";
import type { StatLine } from "../engine/stats";
import type { WeaponId } from "../engine/weapons";

/** One player as the screen shows them: in the lobby list and under their gun. */
export interface HudSeat {
  seat: Seat;
  name: string;
  weapon: WeaponId | null;
  ready: boolean;
  connected: boolean;
  /** Part of the run under way. */
  playing: boolean;
  ammo: number;
  magazine: number;
  reloading: boolean;
}

export interface Toast {
  id: number;
  title: string;
  text: string;
  seat: Seat | null;
}

export interface RadioView {
  id: number;
  from: string;
  text: string;
}

/**
 * What the React layer over the 3D view draws: the lobby, the HUD, the
 * radio, achievements and the summaries. The session writes it, and only
 * when something changed, so React never renders at the game's frame rate.
 */
export interface SurvivalHud {
  phase: Phase;
  cutscene: Cutscene | null;
  stage: number;
  stageTitle: string;
  objective: string;
  health: number;
  maxHealth: number;
  /** Zombies left in this fight, boss included. */
  remaining: number | null;
  boss: { name: string; left: number; total: number } | null;
  seats: HudSeat[];
  lines: StatLine[];
  /** Healed at the last checkpoint. */
  healed: number;
}

/** A big line across the middle of the screen, like a stage title or a boss's name. */
export interface BannerView {
  id: number;
  title: string;
  sub: string;
  tone: "stage" | "boss" | "checkpoint";
}

/** A small note that the team made a checkpoint, which leaves the fight in view. */
export interface CheckpointView {
  id: number;
  stage: number;
  title: string;
  healed: number;
}

export interface SurvivalStore {
  hud: SurvivalHud;
  radio: RadioView | null;
  banner: BannerView | null;
  checkpoint: CheckpointView | null;
  toasts: Toast[];
  /** When the team last took a hit, for the red flash. */
  hurtAt: number;
}

export const emptyHud = (): SurvivalHud => ({
  phase: "lobby",
  cutscene: null,
  stage: 1,
  stageTitle: "",
  objective: "",
  health: 100,
  maxHealth: 100,
  remaining: null,
  boss: null,
  seats: [],
  lines: [],
  healed: 0,
});

export const useSurvivalStore = create<SurvivalStore>(() => ({ hud: emptyHud(), radio: null, banner: null, checkpoint: null, toasts: [], hurtAt: 0 }));
