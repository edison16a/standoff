import { TACKLE_MOVES, type Hold, type Slide } from "./tackle-moves";
import type { TackleKind } from "./tackle-preset";
import type { Athlete, TackleBind } from "./types";
import { dot2, lerp, norm2, yawOf, type V2 } from "./vec";

/**
 * Binds the men of a tackle together and moves them as one. The carrier
 * keeps the momentum the hit left him and slides out by the preset's
 * drag; the tackler and anyone piling on are held at the preset's place
 * on him, so the bodies stay in contact through the fall and the roll.
 * Plain physics would let them bounce apart or sink into each other.
 */

/** The body's left of a ground direction, as the figure's left side sees it. */
export const leftOf = (f: V2): V2 => ({ x: f.z, z: -f.x });

const smooth = (v: number) => {
  const t = Math.max(0, Math.min(1, v));
  return t * t * (3 - 2 * t);
};

/** Where a held man sits at `t`: eased from where he met the carrier into the keyed places. */
export function holdAt(keys: readonly Hold[], from: { along: number; across: number }, t: number): { along: number; across: number } {
  let prev = { t: 0, ...from };
  for (const k of keys) {
    if (t <= k.t) {
      const u = smooth((t - prev.t) / Math.max(1e-6, k.t - prev.t));
      return { along: lerp(prev.along, k.along, u), across: lerp(prev.across, k.across, u) };
    }
    prev = k;
  }
  return { along: prev.along, across: prev.across };
}

/** The stretch of the slide the carrier is in at `t`. */
export function slideAt(slide: readonly Slide[], t: number): Slide {
  return slide.find((s) => t < s.until) ?? slide[slide.length - 1]!;
}

/** Where `a` sits from `carrier` in the frame of line `f`, toward `side`. */
function placeIn(a: Athlete, carrier: Athlete, f: V2, side: 1 | -1): { along: number; across: number } {
  const d = { x: a.x - carrier.x, z: a.z - carrier.z };
  return { along: dot2(d, f), across: dot2(d, leftOf(f)) * side };
}

const sideOf = (a: Athlete, carrier: Athlete, f: V2): 1 | -1 => (dot2({ x: a.x - carrier.x, z: a.z - carrier.z }, leftOf(f)) >= 0 ? 1 : -1);

/** The tackle's line: the hit's own line for a head on drive, otherwise the way the pair is sliding. */
export function lineOf(kind: TackleKind, n: V2, carrier: Athlete): V2 {
  if (kind === "drive") return n;
  const v = norm2({ x: carrier.vx, z: carrier.vz });
  return v.x !== 0 || v.z !== 0 ? v : { x: Math.sin(carrier.yaw), z: Math.cos(carrier.yaw) };
}

function down(a: Athlete, dur: number, cause: "tackled" | "tackler" | "pile", bind: TackleBind): void {
  a.action = { kind: "down", t: 0, dur, cause, bind };
  a.aim = null;
  a.guard = null;
  a.stumble = null;
}

/**
 * Puts the carrier, the tackler and any helpers down in one preset. `n`
 * is the hit's line from tackler to carrier. A lineman reaching out of
 * his block trips the carrier but stays with his block.
 */
export function bindTackle(kind: TackleKind, carrier: Athlete, tackler: Athlete, n: V2, helpers: readonly Athlete[] = []): void {
  const move = TACKLE_MOVES[kind];
  const f = lineOf(kind, n, carrier);
  const fy = yawOf(f.x, f.z);
  const side = sideOf(tackler, carrier, f);
  const bind = (role: TackleBind["role"], partner: number, a: Athlete, s: 1 | -1): TackleBind => ({ kind, role, partner, f, side: s, from: placeIn(a, carrier, f, s) });
  if (tackler.role !== "lineman") {
    down(tackler, move.tacklerDown, "tackler", bind("tackler", carrier.id, tackler, side));
    tackler.yaw = fy + move.tacklerYaw * side;
    tackler.vx = carrier.vx;
    tackler.vz = carrier.vz;
  }
  for (const h of helpers) {
    const s = sideOf(h, carrier, f);
    down(h, move.pileDown, "pile", bind("pile", carrier.id, h, s));
    h.yaw = yawOf(carrier.x - h.x, carrier.z - h.z);
  }
  down(carrier, move.carrierDown, "tackled", bind("carrier", tackler.id, carrier, side));
  carrier.yaw = fy + move.carrierYaw;
}

/** The carrier's drag and drive while a preset has him, or null outside one. */
export function slideOf(a: Athlete): Slide | null {
  const act = a.action;
  if (act.kind !== "down" || !act.bind || act.bind.role !== "carrier") return null;
  return slideAt(TACKLE_MOVES[act.bind.kind].slide, act.t);
}

/** True while `a` is held to a carrier by a preset. */
export function held(a: Athlete): boolean {
  const act = a.action;
  if (act.kind !== "down" || !act.bind || act.bind.role === "carrier") return false;
  return act.t < TACKLE_MOVES[act.bind.kind].release;
}

/** Moves every held man to his place on the carrier and gives him the carrier's speed. */
export function followBinds(list: readonly Athlete[]): void {
  for (const a of list) {
    if (!held(a) || a.action.kind !== "down") continue;
    const b = a.action.bind!;
    const carrier = list[b.partner];
    if (!carrier) continue;
    const move = TACKLE_MOVES[b.kind];
    const at = holdAt(b.role === "pile" ? move.pile : move.hold, b.from, a.action.t);
    const l = leftOf(b.f);
    a.x = carrier.x + b.f.x * at.along + l.x * at.across * b.side;
    a.z = carrier.z + b.f.z * at.along + l.z * at.across * b.side;
    a.vx = carrier.vx;
    a.vz = carrier.vz;
  }
}

/** Two men of the same tackle: the collisions leave them be, so they do not shove apart. */
export function sameTackle(a: Athlete, b: Athlete): boolean {
  const ba = a.action.kind === "down" ? a.action.bind : null;
  const bb = b.action.kind === "down" ? b.action.bind : null;
  if (!ba || !bb) return false;
  const carrierA = ba.role === "carrier" ? a.id : ba.partner;
  const carrierB = bb.role === "carrier" ? b.id : bb.partner;
  return carrierA === carrierB;
}
