import { airborne } from "../athlete";
import { applyHit } from "../blocks/hit";
import { BODY } from "../body/body-spec";
import { landTime } from "../body/drive-flight";
import { rimDistance, RIM_SPOT } from "../court";
import type { Match } from "../match";
import { traceShot } from "../physics/shot-watch";
import { missShot } from "../rules";
import { letGo, shotInfo } from "../shot-info";
import { slam } from "../shot-launch";
import { RIM } from "../tuning";
import type { Athlete } from "../types";
import { dir2, type V3 } from "../vec";
import type { Approach } from "./approach";
import { dunkOdds, rollDunk, type DunkFail, type DunkOdds } from "./dunk-odds";
import { readDunk } from "./dunk-read";

type Drive = Extract<Athlete["action"], { kind: "drive" }>;

/** A lab or a test can fix the next dunk's fate; `make` forces it down. */
export type ForcedDunk = DunkFail | "make";

/** The odds of a dunk from here, and the man who could stuff it. */
export function dunkChances(m: Match, a: Athlete, ap: Approach): { odds: DunkOdds; stopper: Athlete | null } {
  const { read, stopper } = readDunk(m, a, ap);
  return { odds: dunkOdds(read), stopper };
}

/** How the dunk goes, rolled before the gather, and the man who stuffs it when it is a stuff. */
export function judgeDunk(m: Match, chances: { odds: DunkOdds; stopper: Athlete | null }): { fail: DunkFail | null; stopper: Athlete | null } {
  const { odds, stopper } = chances;
  const forced = m.forcedDunk;
  m.forcedDunk = null;
  let fail = forced ? (forced === "make" ? null : forced) : rollDunk(m.rng, odds);
  // A stuff needs a man on the floor near the rim to go up for it; with none it catches the iron instead.
  if (fail === "stuff" && (!stopper || airborne(stopper))) fail = "clang";
  return { fail, stopper: fail === "stuff" ? stopper : null };
}

/** The slam that fails, at the moment the ball would have gone down. */
export function failSlam(m: Match, a: Athlete, hand: V3, act: Drive): void {
  const man = act.stopper === null || act.stopper === undefined ? null : m.athletes[act.stopper];
  const met = man && man.action.kind === "block" && Math.hypot(man.x - hand.x, man.z - hand.z) < 1.4;
  // A stopper knocked off his spot never got there: the slam catches the iron, and the body plays the clang.
  if (act.fail === "stuff" && !met) act.fail = "clang";
  m.emit({ type: "dunkFail", id: a.id, fail: act.fail ?? "clang", by: act.fail === "stuff" ? (man?.id ?? null) : null });
  if (act.fail === "short") return shortOfRim(m, a, hand);
  if (act.fail === "stuff" && man) return stuff(m, a, man, hand);
  // Up there but off the iron: off the back, or rattled out.
  m.forced = m.rng() < 0.55 ? "backIron" : "rimOut";
  slam(m, a, hand);
}

/**
 * A slam that was to go down but did not: a man in the air met it, or a
 * foul knocked it off line. The body takes the fail preset from the slam
 * on, and lets go of the rim at once, rather than finishing a make.
 */
export function failFromSlam(act: Drive, fail: DunkFail): void {
  act.fail = fail;
  act.rimHang = 0;
  act.land = landTime(act);
}

/** Met at the rim: his hand on the ball as it comes over, and the ball thrown back out. */
function stuff(m: Match, a: Athlete, man: Athlete, hand: V3): void {
  const b = m.ball;
  a.box.attempts++;
  letGo(m, a, hand);
  b.shot = shotInfo(m, a, "dunk", "perfect", 2, 1, rimDistance(a));
  b.shot.rolled = m.opponents(a.team).map((o) => o.id);
  b.vel = { x: 0, y: -1, z: 0 };
  // The stuff is the two hand rejection: both palms on it as it comes over the ring, and back out it goes.
  const hit = "reject";
  applyHit(m, b, hit, man);
  b.flightKind = "block";
  b.shot.outcome = "airball";
  b.lastTouch = man.id;
  man.box.blocks++;
  m.emit({ type: "block", id: man.id, victim: a.id, tip: false, at: { ...hand }, hit, preset: "rejection" });
  missShot(m);
}

/** Never got up there: the ball goes up from under the ring into its front, and off. */
function shortOfRim(m: Match, a: Athlete, hand: V3): void {
  const b = m.ball;
  a.box.attempts++;
  letGo(m, a, hand);
  b.shot = shotInfo(m, a, "dunk", "perfect", 2, 0, rimDistance(a));
  b.shot.rolled = m.opponents(a.team).map((o) => o.id);
  b.shot.touchedRim = false;
  const to = dir2(hand, RIM_SPOT);
  // Rising just to the height of the ring as it reaches its front.
  const rise = Math.max(0.12, RIM.y + 0.03 - hand.y);
  const up = Math.sqrt(2 * BODY.gravity * rise);
  const reach = Math.max(0.05, Math.hypot(hand.x - RIM.x, hand.z - RIM.z) - RIM.radius);
  let vel = { x: 0, y: up, z: 0 };
  for (const k of [1.1, 0.8, 1.4, 0.5]) {
    const along = (reach / (up / BODY.gravity)) * k;
    vel = { x: to.x * along, y: up, z: to.z * along };
    if (!traceShot({ pos: { ...hand }, vel, w: { x: 0, y: 0, z: 0 } }).made) break;
  }
  b.vel = vel;
  b.w = { x: -to.z * 6, y: 0, z: to.x * 6 };
  m.emit({ type: "shot", id: a.id, kind: "dunk", three: false, grade: "perfect", chance: 0, outcome: "rimOut", preset: "rimOut", made: false, contest: 0 });
}
