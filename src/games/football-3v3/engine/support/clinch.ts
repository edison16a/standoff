import { isDown, statsOf } from "../body";
import type { BlockMove } from "../block-preset";
import { radiusOf } from "../collide";
import type { Match } from "../match";
import { Rng } from "../rng";
import { LINE } from "../tuning";
import type { Athlete } from "../types";
import { dist2, type V2 } from "../vec";
import { breakClinch, reachOut } from "./clinch-break";
import { CLINCH, clinchKindFor } from "./clinch-pick";

/**
 * A support blocker with his hands on a defender, out in space. The two
 * move as one body the way a pair of linemen does (linemen.ts): each
 * shove is a new balance of leg drive and the pair lurches by the
 * difference over both men's mass, while the defender works sideways
 * toward the ball. The block move is picked at every shove
 * (clinch-pick.ts) and a pancake or a shed ends it.
 */
export interface Clinch {
  /** The blocker and the defender. */
  o: number;
  d: number;
  move: BlockMove;
  /** Positive is the defender winning. */
  surge: number;
  next: number;
  /** The pair's speed along the line from blocker to defender. */
  v: number;
  /** Protecting a passer, so the blocker sets and gives ground instead of driving. */
  passPro: boolean;
}

export interface SupportState {
  clinches: Clinch[];
  /** Match time until which a player cannot block or be blocked again, after a shed or a pancake. */
  rest: Map<number, number>;
  /** The blocks' own dice, so they leave every other draw in a seeded game alone. */
  rng: Rng;
}

export const newSupportState = (seed: number): SupportState => ({ clinches: [], rest: new Map(), rng: new Rng((seed ^ 0x2c1b3c6d) >>> 0) });

/** The block a player is in, as blocker or defender, or null. */
export const clinchOf = (m: Match, id: number): Clinch | null => m.support.clinches.find((c) => c.o === id || c.d === id) ?? null;

/** Every block off for a new play. */
export function resetClinches(m: Match): void {
  m.support.clinches.length = 0;
  m.support.rest.clear();
  for (const a of m.athletes) if (a.role !== "lineman") a.block = null;
}

const resting = (m: Match, a: Athlete) => (m.support.rest.get(a.id) ?? -1) > m.time;

/** A defender a blocker may take on: before a pass is out only the men rushing it, once the ball is run anyone. */
function blockable(m: Match, d: Athlete, carrier: Athlete | null, passPro: boolean): boolean {
  if (d.role === "lineman" || isDown(d) || d === carrier || d.action.kind !== "none" || resting(m, d)) return false;
  return !passPro || d.role === "support" || d.role === "qb";
}

/** Blockers near a man they can block put their hands on him. */
export function engageClinches(m: Match): void {
  if (m.phase !== "live") return;
  const carrier = m.carrier();
  const team = carrier?.team ?? m.offense;
  const passPro = !!carrier && carrier.role === "qb" && !m.play?.passed && !m.play?.qbRun;
  for (const o of m.athletes) {
    if (o.role !== "support" || o.team !== team || o === carrier || isDown(o) || o.action.kind !== "none" || resting(m, o) || clinchOf(m, o.id)) continue;
    // The deep threat is out on his route while the QB looks to throw, not blocking.
    if (o.deep && passPro && m.play?.call === "throw") continue;
    let best: Athlete | null = null;
    for (const d of m.athletes) {
      if (d.team === o.team || !blockable(m, d, carrier, passPro) || clinchOf(m, d.id)) continue;
      const gap = dist2(o, d);
      if (gap > CLINCH.reach) continue;
      // His own man first, then whoever is closest.
      if (!best || d.id === o.bot.cover || (best.id !== o.bot.cover && gap < dist2(o, best))) best = d;
    }
    if (!best) continue;
    m.support.clinches.push({ o: o.id, d: best.id, move: { kind: "engage", t: 0 }, surge: 0, next: 0, v: 0, passPro });
    m.emit({ type: "pads", a: o.id, b: best.id, power: 0.8 });
  }
}

/** One sub step of every block: the shoves, the pair's lurch and slide, and the moves that end it. */
export function updateClinches(m: Match, dt: number): void {
  const list = m.support.clinches;
  for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i]!;
    const o = m.athlete(c.o)!;
    const d = m.athlete(c.d)!;
    const carrier = m.carrier();
    if (m.phase !== "live" || isDown(o) || isDown(d) || o === carrier || d === carrier || d.action.kind !== "none") {
      list.splice(i, 1);
      continue;
    }
    c.move.t += dt;
    c.next -= dt;
    let kind = c.move.kind;
    if (c.next <= 0) {
      shove(m, c, o, d);
      kind = pick(m, c);
    } else if (kind === "engage" && c.move.t >= CLINCH.engage) kind = pick(m, c);
    // No block in space holds for ever: in the end the defender fights off it.
    if (c.move.t >= CLINCH.longest) kind = "shed";
    if (kind === "pancake" || kind === "shed") {
      list.splice(i, 1);
      breakClinch(m, o, d, kind);
      continue;
    }
    if (kind !== c.move.kind) c.move = { kind, t: c.move.t };
    hold(c, o, d, dt);
    if (carrier && carrier.team !== d.team) reachOut(m, d, carrier);
  }
}

/** A fresh shove: the stronger man and a rusher pressing Rush have the edge, and in pass protection the rush slowly wins. */
function shove(m: Match, c: Clinch, o: Athlete, d: Athlete): void {
  const rng = m.support.rng;
  const power = (statsOf(d).power - statsOf(o).power) * CLINCH.perPower;
  const rush = d.rushT > 0 ? 0.35 : 0;
  const pocket = c.passPro ? 0.1 + 0.05 * c.move.t : 0;
  c.surge = rng.range(-1, 1) * CLINCH.surge + power + rush + pocket;
  c.next = rng.range(0.4, 0.9);
}

const pick = (m: Match, c: Clinch) => clinchKindFor(c.move.t, c.surge, c.passPro, m.support.rng.range(0, 1));

/** Moves the two as one body: the lurch along the line between them, and the defender's slide across it. */
function hold(c: Clinch, o: Athlete, d: Athlete, dt: number): void {
  const dx = d.x - o.x;
  const dz = d.z - o.z;
  const l = Math.hypot(dx, dz) || 1;
  const dir: V2 = { x: dx / l, z: dz / l };
  const mass = o.mass + d.mass;
  const lurch = (-c.surge * LINE.drive - LINE.hold * c.v) / mass;
  c.v += lurch * dt;
  // The defender's stick, across the block, carries the pair sideways as he works to the ball.
  const across = (-dir.z * d.move.x + dir.x * d.move.z) * CLINCH.slide;
  const vx = dir.x * c.v - dir.z * across;
  const vz = dir.z * c.v + dir.x * across;
  const mid = { x: (o.x + d.x) / 2 + vx * dt, z: (o.z + d.z) / 2 + vz * dt };
  const half = (radiusOf(o) + radiusOf(d)) / 2;
  for (const [a, k, offense] of [[o, -1, true], [d, 1, false]] as const) {
    a.x = mid.x + dir.x * half * k;
    a.z = mid.z + dir.z * half * k;
    a.vx = vx;
    a.vz = vz;
    a.ax = dir.x * lurch;
    a.az = dir.z * lurch;
    a.blocked = 0.15;
    // Chest to chest: each faces the other.
    a.yaw = Math.atan2(-dir.x * k, -dir.z * k);
    a.block = { kind: c.move.kind, t: c.move.t, offense };
  }
}
