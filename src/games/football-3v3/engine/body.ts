import { CHARACTERS, LINEMAN_BUILD, LINEMAN_NUMBERS, type CharacterId, type Stats as CharStats } from "../roster";
import { attackSign, type TeamId } from "../teams";
import { JUKE, MOVE, RUSH } from "./tuning";
import { emptyStats, type Athlete, type Role } from "./types";

/** Linemen play as a steady, average athlete with a lot of weight. */
const LINEMAN_STATS: CharStats = { speed: 3, agility: 3, power: 9, hands: 3, arm: 2, leg: 2 };

export function createAthlete(id: number, team: TeamId, role: Role, slot: number, character: CharacterId | null, seat: number | null): Athlete {
  const c = character ? CHARACTERS[character] : null;
  return {
    id, team, role, slot, character, seat, auto: seat === null,
    number: c ? c.number : (LINEMAN_NUMBERS[team][slot] ?? 60 + slot),
    x: 0, z: 0, vx: 0, vz: 0,
    yaw: attackSign(team) > 0 ? Math.PI / 2 : -Math.PI / 2,
    mass: c ? c.build.weight : LINEMAN_BUILD.weight,
    move: { x: 0, z: 0 }, aim: null,
    action: { kind: "none" },
    jukeCd: 0, jukeHeat: 0, tackleCd: 0, rushT: 0, rushCd: 0, guard: null, blocked: 0,
    bot: { wait: 0, route: [], leg: 0, cover: null, readAt: 2 },
    stats: emptyStats(),
  };
}

export function statsOf(a: Athlete): CharStats {
  return a.character ? CHARACTERS[a.character].stats : LINEMAN_STATS;
}

/** Spamming jukes wears a player out: past a little heat, they run slower. */
export function heatDrag(a: Athlete): number {
  return Math.max(0.6, 1 - 0.1 * Math.max(0, a.jukeHeat - JUKE.heatFree));
}

/** Top speed right now, from the player's speed, role, ball, rush and tired legs. */
export function topSpeed(a: Athlete, withBall: boolean): number {
  const base = MOVE.baseSpeed + statsOf(a).speed * MOVE.perSpeed;
  const role = a.role === "qb" ? MOVE.qbSpeed : a.role === "lineman" ? 0.7 : 1;
  const rush = a.rushT > 0 ? RUSH.boost : 1;
  return base * role * (withBall ? MOVE.withBall : 1) * rush * heatDrag(a);
}

/** Forward push at a standstill: heavier players get going slower. */
export function pushOf(a: Athlete): number {
  const power = 0.9 + statsOf(a).power * 0.02;
  return MOVE.push * power * Math.sqrt(MOVE.refMass / a.mass);
}

/** Sideways grip, which sets the turning radius: speed squared over grip. */
export function gripOf(a: Athlete): number {
  return MOVE.grip + (statsOf(a).agility - 5) * MOVE.gripPerAgility;
}

/** Players on the ground and mid lunge or dive have no say over their legs. */
export function canSteer(a: Athlete): boolean {
  const k = a.action.kind;
  return k === "none" || k === "juke" || k === "throw" || k === "celebrate";
}

export function isDown(a: Athlete): boolean {
  return a.action.kind === "down";
}
