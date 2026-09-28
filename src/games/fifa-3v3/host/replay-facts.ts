import { PITCH } from "../engine/tuning";
import type { MatchView } from "../engine/view";

const MPH = 2.23694;

/** The numbers the replay shows over the strike. */
export interface StrikeFacts {
  /** The kicker's top speed in the run up to the shot. */
  runMph: number;
  /** The ball's speed off the boot. */
  ballMph: number;
  /** How fast it spins, in turns a minute. */
  spinRpm: number;
  spinKind: "Curl" | "Knuckle" | "Topspin";
  /** Where it was aimed, as the kicker saw the goal, like "Top right corner". */
  aim: string | null;
}

/** Reads the kicker's run, the ball off the boot and the aim from the replay's stills. */
export function describeStrike(clip: readonly MatchView[], kicker: number, windup: number, kickAt: number): StrikeFacts {
  let run = 0;
  for (const f of clip) {
    if (f.time < windup - 1.6 || f.time > windup) continue;
    run = Math.max(run, f.athletes[kicker]?.speed ?? 0);
  }
  // The ball a moment after the strike, clear of the boot.
  const off = clip.find((f) => f.time >= kickAt + 1 / 30 && !f.ball.held) ?? clip.find((f) => f.time >= kickAt);
  const ball = off?.ball;
  const speed = ball ? Math.hypot(ball.vx, ball.vy, ball.vz) : 0;
  const ballMph = Math.round(speed * MPH);
  const curl = Math.abs(ball?.curl ?? 0);
  // Real strikes turn several times a second; the simulation's spin sets the share of that, pace sets the rest.
  const spinRpm = Math.round(((ball?.spin ?? 0) * 28 + ballMph * 3.2) / 10) * 10;
  const spinKind = curl > 3.5 ? "Curl" : ballMph > 55 && (ball?.spin ?? 0) < 2.5 ? "Knuckle" : "Topspin";
  const shot = off?.shot ?? null;
  return { runMph: Math.round(run * MPH), ballMph, spinRpm, spinKind, aim: shot ? aimLabel(shot) : null };
}

/**
 * Names a spot on the goal from the kicker's side of it. Attacking the
 * +x goal the kicker's right is +z; attacking the other goal it is -z.
 */
export function aimLabel(target: { x: number; y: number; z: number }): string {
  const right = Math.sign(target.x) >= 0 ? target.z : -target.z;
  const wide = Math.abs(target.z) > PITCH.goalHalfWidth * 0.45;
  const side = !wide ? "" : right > 0 ? "right" : "left";
  if (target.y > PITCH.goalHeight) return "Over the bar";
  if (Math.abs(target.z) > PITCH.goalHalfWidth) return side === "right" ? "Wide right" : "Wide left";
  const high = target.y > PITCH.goalHeight * 0.6;
  const low = target.y < 0.6;
  if (!wide) return high ? "Top centre" : low ? "Low centre" : "Straight down the middle";
  if (high) return `Top ${side} corner`;
  if (low) return `Bottom ${side} corner`;
  return `Inside the ${side} post`;
}
