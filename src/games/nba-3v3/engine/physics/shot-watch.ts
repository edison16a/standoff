import type { Outcome } from "../shot-model";
import { RIM, STEP } from "../tuning";
import { copyBody, type BallBody } from "./air";
import { stepBall, type Contact } from "./world";

/**
 * Follows a shot through the physics and says how it went: what it
 * touched first, how long it rode the iron, whether it dropped, and
 * when it is over. The same watcher reads the live ball and a shot
 * flown ahead in a test, so both name every shot the same way.
 */

export interface ShotTrack {
  /** Seconds since the ball left the hand. */
  t: number;
  first: "rim" | "board" | null;
  rimTouches: number;
  rimFirst: number;
  rimLast: number;
  made: boolean;
}

/** Two touches of the iron closer than this are one contact, the ball riding on it. */
const RIM_GAP = 0.08;
/** Riding the iron this long, or touching it this often, is a roll round it. */
const ROLL_TIME = 0.28;
const ROLL_TOUCHES = 3;
/** Past this a shot that never dropped is over: stuck, or a long roll that never fell. */
const MAX_T = 4;

export function freshTrack(): ShotTrack {
  return { t: 0, first: null, rimTouches: 0, rimFirst: -1, rimLast: -1, made: false };
}

/** Reads one step's contacts. Returns "rim" or "board" for a fresh touch worth a sound, "through" on the make, else null. */
export function noteContacts(track: ShotTrack, contacts: readonly Contact[]): "through" | null {
  let result: "through" | null = null;
  for (const c of contacts) {
    if (c.kind === "rim" && c.power > 0.1) {
      track.first ??= "rim";
      if (track.rimFirst < 0) track.rimFirst = track.t;
      if (track.t - track.rimLast > RIM_GAP) track.rimTouches++;
      track.rimLast = track.t;
    } else if (c.kind === "board" && c.power > 0.1) {
      track.first ??= "board";
    } else if (c.kind === "through" && !track.made) {
      track.made = true;
      result = "through";
    }
  }
  return result;
}

const riding = (t: ShotTrack) => t.rimTouches >= ROLL_TOUCHES || (t.rimFirst >= 0 && t.rimLast - t.rimFirst > ROLL_TIME);

/** Names a shot the way the shot model does. */
export function classify(t: ShotTrack): Outcome {
  if (t.made) return t.first === null ? "swish" : t.first === "board" ? "bank" : riding(t) ? "roll" : "bounce";
  if (t.first === null) return "airball";
  if (t.rimTouches === 0) return "boardOut";
  return riding(t) ? "inOut" : "rimOut";
}

/** True once a shot is a miss for sure: fallen past the ring outside it, bounced well clear, or stuck too long. */
export function missed(t: ShotTrack, b: BallBody): boolean {
  if (t.made) return false;
  if (t.t > MAX_T) return true;
  const hx = b.pos.x - RIM.x;
  const hz = b.pos.z - RIM.z;
  const hl = Math.sqrt(hx * hx + hz * hz);
  if (b.vel.y < 0 && b.pos.y < RIM.y - 0.3 && hl > RIM.radius + 0.05) return true;
  // Off the iron or the glass and on its way out: a rebound, there for anyone.
  const away = (b.vel.x * hx + b.vel.z * hz) / Math.max(1e-6, hl);
  return t.first !== null && hl > 0.75 && away > 0;
}

export interface Traced {
  made: boolean;
  outcome: Outcome;
  /** Seconds until it was decided. */
  t: number;
}

/** Flies a shot to its end with nobody near it, frame by frame exactly as the match steps a live ball. */
export function traceShot(start: BallBody, maxT = MAX_T + 0.1): Traced {
  const b = copyBody(start);
  const track = freshTrack();
  const contacts: Contact[] = [];
  while (track.t < maxT) {
    contacts.length = 0;
    stepBall(b, STEP, contacts);
    track.t += STEP;
    noteContacts(track, contacts);
    if (track.made || missed(track, b)) break;
  }
  return { made: track.made, outcome: classify(track), t: track.t };
}
