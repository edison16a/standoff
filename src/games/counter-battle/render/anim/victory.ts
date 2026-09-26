import type { CharacterId } from "../../roster";
import { smooth, type P3 } from "./curves";

/**
 * How each character celebrates a round won: the Pro hops with the gun
 * up and pumps a fist, the Operator gives a calm raised fist and a nod,
 * the Runner dances, and the Heavy roars with the gun held high in both
 * hands. `t` is seconds since the win.
 */
export interface Celebration {
  /** Hips up (hops) and side to side (a dance), metres. */
  hop: number;
  sway: number;
  bend: number;
  twist: number;
  lean: number;
  headPitch: number;
  headYaw: number;
  /** 0 keeps the gun in its hold, 1 raises it overhead. */
  gunUp: number;
  /** Overhead, the gun lies across the body (both hands) rather than pointing at the sky. */
  across: boolean;
  /** The left fist's place on the chest's frame, or null to keep the hand on the gun. */
  fist: P3 | null;
}

export function celebrate(id: CharacterId, t: number): Celebration {
  const inn = smooth(t / 0.4);
  const c: Celebration = { hop: 0, sway: 0, bend: 0, twist: 0, lean: 0, headPitch: 0, headYaw: 0, gunUp: 0, across: false, fist: null };
  switch (id) {
    case "pro": {
      c.hop = Math.abs(Math.sin(t * 6.5)) * 0.09 * inn;
      c.gunUp = inn;
      c.fist = [0.2, 0.34 + 0.12 * Math.max(0, Math.sin(t * 9)), 0.14];
      c.headPitch = -0.25 * inn;
      c.bend = -0.12 * inn;
      break;
    }
    case "operator": {
      c.fist = t > 0.25 ? [0.16, 0.5, 0.08] : null;
      c.headPitch = 0.18 * Math.sin(t * 3.2) * inn;
      c.twist = 0.15 * inn;
      break;
    }
    case "runner": {
      c.sway = Math.sin(t * 5.5) * 0.06 * inn;
      c.lean = Math.sin(t * 5.5) * 0.14 * inn;
      c.hop = Math.abs(Math.sin(t * 11)) * 0.03 * inn;
      c.gunUp = 0.8 * inn;
      c.headYaw = Math.sin(t * 5.5 + 0.8) * 0.2 * inn;
      c.headPitch = Math.sin(t * 11) * 0.1 * inn;
      c.fist = [0.18, 0.2 + 0.1 * Math.sin(t * 5.5), 0.22];
      break;
    }
    case "heavy": {
      c.gunUp = inn;
      c.across = true;
      c.bend = -0.28 * inn;
      c.headPitch = -0.35 * inn;
      c.hop = Math.max(0, Math.sin(t * 4)) * 0.03 * inn;
      break;
    }
  }
  return c;
}
