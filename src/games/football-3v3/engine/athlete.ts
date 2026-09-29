import type { Role } from "../roles";
import { ROSTER, unit, type CharacterId } from "../roster";
import type { TeamId } from "../teams";
import { cycleLength, faceRun, limitsFor, steer, type Limits } from "./body";
import { FIELD } from "./field";
import { BODY, JUKE } from "./tuning";
import type { Athlete, MatchState } from "./types";
import { clamp, clampLen, len, scale, v2, type Vec2 } from "./vec";

export function makeAthlete(id: number, team: TeamId, role: Role, character: CharacterId, seat: number | null): Athlete {
  const c = ROSTER[character];
  return {
    id,
    team,
    role,
    character,
    seat,
    online: seat !== null,
    pos: v2(),
    vel: v2(),
    facing: team === 0 ? 0 : Math.PI,
    mass: c.mass,
    action: "stance",
    actionT: 0,
    actionLen: 0,
    actionDir: v2(),
    downKind: "tackled",
    juke: { kind: null, side: 1, dir: v2(1, 0), wait: 0, heat: 0 },
    stride: 0,
    tackleWait: 0,
    guard: { held: false, mark: null },
    rush: false,
    block: { held: 0, through: false },
    route: null,
    speed: unit(c.stats.speed),
    strength: unit(c.stats.strength),
    agility: unit(c.stats.agility),
    arm: unit(c.stats.arm),
    hands: unit(c.stats.hands),
    brain: { thinkIn: 0, target: v2(), react: 0, throwAt: 0, scramble: false },
    stats: { passYards: 0, rushYards: 0, recYards: 0, touchdowns: 0, tackles: 0, interceptions: 0, sacks: 0, attempts: 0, completions: 0, catches: 0 },
  };
}

/** Whether a phone is steering this player right now. Otherwise a computer is. */
export function isHuman(a: Athlete): boolean {
  return a.seat !== null && a.online;
}

export function onOffense(state: MatchState, a: Athlete): boolean {
  return a.team === state.drive.offense;
}

export function carrying(state: MatchState, a: Athlete): boolean {
  return state.play.carrier === a.id;
}

/** On the grass or getting up: out of the play for now. */
export function isDown(a: Athlete): boolean {
  return a.action === "down";
}

/** Top speed in yards a second: the speed stat, slower for a quarterback on offence and with the ball, and slower still when jukes are spammed. */
export function topSpeed(state: MatchState, a: Athlete): number {
  const pace = clamp((a.speed - 0.6) / 0.4, 0, 1);
  let top = BODY.slowest + (BODY.fastest - BODY.slowest) * pace;
  if (a.role === "qb" && onOffense(state, a)) top *= BODY.qbFactor;
  if (carrying(state, a)) top *= BODY.carrying;
  return top * (1 - heatSlow(a));
}

/** How much the juke heat is slowing a player, 0 to the cap. */
export function heatSlow(a: Athlete): number {
  return Math.min(JUKE.maxSlow, Math.max(0, a.juke.heat - 1) * JUKE.heatSlow);
}

export function athleteLimits(state: MatchState, a: Athlete): Limits {
  return limitsFor(a.mass, topSpeed(state, a), a.strength, a.agility);
}

/** Players may run a little past the lines, so going out of bounds is possible, but not off into the stands. */
function keepNearField(p: Vec2): void {
  p.x = clamp(p.x, -FIELD.endLine - 3, FIELD.endLine + 3);
  p.z = clamp(p.z, -FIELD.halfWidth - 3, FIELD.halfWidth + 3);
}

/** Moves the body by its velocity, advances the stride and keeps it on the map. */
export function advance(a: Athlete, dt: number): void {
  a.pos.x += a.vel.x * dt;
  a.pos.z += a.vel.z * dt;
  keepNearField(a.pos);
  const s = len(a.vel);
  a.stride += (s * dt) / cycleLength(s);
}

/**
 * Runs toward the stick, heavily: the body's mass and grip decide how
 * fast the run can change. `want` is a stick, 0 to 1 long.
 */
export function runToward(state: MatchState, a: Athlete, want: Vec2, dt: number, pace = 1): void {
  const lim = athleteLimits(state, a);
  a.vel = steer(a.vel, scale(clampLen(want, 1), lim.top * pace), lim, dt);
  a.facing = faceRun(a.facing, a.vel, dt);
  advance(a, dt);
}

/** Starts a timed action. */
export function setAction(a: Athlete, action: Athlete["action"], length: number): void {
  a.action = action;
  a.actionT = 0;
  a.actionLen = length;
}

/** Knocks a player to the grass for a while. */
export function knockDown(a: Athlete, kind: Athlete["downKind"], seconds: number): void {
  setAction(a, "down", seconds);
  a.downKind = kind;
  a.guard.held = false;
}
