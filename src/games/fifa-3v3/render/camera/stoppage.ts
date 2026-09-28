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
 * following the referee as he runs in. The booking: a close up from in
 * front of him as the card goes up. The set piece: behind the ball on
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
    case "card": {
      // In front of him and a little to his left, so the raised card and his face both show.
      const fx = Math.cos(ref.facing);
      const fz = Math.sin(ref.facing);
      pos.set(ref.x + fx * 3.4 + fz * 1.3, 1.75, ref.z + fz * 3.4 - fx * 1.3);
      look.set(ref.x, 1.85, ref.z);
      return { fov: 32, rate: 4 };
    }
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
      const back = penalty ? 5.2 : 6.8;
      pos.set(sp.spot.x - ux * back, penalty ? 2.1 : 3.1, sp.spot.z - uz * back);
      if (shot === "setpiece") look.set(sp.spot.x + ux * Math.min(9, d * 0.7), penalty ? 1.1 : 1.3, sp.spot.z + uz * Math.min(9, d * 0.7));
      else look.set(view.ball.x, Math.max(0.6, view.ball.y), view.ball.z);
      return { fov: penalty ? 34 : 40, rate: shot === "setpiece" ? 3 : 6 };
    }
  }
  return null;
}
