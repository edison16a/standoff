import { charOf } from "./athlete";
import { contestFor } from "./contest";
import { isThree, rimDistance } from "./court";
import { arcTimed, flight } from "./flight";
import type { Match } from "./match";
import { between } from "./rng";
import { callShootingFoul } from "./foul-call";
import { planBlock, planShot } from "./shot-flight";
import { rollShootingFoul } from "./shooting-foul";
import { stepbackFor } from "./stepback";
import { gradeRelease, isMake, makeChance, pickOutcome, type Grade, type ShotKind } from "./shot-model";
import { NET, RIM, SHOT } from "./tuning";
import type { Athlete } from "./types";
import { clamp, type V3 } from "./vec";

/** A jump shot's timing, in seconds from the press: up at takeoff, down after the air time. */
/** A shot fouled in the act goes in this share as often as it would have. */
const FOULED_MAKE = 0.4;

export const JUMPER = { takeoff: (SHOT.takeoff * SHOT.meterMs) / 1000, air: 0.62, peak: 0.42 } as const;

/** Where the ball leaves the hand on a jumper: above the forehead, a little in front. */
export function releasePoint(a: Athlete): V3 {
  const h = charOf(a).build.height;
  return { x: a.x + Math.sin(a.yaw) * 0.22, y: a.y + h * 1.17, z: a.z + Math.cos(a.yaw) * 0.22 };
}

/** Starts a jumper and its meter, or at the line a free throw, which is the same meter with no jump. */
export function startJumper(m: Match, a: Athlete, free = false): void {
  // With a defender in the chest the shooter steps back off him first (see `stepback.ts`).
  const step = free ? null : stepbackFor(m, a);
  a.action = { kind: "shoot", t: 0, three: !free && isThree(a), released: false, free, step };
  if (step) {
    a.vx = step.x;
    a.vz = step.z;
    m.emit({ type: "squeak", id: a.id });
  }
  m.emit({ type: "gather", id: a.id, kind: free ? "free" : "jumper" });
}

/** Lets go of a jumper. The phone's hold time is trusted within reason, so lag never costs a green. */
export function releaseJumper(m: Match, a: Athlete, heldMs?: number): void {
  if (a.action.kind !== "shoot" || a.action.released) return;
  a.action.released = true;
  // The whistle can go mid motion (a shot clock violation), and then there is no ball to let go of.
  const free = a.action.free;
  if (m.ball.holder !== a.id || m.phase !== (free ? "freeThrow" : "live")) return;
  const hostMs = a.action.t * 1000;
  const ms = heldMs === undefined ? hostMs : clamp(heldMs, hostMs - 260, hostMs + 60);
  const { grade } = gradeRelease(ms, charOf(a).stats.shooting, a.onFire, free);
  launchShot(m, a, free ? "free" : "jumper", grade, releasePoint(a));
}

/**
 * The ball leaves the hand: size up the defence, roll for a block, then
 * for the make, choose how it goes in or out, and plan the flight.
 */
export function launchShot(m: Match, a: Athlete, kind: ShotKind, grade: Grade, hand: V3): void {
  const b = m.ball;
  const distance = rimDistance(a);
  const three = kind === "jumper" && isThree(a);
  const free = kind === "free";
  // Nobody may contest a free throw.
  const c = contestFor(a, free ? [] : m.opponents(a.team), kind);
  if (free) a.box.freeAttempts++;
  else a.box.attempts++;
  b.holder = null;
  b.mode = "flight";
  b.flightT = 0;
  b.flightSeg = -1;
  b.flightKind = "shot";
  b.lastTouch = a.id;
  b.pos = { ...hand };
  const assist = m.lastPass && m.lastPass.to === a.id ? m.lastPass.from : null;
  const base = { shooter: a.id, team: a.team, points: free ? 1 : three ? 3 : 2, kind, dunk: null, grade, counted: false, touchedRim: false, assist: free ? null : assist, contest: c.contest, distance } as const;
  const forced = m.forced;
  m.forced = null;
  // Contact on the shot is a foul, and a fouled shot is never a block: it flies on and may still drop.
  const fouler = forced || free ? null : rollShootingFoul(m, a, kind);
  if (fouler) callShootingFoul(m, fouler, a, three ? 3 : 2);
  if (!forced && !fouler && c.blocker && m.rng() < c.blockChance) {
    b.flight = planBlock(m.rng, hand, c.blocker);
    b.flightKind = "block";
    b.shot = { ...base, outcome: "airball", made: false };
    b.lastTouch = c.blocker.id;
    c.blocker.box.blocks++;
    m.emit({ type: "block", id: c.blocker.id, victim: a.id });
    return;
  }
  const s = charOf(a).stats;
  const ctx = { kind, grade, distance, shooting: s.shooting, contest: c.contest, strengthEdge: c.edge, onFire: a.onFire };
  // Contact knocks the shot off line, so a fouled shot drops far less often.
  const chance = makeChance(ctx) * (fouler ? FOULED_MAKE : 1);
  const made = forced ? isMake(forced) : m.rng() < chance;
  const side = Math.atan2(a.x - RIM.x, a.z - RIM.z);
  const wanted = forced ?? pickOutcome(m.rng, made, ctx, side);
  const set = kind === "jumper" || free;
  const apex = set ? RIM.y + 0.95 + distance * 0.12 + between(m.rng, -0.1, 0.15) : Math.max(hand.y, RIM.y) + 0.38;
  // A jumper leaves with two and a half turns of backspin; a layup is rolled softly off the fingers.
  const planned = planShot(m.rng, { from: hand, outcome: wanted, apex, backspin: set ? between(m.rng, 13, 17) : between(m.rng, 5, 8) });
  const outcome = planned.outcome;
  b.flight = planned.flight;
  b.shot = { ...base, outcome, made: isMake(outcome) };
  b.spin = -(set ? 14 : 8);
  m.emit({ type: "shot", id: a.id, kind, three, grade, chance, outcome, made: isMake(outcome), contest: c.contest });
}

