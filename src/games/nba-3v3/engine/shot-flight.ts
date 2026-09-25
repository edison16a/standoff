import { angleToward, arcTimed, arcTo, flight, rimPoint, type Flight, type Segment } from "./flight";
import { between, type Rng } from "./rng";
import type { Outcome } from "./shot-model";
import { BALL, BOARD, NET, RIM } from "./tuning";
import type { V3 } from "./vec";

/** The height the ball's centre sits at while it rides on top of the ring. */
const ON_RIM = RIM.y + 0.1;
/** Where the ball's centre crosses the rim plane on a clean make. */
const THROUGH: V3 = { x: RIM.x, y: RIM.y + 0.02, z: RIM.z };
/** The glass the ball's centre can touch, one ball radius off the face. */
const GLASS_Z = BOARD.face + BALL.radius;

/** The drop through the net after any make, which is also the moment it counts. */
function throughNet(from: V3, swish: boolean): Segment {
  const bottom = { x: RIM.x + (from.x - RIM.x) * 0.2, y: RIM.y - NET.depth, z: RIM.z + (from.z - RIM.z) * 0.2 };
  return arcTimed(from, bottom, swish ? 0.2 : 0.24, [{ kind: "net", swish }, { kind: "score" }], 0.55);
}

/** The ball leaves the bottom of the net slowly, almost straight down. */
const NET_EXIT = (rng: Rng): V3 => ({ x: between(rng, -0.3, 0.3), y: -1.6, z: between(rng, 0.1, 0.5) });

export interface ShotPlanInput {
  from: V3;
  outcome: Outcome;
  /** How high the arc peaks, in metres. Jumpers go high, layups barely clear the rim. */
  apex: number;
}

/**
 * Plans the whole path of a shot for an outcome already decided. Makes
 * end through the net; misses end with the ball knocked loose off the
 * iron or the glass, and physics does the rest.
 */
