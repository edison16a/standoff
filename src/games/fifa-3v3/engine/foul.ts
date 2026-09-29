import { other } from "../teams";
import { brake } from "./athlete";
import { stepBall } from "./ball";
import { inBox } from "./goal";
import { bookingSpot, face, REF, runTo } from "./referee";
import { setupSetPiece } from "./set-piece";
import { PITCH } from "./tuning";
import type { Athlete, FoulKind, MatchState } from "./types";
import { angleDiff, clamp } from "./vec";

export const FOUL = {
  /** How long the fouled player stays down. */
  fall: 1.7,
  /** The referee gets to the spot within this, sprinting harder from further away. */
  maxRun: 2.6,
  /** How long he holds the card up before the set piece. */
  card: 1.9,
} as const;

/**
 * The referee blows for a foul. Play stops where it happened: inside the
 * box it is a penalty, outside a free kick. The player fouled goes down,
 * the ball goes dead, and the referee runs in to book the offender.
 */
export function commitFoul(state: MatchState, by: Athlete, victim: Athlete, kind: FoulKind): void {
  if (state.phase !== "play" || state.foul) return;
  const at = { x: clamp(victim.pos.x, -PITCH.halfLength + 0.8, PITCH.halfLength - 0.8), z: clamp(victim.pos.z, -PITCH.halfWidth + 0.8, PITCH.halfWidth - 0.8) };
  const penalty = inBox(at, other(victim.team));
  state.foul = { by: by.id, victim: victim.id, at, kind, penalty, team: victim.team, carded: false };
  by.stats.fouls++;
  const ball = state.ball;
  ball.owner = null;
  ball.passTo = null;
  if (state.flight) state.flight.resolved = true;
  victim.action = "stumble";
  victim.actionT = 0;
  victim.actionLen = FOUL.fall;
  victim.charging = false;
  victim.charge = 0;
  for (const a of state.athletes) a.guard.on = false;
  state.phase = "foul";
  state.phaseT = 0;
  state.referee.action = "run";
  state.referee.actionT = 0;
  state.events.push({ type: "foul", by: by.id, victim: victim.id, kind, penalty, at: { x: at.x, y: 0, z: at.z } });
}

/**
 * While the referee deals with it: everyone pulls up, the ball rolls
 * dead, the referee sprints to the spot, faces the offender and holds
 * up the yellow card. Then the scene cuts to the set piece.
 */
export function stepFoul(state: MatchState, dt: number): void {
  const foul = state.foul;
  if (!foul) return;
  const offender = state.athletes[foul.by]!;
  const ref = state.referee;
  for (const a of state.athletes) {
    a.actionT += dt;
    brake(a, dt, 4);
    if (a.action !== "free" && a.actionT >= a.actionLen) {
      a.action = a.action === "stumble" ? "getup" : "free";
      a.actionT = 0;
      a.actionLen = 0.6;
    }
  }
  // The offender turns to face the music.
  if (offender.action === "free") offender.facing += clamp(angleDiff(offender.facing, Math.atan2(ref.pos.z - offender.pos.z, ref.pos.x - offender.pos.x)), -4 * dt, 4 * dt);
  const ball = state.ball;
  if (!ball.owner) {
    const k = Math.exp(-2.5 * dt);
    ball.vel.x *= k;
    ball.vel.z *= k;
    stepBall(ball, dt);
  }
  ref.actionT += dt;
  if (ref.action === "run") {
    const spot = bookingSpot(foul.at);
    const left = Math.hypot(spot.x - ref.pos.x, spot.z - ref.pos.z);
    // From far away he runs harder, so the booking never keeps everyone waiting.
    const top = Math.max(REF.sprint, Math.min(11, left / Math.max(0.35, FOUL.maxRun - ref.actionT)));
    const still = runTo(ref, spot, top, dt);
    if (still < 0.2 || ref.actionT > FOUL.maxRun + 0.6) {
      ref.action = "card";
      ref.actionT = 0;
      foul.carded = true;
      state.events.push({ type: "card", athlete: offender.id });
    }
    return;
  }
  brakeReferee(state, dt);
  face(ref, Math.atan2(offender.pos.z - ref.pos.z, offender.pos.x - ref.pos.x), dt);
  if (ref.action === "card" && ref.actionT >= FOUL.card) setupSetPiece(state);
}

function brakeReferee(state: MatchState, dt: number): void {
  const ref = state.referee;
  const k = Math.exp(-10 * dt);
  ref.vel.x *= k;
  ref.vel.z *= k;
}
