import { statsOf } from "./body";
import { knockDown } from "./down";
import { popBall } from "./fumble";
import { resolveHit } from "./hit";
import { dodging } from "./juke";
import type { Match } from "./match";
import { bindTackle } from "./tackle-bind";
import { breakKindFor, breakOdds, breakTackle } from "./break-tackle";
import { alongOf, approachFor, finishFor, fromOf, helpersFor, type TackleKind } from "./tackle-preset";
import { endPlay } from "./whistle";
import { TACKLE } from "./tuning";
import type { Athlete } from "./types";
import { dir2, dist2, dot2, type V2 } from "./vec";

/** Stronger tacklers reach a little farther. */
const reach = (a: Athlete) => TACKLE.range * (0.9 + statsOf(a).power * 0.02);

/**
 * A tackle press. Close enough to the ball carrier, the defender lunges
 * at where the carrier is going; too far, nothing happens. The tackle
 * preset is picked here, before the leap, from the angle and the gap.
 */
export function pressTackle(m: Match, a: Athlete, carrier: Athlete): boolean {
  if (a.tackleCd > 0 || a.role === "lineman") return false;
  if (a.action.kind !== "none") return false;
  if (dist2(a, carrier) > reach(a)) return false;
  const lead = { x: carrier.x + carrier.vx * 0.22, z: carrier.z + carrier.vz * 0.22 };
  const dir = dir2(a, lead);
  // A lunge is a burst on top of the run, so a chaser can still dive at a runner from behind.
  const speed = Math.max(TACKLE.lungeSpeed, Math.hypot(a.vx, a.vz) + 2.5);
  const approach = approachFor(a, carrier);
  a.action = { kind: "lunge", t: 0, dur: TACKLE.lungeTime, dir, target: carrier.id, approach };
  a.vx = dir.x * speed;
  a.vz = dir.z * speed;
  a.yaw = Math.atan2(dir.x, dir.z);
  a.tackleCd = TACKLE.cooldown;
  m.emit({ type: "lunge", id: a.id, target: carrier.id });
  return true;
}

/** A QB caught with the ball before he throws or takes off is sacked. */
export function isSack(m: Match, carrier: Athlete): boolean {
  return carrier.role === "qb" && carrier.team === m.offense && !m.play?.passed && !m.play?.qbRun;
}

/**
 * Brings the carrier down in the preset `kind`, with anyone in `helpers`
 * piling on: the play is over where he falls, unless the hit jarred the
 * ball out, when it is a live fumble instead.
 */
export function tackle(m: Match, carrier: Athlete, by: Athlete, kind: TackleKind, n: V2, helpers: readonly Athlete[] = [], fumble: V2 | null = null): void {
  const sack = isSack(m, carrier);
  bindTackle(kind, carrier, by, n, helpers);
  by.stats.tackles++;
  if (sack) by.stats.sacks++;
  m.emit({ type: "tackle", id: carrier.id, by: by.id, sack });
  for (const h of helpers) m.emit({ type: "pads", a: h.id, b: carrier.id, power: 0.8 });
  if (fumble && m.carrier() === carrier) return popBall(m, carrier, fumble);
  endPlay(m, sack ? "sack" : "tackle");
}

/** Turns a lunge toward the carrier, no faster than TACKLE.homing radians a second. */
export function home(a: Athlete, carrier: Athlete, dt: number): void {
  const speed = Math.hypot(a.vx, a.vz);
  if (speed < 0.5) return;
  const now = Math.atan2(a.vx, a.vz);
  const want = Math.atan2(carrier.x - a.x, carrier.z - a.z);
  let d = want - now;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  const turn = Math.max(-TACKLE.homing * dt, Math.min(TACKLE.homing * dt, d));
  a.vx = Math.sin(now + turn) * speed;
  a.vz = Math.cos(now + turn) * speed;
}

/**
 * Carries a lunge through. Reaching the carrier mid lunge is a collision
 * settled by momentum (hit.ts): a big hit or a grip that holds brings
 * him down in the preset the contact picks (tackle-preset.ts). Only
 * head on, at speed, can he run through it, with a truck or a stiff arm
 * (break-tackle.ts); from the side or behind he goes down. A carrier in
 * the middle of a juke is not there to hit, and the tackler sails past
 * and tumbles. A lunge at nothing ends on the ground.
 */
export function updateLunge(m: Match, a: Athlete, dt: number): void {
  const act = a.action;
  if (act.kind !== "lunge") return;
  act.t += dt;
  const k = Math.max(0, 1 - 1.2 * dt);
  a.vx *= k;
  a.vz *= k;
  const carrier = m.carrier();
  // Early in the lunge the arms still reach after a runner who keeps going, but not after a juke.
  if (carrier && carrier.team !== a.team && act.t < 0.25 && !dodging(carrier)) home(a, carrier, dt);
  if (m.phase === "live" && carrier && carrier.team !== a.team && act.t > 0.04 && dist2(a, carrier) < TACKLE.contact) {
    if (dodging(carrier)) return missed(m, a, carrier, "missed", TACKLE.missedDown);
    const from = fromOf(alongOf(a, carrier));
    const before = { x: carrier.vx, z: carrier.vz };
    const speed = Math.hypot(before.x, before.z);
    const hit = resolveHit(a, carrier, m.rng);
    // The filmed showcase game keeps the old rule, any grip broken by momentum, so the trailer plays as recorded.
    if (m.filmed) {
      if (!hit.down) return shed(m, a, carrier, hit.dv);
    } else {
      const odds = breakOdds(carrier, a, hit.n, speed);
      if (odds > 0 && m.rng.chance(odds)) {
        breakTackle(breakKindFor(carrier, a), carrier, a, hit.n, before);
        m.emit({ type: "pads", a: a.id, b: carrier.id, power: 1 });
        return m.emit({ type: "missedTackle", id: carrier.id, by: a.id });
      }
    }
    const helpers = helpersFor(m.athletes, carrier, a);
    const drivenBack = dot2({ x: carrier.vx, z: carrier.vz }, hit.n);
    const kind = finishFor(act.approach, { helpers: helpers.length, drivenBack, big: hit.big, sack: isSack(m, carrier), from });
    tackle(m, carrier, a, kind, hit.n, helpers, hit.fumble ? hit.n : null);
    return;
  }
  if (act.t >= act.dur) knockDown(a, TACKLE.whiffDown, "whiff");
}

function missed(m: Match, a: Athlete, carrier: Athlete, cause: "missed", dur: number): void {
  knockDown(a, dur, cause);
  m.emit({ type: "missedTackle", id: carrier.id, by: a.id });
}

/** The filmed game's broken tackle: he runs through it shaken and the tackler is bounced off him. */
function shed(m: Match, a: Athlete, carrier: Athlete, dv: number): void {
  carrier.stagger = Math.max(carrier.stagger, 0.3 + Math.min(0.3, dv * 0.1));
  knockDown(a, TACKLE.shedDown, "shed");
  m.emit({ type: "missedTackle", id: carrier.id, by: a.id });
}
