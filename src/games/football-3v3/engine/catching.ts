import { isDown } from "./body";
import { inBounds, xToYard } from "./field";
import { stepFlight } from "./flight";
import type { Match } from "./match";
import { endPlay } from "./whistle";
import { PASS } from "./tuning";
import type { Athlete } from "./types";
import { dist2, dist3, norm2, type V2, type V3 } from "./vec";

/** The receiver's hands, for the catch test. */
export const hands = (a: Athlete): V3 => ({ x: a.x, y: PASS.catchHeight, z: a.z });

/** Defenders who can make a play on the ball: on their feet and not tailing someone on Guard. */
const canPlayBall = (d: Athlete) => d.role !== "lineman" && !isDown(d) && d.guard === null;

/**
 * A defender standing in front of the target when the ball is thrown:
 * near the catch spot and between it and the QB. They get the ball.
 */
export function jumpingDefender(m: Match, qb: Athlete, from: V3, spot: V2, target: Athlete): Athlete | null {
  const dir = norm2({ x: spot.x - from.x, z: spot.z - from.z });
  const along = (p: V2) => (p.x - from.x) * dir.x + (p.z - from.z) * dir.z;
  let best: Athlete | null = null;
  for (const d of m.athletes) {
    if (d.team === qb.team || !canPlayBall(d)) continue;
    if (dist2(d, spot) > PASS.jumpRadius || along(d) >= along(target)) continue;
    if (!best || dist2(d, spot) < dist2(best, spot)) best = d;
  }
  return best;
}

/**
 * Bends a pass gently toward a receiver who changes course after the
 * throw, so a good throw still meets them. It never turns the ball
 * harder than PASS.assist, so a sharp cut can still beat it.
 */
export function assistPass(m: Match, dt: number): void {
  const pass = m.ball.pass;
  const f = m.ball.flight;
  if (!pass || !f || pass.interceptor !== null) return;
  const r = m.athlete(pass.to);
  const left = pass.arrive - pass.t;
  if (!r || left < 0.12) return;
  const want = { x: r.x + r.vx * left, z: r.z + r.vz * left };
  // The spot is where the ball comes down as thrown; each nudge moves it by about the nudge times the time left.
  const need = { x: (want.x - pass.spot.x) / left, z: (want.z - pass.spot.z) / left };
  const push = norm2(need);
  const amount = Math.min(Math.hypot(need.x, need.z), PASS.assist * dt);
  f.vel.x += push.x * amount;
  f.vel.z += push.z * amount;
  pass.spot = { x: pass.spot.x + push.x * amount * left, z: pass.spot.z + push.z * amount * left };
}

function give(m: Match, a: Athlete): void {
  m.lastPass = m.ball.pass;
  m.ball.state = "held";
  m.ball.holder = a.id;
  m.ball.flight = null;
  m.ball.pass = null;
}

function incomplete(m: Match, id: number | null): void {
  m.lastPass = m.ball.pass;
  m.ball.state = "loose";
  m.ball.pass = null;
  m.emit({ type: "incomplete", id });
  endPlay(m, "incomplete");
}

function caught(m: Match, r: Athlete): void {
  if (!inBounds(r)) return incomplete(m, r.id);
  give(m, r);
  m.play!.caughtBy = r.id;
  m.qbOf(r.team).stats.completions++;
  r.stats.catches++;
  m.emit({ type: "catch", id: r.id, yards: Math.round(xToYard(r.team, r.x) - m.drive.los) });
}

function intercepted(m: Match, d: Athlete, from: number): void {
  give(m, d);
  m.play!.intercepted = true;
  d.stats.interceptions++;
  m.emit({ type: "intercept", id: d.id, from });
}

/** Is the ball at a height and distance this player can get hands on? */
function reachable(ball: V3, a: Athlete, radius: number): boolean {
  return ball.y <= PASS.maxCatchY && dist3(ball, hands(a)) < radius;
}

/**
 * Flies a pass and settles it: a defender it was thrown into takes it, a
 * defender a person steers into its path picks it off, the target
 * catches it, or it hits the turf incomplete.
 */
export function updatePass(m: Match, dt: number): void {
  const pass = m.ball.pass;
  const f = m.ball.flight;
  if (!pass || !f) return;
  stepFlight(f, dt);
  pass.t += dt;
  m.ball.pos = { ...f.pos };
  assistPass(m, dt);
  if (pass.interceptor !== null) {
    const d = m.athlete(pass.interceptor);
    if (d && !isDown(d) && reachable(f.pos, d, PASS.catchRadius * 1.4)) return intercepted(m, d, pass.from);
  } else {
    for (const d of m.athletes) {
      // Only a defender a person steers, not the computer and not Guard, can jump into the path.
      if (d.team === m.offense || d.auto || !canPlayBall(d)) continue;
      if (f.pos.y > 0.3 && f.pos.y < PASS.maxCatchY && dist2(d, f.pos) < PASS.pickRadius) return intercepted(m, d, pass.from);
    }
    const r = m.athlete(pass.to);
    if (r && !isDown(r)) {
      const radius = r.action.kind === "dive" ? PASS.diveCatchRadius : PASS.catchRadius;
      if (reachable(f.pos, r, radius)) return caught(m, r);
    }
  }
  if (f.pos.y <= 0.08 || !inBounds(f.pos)) incomplete(m, pass.to);
}
