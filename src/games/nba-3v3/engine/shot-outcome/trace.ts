import { copyBody, type BallBody } from "../physics/air";
import { classify, freshTrack, missed, noteContacts } from "../physics/shot-watch";
import type { Contact } from "../physics/world";
import type { Outcome } from "../shot-model";
import { RIM, STEP } from "../tuning";
import { newFlight, stepShotFlight } from "./flight";
import type { ShotPreset } from "./presets";
import type { RideSpec } from "./rim-ride";

/**
 * Flies a planned shot ahead, frame by frame exactly as the live ball,
 * and reads it closely enough to name the preset it really became:
 * where on the ring it first hit (front or back, along the line of the
 * shot), how often it hit, whether it rode round, and for a miss how
 * far from the rim the rebound first lands.
 */

export interface TraceDetail {
  made: boolean;
  outcome: Outcome;
  first: "rim" | "board" | null;
  /** Where along the shot the ring was first hit, metres from its middle: negative is the front. */
  firstAt: number;
  rimTouches: number;
  rode: boolean;
  /** For a miss, how far from the rim the rebound first lands. */
  landing: number;
  /** Seconds until the shot was decided. */
  t: number;
}

/** A rebound that first lands this far from the rim is a long one. */
export const LONG_BOARD = 2.6;
const MAX_T = 4.1;

export function traceFlight(start: BallBody, ride: RideSpec | null): TraceDetail {
  const b = copyBody(start);
  const f = newFlight(ride);
  const track = freshTrack();
  const contacts: Contact[] = [];
  // The line of the shot along the floor, to tell the front of the ring from the back.
  const lx = RIM.x - b.pos.x;
  const lz = RIM.z - b.pos.z;
  const ll = Math.hypot(lx, lz) || 1;
  let firstAt = 0;
  while (track.t < MAX_T) {
    contacts.length = 0;
    stepShotFlight(b, f, STEP, contacts);
    track.t += STEP;
    const hadRim = track.rimFirst >= 0;
    noteContacts(track, contacts);
    if (!hadRim && track.rimFirst >= 0) {
      const c = contacts.find((k) => k.kind === "rim" && k.power > 0.1)!;
      firstAt = ((c.at.x - RIM.x) * lx + (c.at.z - RIM.z) * lz) / ll;
    }
    if (track.made || (!f.riding && missed(track, b))) break;
  }
  const t = track.t;
  return { made: track.made, outcome: classify(track), first: track.first, firstAt, rimTouches: track.rimTouches, rode: f.rode && !!ride, landing: track.made ? 0 : landing(b), t };
}

/** Flies a missed ball on until it first meets the floor, and says how far from the rim that is. */
function landing(b: BallBody): number {
  const contacts: Contact[] = [];
  const f = newFlight(null);
  for (let t = 0; t < 3; t += STEP) {
    contacts.length = 0;
    stepShotFlight(b, f, STEP, contacts);
    const floor = contacts.find((c) => c.kind === "floor");
    if (floor) return Math.hypot(floor.at.x - RIM.x, floor.at.z - RIM.z);
  }
  return Math.hypot(b.pos.x - RIM.x, b.pos.z - RIM.z);
}

/** Names the preset a traced flight really was. */
export function presetOf(d: TraceDetail): ShotPreset {
  if (d.made) {
    if (d.rode) return "rollIn";
    if (d.first === null) return "swish";
    if (d.first === "board") return "bank";
    if (d.rimTouches >= 3) return "rattleIn";
    return d.firstAt < 0 ? "frontRimIn" : "backRimIn";
  }
  if (d.rode) return "rollOut";
  if (d.first === null) return "airball";
  if (d.rimTouches === 0) return "glassOut";
  return d.firstAt > 0 && d.landing > LONG_BOARD ? "backIron" : "rimOut";
}
