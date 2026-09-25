import { otherSlot, type PerSlot, type Slot } from "@/games/fencing/players";
import type { GameEvent } from "./events";
import type { Fencer } from "./fencer";
import {
  AIM_LOOKBACK_MS,
  CLASH_WINDOW_MS,
  DEFLECTED_MS,
  DOUBLE_WINDOW_MS,
  JAB_DURATION_MS,
  JAB_IMPACT_MS,
  OFF_TARGET_ANGLE,
  PARRY_GRACE_MS,
  PARRY_RECOVERY_MS,
  REACH,
} from "./rules";

interface PendingJab {
  attacker: Slot;
  startedAt: number;
  impactAt: number;
  /** Where the blade pointed just before the chop, which is what the jab is judged by. */
  aim: { pitch: number; yaw: number };
}

/** A jab that got through, waiting out the parry grace and the double window. */
interface Landed {
  scorer: Slot;
  at: number;
  startedAt: number;
}

/** How an exchange ended, once the referee is sure. */
export type Verdict = { kind: "touch"; scorer: Slot; at: number } | { kind: "double"; at: number };

export interface RefereeStep {
  events: GameEvent[];
  verdict: Verdict | null;
}

/** A touch is only final once both a late parry and the other fencer's double are ruled out. */
const SETTLE_MS = Math.max(DOUBLE_WINDOW_MS, PARRY_GRACE_MS);

/**
 * Decides every exchange. It runs on the host, never on a phone, so
 * neither player's device gets a say in whether their own touch landed.
 *
 * A jab does not land the moment it is detected. The tip takes a moment
 * to arrive, and the defender's parry is checked at that arrival, with a
 * short grace after it. A parry blocks the first jab that reaches it and
 * then closes. Attacking drops your own parry, and a parry cannot start
 * while your own lunge is still going out.
 */
export class Referee {
  private pending: PendingJab[] = [];
  private landed: Landed[] = [];
  private lastJabAt: PerSlot<number> = { 1: -Infinity, 2: -Infinity };

  constructor(
    private readonly fencers: PerSlot<Fencer>,
    private readonly parryWindowMs: () => number,
  ) {}

  reset(): void {
    this.pending = [];
    this.landed = [];
    this.lastJabAt = { 1: -Infinity, 2: -Infinity };
  }

  jab(slot: Slot, now: number): GameEvent[] {
    const fencer = this.fencers[slot];
    const midJab = fencer.action === "jab" && now - fencer.actionStartedAt < JAB_DURATION_MS;
    if (now < fencer.lockedUntil || midJab) return [];
    // A lunge commits you: whatever parry was open is gone.
    fencer.parryUntil = Math.min(fencer.parryUntil, now);
    fencer.setAction("jab", now);
    this.lastJabAt[slot] = now;
    this.pending.push({ attacker: slot, startedAt: now, impactAt: now + JAB_IMPACT_MS, aim: fencer.aimBefore(AIM_LOOKBACK_MS) });
    return [{ type: "jab", t: now, slot }];
  }

  parry(slot: Slot, now: number): GameEvent[] {
    const fencer = this.fencers[slot];
    if (now < fencer.lockedUntil || now < fencer.parryReadyAt) return [];
    if (this.pending.some((jab) => jab.attacker === slot)) return [];
    fencer.parryUntil = now + this.parryWindowMs();
    fencer.parryReadyAt = fencer.parryUntil + PARRY_RECOVERY_MS;
    fencer.setAction("parry", now);
    const events: GameEvent[] = [{ type: "parry", t: now, slot }];
    // Just too late at the host, but inside the grace: the touch is saved.
    const saved = this.landed.find((touch) => touch.scorer !== slot && now - touch.at <= PARRY_GRACE_MS);
    if (saved) {
      // Like any parry, it blocked one attack and closes, leaving the guard ready.
      fencer.parryUntil = now;
      fencer.parryReadyAt = now;
      this.landed = this.landed.filter((touch) => touch !== saved);
      events.push(this.deflect(saved.scorer, saved.startedAt, now));
    }
    return events;
  }

  step(now: number): RefereeStep {
    const events: GameEvent[] = [];
    const due = this.pending.filter((jab) => jab.impactAt <= now);
    this.pending = this.pending.filter((jab) => jab.impactAt > now);
    for (const jab of due) events.push(...this.resolve(jab));

    const [first, second] = this.landed;
    if (first && second && first.scorer !== second.scorer && second.at - first.at <= DOUBLE_WINDOW_MS) {
      this.landed = [];
      events.push({ type: "double", t: second.at });
      return { events, verdict: { kind: "double", at: second.at } };
    }
    if (first && now >= first.at + SETTLE_MS) {
      this.landed = [];
      return { events, verdict: { kind: "touch", scorer: first.scorer, at: first.at } };
    }
    return { events, verdict: null };
  }

  private resolve(jab: PendingJab): GameEvent[] {
    const attacker = this.fencers[jab.attacker];
    const defender = this.fencers[otherSlot(jab.attacker)];
    const t = jab.impactAt;

    if (Math.abs(defender.x - attacker.x) > REACH) return [{ type: "whiff", t, slot: jab.attacker, reason: "far" }];
    const onTarget = Math.abs(jab.aim.pitch) <= OFF_TARGET_ANGLE && Math.abs(jab.aim.yaw) <= OFF_TARGET_ANGLE;
    if (!onTarget) return [{ type: "whiff", t, slot: jab.attacker, reason: "wide" }];

    if (defender.parryUntil >= t) {
      // A parry blocks one attack, and blocking it leaves the guard ready at once.
      defender.parryUntil = t;
      defender.parryReadyAt = t;
      return [this.deflect(jab.attacker, jab.startedAt, t)];
    }
    this.landed.push({ scorer: jab.attacker, at: t, startedAt: jab.startedAt });
    return [];
  }

  /** The attacker's blade is knocked away, and they cannot strike for a moment. */
  private deflect(attackerSlot: Slot, startedAt: number, t: number): GameEvent {
    const attacker = this.fencers[attackerSlot];
    attacker.lockedUntil = t + DEFLECTED_MS;
    attacker.setAction("deflected", t);
    const clash = Math.abs(this.lastJabAt[otherSlot(attackerSlot)] - startedAt) <= CLASH_WINDOW_MS;
    return { type: "parried", t, attacker: attackerSlot, clash };
  }
}
