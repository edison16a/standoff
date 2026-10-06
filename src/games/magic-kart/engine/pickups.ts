import type { Emit } from "./events";
import { roomFor, stow } from "./item-queue";
import { rollItem } from "./items";
import type { Kart } from "./kart";
import type { Track } from "./track";
import { EFFECTS, RACE } from "./tuning";

/** A power up box over the road: a single cube, or a double box of two stacked. */
export interface Cube {
  s: number;
  d: number;
  x: number;
  y: number;
  z: number;
  /** Power ups inside: 1 for a single cube, 2 for a double box. */
  count: 1 | 2;
  /** Race time it comes back, or 0 while it is there to take. */
  respawnAt: number;
}

export interface BoostPad {
  s: number;
  d: number;
}

const CUBE_HEIGHT = 1.1;
const CUBE_REACH = 2;
/** Metres between the middles of a double box's two cubes. `y` is the lower one. */
export const STACK_GAP = 1.45;
/** How far above or below a cube a kart's middle can pass and still touch it. */
const CUBE_TOUCH = 2.2;
/** Offsets across the road for a row, as a share of the half width. */
const ROW = [-0.66, -0.22, 0.22, 0.66];
/** A sky row is a pair, wide apart, so a glider has to pick a side and steer for it. */
const SKY_ROW = [-0.45, 0.45];
export const PAD_LENGTH = 5;
export const PAD_WIDTH = 3.6;

export function buildCubes(track: Track): Cube[] {
  const row = (at: number, shares: readonly number[], height: number, doubles: readonly number[]) =>
    shares.map((share, place): Cube => {
      const s = track.wrap(at * track.length);
      const d = share * track.halfWidth;
      const p = track.pointAt(s, d);
      return { s, d, x: p.x, y: p.y + height, z: p.z, count: doubles.includes(place) ? 2 : 1, respawnAt: 0 };
    });
  const { cubeRows, doubles, skyRows = [] } = track.def;
  const ground = cubeRows.flatMap((at, i) => row(at, ROW, CUBE_HEIGHT, doubles.filter((b) => b.row === i).map((b) => b.place)));
  const sky = skyRows.flatMap((r) => row(r.at, SKY_ROW, r.height, r.double === undefined ? [] : [r.double]));
  return [...ground, ...sky];
}

export function buildPads(track: Track): BoostPad[] {
  return track.def.boostPads.map((pad) => ({ s: track.wrap(pad.at * track.length), d: pad.offset }));
}

/** The kart is inside the box: near it across the ground, and level with one of its cubes. */
function touches(kart: Kart, cube: Cube): boolean {
  if (Math.hypot(kart.x - cube.x, kart.z - cube.z) > CUBE_REACH) return false;
  const middle = kart.y + 0.6;
  const top = cube.y + (cube.count - 1) * STACK_GAP;
  return middle > cube.y - CUBE_TOUCH && middle < top + CUBE_TOUCH;
}

/**
 * Drives through boxes. A single cube gives one power up and a double
 * box two, each rolled on its own, as many as the kart has room for. A
 * kart with both hands full passes straight through and leaves the box
 * for someone else, so one kart can never sweep a whole row.
 */
export function collectCubes(cubes: Cube[], karts: readonly Kart[], time: number, random: () => number, emit: Emit): void {
  const last = Math.max(1, karts.length - 1);
  cubes.forEach((cube, index) => {
    if (cube.respawnAt > 0) {
      if (time >= cube.respawnAt) cube.respawnAt = 0;
      return;
    }
    for (const kart of karts) {
      const room = roomFor(kart);
      if (room === 0 || kart.race.finished || !touches(kart, cube)) continue;
      cube.respawnAt = time + RACE.cubeRespawn;
      const place = (kart.race.place - 1) / last;
      const rolled = Array.from({ length: Math.min(cube.count, room) }, () => rollItem(place, random()));
      stow(kart, rolled, time);
      emit({ type: "pickup", kart: kart.id, items: rolled, cube: index });
      return;
    }
  });
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
