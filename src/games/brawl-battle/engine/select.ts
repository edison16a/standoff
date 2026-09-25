import type { MoveKey } from "./moves";
import { MOVEMENT } from "./tuning";
import type { Button } from "./types";

export type Direction = "neutral" | "side" | "up" | "down";

/**
 * Which way a stick points, for picking a move. Up and down win a
 * diagonal only when they clearly lead, so a slightly raised run still
 * gives a side attack.
 */
export function directionOf(x: number, y: number): Direction {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  if (Math.max(ax, ay) < MOVEMENT.deadZone) return "neutral";
  if (ay > MOVEMENT.deadZone && ay >= ax * 1.1) return y > 0 ? "up" : "down";
  return "side";
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

/** Which way a side move turns the fighter, or null to keep facing as they are. */
export function turnFor(key: MoveKey, x: number, grounded: boolean): 1 | -1 | null {
  if (Math.abs(x) < MOVEMENT.deadZone) return null;
  // Aerials keep the facing so a fighter can attack backwards while drifting.
  if (!grounded && key.startsWith("air")) return null;
  return x > 0 ? 1 : -1;
}
