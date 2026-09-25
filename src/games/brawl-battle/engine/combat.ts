import { chargedHit, inWindow, liveHitboxes } from "./attack";
import { hurtbox, inPlay } from "./fighter";
import { hitstopFrames, hitstunFrames, launchSpeed, launchVector } from "./knockback";
import { moveOf, type Hit, type HitSound } from "./moves";
import { CHARACTERS } from "../roster";
import { blockHit } from "./shield";
import { HITSTOP, LAUNCH } from "./tuning";
import { chargeFromHit } from "./ult";
import type { Fighter, MatchState } from "./types";

/**
 * Hits between fighters. Every contact this step is found first and
 * then applied, so two fighters who swing into each other both land.
 */

export interface Strike {
  hit: Hit;
  sound: HitSound;
  heavy: boolean;
  unblockable: boolean;
  /** The way the hit sends the target. */
  side: 1 | -1;
  /** Where it connected, for the spark. */
  x: number;
  y: number;
  ult: boolean;
  /** Thrown from afar, so the thrower does not freeze with the target. */
  ranged: boolean;
}

/** Whether a circle touches the fighter's body box. */
export function touches(f: Fighter, cx: number, cy: number, r: number): boolean {
  const b = hurtbox(f);
  const dx = cx - Math.max(b.x1, Math.min(cx, b.x2));
  const dy = cy - Math.max(b.y1, Math.min(cy, b.y2));
  return dx * dx + dy * dy <= r * r;
}

/** Whether anything can hit this fighter right now. */
export function hittable(f: Fighter): boolean {
  return inPlay(f) && f.invincible <= 0 && !inWindow(f, "invincible");
}

export function resolveMelee(state: MatchState): void {
  const found: { attacker: Fighter; target: Fighter; strike: Strike }[] = [];
  for (const attacker of state.fighters) {
    const live = liveHitboxes(attacker);
    if (!live) continue;
    for (const target of state.fighters) {
      if (target === attacker || !hittable(target)) continue;
      for (const b of live.boxes) {
        const key = `${target.id}:${b.group ?? 0}`;
        const cx = attacker.pos.x + b.x * attacker.facing;
        const cy = attacker.pos.y + b.y;
        if (attacker.struck.includes(key) || !touches(target, cx, cy, b.r)) continue;
        attacker.struck.push(key);
        // A box behind the fighter sends the target backwards.
        const side = (b.x < 0 ? -attacker.facing : attacker.facing) as 1 | -1;
        const strike: Strike = {
          hit: chargedHit(b, attacker.charged),
          sound: live.move.sound,
          heavy: live.move.heavy === true,
          unblockable: live.move.unblockable === true,
          side,
          x: (cx + target.pos.x) / 2,
          y: Math.min(cy, target.pos.y + CHARACTERS[target.character].physique.height),
          ult: attacker.move === "ult",
          ranged: false,
        };
        found.push({ attacker, target, strike });
        break;
      }
    }
  }
  for (const { attacker, target, strike } of found) applyStrike(state, attacker, target, strike);
}

/** Lands one hit: a block, or damage and a launch that grows with the damage. */
export function applyStrike(state: MatchState, attacker: Fighter, target: Fighter, s: Strike): void {
  if (target.action === "shield" && !s.unblockable) return blockHit(state, attacker, target, s);
  const { damage } = s.hit;
  target.percent = Math.min(999, target.percent + damage);
  target.stats.damageTaken += damage;
  attacker.stats.damageDealt += damage;
  attacker.stats.hits++;
  target.lastHitBy = { id: attacker.id, frame: state.frame };
  chargeFromHit(state, attacker, target, damage);
  const freeze = s.ult && s.hit.base >= 10 ? HITSTOP.max : hitstopFrames(damage, s.heavy);
  if (!s.ranged) attacker.freeze = Math.max(attacker.freeze, freeze);
  if (!s.ranged && attacker.move && moveOf(attacker.character, attacker.move).stopOnHit) attacker.vel.x = 0;
  target.freeze = Math.max(target.freeze, freeze);
  const speed = launchSpeed(s.hit, target.percent, CHARACTERS[target.character].physique.weight);
  state.events.push({ type: "hit", attacker: attacker.id, target: target.id, damage, sound: s.sound, heavy: s.heavy, speed, freeze, x: s.x, y: s.y });
  // Armored moves shrug the launch off and keep going.
  if (inWindow(target, "armor")) return;
  const launch = launchVector(speed, s.hit.angle, s.side);
  if (target.ground !== null && launch.y < 0) {
    // A spike on the floor bounces the target up if it is strong enough.
    launch.y = speed >= LAUNCH.bounceSpeed ? -launch.y * LAUNCH.bounce : 0;
  }
  if (launch.y > 0) target.ground = null;
  target.launch = launch;
  target.vel = { x: 0, y: 0 };
  target.action = "hurt";
  target.frame = 0;
  target.move = null;
  target.hitstun = Math.max(1, hitstunFrames(speed));
  target.buffer = null;
  // A hit breaks a charge, and a hold still going will not come out later.
  target.hold = null;
  target.jumpBuffer = 0;
  target.lag = 0;
  // Being hit gives back the air jump and the recovery, so a fighter can always try to come back.
  target.airJumps = 1;
  target.recoveryUsed = false;
  target.facing = s.side === 1 ? -1 : 1;
}
