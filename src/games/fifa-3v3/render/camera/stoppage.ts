import type * as THREE from "three";
import { goalX } from "../../engine/goal";
import type { MatchView } from "../../engine/view";
import { other } from "../../teams";

export interface Placement {
  fov: number;
  rate: number;
}

/**
 * Cameras for stoppages. The foul: a low camera on the near side
 * following the referee as he runs in. The booking: the referee and the
 * offender side on as the card goes up. The set piece: behind the ball on
 * the line to goal, like the free kick camera on television, which then
 * stays put and follows the ball in after it is struck.
 */
export function stoppage(shot: string, view: MatchView, pos: THREE.Vector3, look: THREE.Vector3): Placement | null {
  const ref = view.referee;
  const foul = view.foul;
  const sp = view.setPiece;
  switch (shot) {
    case "foul": {
      const at = foul?.at ?? { x: ref.x, z: ref.z };
      pos.set((ref.x + at.x) / 2 - 1.5, 2.6, Math.max(ref.z, at.z) + 8);
      look.set((ref.x + at.x) / 2, 1, (ref.z + at.z) / 2);
      return { fov: 34, rate: 3 };
    }
    case "card":
      return booking(view, pos, look);
    case "setpiece":
    case "setpiece-follow": {
      if (!sp) return null;
      const gx = goalX(other(sp.team));
      const dx = gx - sp.spot.x;
      const dz = -sp.spot.z;
      const d = Math.hypot(dx, dz) || 1;
      const ux = dx / d;
      const uz = dz / d;
      const penalty = sp.kind === "penalty";
      // High enough behind the ball to see over the taker, who waits off to one side, and down the white line to goal.
      const back = penalty ? 7 : 8.5;
      const ahead = penalty ? 6 : Math.min(8, d * 0.45);
      pos.set(sp.spot.x - ux * back, penalty ? 2.9 : 3.5, sp.spot.z - uz * back);
      if (shot === "setpiece") look.set(sp.spot.x + ux * ahead, penalty ? 0.7 : 0.8, sp.spot.z + uz * ahead);
      else look.set(view.ball.x, Math.max(0.6, view.ball.y), view.ball.z);
      return { fov: 40, rate: shot === "setpiece" ? 3 : 6 };
    }
  }
  return null;
}

/**
 * The booking: the referee and the offender side on, a little to the
 * referee's front so his face and the raised card both show, from the
 * side away from the fouled player so he never stands in the way.
 */
function booking(view: MatchView, pos: THREE.Vector3, look: THREE.Vector3): Placement {
  const ref = view.referee;
  const foul = view.foul;
  const offender = foul ? view.athletes[foul.by] : undefined;
  const victim = foul ? view.athletes[foul.victim] : undefined;
  const ox = offender?.x ?? ref.x + Math.cos(ref.facing) * 2;
  const oz = offender?.z ?? ref.z + Math.sin(ref.facing) * 2;
  const gap = Math.max(0.5, Math.hypot(ox - ref.x, oz - ref.z));
  const ux = (ox - ref.x) / gap;
  const uz = (oz - ref.z) / gap;
  const mx = (ref.x + ox) / 2;
  const mz = (ref.z + oz) / 2;
  let nx = -uz;
  let nz = ux;
  const victimSide = victim ? (victim.x - mx) * nx + (victim.z - mz) * nz : -nz;
  if (victimSide > 0) {
    nx = -nx;
    nz = -nz;
  }
  const dist = 3.8 + gap * 0.7;
  pos.set(mx + (nx + ux * 0.45) * dist, 1.7, mz + (nz + uz * 0.45) * dist);
  // Weighted to the referee, who holds the card up.
  look.set(mx * 0.6 + ref.x * 0.4, 1.6, mz * 0.6 + ref.z * 0.4);
  return { fov: 34, rate: 4 };
}
