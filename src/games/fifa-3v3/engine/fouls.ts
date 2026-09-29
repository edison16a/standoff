import { other, type TeamId } from "../teams";
import { isHuman } from "./athlete";
import { FOUL } from "./defence-tuning";
import { goalX, inBox } from "./goal";
import { outward } from "./keeper";
import { callFoul } from "./referee";
import { PITCH, SLIDE } from "./tuning";
import type { Athlete, MatchState, SetPieceKind } from "./types";
import { clamp, dist, type Vec2 } from "./vec";

/** Keeps a foul's spot on the pitch, clear of the boards, so a kick can be taken from it. */
function onPitch(at: Vec2): Vec2 {
  return { x: clamp(at.x, -PITCH.halfLength + 1.2, PITCH.halfLength - 1.2), z: clamp(at.z, -PITCH.halfWidth + 1.2, PITCH.halfWidth - 1.2) };
}

/** A foul inside the box of the offender's goal is a penalty; anywhere else a free kick. */
export function kindAt(at: Vec2, offending: TeamId): SetPieceKind {
  return inBox(at, offending) ? "penalty" : "free";
}

/**
 * The whistle. Play stops, the fouled player goes down, and the referee
 * runs to the spot to show the card. The kick is set up once he has.
 */
export function commitFoul(state: MatchState, offender: Athlete, victim: Athlete): void {
  if (state.phase !== "play") return;
  const at = onPitch(victim.pos);
  const kind = kindAt(at, offender.team);
  state.foul = { offender: offender.id, victim: victim.id, team: victim.team, kind, at };
  state.phase = "foul";
  state.phaseT = 0;
  const ball = state.ball;
  // The ball runs loose and slows, as the players stop.
  ball.owner = null;
  ball.vel = { x: ball.vel.x * 0.4, y: 0, z: ball.vel.z * 0.4 };
  ball.passTo = null;
  if (state.flight) state.flight.resolved = true;
  for (const a of state.athletes) {
    a.charging = false;
    a.guarding = false;
    a.guardSpot = null;
    a.buffered = 0;
  }
  if (victim.action !== "stumble") {
    victim.action = "stumble";
    victim.actionT = 0;
    victim.actionLen = SLIDE.stumble;
  }
  callFoul(state.referee, at, offender.id);
  state.events.push({ type: "whistle", long: false }, { type: "foul", offender: offender.id, victim: victim.id, team: victim.team, kind, at });
}

/** Whether the referee's card is up yet: once he has arrived, or late anyway if he is far away. */
export function cardDue(state: MatchState, arrived: boolean): boolean {
  return arrived || state.phaseT >= FOUL.cardBy;
}

/**
 * A foul made to order, for the admin panel's test shortcuts: `team`
 * is fouled at a spot that gives the kick asked for. A person on that
 * side is fouled if there is one, so the phone gets to take the kick.
 */
export function forceFoul(state: MatchState, team: TeamId, kind: SetPieceKind): boolean {
  if (state.phase !== "play") return false;
  const side = state.athletes.filter((a) => a.team === team);
  const foes = state.athletes.filter((a) => a.team === other(team));
  const victim = side.find(isHuman) ?? side[0];
  if (!victim || foes.length === 0) return false;
  const defending = other(team);
  const out = outward(defending);
  // A penalty: fouled in the middle of the box. A free kick: just outside it, a little off centre.
  const spot = kind === "penalty"
    ? { x: goalX(defending) + out * (PITCH.boxRadius - 3), z: 1.2 }
    : { x: goalX(defending) + out * (PITCH.boxRadius + 3.2), z: 3.4 };
  victim.pos = { ...spot };
  const offender = foes.sort((a, b) => dist(a.pos, spot) - dist(b.pos, spot))[0]!;
  offender.pos = { x: spot.x - out * 0.8, z: spot.z + 0.3 };
  const ball = state.ball;
  ball.owner = { kind: "athlete", id: victim.id };
  ball.pos = { x: spot.x, y: ball.pos.y, z: spot.z };
  commitFoul(state, offender, victim);
  return true;
}
