import { otherSlot, type PerSlot, type Slot } from "@/games/blade-clash/players";
import type { Tuning } from "@/games/blade-clash/tuning";
import { DEG } from "@/games/kit/motion/math3d";
import type { GameEvent } from "./events";
import type { Fighter } from "./fighter";
import type { Match } from "./match";
import { CLASH_COOLDOWN_MS, HIT_GUARD_MS, HIT_PUSHBACK } from "./rules";
import { blendControl } from "./sword";
import { sweep, type Contact } from "./sweep";

/** Clash speeds this far over the minimum count as the biggest clash there is. */
const FULL_CLASH_SPEED = 9;

type Turn = { yaw: number; pitch: number };

/**
 * Which way a clash throws each blade, in the thrower's own hold. Each
 * blade bounces back the way it came and is pushed along the way the
 * other one was going, so the faster swing rebounds and a still block is
 * shoved aside. The fighters face each other, so the other blade's turn
 * to its right is a turn to our left.
 */
export function clashPushes(rates: PerSlot<Turn>, strength: number, knockAngle: number): PerSlot<Turn> {
  const size = knockAngle * DEG * (0.6 + 0.6 * strength);
  const push = (own: Turn, other: Turn): Turn => {
    const yaw = -own.yaw - other.yaw;
    const pitch = -own.pitch + other.pitch;
    const length = Math.hypot(yaw, pitch);
    return length < 1e-3 ? { yaw: 0, pitch: size } : { yaw: (yaw / length) * size, pitch: (pitch / length) * size };
  };
  return { 1: push(rates[1], rates[2]), 2: push(rates[2], rates[1]) };
}

/**
 * Settles what the swords did during one tick: runs the swept tests and
 * applies what they found. A clash throws both swords and staggers both
 * fighters. A hit costs the fighter who took it one health and pushes
 * them back, and the last one ends the fight.
 */
export class Combat {
  private clashReadyAt = -Infinity;

  reset(): void {
    this.clashReadyAt = -Infinity;
  }

  step(fighters: PerSlot<Fighter>, match: Match, tuning: Tuning, now: number, dtMs: number): GameEvent[] {
    const contacts = sweep([fighters[1].combatant(now), fighters[2].combatant(now)], {
      dt: dtMs / 1000,
      hitSpeed: tuning.hitSpeed,
      clashSpeed: tuning.clashSpeed,
      canClash: now >= this.clashReadyAt && fighters[1].sword.isFree(now) && fighters[2].sword.isFree(now),
    });
    const events: GameEvent[] = [];
    // The faster of two hits in the same instant lands first, so a double hit at the end has a clear winner.
    for (const contact of [...contacts].sort((a, b) => b.speed - a.speed)) {
      if (contact.kind === "clash") events.push(this.clash(fighters, contact, tuning, now));
      else events.push(...this.hit(fighters, match, contact, tuning, now));
    }
    return events;
  }

  private clash(fighters: PerSlot<Fighter>, contact: Extract<Contact, { kind: "clash" }>, tuning: Tuning, now: number): GameEvent {
    this.clashReadyAt = now + CLASH_COOLDOWN_MS;
    const strength = Math.min(1, Math.max(0, (contact.speed - tuning.clashSpeed) / FULL_CLASH_SPEED));
    const pushes = clashPushes({ 1: fighters[1].sword.turnRate, 2: fighters[2].sword.turnRate }, strength, tuning.knockAngle);
    for (const slot of [1, 2] as const) {
      const fighter = fighters[slot];
      // The sword is thrown from where the blades met, not from wherever the tick carried it past that.
      const met = blendControl(fighter.sword.before, fighter.sword.control, contact.t);
      fighter.sword.knockBack(pushes[slot], now, met);
      if (fighter.action === "idle" || fighter.action === "stagger") fighter.setAction("stagger", now);
    }
    return { type: "clash", t: now, at: contact.at, strength };
  }

  private hit(fighters: PerSlot<Fighter>, match: Match, contact: Extract<Contact, { kind: "hit" }>, tuning: Tuning, now: number): GameEvent[] {
    const attackerSlot: Slot = contact.attacker === 0 ? 1 : 2;
    const victimSlot = otherSlot(attackerSlot);
    const [attacker, victim] = [fighters[attackerSlot], fighters[victimSlot]];
    if (match.phase !== "live" || victim.health <= 0) return [];
    attacker.hitReadyAt = now + tuning.hitCooldownMs;
    victim.guardUntil = now + HIT_GUARD_MS;
    victim.x -= victim.facing * HIT_PUSHBACK;
    const final = match.hurt(victimSlot, now);
    victim.health = match.health[victimSlot];
    victim.setAction(final ? "defeat" : "hit", now);
    return [
      {
        type: "hit",
        t: now,
        attacker: attackerSlot,
        victim: victimSlot,
        at: contact.at,
        part: contact.part,
        speed: contact.speed,
        health: victim.health,
        final,
      },
    ];
  }
}
