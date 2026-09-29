import { attackSign, other, type TeamId } from "../teams";
import { brake, moveAthlete, separate } from "./athlete";
import { goalX } from "./goal";
import { BALL } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { norm, sub, type Vec2 } from "./vec";

/**
 * The trophy ceremony at full time. The winners celebrate where they
 * stand until the cut, then the scene is the whole side on the centre
 * spot: the captain with the cup in both hands, the rest around him.
 * He raises it, the others crowd in and jump, and the stats follow.
 * All times are seconds after the cut unless they say otherwise.
 */
export const CEREMONY = {
  /** Seconds after the final whistle that the scene cuts to the ceremony. */
  cut: 3.2,
  /** The captain starts to lift the cup, and has it right up. */
  raise: 2.1,
  up: 3.1,
  /** The stats come up over the scene. */
  stats: 9.5,
} as const;

/** The ceremony stands on the centre spot, facing the near side where the main cameras are. */
export const CEREMONY_SPOT: Vec2 = { x: 0, z: 0 };
export const CEREMONY_FACING = Math.PI / 2;

/**
 * Where the rest of the side stands, beside and behind the captain, in
 * order: the outfield players first, the keeper after them. Before the
 * lift they give him room; once it is up they crowd in.
 */
const AROUND: readonly Vec2[] = [
  { x: -1.4, z: -0.5 },
  { x: 1.4, z: -0.45 },
  { x: -0.6, z: -1.45 },
  { x: 0.65, z: -1.4 },
];
const CROWDED: readonly Vec2[] = [
  { x: -0.95, z: -0.4 },
  { x: 0.95, z: -0.35 },
  { x: -0.45, z: -1.0 },
  { x: 0.5, z: -0.98 },
];

/** Where the losers stand, off behind the winners and to the sides, heads down. */
const LOSERS: readonly Vec2[] = [
  { x: -7, z: -8.5 },
  { x: 6.5, z: -9.5 },
  { x: -3.5, z: -11.5 },
];

/** Seconds into the ceremony, or null before the cut or outside full time. */
export function ceremonyTime(state: Pick<MatchState, "phase" | "phaseT">): number | null {
  return state.phase === "fulltime" && state.phaseT >= CEREMONY.cut ? state.phaseT - CEREMONY.cut : null;
}

/**
 * Who lifts the cup: the winners' top scorer, a phone's player before a
 * computer on a tie, then the one leading the line.
 */
export function captainOf(state: MatchState, team: TeamId): Athlete | null {
  const side = state.athletes.filter((a) => a.team === team);
  const rank = (a: Athlete) => a.stats.goals * 100 + (a.seat !== null ? 10 : 0) - a.slot;
  return side.reduce<Athlete | null>((best, a) => (!best || rank(a) > rank(best) ? a : best), null);
}

/** A spot beside the captain, `crowded` or not, for the `index`th of the others. */
export function mateSpot(index: number, crowded: boolean): Vec2 {
  const list = crowded ? CROWDED : AROUND;
  const at = list[Math.min(index, list.length - 1)]!;
  return { x: CEREMONY_SPOT.x + at.x, z: CEREMONY_SPOT.z + at.z };
}

/**
 * The cut to the ceremony: everyone is placed at once, as a television
 * picture cuts from the pitch to the presentation. The winners' keeper
 * joins them; the ball is left lying off to the side.
 */
export function stageCeremony(state: MatchState): void {
  const team = state.winner;
  if (team === null) return;
  const captain = captainOf(state, team);
  state.ceremony = { captain: captain?.id ?? null };
  const mates = state.athletes.filter((a) => a.team === team && a !== captain);
  const losers = state.athletes.filter((a) => a.team !== team);
  if (captain) place(captain, CEREMONY_SPOT, "celebrate");
  mates.forEach((a, i) => place(a, mateSpot(i, false), "celebrate"));
  losers.forEach((a, i) => {
    place(a, LOSERS[i % LOSERS.length]!, "dejected");
    a.facing = -Math.PI / 2;
  });
  const keeper = state.keepers[team];
  keeper.pos = mateSpot(mates.length, true);
  keeper.vel = { x: 0, z: 0 };
  keeper.facing = CEREMONY_FACING;
  keeper.action = "cheer";
  keeper.actionT = 0;
  keeper.dive = null;
  // The beaten keeper stays on his line.
  const beaten = state.keepers[other(team)];
  beaten.pos = { x: goalX(beaten.team) + attackSign(beaten.team) * 1, z: 0 };
  beaten.action = "set";
  beaten.dive = null;
  const ball = state.ball;
  ball.owner = null;
  ball.inGoal = null;
  ball.pos = { x: CEREMONY_SPOT.x + 2.6, y: BALL.radius, z: CEREMONY_SPOT.z + 0.9 };
  ball.vel = { x: 0, y: 0, z: 0 };
  ball.spin = { x: 0, y: 0, z: 0 };
  state.flight = null;
}

/**
 * One step of the ceremony. The captain stands still with the cup; once
 * it is up the others step in close and bounce. The losers stand with
 * their hands on their hips.
 */
export function stepCeremony(state: MatchState, dt: number): void {
  const t = ceremonyTime(state) ?? 0;
  const captain = state.ceremony?.captain ?? null;
  const team = state.winner;
  let index = 0;
  for (const a of state.athletes) {
    a.actionT += dt;
    if (a.team !== team) {
      brake(a, dt, 8);
      continue;
    }
    if (a.id === captain) {
      brake(a, dt, 10);
      a.facing = CEREMONY_FACING;
      continue;
    }
    const spot = mateSpot(index++, t >= CEREMONY.up);
    const to = sub(spot, a.pos);
    const d = Math.hypot(to.x, to.z);
    if (d > 0.08) moveAthlete(a, { x: norm(to).x * Math.min(1, d) * 0.35, z: norm(to).z * Math.min(1, d) * 0.35 }, dt, false);
    else brake(a, dt, 10);
    a.facing = CEREMONY_FACING;
  }
  for (const k of state.keepers) k.actionT += dt;
  separate(state.athletes);
}

function place(a: Athlete, at: Vec2, action: Athlete["action"]): void {
  a.pos = { ...at };
  a.vel = { x: 0, z: 0 };
  a.facing = CEREMONY_FACING;
  a.action = action;
  a.actionT = 0;
  a.charging = false;
  a.charge = 0;
  a.skill.kind = null;
  a.guard.on = false;
}
