import type { WeaponId } from "../../engine/weapons";

/**
 * Heat each shot puts into the barrel, on a scale where 1 is a barrel
 * that smokes freely. A shotgun shell burns a lot of powder; a 9 mm round
 * burns little, so the SMG has to run a good part of its magazine first.
 */
export const HEAT_PER_SHOT: Record<WeaponId, number> = { shotgun: 0.24, smg: 0.05, rifle: 0.075, ak47: 0.11 };
/** Above this the barrel trails a wisp. */
export const SMOKING = 0.45;
/** A barrel can only get so hot in a short fight. Capping it keeps a long burst from smoking for a minute after. */
export const MAX_HEAT = 1.5;
/** Seconds for the heat to fall by about two thirds once firing stops. */
export const COOL_SECONDS = 3;

/**
 * A barrel's heat, built up by rapid shots and cooling on its own. Steel
 * sheds heat in proportion to how hot it is, so cooling is exponential:
 * a long burst smokes for a few seconds, a single shot not at all.
 */
export class BarrelHeat {
  heat = 0;
  /** Fractions of a wisp owed from earlier frames, so the rate holds at any frame rate. */
  private owed = 0;

  shot(weapon: WeaponId): void {
    this.heat = Math.min(MAX_HEAT, this.heat + HEAT_PER_SHOT[weapon]);
  }

  /** Cools by `dt` seconds and returns how many wisps to let off this frame. */
  step(dt: number): number {
    this.heat *= Math.exp(-dt / COOL_SECONDS);
    const rate = wispRate(this.heat);
    if (rate <= 0) {
      this.owed = 0;
      return 0;
    }
    this.owed += rate * dt;
    const count = Math.floor(this.owed);
    this.owed -= count;
    return count;
  }
}

/** Wisps a second from a barrel this hot: none below smoking, then more the hotter it is. */
export function wispRate(heat: number): number {
  return heat <= SMOKING ? 0 : 5 + (heat - SMOKING) * 16;
}
