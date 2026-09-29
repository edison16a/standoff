import { flight, type Flight, type FlightEvent, type Segment } from "./flight";
import { stepLoose, type Contact } from "./loose-ball";
import type { Outcome } from "./shot-model";
import { BALL, NET, RIM, STEP } from "./tuning";
import type { V3 } from "./vec";

/**
 * Flies a shot on the real ball physics ahead of time, from the hand
 * until it is through the net or clear of the iron, and records it as a
 * flight. The shot is then played back exactly, so the host knows how
 * it ends the moment it leaves the hand, and every contact with the
 * rim or the glass lands where the physics put it, with its sound.
 */

export interface Trace {
  flight: Flight;
  made: boolean;
  /** What the physics did, named the way the shot model names outcomes. */
  outcome: Outcome;
}

/** Past this the ball is stuck on the ring or lodged somewhere, and the path is thrown away. */
const MAX_T = 3.6;
/** Two touches of the iron closer than this are one contact, the ball riding on it. */
const RIM_GAP = 0.08;
/** Riding the rim this long, or touching it this often, is a roll round it. */
const ROLL_TIME = 0.28;
const ROLL_TOUCHES = 3;

interface Cut {
  at: number;
  events: FlightEvent[];
  spin: V3;
}

/** `want` false gives up the moment the ball drops in, as an aim for a miss that makes it is no use. */
export function traceShot(from: V3, vel: V3, spin: V3, want?: boolean): Trace | null {
  const body = { pos: { ...from }, vel: { ...vel }, w: { ...spin } };
  const pts: number[] = [from.x, from.y, from.z];
  const cuts: Cut[] = [{ at: 0, events: [], spin: { ...spin } }];
  const contacts: Contact[] = [];
  let made = false;
  let rose = false;
  let first: "rim" | "board" | null = null;
  let lastRim = -1;
  let firstRim = -1;
  let rimTouches = 0;
  for (let k = 1; k * STEP <= MAX_T; k++) {
    const t = k * STEP;
    contacts.length = 0;
    stepLoose(body, STEP, contacts);
    const { pos } = body;
    pts.push(pos.x, pos.y, pos.z);
    rose ||= pos.y > RIM.y;
    const events: FlightEvent[] = [];
    for (const c of contacts) {
      if (c.kind === "rim") {
        first ??= "rim";
        if (firstRim < 0) firstRim = t;
        if (t - lastRim > RIM_GAP) {
          rimTouches++;
          events.push({ kind: "rim", power: Math.min(1, c.power / 4) });
        }
        lastRim = t;
      } else if (c.kind === "board") {
        first ??= "board";
        events.push({ kind: "board", power: Math.min(1, c.power / 5) });
      } else if (c.kind === "through" && !made) {
        if (want === false) return null;
        made = true;
        events.push({ kind: "net", swish: first === null }, { kind: "score" });
      }
    }
    if (events.length) cuts.push({ at: k, events, spin: { ...body.w } });
    const below = pos.y < RIM.y - (made ? NET.depth + 0.05 : 0.3);
    const clear = made || Math.hypot(pos.x - RIM.x, pos.z - RIM.z) > RIM.radius + BALL.radius + 0.05;
    if (rose && below && clear && body.vel.y < 0) {
      const riding = rimTouches >= ROLL_TOUCHES || (firstRim >= 0 && lastRim - firstRim > ROLL_TIME);
      return { flight: toFlight(pts, cuts, body.vel, body.w), made, outcome: classify(made, first, rimTouches > 0, riding) };
    }
  }
  return null;
}

function classify(made: boolean, first: "rim" | "board" | null, rim: boolean, riding: boolean): Outcome {
  if (made) return first === null ? "swish" : first === "board" ? "bank" : riding ? "roll" : "bounce";
  if (first === null) return "airball";
  if (!rim || first === "board") return "boardOut";
  return riding ? "inOut" : "rimOut";
}

/** Splits the samples at every contact, so each contact's sound and effect fires as its piece begins. */
function toFlight(pts: number[], cuts: Cut[], vel: V3, spin: V3): Flight {
  const last = pts.length / 3 - 1;
  const segments: Segment[] = [];
  cuts.forEach((cut, i) => {
    const end = i + 1 < cuts.length ? cuts[i + 1]!.at : last;
    if (end <= cut.at && i > 0) {
      // A contact on the very last sample: its events ride on a zero length piece.
      segments.push({ type: "track", dur: 0, step: STEP, pts: pts.slice(cut.at * 3, cut.at * 3 + 6), spin: cut.spin, events: cut.events });
      return;
    }
    segments.push({ type: "track", dur: (end - cut.at) * STEP, step: STEP, pts: pts.slice(cut.at * 3, end * 3 + 3), spin: cut.spin, events: cut.events });
  });
  return flight(segments, { v: { ...vel }, spin: { ...spin }, events: [] });
}
