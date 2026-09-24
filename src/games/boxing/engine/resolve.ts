import type { ActivePunch, Fighter } from "./fighter";
import { PUNCHES, RULES } from "./rules";

export type Outcome =
  | { kind: "miss"; dodge: "duck" | "slip" }
  | { kind: "block" }
  | { kind: "hit"; damage: number; heavy: boolean; stagger: boolean };

/**
 * What happens as a punch arrives, judged on the defender's state at
 * that instant. A duck makes anything miss. A slip makes straights miss,
 * but a hook comes round the side and still finds you. A settled guard
 * soaks up almost all of it. Anything else lands.
 */
export function judge(punch: ActivePunch, attacker: Fighter, defender: Fighter, now: number): Outcome {
  const input = defender.input;
  const free = !defender.staggered(now) && !defender.rocked(now);
  if (free && input.duck) return { kind: "miss", dodge: "duck" };
  if (free && input.slip !== 0 && punch.style !== "hook") return { kind: "miss", dodge: "slip" };
  if (defender.blocking(now)) return { kind: "block" };
  return { kind: "hit", ...damageOf(punch, attacker, defender, now) };
}

export function damageOf(punch: ActivePunch, attacker: Fighter, defender: Fighter, now: number): { damage: number; heavy: boolean; stagger: boolean } {
  const spec = PUNCHES[punch.style];
  let damage = spec.damage * (0.8 + 0.4 * clamp01(punch.power));
  if (punch.tired) damage *= RULES.tiredDamage;
  const counterJab = punch.counter && punch.style === "jab";
  if (counterJab) damage *= RULES.counterJab;
  else if (punch.counter) damage *= RULES.counterOther;
  if (defender.staggered(now)) damage *= RULES.staggerTaken;
  // A boxer who is gassed hits softer, even before they run dry.
  damage *= 0.75 + 0.25 * (attacker.stamina / RULES.maxStamina);
  damage = Math.round(damage * 10) / 10;
  return { damage, heavy: damage >= RULES.heavyDamage || counterJab, stagger: counterJab && !punch.tired };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
