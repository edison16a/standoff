import { updatePass } from "./catching";
import { stepFlight } from "./flight";
import type { Match } from "./match";
import { SNAP_TIME } from "./phases";

/** Where a carried ball sits: tucked at the hip, a little ahead of the body. */
const CARRY_HEIGHT = 1.05;

/**
 * Moves the ball for a step. Held, it rides with the carrier. Snapped,
 * it flies to the QB. A live pass checks every pair of hands it passes.
 * Anything else that is free (a kick after its verdict, a pass that
 * fell incomplete, a fumble) is just a ball: the physics carries it on,
 * into the net, bouncing and rolling to a stop.
 */
export function updateBall(m: Match, dt: number): void {
  const b = m.ball;
  if (b.state === "held") {
    const h = m.athlete(b.holder ?? -1);
    if (h) b.pos = { x: h.x + Math.sin(h.yaw) * 0.25, y: CARRY_HEIGHT, z: h.z + Math.cos(h.yaw) * 0.25 };
    return;
  }
  if (b.state === "snap" && b.flight) {
    stepFlight(b.flight, dt);
    b.pos = { ...b.flight.pos };
    if ((m.play?.sinceSnap ?? 0) >= SNAP_TIME) {
      b.state = "held";
      b.holder = m.qbOf(m.offense).id;
      b.flight = null;
    }
    return;
  }
  if (b.state === "pass" && m.phase === "live") return updatePass(m, dt);
  // The kick phase flies its own ball; after the verdict it flies here.
  if (b.state === "kick" && m.phase === "kick") return;
  if (b.flight) {
    stepFlight(b.flight, dt);
    b.pos = { ...b.flight.pos };
  }
}
