import type { Emit } from "./events";
import { rollItem } from "./items";
import type { Kart } from "./kart";
import type { Track } from "./track";
import { EFFECTS, RACE } from "./tuning";

export interface Cube {
  s: number;
  d: number;
  x: number;
  y: number;
  z: number;
  /** Race time it comes back, or 0 while it is there to take. */
  respawnAt: number;
}

export interface BoostPad {
  s: number;
  d: number;
}

const CUBE_HEIGHT = 1.1;
const CUBE_REACH = 2;
/** Offsets across the road for a row, as a share of the half width. */
const ROW = [-0.66, -0.22, 0.22, 0.66];
export const PAD_LENGTH = 5;
export const PAD_WIDTH = 3.6;

export function buildCubes(track: Track): Cube[] {
  return track.def.cubeRows.flatMap((at) =>
    ROW.map((share) => {
      const s = track.wrap(at * track.length);
      const d = share * track.halfWidth;
      const p = track.pointAt(s, d);
      return { s, d, x: p.x, y: p.y + CUBE_HEIGHT, z: p.z, respawnAt: 0 };
    }),
  );
}

export function buildPads(track: Track): BoostPad[] {
  return track.def.boostPads.map((pad) => ({ s: track.wrap(pad.at * track.length), d: pad.offset }));
}

/**
 * Drives through cubes. A kart already holding an item passes straight
 * through and leaves the cube for someone else, so one kart can never
 * sweep a whole row.
 */
export function collectCubes(cubes: Cube[], karts: readonly Kart[], time: number, random: () => number, emit: Emit): void {
  const last = Math.max(1, karts.length - 1);
  for (const cube of cubes) {
    if (cube.respawnAt > 0) {
      if (time >= cube.respawnAt) cube.respawnAt = 0;
      continue;
    }
    for (const kart of karts) {
      if (kart.item || kart.race.finished) continue;
      if (Math.hypot(kart.x - cube.x, kart.z - cube.z) > CUBE_REACH || Math.abs(kart.y + 0.6 - cube.y) > 2.2) continue;
      cube.respawnAt = time + RACE.cubeRespawn;
      kart.item = rollItem((kart.race.place - 1) / last, random());
      kart.itemReadyAt = time + EFFECTS.roulette;
      emit({ type: "pickup", kart: kart.id, item: kart.item });
      break;
    }
  }
}

/** A boost pad under the wheels tops the boost up. */
export function rideBoostPads(pads: readonly BoostPad[], kart: Kart, track: Track, emit: Emit): void {
  if (kart.airborne) return;
  for (const pad of pads) {
    const along = track.forward(pad.s, kart.loc.s);
    if (along < -PAD_LENGTH / 2 || along > PAD_LENGTH / 2 || Math.abs(kart.loc.d - pad.d) > PAD_WIDTH / 2 + 0.6) continue;
    if (kart.timers.boost < EFFECTS.pad - 0.25) emit({ type: "boost", kart: kart.id, source: "pad" });
    kart.timers.boost = Math.max(kart.timers.boost, EFFECTS.pad);
  }
}
