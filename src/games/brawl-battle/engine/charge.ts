import { startMove } from "./attack";
import { chargedMove } from "./select";
import { BUFFER_FRAMES, CHARGE } from "./tuning";
import type { ChargeButton, Command, Fighter, MatchState } from "./types";

/**
 * Tap or hold. A press of Attack 1 or Attack 2 that is still held is
 * timed instead of acted on. Let go before `CHARGE.threshold` and it is
 * a tap, buffered like any press. Held past it, the fighter winds up the
 * charged move as soon as they are free, and it goes off on release.
 */

function heldNow(cmd: Command, button: ChargeButton): boolean {
  return button === "light" ? cmd.lightHeld === true : cmd.heavyHeld === true;
}

/** Starts timing a fresh press that is still held and can charge. Returns false for a plain tap. */
export function startHold(f: Fighter, cmd: Command, button: ChargeButton): boolean {
  if (!heldNow(cmd, button) || chargedMove(button, cmd.x, cmd.y) === null) return false;
  f.hold = { button, x: cmd.x, y: cmd.y, frames: 0 };
  return true;
}

/** Counts the hold, and turns an early release into a tap. */
export function trackHold(f: Fighter, cmd: Command): void {
  const hold = f.hold;
  if (!hold) return;
  if (heldNow(cmd, hold.button)) {
    hold.frames++;
    return;
  }
  f.hold = null;
  // Let go before it ever became a charge: it was a tap after all.
  if (f.action !== "charge") f.buffer = { button: hold.button, x: hold.x, y: hold.y, frames: BUFFER_FRAMES };
}

/** How charged the wind up is, 0 to 1. */
export function chargeLevel(f: Fighter): number {
  return f.action === "charge" ? Math.min(1, f.frame / CHARGE.full) : 0;
}

/** Begins the wind up once a hold is long enough and the fighter is free. */
export function tryCharge(state: MatchState, f: Fighter): boolean {
  const hold = f.hold;
  if (!hold || hold.frames < CHARGE.threshold) return false;
  const key = chargedMove(hold.button, hold.x, hold.y);
  if (!key) return false;
  f.action = "charge";
  f.frame = 0;
  f.move = key;
  f.buffer = null;
  state.events.push({ type: "charge", id: f.id, move: key });
  return true;
}

/** One step of winding up: release on let go or at the cap, stronger the longer it was held. */
export function stepCharge(state: MatchState, f: Fighter, cmd: Command): void {
  if (f.hold && f.frame < CHARGE.cap) return;
  const key = f.move!;
  const level = chargeLevel(f);
  f.hold = null;
  startMove(state, f, key, cmd.x, level);
}
