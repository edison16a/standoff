import * as THREE from "three";
import type { Ball, ShotInfo } from "../engine/types";
import { BALL } from "../engine/tuning";
import type { AthleteView } from "./athlete-view";

/** How long the drawn ball rolls off the shooting fingers before it is wholly on the engine's flight. */
export const ROLL_TIME = 0.1;

const palm = new THREE.Vector3();

/** 0 at the release, 1 once the ball is clear of the hand: eased both ways, so neither end pops. */
export function rollShare(since: number): number {
  const t = Math.min(1, Math.max(0, since / ROLL_TIME));
  return t * t * (3 - 2 * t);
}

/**
 * The ball rolling off the fingertips on a jumper or a free throw. The
 * engine lets go at the release point in one step, while the drawn arm
 * takes a few frames to snap through, so without this the ball would
 * leave the hands before they push it. For the first `ROLL_TIME` the
 * drawn ball is blended from the shooting palm onto the engine's ball,
 * so it is seen to leave the hand on the follow through. Only the
 * picture changes: the flight, the blocks and the scoring are untouched.
 */
export class ReleaseRoll {
  private shot: ShotInfo | null = null;
  private rolling = false;
  private since = 0;

  /** Moves `target` (the engine's ball) toward the shooter's palm while the ball is still leaving it. */
  apply(ball: Ball, shooter: AthleteView | null, target: THREE.Vector3, dt: number): void {
    const shot = ball.shot;
    const rolling = !!shooter && !!shot && ball.holder === null && ball.mode === "flight" && (shot.kind === "jumper" || shot.kind === "free");
    if (!rolling) {
      this.shot = shot;
      this.rolling = false;
      return;
    }
    // The replay hands over a fresh copy of the ball every frame, so a shot is known by what it is, not which object holds it.
    if (!this.rolling || !sameShot(shot, this.shot)) this.since = 0;
    else this.since += dt;
    this.shot = shot;
    this.rolling = true;
    const k = rollShare(this.since);
    if (k >= 1) return;
    shooter.hand("R", palm);
    // The ball sits on the fingers, not in the palm's middle.
    palm.y += BALL.radius * 0.9;
    target.lerp(palm, 1 - k);
  }
}

/** True when two shot records are the same shot, even as copies. */
function sameShot(a: ShotInfo, b: ShotInfo | null): boolean {
  return a === b || (!!b && a.shooter === b.shooter && a.kind === b.kind && a.distance === b.distance && a.contest === b.contest);
}
