import { attackSign } from "../teams";
import { isDown } from "./athlete";
import { autoPicker, leadTarget, receivers } from "./aim";
import { carryCommand } from "./bot-carry";
import { botSkill, sloppiness } from "./bot-skill";
import { gain } from "./field";
import type { Athlete, Command, MatchState } from "./types";
import { clampLen, dist, flat, fromAngle, angleOf, scale, sub, v2 } from "./vec";

/** The quarterback drops back this far behind the line and sets up. */
const DROP = 7;
/** A defender this close is pressure: get rid of it or run. */
const PRESSURE = 2.8;

/** How open a receiver is for a throw now: room around the catch point, a bonus for yards, nothing if a defender sits in the lane. */
export function openness(state: MatchState, qb: Athlete, r: Athlete): number {
  const { at, eta } = leadTarget(qb, r);
  const spot = flat(at);
  if (autoPicker(state, qb, spot)) return 0;
  let room = 12;
  for (const d of state.athletes) {
    if (d.team === qb.team || isDown(d)) continue;
    const later = { x: d.pos.x + d.vel.x * eta * 0.7, z: d.pos.z + d.vel.z * eta * 0.7 };
    room = Math.min(room, dist(later, spot));
  }
  return room + 0.06 * gain(qb.team, qb.pos.x, spot.x);
}

/** Picks the best receiver, a sloppy bot misjudging a little. */
function bestReceiver(state: MatchState, qb: Athlete): { r: Athlete; score: number } | null {
  let best: { r: Athlete; score: number } | null = null;
  const noise = sloppiness(state) * 2.5;
  for (const r of receivers(state, qb)) {
    const score = openness(state, qb, r) + state.rng.range(-noise, noise);
    if (!best || score > best.score) best = { r, score };
  }
  return best;
}

/** Aims the throw stick at a receiver, off by a little for a sloppy bot. */
function throwAt(state: MatchState, qb: Athlete, r: Athlete): Command {
  const err = state.rng.range(-1, 1) * sloppiness(state) * 0.15;
  return { move: v2(), aim: fromAngle(angleOf(sub(r.pos, qb.pos)) + err), throw: true };
}

/**
 * A computer quarterback: drops back, reads the field until its throw
 * time, throws to the open man, gets rid of it early under pressure, and
 * runs when nobody gets open for too long.
 */
export function quarterbackCommand(state: MatchState, qb: Athlete, since: number): Command {
  if (!botSkill(state).acts) return { move: v2() };
  const s = attackSign(qb.team);
  const set = v2(state.drive.los - s * DROP, qb.pos.z);
  const drop = sub(set, qb.pos);
  const move = since < 1.2 ? clampLen(scale(drop, 0.8), 1) : v2();
  if (qb.brain.scramble) return carryCommand(state, qb);
  // Reads happen a few times a second, not every step, so noise cannot flicker a throw out.
  if (qb.brain.thinkIn > 0) return { move };
  qb.brain.thinkIn = 0.15;
  let pressure = Infinity;
  for (const d of state.athletes) if (d.team !== qb.team && !isDown(d)) pressure = Math.min(pressure, dist(d.pos, qb.pos));
  const best = bestReceiver(state, qb);
  const read = qb.brain.throwAt;
  if (best && since >= read && best.score > 3.5) return throwAt(state, qb, best.r);
  if (best && pressure < PRESSURE && since > 0.6 && best.score > 1.5) return throwAt(state, qb, best.r);
  if (since > read + 1.8) {
    if (best && best.score > 1) return throwAt(state, qb, best.r);
    return scramble(state, qb);
  }
  if (pressure < PRESSURE * 0.8) return scramble(state, qb);
  return { move };
}

/** Nobody open, or the rush is on him: tuck it and run for the rest of the play. */
function scramble(state: MatchState, qb: Athlete): Command {
  qb.brain.scramble = true;
  return carryCommand(state, qb);
}
