import { diveLayout } from "./dive";
import { keeperReach } from "./keeper-body";
import { fly } from "./shot-aim";
import { KEEPER, PITCH } from "./tuning";
import type { Keeper, MatchState } from "./types";
import { clamp, clamp01 } from "./vec";

/**
 * How a keeper reads a shot. He moves only after his reaction time, and
 * he reads the line a little wrong: more for a fast ball, a curling one,
 * and one he saw late through bodies. A ball that knuckles moves after
 * he has read it. He dives to where he thinks it will be, as far as a
 * dive can get in the time left, and his hands follow the ball in the
 * last moment by a few centimetres. Whether a glove meets the ball is
 * up to the flight.
 */
export const READ_SHOT = {
  react: 0.16,
  reactSpread: 0.03,
  /** With no time to dive, the hands still snap toward the ball this quickly, and this far. */
  reflex: 0.06,
  reflexReach: 0.6,
  /** Metres off the true line: a base, then per m/s of pace and per radian a second of sidespin. */
  misread: 0.14,
  misreadPace: 0.007,
  misreadCurl: 0.004,
  /** How far the hands chase the ball in the last moment, standing and diving, before any spare time. */
  trackStanding: 0.25,
  trackDiving: 0.12,
  /** The fastest ball he can hold standing up, and in an easy dive: its speed into the gloves, m/s, with his hands driving at it. */
  holdStanding: 34,
  holdDiving: 29,
  /**
   * Watching the striker's backswing and body shape, he starts this much
   * before the ball is struck, at the price of reading it a little worse.
   */
  anticipate: 0.07,
  anticipateMisread: 0.12,
} as const;

export interface ReadOptions {
  /** Seconds before he can move, instead of his own reaction. */
  react?: number;
  /** Extra metres he may misread the line by. */
  misread?: number;
  /** He dives a fingertip short whatever he reads: the showcase's rigged goals. */
  short?: boolean;
  /** He watched the striker wind up, so he can go a little early. */
  windup?: boolean;
}

/** Moves a read toward the truth by up to `track`: the hands following the ball in. */
const follow = (seen: number, truth: number, track: number) => seen + clamp(truth - seen, -track, track);

/**
 * Reads the loose ball flying at this keeper's goal and plans his dive,
 * or leaves him set if it is going well wide or over, or comes too
 * quickly to move for: then only his body and hands where they are can stop it.
 */
export function planDive(state: MatchState, k: Keeper, opts: ReadOptions = {}): void {
  const ball = state.ball;
  if (k.action !== "set") return;
  const hit = fly({ ...ball.pos }, { vel: { ...ball.vel }, spin: { ...ball.spin }, time: 0 }, k.pos.x);
  if (!hit || hit.t > 3) return;
  // Going well wide or over: he watches it go.
  if (Math.abs(hit.z) > PITCH.goalHalfWidth + 0.7 || hit.y > PITCH.goalHeight + 0.5) return;
  const rng = state.rng;
  const speed = Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z);
  const early = opts.windup ? READ_SHOT.anticipate : 0;
  const react = opts.react ?? Math.max(0.06, READ_SHOT.react - early + rng.gauss() * READ_SHOT.reactSpread);
  // A long flight is watched all the way in and read better; a snap shot is half guessed.
  const watch = clamp(0.5 / hit.t, 0.4, 1.3);
  const sigma = (READ_SHOT.misread + READ_SHOT.misreadPace * speed + READ_SHOT.misreadCurl * Math.abs(ball.spin.y)) * watch + (opts.misread ?? 0) + (early > 0 ? READ_SHOT.anticipateMisread : 0);
  let seenZ = hit.z + rng.gauss() * sigma;
  let seenY = clamp(hit.y + rng.gauss() * sigma * 0.6, 0.15, 2.6);
  const near = Math.abs(seenZ - k.pos.z) < 0.5 && seenY < 1.8;
  const spare = clamp(hit.t - 0.5, 0, 1);
  const track = (near ? READ_SHOT.trackStanding : READ_SHOT.trackDiving) * (1 + spare);
  seenZ = follow(seenZ, hit.z, track);
  seenY = clamp(follow(seenY, hit.y, track), 0.15, 2.6);
  if (opts.short) seenZ = hit.z - Math.sign(hit.z - k.pos.z || 1) * rng.range(0.6, 0.85);
  if (hit.t < react + 0.1) {
    // No time to dive: a reflex, the hands thrown at it from where he stands.
    if (hit.t < READ_SHOT.reflex + 0.04) return;
    const reflexZ = k.pos.z + clamp(seenZ - k.pos.z, -READ_SHOT.reflexReach, READ_SHOT.reflexReach);
    k.dive = { dir: seenZ >= k.pos.z ? 1 : -1, fromZ: k.pos.z, toZ: k.pos.z, gloveZ: reflexZ, height: clamp(seenY, 0.3, 2), wait: READ_SHOT.reflex, duration: hit.t - READ_SHOT.reflex, standing: true };
    k.grip = READ_SHOT.holdStanding * 0.7;
    k.action = "dive";
    k.actionT = 0;
    return;
  }
  const reach = keeperReach(hit.t, react);
  const lateral = clamp(seenZ - k.pos.z, -reach, reach);
  const duration = clamp(hit.t - react, 0.12, KEEPER.diveTime);
  // A stretch for a ball at the edge of his reach is a palm, not a catch.
  const stretch = clamp01((Math.abs(lateral) / 3.3 - 0.65) / 0.3);
  const standing = Math.abs(lateral) < 0.5 && seenY < 1.8;
  diveTo(k, k.pos.z + lateral, seenY, hit.t - duration, duration, standing ? READ_SHOT.holdStanding : READ_SHOT.holdDiving * (1 - stretch));
}

/**
 * Starts a dive that puts the gloves at `gloveZ` across and `height` up
 * after `wait` and `duration` seconds, laid out by diveLayout; a ball
 * close to the body is taken standing, the hands moved to it.
 */
export function diveTo(k: Keeper, gloveZ: number, height: number, wait: number, duration: number, grip: number): void {
  const lateral = gloveZ - k.pos.z;
  const dir: 1 | -1 = lateral >= 0 ? 1 : -1;
  const standing = Math.abs(lateral) < 0.5 && height < 1.8;
  const feet = standing ? 0 : diveLayout({ fromZ: k.pos.z, gloveZ, height }).feet;
  k.dive = { dir, fromZ: k.pos.z, toZ: k.pos.z + dir * feet, gloveZ, height, wait, duration, standing };
  k.grip = grip;
  k.action = "dive";
  k.actionT = 0;
}

/** Whether anyone stands near the line from the ball to the goal, blocking the keeper's view of the strike. */
export function screened(state: MatchState, k: Keeper, shooterTeam: number): boolean {
  const b = state.ball.pos;
  const dx = k.pos.x - b.x;
  const dz = k.pos.z - b.z;
  const d2 = dx * dx + dz * dz;
  if (d2 < 1) return false;
  return state.athletes.some((a) => {
    const t = ((a.pos.x - b.x) * dx + (a.pos.z - b.z) * dz) / d2;
    if (t < 0.15 || t > 0.85) return false;
    const off = Math.abs((a.pos.x - b.x) * dz - (a.pos.z - b.z) * dx) / Math.sqrt(d2);
    return off < 0.5 && a.team !== shooterTeam;
  });
}
