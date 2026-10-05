import { stepBall, type BallCollider, type Contact } from "./ball";
import { bodyColliders, onBodyHit } from "./blockers";
import { makeSave, palmSave } from "./keeper";
import { keeperColliders } from "./keeper-body";
import { PITCH } from "./tuning";
import type { MatchState } from "./types";

/**
 * Moves a loose ball through the world for one step: the air, the turf,
 * the frame, the boards and the nets, and the bodies in its way this
 * step (both keepers and anyone leaping to block). What it hits is
 * turned into events, saves and blocks.
 */
export function stepLooseBall(state: MatchState, dt: number): void {
  const colliders: BallCollider[] = [];
  const owner = state.ball.owner;
  for (const k of state.keepers) keeperColliders(k, owner?.kind === "keeper" && owner.team === k.team, colliders);
  bodyColliders(state, colliders);
  const contacts: Contact[] = [];
  stepBall(state.ball, dt, contacts, { nets: state.nets, colliders });
  for (const c of contacts) {
    switch (c.type) {
      case "post":
      case "bar":
        state.events.push({ type: "woodwork", part: c.type, speed: c.speed, at: c.at });
        resolveShot(state, c.type);
        break;
      case "net":
        state.events.push({ type: "net", team: c.team, speed: c.speed, at: c.at });
        break;
      case "board":
        if (c.speed > 1.5) state.events.push({ type: "board", speed: c.speed, at: c.at });
        endShotOnBoards(state);
        break;
      case "bounce":
        if (c.speed > 2) state.events.push({ type: "bounce", speed: c.speed });
        break;
      case "body":
        bodyContact(state, c.id, c.caught, c.speed);
        break;
    }
  }
}

/** The ball met a keeper's gloves or body, or an outfield player's. */
function bodyContact(state: MatchState, id: number, caught: boolean, speed: number): void {
  if (id >= 0) {
    const a = state.athletes[id];
    if (a) onBodyHit(state, a, speed);
    return;
  }
  const k = state.keepers[-1 - id === 0 ? 0 : 1];
  if (caught) makeSave(state, k);
  else palmSave(state, k);
}

function resolveShot(state: MatchState, outcome: "post" | "bar"): void {
  const flight = state.flight;
  if (!flight || flight.resolved) return;
  flight.resolved = true;
  flight.outcome = outcome;
}

/**
 * A shot that hits the boards is over: the ball is live again for
 * anyone to play. Off the end boards it was a miss.
 */
function endShotOnBoards(state: MatchState): void {
  const flight = state.flight;
  if (!flight || flight.resolved) return;
  flight.resolved = true;
  if (Math.abs(state.ball.pos.x) > PITCH.halfLength - 1) {
    flight.outcome = "wide";
    state.events.push({ type: "miss", team: flight.team, kind: "wide" });
  }
}

/** A shot that has been flying this long without ending is just a loose ball. */
export function updateFlight(state: MatchState, dt: number): void {
  const flight = state.flight;
  if (!flight || flight.resolved) return;
  flight.t += dt;
  if (flight.t > 3) flight.resolved = true;
}
