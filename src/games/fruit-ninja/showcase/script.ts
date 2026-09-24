import type { BladeId } from "../blades";
import type { Launch } from "../engine/arena";
import type { Seat } from "../engine/events";
import { KINDS, type BodyKind } from "../engine/fruit-kinds";
import type { Vec2 } from "../engine/geometry";
import { GRAVITY, HALF_HEIGHT } from "../engine/tuning";

/**
 * A film for the showcase, written like a dance: what is thrown and when,
 * and where each computer player's blade is at each moment. It repeats
 * every `period` seconds, so the loop the capture tool films joins up.
 */
export interface Script {
  period: number;
  throws: readonly Throw[];
  bots: readonly Bot[];
}

/** One fruit or bomb, thrown so it peaks at `apex`, like the spawner's throws. */
export interface Throw {
  id: string;
  /** Seconds into the period. */
  t: number;
  kind: BodyKind;
  /** Where it leaves the bottom edge. */
  from: number;
  apex: Vec2;
}

/** A spot for a blade: a fixed point, or a point on a thrown fruit wherever it is then. */
export type Mark = Vec2 | { fruit: string; dx?: number; dy?: number };

export interface Waypoint {
  t: number;
  at: Mark;
}

/**
 * One thing a hand does: a slash, which runs fast through its waypoints
 * and may cut, or a rest at one spot. Between moves the hand glides.
 */
export interface Move {
  points: readonly Waypoint[];
  cuts: boolean;
}

export interface Bot {
  seat: Seat;
  name: string;
  blade: BladeId;
  /** What the hand does over the period, in time order. */
  moves: readonly Move[];
}

/** The throw that peaks at the apex, worked out as the spawner does. */
export function launchOf(spec: Throw): Launch {
  const y = -HALF_HEIGHT - KINDS[spec.kind].radius - 0.3;
  const vy = Math.sqrt(2 * GRAVITY * (spec.apex.y - y));
  const toApex = vy / GRAVITY;
  // A tumble made up from the throw's name, so it is the same in every film.
  const seed = [...spec.id].reduce((sum, c) => (sum * 31 + c.charCodeAt(0)) % 1000, 7);
  const spin = { x: 1 + (seed % 7) * 0.35, y: -1.4 + (seed % 5) * 0.6, z: 0.9 - (seed % 3) * 0.8 };
  return { kind: spec.kind, x: spec.from, y, vx: (spec.apex.x - spec.from) / toApex, vy, spin };
}

/** Where an untouched throw is `tau` seconds after it leaves. */
export function flight(launch: Launch, tau: number): Vec2 {
  return { x: launch.x + launch.vx * tau, y: launch.y + launch.vy * tau - 0.5 * GRAVITY * tau * tau };
}

/**
 * A slash through one fruit: in from one side, through its middle at
 * time `t`, and out the other side. `angle` is the slash's direction in
 * degrees, 0 to the right and 90 up.
 */
export function slash(t: number, fruit: string, angle: number, reach = 1.7, time = 0.09): Move {
  const dx = Math.cos((angle * Math.PI) / 180) * reach;
  const dy = Math.sin((angle * Math.PI) / 180) * reach;
  const points = [
    { t: t - time, at: { fruit, dx: -dx, dy: -dy } },
    { t, at: { fruit } },
    { t: t + time, at: { fruit, dx, dy } },
  ];
  return { points, cuts: true };
}

/**
 * One long slash through several fruit in turn, for a combo. Each stop is
 * a fruit and when the blade meets it. `angle` is the way in and out.
 */
export function sweep(stops: readonly { t: number; fruit: string }[], angle: number, lead = 1.6, time = 0.08): Move {
  const dx = Math.cos((angle * Math.PI) / 180) * lead;
  const dy = Math.sin((angle * Math.PI) / 180) * lead;
  const first = stops[0]!;
  const last = stops[stops.length - 1]!;
  const points = [
    { t: first.t - time, at: { fruit: first.fruit, dx: -dx, dy: -dy } },
    ...stops.map((stop) => ({ t: stop.t, at: { fruit: stop.fruit } })),
    { t: last.t + time, at: { fruit: last.fruit, dx, dy } },
  ];
  return { points, cuts: true };
}

/** A pause at one spot between slashes. */
export function rest(t: number, x: number, y: number): Move {
  return { points: [{ t, at: { x, y } }], cuts: false };
}

