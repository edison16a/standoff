import { buildOf, standingReach } from "../athlete";
import type { Match } from "../match";
import { copyBody, type BallBody } from "../physics/air";
import { BALL } from "../physics/ball-spec";
import type { Contact } from "../physics/world";
import { copyFlight, stepShotFlight } from "../shot-outcome/flight";
import { RIM, STEP } from "../tuning";
import type { Action, Athlete, ShotInfo } from "../types";
import { clamp } from "../vec";

type Block = Extract<Action, { kind: "block" }>;

/** Where the shoulder is with the feet `y` off the floor, and how far the arm reaches from it. */
export function armAt(a: Athlete, x: number, y: number, z: number): { x: number; y: number; z: number; reach: number } {
  const h = buildOf(a).body.height;
  const shoulder = y + h * 0.81;
  return { x, y: shoulder, z, reach: y + standingReach(a) - shoulder + 0.06 };
}

/** Feet off the floor at `t` on the jump's clock. */
export function jumpHeight(act: Block, t: number): number {
  const s = (t - act.gather) / act.air;
  return s > 0 && s < 1 ? act.peak * 4 * s * (1 - s) : 0;
}

/** How well timed the jump is at `t`: full at the top of the arc, nothing still crouched. */
export function timingAt(act: Block, t: number): number {
  if (t < act.gather) return 0;
  return clamp(Math.sin(Math.PI * clamp((t - act.gather) / act.air, 0, 1)), 0, 1);
}

/** Touching a ball on its way down above the ring is goaltending, and nobody tries it. */
export const goaltend = (b: Pick<BallBody, "pos" | "vel">) => b.vel.y < 0 && b.pos.y > RIM.y && Math.hypot(b.pos.x - RIM.x, b.pos.z - RIM.z) < 0.7;

/** A ball whose path passes within this much past the reach still draws a full stretch at it. */
const NEAR = 0.4;
/**
 * The hand meets the ball this long after the plan at the soonest it
 * can. A ball touched on the frame it leaves the shooter's hand is a
 * collision, not a block: this gives the strike its few frames, and the
 * ball its first stretch of flight, so the hand can be seen to get it.
 */
export const LEAD = 0.1;

export interface Meet {
  dt: number;
  body: BallBody;
  gap: number;
  arm: ReturnType<typeof armAt>;
}

/** Whether a gap counts as in reach of the hand. */
const inReach = (k: Meet | null): k is Meet => !!k && k.gap <= 0;

/**
 * Flies the shot and the jump ahead together and finds the moment the
 * hand gets it: the first in reach at least `LEAD` on, or the last in
 * reach before then if the ball is gone by `LEAD`. With no touch at all,
 * the nearest pass, for a near miss.
 */
export function meet(ball: BallBody, shot: ShotInfo, d: Athlete, act: Block): Meet | null {
  const body = copyBody(ball);
  const flight = copyFlight(shot.flight);
  const out: Contact[] = [];
  let near: Meet | null = null;
  let early: Meet | null = null;
  for (let dt = 0; act.t + dt < act.gather + act.air; dt += STEP) {
    const y = jumpHeight(act, act.t + dt);
    if (y > 0.08 && !goaltend(body)) {
      const s = armAt(d, d.x + d.vx * dt, y, d.z + d.vz * dt);
      const gap = Math.hypot(body.pos.x - s.x, body.pos.y - s.y, body.pos.z - s.z) - s.reach - BALL.radius;
      const k: Meet = { dt, body: copyBody(body), gap, arm: s };
      if (body.pos.y >= s.y) {
        if (!near || gap < near.gap) near = k;
        if (inReach(k)) {
          if (dt >= LEAD - 1e-9) return k;
          early = k;
        }
      }
    }
    out.length = 0;
    stepShotFlight(body, flight, STEP, out);
  }
  if (early) return early;
  return near && near.gap < NEAR ? near : null;
}
