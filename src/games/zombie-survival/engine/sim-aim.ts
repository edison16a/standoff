import type { Offset } from "./recoil";
import type { PelletHit } from "./shooting";
import { alive, type Zombie } from "./zombie";
import { isBoss, KINDS, type Joint } from "./zombie-kinds";

/**
 * A stand in for the renderer's raycast, for balancing with bots. Each
 * zombie is a few flat shapes seen from the team's eyes: a head, a torso,
 * arms and legs, or a boss's hide with glowing joints on it. Angles are
 * in radians from the team's straight ahead, x right and y up.
 */

/** The team's eyes, in metres above the road. */
const EYE = 1.65;
/** A boss's glowing joint as the bots see it: a disc this share of its height across, from its centre. */
export const WEAK_SHARE = 0.07;

/** Where a spot on a zombie sits in the team's view. */
export function viewAngle(z: Zombie, up: number, right = 0): Offset {
  const ahead = Math.max(0.5, z.ahead);
  return { x: Math.atan2(z.side + right, ahead), y: Math.atan2(up - EYE, ahead) };
}

/** Where each weak joint sits on a boss, as shares of its height across and up. */
const JOINTS: Record<Joint, [number, number]> = {
  shoulderL: [0.11, 0.8],
  shoulderR: [-0.11, 0.8],
  elbowL: [0.14, 0.6],
  elbowR: [-0.14, 0.6],
  kneeL: [0.05, 0.28],
  kneeR: [-0.05, 0.28],
  chest: [0, 0.7],
};

/** The point a player aims at: a weak point that still glows, the head, or the neck for a looser hand. */
export function aimPoint(z: Zombie, head: boolean): Offset {
  const h = KINDS[z.kind].height;
  if (isBoss(z.kind)) {
    const joints = KINDS[z.kind].weakPoints;
    const i = z.weak.findIndex((hp) => hp > 0);
    const [across, up] = JOINTS[joints[Math.max(0, i)]!];
    return viewAngle(z, up * h, across * h);
  }
  return viewAngle(z, head ? h - 0.14 * (h / 1.8) : h * 0.8);
}

/** What a bullet at this view angle strikes on one zombie, if anything. */
function strike(z: Zombie, at: Offset): PelletHit | null {
  const spec = KINDS[z.kind];
  const h = spec.height;
  const ahead = Math.max(0.5, z.ahead);
  // The bullet's spot on a flat card standing where the zombie is, in metres.
  const x = Math.tan(at.x) * ahead - z.side;
  const y = Math.tan(at.y) * ahead + EYE;
  if (isBoss(z.kind)) {
    const r = WEAK_SHARE * h;
    const weak = spec.weakPoints.findIndex((joint, i) => {
      const [across, up] = JOINTS[joint];
      return (z.weak[i] ?? 0) > 0 && Math.hypot(x - across * h, y - up * h) < r;
    });
    if (weak >= 0) return { zombie: z.id, part: "weak", weak };
    return Math.abs(x) < 0.2 * h && y > 0 && y < h ? { zombie: z.id, part: "body", weak: null } : null;
  }
  const s = h / 1.8;
  const wide = z.kind === "brute" ? 1.45 : 1;
  if (Math.hypot(x, y - (h - 0.14 * s)) < 0.13 * s) return { zombie: z.id, part: "head", weak: null };
  if (Math.abs(x) < 0.21 * s * wide && y > 0.48 * h && y < 0.86 * h) return { zombie: z.id, part: "body", weak: null };
  const arm = Math.abs(x) < 0.36 * s * wide && y > 0.45 * h && y < 0.84 * h;
  const leg = Math.abs(x) < 0.17 * s * wide && y > 0 && y <= 0.48 * h;
  return arm || leg ? { zombie: z.id, part: "limb", weak: null } : null;
}

/** What a bullet at this view angle strikes first, nearest zombie first. */
export function traceShot(zombies: readonly Zombie[], at: Offset): PelletHit | null {
  const standing = zombies.filter(alive).sort((a, b) => a.ahead - b.ahead);
  for (const z of standing) {
    const hit = strike(z, at);
    if (hit) return hit;
  }
  return null;
}
