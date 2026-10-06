import type { Match } from "./match";
import type { Athlete, TeamId } from "./types";
import type { V2 } from "./vec";

/**
 * The trophy ceremony after the replay. The picture cuts to the winners
 * together at centre court: the captain with the trophy at his chest,
 * his teammates either side. He kisses it, dips and drives it up over
 * his head, the others crowd in and jump, and the box scores follow.
 * Times are seconds from the cut.
 */
export const CEREMONY = {
  /** The captain starts the lift, and has it right up. */
  raise: 2.3,
  up: 3.3,
  /** The box scores come up over the scene. */
  stats: 12.5,
} as const;

/** The captain stands on the centre circle, just inside the half court line, facing the main camera. */
export const CEREMONY_SPOT: V2 = { x: 0, z: 10.3 };
/** Facing the camera: 0 looks down the court toward it. */
export const CEREMONY_YAW = 0;

/** Where teammates stand, in order, before the lift: a shallow arc either side, a little back, so every face shows. */
const AROUND: readonly V2[] = [
  { x: -1.3, z: -0.35 },
  { x: 1.3, z: -0.35 },
  { x: -2.4, z: -0.9 },
  { x: 2.4, z: -0.9 },
  { x: 0, z: -1.5 },
];
/** And once the trophy is up: shoulder to shoulder with him. */
const CROWDED: readonly V2[] = [
  { x: -0.85, z: -0.25 },
  { x: 0.85, z: -0.25 },
  { x: -1.65, z: -0.6 },
  { x: 1.65, z: -0.6 },
  { x: 0, z: -1.1 },
];
/** The beaten side, back down the court toward the key, heads down. */
const LOSERS: readonly V2[] = [
  { x: -3.6, z: 5.6 },
  { x: 3.9, z: 5.0 },
  { x: -0.4, z: 4.2 },
  { x: 5.6, z: 3.4 },
  { x: -5.4, z: 3.8 },
  { x: 1.8, z: 3.0 },
];

/** How fast teammates walk in to crowd him, metres a second. */
const WALK = 1.3;

/**
 * Who lifts the trophy: the winners' top scorer, a person before a
 * computer player on a tie, then the lowest slot.
 */
export function captainOf(athletes: readonly Athlete[], team: TeamId): Athlete | null {
  const rank = (a: Athlete) => a.box.points * 100 + (a.seat !== null ? 10 : 0) - a.slot;
  return athletes.filter((a) => a.team === team).reduce<Athlete | null>((best, a) => (!best || rank(a) > rank(best) ? a : best), null);
}

/** A teammate's spot, `crowded` in close once the trophy is up or not. */
export function mateSpot(index: number, crowded: boolean): V2 {
  const at = (crowded ? CROWDED : AROUND)[Math.min(index, AROUND.length - 1)]!;
  return { x: CEREMONY_SPOT.x + at.x, z: CEREMONY_SPOT.z + at.z };
}

/** How high a teammate is off the floor, jumping for joy once the trophy is up; each in their own time. */
export function hopHeight(t: number, phase: number): number {
  const since = t - CEREMONY.up - 0.1 - 0.12 * Math.abs(Math.sin(phase * 2.3));
  if (since <= 0) return 0;
  // Each hop lasts 0.55 s with a short stand between; the first few are the biggest.
  const cycle = since % 0.75;
  const size = 0.3 * Math.max(0.45, 1 - since * 0.05);
  return cycle < 0.55 ? size * Math.sin((Math.PI * cycle) / 0.55) : 0;
}

/**
 * The ceremony for one finished game. `stage` cuts everyone into place at
 * once, as a broadcast cuts from the floor to the presentation, and
 * `step` walks the teammates in and bounces them once the trophy is up.
 */
export class Ceremony {
  t = 0;
  readonly team: TeamId;
  readonly captain: number | null;
  readonly mates: readonly number[];
  readonly losers: readonly number[];

  constructor(m: Match) {
    this.team = m.winner ?? 0;
    const captain = captainOf(m.athletes, this.team);
    this.captain = captain?.id ?? null;
    this.mates = m.athletes.filter((a) => a.team === this.team && a !== captain).map((a) => a.id);
    this.losers = m.athletes.filter((a) => a.team !== this.team).map((a) => a.id);
  }

  /** Where each player is at the cut, and the ball put away. */
  stage(m: Match): void {
    if (this.captain !== null) place(m.athletes[this.captain]!, CEREMONY_SPOT, CEREMONY_YAW);
    this.mates.forEach((id, i) => place(m.athletes[id]!, mateSpot(i, false), CEREMONY_YAW));
    // The losers turn away toward the far basket.
    this.losers.forEach((id, i) => place(m.athletes[id]!, LOSERS[i % LOSERS.length]!, Math.PI + (i % 2 ? 0.5 : -0.4)));
    const b = m.ball;
    b.holder = null;
    b.mode = "loose";
    b.aim = null;
    b.flightKind = null;
    b.shot = null;
    b.pos = { x: -6.8, y: 0.12, z: 11.5 };
    b.vel = { x: 0, y: 0, z: 0 };
  }

  /** One step: the teammates walk in close after the lift and jump; everyone else holds still. */
  step(m: Match, dt: number): void {
    this.t += dt;
    const crowded = this.t >= CEREMONY.up;
    this.mates.forEach((id, i) => {
      const a = m.athletes[id]!;
      const to = mateSpot(i, crowded);
      const dx = to.x - a.x;
      const dz = to.z - a.z;
      const d = Math.hypot(dx, dz);
      const speed = d > 0.03 ? Math.min(WALK, d * 3) : 0;
      a.vx = d > 0 ? (dx / d) * speed : 0;
      a.vz = d > 0 ? (dz / d) * speed : 0;
      a.x += a.vx * dt;
      a.z += a.vz * dt;
      a.yaw = CEREMONY_YAW;
      a.y = hopHeight(this.t, i + 1);
    });
  }

  /** The stage of the ceremony for the overlay. */
  get stageName(): "cup" | "raised" | "stats" {
    return this.t >= CEREMONY.stats ? "stats" : this.t >= CEREMONY.up ? "raised" : "cup";
  }
}

function place(a: Athlete, at: V2, yaw: number): void {
  a.x = at.x;
  a.z = at.z;
  a.vx = 0;
  a.vz = 0;
  a.y = 0;
  a.yaw = yaw;
  a.action = { kind: "none" };
  a.move = { x: 0, z: 0 };
  a.guard = false;
  a.cheer = null;
}
