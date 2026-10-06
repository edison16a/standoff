import { airborne, buildOf, standingReach } from "./athlete";
import { hangTime, heightAt, takeoffSpeed } from "./body/jump";
import { RIM_SPOT } from "./court";
import type { Match } from "./match";
import { launchShot } from "./shot-launch";
import { JUMP, SHOT } from "./tuning";
import type { Action, Athlete } from "./types";
import { segmentDistance, type V3 } from "./vec";

/**
 * The floater: on the run at the rim from the edge of the paint, with
 * a big man waiting, the ball goes up early off one foot, soft and high
 * over his reach, before he can get to it. It is flown on the same
 * ball physics as every shot, on a high arc with little spin.
 */

export const FLOATER = {
  /** Off one foot almost at once, and the ball gone on the way up. */
  takeoff: 0.1,
  release: 0.3,
  peak: 0.3,
  /** The band it is thrown from, in metres from the rim. */
  near: 2.4,
  far: 5.2,
} as const;

const AIR = hangTime(FLOATER.peak);
const UP = takeoffSpeed(FLOATER.peak);

type Shoot = Extract<Action, { kind: "shoot" }>;

/** A tall defender between the driver and the rim, closer to it than he is. */
function bigWaiting(m: Match, a: Athlete): boolean {
  return m.opponents(a.team).some((o) => {
    const s = segmentDistance(o, a, RIM_SPOT);
    return !airborne(o) && s.d < 1.1 && s.t > 0.25 && standingReach(o) > 2.55;
  });
}

/** Whether Shoot on this run is a floater: going hard at the rim, too far to lay it up, or a big man in the way. */
export function floaterFits(m: Match, a: Athlete, distance: number, speed: number, heading: number): boolean {
  if (speed < 2.2 || heading < 0.55 || distance < FLOATER.near || distance > FLOATER.far) return false;
  return distance >= SHOT.driveRange || bigWaiting(m, a);
}

export function startFloater(m: Match, a: Athlete): void {
  a.action = { kind: "shoot", t: 0, three: false, released: false, free: false, step: null, float: true };
  m.emit({ type: "gather", id: a.id, kind: "jumper" });
}

/** Where the ball leaves the hand: up at full stretch, a little in front. */
function hand(a: Athlete): V3 {
  const reach = standingReach(a) - 0.08;
  return { x: a.x + Math.sin(a.yaw) * 0.25, y: a.y + Math.min(reach, buildOf(a).body.height * 1.22), z: a.z + Math.cos(a.yaw) * 0.25 };
}

/** The hop, the release on the way up, and the landing. */
export function updateFloater(m: Match, a: Athlete, act: Shoot, dt: number): void {
  const before = act.t;
  act.t += dt;
  const air = act.t - FLOATER.takeoff;
  a.y = air > 0 && air < AIR ? heightAt(UP, air) : 0;
  if (!act.released && act.t >= FLOATER.release) {
    act.released = true;
    if (m.ball.holder === a.id && m.phase === "live") launchShot(m, a, "jumper", "good", hand(a), true);
  }
  const landAt = FLOATER.takeoff + AIR;
  if (before < landAt && act.t >= landAt) {
    a.recover = JUMP.shotRecover;
    m.emit({ type: "land", id: a.id, hard: false });
  }
  if (act.t >= landAt + 0.08) a.action = { kind: "none" };
}
