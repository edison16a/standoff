import { clamp01 } from "./vec";

/**
 * The Shoot/Pass button's timing, shared by the host and the phone so
 * the bar the player watches is the bar the host judges.
 *
 * A press shorter than `tap` is a pass. Held longer, the charge bar
 * appears and fills from left to right over `fill`: green is a placed
 * shot, yellow a strong one, red full power. The bar caps at full and
 * waits there for `hold`; still held after that, the player shoots at
 * full power by itself, so a thumb resting on the button never freezes
 * the game. Capping rather than cycling means a late release is never
 * punished with a weak shot the player did not ask for.
 */
export const CHARGE = {
  tap: 0.2,
  fill: 0.9,
  hold: 0.45,
  /** Where the yellow and the red zones start, as a share of the bar. */
  yellow: 0.5,
  red: 0.8,
} as const;

export type ChargeZone = "green" | "yellow" | "red";

/** How full the bar is after holding Shoot for `held` seconds, 0 to 1. */
export function chargeLevel(held: number): number {
  return clamp01((held - CHARGE.tap) / CHARGE.fill);
}

/** Whether a press held this long is a tap, and so a pass. */
export function isTap(held: number): boolean {
  return held < CHARGE.tap;
}

/** Past this, a held shot goes by itself. */
export function autoShootAt(): number {
  return CHARGE.tap + CHARGE.fill + CHARGE.hold;
}

/** Hold time that fills the bar to `level`, for computer players aiming at a zone. */
export function heldFor(level: number): number {
  return CHARGE.tap + clamp01(level) * CHARGE.fill;
}

export function chargeZone(level: number): ChargeZone {
  if (level >= CHARGE.red) return "red";
  if (level >= CHARGE.yellow) return "yellow";
  return "green";
}

/**
 * How far off a shot can go at this power, 0 to 1. Green stays close
 * to where the stick points, yellow drifts a little, and red sprays:
 * the curve bends up steeply through the red zone.
 */
export function shotSpread(level: number): number {
  const l = clamp01(level);
  return clamp01(0.08 + 0.35 * l * l + 0.9 * Math.max(0, l - CHARGE.red) * 2.5);
}
