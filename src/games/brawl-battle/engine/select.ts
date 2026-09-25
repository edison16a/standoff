import type { ChargeKey, MoveKey } from "./moves";
import { MOVEMENT } from "./tuning";
import type { Button, ChargeButton } from "./types";

export type Direction = "neutral" | "side" | "up" | "down";
/** The four stick sectors, with left and right kept apart. */
export type Heading = "neutral" | "left" | "right" | "up" | "down";

/**
 * Snaps the stick to the nearest of four directions. Each owns a 90
 * degree sector centred on its axis, so right but 20 degrees up is still
 * right. Only a stick inside the dead zone is neutral. On an exact
 * diagonal the side wins, since running is the common case; the angle
 * is rounded first so float noise cannot flip a true diagonal.
 */
export function headingOf(x: number, y: number): Heading {
  if (Math.hypot(x, y) < MOVEMENT.deadZone) return "neutral";
  const degrees = Math.round((Math.atan2(y, x) * 180) / Math.PI * 1e6) / 1e6;
  if (Math.abs(degrees) <= 45) return "right";
  if (Math.abs(degrees) >= 135) return "left";
  return degrees > 0 ? "up" : "down";
}

/** Which way a stick points, for picking a move: left and right are both a side move. */
export function directionOf(x: number, y: number): Direction {
  const heading = headingOf(x, y);
  return heading === "left" || heading === "right" ? "side" : heading;
}

const GROUND_LIGHT: Record<Direction, MoveKey> = { neutral: "jab", side: "side", up: "up", down: "down" };
const AIR_LIGHT: Record<Direction, MoveKey> = { neutral: "air", side: "air", up: "airUp", down: "airDown" };
const HEAVY: Record<Direction, MoveKey> = { neutral: "heavy", side: "heavySide", up: "heavyUp", down: "heavyDown" };

/** The move a button press makes, from the direction held and whether the fighter is on the floor. */
export function selectMove(button: Button, x: number, y: number, grounded: boolean): MoveKey {
  if (button === "ult") return "ult";
  const dir = directionOf(x, y);
  if (button === "heavy") return HEAVY[dir];
  return grounded ? GROUND_LIGHT[dir] : AIR_LIGHT[dir];
}

const HOLD_LIGHT: Record<Direction, ChargeKey> = { neutral: "holdSide", side: "holdSide", up: "holdUp", down: "holdDown" };
const HOLD_HEAVY: Record<Direction, ChargeKey | null> = { neutral: "holdHeavy", side: "holdHeavy", up: null, down: "holdHeavyDown" };

/**
 * The charged move a held button winds up, or null when this press never
 * charges: up on Attack 2 is the recovery, which must come out at once.
 */
export function chargedMove(button: ChargeButton, x: number, y: number): ChargeKey | null {
  const dir = directionOf(x, y);
  return button === "light" ? HOLD_LIGHT[dir] : HOLD_HEAVY[dir];
}

/** Which way a side move turns the fighter, or null to keep facing as they are. */
export function turnFor(key: MoveKey, x: number, grounded: boolean): 1 | -1 | null {
  if (Math.abs(x) < MOVEMENT.deadZone) return null;
  // Aerials keep the facing so a fighter can attack backwards while drifting.
  if (!grounded && key.startsWith("air")) return null;
  return x > 0 ? 1 : -1;
}
