import { length, scale, sub } from "@/games/kit/motion/math3d";
import type { BodyPart, Hurtbox } from "./body";
import { closestBetween, distance, lerpVec, pointOn, type Segment, type Vec3 } from "./geometry";

/** One fighter over one tick, at any fraction `t` of it: 0 is the last tick, 1 is now. */
export interface Combatant {
  at(t: number): { blade: Segment; body: readonly Hurtbox[] };
  /** How thick the blade counts as. */
  radius: number;
  /** Their blade may deal a hit: moving freely and off its cooldown. */
  canHit: boolean;
  /** They may take a hit: not still reeling from the last one. */
  canBeHit: boolean;
}

export interface SweepRules {
  /** Seconds the tick covers, to turn distances into speeds. */
  dt: number;
  /** A blade point slower than this, in metres a second, touches without hurting. */
  hitSpeed: number;
  /** Blades meeting slower than this just rest against each other. */
  clashSpeed: number;
  canClash: boolean;
}

export type Contact =
  | { kind: "clash"; t: number; at: Vec3; speed: number; velocity: [Vec3, Vec3] }
  | { kind: "hit"; t: number; attacker: 0 | 1; at: Vec3; speed: number; part: BodyPart };

/** No blade point moves further than this between two samples, so a thin blade cannot skip over a target. */
const MAX_STEP = 0.035;
const MAX_SUBSTEPS = 40;
/** Blades count as touching a little before their drawn edges meet. */
const CLASH_MARGIN = 0.02;

/**
 * Everything the blades touched during one tick, in the order it happened.
 * The tick is cut into substeps small enough that no blade point jumps
 * further than a blade is thick, and at each one blade on blade is tested
 * before blade on body. So a block that is in the way stops the swing
 * before it reaches the body, and a swing too fast to be seen in any one
 * frame still hits what it passed through.
 */
export function sweep(fighters: readonly [Combatant, Combatant], rules: SweepRules): Contact[] {
  const steps = substeps(fighters);
  let before = [fighters[0].at(0), fighters[1].at(0)] as const;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const now = [fighters[0].at(t), fighters[1].at(t)] as const;
    const stepDt = rules.dt / steps;
    if (rules.canClash) {
      const clash = bladesMeet(before[0].blade, now[0].blade, before[1].blade, now[1].blade, fighters, stepDt, rules.clashSpeed);
      if (clash) return [{ kind: "clash", t, ...clash }];
    }
    const hits: Contact[] = [];
    for (const attacker of [0, 1] as const) {
      const defender = attacker === 0 ? 1 : 0;
      if (!fighters[attacker].canHit || !fighters[defender].canBeHit) continue;
      const hit = bladeHitsBody(before[attacker].blade, now[attacker].blade, now[defender].body, fighters[attacker].radius, stepDt, rules.hitSpeed);
      if (hit) hits.push({ kind: "hit", t, attacker, ...hit });
    }
    if (hits.length) return hits;
    before = now;
  }
  return [];
}

function substeps(fighters: readonly [Combatant, Combatant]): number {
  let furthest = 0;
  for (const fighter of fighters) {
    const [a, b] = [fighter.at(0).blade, fighter.at(1).blade];
    furthest = Math.max(furthest, distance(a.a, b.a), distance(a.b, b.b), distance(pointOn(a, 0.5), pointOn(b, 0.5)));
  }
  return Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil(furthest / MAX_STEP)));
}

/** How fast the point `s` along a blade moved over the last substep. */
function velocityOf(before: Segment, now: Segment, s: number, dt: number): Vec3 {
  return scale(sub(pointOn(now, s), pointOn(before, s)), 1 / dt);
}

function bladesMeet(
  beforeA: Segment,
  nowA: Segment,
  beforeB: Segment,
  nowB: Segment,
  fighters: readonly [Combatant, Combatant],
  dt: number,
  minSpeed: number,
): { at: Vec3; speed: number; velocity: [Vec3, Vec3] } | null {
  const closest = closestBetween(nowA, nowB);
  if (closest.distance > fighters[0].radius + fighters[1].radius + CLASH_MARGIN) return null;
  const velocity: [Vec3, Vec3] = [velocityOf(beforeA, nowA, closest.s, dt), velocityOf(beforeB, nowB, closest.t, dt)];
  const speed = length(sub(velocity[0], velocity[1]));
  if (speed < minSpeed) return null;
  return { at: lerpVec(pointOn(nowA, closest.s), pointOn(nowB, closest.t), 0.5), speed, velocity };
}

function bladeHitsBody(
  before: Segment,
  now: Segment,
  body: readonly Hurtbox[],
  radius: number,
  dt: number,
  minSpeed: number,
): { at: Vec3; speed: number; part: BodyPart } | null {
  for (const part of body) {
    const closest = closestBetween(now, part);
    if (closest.distance > radius + part.radius) continue;
    const speed = length(velocityOf(before, now, closest.s, dt));
    if (speed >= minSpeed) return { at: pointOn(now, closest.s), speed, part: part.part };
  }
  return null;
}
