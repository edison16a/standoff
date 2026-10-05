import { RIM } from "../tuning";
import type { V3 } from "../vec";
import { airStep, type BallBody } from "./air";
import { AIM_STEP, GLASS_Z, aimThrough } from "./aim";
import { boardContact, type Touch } from "./surfaces";

/**
 * Finding the spot on the glass for a bank shot: the square a player
 * aims at so the ball kisses off and drops through the middle of the
 * ring. The ball is flown off the glass with its spin, where it comes
 * down through the rim plane is measured, and the spot is moved by
 * Newton steps until it lands in the middle.
 */

/** Where a ball aimed at `spot` on the glass crosses the rim plane coming down, after the bounce. */
function landing(from: V3, spot: V3, apex: number, spin: V3): V3 | null {
  const v = aimThrough(from, spot, apex, spin, "z");
  const b: BallBody = { pos: { ...from }, vel: v, w: { ...spin } };
  const touches: Touch[] = [];
  let banked = false;
  const { pos } = b;
  for (let t = 0; t < 3; t += AIM_STEP) {
    const px = pos.x;
    const py = pos.y;
    const pz = pos.z;
    airStep(b, AIM_STEP);
    touches.length = 0;
    boardContact(b, touches);
    banked ||= touches.length > 0;
    if (banked && py > RIM.y && pos.y <= RIM.y && b.vel.y < 0) {
      const u = (py - RIM.y) / (py - pos.y);
      return { x: px + (pos.x - px) * u, y: RIM.y, z: pz + (pos.z - pz) * u };
    }
  }
  return null;
}

/**
 * The spot on the glass that banks the ball through `target` in the
 * rim plane, or null when the angle is too flat to bank from.
 */
export function bankSpot(from: V3, apex: number, spin: V3, target: V3 = { x: RIM.x, y: RIM.y, z: RIM.z }): V3 | null {
  // Start where a straight line to the rim's mirror image meets the glass, a little above the ring.
  const mirror = 2 * GLASS_Z - target.z;
  const u = (from.z - GLASS_Z) / Math.max(0.1, from.z - mirror);
  const spot = { x: from.x + (target.x - from.x) * u, y: RIM.y + 0.38, z: GLASS_Z };
  const d = 0.01;
  let at = landing(from, spot, apex, spin);
  const ax = landing(from, { ...spot, x: spot.x + d }, apex, spin);
  const ay = landing(from, { ...spot, y: spot.y + d }, apex, spin);
  if (!at || !ax || !ay) return null;
  // The Jacobian of the landing spot against the glass spot, worked out once and reused for every step (a chord Newton).
  const j11 = (ax.x - at.x) / d;
  const j12 = (ay.x - at.x) / d;
  const j21 = (ax.z - at.z) / d;
  const j22 = (ay.z - at.z) / d;
  const det = j11 * j22 - j12 * j21;
  if (Math.abs(det) < 1e-6) return null;
  for (let i = 0; i < 8; i++) {
    const ex = target.x - at.x;
    const ez = target.z - at.z;
    if (Math.hypot(ex, ez) < 0.004) return spot;
    spot.x += (j22 * ex - j12 * ez) / det;
    spot.y += (-j21 * ex + j11 * ez) / det;
    spot.y = Math.min(RIM.y + 0.85, Math.max(RIM.y + 0.12, spot.y));
    const next = landing(from, spot, apex, spin);
    if (!next) return null;
    at = next;
  }
  return null;
}
