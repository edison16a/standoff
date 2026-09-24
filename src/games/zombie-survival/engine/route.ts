/**
 * The way through the city, as straight segments joined at corners.
 * Segment k leads to checkpoint k, where stage k is fought, facing down
 * segment k + 1: the zombies come from the road the team is about to
 * take. Segment 26 is the pier walk onto the ship.
 *
 * World axes: y up, heading 0 looks north along -z, and a positive turn
 * is to the right.
 */
export const ZONES = ["street", "alley", "park", "hospital", "ramp", "roof", "highway", "docks"] as const;
export type Zone = (typeof ZONES)[number];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface SegmentPlan {
  zone: Zone;
  length: number;
  /** Degrees to turn at the start of the segment. */
  turn: number;
  /** Height at the end, and the stretch where the height changes. */
  rise?: { to: number; from: number; until: number };
}

const PLAN: readonly SegmentPlan[] = [
  { zone: "street", length: 46, turn: 0 },
  { zone: "street", length: 44, turn: 0 },
  { zone: "street", length: 44, turn: 90 },
  { zone: "street", length: 42, turn: 0 },
  { zone: "alley", length: 40, turn: -90 },
  { zone: "alley", length: 40, turn: 0 },
  { zone: "park", length: 48, turn: -90 },
  { zone: "park", length: 46, turn: 90 },
  { zone: "hospital", length: 44, turn: 0 },
  { zone: "ramp", length: 56, turn: 90, rise: { to: 14, from: 10, until: 50 } },
  { zone: "roof", length: 86, turn: 0, rise: { to: 0, from: 44, until: 82 } },
  { zone: "street", length: 44, turn: -90 },
  { zone: "street", length: 44, turn: 0 },
  { zone: "highway", length: 52, turn: 90 },
  { zone: "highway", length: 50, turn: 0 },
  { zone: "highway", length: 50, turn: 0 },
  { zone: "highway", length: 50, turn: -45 },
  { zone: "highway", length: 50, turn: 0 },
  { zone: "highway", length: 50, turn: 45 },
  { zone: "docks", length: 48, turn: 0 },
  { zone: "docks", length: 44, turn: -90 },
  { zone: "docks", length: 44, turn: 0 },
  { zone: "docks", length: 44, turn: 90 },
  { zone: "docks", length: 44, turn: 0 },
  { zone: "docks", length: 44, turn: 0 },
  { zone: "docks", length: 50, turn: 0 },
];

export interface Segment {
  /** 1 based, matching the checkpoint it leads to. */
  index: number;
  zone: Zone;
  start: Vec3;
  end: Vec3;
  /** Unit direction on the ground. */
  dir: { x: number; z: number };
  heading: number;
  length: number;
  /** Route distance at the segment's start. */
  from: number;
  rise: SegmentPlan["rise"];
}

function build(): Segment[] {
  const out: Segment[] = [];
  let heading = 0;
  let at: Vec3 = { x: 0, y: 0, z: 0 };
  let from = 0;
  PLAN.forEach((plan, i) => {
    heading += (plan.turn * Math.PI) / 180;
    const dir = { x: Math.sin(heading), z: -Math.cos(heading) };
    const endY = plan.rise ? plan.rise.to : at.y;
    const end = { x: at.x + dir.x * plan.length, y: endY, z: at.z + dir.z * plan.length };
    out.push({ index: i + 1, zone: plan.zone, start: at, end, dir, heading, length: plan.length, from, rise: plan.rise });
    at = end;
    from += plan.length;
  });
  return out;
}

export const SEGMENTS: readonly Segment[] = build();
export const ROUTE_LENGTH = SEGMENTS.reduce((sum, s) => sum + s.length, 0);

export function segment(index: number): Segment {
  const found = SEGMENTS[Math.max(0, Math.min(SEGMENTS.length - 1, index - 1))];
  if (!found) throw new Error("The route has no segments.");
  return found;
}

/** Height of the ground a given distance into a segment. */
export function heightAlong(seg: Segment, along: number): number {
  if (!seg.rise) return seg.start.y;
  const { from, until, to } = seg.rise;
  const t = Math.max(0, Math.min(1, (along - from) / (until - from)));
  return seg.start.y + (to - seg.start.y) * t;
}

/** The segment that holds a route distance. */
export function segmentAt(distance: number): Segment {
  for (const seg of SEGMENTS) if (distance < seg.from + seg.length) return seg;
  return SEGMENTS[SEGMENTS.length - 1]!;
}

/** The point on the ground at a route distance, clamped to the route. */
export function pointAt(distance: number): Vec3 {
  const d = Math.max(0, Math.min(ROUTE_LENGTH, distance));
  const seg = segmentAt(d);
  const along = Math.min(seg.length, d - seg.from);
  return { x: seg.start.x + seg.dir.x * along, y: heightAlong(seg, along), z: seg.start.z + seg.dir.z * along };
}

/** Route distance of checkpoint k, where stage k is fought. Checkpoint 0 is the start. */
export function checkpointDistance(k: number): number {
  return k <= 0 ? 0 : segment(k).from + segment(k).length;
}

/**
 * Where stage k is fought: at checkpoint k, facing down the next
 * segment. `place` turns a spot ahead (metres forward, metres right)
 * into a world position on the ground.
 */
export interface FightFrame {
  origin: Vec3;
  forward: { x: number; z: number };
  right: { x: number; z: number };
  heading: number;
  place(ahead: number, side: number): Vec3;
}

export function fightFrame(stage: number): FightFrame {
  const next = segment(stage + 1);
  const origin = next.start;
  const forward = next.dir;
  const right = { x: -forward.z, z: forward.x };
  return {
    origin,
    forward,
    right,
    heading: next.heading,
    place: (ahead, side) => ({
      x: origin.x + forward.x * ahead + right.x * side,
      y: heightAlong(next, ahead),
      z: origin.z + forward.z * ahead + right.z * side,
    }),
  };
}
