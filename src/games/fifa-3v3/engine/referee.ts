import { cycleLength } from "./stride";
import { FOUL } from "./defence-tuning";
import { PITCH } from "./tuning";
import type { MatchState, Referee, RefereeAction } from "./types";
import { angleDiff, clamp, dist, v2, type Vec2 } from "./vec";

/** The referee keeps to the far side of play, well out of the way. */
const FOLLOW_Z = -(PITCH.halfWidth - 1.4);
const JOG = 4.2;
const ACCEL = 9;

export function makeReferee(): Referee {
  return { pos: v2(0, FOLLOW_Z), vel: v2(), facing: Math.PI / 2, action: "follow", actionT: 0, stride: 0, target: null, cardTo: null };
}

export function setRefereeAction(r: Referee, action: RefereeAction): void {
  r.action = action;
  r.actionT = 0;
}

/** Sends the referee running to a foul, to show the card to `offender` there. */
export function callFoul(r: Referee, spot: Vec2, offender: number): void {
  // He stops a little on the camera's side of the spot, so the broadcast sees his face and the card.
  r.target = { x: spot.x - 0.9, z: clamp(spot.z + 1.6, -PITCH.halfWidth + 0.8, PITCH.halfWidth - 0.8) };
  r.cardTo = offender;
  setRefereeAction(r, "run");
}

/** One step of the referee, in every phase of the match. */
export function updateReferee(state: MatchState, dt: number): void {
  const r = state.referee;
  r.actionT += dt;
  const ball = state.ball.pos;
  switch (r.action) {
    case "follow": {
      // Level with play, a little behind it, and stepping aside if the ball comes his way.
      const want = { x: clamp(ball.x * 0.82, -PITCH.halfLength + 4, PITCH.halfLength - 4), z: FOLLOW_Z };
      if (dist(ball, want) < 2.5) want.x += ball.x > want.x ? -2.5 : 2.5;
      steer(r, want, JOG, dt);
      face(r, Math.atan2(ball.z - r.pos.z, ball.x - r.pos.x), dt);
      return;
    }
    case "run": {
      const target = r.target ?? r.pos;
      steer(r, target, FOUL.refereeRun, dt);
      face(r, Math.atan2(r.vel.z, r.vel.x), dt, 0.5);
      return;
    }
    case "card":
    case "point": {
      steer(r, r.pos, 0, dt);
      const who = r.cardTo !== null ? state.athletes[r.cardTo] : undefined;
      const at = r.action === "card" && who ? who.pos : state.setPiece?.spot ?? ball;
      face(r, Math.atan2(at.z - r.pos.z, at.x - r.pos.x), dt);
      return;
    }
  }
}

/** Whether he has reached the spot of the foul. */
export function refereeArrived(r: Referee): boolean {
  return r.target !== null && dist(r.pos, r.target) < 0.35;
}

/** Runs toward a spot, easing in so he never overshoots, and advances his stride. */
function steer(r: Referee, to: Vec2, top: number, dt: number): void {
  const dx = to.x - r.pos.x;
  const dz = to.z - r.pos.z;
  const d = Math.hypot(dx, dz);
  const speed = Math.min(top, d * 2.2);
  const wantX = d > 1e-3 ? (dx / d) * speed : 0;
  const wantZ = d > 1e-3 ? (dz / d) * speed : 0;
  const k = Math.min(1, (ACCEL * dt) / Math.max(1e-6, Math.hypot(wantX - r.vel.x, wantZ - r.vel.z)));
  r.vel.x += (wantX - r.vel.x) * k;
  r.vel.z += (wantZ - r.vel.z) * k;
  r.pos.x += r.vel.x * dt;
  r.pos.z += r.vel.z * dt;
  const moved = Math.hypot(r.vel.x, r.vel.z);
  r.stride += (moved * dt) / cycleLength(moved);
}

function face(r: Referee, angle: number, dt: number, minSpeed = 0): void {
  if (Math.hypot(r.vel.x, r.vel.z) < minSpeed) return;
  r.facing += clamp(angleDiff(r.facing, angle), -8 * dt, 8 * dt);
}
