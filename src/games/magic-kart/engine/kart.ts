import { CHARACTERS, type CharacterId, type KartStats } from "../characters";
import type { ItemKind } from "./items";
import type { Located, Track } from "./track";

/** What a driver asks for this step. Steer is -1 (full left) to 1 (full right). */
export interface KartInput {
  steer: number;
  throttle: boolean;
  brake: boolean;
}

export const NO_INPUT: KartInput = { steer: 0, throttle: false, brake: false };

export type Surface = "road" | "kerb" | "offroad";

export interface KartTimers {
  stun: number;
  ice: number;
  boost: number;
  ghost: number;
  shield: number;
  /** Protection after a respawn, and the blink that shows it. */
  grace: number;
}

/** Lap bookkeeping, owned by race.ts. */
export interface KartRace {
  /** Checkpoints passed since the start, across laps. */
  checkpoints: number;
  /** Distance along the lap of the last checkpoint passed. */
  lastCheckpointS: number;
  /** How far past that checkpoint the kart was last step, negative behind it. */
  since: number;
  /** Ranking distance: checkpoints times their spacing, plus the way since the last. */
  progress: number;
  finished: boolean;
  finishTime: number | null;
  place: number;
  wrongWay: boolean;
  wrongWayTime: number;
  stuckTime: number;
  /** Progress when the kart last got anywhere, for spotting a kart that is stuck. */
  stallFrom: number;
  /** Last spot the kart was safely on the road, for respawns. */
  safeS: number;
  safeD: number;
}

export interface Kart {
  /** Grid slot, from 0. */
  id: number;
  character: CharacterId;
  stats: KartStats;
  /** The player's seat, or null for a computer kart. */
  seat: number | null;
  /** The computer is driving: a computer kart, or a player whose phone dropped. */
  autopilot: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  vy: number;
  /** Radians. Forward is (sin, cos) on x and z. */
  heading: number;
  airborne: boolean;
  airTime: number;
  loc: Located;
  surface: Surface;
  /** Steering as applied, smoothed, for the wheels and the camera. */
  steer: number;
  throttle: boolean;
  /** Seconds Brake has been held, since it bites harder the longer it is. */
  brakeHeld: number;
  /** Seconds of Drive held flat out, and the extra top speed built from it, 0 to 1. */
  flatOut: number;
  surge: number;
  /** Drift direction, 1 right, -1 left, 0 none, and how long it has been held. */
  drift: number;
  driftTime: number;
  timers: KartTimers;
  /** Spin out angle for the stun animation. */
  spin: number;
  item: ItemKind | null;
  /** Race time when the roulette stops and the item can be used. */
  itemReadyAt: number;
  /** A computer kart's top speed nudge, to keep a solo race close. */
  speedBias: number;
  race: KartRace;
}

export function createKart(id: number, character: CharacterId, seat: number | null, track: Track, s: number, d: number): Kart {
  const p = track.pointAt(s, d);
  const f = track.frameAt(s);
  const loc = track.locate(p.x, p.z, -1);
  return {
    id,
    character,
    stats: CHARACTERS[character].stats,
    seat,
    autopilot: seat === null,
    x: p.x,
    y: p.y,
    z: p.z,
    vx: 0,
    vz: 0,
    vy: 0,
    heading: Math.atan2(f.tx, f.tz),
    airborne: false,
    airTime: 0,
    loc,
    surface: "road",
    steer: 0,
    throttle: false,
    brakeHeld: 0,
    flatOut: 0,
    surge: 0,
    drift: 0,
    driftTime: 0,
    timers: { stun: 0, ice: 0, boost: 0, ghost: 0, shield: 0, grace: 0 },
    spin: 0,
    item: null,
    itemReadyAt: 0,
    speedBias: 1,
    race: {
      checkpoints: 0,
      lastCheckpointS: 0,
      since: track.forward(0, loc.s),
      progress: track.forward(0, loc.s),
      finished: false,
      finishTime: null,
      place: id + 1,
      wrongWay: false,
      wrongWayTime: 0,
      stuckTime: 0,
      stallFrom: -Infinity,
      safeS: loc.s,
      safeD: loc.d,
    },
  };
}

/** Speed along the kart's nose, negative when reversing. */
export function forwardSpeed(kart: Kart): number {
  return kart.vx * Math.sin(kart.heading) + kart.vz * Math.cos(kart.heading);
}

export function speedOf(kart: Kart): number {
  return Math.hypot(kart.vx, kart.vz);
}
