import { charOf } from "./athlete";
import { contestFor } from "./contest";
import { isThree, rimDistance } from "./court";
import { arcTimed, flight } from "./flight";
import type { Match } from "./match";
import { between } from "./rng";
import { planBlock, planShot } from "./shot-flight";
import { gradeRelease, isMake, makeChance, pickOutcome, type Grade, type ShotKind } from "./shot-model";
import { NET, RIM, SHOT } from "./tuning";
import type { Athlete } from "./types";
import { clamp, type V3 } from "./vec";

/** A jump shot's timing, in seconds from the press: up at takeoff, down after the air time. */
export const JUMPER = { takeoff: (SHOT.takeoff * SHOT.meterMs) / 1000, air: 0.62, peak: 0.42 } as const;

/** Where the ball leaves the hand on a jumper: above the forehead, a little in front. */
export function releasePoint(a: Athlete): V3 {
  const h = charOf(a).build.height;
  return { x: a.x + Math.sin(a.yaw) * 0.22, y: a.y + h * 1.17, z: a.z + Math.cos(a.yaw) * 0.22 };
}

export function startJumper(m: Match, a: Athlete): void {
  a.action = { kind: "shoot", t: 0, three: isThree(a), released: false };
  m.emit({ type: "gather", id: a.id, kind: "jumper" });
}

/** Lets go of a jumper. The phone's hold time is trusted within reason, so lag never costs a green. */
export function releaseJumper(m: Match, a: Athlete, heldMs?: number): void {
  if (a.action.kind !== "shoot" || a.action.released) return;
  a.action.released = true;
  // The whistle can go mid motion (a shot clock violation), and then there is no ball to let go of.
  if (m.ball.holder !== a.id || m.phase !== "live") return;
  const hostMs = a.action.t * 1000;
  const ms = heldMs === undefined ? hostMs : clamp(heldMs, hostMs - 260, hostMs + 60);
  const { grade } = gradeRelease(ms, charOf(a).stats.shooting, a.onFire);
  launchShot(m, a, "jumper", grade, releasePoint(a));
}

/**
 * The ball leaves the hand: size up the defence, roll for a block, then
 * for the make, choose how it goes in or out, and plan the flight.
 */
export function launchShot(m: Match, a: Athlete, kind: ShotKind, grade: Grade, hand: V3): void {
  const b = m.ball;
  const distance = rimDistance(a);
  const three = kind === "jumper" && isThree(a);
  const c = contestFor(a, m.opponents(a.team), kind);
  a.box.attempts++;
  b.holder = null;
  b.mode = "flight";
  b.flightT = 0;
  b.flightSeg = -1;
  b.flightKind = "shot";
  b.lastTouch = a.id;
  b.pos = { ...hand };
  const assist = m.lastPass && m.lastPass.to === a.id ? m.lastPass.from : null;
  const base = { shooter: a.id, team: a.team, points: three ? 3 : 2, kind, grade, counted: false, touchedRim: false, assist } as const;
  if (c.blocker && m.rng() < c.blockChance) {
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
  const chance = makeChance(ctx);
  const made = m.rng() < chance;
  const side = Math.atan2(a.x - RIM.x, a.z - RIM.z);
  const outcome = pickOutcome(m.rng, made, ctx, side);
  const apex = kind === "jumper" ? RIM.y + 0.95 + distance * 0.12 + between(m.rng, -0.1, 0.15) : Math.max(hand.y, RIM.y) + 0.38;
  b.flight = planShot(m.rng, { from: hand, outcome, apex });
  b.shot = { ...base, outcome, made: isMake(outcome) };
  b.spin = -(kind === "jumper" ? 14 : 8);
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
  const base = { shooter: a.id, team: a.team, points: 2, kind: "dunk", grade: "perfect", counted: false, touchedRim: true, assist: m.lastPass?.to === a.id ? m.lastPass.from : null } as const;
  if (c.blocker && m.rng() < c.blockChance) {
    b.flight = planBlock(m.rng, top, c.blocker);
    b.flightKind = "block";
    b.shot = { ...base, outcome: "airball", made: false };
    b.lastTouch = c.blocker.id;
    c.blocker.box.blocks++;
    m.emit({ type: "block", id: c.blocker.id, victim: a.id });
    return;
  }
  const made = m.rng() < makeChance({ kind: "dunk", grade: "perfect", distance: 0.5, shooting: 5, contest: c.contest, strengthEdge: c.edge, onFire: a.onFire });
  if (!made) {
    b.flight = planShot(m.rng, { from: top, outcome: "rimOut", apex: top.y + 0.05 });
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
  m.emit({ type: "dunk", id: a.id, style: charOf(a).dunk, power });
}
