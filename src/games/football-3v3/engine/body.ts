import { BUILDS, LINEMAN_FRAME, LINEMAN_NUMBERS, SUPPORT_FRAME, SUPPORT_NUMBERS, type BuildId, type Stats as CharStats } from "../builds";
import { attackSign, type TeamId } from "../teams";
import { staminaPace } from "./stamina";
import { SUPPORT, supportStats } from "./support/roster";
import { JUKE, MOVE, RUSH } from "./tuning";
import { emptyStats, type Athlete, type Role } from "./types";

/** Linemen play as a steady, average athlete with a lot of weight. */
const LINEMAN_STATS: CharStats = { speed: 3, agility: 3, power: 9, hands: 3, arm: 2, cover: 2 };

export function createAthlete(id: number, team: TeamId, role: Role, slot: number, build: BuildId | null, seat: number | null): Athlete {
  const c = build ? BUILDS[build] : null;
  const support = role === "support";
  const numbers = support ? SUPPORT_NUMBERS : LINEMAN_NUMBERS;
  return {
    id, team, role, slot, build, seat, pilot: seat, auto: seat === null,
    number: c ? c.number : (numbers[team][slot] ?? (support ? 40 : 60) + slot),
    x: 0, z: 0, vx: 0, vz: 0, ax: 0, az: 0,
    yaw: attackSign(team) > 0 ? Math.PI / 2 : -Math.PI / 2,
    mass: c ? c.frame.weight : support ? SUPPORT_FRAME.weight : LINEMAN_FRAME.weight,
    move: { x: 0, z: 0 }, aim: null,
    action: { kind: "none" },
    jukeCd: 0, jukeCdFull: 0, jukeHeat: 0, stamina: 1, tackleCd: 0, rushT: 0, rushCd: 0, guard: null, blocked: 0, stagger: 0, stumble: null, catching: null, block: null,
    bot: { wait: 0, route: [], leg: 0, stop: false, goal: { x: 0, z: 0 }, cover: null, rush: true, key: false, readAt: 2 },
    stats: emptyStats(),
    deep: false,
  };
}

export function statsOf(a: Athlete): CharStats {
  if (a.build) return BUILDS[a.build].stats;
  return a.role === "support" ? supportStats(a.slot, a.deep) : LINEMAN_STATS;
}

/** Spamming jukes wears a player out: past a little heat, they run slower. */
export function heatDrag(a: Athlete): number {
  return Math.max(0.6, 1 - 0.1 * Math.max(0, a.jukeHeat - JUKE.heatFree));
}

/** Top speed on fresh legs, from the player's speed rating and role alone. */
export function freshSpeed(a: Athlete): number {
  // The deep threat runs with the skill players; the other support players are big men.
  const role = a.role === "lineman" ? 0.7 : a.role === "support" && !a.deep ? SUPPORT.pace : 1;
  return (MOVE.baseSpeed + statsOf(a).speed * MOVE.perSpeed) * role;
}

/**
 * Top speed right now, from the player's speed, role, ball, rush and
 * tired legs, both from jukes and from running all play (stamina.ts).
 * `pace` scales it for a QB who is still a passer (qb-run.ts).
 */
export function topSpeed(a: Athlete, withBall: boolean, pace = 1): number {
  const rush = a.rushT > 0 ? RUSH.boost : 1;
  return freshSpeed(a) * pace * (withBall ? MOVE.withBall : 1) * rush * heatDrag(a) * staminaPace(a);
}

/** Forward push at a standstill: heavier players get going slower. */
export function pushOf(a: Athlete): number {
  const power = 0.9 + statsOf(a).power * 0.02;
  return MOVE.push * power * Math.sqrt(MOVE.refMass / a.mass);
}

/**
 * The cleats' grip: the most a player can speed up, brake and turn at
 * once, metres a second squared. The same cleats hold a heavier body
 * back less, so a big man brakes and cuts on a longer line.
 */
export function gripOf(a: Athlete): number {
  const weight = Math.pow(MOVE.refMass / a.mass, MOVE.gripMass);
  return (MOVE.grip + (statsOf(a).agility - 5) * MOVE.gripPerAgility) * weight;
}

/** Players on the ground and mid lunge or dive have no say over their legs. */
export function canSteer(a: Athlete): boolean {
  const k = a.action.kind;
  return k === "none" || k === "juke" || k === "throw" || k === "celebrate";
}

export function isDown(a: Athlete): boolean {
  return a.action.kind === "down";
}