/** The slam itself: the ball goes down through the rim, unless a defender got a hand to it. */
export function slam(m: Match, a: Athlete): void {
  const b = m.ball;
  const c = contestFor(a, m.opponents(a.team), "dunk");
  const top = { x: RIM.x + (a.x - RIM.x) * 0.25, y: RIM.y + 0.24, z: RIM.z + (a.z - RIM.z) * 0.25 };
  a.box.attempts++;
  b.holder = null;
  b.mode = "flight";
  b.flightT = 0;
  b.flightSeg = -1;
  b.lastTouch = a.id;
  b.pos = { ...top };
  const style = a.action.kind === "drive" && a.action.style ? a.action.style : charOf(a).dunk;
  const base = { shooter: a.id, team: a.team, points: 2, kind: "dunk", dunk: style, grade: "perfect", counted: false, touchedRim: true, assist: m.lastPass?.to === a.id ? m.lastPass.from : null, contest: c.contest, distance: 0.5 } as const;
  const forced = m.forced;
  m.forced = null;
  const fouler = forced ? null : rollShootingFoul(m, a, "dunk");
  if (fouler) callShootingFoul(m, fouler, a, 2);
  if (!forced && !fouler && c.blocker && m.rng() < c.blockChance) {
    b.flight = planBlock(m.rng, top, c.blocker);
    b.flightKind = "block";
    b.shot = { ...base, outcome: "airball", made: false };
    b.lastTouch = c.blocker.id;
    c.blocker.box.blocks++;
    m.emit({ type: "block", id: c.blocker.id, victim: a.id });
    return;
  }
  const made = forced ? isMake(forced) : m.rng() < makeChance({ kind: "dunk", grade: "perfect", distance: 0.5, shooting: 5, contest: c.contest, strengthEdge: c.edge, onFire: a.onFire }) * (fouler ? FOULED_MAKE + 0.15 : 1);
  if (!made) {
    b.flight = planShot(m.rng, { from: top, outcome: "rimOut", apex: top.y + 0.05, backspin: 2 }).flight;
    b.flightKind = "shot";
    b.shot = { ...base, outcome: "rimOut", made: false };
    m.emit({ type: "shot", id: a.id, kind: "dunk", three: false, grade: "perfect", chance: 0.9, outcome: "rimOut", made: false, contest: c.contest });
    return;
  }
  const below = { x: RIM.x, y: RIM.y - NET.depth, z: RIM.z };
  b.flight = flight([arcTimed(top, below, 0.14, [{ kind: "rim", power: 1 }, { kind: "net", swish: false }, { kind: "score" }], 2.2)], {
    v: { x: between(m.rng, -0.5, 0.5), y: -3.5, z: between(m.rng, 0, 0.6) },
    events: [],
  });
  b.flightKind = "dunk";
  b.shot = { ...base, outcome: "swish", made: true };
  const power = clamp(0.5 + charOf(a).stats.strength * 0.05, 0.5, 1);
  m.emit({ type: "dunk", id: a.id, style, power });
}
