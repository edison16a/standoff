import { coverOf } from "./cover";
import type { ActivePunch, Fighter } from "./fighter";
import { contactOf } from "./reach";
import { PUNCHES, RULES } from "./rules";

export type Outcome =
  | { kind: "miss"; dodge: "duck" | "slip" }
  | { kind: "block" }
  | { kind: "hit"; damage: number; heavy: boolean; stagger: boolean; cover: number };

/**
 * What happens as a punch arrives, judged on where the defender's head
 * and gloves are at that instant. A head that has moved out of the
 * punch's path makes it miss. Gloves squarely in its path block it.
 * Anything else lands, softened by whatever cover there was and by how
 * squarely it found the head.
 */
export function judge(punch: ActivePunch, attacker: Fighter, defender: Fighter, now: number): Outcome {
  const contact = contactOf(punch, defender.input.head);
  if (contact.dodge) return { kind: "miss", dodge: contact.dodge };
  const cover = coverOf(punch, defender, now);
  if (cover >= RULES.blockAt) return { kind: "block" };
  const hit = damageOf(punch, attacker, defender, now);
  // A glancing blow and partial cover each take some of the sting out.
  const damage = Math.round(hit.damage * (0.4 + 0.6 * contact.amount) * (1 - cover) * 10) / 10;
  const clean = contact.amount >= 1 && cover < 0.25;
  // Only a square blow stuns: a counter through a leaky guard, or anything this hard.
  const stagger = hit.canStun && contact.amount >= 1 && (punch.counter ? cover < 0.5 : damage >= RULES.stunDamage);
  return { kind: "hit", damage, heavy: damage >= RULES.heavyDamage || (hit.heavy && clean), stagger, cover };
}

/** A punch's full damage if it lands clean, and whether it could stun. */
export function damageOf(punch: ActivePunch, attacker: Fighter, defender: Fighter, now: number): { damage: number; heavy: boolean; canStun: boolean } {
  const spec = PUNCHES[punch.style];
  const head = punch.level === "head";
  let damage = spec.damage * (head ? RULES.headDamage : 1) * (0.8 + 0.4 * clamp01(punch.power));
  if (punch.tired) damage *= RULES.tiredDamage;
  const counterJab = punch.counter && punch.style === "jab";
  if (counterJab) damage *= RULES.counterJab;
  else if (punch.counter) damage *= RULES.counterOther;
  if (defender.staggered(now)) damage *= RULES.staggerTaken;
  // A boxer who is gassed or worn down hits softer, even before they run dry.
  damage *= (0.75 + 0.25 * (attacker.stamina / RULES.maxStamina)) * attacker.fatigue.weak;
  damage = Math.round(damage * 10) / 10;
  const canStun = head && !punch.tired && !defender.staggered(now) && now >= defender.stunImmuneUntil;
  return { damage, heavy: damage >= RULES.heavyDamage || counterJab, canStun };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
