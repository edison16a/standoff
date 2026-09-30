/**
 * The trailer's chase as pure functions of story time, in seconds: the
 * pickup racing up the first street with the team in the back, the pack
 * of runners on its tail, more bursting out of doorways as it passes,
 * who shoots when and who falls. Nothing here keeps state, so any shot
 * can start anywhere in the story and the clip replays exactly.
 *
 * World axes follow the route: the truck drives north, along -z, on the
 * road's middle. Distances are route metres.
 */

export const SPEED = 7;
const START = 14;
/** Where the tailgate is, behind the truck's middle. */
export const REAR = 2.7;

/** Route metres the truck has covered. */
export function truckAt(s: number): number {
  return START + SPEED * s;
}

export interface ChaserSpec {
  id: number;
  seed: number;
  /** Metres off the road's middle while chasing, right positive. */
  lane: number;
  /** Metres behind the tailgate while chasing. */
  gap: number;
  /** Bursts out of a doorway at this story time and world spot, then joins the pack. */
  burst?: { at: number; x: number; distance: number };
  /** Shot dead at this story time. */
  dies?: number;
  /** Leaps at the tailgate at this story time. It dies in the air. */
  leap?: number;
}

/** Seconds a burst takes to reach its place in the pack, and a leap to reach the truck. */
const JOIN = 1.6;
const LEAP = 0.7;
export const LEAP_HIT = 0.36;

export const CHASERS: readonly ChaserSpec[] = [
  { id: 1, seed: 0.21, lane: -1.2, gap: 3.2, dies: 2.3 },
  { id: 2, seed: 0.47, lane: 0.9, gap: 4.2 },
  { id: 3, seed: 0.73, lane: -0.2, gap: 5.4, leap: 6.0 },
  { id: 4, seed: 0.33, lane: 2.1, gap: 6.8, dies: 4.1 },
  { id: 5, seed: 0.59, lane: -2.3, gap: 7.8 },
  { id: 6, seed: 0.88, lane: 0.4, gap: 9.6 },
  { id: 7, seed: 0.12, lane: -1.4, gap: 11.5, dies: 7.3 },
  { id: 8, seed: 0.64, lane: 1.6, gap: 13 },
  { id: 9, seed: 0.95, lane: -0.6, gap: 15 },
  // Out of the doorways on the right just after the truck goes by, then two more on the left.
  { id: 10, seed: 0.41, lane: 2.3, gap: 3.6, burst: { at: 4.3, x: 7.6, distance: 40 } },
  { id: 11, seed: 0.07, lane: 1.2, gap: 5.6, burst: { at: 4.42, x: 8.2, distance: 41.2 }, dies: 5.6 },
  { id: 12, seed: 0.52, lane: 0.2, gap: 7.2, burst: { at: 4.55, x: 7.4, distance: 42.2 } },
  { id: 13, seed: 0.81, lane: -2.2, gap: 4.8, burst: { at: 5.0, x: -7.8, distance: 45 } },
  { id: 14, seed: 0.28, lane: -1.0, gap: 6.4, burst: { at: 5.18, x: -8.3, distance: 46.3 } },
];

export type ChaserState = "hidden" | "run" | "leap" | "dead";

/** Where a chaser is and what it is doing. `z` is world z, `y` its height off the road. */
export interface ChaserPose {
  state: ChaserState;
  x: number;
  y: number;
  z: number;
  /** Which way it faces, as a turn about y: 0 faces +z, π faces the way the truck drives. */
  heading: number;
  /** Seconds in the current state, and route metres run, for the stride. */
  time: number;
  run: number;
}

const ease = (k: number) => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;

/** Its spot in the pack: a little behind or ahead of its place, weaving. */
function slot(c: ChaserSpec, s: number): { x: number; z: number } {
  const gap = Math.max(1.6, c.gap - 0.15 * s + 0.45 * Math.sin(1.3 * s + c.seed * 10));
  return { x: c.lane + 0.3 * Math.sin(0.9 * s + c.seed * 7), z: -truckAt(s) + REAR + gap };
}