export function planShot(rng: Rng, { from, outcome, apex }: ShotPlanInput): Flight {
  const front = angleToward(from.x, from.z);
  const back = front + Math.PI;
  const turn = rng() < 0.5 ? -1 : 1;
  switch (outcome) {
    case "swish": {
      const arc = arcTo(from, THROUGH, apex);
      return flight([arc, throughNet(THROUGH, true)], { v: NET_EXIT(rng), events: [] });
    }
    case "bank": {
      const side = Math.sign(from.x - RIM.x) || turn;
      const spot = { x: RIM.x + side * between(rng, 0.1, 0.22), y: RIM.y + between(rng, 0.3, 0.42), z: GLASS_Z };
      const carom = arcTimed(spot, THROUGH, 0.26, [{ kind: "board", power: 0.6 }]);
      return flight([arcTo(from, spot, apex), carom, throughNet(THROUGH, false)], { v: NET_EXIT(rng), events: [] });
    }
    case "roll": {
      const a0 = front + between(rng, -0.5, 0.5);
      const sweep = turn * between(rng, Math.PI * 0.9, Math.PI * 1.9);
      const touch = rimPoint(a0, RIM.radius, ON_RIM);
      const lap: Segment = { type: "orbit", dur: between(rng, 0.7, 1.15), a0, a1: a0 + sweep, r0: RIM.radius, r1: RIM.radius * 0.9, y0: ON_RIM, y1: ON_RIM - 0.02, events: [{ kind: "rim", power: 0.45 }] };
      const lip = rimPoint(a0 + sweep, RIM.radius * 0.9, ON_RIM - 0.02);
      const drop = arcTimed(lip, THROUGH, 0.14, [{ kind: "rim", power: 0.2 }]);
      return flight([arcTo(from, touch, apex), lap, drop, throughNet(THROUGH, false)], { v: NET_EXIT(rng), events: [] });
    }
    case "bounce": {
      const hit = rimPoint(back + between(rng, -0.35, 0.35), RIM.radius, ON_RIM);
      const pop = arcTo(hit, THROUGH, hit.y + between(rng, 0.25, 0.6), [{ kind: "rim", power: 0.85 }]);
      return flight([arcTo(from, hit, apex), pop, throughNet(THROUGH, false)], { v: NET_EXIT(rng), events: [] });
    }
    case "rimOut": {
      const onBack = rng() < 0.5;
      const a = (onBack ? back : front) + between(rng, -0.45, 0.45);
      const hit = rimPoint(a, RIM.radius + 0.02, ON_RIM);
      const out = between(rng, 1.4, 2.8);
      // Off the back iron the ball kicks up and back out toward the shooter; off the front it squirts away.
      const dir = onBack ? front + between(rng, -0.6, 0.6) : a;
      const v = { x: Math.cos(dir) * out, y: between(rng, 1.6, 3.4), z: Math.sin(dir) * out };
      return flight([arcTo(from, hit, apex)], { v, events: [{ kind: "rim", power: 1 }] });
    }
    case "inOut": {
      const a0 = front + between(rng, -0.4, 0.4);
      const sweep = turn * between(rng, Math.PI * 0.7, Math.PI * 1.4);
      const lap: Segment = { type: "orbit", dur: between(rng, 0.45, 0.8), a0, a1: a0 + sweep, r0: RIM.radius, r1: RIM.radius * 1.05, y0: ON_RIM, y1: ON_RIM + 0.01, events: [{ kind: "rim", power: 0.5 }] };
      const end = a0 + sweep;
      const out = between(rng, 1.2, 2);
      const v = { x: Math.cos(end) * out - Math.sin(end) * turn * 0.8, y: between(rng, 1.2, 2.4), z: Math.sin(end) * out + Math.cos(end) * turn * 0.8 };
      return flight([arcTo(from, rimPoint(a0, RIM.radius, ON_RIM), apex), lap], { v, events: [{ kind: "rim", power: 0.7 }] });
    }
    case "boardOut": {
      // Off the glass wide of the rim, on the side the ball was already travelling toward, so it caroms away.
      const side = Math.sign(RIM.x - from.x) || turn;
      const spot = { x: RIM.x + side * between(rng, 0.45, 0.72), y: RIM.y + between(rng, 0.4, 0.75), z: GLASS_Z };
      const arc = arcTo(from, spot, apex);
      const inV = { x: arc.v.x, y: arc.v.y - 9.81 * arc.dur, z: arc.v.z };
      const v = { x: inV.x * 0.7, y: inV.y * 0.4 + 0.6, z: -inV.z * BALL.boardBounce };
      return flight([arc], { v, events: [{ kind: "board", power: 1 }] });
    }
    case "airball": {
      // Short, or wide to the side that points out to the court, never back into the glass.
      const wide = [front + Math.PI * 0.5, front - Math.PI * 0.5].sort((p, q) => Math.sin(q) - Math.sin(p))[0]!;
      const miss = rng() < 0.5 || Math.sin(wide) < 0 ? front : wide;
      const reach = rng() < 0.5 ? between(rng, 0.55, 0.9) : between(rng, 0.5, 0.7);
      const target = rimPoint(miss, reach, RIM.y - 0.35);
      const arc = arcTo(from, target, apex);
      return flight([arc], { v: { x: arc.v.x, y: arc.v.y - 9.81 * arc.dur, z: arc.v.z }, events: [] });
    }
  }
}

/** A shot swatted just out of the hand: a blink toward the rim, then off the way the blocker hit it. */
export function planBlock(rng: Rng, from: V3, blocker: { x: number; z: number }): Flight {
  const tox = RIM.x - from.x;
  const toz = RIM.z - from.z;
  const d = Math.hypot(tox, toz) || 1;
  const hand = { x: from.x + (tox / d) * 0.3, y: from.y + 0.16, z: from.z + (toz / d) * 0.3 };
  const ax = hand.x - blocker.x;
  const az = hand.z - blocker.z;
  const ad = Math.hypot(ax, az) || 1;
  const speed = between(rng, 5, 8);
  const sideways = between(rng, -0.6, 0.6);
  const v = { x: (ax / ad + sideways * (az / ad)) * speed, y: between(rng, 0.8, 2.8), z: (az / ad - sideways * (ax / ad)) * speed };
  return flight([arcTimed(from, hand, 0.07)], { v, events: [{ kind: "block" }] });
}

/** A pass: flat and fast, or lobbed high over a defender in the lane. */
export function planPass(from: V3, to: V3, lob: boolean, speed: number): Flight {
  const d = Math.hypot(to.x - from.x, to.z - from.z);
  if (lob) return flight([arcTo(from, to, Math.max(from.y, to.y) + 0.8 + d * 0.08)]);
  return flight([arcTimed(from, to, Math.max(0.12, d / speed))]);
}
