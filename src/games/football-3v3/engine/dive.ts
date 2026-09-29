import { advance, carrying, knockDown, setAction } from "./athlete";
import { DIVE } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { add, fromAngle, len, norm, scale, type Vec2 } from "./vec";

/** The part of the dive when the body hits the grass. */
export const LANDS_AT = 0.6;

export function canDive(a: Athlete): boolean {
  return a.action === "free" || a.action === "juke";
}

/** Launches a dive along the run, or the facing when standing. */
export function startDive(state: MatchState, a: Athlete, stick: Vec2): boolean {
  if (!canDive(a)) return false;
  const dir = len(stick) > 0.3 ? norm(stick) : len(a.vel) > 0.5 ? norm(a.vel) : fromAngle(a.facing);
  setAction(a, "dive", DIVE.length);
  a.actionDir = dir;
  a.vel = scale(dir, Math.max(len(a.vel), DIVE.burst));
  state.events.push({ type: "dive", athlete: a.id });
  return true;
}

/** Where the ball is when a diving carrier lands: stretched out ahead of the body. */
export function diveBallSpot(a: Athlete): Vec2 {
  return add(a.pos, a.actionDir, 0.75);
}

/**
 * The flight of a dive: airborne, then sliding to a stop on the grass.
 * Returns true on the step the body lands, which ends the play for a carrier.
 */
export function stepDive(state: MatchState, a: Athlete, dt: number): boolean {
  const p = a.actionT / a.actionLen;
  const before = (a.actionT - dt) / a.actionLen;
  if (p > LANDS_AT) a.vel = scale(a.vel, Math.exp(-7 * dt));
  advance(a, dt);
  const landed = before < LANDS_AT && p >= LANDS_AT;
  if (a.actionT >= a.actionLen) knockDown(a, "dive", DIVE.down);
  return landed && carrying(state, a);
}
