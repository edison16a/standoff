import { ULT } from "./tuning";
import type { Fighter, MatchState } from "./types";

/**
 * The ult meter fills slowly on its own and faster by landing hits. It
 * is only usable when full, and using it empties it.
 */

export function addUlt(state: MatchState, f: Fighter, amount: number): void {
  if (f.ult >= 1 || amount <= 0) return;
  f.ult = Math.min(1, f.ult + amount);
  if (f.ult >= 1) state.events.push({ type: "ultReady", id: f.id });
}

/** The clock's share, charged only during the fight while the fighter is on stage. */
export function chargeOverTime(state: MatchState, f: Fighter, dt: number): void {
  if (state.phase !== "fight") return;
  addUlt(state, f, dt / ULT.fillSeconds);
}

/** Landing a hit charges the hitter, and taking one charges the target a little. */
export function chargeFromHit(state: MatchState, attacker: Fighter, target: Fighter, damage: number): void {
  addUlt(state, attacker, damage / ULT.fillDamage);
  addUlt(state, target, (damage / ULT.fillDamage) * ULT.takenShare);
}
