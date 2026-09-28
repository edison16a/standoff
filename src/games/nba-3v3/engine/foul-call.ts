import { shotsFor } from "./fouls";
import { startFreeThrows } from "./free-throw";
import type { Match } from "./match";
import { FREE_THROW } from "./tuning";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/**
 * The whistle. A reach in stops play at once and sends the fouled
 * player to the line for two. A foul on a shot lets the shot finish
 * first: if it drops the basket counts and one free throw follows, and
 * if it misses the shooter gets two, or three on a three. Either way the
 * referee comes on at the whistle, which the renderer reads here.
 */

export type FoulKind = "reach" | "shooting";

/** What the referee is signalling, from the whistle until the walk to the line. */
export interface FoulCall {
  kind: FoulKind;
  fouler: number;
  victim: number;
  /** Match time of the whistle. */
  at: number;
  /** Where it happened, so the referee comes on near it. */
  spot: V2;
  /** Set when a fouled shot went in: the referee signals the basket counts. */
  andOne: boolean;
}

/** A shot fouled in the act, waiting to see if it drops. */
export interface PendingFoul {
  fouler: number;
  victim: number;
  points: number;
}

function whistle(m: Match, kind: FoulKind, fouler: Athlete, victim: Athlete): void {
  m.foulCall = { kind, fouler: fouler.id, victim: victim.id, at: m.time, spot: { x: (fouler.x + victim.x) / 2, z: (fouler.z + victim.z) / 2 }, andOne: false };
  const attempt = fouler.action.kind === "steal" ? fouler.action.attempt : 0;
  m.emit({ type: "foul", id: fouler.id, victim: victim.id, attempt, shooting: kind === "shooting" });
}

/** A reach in: the whistle, then two free throws. */
export function callFoul(m: Match, fouler: Athlete, victim: Athlete, shots: 1 | 2 | 3 = 2): void {
  whistle(m, "reach", fouler, victim);
  m.pendingFoul = null;
  startFreeThrows(m, fouler, victim, shots, FREE_THROW.whistle);
}

/** Contact on a shot: the whistle now, the free throws once the ball has come down. */
export function callShootingFoul(m: Match, fouler: Athlete, shooter: Athlete, points: number): void {
  whistle(m, "shooting", fouler, shooter);
  m.pendingFoul = { fouler: fouler.id, victim: shooter.id, points };
}

/**
 * A shot finished. If it was fouled, the shooter goes to the line: one
 * after a make, and the check up that would follow a basket waits.
 * Returns true when free throws were given.
 */
export function settleShootingFoul(m: Match, shooter: number, made: boolean): boolean {
  const pending = m.pendingFoul;
  if (!pending || pending.victim !== shooter) return false;
  m.pendingFoul = null;
  if (m.phase === "over") return false;
  const fouler = m.athletes[pending.fouler]!;
  const victim = m.athletes[pending.victim]!;
  if (made) {
    if (m.foulCall) m.foulCall.andOne = true;
    m.emit({ type: "andOne", id: victim.id });
  }
  // The referee has been on since contact, so the whistle beat is only what is left of it.
  const since = m.foulCall ? m.time - m.foulCall.at : FREE_THROW.whistle;
  startFreeThrows(m, fouler, victim, shotsFor(made, pending.points), Math.max(FREE_THROW.minWhistle, FREE_THROW.whistle - since + (made ? 0.8 : 0)));
  return true;
}

/**
 * Test shortcut for the admin panel: a foul by the nearest defender on
 * `victimId` (or whoever has the ball), for `shots` free throws. With
 * `whistle` off it skips the referee and goes straight to the line.
 */
export function forceFoul(m: Match, shots: 1 | 2 | 3 = 2, victimId: number | null = null, whistle = true): boolean {
  if (m.phase !== "live" && m.phase !== "check" && m.phase !== "dead") return false;
  const victim = (victimId !== null ? m.athletes[victimId] : null) ?? m.holder ?? m.athletes.find((a) => a.team === m.offence) ?? null;
  if (!victim) return false;
  const fouler = m.opponents(victim.team).sort((p, q) => Math.hypot(p.x - victim.x, p.z - victim.z) - Math.hypot(q.x - victim.x, q.z - victim.z))[0];
  if (!fouler) return false;
  m.checkUp = null;
  m.pendingFoul = null;
  if (whistle) {
    callFoul(m, fouler, victim, shots);
    return true;
  }
  m.foulCall = null;
  startFreeThrows(m, fouler, victim, shots, 0.2);
  return true;
}
