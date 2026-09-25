import type { Strike } from "./combat";
import { SHIELD } from "./tuning";
import type { Fighter, MatchState } from "./types";

/**
 * The shield: hold down on the main platform. It blocks everything but
 * ults, shrinks while held and with every block, and grows back when let
 * go. Blocked too much, it breaks and leaves the fighter dizzy.
 */

export function stepShield(f: Fighter, dt: number): void {
  if (f.action === "shield") f.shield = Math.max(0, f.shield - SHIELD.drain * dt);
  else if (f.action !== "dizzy") f.shield = Math.min(1, f.shield + SHIELD.regen * dt);
  if (f.action === "shield" && f.shield <= 0) f.action = "idle";
}

/** A hit landing on a raised shield: it pushes the fighter back and wears the shield down. */
export function blockHit(state: MatchState, attacker: Fighter, target: Fighter, strike: Strike): void {
  const { hit, side, x, y } = strike;
  target.shield -= hit.damage * SHIELD.perDamage;
  target.vel.x = SHIELD.push * side;
  if (!strike.ranged) attacker.freeze = Math.max(attacker.freeze, 3);
  if (target.shield <= 0) {
    target.shield = 0;
    target.action = "dizzy";
    target.frame = 0;
    target.lag = 0;
    state.events.push({ type: "shieldBreak", id: target.id });
    return;
  }
  target.lag = Math.round(SHIELD.stunBase + hit.damage * SHIELD.stunPerDamage);
  target.freeze = Math.max(target.freeze, 3);
  state.events.push({ type: "block", attacker: attacker.id, target: target.id, x, y });
}
