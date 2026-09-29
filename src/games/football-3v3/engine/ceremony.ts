import type { TeamId } from "../teams";
import type { Match } from "./match";
import type { Athlete } from "./types";
import type { V2 } from "./vec";

/**
 * The trophy presentation at the final whistle. The winners celebrate
 * where they stand until the cut, then the scene is the whole side at
 * midfield: the captain with the trophy in both hands, the runners
 * either side of him and the linemen behind. He lifts it, the rest
 * crowd in and jump, and the stats follow. Times are seconds after the
 * cut unless they say otherwise.
 */
export const CEREMONY = {
  /** Seconds after the final whistle that the scene cuts to the presentation. */
  cut: 3.4,
  /** The captain starts to lift the trophy, and has it right up. */
  raise: 2.2,
  up: 3.2,
  /** The stats come up over the scene. */
  stats: 10,
} as const;

/** The presentation stands on the star at midfield, facing the near sideline (+z) where its cameras are. */
export const CEREMONY_SPOT: V2 = { x: 0, z: 0 };
export const CEREMONY_FACING = 0;

/**
 * Where the rest of the side stands, as offsets from the captain: the
 * runners either side of him first, then the linemen in a row behind.
 * Nobody stands straight behind him, so from the front every face
 * shows. Once the trophy is up they crowd in.
 */
const AROUND: readonly V2[] = [
  { x: -1.45, z: -0.35 },
  { x: 1.45, z: -0.35 },
  { x: -2.3, z: -1.5 },
  { x: 2.3, z: -1.5 },
  { x: -0.7, z: -1.9 },
];
const CROWDED: readonly V2[] = [
  { x: -1.0, z: -0.25 },
  { x: 1.0, z: -0.25 },
  { x: -1.8, z: -1.15 },
  { x: 1.8, z: -1.15 },
  { x: -0.55, z: -1.5 },
];

/** Where the beaten side stands, well back and off to the sides, heads down. */
const BEATEN: readonly V2[] = [
  { x: -8, z: -9 },
  { x: 7, z: -10 },
  { x: -4, z: -12 },
  { x: 10, z: -13 },
  { x: -11, z: -12.5 },
  { x: 3.5, z: -14 },
];

/** Seconds into the presentation, or null before the cut, with no winner, or outside the end of the game. */
export function ceremonyTime(m: Pick<Match, "phase" | "phaseT" | "winner">): number | null {
  return m.phase === "over" && m.winner !== null && m.phaseT >= CEREMONY.cut ? m.phaseT - CEREMONY.cut : null;
}

/** How much a player did in the game, for picking the captain. */
function impact(a: Athlete): number {
  const s = a.stats;
  return s.touchdowns * 60 + s.passYards + s.rushYards + s.recYards + s.tackles * 8 + s.interceptions * 30;
}

/**
 * Who lifts the trophy: the winners' best player on the day, a phone's
 * player before a computer's, then the QB. Linemen never do.
 */
export function captainOf(m: Match, team: TeamId): Athlete | null {
  const side = m.athletes.filter((a) => a.team === team && a.role !== "lineman");
  const rank = (a: Athlete) => impact(a) * 10 + (a.seat !== null ? 5 : 0) + (a.role === "qb" ? 1 : 0);
  return side.reduce<Athlete | null>((best, a) => (!best || rank(a) > rank(best) ? a : best), null);
}

/** The spot of the `index`th of the others, crowded in once the trophy is up or not. */
export function mateSpot(index: number, crowded: boolean): V2 {
  const list = crowded ? CROWDED : AROUND;
  const at = list[Math.min(index, list.length - 1)]!;
  return { x: CEREMONY_SPOT.x + at.x, z: CEREMONY_SPOT.z + at.z };
}

/** The winners in their order round the captain: the runners and QB first, then the linemen. */
export function matesOf(m: Match, team: TeamId, captain: number | null): Athlete[] {
  const side = m.athletes.filter((a) => a.team === team && a.id !== captain);
  return [...side.filter((a) => a.role !== "lineman"), ...side.filter((a) => a.role === "lineman")];
}

function place(a: Athlete, at: V2, yaw: number): void {
  a.x = at.x;
  a.z = at.z;
  a.vx = 0;
  a.vz = 0;
  a.yaw = yaw;
  a.action = { kind: "none" };
  a.move = { x: 0, z: 0 };
  a.aim = null;
  a.guard = null;
  a.blocked = 0;
  a.rushT = 0;
}

/**
 * The cut: everyone is placed at once, as a broadcast cuts from the
 * field to the presentation. The ball is left on the turf off to one side.
 */
export function stageCeremony(m: Match): void {
  const team = m.winner;
  if (team === null) return;
  const captain = captainOf(m, team);
  m.ceremony = { captain: captain?.id ?? null };
  if (captain) place(captain, CEREMONY_SPOT, CEREMONY_FACING);
  matesOf(m, team, captain?.id ?? null).forEach((a, i) => place(a, mateSpot(i, false), CEREMONY_FACING));
  m.athletes.filter((a) => a.team !== team).forEach((a, i) => place(a, BEATEN[i % BEATEN.length]!, Math.PI + (i % 3) * 0.5 - 0.5));
  const ball = m.ball;
  ball.state = "dead";
  ball.holder = null;
  ball.flight = null;
  ball.pass = null;
  ball.pos = { x: CEREMONY_SPOT.x + 4.2, y: 0.15, z: CEREMONY_SPOT.z - 2.6 };
}

/**
 * One step of the presentation. The captain stands with the trophy; once
 * it is up the others walk in close. Everyone else stays where they are.
 */
export function stepCeremony(m: Match, dt: number): void {
  if (!m.ceremony) stageCeremony(m);
  const team = m.winner;
  const t = ceremonyTime(m) ?? 0;
  if (team === null || !m.ceremony) return;
  const crowded = t >= CEREMONY.up + 0.15;
  matesOf(m, team, m.ceremony.captain).forEach((a, i) => {
    const spot = mateSpot(i, crowded);
    const dx = spot.x - a.x;
    const dz = spot.z - a.z;
    // An easy walk in, slowing as they arrive, so their feet have a speed to step to.
    const k = Math.min(1, 2.2 * dt);
    a.vx = (dx * k) / dt;
    a.vz = (dz * k) / dt;
    a.x += dx * k;
    a.z += dz * k;
    a.yaw = CEREMONY_FACING;
  });
}
