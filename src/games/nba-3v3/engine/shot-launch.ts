import { buildOf } from "./athlete";
import { swat } from "./ball-touch";
import { contestFor } from "./contest";
import { isThree, rimDistance } from "./court";
import { callShootingFoul } from "./foul-call";
import { missShot } from "./rules";
import type { Match } from "./match";
import { freshTrack, traceShot } from "./physics/shot-watch";
import { between } from "./rng";
import { forcedLaunch } from "./shot-forced";
import { bankAngle, makeChance, type Grade, type ShotContext, type ShotKind } from "./shot-model";
import { planRelease, type ReleaseInput } from "./shot-release";
import type { Family } from "./shot-calibration";
import { rollShootingFoul } from "./shooting-foul";
import { RIM } from "./tuning";
import type { Athlete, ShotInfo } from "./types";
import { clamp, type V3 } from "./vec";

/** A shot fouled in the act goes in this share as often as it would have. */
const FOULED_MAKE = 0.4;

/** How the shooter throws it: a set shot or jumper, a floater, a layup off the glass or straight in. */
function release(m: Match, a: Athlete, kind: ShotKind, hand: V3, distance: number, floater: boolean): ReleaseInput {
  const side = Math.atan2(a.x - RIM.x, a.z - RIM.z);
  if (kind === "layup") {
    // A reverse is flipped up from under the ring on the far side, high enough to clear the iron.
    if (a.action.kind === "drive" && a.action.layup === "reverse") return { family: "reverse", from: hand, apex: Math.max(hand.y, RIM.y) + 0.55, spinRate: between(m.rng, 6, 9) };
    // From the wings the glass is the easy way in.
    const family: Family = m.rng() < 0.25 + 0.45 * bankAngle(side, distance) ? "bank" : "layup";
    return { family, from: hand, apex: Math.max(hand.y, RIM.y) + 0.38, spinRate: between(m.rng, 5, 8) };
  }
  if (floater) return { family: "floater", from: hand, apex: RIM.y + between(m.rng, 1.3, 1.55), spinRate: between(m.rng, 3, 6) };
  const free = kind === "free";
  const bank = !free && distance < 6.2 && m.rng() < 0.12 * bankAngle(side, distance);
  const apex = RIM.y + 0.95 + distance * 0.12 + between(m.rng, -0.1, 0.15);
  // A jumper leaves with two and a half turns of backspin.
  return { family: free ? "free" : bank ? "bankJumper" : "jumper", from: hand, apex, spinRate: between(m.rng, 13, 17) };
}

/**
 * The ball leaves the hand: size up the defence, see if the shot is
 * fouled, work out how well it was released, and throw it for real.
 * Whether it drops is up to the ball physics from here; a defender in
 * the air may still get a hand to it on the way (see `ball-touch.ts`).
 */
export function launchShot(m: Match, a: Athlete, kind: ShotKind, grade: Grade, hand: V3, floater = false): void {
  const b = m.ball;
  const distance = rimDistance(a);
  const three = kind === "jumper" && isThree(a);
  const free = kind === "free";
  // Nobody may contest a free throw.
  const c = contestFor(a, free ? [] : m.opponents(a.team), kind);
  if (free) a.box.freeAttempts++;
  else a.box.attempts++;
  letGo(m, a, hand);
  const forced = m.forced;
  m.forced = null;
  // Contact on the shot is a foul, and a fouled shot flies on and may still drop.
  const fouler = forced || free ? null : rollShootingFoul(m, a, kind);
  if (fouler) callShootingFoul(m, fouler, a, three ? 3 : 2);
  b.shot = shotInfo(m, a, kind, grade, three ? 3 : free ? 1 : 2, c.contest, distance);
  // A scripted film, and a fouled shot, fly clear of hands.
  if (forced || fouler) b.shot.rolled = m.opponents(a.team).map((o) => o.id);
  const s = buildOf(a).stats;
  const ctx: ShotContext = { kind, grade, distance, shooting: s.shooting, contest: c.contest, strengthEdge: c.edge, onFire: a.onFire, floater };
  const chance = makeChance(ctx) * (fouler ? FOULED_MAKE : 1);
  const input = release(m, a, kind, hand, distance, floater);
  const launch = forced ? forcedLaunch(m.rng, input, forced) : planRelease(m.rng, input, chance, distance);
  b.vel = launch.vel;
  b.w = launch.spin;
  // Flown ahead with nobody near, for the sounds and buzzes that want to know early; the live ball decides.
  const ahead = traceShot({ pos: { ...hand }, vel: launch.vel, w: launch.spin });
  m.emit({ type: "shot", id: a.id, kind, three, grade, chance, outcome: ahead.outcome, made: ahead.made, contest: c.contest });
}

