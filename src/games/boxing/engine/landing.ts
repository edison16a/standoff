import type { MatchEvent } from "./events";
import type { ActivePunch, Fighter } from "./fighter";
import type { Footwork } from "./footwork";
import type { Outcome } from "./resolve";
import { PUNCHES, RULES } from "./rules";

/** The parts of the match a landing punch changes besides the two boxers. */
export interface LandingContext {
  now: number;
  round: number;
  footwork: Footwork;
}

/**
 * What a judged punch does: a miss or a block opens the defender's
 * counter window, and a clean hit takes health, rocks or stuns the
 * defender, wears them down, drives them back and can spoil their own
 * punch on its way. Every change goes out through `emit`. Returns true
 * when the defender has nothing left, so the match can put them down.
 */
export function applyOutcome(outcome: Outcome, punch: ActivePunch, attacker: Fighter, defender: Fighter, at: LandingContext, emit: (event: MatchEvent) => void): boolean {
  const facts = { fighter: attacker.id, hand: punch.hand, style: punch.style, level: punch.level };
  if (outcome.kind === "miss" || outcome.kind === "block") {
    if (outcome.kind === "miss") {
      defender.stats.dodged++;
      attacker.stamina = Math.max(0, attacker.stamina - RULES.missStamina);
      emit({ type: "miss", ...facts, target: defender.id, dodge: outcome.dodge });
    } else {
      defender.stats.blocked++;
      defender.stamina = Math.max(0, defender.stamina - RULES.blockStamina);
      defender.health = Math.max(1, defender.health - PUNCHES[punch.style].damage * RULES.blockDamage);
      emit({ type: "block", ...facts, target: defender.id });
    }
    defender.counterUntil = at.now + RULES.counterMs;
    defender.counterFrom = outcome.kind === "miss" ? "dodge" : "block";
    emit({ type: "counter", fighter: defender.id, from: defender.counterFrom });
    return false;
  }
  const { damage, heavy, stagger, cover } = outcome;
  defender.health = Math.max(0, defender.health - damage);
  defender.rockedUntil = at.now + (heavy ? RULES.heavyRockMs : RULES.rockMs);
  if (stagger) {
    defender.staggerUntil = at.now + RULES.staggerMs;
    defender.stunImmuneUntil = defender.staggerUntil + RULES.trapMs + RULES.stunImmuneMs;
    // Stunned, they reel back to their corner, and the puncher follows them in and pins them there.
    at.footwork.trap(defender.id, defender.staggerUntil + RULES.trapMs);
  }
  defender.fatigue.onHit(at.now, heavy || stagger);
  defender.counterUntil = -Infinity;
  defender.lastHit = { at: at.now, hand: punch.hand, style: punch.style, level: punch.level, damage };
  attacker.stats.landed++;
  attacker.stats.damage += damage;
  if (punch.counter) attacker.stats.counters++;
  attacker.addRoundDamage(at.round, damage);
  at.footwork.knockBack(defender.id, heavy ? 1.5 : 0.6);
  emit({ type: "hit", ...facts, target: defender.id, damage, counter: punch.counter, heavy, stagger, power: punch.power, cover: Math.round(cover * 100) / 100 });
  // Getting hit first spoils a punch still on its way, unless the two land together.
  const theirs = defender.punch;
  if (theirs && !theirs.resolved && theirs.impactAt > at.now + 40) {
    defender.punch = null;
    emit({ type: "interrupted", fighter: defender.id, hand: theirs.hand, style: theirs.style, level: theirs.level });
  }
  return defender.health <= 0;
}
