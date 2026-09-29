import { looseness, missSpot } from "./accuracy";
import { leadPass, pickTarget, solveLaunch, type Lead } from "./aim";
import { isDown, statsOf } from "./body";
import { launch } from "./flight";
import { jumpingDefender } from "./catching";
import type { Match } from "./match";
import { ON_THE_RUN, PASS } from "./tuning";
import type { Athlete } from "./types";
import { dist2, len3, type V3 } from "./vec";

/** Only the QB throws, once a play, from behind the line, with the ball in hand. */
export function canThrow(m: Match, a: Athlete): boolean {
  const play = m.play;
  if (m.phase !== "live" || !play || play.passed || play.crossed) return false;
  return a.role === "qb" && a.team === m.offense && m.carrier()?.id === a.id && (a.action.kind === "none" || a.action.kind === "juke");
}

/** Runners on the QB's team who can catch right now. */
export function receivers(m: Match, a: Athlete): Athlete[] {
  return m.athletes.filter((o) => o.team === a.team && o.role === "runner" && !isDown(o));
}

/** Keeps the target under the throw stick up to date, so its ring can light up. */
export function updateTarget(m: Match): void {
  const play = m.play;
  if (!play) return;
  const qb = m.qbOf(m.offense);
  // Through the throwing motion the ring stays on the receiver the ball is going to.
  if (qb.action.kind === "throw") return;
  if (!qb.aim || !canThrow(m, qb)) {
    play.target = null;
    return;
  }
  play.target = pickTarget(qb, qb.aim, receivers(m, qb));
}

/** Starts the throwing motion at a receiver. The ball leaves the hand part way through. */
export function throwTo(m: Match, a: Athlete, to: number): boolean {
  if (!canThrow(m, a) || m.athlete(to)?.team !== a.team) return false;
  m.play!.target = to;
  a.action = { kind: "throw", t: 0, dur: PASS.throwTime, released: false, to };
  return true;
}

/** How loose the spiral is: a strong arm throws tight, pressure and tired legs loosen it. */
function wobbleFor(m: Match, a: Athlete): number {
  const pressure = m.athletes.some((o) => o.team !== a.team && o.role !== "lineman" && dist2(o, a) < 3) ? 0.05 : 0;
  return 0.025 + (10 - statsOf(a).arm) * 0.006 + pressure + Math.min(0.06, a.jukeHeat * 0.015);
}

/** A loose throw comes down off the lead spot in the same time. */
function spray(m: Match, from: V3, lead: Lead, loose: number): Lead {
  if (loose <= 0) return lead;
  const spot = missSpot(lead.spot, from, loose, m.rng);
  return { spot, time: lead.time, vel: solveLaunch(from, { x: spot.x, y: PASS.catchHeight, z: spot.z }, lead.time, "spiral", PASS.spin) };
}

/** Lets the ball go: leads the target, or the defender who has jumped the route. */
function release(m: Match, a: Athlete, to: number): void {
  const play = m.play!;
  const target = m.athlete(to);
  if (!target || m.carrier()?.id !== a.id) return;
  const from: V3 = { x: a.x + Math.sin(a.yaw) * 0.3, y: PASS.releaseHeight, z: a.z + Math.cos(a.yaw) * 0.3 };
  const arm = statsOf(a).arm;
  // Measured at the release: set feet throw clean, a throw on the run sprays.
  const loose = looseness(a);
  let lead = spray(m, from, leadPass(from, target, { x: target.vx, z: target.vz }, arm), loose);
  // A defender standing in front of where the ball comes down steps in and takes it. Loose throws are easier to read.
  const jumper = jumpingDefender(m, a, from, lead.spot, target, 1 + loose * ON_THE_RUN.readWider);
  if (jumper) lead = leadPass(from, jumper, { x: jumper.vx, z: jumper.vz }, arm);
  const spin = PASS.spin * (0.85 + arm * 0.02);
  m.ball.state = "pass";
  m.ball.holder = null;
  m.ball.flight = launch(from, lead.vel, "spiral", spin, wobbleFor(m, a) + loose * ON_THE_RUN.wobble);
  const speed = len3(lead.vel);
  m.ball.pass = {
    from: a.id, to: target.id, interceptor: jumper?.id ?? null, spot: lead.spot, arrive: lead.time, t: 0,
    speed, rps: spin / (Math.PI * 2), release: from, at: m.time, swiped: [], loose, pitch: false,
  };
  play.passed = true;
  a.stats.attempts++;
  m.emit({ type: "throw", id: a.id, to: target.id, speed, spin: spin / (Math.PI * 2), air: lead.time, intercepting: jumper !== null });
}

export function updateThrow(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "throw") return;
  act.t += dt;
  if (!act.released && act.t >= PASS.windup) {
    act.released = true;
    release(m, a, act.to);
  }
  if (act.t >= act.dur) a.action = { kind: "none" };
}

