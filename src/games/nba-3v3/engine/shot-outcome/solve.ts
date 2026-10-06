import { between, type Rng } from "../rng";
import type { Family } from "../shot-calibration";
import { launchFor, type Launch, type ReleaseInput } from "../shot-release";
import { isMakePreset, type ShotPreset } from "./presets";
import { RECIPES, type Recipe } from "./recipes";
import type { RideSpec } from "./rim-ride";
import { presetOf, traceFlight, type TraceDetail } from "./trace";

/**
 * Finds the real flight for a chosen ending. Releases are drawn from the
 * preset's authored aim and flown ahead through the same physics as the
 * live ball until one ends exactly that way; each try costs a couple of
 * milliseconds and most presets land in the first few. If none does, the
 * nearest that still goes in (or still misses) is used, so the make or
 * miss the picker chose always holds.
 */

export interface PresetShot {
  launch: Launch;
  ride: RideSpec | null;
  /** The ending the flight really has: the one asked for, unless no try reached it. */
  preset: ShotPreset;
  detail: TraceDetail;
}

const TRIES = 40;
/** Past this many tries the authored ranges are let out a little, for odd angles. */
const WIDEN_AFTER = 24;

function glassFamily(family: Family): Family {
  if (family === "layup" || family === "reverse" || family === "bank") return "bank";
  if (family === "dunk" || family === "free") return family;
  return "bankJumper";
}

/** A family that never goes off the glass, for the presets that must go straight at the ring. */
function straightFamily(family: Family): Family {
  return family === "bank" ? "layup" : family === "bankJumper" ? "jumper" : family;
}

function drawRelease(rng: Rng, input: ReleaseInput, r: Recipe, lean: number, widen: number): { input: ReleaseInput; long: number; side: number } {
  const span = (lo: number, hi: number) => between(rng, lo - (hi - lo) * (widen - 1) * 0.5, hi + (hi - lo) * (widen - 1) * 0.5);
  let long = span(r.long[0], r.long[1]);
  // Early releases come up short and late ones go long.
  if (r.either && rng() > (1 + lean) / 2) long = -long;
  const side = span(r.side[0], r.side[1]) * (rng() < 0.5 ? -1 : 1);
  const family = r.glass ? glassFamily(input.family) : straightFamily(input.family);
  const tilt = r.tilt ? between(rng, -r.tilt, r.tilt) : 0;
  const thrown = { ...input, family, apex: input.apex + (r.apex ?? 0), spinRate: input.spinRate * (r.spin ?? 1), sideSpin: tilt };
  return { input: thrown, long, side };
}

function rideFor(rng: Rng, r: Recipe): RideSpec | null {
  return r.ride ? { laps: between(rng, r.ride.laps[0], r.ride.laps[1]), drop: r.ride.drop } : null;
}

/**
 * The launch that ends as `want`. `lean` runs from -1 for an early
 * release (short) to 1 for a late one (long), for the endings that can
 * miss either way.
 */
export function solvePreset(rng: Rng, input: ReleaseInput, want: ShotPreset, lean = 0): PresetShot {
  const r = RECIPES[want];
  const make = isMakePreset(want);
  let backup: PresetShot | null = null;
  for (let i = 0; i < TRIES; i++) {
    const draw = drawRelease(rng, input, r, lean, i < WIDEN_AFTER ? 1 : 1.6);
    const launch = launchFor(draw.input, draw.long, draw.side);
    const ride = rideFor(rng, r);
    const detail = traceFlight({ pos: { ...input.from }, vel: launch.vel, w: launch.spin }, ride);
    const got = presetOf(detail);
    const shot = { launch, ride, preset: got, detail };
    if (got === want) return shot;
    if (!backup && detail.made === make) backup = shot;
  }
  if (backup) return backup;
  // Nothing even went the right way: a clean aim for a make, a long miss for a miss.
  const launch = launchFor({ ...input, family: straightFamily(input.family) }, make ? 0 : 0.6, 0);
  const detail = traceFlight({ pos: { ...input.from }, vel: launch.vel, w: launch.spin }, null);
  return { launch, ride: null, preset: presetOf(detail), detail };
}
