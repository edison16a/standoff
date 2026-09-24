import { otherSlot, type PerSlot, type Slot } from "@/shared/players";
import type { GameEvent } from "./events";
import type { Fencer } from "./fencer";
import {
  CLASH_WINDOW_MS,
  DEFLECTED_MS,
  DOUBLE_WINDOW_MS,
  JAB_DURATION_MS,
  JAB_IMPACT_MS,
  OFF_TARGET_ANGLE,
  REACH,
} from "./rules";

interface PendingJab {
  attacker: Slot;
  startedAt: number;
  impactAt: number;
}

/** How an exchange ended, once the referee is sure. */
export type Verdict = { kind: "touch"; scorer: Slot; at: number } | { kind: "double"; at: number };

export interface RefereeStep {
  events: GameEvent[];
  verdict: Verdict | null;
}

/**
 * Decides every exchange. It runs on the host, never on a phone, so
 * neither player's device gets a say in whether their own touch landed.
 *
 * A jab does not land the moment it is detected. The tip takes a short
 * while to arrive, and the defender's parry window is checked at that
 * arrival time. That gap is what lets a quick reaction save a touch.
 */
export class Referee {
  private pending: PendingJab[] = [];
  private firstTouch: { scorer: Slot; at: number } | null = null;
  private lastJabAt: PerSlot<number> = { 1: -Infinity, 2: -Infinity };

  constructor(
    private readonly fencers: PerSlot<Fencer>,
    private readonly parryWindowMs: () => number,
  ) {}

  reset(): void {
    this.pending = [];
    this.firstTouch = null;
    this.lastJabAt = { 1: -Infinity, 2: -Infinity };
  }

  jab(slot: Slot, now: number): GameEvent[] {
    const fencer = this.fencers[slot];
    const midJab = fencer.action === "jab" && now - fencer.actionStartedAt < JAB_DURATION_MS;
    if (now < fencer.lockedUntil || midJab) return [];
    fencer.setAction("jab", now);
    this.lastJabAt[slot] = now;
    this.pending.push({ attacker: slot, startedAt: now, impactAt: now + JAB_IMPACT_MS });
    return [{ type: "jab", t: now, slot }];
  }

  parry(slot: Slot, now: number): GameEvent[] {
    const fencer = this.fencers[slot];
    if (now < fencer.lockedUntil) return [];
    fencer.parryUntil = now + this.parryWindowMs();
    fencer.setAction("parry", now);
    return [{ type: "parry", t: now, slot }];
  }

  step(now: number): RefereeStep {
    const events: GameEvent[] = [];
    const due = this.pending.filter((jab) => jab.impactAt <= now);
    this.pending = this.pending.filter((jab) => jab.impactAt > now);
    for (const jab of due) events.push(...this.resolve(jab));

    let verdict: Verdict | null = null;
    if (this.firstTouch && now >= this.firstTouch.at + DOUBLE_WINDOW_MS) {
      verdict = { kind: "touch", ...this.firstTouch };
      this.firstTouch = null;
    }
    const double = events.find((event) => event.type === "double");
    if (double) verdict = { kind: "double", at: double.t };
    return { events, verdict };
  }

  private resolve(jab: PendingJab): GameEvent[] {
    const attacker = this.fencers[jab.attacker];
    const defender = this.fencers[otherSlot(jab.attacker)];
    const t = jab.impactAt;

    const inRange = Math.abs(defender.x - attacker.x) <= REACH;
    const onTarget = Math.abs(attacker.aim.pitch) <= OFF_TARGET_ANGLE && Math.abs(attacker.aim.yaw) <= OFF_TARGET_ANGLE;
    if (!inRange || !onTarget) return [{ type: "whiff", t, slot: jab.attacker }];

    if (defender.parryUntil >= t) {
      attacker.lockedUntil = t + DEFLECTED_MS;
      attacker.setAction("deflected", t);
      const clash = Math.abs(this.lastJabAt[defender.slot] - jab.startedAt) <= CLASH_WINDOW_MS;
      return [{ type: "parried", t, attacker: jab.attacker, clash }];
    }

    if (this.firstTouch && this.firstTouch.scorer !== jab.attacker && t - this.firstTouch.at <= DOUBLE_WINDOW_MS) {
      this.firstTouch = null;
      return [{ type: "double", t }];
    }
    this.firstTouch ??= { scorer: jab.attacker, at: t };
    return [];
  }
}