/** Where it runs before any fall: out of its doorway and into the pack, or with the pack. */
function running(c: ChaserSpec, s: number): { x: number; z: number } {
  const place = slot(c, s);
  if (!c.burst) return place;
  const k = ease((s - c.burst.at) / JOIN);
  const from = { x: c.burst.x, z: -c.burst.distance };
  return { x: from.x + (place.x - from.x) * k, z: from.z + (place.z - from.z) * k };
}

export function chaserAt(c: ChaserSpec, s: number): ChaserPose {
  const hidden: ChaserPose = { state: "hidden", x: 0, y: 0, z: 0, heading: 0, time: 0, run: 0 };
  if (c.burst && s < c.burst.at) return hidden;
  const death = c.leap !== undefined ? c.leap + LEAP_HIT : c.dies;
  const moving = Math.min(s, death ?? Infinity);
  const at = running(c, moving);
  const ahead = running(c, moving + 0.05);
  const heading = Math.atan2(ahead.x - at.x, ahead.z - at.z);
  const run = SPEED * moving;
  if (c.leap !== undefined && s >= c.leap) {
    const start = running(c, c.leap);
    const k = Math.min(1, (Math.min(s, death!) - c.leap) / LEAP);
    // It springs at the tailgate, which pulls away under it.
    const target = { x: 0, z: -truckAt(c.leap + LEAP) + REAR + 0.3 };
    const x = start.x + (target.x - start.x) * k;
    const z = start.z + (target.z - start.z) * k;
    const y = 2.4 * k * (1 - k) * 2;
    if (s < death!) return { state: "leap", x, y, z, heading: Math.PI, time: s - c.leap, run };
    // Blown back out of the air, it drops onto the road.
    const t = s - death!;
    const fall = Math.max(0, y - 4.9 * t * t);
    return { state: "dead", x, y: fall, z: z + Math.min(1.6, t * 4), heading: Math.PI, time: t, run };
  }
  if (death !== undefined && s >= death) {
    const t = s - death;
    // Its momentum carries it a stride or two on as it goes down.
    return { state: "dead", x: at.x, y: 0, z: at.z - Math.min(1.8, t * 5 * (1 - Math.min(1, t))), heading, time: t, run };
  }
  return { state: "run", x: at.x, y: 0, z: at.z, heading, time: s, run };
}

export interface Shot {
  seat: number;
  at: number;
  target: number;
  kill: boolean;
}

/** Seconds between shots and the first shot's time, per seat: shotgun, submachine gun, rifle, AK. */
const RHYTHM: Record<number, [every: number, first: number]> = { 1: [0.85, 0.3], 2: [0.21, 0.05], 3: [0.55, 0.12], 4: [0.3, 0.2] };
/** Who fires the killing shot on each chaser that dies. */
const KILLER: Record<number, number> = { 1: 3, 3: 1, 4: 4, 7: 2, 11: 3 };

/** Every shot in (from, to], in story order. */
export function shotsBetween(from: number, to: number): Shot[] {
  const shots: Shot[] = [];
  for (const c of CHASERS) {
    const death = c.leap !== undefined ? c.leap + LEAP_HIT : c.dies;
    if (death !== undefined && death > from && death <= to) shots.push({ seat: KILLER[c.id] ?? 1, at: death, target: c.id, kill: true });
  }
  for (const [seat, [every, first]] of Object.entries(RHYTHM)) {
    for (let n = Math.max(0, Math.ceil((from - first) / every)); first + n * every <= to; n++) {
      const at = first + n * every;
      if (at <= from) continue;
      const target = targetFor(Number(seat), at);
      if (target !== null) shots.push({ seat: Number(seat), at, target, kill: false });
    }
  }
  return shots.sort((a, b) => a.at - b.at || a.seat - b.seat);
}

/** The chaser a seat is on at a moment: the nearest one running on its side of the road. */
export function targetFor(seat: number, s: number): number | null {
  const side = seat % 2 === 1 ? -1 : 1;
  let best: { id: number; score: number } | null = null;
  for (const c of CHASERS) {
    const pose = chaserAt(c, s);
    if (pose.state !== "run" && pose.state !== "leap") continue;
    const behind = pose.z - (-truckAt(s) + REAR);
    if (behind > 18) continue;
    const score = behind + Math.abs(pose.x - side * 1.2) * 1.5;
    if (!best || score < best.score) best = { id: c.id, score };
  }
  return best?.id ?? null;
}
