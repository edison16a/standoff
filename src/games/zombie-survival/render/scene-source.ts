import type { ScreenPoint } from "@/games/kit/aim/aim-math";
import type { Seat } from "@/platform/protocol";
import type { SurvivalGame } from "../engine/game";
import type { HitPart } from "../engine/zombie-kinds";
import type { WeaponId } from "../engine/weapons";

/**
 * What the picture is drawn from: the game, who holds which gun and where
 * they point it. The host session is one. The showcase, where computer
 * players fight on their own, is the other.
 */
export interface SceneSource {
  readonly game: SurvivalGame;
  /** Everyone with a gun in hand right now. */
  armed(): { seat: Seat; weapon: WeaponId }[];
  /** Where a player points, in clip space, or null when they are not aiming. */
  aimAt(seat: Seat, nowMs: number): ScreenPoint | null;
}

/** One hit shape as it sits on screen: which zombie and part, where in clip space, and how far off. */
export interface TargetPoint {
  zombie: number;
  part: HitPart;
  weak: number | null;
  x: number;
  y: number;
  distance: number;
}
