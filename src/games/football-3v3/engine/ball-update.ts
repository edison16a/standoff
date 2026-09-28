import { updatePass } from "./catching";
import { stepFlight, type Flight } from "./flight";
import type { Match } from "./match";
import { SNAP_TIME } from "./phases";
import { BALL } from "./tuning";

/** Where a carried ball sits: tucked at the hip, a little ahead of the body. */
const CARRY_HEIGHT = 1.05;

/** A ball on the turf bounces a few times and rolls to a stop. */
export function bounce(f: Flight, dt: number): void {
  if (Math.hypot(f.vel.x, f.vel.y, f.vel.z) < 0.05 && f.pos.y <= 0.12) return;
  stepFlight(f, dt);
  if (f.pos.y > 0.12) return;
  f.pos.y = 0.12;
  f.vel.y = Math.abs(f.vel.y) > 1 ? -f.vel.y * BALL.restitution : 0;
  const k = f.vel.y === 0 ? Math.max(0, 1 - 3 * dt) : BALL.groundFriction;
  f.vel.x *= k;
  f.vel.z *= k;
  f.spin *= k;
}

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
  if ((b.state === "loose" || b.state === "pass") && b.flight) {
    bounce(b.flight, dt);
    b.pos = { ...b.flight.pos };
  }
}
