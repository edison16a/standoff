import { rimDistance } from "../court";
import type { Match } from "../match";
import type { Athlete } from "../types";
import { dist2, type V2 } from "../vec";

/**
 * How a defender goes up, picked as he leaves the floor from where he
 * is against the man he jumps at:
 *
 * * stand: square in front, straight up with both hands.
 * * run: coming hard at the play, a running two hand leap that carries
 *   him on, as a big man sprinting to the post does.
 * * chase: behind a man going to the rim and running the same way, the
 *   chase down from behind with one long arm.
 * * help: from the side, off another man, the weak side help leap.
 * * closeout: running out at a man shooting from deep, a leap off one
 *   foot that carries him on past the shooter with one hand high.
 */
export const BLOCK_JUMPS = ["stand", "run", "chase", "help", "closeout"] as const;
export type BlockJump = (typeof BLOCK_JUMPS)[number];

/** How much higher each one goes, in metres: a run up adds spring. */
export const JUMP_LIFT: Record<BlockJump, number> = { stand: 0, run: 0.06, chase: 0.08, help: 0.04, closeout: 0.05 };

/** A shooter at least this far out is a deep shooter, closed out on rather than met at the rim. */
const DEEP = 5.4;

/** The man a jump is at: the shooter of a shot in the air, or the ball handler. */
export function jumpTarget(m: Match, d: Athlete): Athlete | null {
  const b = m.ball;
  if (b.mode === "flight" && b.flightKind === "shot" && b.shot) return m.athletes[b.shot.shooter] ?? null;
  const h = m.holder;
  return h && h.team !== d.team ? h : null;
}

/** Where the man is heading: along his drive to the rim, or the way he is running; null standing still. */
function heading(t: Athlete): V2 | null {
  const act = t.action;
  if (act.kind === "drive") {
    const x = act.to.x - act.from.x;
    const z = act.to.z - act.from.z;
    const l = Math.hypot(x, z);
    if (l > 0.3) return { x: x / l, z: z / l };
  }
  const s = Math.hypot(t.vx, t.vz);
  return s > 1.5 ? { x: t.vx / s, z: t.vz / s } : null;
}

export function jumpStyle(m: Match, d: Athlete): BlockJump {
  const t = jumpTarget(m, d);
  const speed = Math.hypot(d.vx, d.vz);
  if (t) {
    const gap = dist2(d, t);
    const h = heading(t);
    const rx = d.x - t.x;
    const rz = d.z - t.z;
    if (h && gap < 3.2) {
      const ahead = rx * h.x + rz * h.z;
      const along = d.vx * h.x + d.vz * h.z;
      // Behind him and running his way: the chase down.
      if (ahead < -0.25 && along > 1.2) return "chase";
    }
    // Running out at a deep shooter as he rises: the closeout leap.
    if (deepShot(m, t) && gap < 3.4 && (d.vx * -rx + d.vz * -rz) / Math.max(0.01, gap) > 1.5) return "closeout";
    // Another man is already on him: this one is coming over to help.
    const onBall = m.opponents(t.team).some((o) => o !== d && dist2(o, t) < 1.8);
    if (onBall && gap < 3.6 && speed > 1) return "help";
  }
  return speed > 2.2 ? "run" : "stand";
}

/** A jump shot from deep: rising with it, or just let go. */
function deepShot(m: Match, t: Athlete): boolean {
  const b = m.ball;
  const flying = b.mode === "flight" && b.flightKind === "shot" && b.shot?.shooter === t.id && b.shot.kind === "jumper";
  const rising = t.action.kind === "shoot" && !t.action.float && !t.action.free;
  return (flying || rising) && rimDistance(t) > DEEP;
}
