import { charOf } from "../athlete";
import { nearestBeyondArc, RIM_SPOT, rimDistance } from "../court";
import type { Match } from "../match";
import { openness } from "../passing";
import { gaussian } from "../rng";
import { GREEN_MS } from "../shot-model";
import type { Athlete } from "../types";
import { dist2, type V2 } from "../vec";
import { jumperValue, releaseSpread } from "./shot-value";
import { ballCarrier, bestSpot, goTo, laneOpen, type BotState } from "./util";

/**
 * The computer with the ball. Every fifth of a second or so it reads the
 * floor: attack an open lane, finish at the rim, take an open jumper it
 * can make, or find the open teammate, and players on phones who ask for
 * the ball get it. Shots are timed on the same meter as everyone's, with
 * a steadier hand for better shooters.
 */
/** Expected points a jumper must beat, before the lean of the shooter. */
const SHOOT_BAR = 2.15;

export function thinkWithBall(m: Match, a: Athlete, s: BotState, dt: number): void {
  const act = a.action;
  if (act.kind === "shoot") {
    if (!act.released && s.shotAt !== null && act.t * 1000 >= s.shotAt) m.release(a.id, s.shotAt);
    return;
  }
  if (act.kind !== "none") return;
  s.holdFor += dt;
  s.decideIn -= dt;
  if (m.needsClear) {
    goTo(a, nearestBeyondArc(a, 1.1));
    return;
  }
  if (s.target) goTo(a, s.target);
  if (s.decideIn > 0) return;
  s.decideIn = 0.14 + m.rng() * 0.16;
  decide(m, a, s);
}

function decide(m: Match, a: Athlete, s: BotState): void {
  const st = charOf(a).stats;
  const d = rimDistance(a);
  const open = openness(m, a);
  const lane = laneOpen(m, a);
  const caller = m.teammates(a).find((t) => !t.auto && m.time - t.calledAt < 1.2);
  if (caller && m.rng() < 0.85) return m.press(a.id, "pass", { x: caller.x - a.x, z: caller.z - a.z });

  // Late in the clock anything goes up.
  if (m.shotClock < 2 + m.rng() * 0.6) return shoot(m, a, s, d);
  if (d < 2.9 && (lane || st.strength >= 8 || open > 1.3)) return shoot(m, a, s, d);
  if (lane && d < 7.8 && (st.speed + st.strength >= 13 || open > 1.8) && m.rng() < 0.7) {
    s.target = RIM_SPOT;
    return;
  }
  // Shooters look for their shot; the longer the ball sits, the less picky anyone is.
  const mine = jumperValue(m, a) * lean(a);
  const bar = SHOOT_BAR - Math.min(0.6, s.holdFor * 0.1);
  if (d < 8.8 && mine > bar && m.rng() < 0.55) return shoot(m, a, s, d);

  const mate = m
    .teammates(a)
    .map((t) => ({ t, value: threat(m, t) }))
    .sort((p, q) => q.value - p.value)[0];
  // Hold it a moment before moving it on, so the ball does not ping around without purpose.
  const settled = s.holdFor > 0.7 || open < 0.9;
  if (settled && mate && mate.value > mine + 0.25 && m.rng() < 0.22 + s.holdFor * 0.1 + (mate.t.auto ? 0 : 0.2)) {
    return m.press(a.id, "pass", { x: mate.t.x - a.x, z: mate.t.z - a.z });
  }
  if (s.holdFor > 4 && mate && m.rng() < 0.4) return m.press(a.id, "pass", { x: mate.t.x - a.x, z: mate.t.z - a.z });
  s.target = attackSpot(m, a);
}

/** How keen a player is on their own jumper: shooters look for it, bigs look inside. */
function lean(a: Athlete): number {
  return 0.55 + charOf(a).stats.shooting * 0.055;
}

/** How dangerous a teammate would be with the ball right now: their jumper, or an open lane to the rim. */
function threat(m: Match, t: Athlete): number {
  const st = charOf(t).stats;
  const drive = laneOpen(m, t, 0.8) && rimDistance(t) < 7 ? 0.2 + (st.speed + st.strength) * 0.05 : 0;
  return jumperValue(m, t) * lean(t) + drive + Math.min(3, openness(m, t)) * 0.15;
}

/** A jumper stops the feet first; a drive keeps them going. The meter target wobbles with skill. */
function shoot(m: Match, a: Athlete, s: BotState, d: number): void {
  const st = charOf(a).stats;
  if (d < 3.2) {
    s.target = RIM_SPOT;
    goTo(a, RIM_SPOT);
    m.press(a.id, "shoot");
    return;
  }
  a.move = { x: 0, z: 0 };
  s.target = null;
  s.shotAt = GREEN_MS + gaussian(m.rng, releaseSpread(st.shooting)) + (a.onFire ? 0 : 6);
  m.press(a.id, "shoot");
  s.holdFor = 0;
}

/** Dribble somewhere useful: around the defender toward the rim, or back out to reset. */
function attackSpot(m: Match, a: Athlete): V2 {
  const guard = m.opponents(a.team).sort((p, q) => dist2(p, a) - dist2(q, a))[0];
  const side = m.rng() < 0.5 ? -1 : 1;
  if (!guard || m.rng() < 0.6) {
    const toward = { x: (RIM_SPOT.x - a.x) * 0.45 + side * 1.6, z: (RIM_SPOT.z - a.z) * 0.45 };
    return { x: a.x + toward.x, z: a.z + toward.z };
  }
  return bestSpot(m, a, [guard], 2);
}

/**
 * Without the ball: spread to open spots away from the ball, and now
 * and then cut hard to the rim when a defender drifts off.
 */
export function thinkOffBall(m: Match, a: Athlete, s: BotState, heading: (id: number) => V2 | null): void {
  const holder = ballCarrier(m);
  if (!holder) return;
  if (holder === a) {
    // The pass is coming: step toward it.
    const f = m.ball.flight?.segments.at(-1);
    if (f?.type === "arc") goTo(a, { x: f.p.x + f.v.x * f.dur, z: f.p.z + f.v.z * f.dur }, 0.8);
    return;
  }
  if (s.cutting && s.target) {
    goTo(a, s.target);
    if (dist2(a, s.target) < 0.5 || m.time > s.spotUntil) s.cutting = false;
    return;
  }
  if (!s.target || m.time > s.spotUntil) {
    const guard = m.opponents(a.team).sort((p, q) => dist2(p, a) - dist2(q, a))[0];
    if (!m.needsClear && guard && dist2(guard, a) > 2.2 && m.rng() < 0.35) {
      s.cutting = true;
      s.target = { x: (m.rng() - 0.5) * 2, z: 1.9 };
      s.spotUntil = m.time + 1.6;
      return;
    }
    // Teammates' own destinations count, so two computer players never head for the same spot.
    const mates = m.teammates(a).filter((t) => t !== holder);
    s.target = bestSpot(m, a, [holder, ...mates.map((t) => heading(t.id) ?? t)], 1.5);
    s.spotUntil = m.time + 1.8 + m.rng() * 2;
  }
  goTo(a, s.target, 0.85);
}
