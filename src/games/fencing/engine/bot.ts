import { otherSlot, type Slot } from "@/games/fencing/players";
import type { Engine } from "./engine";
import { MIN_GAP, REACH } from "./rules";

/** Where the computer likes to wait: just outside the other fencer's reach. */
const WAIT_GAP = REACH + 0.5;
/** How close it gets before it lunges. */
const STRIKE_GAP = REACH - 0.25;
/** Time between its attacks, so the player gets a turn. */
const ATTACK_EVERY_MS = { min: 1400, spread: 1600 };
/**
 * How long it takes to see a jab and parry it. A jab lands 220 ms after it
 * starts and a parry may be 80 ms late, so about six in ten of these
 * reactions arrive in time.
 */
const REACTION_MS = { min: 140, spread: 260 };
/** Share of the player's jabs it even tries to parry. */
const PARRY_CHANCE = 0.55;

/**
 * The computer opponent for solo play. It drives one fencer through the
 * same `control` and `strike` calls a phone would, so the referee judges
 * it by exactly the same rules. It waits just out of range, steps in to
 * attack every couple of seconds, backs off again, and sometimes parries.
 */
export class Bot {
  private plan: "wait" | "attack" = "wait";
  private nextAttackAt = 0;
  private parryAt: number | null = null;
  private lastSeenJab = -Infinity;
  private lastPhase = "";

  constructor(
    readonly slot: Slot,
    /** Swappable so tests can make it predictable. */
    private readonly random: () => number = Math.random,
  ) {}

  /** Called once per host frame, before the engine advances. */
  drive(engine: Engine): void {
    const phase = engine.phase;
    if (phase !== this.lastPhase) this.onPhase(engine);
    this.lastPhase = phase;

    const move = phase === "live" ? this.fence(engine) : 0;
    engine.control(this.slot, { ...this.wiggle(engine.now), move });
  }

  /** It never makes the player wait for a rematch. */
  private onPhase(engine: Engine): void {
    if (engine.phase === "matchOver") engine.rematch(this.slot);
    if (engine.phase === "live") {
      this.plan = "wait";
      this.parryAt = null;
      this.nextAttackAt = engine.now + this.between(ATTACK_EVERY_MS);
    }
  }

  /** One frame of fencing. Returns the footwork. */
  private fence(engine: Engine): number {
    const now = engine.now;
    const me = engine.fencers[this.slot];
    const them = engine.fencers[otherSlot(this.slot)];
    const gap = Math.abs(them.x - me.x);

    if (them.action === "jab" && them.actionStartedAt > this.lastSeenJab) {
      this.lastSeenJab = them.actionStartedAt;
      if (this.random() < PARRY_CHANCE) this.parryAt = now + this.between(REACTION_MS);
    }
    if (this.parryAt !== null && now >= this.parryAt) {
      this.parryAt = null;
      engine.strike(this.slot, "parry");
    }

    if (this.plan === "wait" && now >= this.nextAttackAt) this.plan = "attack";
    if (this.plan === "attack") {
      if (gap > STRIKE_GAP) return 1;
      engine.strike(this.slot, "jab");
      this.plan = "wait";
      this.nextAttackAt = now + this.between(ATTACK_EVERY_MS);
      return 0;
    }
    // Waiting: drift back to just outside reach, slowly enough that the
    // player can still catch it, and never into the body.
    if (gap < MIN_GAP + 0.4) return -1;
    if (gap < WAIT_GAP - 0.3) return -0.45;
    if (gap > WAIT_GAP + 0.3) return 0.6;
    return 0;
  }

  /** A slow wander of the blade so it looks held, not bolted on. */
  private wiggle(now: number): { pitch: number; yaw: number; roll: number } {
    return { pitch: 0.1 * Math.sin(now / 430), yaw: 0.06 * Math.sin(now / 610), roll: 0.2 * Math.sin(now / 900) };
  }

  private between(range: { min: number; spread: number }): number {
    return range.min + this.random() * range.spread;
  }
}
