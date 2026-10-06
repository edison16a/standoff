import { yardToX } from "./field";
import { dodging } from "./juke";
import type { Match } from "./match";
import { resolveHit } from "./hit";
import { tackle } from "./tackle";
import { LINE, RUSH, TACKLE } from "./tuning";
import type { Athlete } from "./types";
import { clamp, dist2 } from "./vec";

/**
 * One pair of linemen locked together at the line, pushing as one body
 * with both men's mass. Each surge is a new balance of leg drive; the
 * pair accelerates by the difference over its mass and the cleats'
 * resistance, so it lurches and settles instead of snapping. The
 * defence slowly wins, so the pocket closes the longer the QB holds it.
 * A runner who crashes into a pair shoves it by real momentum too.
 */
export interface LinePair {
  x: number;
  z: number;
  /** Speed of the pair along the field, metres a second. */
  v: number;
  /** The current balance of drive, positive toward the offense's backfield. */
  surge: number;
  /** Seconds until the next surge. */
  next: number;
  engaged: boolean;
}

export function newLinePairs(): LinePair[] {
  return [0, 1, 2].map(() => ({ x: 0, z: 0, v: 0, surge: 0, next: 0, engaged: false }));
}

const lineman = (m: Match, team: 0 | 1, slot: number) => m.athletes.find((a) => a.team === team && a.role === "lineman" && a.slot === slot)!;

/** Squares the pairs up over the ball for the next snap. */
export function setLine(m: Match): void {
  const losX = yardToX(m.offense, m.drive.los);
  m.lines.forEach((p, i) => {
    p.x = losX;
    p.z = m.drive.ballZ + (i - 1) * LINE.spacing;
    p.v = 0;
    p.surge = 0;
    p.next = 0;
    p.engaged = false;
  });
}

/** The snap: every pair crashes together. */
export function engageLine(m: Match): void {
  m.lines.forEach((p, i) => {
    p.engaged = true;
    m.emit({ type: "pads", a: lineman(m, m.offense, i).id, b: lineman(m, m.defense, i).id, power: 0.9 });
  });
}

/** Mass of a locked pair, for anyone who runs into it. */
export const pairMass = (m: Match, slot: number) => lineman(m, m.offense, slot).mass + lineman(m, m.defense, slot).mass;

export function updateLinemen(m: Match, dt: number): void {
  const s = m.sign;
  const losX = yardToX(m.offense, m.drive.los);
  const since = m.play?.sinceSnap ?? 0;
  const pushing = m.phase === "live" || m.phase === "kick";
  m.lines.forEach((p, i) => {
    const o = lineman(m, m.offense, i);
    const d = lineman(m, m.defense, i);
    if (!p.engaged || !pushing) {
      o.vx = o.vz = d.vx = d.vz = 0;
      p.v = 0;
      return;
    }
    p.next -= dt;
    if (p.next <= 0) {
      // A fresh shove: mostly a stalemate, with the defence gaining as the play goes on.
      const bias = m.phase === "kick" ? 0 : 0.15 + 0.06 * since;
      p.surge = m.rng.range(-1, 1) * LINE.surge + bias;
      p.next = m.rng.range(0.45, 1.1);
      if (Math.abs(p.surge) > 0.75) m.emit({ type: "pads", a: o.id, b: d.id, power: Math.min(1, Math.abs(p.surge)) });
    }
    // Net drive over the pair's mass, against the cleats' hold on the turf.
    const mass = o.mass + d.mass;
    const force = -s * p.surge * LINE.drive;
    const lurch = (force - LINE.hold * p.v) / mass;
    p.v += lurch * dt;
    const lo = Math.min(losX - s * 3.5, losX + s * 2.5);
    const hi = Math.max(losX - s * 3.5, losX + s * 2.5);
    const x = clamp(p.x + p.v * dt, lo, hi);
    if (x !== p.x + p.v * dt) p.v = 0;
    p.x = x;
    for (const [a, side] of [[o, -1], [d, 1]] as const) {
      a.x = p.x + side * s * LINE.gap * 0.75;
      a.z = p.z;
      a.vx = p.v;
      a.vz = 0;
      // The pair's lurch, for the two big bodies to sway with each shove.
      a.ax = lurch;
      a.az = 0;
      // Locked up with the man across: the view draws the two of them driving into each other.
      a.blocked = 0.15;
      // Each lineman faces the other: the offense's way for its own, back the other way for the defence.
      a.yaw = -side * s > 0 ? Math.PI / 2 : -Math.PI / 2;
    }
  });
}

/** Skill players in contact with an opposing lineman are held up, and ball carriers can be grabbed. */
export function lineContact(m: Match): void {
  const carrier = m.carrier();
  for (const l of m.athletes) {
    if (l.role !== "lineman" || !m.lines[l.slot]?.engaged || l.action.kind === "down") continue;
    for (const a of m.athletes) {
      if (a.role === "lineman" || a.team === l.team) continue;
      const d = dist2(a, l);
      if (d < RUSH.contact) a.blocked = 0.15;
      if (a === carrier && m.phase === "live" && d < 1.1 && l.tackleCd <= 0) grab(m, l, a);
    }
  }
}

/**
 * A lineman reaches out of his block for a carrier going past: he only
 * sometimes gets a hand free, and then it is an arm tackle, held or
 * broken by the carrier's momentum like any other.
 */
function grab(m: Match, l: Athlete, a: Athlete): void {
  l.tackleCd = 1;
  if (dodging(a) || !m.rng.chance(TACKLE.linemanGrab)) return;
  const hit = resolveHit(l, a, m.rng, LINE.grabWrap);
  // Tripped up by an arm out of the block: he stumbles on and pitches forward, as from a heel clipped.
  if (hit.down) tackle(m, a, l, "shoestring", hit.n);
  else a.stagger = Math.max(a.stagger, 0.25);
}