/** The ball leaves the hand. */
function letGo(m: Match, a: Athlete, at: V3): void {
  const b = m.ball;
  b.holder = null;
  b.mode = "flight";
  b.flightT = 0;
  b.flightKind = "shot";
  b.lastTouch = a.id;
  b.pos = { ...at };
  b.hand = "none";
  b.passTo = null;
  b.aim = null;
}

function shotInfo(m: Match, a: Athlete, kind: ShotKind, grade: Grade, points: 1 | 2 | 3, contest: number, distance: number): ShotInfo {
  const assist = kind !== "free" && m.lastPass && m.lastPass.to === a.id ? m.lastPass.from : null;
  const dunk = kind === "dunk" ? (a.action.kind === "drive" && a.action.style ? a.action.style : buildOf(a).dunk) : null;
  return { shooter: a.id, team: a.team, points, kind, dunk, grade, outcome: "swish", made: false, counted: false, touchedRim: kind === "dunk", assist, contest, distance, track: freshTrack(), rolled: [] };
}

/**
 * The slam: the hand drives the ball down through the ring from above.
 * A defender who got up in time may swat it at the rim, and a slam put
 * off line by contact can come off the iron.
 */
export function slam(m: Match, a: Athlete): void {
  const b = m.ball;
  const c = contestFor(a, m.opponents(a.team), "dunk");
  const top = { x: RIM.x + (a.x - RIM.x) * 0.25, y: RIM.y + 0.24, z: RIM.z + (a.z - RIM.z) * 0.25 };
  a.box.attempts++;
  letGo(m, a, top);
  const forced = m.forced;
  m.forced = null;
  const fouler = forced ? null : rollShootingFoul(m, a, "dunk");
  if (fouler) callShootingFoul(m, fouler, a, 2);
  b.shot = shotInfo(m, a, "dunk", "perfect", 2, c.contest, 0.5);
  b.shot.rolled = m.opponents(a.team).map((o) => o.id);
  if (!forced && !fouler && c.blocker && m.rng() < c.blockChance) {
    swat(m, b);
    b.flightKind = "block";
    b.shot.outcome = "airball";
    b.lastTouch = c.blocker.id;
    c.blocker.box.blocks++;
    m.emit({ type: "block", id: c.blocker.id, victim: a.id, tip: false, at: { ...top } });
    missShot(m);
    return;
  }
  const ctx: ShotContext = { kind: "dunk", grade: "perfect", distance: 0.5, shooting: 5, contest: c.contest, strengthEdge: c.edge, onFire: a.onFire };
  const chance = makeChance(ctx) * (fouler ? FOULED_MAKE + 0.15 : 1);
  const input: ReleaseInput = { family: "dunk", from: top, apex: top.y, spinRate: 0 };
  const launch = forced ? forcedLaunch(m.rng, input, forced) : planRelease(m.rng, input, chance, 0.5);
  b.vel = launch.vel;
  b.w = launch.spin;
  // The hand is on the iron as it goes down: no swish for a dunk.
  b.shot.track.first = "rim";
  const ahead = traceShot({ pos: { ...top }, vel: launch.vel, w: launch.spin });
  if (ahead.made) {
    m.emit({ type: "rim", power: 1 });
    const power = clamp(0.5 + buildOf(a).stats.strength * 0.05, 0.5, 1);
    m.emit({ type: "dunk", id: a.id, style: b.shot.dunk ?? buildOf(a).dunk, power });
    return;
  }
  m.emit({ type: "shot", id: a.id, kind: "dunk", three: false, grade: "perfect", chance, outcome: ahead.outcome, made: false, contest: c.contest });
}
