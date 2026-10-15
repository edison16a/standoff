import { statsOf } from "./body";
import { botSkill } from "./bots/skill";
import { newBurst } from "./burst";
import type { Match } from "./match";
import { breakClinch } from "./support/clinch-break";
import { clinchOf } from "./support/clinch";
import { RUSH } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dir2, dist2 } from "./vec";

/**
 * Rush pressed while a blocker has hold of him: the rusher tries to
 * break free. The odds grow with his power and with every second the QB
 * holds the ball, so a QB who sits in the pocket gets hit. Winning plays
 * the authored break free (burst.ts): he clubs and swims past, the man
 * holding him stumbles away, and he bursts at the QB. Losing is a plain
 * rush, still pushing. A free man's Rush is the plain rush too.
 */
export const SHED_ODDS = {
  /** The chance off the snap, for an average man. */
  base: 0.08,
  perPower: 0.04,
  /** Added per second since the snap, up to `late`. */
  perSecond: 0.16,
  late: 0.5,
  max: 0.75,
  /** A computer rusher's odds scale from this share at its worst to all of them at its best. */
  botFloor: 0.45,
} as const;

/** The chance one Rush breaks free. Pure, so tests can check it. */
export function shedOdds(power: number, sinceSnap: number, botAccuracy: number | null = null): number {
  const late = Math.min(SHED_ODDS.late, Math.max(0, sinceSnap) * SHED_ODDS.perSecond);
  const odds = clamp(SHED_ODDS.base + (power - 5) * SHED_ODDS.perPower + late, 0, SHED_ODDS.max);
  return botAccuracy === null ? odds : odds * (SHED_ODDS.botFloor + (1 - SHED_ODDS.botFloor) * botAccuracy);
}

/** The plain rush: a short burst that pushes through the line far more easily. */
export function startRush(a: Athlete): void {
  if (a.rushCd > 0) return;
  a.rushT = RUSH.time;
  a.rushCd = RUSH.cooldown;
}

/** Rush pressed: break free of whoever holds him, or rush on. The game played as it was filmed only ever rushed. */
export function pressRush(m: Match, a: Athlete): void {
  if (a.rushCd > 0) return;
  startRush(a);
  if (m.filmed || m.phase !== "live" || a.blocked <= 0 || a.burst) return;
  const skill = botSkill(m.level);
  const odds = shedOdds(statsOf(a).power, m.play?.sinceSnap ?? 0, a.auto ? skill.accuracy : null);
  if (m.playRng.chance(odds)) breakFree(m, a);
}

/** Wins the hand fight: out of a block in space, or off the linemen, and away toward the ball. */
export function breakFree(m: Match, a: Athlete): void {
  const c = clinchOf(m, a.id);
  const ball = m.carrier() ?? m.qbOf(m.offense);
  if (c && c.d === a.id) {
    m.support.clinches.splice(m.support.clinches.indexOf(c), 1);
    breakClinch(m, m.athlete(c.o)!, a, "shed");
  } else {
    const man = nearestLineman(m, a);
    if (man) m.emit({ type: "pads", a: man.id, b: a.id, power: 0.8 });
    const to = dir2(a, ball);
    a.vx = to.x * 2.6;
    a.vz = to.z * 2.6;
  }
  // The swim goes over the shoulder on the side the ball is: his left when it is to his left.
  const across = (ball.x - a.x) * Math.cos(a.yaw) - (ball.z - a.z) * Math.sin(a.yaw);
  a.burst = newBurst(across >= 0 ? 1 : -1);
  a.blocked = 0;
  a.block = null;
  a.stagger = 0;
}

/** The opposing lineman nearest him, the one he just beat. */
function nearestLineman(m: Match, a: Athlete): Athlete | null {
  let best: Athlete | null = null;
  for (const o of m.athletes) if (o.role === "lineman" && o.team !== a.team && (!best || dist2(o, a) < dist2(best, a))) best = o;
  return best;
}
