import { leadPass, pickTarget } from "./aim";
import { isDown, statsOf } from "./body";
import { launch } from "./flight";
import { jumpingDefender } from "./catching";
import { tracePath } from "./catch/path";
import { release } from "./throw-error";
import type { Match } from "./match";
import { canPitch, releasePitch } from "./run-play";
import { PASS } from "./tuning";
import type { Athlete } from "./types";
import { len3, type V3 } from "./vec";

/** Only the QB throws, once a play, with the ball in hand, and never after he turned runner (qb-run.ts). */
export function canThrow(m: Match, a: Athlete): boolean {
  const play = m.play;
  // A run call has no forward pass: the QB pitches to the back instead (run-play.ts).
  if (m.phase !== "live" || !play || play.call === "run" || play.passed || play.qbRun) return false;
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
  // On a run call the ring shows who the pitch is going to.
  if (canPitch(m, qb)) {
    play.target = play.back;
    return;
  }
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
  a.action = { kind: "throw", t: 0, dur: PASS.throwTime, released: false, to, lob: false };
  return true;
}

/** Lets the ball go: led to meet the target, off by the hand's error. */
function letGo(m: Match, a: Athlete, to: number): void {
  const play = m.play!;
  const target = m.athlete(to);
  if (!target || m.carrier()?.id !== a.id) return;
  const from: V3 = { x: a.x + Math.sin(a.yaw) * 0.3, y: PASS.releaseHeight, z: a.z + Math.cos(a.yaw) * 0.3 };
  const lead = leadPass(from, target, { x: target.vx, z: target.vz }, statsOf(a).arm);
  // A defender sitting in front of the receiver reads it and breaks on the ball.
  const jumper = jumpingDefender(m, a, from, lead.spot, target);
  // The hand's error turns the aimed throw into the real one.
  const out = release(m, a, lead.vel);
  const flight = launch(from, out.vel, "spiral", out.spin, out.wobble);
  m.ball.state = "pass";
  m.ball.holder = null;
  m.ball.flight = flight;
  const speed = len3(out.vel);
  const spin = out.spin;
  m.ball.pass = {
    from: a.id, to: target.id, interceptor: jumper?.id ?? null, spot: lead.spot, arrive: lead.time, t: 0,
    speed, rps: spin / (Math.PI * 2), release: from, at: m.time, tried: {}, path: tracePath(flight, m.time), tipped: false, pitch: false,
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
    if (act.lob) releasePitch(m, a, act.to);
    else letGo(m, a, act.to);
  }
  if (act.t >= act.dur) a.action = { kind: "none" };
}

