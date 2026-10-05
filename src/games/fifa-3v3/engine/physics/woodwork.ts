import { PITCH } from "../tuning";
import type { Ball } from "../types";
import type { Vec3 } from "../vec";
import { FRAME } from "./constants";
import { hitCapsule, nearestOn, type Capsule } from "./capsule";

const HL = PITCH.halfLength;
const GW = PITCH.goalHalfWidth;
const GH = PITCH.goalHeight;
const PR = PITCH.postRadius;

export interface FrameHit {
  part: "post" | "bar";
  speed: number;
  /** The point on the frame's middle line nearest the ball, for the ring and the shake. */
  at: Vec3;
}

/** The three round tubes of the goal at `end`: two posts from the turf up and the bar across their tops. */
export function goalFrame(end: -1 | 1): { posts: [Capsule, Capsule]; bar: Capsule } {
  const x = end * HL;
  return {
    posts: [
      { a: { x, y: 0, z: -GW }, b: { x, y: GH, z: -GW }, radius: PR },
      { a: { x, y: 0, z: GW }, b: { x, y: GH, z: GW }, radius: PR },
    ],
    bar: { a: { x, y: GH, z: -GW }, b: { x, y: GH, z: GW }, radius: PR },
  };
}

const FRAMES = [goalFrame(-1), goalFrame(1)] as const;

/** Restitution of the ball off aluminium at this speed: a hard strike flattens the ball and gives back less. */
export function frameRestitution(speed: number): number {
  return Math.max(0.45, FRAME.postRestitution - FRAME.postDrop * speed);
}

/**
 * The ball against the posts and bar of the goal it is near. A round
 * tube sends the ball off along the line through both centres, so a
 * ball clipping the inside of the post goes in and one catching the
 * outside stays out, and spin throws it off at an angle.
 */
export function hitWoodwork(ball: Ball): FrameHit | null {
  const p = ball.pos;
  if (Math.abs(Math.abs(p.x) - HL) > 0.5 || p.y > GH + 0.5) return null;
  const frame = FRAMES[p.x < 0 ? 0 : 1];
  const speed = Math.hypot(ball.vel.x, ball.vel.y, ball.vel.z);
  const e = frameRestitution(speed);
  for (const [part, rod] of [["post", frame.posts[0]], ["post", frame.posts[1]], ["bar", frame.bar]] as const) {
    const at = nearestOn(rod, p);
    const into = hitCapsule(ball, rod, e, FRAME.postFriction);
    if (into > 0) return { part, speed: into, at };
  }
  return null;
}
