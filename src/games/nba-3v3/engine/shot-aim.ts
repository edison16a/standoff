import { arcTo } from "./flight";
import { airStep } from "./loose-ball";
import { between, type Rng } from "./rng";
import { isMake, type Outcome } from "./shot-model";
import { traceShot, type Trace } from "./shot-trace";
import { BALL, BOARD, RIM } from "./tuning";
import type { V3 } from "./vec";

/**
 * Aims a shot so the real physics gives the outcome the shot model
 * decided. Each outcome has a place to aim: the middle of the ring for
 * a swish, the front or back iron for a bounce in or out, the side of
 * the ring for a roll, a square on the glass for a bank. A few aims
 * near it are flown (see `shot-trace.ts`) until one ends the way it
 * should: in or out always, and the named way whenever the physics
 * allows.
 */

/** The glass the ball's centre can touch, one ball radius off the face. */
const GLASS_Z = BOARD.face + BALL.radius;
const TRIES = 32;

type Across = "y" | "z";

interface Aim {
  target: V3;
  /** Where the aim is measured: the rim plane (y) on the way down, or the face of the glass (z). */
  across: Across;
}

export interface AimInput {
  from: V3;
  outcome: Outcome;
  apex: number;
  /** Backspin, radians per second. A jumper has about two and a half turns a second. */
  backspin: number;
}

export function aimShot(rng: Rng, { from, outcome, apex, backspin }: AimInput): Trace | null {
  const want = isMake(outcome);
  const spin = spinFor(from, backspin, outcome === "bank" || outcome === "boardOut" ? between(rng, -3, 3) : 0);
  // Drag and spin bend every aim near the ring the same way, so the correction is worked out once per surface.
  const fix = new Map<Across, V3>();
  let backup: Trace | null = null;
  for (let i = 0; i < TRIES; i++) {
    const aim = aimFor(rng, i < TRIES / 2 ? outcome : fallbackOf(outcome), from);
    if (!fix.has(aim.across)) fix.set(aim.across, correction(from, aim, apex, spin));
    const c = fix.get(aim.across)!;
    const virtual = { x: aim.target.x + c.x, y: aim.target.y + c.y, z: aim.target.z + c.z };
    const v = arcTo(from, virtual, apex).v;
    const trace = traceShot(from, v, spin, want);
    if (!trace || trace.made !== want) continue;
    if (trace.outcome === outcome) return trace;
    backup ??= trace;
  }
  return backup;
}

/** When the named way will not come, a close cousin with the same result. */
function fallbackOf(outcome: Outcome): Outcome {
  const near: Record<Outcome, Outcome> = { swish: "swish", bank: "swish", roll: "bounce", bounce: "roll", rimOut: "rimOut", inOut: "rimOut", boardOut: "rimOut", airball: "airball" };
  return near[outcome];
}

/** Backspin turns about the axis across the line of flight, the top of the ball rolling back toward the shooter. */
function spinFor(from: V3, backspin: number, side: number): V3 {
  const dx = RIM.x - from.x;
  const dz = RIM.z - from.z;
  const d = Math.hypot(dx, dz) || 1;
  return { x: (-dz / d) * backspin, y: side, z: (dx / d) * backspin };
}

function aimFor(rng: Rng, outcome: Outcome, from: V3): Aim {
  const dx = RIM.x - from.x;
  const dz = RIM.z - from.z;
  const d = Math.hypot(dx, dz);
  // Along the line of the shot (long is past the middle) and across it.
  const ux = d > 0.1 ? dx / d : 0;
  const uz = d > 0.1 ? dz / d : -1;
  const ring = (long: number, side: number): Aim => ({
    target: { x: RIM.x + ux * long - uz * side, y: RIM.y, z: RIM.z + uz * long + ux * side },
    across: "y",
  });
  const sign = () => (rng() < 0.5 ? -1 : 1);
  const canBank = from.z > GLASS_Z + 0.35;
  switch (outcome) {
    case "swish":
      return ring(between(rng, -0.04, 0.05), between(rng, -0.035, 0.035));
    case "bounce":
      return ring((rng() < 0.6 ? 1 : -1) * between(rng, 0.08, 0.13), between(rng, -0.05, 0.05));
    case "roll":
      return ring(between(rng, -0.03, 0.07), sign() * between(rng, 0.08, 0.13));
    case "rimOut":
      return ring(sign() * between(rng, 0.11, 0.24), between(rng, -0.08, 0.08));
    case "inOut":
      return ring(between(rng, -0.04, 0.08), sign() * between(rng, 0.11, 0.17));
    case "airball":
      return rng() < 0.5 ? ring(-between(rng, 0.45, 0.85), between(rng, -0.2, 0.2)) : ring(between(rng, -0.3, 0.1), sign() * between(rng, 0.4, 0.6));
    case "bank":
    case "boardOut": {
      if (!canBank) return ring(between(rng, 0.1, 0.2), between(rng, -0.06, 0.06));
      // A bank hits the square on the shooter's own side and comes across into the ring; a miss hits it wide or high.
      const near = Math.sign(from.x - RIM.x) || sign();
      const bank = outcome === "bank";
      const x = bank ? near * between(rng, 0.06, 0.24) : (rng() < 0.5 ? -near : near) * between(rng, 0.38, 0.7);
      const y = bank ? between(rng, 0.26, 0.46) : between(rng, 0.45, 0.8);
      return { target: { x: RIM.x + x, y: RIM.y + y, z: GLASS_Z }, across: "z" };
    }
  }
}

/**
 * The shift of the aim point that makes up for drag and spin: fly the
 * plain arc through the air alone, see where it crosses the surface,
 * and move the aim by the miss, a few times over.
 */
function correction(from: V3, aim: Aim, apex: number, spin: V3): V3 {
  const c = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < 5; i++) {
    const v = arcTo(from, { x: aim.target.x + c.x, y: aim.target.y + c.y, z: aim.target.z + c.z }, apex).v;
    const hit = crossing(from, v, spin, aim);
    if (!hit) break;
    const ex = aim.target.x - hit.x;
    const ey = aim.across === "z" ? aim.target.y - hit.y : 0;
    const ez = aim.across === "y" ? aim.target.z - hit.z : 0;
    c.x += ex;
    c.y += ey;
    c.z += ez;
    if (Math.hypot(ex, ey, ez) < 0.003) break;
  }
  return c;
}

/** Where a free flight crosses the rim plane coming down, or the glass coming in. */
function crossing(from: V3, v: V3, spin: V3, aim: Aim): V3 | null {
  const pos = { ...from };
  const vel = { ...v };
  const w = { ...spin };
  const h = 1 / 120;
  for (let t = 0; t < 4; t += h) {
    const px = pos.x;
    const py = pos.y;
    const pz = pos.z;
    airStep(pos, vel, w, h);
    const before = aim.across === "y" ? py - aim.target.y : pz - aim.target.z;
    const after = aim.across === "y" ? pos.y - aim.target.y : pos.z - aim.target.z;
    if (before > 0 && after <= 0 && (aim.across === "z" || vel.y < 0)) {
      const u = before / (before - after);
      return { x: px + (pos.x - px) * u, y: py + (pos.y - py) * u, z: pz + (pos.z - pz) * u };
    }
  }
  return null;
}
