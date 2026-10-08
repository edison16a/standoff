import { leadPass, pickTarget } from "./aim";
import { isDown, statsOf } from "./body";
import { launch } from "./flight";
import { tracePath } from "./catch/path";
import { readLane } from "./pass-lane";
import { pressure, release } from "./throw-error";
import { releaseSpot, squareUp, THROW_MOVES, THROW_PICK, throwKindFor } from "./throw-preset";
import type { Match } from "./match";
import { canPitch, releasePitch } from "./run-play";
import { handOver } from "./control";
import { yardToX } from "./field";
import { clinchOf } from "./support/clinch";
import { isReceiver } from "./support/roster";
import type { Athlete } from "./types";
import { dir2, dist2, len3, type V3 } from "./vec";

/** Only the QB throws, once a play, with the ball in hand, and never after he turned runner (qb-run.ts). */
export function canThrow(m: Match, a: Athlete): boolean {
  const play = m.play;
  // A run call has no forward pass: the QB pitches to the back instead (run-play.ts).
  if (m.phase !== "live" || !play || play.call === "run" || play.passed || play.qbRun) return false;
  return a.role === "qb" && a.team === m.offense && m.carrier()?.id === a.id && (a.action.kind === "none" || a.action.kind === "juke");
}

/** Metres of aim line a support outlet gives away to a runner. */
const OUTLET_PENALTY = 3;

/**
 * Who on the QB's team can catch right now: the runners, and a support
 * player who is free of his block and out past the line, an outlet or
 * the deep threat.
 */
export function receivers(m: Match, a: Athlete): Athlete[] {
  const losX = yardToX(m.offense, m.drive.los);
  const outlet = (o: Athlete) => o.role === "support" && !clinchOf(m, o.id) && (o.x - losX) * m.sign > 1.5;
  return m.athletes.filter((o) => o.team === a.team && (o.role === "runner" || outlet(o)) && !isDown(o));
}

/** The receivers as aim candidates: a blocker leaking out has to be aimed right at; the deep threat aims like a runner. */
export const candidates = (m: Match, qb: Athlete) => receivers(m, qb).map((r) => ({ id: r.id, x: r.x, z: r.z, penalty: isReceiver(r) ? 0 : OUTLET_PENALTY }));

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
  play.target = pickTarget(qb, qb.aim, candidates(m, qb));
}

/**
 * Starts the throwing motion at a receiver, picked by the throw's
 * length, the QB's speed and the rush (throw-preset.ts). The ball leaves
 * the hand on that motion's release frame.
 */
export function throwTo(m: Match, a: Athlete, to: number): boolean {
  const target = m.athlete(to);
  if (!canThrow(m, a) || !target || target.team !== a.team) return false;
  m.play!.target = to;
  const rush = pressure(m, a);
  const style = throwKindFor(dist2(a, target), Math.hypot(a.vx, a.vz), rush);
  const move = THROW_MOVES[style];
  a.action = { kind: "throw", t: 0, dur: move.dur, released: false, to, lob: false, style, release: move.release };
  if (style === "pressure") fadeAway(m, a);
  return true;
}

/** Off the back foot: a hop away from the nearest rusher as the arm comes round. */
function fadeAway(m: Match, a: Athlete): void {
  let near: Athlete | null = null;
  for (const o of m.athletes) {
    if (o.team === a.team || o.role === "lineman" || isDown(o)) continue;
    if (!near || dist2(o, a) < dist2(near, a)) near = o;
  }
  if (!near) return;
  const away = dir2(near, a);
  a.vx += away.x * THROW_PICK.fade;
  a.vz += away.z * THROW_PICK.fade;
}

/** Lets the ball go: led to meet the target and thrown true, with the defenders in the lane read as it leaves. */
function letGo(m: Match, a: Athlete, to: number): void {
  const play = m.play!;
  const target = m.athlete(to);
  if (!target || m.carrier()?.id !== a.id) return;
  // Out toward the target, not along the facing, so the flight never depends on how far he had turned.
  const act = a.action;
  const style = act.kind === "throw" ? act.style : "flick";
  // Square to the target on the release frame, then out of the hand where the motion has it.
  squareUp(a, target);
  const from: V3 = releaseSpot(a, target, THROW_MOVES[style]);
  const lead = leadPass(from, target, { x: target.vx, z: target.vz }, statsOf(a).arm);
  // Only defenders in the lane get a play on it; the biggest threat reads it and breaks on the ball.
  const lane = readLane(m, a, from, lead.spot);
  const jumper = lane[0] ?? null;
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
    lane: Object.fromEntries(lane.map((l) => [l.id, l.threat])),
  };
  play.passed = true;
  a.stats.attempts++;
  m.emit({ type: "throw", id: a.id, to: target.id, speed, spin: spin / (Math.PI * 2), air: lead.time, intercepting: jumper !== null });
  handOver(m, a, target);
}

export function updateThrow(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "throw") return;
  act.t += dt;
  if (!act.released && act.t >= act.release) {
    act.released = true;
    if (act.lob) releasePitch(m, a, act.to);
    else letGo(m, a, act.to);
  }
  if (act.t >= act.dur) a.action = { kind: "none" };
}

