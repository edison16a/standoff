import { pressKick } from "./kick";
import { startJuke } from "./juke";
import type { Match } from "./match";
import { pickTarget } from "./aim";
import { canThrow, receivers, throwTo } from "./passing";
import { hike } from "./phases";
import { startRun } from "./qb-run";
import { startPitch } from "./run-play";
import { startDive } from "./dive";
import { pressTackle } from "./tackle";
import { RUSH } from "./tuning";
import type { Athlete, Button } from "./types";
import { dist2, type V2 } from "./vec";

/** Phones steer only the players they own, and only while the computer is not playing them. */
function own(m: Match, id: number): Athlete | null {
  const a = m.athlete(id);
  return a && a.role !== "lineman" && !a.auto ? a : null;
}

export function setMove(m: Match, id: number, move: V2): void {
  const a = own(m, id);
  if (!a) return;
  const l = Math.hypot(move.x, move.z);
  a.move = l > 1 ? { x: move.x / l, z: move.z / l } : { x: move.x, z: move.z };
}

/**
 * The throw stick. Held, it aims (and the match lights up the target);
 * let go, it throws to that target. A stick resting near the middle
 * keeps the last aim, so easing off before letting go does not cancel.
 */
export function setAim(m: Match, id: number, aim: V2 | null): void {
  const a = own(m, id);
  if (!a) return;
  if (aim === null) {
    // A flick released before the match has looked at it still finds its receiver.
    const target = m.play?.target ?? (a.aim ? pickTarget(a, a.aim, receivers(m, a)) : null);
    if (a.aim && target !== null && canThrow(m, a)) throwTo(m, a, target);
    a.aim = null;
    return;
  }
  if (Math.hypot(aim.x, aim.z) >= 0.2) a.aim = { x: aim.x, z: aim.z };
}

/** The receiver nearest a defender, who they will tail while Guard is held. */
function guardPick(m: Match, a: Athlete): number | null {
  let best: Athlete | null = null;
  for (const o of m.athletes) {
    if (o.team === a.team || o.role !== "runner") continue;
    if (!best || dist2(o, a) < dist2(best, a)) best = o;
  }
  return best?.id ?? null;
}

export function startRush(a: Athlete): void {
  if (a.rushCd > 0) return;
  a.rushT = RUSH.time;
  a.rushCd = RUSH.cooldown;
}

export function pressButton(m: Match, id: number, button: Button, value?: number): void {
  const a = own(m, id);
  if (!a) return;
  const holder = m.carrier();
  const withBall = holder?.id === a.id;
  const onOffense = a.team === m.offense;
  if (button === "hike") {
    if (m.phase === "presnap" && onOffense && a.role === "qb") hike(m, false);
  } else if (button === "kick") {
    pressKick(m, a, value);
  } else if (m.phase !== "live") {
    return;
  } else if (button === "juke") {
    if (withBall || (onOffense && !m.play?.intercepted)) startJuke(a, (e) => m.emit(e));
  } else if (button === "dive") {
    if (withBall || onOffense) startDive(m, a);
  } else if (button === "rush") {
    if (!onOffense) startRush(a);
  } else if (button === "tackle") {
    if (holder && holder.team !== a.team) pressTackle(m, a, holder);
  } else if (button === "guard") {
    if (!onOffense) a.guard = guardPick(m, a);
  } else if (button === "pass") {
    startPitch(m, a);
  } else if (button === "run") {
    startRun(m, a);
  }
}

export function releaseButton(m: Match, id: number, button: Button): void {
  const a = own(m, id);
  if (a && button === "guard") a.guard = null;
}
