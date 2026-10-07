import type { PassInfo } from "../ball";
import { isDown, topSpeed } from "../body";
import { CATCH_AFTER, CATCH_PICK, catchKindFor, JARRED, type CatchKind, type CatchPlan, type CatchResult } from "../catch-preset";
import { startDive } from "../dive";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { dir2, dist2, type V2 } from "../vec";
import { playFor, type Play } from "./eligible";
import { meetPoint, PATH_DT, type Meet } from "./path";
import { reachOf } from "./reach";

/**
 * Picks and plays each player's move for a pass in the air (the moves
 * are in catch-preset.ts). Half a second out, the receiver it was thrown
 * to, a defender who read it and any defender right on its line get a
 * move from how the ball will reach them. The arrival is kept up to date
 * as the ball comes, so the hands meet it on time, and a dive leaves the
 * ground just early enough to get there.
 */

/** Defenders who did not read the throw only go up for a ball passing this close. */
const NEAR_LINE = 2.0;
/** With no hands on it this long after it should have arrived, the ball went by. */
const LATE = 0.35;

/** Everyone's moves for this step: the clocks, the ball going by, dives, and new moves as a pass comes down. */
export function planCatches(m: Match, dt: number): void {
  const pass = m.ball.state === "pass" ? m.ball.pass : null;
  for (const a of m.athletes) {
    const p = a.catching;
    if (p) tick(m, a, p, pass, dt);
    else if (pass && !pass.pitch) consider(m, a, pass);
  }
}

function tick(m: Match, a: Athlete, p: CatchPlan, pass: PassInfo | null, dt: number): void {
  p.t += dt;
  if (p.result) {
    p.since += dt;
    if (p.since > CATCH_AFTER[p.kind]) a.catching = null;
    return;
  }
  if (!pass || p.t > p.at + LATE) return finish(p, "missed");
  // Keep the arrival true to the ball as it comes, so the hands are there on time.
  const meet = meetFor(m, a, pass);
  if (meet) {
    p.at = p.t + meet.wait;
    // Still short of it as he would have to leave the ground: a catch on his feet becomes a lay out.
    const late = meet.wait > CATCH_PICK.diveLead * 0.5 && meet.wait <= CATCH_PICK.diveLead + 0.05;
    if (ON_FEET.has(p.kind) && late && shortOf(a, meet) > CATCH_PICK.short) {
      p.kind = "dive";
      p.spot = meet.spot;
    }
  }
  if (p.kind === "dive" && p.at - p.t <= CATCH_PICK.diveLead && (a.action.kind === "none" || a.action.kind === "juke")) {
    a.move = dir2(a, p.spot);
    startDive(m, a);
  }
}

/** Moves a player makes on his feet, which a ball led too far turns into a dive. */
const ON_FEET = new Set<CatchKind>(["chest", "stumble", "shoulder"]);

/** Metres he is still short of the meeting spot when the ball gets there, running flat out. */
function shortOf(a: Athlete, meet: Meet): number {
  return Math.max(0, dist2(a, meet.spot) - reachOf(a).radius - topSpeed(a, false) * meet.wait);
}

function meetFor(m: Match, a: Athlete, pass: PassInfo): Meet | null {
  return pass.path ? meetPoint(pass.path, m.time, a, topSpeed(a, false), reachOf(a).radius * 0.3) : null;
}

/** Gives a player his move once the ball is close enough to read. */
function consider(m: Match, a: Athlete, pass: PassInfo): void {
  const play = playFor(m, a, pass);
  if (!play || isDown(a) || !pass.path) return;
  const mine = a.id === pass.to || a.id === pass.interceptor;
  const meet = meetFor(m, a, pass);
  if (!meet || meet.wait > CATCH_PICK.lead) return;
  const short = shortOf(a, meet);
  if (!mine && (dist2(a, meet.spot) > NEAR_LINE || short > 0.3)) return;
  const vel = ballVelocity(pass, m.time + meet.wait);
  const speed = Math.hypot(vel.x, vel.z) || 1;
  const left = { x: Math.cos(a.yaw), z: -Math.sin(a.yaw) };
  const facing = -(Math.sin(a.yaw) * vel.x + Math.cos(a.yaw) * vel.z) / speed;
  // The side it comes in on: where it meets him across his body, and the side it is coming from.
  const across = (meet.spot.x - a.x) * left.x + (meet.spot.z - a.z) * left.z - ((vel.x * left.x + vel.z * left.z) / speed) * 0.3;
  const kind = catchKindFor({ height: meet.y, speed: Math.hypot(vel.x, vel.y, vel.z), facing, contest: nearestFoe(m, a, meet.spot), short, play });
  a.catching = { kind, t: 0, at: meet.wait, side: across >= 0 ? 1 : -1, height: meet.y, spot: meet.spot, result: null, since: 0 };
}

/** The ball's velocity on its traced path at match time `time`. */
function ballVelocity(pass: PassInfo, time: number): { x: number; y: number; z: number } {
  const pts = pass.path!.points;
  const i = Math.max(0, Math.min(pts.length - 2, Math.round((time - pass.path!.at) / PATH_DT)));
  const a = pts[i]!;
  const b = pts[i + 1] ?? a;
  return { x: (b.x - a.x) / PATH_DT, y: (b.y - a.y) / PATH_DT, z: (b.z - a.z) / PATH_DT };
}

/** Metres from a spot to the nearest opponent who could get a hand in. */
export function nearestFoe(m: Match, a: Athlete, at: V2): number {
  let best = Infinity;
  for (const o of m.athletes) {
    if (o.team === a.team || o.role === "lineman" || isDown(o)) continue;
    best = Math.min(best, dist2(o, at));
  }
  return best;
}

function finish(p: CatchPlan, result: CatchResult): void {
  p.result = result;
  p.since = 0;
  p.at = Math.min(p.at, p.t);
}

/**
 * The hands had their go (catch/touch.ts): the move finishes by how it
 * went, and the body pays for it. A ball hauled in through traffic
 * staggers him, a high point lands him heavy, and a drop with a
 * defender on him was a hit that jarred it loose.
 */
export function noteCatch(m: Match, a: Athlete, result: Exclude<CatchResult, "missed" | "jarred">, play: Play): void {
  const p = a.catching ?? (a.catching = { kind: play === "swat" ? "swat" : play === "pick" ? "pick" : "chest", t: 0, at: 0, side: 1, height: 1.3, spot: { x: a.x, z: a.z }, result: null, since: 0 });
  const hit = result === "dropped" && nearestFoe(m, a, a) < JARRED;
  finish(p, hit ? "jarred" : result);
  if (hit) {
    a.stagger = Math.max(a.stagger, 0.7);
    a.stumble = { t: 0, dur: 0.8, side: p.side };
  } else if (result === "held" && p.kind === "stumble") {
    a.stagger = Math.max(a.stagger, 0.55);
    a.stumble = { t: 0, dur: 0.7, side: p.side };
  } else if (result === "held" && (p.kind === "high" || p.kind === "pick")) {
    a.stagger = Math.max(a.stagger, 0.25);
  }
}
