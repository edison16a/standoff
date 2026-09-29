import { otherSlot, type Slot } from "@/games/blade-clash/players";
import { DEFAULT_BOT_LEVEL, type BotLevel } from "@/games/kit/difficulty/difficulty";
import { ATTACKS, attackHold, attackLength, type Attack } from "./bot-moves";
import { botTactics, type BotTactics, type Span } from "./bot-tactics";
import type { Engine } from "./engine";
import type { FighterFrame } from "./frames";
import { distance, lerpVec, type Vec3 } from "./geometry";
import { GUARD, type SwordControl } from "./sword";

/** Where the computer waits between attacks: just out of the player's reach. */
const WAIT_GAP = 2.35;
/** How close it steps in to attack. */
const ATTACK_GAP = 1.7;
/** Closer than this it backs off, unless it is attacking. It holds its ground in between, so it can be closed on. */
const CROWDED_GAP = 1.45;
/** A tip closing on its chest this fast, from this near, is a swing worth blocking. */
const THREAT_SPEED = 2.5;
const THREAT_RANGE = 1.3;
const BLOCK_HOLD_MS = 380;

type Plan = { kind: "guard" } | { kind: "attack"; attack: Attack; start: SwordControl; at: number } | { kind: "block"; at: number; until: number };

export interface BotOptions {
  /** Read every frame, so a change in the lobby applies at once. */
  level?: () => BotLevel;
  /** Swappable so tests can make it predictable. */
  random?: () => number;
}

/**
 * The computer opponent for solo play. It drives one fighter through the
 * same `control` call a phone uses, so its sword obeys exactly the same
 * physics: it hits only by swinging into the player, and a player's block
 * stops it like anyone else. It waits out of reach, steps in to attack,
 * and sometimes gets its blade in the way of a swing. How often and how
 * well depends on the difficulty; in Training it just stands in guard.
 */
export class Bot {
  private plan: Plan = { kind: "guard" };
  private nextAttackAt = 0;
  private lastPhase = "";
  /** How far the other tip was from its chest last frame. */
  private lastThreat: number | null = null;
  private held: SwordControl = { ...GUARD };
  private readonly level: () => BotLevel;
  private readonly random: () => number;

  constructor(
    readonly slot: Slot,
    options: BotOptions = {},
  ) {
    this.level = options.level ?? (() => DEFAULT_BOT_LEVEL);
    this.random = options.random ?? Math.random;
  }

  /** Called once per host frame, before the engine advances. */
  drive(engine: Engine): void {
    const phase = engine.phase;
    const tactics = botTactics(this.level());
    if (phase !== this.lastPhase) this.onPhase(engine, tactics);
    this.lastPhase = phase;
    let move = 0;
    if (!tactics.acts) this.held = { ...GUARD };
    else if (phase === "live") move = this.fight(engine, tactics) * tactics.footwork;
    engine.control(this.slot, { ...this.held, move });
  }

  /** It never makes the player wait for a rematch. */
  private onPhase(engine: Engine, tactics: BotTactics): void {
    if (engine.phase === "matchOver") engine.rematch(this.slot);
    if (engine.phase === "live" || engine.phase === "countdown" || engine.phase === "point") {
      this.plan = { kind: "guard" };
      this.held = { ...GUARD };
      this.nextAttackAt = engine.now + this.between(tactics.attackEvery);
    }
  }

  /** One frame of fighting. Returns the footwork. */
  private fight(engine: Engine, tactics: BotTactics): number {
    const now = engine.now;
    const me = engine.fighters[this.slot].frame(now);
    const them = engine.fighters[otherSlot(this.slot)].frame(now);
    const gap = Math.abs(them.x - me.x);
    this.watch(them, me, now, tactics);

    const plan = this.plan;
    if (plan.kind === "attack") {
      // A slower tempo plays the same attack stretched out, which is easier to see coming.
      const elapsed = (now - plan.at) / tactics.tempo;
      this.held = attackHold(plan.attack, plan.start, elapsed);
      if (elapsed >= attackLength(plan.attack)) this.rest(now, tactics);
      // Step in during the wind up so the strike lands in reach.
      return elapsed < plan.attack.windUpMs && gap > ATTACK_GAP ? 1 : 0;
    }
    if (plan.kind === "block") {
      if (now >= plan.at) this.held = blockToward(me, them);
      if (now >= plan.until) this.rest(now, tactics);
      return 0;
    }
    this.held = this.guard(now);
    if (now >= this.nextAttackAt) {
      if (gap <= ATTACK_GAP + 0.25) {
        const attack = ATTACKS[Math.floor(this.random() * ATTACKS.length)]!;
        this.plan = { kind: "attack", attack, start: { ...this.held }, at: now };
      }
      return gap > ATTACK_GAP ? 1 : 0;
    }
    return gap < CROWDED_GAP ? -1 : gap > WAIT_GAP + 0.2 ? 1 : 0;
  }

  /** Spots a swing heading for it and, some of the time, decides to block it. */
  private watch(them: FighterFrame, me: FighterFrame, now: number, tactics: BotTactics): void {
    const chest: Vec3 = { x: me.x, y: 1.25, z: 0 };
    const away = distance(them.sword.tip, chest);
    const before = this.lastThreat;
    this.lastThreat = away;
    if (before === null || this.plan.kind !== "guard") return;
    // Only a tip coming at it counts, so its own blocks never set the other off.
    const closing = (before - away) * 60;
    if (closing < THREAT_SPEED || away > THREAT_RANGE || this.random() > tactics.blockChance) return;
    const at = now + this.between(tactics.reaction);
    this.plan = { kind: "block", at, until: at + BLOCK_HOLD_MS };
  }

  private rest(now: number, tactics: BotTactics): void {
    this.plan = { kind: "guard" };
    this.nextAttackAt = now + this.between(tactics.attackEvery);
  }

  /** The resting guard, breathing a little so it never looks frozen. */
  private guard(now: number): SwordControl {
    const sway = Math.sin(now / 520 + this.slot) * 0.06;
    return { ...GUARD, yaw: GUARD.yaw + sway, pitch: GUARD.pitch + Math.sin(now / 730) * 0.05 };
  }

  private between(range: Span): number {
    return range.min + this.random() * range.spread;
  }
}

/** Holds the blade across the path of the other blade, pointing at its middle. */
export function blockToward(me: FighterFrame, them: FighterFrame): SwordControl {
  const target = lerpVec(them.sword.base, them.sword.tip, 0.6);
  const hand = me.sword.hand;
  const f = (target.x - hand.x) * me.facing;
  const u = target.y - hand.y;
  const r = (target.z - hand.z) * me.facing;
  return { yaw: Math.atan2(r, Math.max(0.05, f)), pitch: Math.atan2(u, Math.hypot(f, r)), roll: 0, reach: 0.35 };
}
