import type { Match } from "./match";
import { COURT, RIM, RULES } from "./tuning";
import type { TeamId } from "./types";
import type { V2 } from "./vec";

/**
 * Where everyone lines up for a check at the top of the key: the
 * checker on the spot with the ball, the wings out wide, and each
 * defender between their player and the rim.
 */

const OFFENCE_SPOTS: readonly V2[] = [
  { x: COURT.check.x, z: COURT.check.z },
  { x: -4.9, z: 6.1 },
  { x: 4.9, z: 6.1 },
];

export interface CheckPlan {
  /** Brings the ball up and takes the check. */
  checker: number;
  /** Guards the checker and checks the ball to them. */
  defender: number;
  spots: Map<number, V2>;
}

/** Guards stand between their player and the rim. */
function guardSpot(p: V2, gap: number): V2 {
  const dx = RIM.x - p.x;
  const dz = RIM.z - p.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: p.x + (dx / d) * gap, z: p.z + (dz / d) * gap };
}

/**
 * Chooses who brings the ball up, taking turns, and players on phones
 * first so the people playing get the ball in their hands.
 */
export function planCheck(m: Match, team: TeamId): CheckPlan {
  const side = m.athletes.filter((a) => a.team === team).sort((a, b) => a.slot - b.slot);
  const humans = side.filter((a) => !a.auto);
  const pool = humans.length > 0 ? humans : side;
  const checker = pool[m.checkTurn[team] % pool.length]!;
  m.checkTurn[team]++;
  const order = [checker, ...side.filter((a) => a !== checker)];
  const spots = new Map<number, V2>();
  order.forEach((a, i) => spots.set(a.id, OFFENCE_SPOTS[i] ?? OFFENCE_SPOTS[0]!));
  const guards = m.athletes.filter((a) => a.team !== team).sort((a, b) => a.slot - b.slot);
  guards.forEach((g, i) => spots.set(g.id, guardSpot(OFFENCE_SPOTS[i] ?? OFFENCE_SPOTS[0]!, i === 0 ? 1.3 : 1.8)));
  return { checker: checker.id, defender: guards[0]?.id ?? checker.id, spots };
}

/** The possession starts fresh: a new shot clock, nothing to take back, the bots' plans forgotten. */
export function freshPossession(m: Match, team: TeamId): void {
  m.offence = team;
  m.needsClear = false;
  m.shotClock = RULES.shotClock;
  m.clockWarned = false;
  m.lastPass = null;
  m.stealLog.reset();
  m.brains.reset();
}

/** Gives the ball to a player's hands with nothing else going on around it. */
export function handTo(m: Match, id: number): void {
  const b = m.ball;
  b.mode = "held";
  b.holder = id;
  b.flight = null;
  b.flightKind = null;
  b.passTo = null;
  b.shot = null;
  b.lastTouch = id;
  b.vel = { x: 0, y: 0, z: 0 };
}

/** Puts everyone straight on their spot with the ball in the checker's hands: the opening tip, or a hurried check. */
export function placeForCheck(m: Match, team: TeamId, plan = planCheck(m, team)): void {
  for (const a of m.athletes) {
    const spot = plan.spots.get(a.id)!;
    a.x = spot.x;
    a.z = spot.z;
    a.vx = a.vz = a.y = 0;
    a.action = { kind: "none" };
    a.yaw = Math.PI;
  }
  handTo(m, plan.checker);
  freshPossession(m, team);
}
